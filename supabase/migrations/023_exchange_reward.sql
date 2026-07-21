-- 023_exchange_reward.sql
-- 双账户闭环相关表：reward_ledger（流水）/ exchange_items（兑换项）/ exchange_orders（订单）/ user_identities（身份细分种子）
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025

-- 1) 余额变动流水（所有阳德/积分变动必经此表，由 RPC 写入）
CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('yang_de', 'points')),
  delta         INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason        TEXT,
  operator_id   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.reward_ledger (user_id, created_at DESC);

-- 2) 兑换项（admin CRUD）
CREATE TABLE IF NOT EXISTS public.exchange_items (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  cost_kind    TEXT NOT NULL CHECK (cost_kind IN ('yang_de', 'points')),
  cost_amount  INTEGER NOT NULL,
  stock        INTEGER,
  item_type    TEXT NOT NULL CHECK (item_type IN ('bracelet', 'cash', 'magic_tool', 'retreat_card')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) 兑换/提现订单
CREATE TABLE IF NOT EXISTS public.exchange_orders (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_id      BIGINT REFERENCES public.exchange_items (id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('redeem', 'cashout')),
  cost_kind    TEXT NOT NULL CHECK (cost_kind IN ('yang_de', 'points')),
  amount       INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  note         TEXT,
  operator_id  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.exchange_orders (user_id, created_at DESC);

-- 4) 身份细分种子（user_identities，镜像前端 src/lib/identities.ts）
CREATE TABLE IF NOT EXISTS public.user_identities (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('customer', 'sanxiu', 'famai')),
  key          TEXT NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  sort_order   INT DEFAULT 0,
  UNIQUE (type, key)
);

-- ---------------- RLS（混合：公开读 / 本人+admin / 仅 RPC 写流水）----------------

ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY reward_ledger_select ON public.reward_ledger
  FOR SELECT USING (public.is_admin() OR user_id = auth.uid());

ALTER TABLE public.exchange_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_items_select ON public.exchange_items
  FOR SELECT USING (true);
CREATE POLICY exchange_items_admin ON public.exchange_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.exchange_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY exchange_orders_select ON public.exchange_orders
  FOR SELECT USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY exchange_orders_insert ON public.exchange_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY exchange_orders_admin ON public.exchange_orders
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_identities_select ON public.user_identities
  FOR SELECT USING (true);
