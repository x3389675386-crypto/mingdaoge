-- 010_auth_profiles.sql
-- 引入 Supabase Auth：profiles 表 + 触发器（注册时自动建 profile）
--
-- 执行顺序：010 → 011 → 012 → 013
-- 说明：profiles 是 auth.uid() ↔ guest_id ↔ nickname ↔ role 的唯一映射源。

-- 1. profiles 表
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id      TEXT UNIQUE NOT NULL,                       -- 登录态稳定身份；RLS 映射键 & 私聊寻址
  nickname      TEXT NOT NULL DEFAULT '',
  chat_guest_id TEXT,                                       -- 客服专用：固定 'admin'，使 getConversationId 兼容
  role          TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user','admin','agent')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_guest_id ON public.profiles(guest_id);
CREATE INDEX        IF NOT EXISTS idx_profiles_role     ON public.profiles(role);

-- 2. 触发器函数：新用户自动建 profile（默认随机 guest_id，昵称取自 raw_user_meta_data）
--    使用 SECURITY DEFINER + SET search_path，以表 owner 身份写入，规避 RLS 递归。
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, guest_id, nickname, role)
  VALUES (
    NEW.id,
    'g_' || gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
