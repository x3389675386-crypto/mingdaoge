/**
 * 站点配置读取 / 写入封装（对应 site_settings 表，键见 060 迁移）。
 * 所有读失败均回退默认值（绝不影响页面渲染）。写操作由 RLS 守卫（仅管理员可写）。
 */

import { supabase, isSupabaseConfigured } from './supabase';

/** 读取配置项数值，失败回退 fallback */
export async function getSiteSetting(key: string, fallback: number): Promise<number> {
  if (!isSupabaseConfigured) return fallback;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn('[明道阁] 读取配置失败:', key, error.message);
      return fallback;
    }
    return typeof data?.value === 'number' ? data.value : fallback;
  } catch (e) {
    console.warn('[明道阁] 读取配置异常:', key, e);
    return fallback;
  }
}

/** 写入 / 更新配置项（upsert on key），由 RLS 校验管理员权限 */
export async function upsertSiteSetting(key: string, value: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务未配置');
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}
