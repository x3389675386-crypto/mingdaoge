/**
 * 私聊系统常量与工具
 * 全项目统一引用，禁止在别处硬编码 'admin' / 通道名 / 存储键。
 */

/** 客服固定 guest_id */
export const ADMIN_GUEST_ID = 'admin';

/** 客服昵称 */
export const ADMIN_NAME = '明道阁客服';

/** Realtime 订阅通道名 */
export const CHAT_REALTIME_CHANNEL = 'chat_messages_changes';

/** 未配置 Supabase 时，本机消息持久化的 localStorage 键 */
export const CHAT_STORAGE_KEY = 'mingdao_chat_messages';

/**
 * 确定性派生会话ID：将两 guest_id 排序后拼接。
 * 任意一方发起都落入同一会话，前后台共用。
 */
export function getConversationId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** 由 guest_id 生成稳定的头像色块（HSL 哈希） */
export function avatarColor(guestId: string): string {
  let hash = 0;
  for (let i = 0; i < guestId.length; i++) {
    hash = guestId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}
