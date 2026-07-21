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

-- 游客/用户自读私聊（SECURITY DEFINER 绕过被 RLS 拒的直读）
-- 安全约束（关键）：
--   - 登录用户（auth.uid() NOT NULL 且非 admin）只能读 p_guest_id = 自己 guest_id 的行，杜绝用 RPC 读他人私聊
--   - 管理员（is_admin）可读全部
--   - 游客（auth.uid() IS NULL）保留"传自身 guest_id"兜底（决策 C 保留游客私聊；
--     guest_id 经 /chat?peer=<guest_id> 分享链接公开，属已知残留风险，已从"任意可读"收敛为"仅已知 guest_id"）
CREATE OR REPLACE FUNCTION public.get_my_chat_messages(p_guest_id TEXT)
RETURNS SETOF public.chat_messages
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.chat_messages
  WHERE (sender_id = p_guest_id OR receiver_id = p_guest_id)
    AND (
      auth.uid() IS NULL
      OR public.is_admin()
      OR p_guest_id = public.my_guest_id()
    )
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
