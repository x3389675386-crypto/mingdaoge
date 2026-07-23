/**
 * 看手相领奖封装：RPC 调用 + 配置读写（site_settings）。
 * 降级原则：060 未执行（RPC 不存在 / 配置表缺失）→ 静默或提示「功能暂未开放」，绝不影响发帖。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { getSiteSetting, upsertSiteSetting } from './siteSettings';
import { DEFAULT_PALMIRSTRY_REWARD, DEFAULT_PALMIRSTRY_DAILY } from './invite';

/** 看手相论坛分类标识（与 060 forum_categories 种子 value 一致） */
export const PALMIRSTRY_CATEGORY = 'palmistry';

/** site_settings 配置键 */
export const PALMIRSTRY_REWARD_KEY = 'palmistry_reward_points';
export const PALMIRSTRY_DAILY_KEY = 'palmistry_daily_limit';

/** 默认数值 */
export const DEFAULT_PALMIRSTRY_REWARD_POINTS = DEFAULT_PALMIRSTRY_REWARD;
export const DEFAULT_PALMIRSTRY_DAILY_LIMIT = DEFAULT_PALMIRSTRY_DAILY;

/** 领取结果结构（与 RPC 返回 jsonb 对齐） */
export interface PalmistryClaimResult {
  granted: boolean;
  reason?: string;
  points?: number;
  remaining?: number;
}

/** 调用 RPC 领取看手相奖励 */
export async function claimPalmistryReward(postId: number): Promise<PalmistryClaimResult> {
  if (!isSupabaseConfigured) {
    return { granted: false, reason: '功能暂未开放' };
  }
  const { data, error } = await supabase.rpc('claim_palmistry_reward', { p_post_id: postId });
  if (error) {
    // 函数不存在（060 未执行）→ 静默降级
    const code = (error as { code?: string }).code;
    const msg = error.message || '';
    if (code === '42883' || code === '42703' || /claim_palmistry_reward/.test(msg)) {
      return { granted: false, reason: '功能暂未开放' };
    }
    // 其它错误（如未登录 / 非本人帖）→ 透传给上层处理
    throw error;
  }
  return (data as PalmistryClaimResult) ?? { granted: false, reason: '未知错误' };
}

/** 读取看手相单次奖励积分（带默认回退） */
export function getPalmistryRewardPoints(): Promise<number> {
  return getSiteSetting(PALMIRSTRY_REWARD_KEY, DEFAULT_PALMIRSTRY_REWARD_POINTS);
}

/** 读取看手相每日限领次数（带默认回退） */
export function getPalmistryDailyLimit(): Promise<number> {
  return getSiteSetting(PALMIRSTRY_DAILY_KEY, DEFAULT_PALMIRSTRY_DAILY_LIMIT);
}

/** 写入看手相单次奖励积分（管理员） */
export function setPalmistryRewardPoints(value: number): Promise<void> {
  return upsertSiteSetting(PALMIRSTRY_REWARD_KEY, value);
}

/** 写入看手相每日限领次数（管理员） */
export function setPalmistryDailyLimit(value: number): Promise<void> {
  return upsertSiteSetting(PALMIRSTRY_DAILY_KEY, value);
}
