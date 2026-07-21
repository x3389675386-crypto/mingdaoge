-- 022_gongfa_materials.sql
-- 功法电子书表（论坛功法帖 forum_posts category='gongfa' 的附件），
-- 复用 images bucket 的 gongfa/ 路径（公开读、仅 admin 写）。
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025

CREATE TABLE IF NOT EXISTS public.gongfa_materials (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id     BIGINT NOT NULL REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users (id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gongfa_post ON public.gongfa_materials (post_id);

ALTER TABLE public.gongfa_materials ENABLE ROW LEVEL SECURITY;

-- 电子书元信息公开读（教材获取）
CREATE POLICY gongfa_materials_select ON public.gongfa_materials
  FOR SELECT USING (true);

-- 仅管理员可写（上传 / 删除）
CREATE POLICY gongfa_materials_admin_w ON public.gongfa_materials
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage：确保 images bucket 存在（公开读）
INSERT INTO storage.buckets (id, name, public)
  VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- gongfa/ 路径：仅 admin 写
DROP POLICY IF EXISTS gongfa_upload ON storage.objects;
CREATE POLICY gongfa_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND name LIKE 'gongfa/%' AND public.is_admin());

-- gongfa/ 路径：公开读
DROP POLICY IF EXISTS gongfa_read ON storage.objects;
CREATE POLICY gongfa_read ON storage.objects
  FOR SELECT USING (bucket_id = 'images' AND name LIKE 'gongfa/%');
