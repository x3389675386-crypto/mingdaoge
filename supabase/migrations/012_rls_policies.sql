-- 012_rls_policies.sql
-- 混合 RLS：先清旧全开放策略，再建按身份收紧的策略（可重复执行）
--
-- 核心目标：修复「anon key 可读全部私聊」的隐私漏洞；保留游客写入，但 SELECT/UPDATE/DELETE 按身份归属收紧。

-- 0. 先清理旧策略（含此前 USING(true) 全开放），保证可重复执行
DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_messages','forum_posts','forum_comments','reviews','messages','profiles'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- 启用 RLS（幂等；表已存在，缺失列由下方 ALTER 补）
ALTER TABLE public.chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;

-- messages 表若无 guest_id 列先补（历史表可能缺失）
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_guest_id ON public.messages(guest_id);

-- 1. chat_messages
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL
        AND (sender_id = public.my_guest_id() OR receiver_id = public.my_guest_id()))
  );

CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT WITH CHECK ( auth.uid() IS NULL OR sender_id = public.my_guest_id() );

CREATE POLICY chat_messages_update ON public.chat_messages
  FOR UPDATE USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL
        AND (sender_id = public.my_guest_id() OR receiver_id = public.my_guest_id()))
  ) WITH CHECK (
    public.is_admin()
    OR (auth.uid() IS NOT NULL
        AND (sender_id = public.my_guest_id() OR receiver_id = public.my_guest_id()))
  );

CREATE POLICY chat_messages_delete ON public.chat_messages
  FOR DELETE USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL
        AND (sender_id = public.my_guest_id() OR receiver_id = public.my_guest_id()))
  );

-- 2. forum_posts（forum_comments / reviews / messages 同构，仅表名不同）
CREATE POLICY forum_posts_select ON public.forum_posts FOR SELECT USING (true);

CREATE POLICY forum_posts_insert ON public.forum_posts
  FOR INSERT WITH CHECK ( auth.uid() IS NULL OR guest_id = public.my_guest_id() );

CREATE POLICY forum_posts_update ON public.forum_posts
  FOR UPDATE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() )
  WITH CHECK ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

CREATE POLICY forum_posts_delete ON public.forum_posts
  FOR DELETE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

-- 3. forum_comments
CREATE POLICY forum_comments_select ON public.forum_comments FOR SELECT USING (true);

CREATE POLICY forum_comments_insert ON public.forum_comments
  FOR INSERT WITH CHECK ( auth.uid() IS NULL OR guest_id = public.my_guest_id() );

CREATE POLICY forum_comments_update ON public.forum_comments
  FOR UPDATE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() )
  WITH CHECK ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

CREATE POLICY forum_comments_delete ON public.forum_comments
  FOR DELETE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

-- 4. reviews
CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (true);

CREATE POLICY reviews_insert ON public.reviews
  FOR INSERT WITH CHECK ( auth.uid() IS NULL OR guest_id = public.my_guest_id() );

CREATE POLICY reviews_update ON public.reviews
  FOR UPDATE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() )
  WITH CHECK ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

CREATE POLICY reviews_delete ON public.reviews
  FOR DELETE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

-- 5. messages（客户留言）
CREATE POLICY messages_select ON public.messages FOR SELECT USING (true);

CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK ( auth.uid() IS NULL OR guest_id = public.my_guest_id() );

CREATE POLICY messages_update ON public.messages
  FOR UPDATE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() )
  WITH CHECK ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

CREATE POLICY messages_delete ON public.messages
  FOR DELETE USING ( (auth.uid() IS NOT NULL AND guest_id = public.my_guest_id()) OR public.is_admin() );

-- 6. profiles 自身 RLS
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);  -- 昵称公开展示
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (public.is_admin());
