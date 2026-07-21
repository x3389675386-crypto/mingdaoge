-- 024_reward_rpc.sql
-- 双账户 / 兑换 / 提现 / 点赞 / 按 ID 解析 的 RPC（SECURITY DEFINER + SET search_path = public）
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025
-- 前置：023 已建 reward_ledger / exchange_items / exchange_orders / user_identities
--       021 已建 forum_categories；022 已建 gongfa_materials
--       010 已建 forum_posts（add_like 依赖 forum_posts.likes）

-- 内部原子助手：原子改 profiles 余额 + 写 reward_ledger（被下述公开 RPC 调用）
CREATE OR REPLACE FUNCTION public.apply_reward_change(
  p_user_id   UUID,
  p_kind      TEXT,
  p_delta     INT,
  p_reason    TEXT,
  p_operator_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_kind = 'yang_de' THEN
    UPDATE public.profiles SET yang_de = yang_de + p_delta WHERE id = p_user_id RETURNING yang_de INTO v_balance;
  ELSE
    UPDATE public.profiles SET points = points + p_delta WHERE id = p_user_id RETURNING points INTO v_balance;
  END IF;
  INSERT INTO public.reward_ledger (user_id, kind, delta, balance_after, reason, operator_id)
    VALUES (p_user_id, p_kind, p_delta, v_balance, p_reason, p_operator_id);
  RETURN v_balance;
END;
$$;

-- 管理员手动加减（P0-11），写入流水（operator_id = 当前管理员）
CREATE OR REPLACE FUNCTION public.admin_adjust_reward(
  p_user_id UUID,
  p_kind    TEXT,
  p_delta   INT,
  p_reason  TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.apply_reward_change(p_user_id, p_kind, p_delta, p_reason, auth.uid());
END;
$$;

-- 兑换实物 / 法器 / 清修卡（P0-10）：校验余额 → 扣减 → 写流水 → 生成 fulfilled 订单
CREATE OR REPLACE FUNCTION public.redeem_item(p_item_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_cost  INT;
  v_kind  TEXT;
  v_order BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT cost_amount, cost_kind INTO v_cost, v_kind
    FROM public.exchange_items WHERE id = p_item_id AND status = 'active';
  IF v_cost IS NULL THEN RAISE EXCEPTION 'item not found'; END IF;
  IF v_kind = 'yang_de' THEN
    IF (SELECT yang_de FROM public.profiles WHERE id = v_user) < v_cost THEN RAISE EXCEPTION 'insufficient yang_de'; END IF;
  ELSE
    IF (SELECT points FROM public.profiles WHERE id = v_user) < v_cost THEN RAISE EXCEPTION 'insufficient points'; END IF;
  END IF;
  PERFORM public.apply_reward_change(v_user, v_kind, -v_cost, '兑换:' || p_item_id, NULL);
  INSERT INTO public.exchange_orders (user_id, item_id, kind, cost_kind, amount, status)
    VALUES (v_user, p_item_id, 'redeem', v_kind, v_cost, 'fulfilled') RETURNING id INTO v_order;
  RETURN v_order;
END;
$$;

-- 阳德提现申请（决策4：≥1000 且整千，提交即锁定余额，pending 待审核）
CREATE OR REPLACE FUNCTION public.create_cashout_order(p_amount INT, p_note TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_order BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF p_amount < 1000 OR p_amount % 1000 <> 0 THEN
    RAISE EXCEPTION 'amount must be multiple of 1000 and >= 1000';
  END IF;
  IF (SELECT yang_de FROM public.profiles WHERE id = v_user) < p_amount THEN
    RAISE EXCEPTION 'insufficient yang_de';
  END IF;
  PERFORM public.apply_reward_change(v_user, 'yang_de', -p_amount, '阳德提现申请', NULL);
  INSERT INTO public.exchange_orders (user_id, kind, cost_kind, amount, status, note)
    VALUES (v_user, 'cashout', 'yang_de', p_amount, 'pending', p_note) RETURNING id INTO v_order;
  RETURN v_order;
END;
$$;

-- 管理员处理提现（P0-11 / 审核流）
--   reject  : 退回阳德（apply_reward_change +amount），status='rejected'
--   approve : status='approved'（审核通过，待兑付）
--   fulfill : status='fulfilled'（已兑付）
CREATE OR REPLACE FUNCTION public.approve_cashout(p_order_id BIGINT, p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount INT;
  v_uid   UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT amount, user_id INTO v_amount, v_uid
    FROM public.exchange_orders WHERE id = p_order_id AND kind = 'cashout';
  IF v_amount IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;

  IF p_action = 'reject' THEN
    PERFORM public.apply_reward_change(v_uid, 'yang_de', v_amount, '提现驳回退回', auth.uid());
    UPDATE public.exchange_orders SET status = 'rejected', operator_id = auth.uid(), updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'approve' THEN
    UPDATE public.exchange_orders SET status = 'approved', operator_id = auth.uid(), updated_at = now() WHERE id = p_order_id;
  ELSIF p_action = 'fulfill' THEN
    UPDATE public.exchange_orders SET status = 'fulfilled', operator_id = auth.uid(), updated_at = now() WHERE id = p_order_id;
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
END;
$$;

-- 点赞（P0-6，每人一次）：INSERT 唯一冲突忽略；仅当插入成功才 forum_posts.likes + 1
CREATE OR REPLACE FUNCTION public.add_like(p_post_id BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_n     INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  INSERT INTO public.forum_post_likes (post_id, user_id) VALUES (p_post_id, v_user)
    ON CONFLICT DO NOTHING;
  UPDATE public.forum_posts SET likes = likes + 1
   WHERE id = p_post_id
     AND EXISTS (SELECT 1 FROM public.forum_post_likes WHERE post_id = p_post_id AND user_id = v_user);
  SELECT likes INTO v_n FROM public.forum_posts WHERE id = p_post_id;
  RETURN v_n;
END;
$$;

-- forum_post_likes 表（点赞唯一约束，每人每帖一次）
CREATE TABLE IF NOT EXISTS public.forum_post_likes (
  post_id    BIGINT NOT NULL REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY forum_post_likes_select ON public.forum_post_likes FOR SELECT USING (true);
CREATE POLICY forum_post_likes_insert ON public.forum_post_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 论坛删帖策略：仅管理员可删（覆盖原 owner 可删逻辑）
DROP POLICY IF EXISTS forum_posts_delete ON public.forum_posts;
CREATE POLICY forum_posts_delete ON public.forum_posts
  FOR DELETE USING (public.is_admin());

-- 按 ID 解析私聊对方（P0-9）：兼容 user_code（MDG-XXXXX，忽略大小写）与旧 guest_id
CREATE OR REPLACE FUNCTION public.resolve_guest_by_code(p_input TEXT)
RETURNS TABLE (guest_id TEXT, nickname TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(chat_guest_id, guest_id), nickname
    FROM public.profiles
   WHERE user_code = upper(p_input) OR guest_id = p_input;
$$;
