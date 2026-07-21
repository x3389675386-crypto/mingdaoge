-- 020_profiles_identity_reward.sql
-- profiles 扩展：身份细分 + user_code（MDG-XXXXX）+ 双账户（阳德/积分）
-- 扩展 handle_new_user 触发器，并回填存量老用户 user_code。
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025
-- 用户手动在 Supabase SQL Editor 按顺序执行（本文件不自动运行）。
-- 幂等：使用 ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / DO 块。

-- 1) 扩展 profiles 列
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_type TEXT NOT NULL DEFAULT 'customer'
    CHECK (identity_type IN ('customer', 'sanxiu', 'famai')),
  ADD COLUMN IF NOT EXISTS identity_subtype TEXT,
  ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS yang_de INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_code ON public.profiles (user_code);

-- 2) user_code 生成函数：循环生成 MDG- + 5 位大写字母数字，直至全局唯一
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    -- md5 十六进制本身即 [0-9A-F]，过滤更保险；取前 5 位
    candidate := 'MDG-' || left(regexp_replace(upper(md5(random()::text)), '[^A-Z0-9]', '', 'g'), 5);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- 3) 扩展 handle_new_user（在 010 基础上，复用既有触发器 on_auth_user_created）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, guest_id, nickname, role, identity_type, identity_subtype, user_code)
  VALUES (
    NEW.id,
    'g_' || gen_random_uuid(),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    'user',
    COALESCE(NEW.raw_user_meta_data->>'identity_type', 'customer'),
    NEW.raw_user_meta_data->>'identity_subtype',
    public.generate_user_code()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- 触发器 on_auth_user_created 已在 010 创建，无需重建。

-- 4) 存量回填：为没有 user_code 的老用户补生成（含已存在但未填身份的默认 customer）
DO $$
BEGIN
  UPDATE public.profiles
     SET user_code = public.generate_user_code()
   WHERE user_code IS NULL;
END
$$;
