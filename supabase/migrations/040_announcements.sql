-- =============================================================
-- 040_announcements.sql  —— 首页公告「后台可管」
-- 在 Supabase SQL Editor 中执行（可重复执行，幂等）。
--
-- 依赖：010_auth_profiles.sql / 011_auth_functions.sql /
--       012_rls_policies.sql / 013_admin_setup.sql
-- （is_admin() 函数由 011 提供）
-- =============================================================

-- 1. 公告表
CREATE TABLE IF NOT EXISTS public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag         text NOT NULL DEFAULT '公告',
  title       text NOT NULL,
  content     text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. 排序索引
CREATE INDEX IF NOT EXISTS idx_announcements_sort ON public.announcements (sort_order);

-- 3. 启用行级安全
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 4. RLS：所有人可读「已上架」公告
DROP POLICY IF EXISTS "announcements_public_select" ON public.announcements;
CREATE POLICY "announcements_public_select" ON public.announcements
  FOR SELECT USING (active = true);

-- 5. RLS：仅管理员（is_admin()）可增删改
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_admin_all" ON public.announcements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. 种子数据（仅当表为空时插入，避免重复执行刷屏）
INSERT INTO public.announcements (tag, title, content, sort_order)
SELECT * FROM (VALUES
  ('新功能', '任务大厅已开放', '认领修行任务、提交凭证，赚取阳德与积分', 0),
  ('活动',   '积分兑换上线',   '前往积德坊兑换中心，用积分换取专属好礼', 1),
  ('公告',   '社区公约',       '友善交流，结善缘、修善行。', 2)
) AS seed(tag, title, content, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.announcements);
