/**
 * 身份解析工具层
 * 封装「我是谁」的唯一解析入口，禁止业务代码直接读 localStorage / profile.guest_id 做寻址。
 */

import { getGuest } from './guestIdentity';

/** profiles 表行结构（前端镜像） */
export interface ProfileRow {
  /** 对应 auth.users.id */
  id: string;
  /** 登录态稳定身份（RLS 映射键 & 私聊寻址） */
  guest_id: string;
  /** 昵称（权威源） */
  nickname: string;
  /** 客服专用：固定 'admin'，使 getConversationId 兼容历史 admin 会话 */
  chat_guest_id: string | null;
  /** 角色：user / admin / agent */
  role: 'user' | 'admin' | 'agent';
  /** 创建时间 */
  created_at: string;
}

/**
 * 解析当前身份对应的 guest_id。
 * 降级顺序：profile.chat_guest_id（客服优先）→ profile.guest_id → localStorage.guest_id → null
 *
 * @param profile 已登录用户的 profile 行；游客传 null
 */
export function resolveGuestId(profile: ProfileRow | null): string | null {
  if (profile) {
    return profile.chat_guest_id || profile.guest_id || null;
  }
  return getGuest()?.guest_id ?? null;
}

/**
 * 解析当前昵称（登录态优先 profile.nickname，游客回退 localStorage）
 *
 * @param profile 已登录用户的 profile 行；游客传 null
 */
export function resolveNickname(profile: ProfileRow | null): string {
  if (profile) return profile.nickname || '';
  return getGuest()?.nickname || '';
}
