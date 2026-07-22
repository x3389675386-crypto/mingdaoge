-- ============================================================================
-- 030_task_system.sql
-- 修行任务派发系统（P2）：三表 + RLS + RPC
--
-- 依赖（须先手动执行 010~013、020~025）：
--   - public.is_admin()                      (011_auth_functions.sql)
--   - public.apply_reward_change(...)        (024_reward_rpc.sql)
--   - public.profiles.identity_type          (020_profiles_identity_reward.sql)
--   - public.reward_ledger                    (023_exchange_reward.sql)
--   - storage bucket 'images'                 (022_gongfa_materials.sql)
--
-- 执行方式：在 Supabase SQL Editor 中新建查询，粘贴本文件全部内容后执行。
-- 本文件可重复执行（函数用 CREATE OR REPLACE；表/索引用 IF NOT EXISTS；
-- 策略先用 DROP POLICY IF EXISTS 再 CREATE）。
-- ============================================================================

-- ============================ 1. 数据表 ============================

CREATE TABLE IF NOT EXISTS public.cultivation_tasks (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  reward_yang_de  INTEGER NOT NULL DEFAULT 0,
  reward_points   INTEGER NOT NULL DEFAULT 0,
  proof_type      TEXT NOT NULL DEFAULT 'both' CHECK (proof_type IN ('text','image','both')),
  identity_scope  TEXT[] NULL,                 -- NULL = 全员可见（顾客也能在任务大厅看到）
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  slots           INTEGER NULL CHECK (slots IS NULL OR slots > 0),
  claimed_count   INTEGER NOT NULL DEFAULT 0,  -- 已认领人数（认领时 +1，用于名额上限与展示）
  deadline        TIMESTAMPTZ NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cultivation_tasks_status  ON public.cultivation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cultivation_tasks_created ON public.cultivation_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cultivation_tasks_scope   ON public.cultivation_tasks USING gin (identity_scope);

CREATE TABLE IF NOT EXISTS public.task_claims (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id         BIGINT NOT NULL REFERENCES public.cultivation_tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','submitted','approved','rejected')),
  proof_text      TEXT,
  proof_image_url TEXT,
  submitted_at    TIMESTAMPTZ NULL,
  reviewed_at     TIMESTAMPTZ NULL,
  review_note     TEXT,                         -- 审核意见（驳回原因 / 通过备注）
  reward_granted  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)                     -- 每用户每任务一次有效认领
);
CREATE INDEX IF NOT EXISTS idx_task_claims_user   ON public.task_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_task_claims_task   ON public.task_claims(task_id);
CREATE INDEX IF NOT EXISTS idx_task_claims_status ON public.task_claims(status) WHERE status = 'submitted';

CREATE TABLE IF NOT EXISTS public.checkin_logs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT current_date,
  yang_de      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)                -- 每用户每日一次
);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_user ON public.checkin_logs(user_id, checkin_date DESC);

-- ============================ 2. RLS ============================

ALTER TABLE public.cultivation_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cultivation_tasks_select ON public.cultivation_tasks;
DROP POLICY IF EXISTS cultivation_tasks_admin  ON public.cultivation_tasks;
CREATE POLICY cultivation_tasks_select ON public.cultivation_tasks
  FOR SELECT USING (status = 'published' OR public.is_admin());   -- 已发布全员可读；admin 可见全部
CREATE POLICY cultivation_tasks_admin ON public.cultivation_tasks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.task_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_claims_select   ON public.task_claims;
DROP POLICY IF EXISTS task_claims_insert   ON public.task_claims;
DROP POLICY IF EXISTS task_claims_update   ON public.task_claims;
DROP POLICY IF EXISTS task_claims_delete   ON public.task_claims;
CREATE POLICY task_claims_select ON public.task_claims
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY task_claims_insert ON public.task_claims
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());  -- 仅本人
CREATE POLICY task_claims_update ON public.task_claims
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY task_claims_delete ON public.task_claims
  FOR DELETE USING (public.is_admin());

ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS checkin_logs_select ON public.checkin_logs;
DROP POLICY IF EXISTS checkin_logs_insert ON public.checkin_logs;
DROP POLICY IF EXISTS checkin_logs_delete ON public.checkin_logs;
CREATE POLICY checkin_logs_select ON public.checkin_logs
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY checkin_logs_insert ON public.checkin_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY checkin_logs_delete ON public.checkin_logs
  FOR DELETE USING (public.is_admin());

-- ============================ 3. Storage：任务凭证图片 ============================
-- 复用 images bucket，凭证统一放 task-proof/ 路径（公开读、仅登录用户写）。

