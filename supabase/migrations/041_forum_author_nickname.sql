-- =============================================================
-- 041_forum_author_nickname.sql  —— 论坛帖子作者昵称字段
-- （配合前端「发帖自动带当前用户昵称」需求，author_nickname 与 author 同源）
-- 在 Supabase SQL Editor 中执行（可重复执行，幂等）。
--
-- 说明：前端已对「列不存在」做兼容回退（写 author、读 author），
-- 因此本迁移即使不执行也不影响发帖功能；执行后 author_nickname 会独立落库。
-- =============================================================

-- 1. 新增 author_nickname 列（默认从已有 author 同步，避免历史帖为空）
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS author_nickname text;

UPDATE public.forum_posts
  SET author_nickname = author
  WHERE author_nickname IS NULL OR author_nickname = '';

-- 2. 历史补偿：guest_id 已有索引，无需调整
