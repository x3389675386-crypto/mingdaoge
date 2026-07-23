/**
 * 邀请相关 helper：配置键、默认值、邀请链接生成、剪贴板复制。
 * 看手相相关常量也集中在 palmistry.ts，这里只放邀请侧。
 */

import { getSiteSetting, upsertSiteSetting } from './siteSettings';

/** site_settings 配置键 */
export const INVITE_REWARD_KEY = 'invite_reward_points';

/** 默认数值（与 060 种子一致，读不到配置时回退） */
export const DEFAULT_INVITE_REWARD = 50;

/** 看手相相关默认值（供 palmistry.ts 复用） */
export const DEFAULT_PALMIRSTRY_REWARD = 10;
export const DEFAULT_PALMIRSTRY_DAILY = 1;

/** 生成完整邀请链接：{origin}/register?invite=<user_code> */
export function buildInviteLink(userCode: string): string {
  const origin = window.location.origin;
  return `${origin}/register?invite=${encodeURIComponent(userCode)}`;
}

/** 复制文本到剪贴板（优先 navigator.clipboard，失败回退 execCommand） */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('[明道阁] 复制失败（clipboard API）:', e);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    console.warn('[明道阁] 复制失败（execCommand）:', e);
    return false;
  }
}

/** 读取邀请奖励积分（带默认回退） */
export function getInviteRewardPoints(): Promise<number> {
  return getSiteSetting(INVITE_REWARD_KEY, DEFAULT_INVITE_REWARD);
}

/** 写入邀请奖励积分（管理员） */
export function setInviteRewardPoints(value: number): Promise<void> {
  return upsertSiteSetting(INVITE_REWARD_KEY, value);
}