INSERT INTO storage.buckets (id, name, public) VALUES ('images','images', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS task_proof_upload ON storage.objects;
DROP POLICY IF EXISTS task_proof_read   ON storage.objects;
CREATE POLICY task_proof_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND name LIKE 'task-proof/%');
CREATE POLICY task_proof_read ON storage.objects
  FOR SELECT USING (bucket_id = 'images' AND name LIKE 'task-proof/%');

-- ============================ 4. RPC ============================
-- 全部 SECURITY DEFINER + SET search_path = public，复用 is_admin() 与 apply_reward_change。

-- 4.1 管理员发布任务（status 默认 published，可传 'draft' 存草稿）
CREATE OR REPLACE FUNCTION public.publish_task(
  p_title           TEXT,
  p_description     TEXT DEFAULT NULL,
  p_reward_yang_de  INTEGER DEFAULT 0,
  p_reward_points   INTEGER DEFAULT 0,
  p_proof_type      TEXT DEFAULT 'both',
  p_identity_scope  TEXT[] DEFAULT NULL,
  p_deadline        TIMESTAMPTZ DEFAULT NULL,
  p_slots           INTEGER DEFAULT NULL,
  p_status          TEXT DEFAULT 'published'
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id BIGINT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_reward_yang_de < 0 OR p_reward_points < 0 THEN RAISE EXCEPTION 'reward must be non-negative'; END IF;
  IF p_proof_type NOT IN ('text','image','both') THEN RAISE EXCEPTION 'invalid proof_type'; END IF;
  IF p_status NOT IN ('draft','published') THEN RAISE EXCEPTION 'invalid status'; END IF;
  INSERT INTO public.cultivation_tasks (
    title, description, reward_yang_de, reward_points, proof_type,
    identity_scope, deadline, slots, status, created_by
  ) VALUES (
    p_title, p_description, p_reward_yang_de, p_reward_points, p_proof_type,
    p_identity_scope, p_deadline, p_slots, p_status, auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- 4.2 认领任务（校验：登录 / 已发布 / 未截止 / 身份范围 / 名额 / 未重复）
--     注：claimed_count 在「认领成功时 +1」，作为「已认领人数」与名额上限基准（见设计说明）。
CREATE OR REPLACE FUNCTION public.claim_task(p_task_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_task  public.cultivation_tasks%ROWTYPE;
  v_claim BIGINT;
  v_ident TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT * INTO v_task FROM public.cultivation_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'task not found'; END IF;
  IF v_task.status <> 'published' THEN RAISE EXCEPTION 'task not published'; END IF;
  IF v_task.deadline IS NOT NULL AND v_task.deadline < now() THEN RAISE EXCEPTION 'task expired'; END IF;

  -- 身份可见范围：NULL=全员可见；非空则需包含当前用户身份
  IF v_task.identity_scope IS NOT NULL THEN
    SELECT identity_type INTO v_ident FROM public.profiles WHERE id = v_user;
    IF NOT (v_ident = ANY (v_task.identity_scope)) THEN
      IF v_ident = 'customer' THEN
        RAISE EXCEPTION '顾客不可参与修行任务';          -- 顾客可见但不可参与
      ELSE
        RAISE EXCEPTION '无参与权限：身份不在任务可见范围';
      END IF;
    END IF;
  END IF;

  IF v_task.slots IS NOT NULL AND v_task.claimed_count >= v_task.slots THEN
    RAISE EXCEPTION '名额已满';
  END IF;

  SELECT id INTO v_claim FROM public.task_claims WHERE task_id = p_task_id AND user_id = v_user;
  IF FOUND THEN RAISE EXCEPTION '已认领该任务'; END IF;

  INSERT INTO public.task_claims (task_id, user_id, status)
    VALUES (p_task_id, v_user, 'claimed') RETURNING id INTO v_claim;
  UPDATE public.cultivation_tasks SET claimed_count = claimed_count + 1, updated_at = now()
    WHERE id = p_task_id;
  RETURN v_claim;
END; $$;

-- 4.3 提交凭证（本人 claim 行 → submitted；驳回后亦可重交，状态回到 submitted）
CREATE OR REPLACE FUNCTION public.submit_task(
  p_task_id         BIGINT,
  p_proof_text      TEXT DEFAULT NULL,
  p_proof_image_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_claim public.task_claims%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT * INTO v_claim FROM public.task_claims WHERE task_id = p_task_id AND user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION '尚未认领该任务'; END IF;
  IF v_claim.status NOT IN ('claimed','rejected','submitted') THEN
    RAISE EXCEPTION '当前状态不可提交凭证';
  END IF;
  UPDATE public.task_claims
    SET proof_text      = p_proof_text,
        proof_image_url = p_proof_image_url,
        status          = 'submitted',
        submitted_at    = now(),
        reviewed_at     = NULL,
        review_note     = NULL
  WHERE id = v_claim.id;
END; $$;

-- 4.4 审核通过（仅 admin）：依次发放阳德/积分（各经 apply_reward_change 写 reward_ledger）
CREATE OR REPLACE FUNCTION public.approve_task(p_claim_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_claim public.task_claims%ROWTYPE;
  v_task  public.cultivation_tasks%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_claim FROM public.task_claims WHERE id = p_claim_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found'; END IF;
  IF v_claim.status <> 'submitted' THEN RAISE EXCEPTION '无待审凭证'; END IF;
  SELECT * INTO v_task FROM public.cultivation_tasks WHERE id = v_claim.task_id;

  IF v_task.reward_yang_de > 0 THEN
    PERFORM public.apply_reward_change(
      v_claim.user_id, 'yang_de', v_task.reward_yang_de,
      '任务奖励:' || v_task.id, auth.uid());
  END IF;
  IF v_task.reward_points > 0 THEN
    PERFORM public.apply_reward_change(
      v_claim.user_id, 'points', v_task.reward_points,
      '任务奖励:' || v_task.id, auth.uid());
  END IF;

  UPDATE public.task_claims
    SET status = 'approved', reviewed_at = now(), review_note = NULL, reward_granted = true
  WHERE id = p_claim_id;
END; $$;

-- 4.5 审核驳回（仅 admin）：状态 → rejected，review_note 记录原因；之后可重交
CREATE OR REPLACE FUNCTION public.reject_task(p_claim_id BIGINT, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_claim public.task_claims%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_claim FROM public.task_claims WHERE id = p_claim_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found'; END IF;
  UPDATE public.task_claims
    SET status = 'rejected', reviewed_at = now(), review_note = p_note
  WHERE id = p_claim_id;
END; $$;

-- 4.6 每日签到（每用户每日一次；已签到返回 0 防重复）
CREATE OR REPLACE FUNCTION public.daily_checkin()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_amount INTEGER := 5;          -- 每日签到固定阳德（如需调整改此处常量）
  v_today  DATE := current_date;
  v_exist  BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT id INTO v_exist FROM public.checkin_logs WHERE user_id = v_user AND checkin_date = v_today;
  IF FOUND THEN RETURN 0; END IF;  -- 今日已签到
  PERFORM public.apply_reward_change(v_user, 'yang_de', v_amount, '每日签到', NULL);
  INSERT INTO public.checkin_logs (user_id, checkin_date, yang_de) VALUES (v_user, v_today, v_amount);
  RETURN v_amount;
END; $$;

-- 4.7 系统自动功德（发帖 / 结缘）：查 reward_ledger 今日该 reason 累计，未超 cap 才发放
--     reason 约定：'发帖得功德' / '结缘得功德'；operator_id = NULL（系统自动）
CREATE OR REPLACE FUNCTION public.grant_daily_merit(
  p_kind       TEXT,    -- reason，如 '发帖得功德' / '结缘得功德'
  p_amount     INTEGER, -- 本次发放额
  p_daily_cap  INTEGER  -- 该 reason 当日累计上限
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_today DATE := current_date;
  v_sum   INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF p_amount <= 0 THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(delta), 0) INTO v_sum
    FROM public.reward_ledger
    WHERE user_id = v_user AND reason = p_kind AND created_at::date = v_today;
  IF v_sum + p_amount > p_daily_cap THEN RETURN 0; END IF;   -- 超上限不发
  PERFORM public.apply_reward_change(v_user, 'yang_de', p_amount, p_kind, NULL);
  RETURN p_amount;
END; $$;

-- ============================================================================
-- 手动执行清单（站长）：
--   1. 打开 Supabase 项目 → SQL Editor。
--   2. 确认已执行 020~025（is_admin / apply_reward_change / profiles.identity_type / reward_ledger 均已存在）。
--   3. 新建查询，粘贴本文件全部内容并执行。
--   4. 验证：
--      SELECT count(*) FROM public.cultivation_tasks;          -- 0（待管理员发布）
--      SELECT proname FROM pg_proc WHERE proname IN
--        ('publish_task','claim_task','submit_task','approve_task','reject_task','daily_checkin','grant_daily_merit');
--      -- 应返回 7 个函数名
-- ============================================================================
