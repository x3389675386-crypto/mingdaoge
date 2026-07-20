-- =============================================
-- 明道阁私聊消息表 (chat_messages) 建表 + RLS
-- 在 Supabase SQL Editor 中执行
-- 说明：游客无 Auth 身份，采用应用层管控 + 开放 RLS（方案 A）
--       数据库层非强隔离，安全性依赖前端只查询本人 guest_id 相关行
-- =============================================

-- 1. 创建私聊消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id TEXT NOT NULL,                 -- 两 guest_id 排序拼接，确定性生成
  sender_id TEXT NOT NULL,                        -- 发送方 guest_id
  sender_name TEXT NOT NULL DEFAULT '匿名道友',   -- 发送方昵称（冗余，改昵称不影响历史）
  receiver_id TEXT NOT NULL,                      -- 接收方 guest_id
  receiver_name TEXT NOT NULL DEFAULT '匿名道友', -- 接收方昵称（冗余）
  content TEXT NOT NULL,                          -- 文本内容
  type TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'image')),            -- 消息类型
  image_url TEXT,                                 -- 图片消息 URL（base64 或 Storage）
  is_read BOOLEAN NOT NULL DEFAULT false,         -- 已读标记（P1-2）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);

-- 3. 启用 RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：开放读（应用层过滤本人会话）
CREATE POLICY "chat_messages_select_policy" ON chat_messages
  FOR SELECT USING (true);

-- 5. RLS 策略：开放写（游客无 Auth，WITH CHECK(true)）
CREATE POLICY "chat_messages_insert_policy" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- 6. RLS 策略：开放更新（仅用于 is_read 已读标记）
CREATE POLICY "chat_messages_update_policy" ON chat_messages
  FOR UPDATE USING (true) WITH CHECK (true);

-- 7. 将表加入 Realtime 发布（实时推送 INSERT）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
