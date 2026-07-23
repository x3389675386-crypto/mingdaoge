-- =============================================================
-- 060_invite_palmistry.sql
-- 邀请注册 + 论坛看手相 增量功能迁移
--
-- 依赖：010（profiles / on_auth_user_created 触发器）、011（is_admin / my_guest_id）
--       020（generate_user_code / handle_new_user / profiles.user_code）
--       021（forum_categories，value 唯一键）
--       024（apply_reward_change 原子改余额 + 写 reward_ledger）
--       forum_posts（id 为 BIGINT，作者由 guest_id / author 标识）
--
-- 设计要点：
--   1. 所有函数 SECURITY DEFINER + SET search_path = ''，杜绝 search_path 注入。
--   2. 所有积分 / 阳德变动均经 apply_reward_change()，前端不直改 profiles。
--   3. 可重复执行（CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE）。
--   4. 邀请发奖 / 看手相发奖逻辑全部放在服务端（触发器 / RPC），前端仅发起，防篡改。
-- =============================================================

-- -------------------------------------------------------------
-- 1. 站点配置表 site_settings（通用键值，承载三处奖励参数）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         text PRIMARY KEY,
  value       int  NOT NULL,
  description text
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 公开读（配置项非敏感）
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
CREATE POLICY site_settings_select ON public.site_settings
  FOR SELECT USING (true);

-- 仅管理员可写
DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write ON public.site_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 种子配置项（已存在则不覆盖，便于管理员后续手动调整）
INSERT INTO public.site_settings (key, value, description) VALUES
  ('invite_reward_points', 50,  '邀请成功（被邀请人注册）奖励给邀请人的积分'),
  ('palmistry_reward_points', 10, '看手相单次领奖积分'),
  ('palmistry_daily_limit', 1,  '看手相每日限领次数；N<=0 表示关闭活动')
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------
-- 2. 邀请关系表 invitations
--    一人只认首个邀请人（invitee_id 唯一）；(inviter_id, invitee_id) 唯一防重复。
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code   text,
  reward_points int,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, invitee_id),
  UNIQUE (invitee_id)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 本人可读（我是邀请人或被邀请人）
DROP POLICY IF EXISTS invitations_select ON public.invitations;
CREATE POLICY invitations_select ON public.invitations
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- -------------------------------------------------------------
-- 3. 看手相领取记录 palmistry_claims
--    每帖限领一次：(user_id, post_id) 唯一；按"当日行数"计每日上限。
--    注意：forum_posts.id 为 BIGINT，故 post_id 用 bigint。
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.palmistry_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    bigint NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.palmistry_claims ENABLE ROW LEVEL SECURITY;

-- 本人只读自己行
DROP POLICY IF EXISTS palmistry_claims_select ON public.palmistry_claims;
CREATE POLICY palmistry_claims_select ON public.palmistry_claims
  FOR SELECT USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- 4. forum_posts 增加 user_id（作者 auth.uid），用于看手相 RPC 防冒领
--    历史帖 user_id 为 NULL（不可领看手相，仅新帖可领），不影响其它功能。
-- -------------------------------------------------------------
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON public.forum_posts(user_id);

-- -------------------------------------------------------------
-- 5. 扩展注册触发器 handle_new_user：保留原 user_code 生成，
--    末尾解析 invite_code（upper 比对 profiles.user_code）并发邀请奖励。
--    非法 / 空 / 自邀 / 读不到配置 → 静默忽略，绝不影响注册。
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite_code  text;
  v_inviter_id   uuid;
  v_reward_points int;
  v_invitee_id   uuid := NEW.id;
