-- 050_avatar.sql  —— 真实头像上传/更换
-- 依赖 010~013（auth / is_admin）

-- 1. profiles 加头像列
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
-- 2. 论坛帖存作者头像，保证「我的帖」也显示真图
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS author_avatar_url text;

-- 3. Storage 策略：头像放 images 桶 avatars/ 前缀，仅本人可写，公开可读
DROP POLICY IF EXISTS avatar_upload ON storage.objects;
CREATE POLICY avatar_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images' AND name LIKE 'avatars/' || auth.uid()::text || '%');

DROP POLICY IF EXISTS avatar_read ON storage.objects;
CREATE POLICY avatar_read ON storage.objects
  FOR SELECT USING (bucket_id = 'images' AND name LIKE 'avatars/%');

DROP POLICY IF EXISTS avatar_update ON storage.objects;
CREATE POLICY avatar_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images' AND name LIKE 'avatars/' || auth.uid()::text || '%')
  WITH CHECK (bucket_id = 'images' AND name LIKE 'avatars/' || auth.uid()::text || '%');

DROP POLICY IF EXISTS avatar_delete ON storage.objects;
CREATE POLICY avatar_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images' AND name LIKE 'avatars/' || auth.uid()::text || '%');
