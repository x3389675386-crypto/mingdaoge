/**
 * 后台白名单配置（UI 提示 / 兜底层）
 *
 * 真正的鉴权以 profiles.role='admin' 为准，白名单仅作兜底（与库中 is_admin() 函数保持一致）。
 */

/** 管理员白名单邮箱（与 supabase/migrations/011_auth_functions.sql 中 is_admin() 一致） */
export const ADMIN_EMAILS: string[] = ['3389675386@qq.com'];

/** 客服账号邮箱（chat_guest_id='admin' 对外显「明道阁客服」） */
export const SUPPORT_EMAIL = '3389675386@qq.com';