BEGIN
  -- 5.1 建 profile（保留原有 user_code 生成逻辑）
  INSERT INTO public.profiles (id, guest_id, nickname, role, identity_type, identity_subtype, user_code)
  VALUES (
    NEW.id,
    'g_' || gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    'user',
    COALESCE(NEW.raw_user_meta_data->>'identity_type', 'customer'),
    NEW.raw_user_meta_data->>'identity_subtype',
    public.generate_user_code()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5.2 邀请奖励：读取注册时携带的 invite_code
  v_invite_code := NULLIF(btrim(NEW.raw_user_meta_data->>'invite_code'), '');
  IF v_invite_code IS NOT NULL THEN
    -- 按 user_code（upper）解析邀请人
    SELECT id INTO v_inviter_id
      FROM public.profiles
     WHERE user_code = upper(v_invite_code);

    -- 合法邀请人 且 非自邀（inviter ≠ 新用户）
    IF v_inviter_id IS NOT NULL AND v_inviter_id <> v_invitee_id THEN
      -- 读奖励值（读不到则用默认 50）
      SELECT value INTO v_reward_points
        FROM public.site_settings WHERE key = 'invite_reward_points';
      v_reward_points := COALESCE(v_reward_points, 50);

      -- 原子发奖（改余额 + 写 reward_ledger）
      PERFORM public.apply_reward_change(v_inviter_id, 'points', v_reward_points, '邀请注册奖励', NULL);

      -- 记录邀请关系（一人只认首个邀请人，冲突则忽略）
      INSERT INTO public.invitations (inviter_id, invitee_id, invite_code, reward_points, reward_granted)
      VALUES (v_inviter_id, v_invitee_id, upper(v_invite_code), v_reward_points, true)
      ON CONFLICT (invitee_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 触发器 on_auth_user_created 已在 010 创建，这里无需重建（CREATE OR REPLACE 仅替换函数体）。

-- -------------------------------------------------------------
-- 6. 看手相领奖 RPC：claim_palmistry_reward(p_post_id bigint) returns jsonb
--    返回：{granted:true, points, remaining} 或 {granted:false, reason}
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_palmistry_reward(p_post_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_post_user_id uuid;
  v_limit        int;
  v_today_count  int;
  v_points       int;
  v_remaining    int;
BEGIN
  -- 6.1 必须登录
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  -- 6.2 校验帖子存在且属于当前用户（防冒领他人帖）
  SELECT user_id INTO v_post_user_id
    FROM public.forum_posts
   WHERE id = p_post_id;
  IF v_post_user_id IS NULL THEN
    RAISE EXCEPTION '帖子不存在';
  END IF;
  IF v_post_user_id <> v_uid THEN
    RAISE EXCEPTION '仅可领取自己发布的看手相帖';
  END IF;

  -- 6.3 同一帖子已领过 → 直接返回
  IF EXISTS (
    SELECT 1 FROM public.palmistry_claims
     WHERE user_id = v_uid AND post_id = p_post_id
  ) THEN
    RETURN jsonb_build_object('granted', false, 'reason', '已领取');
  END IF;

  -- 6.4 读每日上限（读不到用默认 1；<=0 视为关闭）
  SELECT value INTO v_limit FROM public.site_settings WHERE key = 'palmistry_daily_limit';
  v_limit := COALESCE(v_limit, 1);

  -- 6.5 当日已领次数（以 claimed_at 当日计）
  SELECT count(*) INTO v_today_count
    FROM public.palmistry_claims
   WHERE user_id = v_uid
     AND claimed_at >= date_trunc('day', now());

  IF v_today_count >= v_limit THEN
    RETURN jsonb_build_object('granted', false, 'reason', '今日已领完');
  END IF;

  -- 6.6 读单次奖励值（默认 10）
  SELECT value INTO v_points FROM public.site_settings WHERE key = 'palmistry_reward_points';
  v_points := COALESCE(v_points, 10);

  -- 6.7 原子发奖 + 写领取记录
  PERFORM public.apply_reward_change(v_uid, 'points', v_points, '看手相奖励', NULL);

  INSERT INTO public.palmistry_claims (user_id, post_id) VALUES (v_uid, p_post_id);

  v_remaining := GREATEST(v_limit - v_today_count - 1, 0);
  RETURN jsonb_build_object('granted', true, 'points', v_points, 'remaining', v_remaining);
END;
$$;

-- -------------------------------------------------------------
-- 7. forum_categories 种子：看手相分类（仅 system 项，UI 不可删）
--    真实字段名为 value / label / icon / is_system（非 category_key / name）
-- -------------------------------------------------------------
INSERT INTO public.forum_categories (value, label, icon, sort_order, is_system)
VALUES ('palmistry', '看手相', '🔮', 6, true)
ON CONFLICT (value) DO NOTHING;
