-- 013_admin_setup.sql
-- 客服 / 管理员初始化模板
--
-- 步骤：
--   1) 在 Supabase Dashboard 用目标邮箱创建一个正式账号（邮箱 + 密码）。
--   2) 将该账号的邮箱替换到下面的 <客服邮箱> 占位处。
--   3) 执行本脚本（幂等）。脚本会：
--        - 将 role 置为 'admin'
--        - 将 chat_guest_id 固定为 'admin'（使 getConversationId 与历史 admin 会话兼容）
--        - 将 nickname 设为 '明道阁客服'
--
-- 注意：<客服邮箱> 必须替换为你实际创建的客服账号邮箱，否则不会命中任何行。
--       未配置 Supabase 时此步骤可暂缓；前端的白名单兜底仍能让该邮箱“视为管理员”。

UPDATE public.profiles
SET role = 'admin',
    chat_guest_id = 'admin',
    nickname = '明道阁客服'
WHERE id = (SELECT id FROM auth.users WHERE email = '<客服邮箱>');
