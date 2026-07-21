/**
 * Supabase Auth 错误 → 中文提示映射
 * 把英文错误码 / 消息翻译为用户友好的中文文案。
 */

/** 兼容的错误对象形态（Supabase AuthError 的子集） */
interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/** 按 error.code 直接映射 */
const CODE_MAP: Record<string, string> = {
  email_exists: '该邮箱已注册，请直接登录',
  weak_password: '密码强度不足，请至少使用 6 位字符',
  invalid_credentials: '邮箱或密码错误',
  user_not_found: '未找到该用户，请检查邮箱',
  email_not_confirmed: '邮箱尚未验证，请先查收验证邮件',
  signup_disabled: '当前暂时关闭注册',
  user_already_exists: '该邮箱已注册，请直接登录',
  too_many_requests: '操作过于频繁，请稍后再试',
  captcha_failed: '验证码校验失败，请重试',
  oTP_expired: '验证码已过期，请重新获取',
  oauth_provider_not_supported: '该登录方式暂不支持',
};

/** 按 message 子串兜底映射 */
const MESSAGE_RULES: Array<[RegExp, string]> = [
  [/already registered/i, '该邮箱已注册，请直接登录'],
  [/password should be at least/i, '密码至少 6 位'],
  [/invalid login|invalid credentials/i, '邮箱或密码错误'],
  [/email not confirmed/i, '邮箱尚未验证，请先查收验证邮件'],
  [/for security purposes|rate limit/i, '操作过于频繁，请稍后再试'],
  [/user not found/i, '未找到该用户，请检查邮箱'],
  [/signups? (are )?not allowed/i, '当前暂时关闭注册'],
  [/unable to validate email/i, '邮箱格式无效'],
  [/no user found|could not find/i, '未找到该用户，请检查邮箱'],
  [/expired|expired token/i, '验证码已过期，请重新获取'],
];

/**
 * 将 Supabase Auth 错误映射为中文提示
 *
 * @param error 错误对象（可能为 null）
 * @returns 中文错误文案
 */
export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return '未知错误，请稍后重试';
  if (error.code && CODE_MAP[error.code]) return CODE_MAP[error.code];
  const msg = error.message || '';
  for (const [re, text] of MESSAGE_RULES) {
    if (re.test(msg)) return text;
  }
  return msg || '操作失败，请稍后重试';
}
