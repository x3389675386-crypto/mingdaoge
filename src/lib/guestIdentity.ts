/**
 * 游客身份管理
 * 不引入任何登录系统，仅凭 localStorage 持久化的随机 guest_id + 昵称识别游客。
 * 换设备 / 清缓存即视为新游客，历史会话不可见（用户已知晓并接受）。
 */

/** localStorage 存储键 */
const GUEST_KEY = 'mingdao_guest';

/** 游客身份结构 */
export interface GuestIdentity {
  /** 随机 UUID，全局唯一 */
  guest_id: string;
  /** 昵称（首次填写，可修改） */
  nickname: string;
}

/** 生成随机 guest_id */
function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 兜底（极旧环境）
  return 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** 读取已存储的游客身份；不存在或结构异常返回 null */
export function getGuest(): GuestIdentity | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj.guest_id === 'string' && obj.guest_id) {
      return { guest_id: obj.guest_id, nickname: obj.nickname || '' };
    }
  } catch {
    return null;
  }
  return null;
}

/** 是否已存在游客身份（无论昵称是否已填） */
export function hasGuest(): boolean {
  return !!getGuest();
}

/**
 * 确保存在 guest_id（没有则生成并落库，昵称留空）。
 * 返回当前 guest_id，供需要确定性身份的场景使用。
 */
export function ensureGuestId(): string {
  const existing = getGuest();
  if (existing) return existing.guest_id;
  const id = generateGuestId();
  localStorage.setItem(GUEST_KEY, JSON.stringify({ guest_id: id, nickname: '' }));
  return id;
}

/**
 * 写入昵称，返回完整身份对象。
 * 若此前已有 guest_id 则保留，仅更新昵称。
 */
export function setNickname(name: string): GuestIdentity {
  const existing = getGuest();
  const next: GuestIdentity = {
    guest_id: existing?.guest_id || generateGuestId(),
    nickname: name,
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  return next;
}

/** 取昵称短后缀（UUID 末 4 位），用于重名区分展示 */
export function guestIdSuffix(guestId: string): string {
  const clean = guestId.replace(/[^a-z0-9]/gi, '');
  return clean.slice(-4);
}
