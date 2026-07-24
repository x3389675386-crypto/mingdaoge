/**
 * 头像实时化辅助：批量查询 profiles 表，按 guest_id 覆盖展示头像。
 *
 * 目的：消除老帖快照问题（帖子仍存 author_avatar_url 旧图），并在用户换头像后全站更新。
 * 注意：posts / comments 存的是 guest_id（而非 user_id），故以 profiles.guest_id 作为映射键。
 *
 * 降级原则：
 *  - 未配置 Supabase → 返回空映射，上层回退到 author_avatar_url / 首字母。
 *  - 查询异常（含 050 未执行导致 avatar_url 列缺失）→ 静默捕获，返回空映射，绝不白屏。
 */

import { supabase, isSupabaseConfigured } from './supabase';

/** 批量按 guest_id 查当前头像，返回 { guest_id: avatar_url } */
export async function fetchAvatarsByGuestIds(
  guestIds: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  // 过滤空值并去重
  const ids = Array.from(new Set((guestIds || []).filter((g): g is string => !!g)));
  if (ids.length === 0 || !isSupabaseConfigured) {
    return map;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('guest_id, avatar_url')
      .in('guest_id', ids);
    if (error) {
      // 050 未执行会在此抛「列不存在」等错误，静默降级
      console.debug('[明道阁] 批量查询头像失败（降级到快照头像）:', error.message);
      return map;
    }
    for (const row of data as Array<{ guest_id?: string; avatar_url?: string | null }>) {
      if (row.guest_id && row.avatar_url) {
        map[row.guest_id] = row.avatar_url;
      }
    }
  } catch (err) {
    console.debug('[明道阁] 批量查询头像异常（降级到快照头像）:', err);
  }
  return map;
}
