-- =============================================================
-- 070_lottery.sql
-- 积分商城 · 幸运转盘抽奖 增量功能迁移
--
-- 依赖：060（site_settings 表 + is_admin() + apply_reward_change 原子改余额）。
--
-- 设计要点（与 060 一致）：
--   1. 所有函数 SECURITY DEFINER + SET search_path = ''，杜绝 search_path 注入。
--   2. 所有积分变动均经 apply_reward_change()，前端不直改 profiles。
--   3. 可重复执行（CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE）。
--   4. lottery_logs 仅本人可读自己行；site_settings 沿用 060 的「公开读 + is_admin 写」策略。
--
-- 说明：site_settings 原仅有 value int 列，抽奖档位 lottery_tiers 为 jsonb，
--      故本迁移为 site_settings 增加 value_json 列（可空），不破坏既有数值配置。
-- =============================================================

-- -------------------------------------------------------------
-- 0. site_settings 增加 jsonb 配置列（存放权重数组等结构化配置）
-- -------------------------------------------------------------
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS value_json jsonb;

-- -------------------------------------------------------------
-- 1. 抽奖记录表 lottery_logs
--    cost=0 为免费抽，cost>0 为付费抽；prize 为中得积分数；tier 为档位名。
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lottery_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cost       int  NOT NULL DEFAULT 0,
  prize      int  NOT NULL DEFAULT 0,
  tier       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 每日免费次数统计需要按日过滤，建索引加速
CREATE INDEX IF NOT EXISTS idx_lottery_logs_user_day
  ON public.lottery_logs (user_id, created_at);

ALTER TABLE public.lottery_logs ENABLE ROW LEVEL SECURITY;

-- 仅本人可读自己行
DROP POLICY IF EXISTS lottery_logs_select ON public.lottery_logs;
CREATE POLICY lottery_logs_select ON public.lottery_logs
  FOR SELECT USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- 2. site_settings 种子（已存在则不覆盖，便于管理员后续手动调整）
--    lottery_cost        = 每次付费抽消耗积分
--    lottery_free_daily  = 每日免费抽次数
--    lottery_tiers       = 抽奖档位权重数组 jsonb（weight 为权重百分比，总和 100）
-- -------------------------------------------------------------
INSERT INTO public.site_settings (key, value, value_json, description) VALUES
  ('lottery_cost',       100, NULL, '每次付费抽奖消耗积分'),
  ('lottery_free_daily', 1,   NULL, '每日免费抽奖次数；N<=0 表示关闭抽奖活动'),
  ('lottery_tiers',      0,
   '[{"tier":"谢谢参与","prize":0,"weight":50},{"tier":"5积分","prize":5,"weight":30},{"tier":"20积分","prize":20,"weight":15},{"tier":"100积分","prize":100,"weight":4},{"tier":"500积分","prize":500,"weight":1}]'::jsonb,
   '抽奖档位权重数组（jsonb）：tier 档位名 / prize 中得积分 / weight 权重百分比')
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------
-- 3. 抽奖 RPC：draw_lottery(p_paid boolean default false) returns jsonb
--    返回：{ok:true, tier, prize, points} 或 {ok:false, reason}
--
--    流程：
--      a. 必须登录，否则 RAISE EXCEPTION '请先登录'
--      b. 免费抽：检查当日 cost=0 行数 < lottery_free_daily，否则返回 {ok:false,reason:'今日免费已用完'}
--      c. 付费抽：读 lottery_cost，经 apply_reward_change 扣积分；积分不足捕获返回 {ok:false,reason:'积分不足'}
--      d. 按 lottery_tiers 权重随机抽一档（服务端 random()），prize>0 经 apply_reward_change 加回
--      e. 写 lottery_logs，返回当前总积分
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.draw_lottery(p_paid boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_cost         int;
  v_free_daily   int;
  v_today_free   int;
  v_tiers        jsonb;
  v_total_weight int;
  v_roll         numeric;
  v_acc          int := 0;
  v_i            int;
  v_picked       jsonb := NULL;
  v_tier         text;
  v_prize        int := 0;
  v_points       int;
BEGIN
  -- 3.1 必须登录
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  -- 3.2 读取配置（读不到用内置默认）
  SELECT value INTO v_cost FROM public.site_settings WHERE key = 'lottery_cost';
  v_cost := COALESCE(v_cost, 100);

  SELECT value INTO v_free_daily FROM public.site_settings WHERE key = 'lottery_free_daily';
  v_free_daily := COALESCE(v_free_daily, 1);

  SELECT value_json INTO v_tiers FROM public.site_settings WHERE key = 'lottery_tiers';
  IF v_tiers IS NULL THEN
    v_tiers := '[{"tier":"谢谢参与","prize":0,"weight":50},{"tier":"5积分","prize":5,"weight":30},{"tier":"20积分","prize":20,"weight":15},{"tier":"100积分","prize":100,"weight":4},{"tier":"500积分","prize":500,"weight":1}]'::jsonb;
  END IF;

  -- 3.3 免费抽：校验当日免费次数
  IF NOT p_paid THEN
    SELECT count(*) INTO v_today_free
      FROM public.lottery_logs
     WHERE user_id = v_uid
       AND cost = 0
       AND created_at >= date_trunc('day', now());
    IF v_today_free >= v_free_daily THEN
      RETURN jsonb_build_object('ok', false, 'reason', '今日免费已用完');
    END IF;
  END IF;

  -- 3.4 付费抽：扣积分（积分不足由 apply_reward_change 报错，捕获返回友好提示）
  IF p_paid THEN
    BEGIN
      PERFORM public.apply_reward_change(v_uid, 'points', -v_cost, '抽奖消耗', NULL);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'reason', '积分不足');
    END;
  END IF;

  -- 3.5 按权重随机抽一档（服务端 random()，防前端篡改）
  SELECT COALESCE(sum((t->>'weight')::int), 0) INTO v_total_weight
    FROM jsonb_array_elements(v_tiers) t;

  v_roll := random() * v_total_weight;
  FOR v_i IN 0 .. jsonb_array_length(v_tiers) - 1 LOOP
    v_picked := v_tiers -> v_i;
    v_acc := v_acc + ((v_picked->>'weight')::int);
    IF v_roll <= v_acc THEN
      EXIT;
    END IF;
  END LOOP;

  -- 兜底：极端空数组时取首档
  IF v_picked IS NULL AND jsonb_array_length(v_tiers) > 0 THEN
    v_picked := v_tiers -> 0;
  END IF;

  v_tier  := v_picked->>'tier';
  v_prize := COALESCE((v_picked->>'prize')::int, 0);

  -- 3.6 中奖加分（prize>0 才加，谢谢参与不重复写账）
  IF v_prize > 0 THEN
    PERFORM public.apply_reward_change(v_uid, 'points', v_prize, '抽奖中奖', NULL);
  END IF;

  -- 3.7 落抽奖记录
  INSERT INTO public.lottery_logs (user_id, cost, prize, tier)
  VALUES (v_uid, CASE WHEN p_paid THEN v_cost ELSE 0 END, v_prize, v_tier);

  -- 3.8 读取当前积分返回前端刷新
  SELECT points INTO v_points FROM public.profiles WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'tier', v_tier,
    'prize', v_prize,
    'points', COALESCE(v_points, 0)
  );
END;
$$;
