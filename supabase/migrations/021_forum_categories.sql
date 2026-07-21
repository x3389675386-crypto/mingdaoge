-- 021_forum_categories.sql
-- 论坛分类表（替代前端硬编码 FORUM_CATEGORIES），前端动态加载。
-- 含原 4 类 + 功法(gongfa)，均 is_system=true（UI 不可删，可改名/排序）。
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025

CREATE TABLE IF NOT EXISTS public.forum_categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  value       TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

-- 公开读
CREATE POLICY forum_categories_select ON public.forum_categories
  FOR SELECT USING (true);

-- 仅管理员可写（改名 / 排序 / 新增 / 删除非系统项）
CREATE POLICY forum_categories_admin_w ON public.forum_categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 种子：原 4 类 + 功法（gongfa，教材获取复用论坛功法栏目）
INSERT INTO public.forum_categories (value, label, icon, sort_order, is_system) VALUES
  ('paranormal', '灵异事件大全', '👻', 1, true),
  ('handcraft',  '手串手作',     '📿', 2, true),
  ('culture',    '国风文化',     '🏯', 3, true),
  ('chat',       '闲聊灌水',     '💬', 4, true),
  ('gongfa',     '功法',         '📜', 5, true)
ON CONFLICT (value) DO NOTHING;
