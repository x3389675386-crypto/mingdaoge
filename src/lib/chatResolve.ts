/**
 * 按 ID 解析私聊对方封装（P0-9）。
 *
 * 兼容 user_code（MDG-XXXXX，RPC 内部 upper 忽略大小写）与旧 guest_id。
 * 解析成功返回对方 guest_id + nickname，供 ChatContext.openConversation 复用既有逻辑。
 */

import { supabase, isSupabaseConfigured } from './supabase';

/** 解析出的私聊对方 */
export interface ResolvedPeer {
  /** 对方聊天身份 guest_id */
  guest_id: string;
  /** 对方昵称 */
  nickname: string;
}

/**
 * 按 user_code 或 guest_id 解析私聊对方。
 * @param input 用户输入的 ID（MDG-XXXXX 或旧 guest_id）
 * @returns 解析到的对方；未找到返回 null
 */
export async function resolveById(input: string): Promise<ResolvedPeer | null> {
  const code = (input || '').trim();
  if (!code) return null;
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('resolve_guest_by_code', { p_input: code });
  if (error) {
    console.error('[明道阁] 解析 ID 失败:', error.message);
    return null;
  }
  const rows = (data as Array<{ guest_id: string; nickname: string }>) || [];
  if (rows.length === 0) return null;
  return { guest_id: rows[0].guest_id, nickname: rows[0].nickname || '道友' };
}
