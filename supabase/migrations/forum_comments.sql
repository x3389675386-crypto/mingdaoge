-- =============================================
-- 明道阁论坛评论表 (forum_comments) 建表语句
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 创建评论表
CREATE TABLE IF NOT EXISTS forum_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT '匿名',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 创建索引（按帖子查询评论）
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON forum_comments(post_id);

-- 3. 按时间排序索引
CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON forum_comments(created_at ASC);

-- 4. 启用 RLS
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略：所有人可读
CREATE POLICY "forum_comments_select_policy" ON forum_comments
  FOR SELECT
  USING (true);

-- 6. RLS 策略：所有人可插入（匿名论坛，无需登录）
CREATE POLICY "forum_comments_insert_policy" ON forum_comments
  FOR INSERT
  WITH CHECK (true);

-- 7. RLS 策略：所有人可删除（匿名论坛，简化管理）
CREATE POLICY "forum_comments_delete_policy" ON forum_comments
  FOR DELETE
  USING (true);

-- 8. 评论数统计触发器（可选：更新帖子评论数缓存字段）
-- 注意：forum_posts 表需先添加 comment_count 字段
-- ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- CREATE OR REPLACE FUNCTION update_post_comment_count()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     UPDATE forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
--     RETURN NEW;
--   ELSIF TG_OP = 'DELETE' THEN
--     UPDATE forum_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
--     RETURN OLD;
--   END IF;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_update_comment_count
--   AFTER INSERT OR DELETE ON forum_comments
--   FOR EACH ROW
--   EXECUTE FUNCTION update_post_comment_count();
