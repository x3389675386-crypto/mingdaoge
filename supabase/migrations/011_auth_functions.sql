-- 011_auth_functions.sql
-- 身份映射与判定函数（SECURITY DEFINER + SET search_path 规避递归 RLS）
--
-- 所有 auth.uid() → guest_id 映射、admin 判定均走这些函数，禁止在 RLS 策略里直接 SELECT profiles。

-- auth.uid() -> 有效 guest_id（客服优先 chat_guest_id）
CREATE OR REPLACE FUNCTION public.my_guest_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(chat_guest_id, guest_id) FROM public.profiles WHERE id = auth.uid();
$$;

-- 是否管理员：profiles.role='admin' 或 邮箱在白名单（与前端 isAdmin 对齐）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) OR (auth.email() = ANY (ARRAY['3389675386@qq.com']));
$$;

-- 游客/用户自读私聊（SECURITY DEFINER：anon 只能取传入 guest_id 的行，杜绝全表读）
CREATE OR REPLACE FUNCTION public.get_my_chat_messages(p_guest_id TEXT)
RETURNS SETOF public.chat_messages
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.chat_messages
  WHERE sender_id = p_guest_id OR receiver_id = p_guest_id
  ORDER BY created_at ASC;
$$;

-- 管理员读全部私聊（严格 is_admin 守卫，非 admin 直接抛错）
CREATE OR REPLACE FUNCTION public.get_all_chat_messages()
RETURNS SETOF public.chat_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.chat_messages ORDER BY created_at DESC;
END;
$$;
