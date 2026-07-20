-- ============================================================
-- P2-3 / CHAT-12：论坛帖 / 评论 / 晒图 增加 guest_id 字段
-- 用途：作者处「私聊」按钮携带 guest_id 一键建立会话
-- 兼容：三表 RLS 均为开放（USING(true)），加可空列无需改策略
-- 幂等：全部使用 IF NOT EXISTS，可重复执行
-- ============================================================

-- 论坛帖
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_forum_posts_guest_id ON forum_posts(guest_id);

-- 论坛评论
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_forum_comments_guest_id ON forum_comments(guest_id);

-- 晒图
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_guest_id ON reviews(guest_id);
