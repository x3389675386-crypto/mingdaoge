import { supabase, isSupabaseConfigured } from './supabase';

/** 购买引导图在 Storage bucket `images` 中的固定对象名（覆盖上传即替换） */
export const BUY_GUIDE_OBJECT = 'buy-guide';

/**
 * 本地降级：未配置 Supabase 时，管理员在后台上传的图片仅保存在内存中（当前会话有效），
 * 刷新页面后失效。配置 Supabase 后替换会持久化到云端。
 */
let localBuyGuideUrl: string | null = null;

/** 设置本地降级预览图（仅当前会话） */
export function setLocalBuyGuideUrl(url: string | null): void {
  localBuyGuideUrl = url;
}

/**
 * 获取购买引导图地址。
 * - Supabase 已配置：返回 bucket `images` 中固定对象 `buy-guide` 的公开 URL（后台替换后刷新即变）。
 * - 未配置：返回本地会话中的预览（若有），否则 null。
 */
export function getBuyGuideUrl(): string | null {
  if (isSupabaseConfigured) {
    const { data } = supabase.storage.from('images').getPublicUrl(BUY_GUIDE_OBJECT);
    return data.publicUrl;
  }
  return localBuyGuideUrl;
}
