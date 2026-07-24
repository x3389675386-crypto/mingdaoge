/**
 * 抽奖封装（对应 070 迁移的 draw_lottery RPC + lottery_tiers 配置）。
 *
 * 降级原则：070 未执行（RPC 不存在 / 配置表缺失）→ 返回 available=false，
 * 前端据此提示「功能暂未开放」，绝不影响商城其它功能。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { getSiteSetting, getSiteSettingJson } from './siteSettings';

/** 抽奖档位 */
export interface LotteryTier {
  /** 档位名（如「谢谢参与」「5积分」） */
  tier: string;
  /** 中得积分数（0 表示未中奖） */
  prize: number;
  /** 权重百分比（所有档位 weight 之和应为 100） */
  weight: number;
}

/** 默认配置（读不到 site_settings 时使用） */
export const DEFAULT_LOTTERY_COST = 100;
export const DEFAULT_LOTTERY_FREE_DAILY = 1;
export const DEFAULT_LOTTERY_TIERS: LotteryTier[] = [
  { tier: '谢谢参与', prize: 0, weight: 50 },
  { tier: '5积分', prize: 5, weight: 30 },
  { tier: '20积分', prize: 20, weight: 15 },
  { tier: '100积分', prize: 100, weight: 4 },
  { tier: '500积分', prize: 500, weight: 1 },
];

/** 读取每次付费抽消耗积分（带默认回退） */
export function getLotteryCost(): Promise<number> {
  return getSiteSetting('lottery_cost', DEFAULT_LOTTERY_COST);
}

/** 读取每日免费抽次数（带默认回退；<=0 视为关闭活动） */
export function getLotteryFreeDaily(): Promise<number> {
  return getSiteSetting('lottery_free_daily', DEFAULT_LOTTERY_FREE_DAILY);
}

/** 读取抽奖档位权重数组（带默认回退） */
export async function getLotteryTiers(): Promise<LotteryTier[]> {
  const tiers = await getSiteSettingJson<LotteryTier[]>('lottery_tiers', DEFAULT_LOTTERY_TIERS);
  return Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_LOTTERY_TIERS;
}

/** 抽奖结果（与 RPC 返回对齐） */
export interface DrawResult {
  /** 是否成功抽奖 */
  ok: boolean;
  /** 失败原因（如「今日免费已用完」「积分不足」「请先登录」「功能暂未开放」） */
  reason?: string;
  /** 中得档位名 */
  tier?: string;
  /** 中得积分数 */
  prize?: number;
  /** 抽奖后当前总积分 */
  points?: number;
  /** 功能是否已部署（false = 070 未执行 / 未连接，前端提示「功能暂未开放」） */
  available: boolean;
}

/**
 * 调用 draw_lottery RPC 抽奖。
 * @param paid true=付费抽（扣 lottery_cost 积分），false=免费抽
 */
export async function drawLottery(paid: boolean): Promise<DrawResult> {
  // 未连接 Supabase → 直接降级
  if (!isSupabaseConfigured) {
    return { ok: false, reason: '功能暂未开放', available: false };
  }
  try {
    const { data, error } = await supabase.rpc('draw_lottery', { p_paid: paid });
    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message || '';
      // 函数不存在（070 未执行）→ 友好降级
      if (code === '42883' || code === '42703' || /draw_lottery/.test(msg)) {
        return { ok: false, reason: '功能暂未开放', available: false };
      }
      // 未登录（服务端 RAISE EXCEPTION '请先登录'）
      if (/请先登录/.test(msg)) {
        return { ok: false, reason: '请先登录', available: true };
      }
      return { ok: false, reason: msg || '抽奖失败', available: true };
    }
    const r = (data ?? {}) as Record<string, unknown>;
    if (r.ok === true) {
      return {
        ok: true,
        tier: r.tier as string,
        prize: r.prize as number,
        points: r.points as number,
        available: true,
      };
    }
    return { ok: false, reason: (r.reason as string) || '抽奖失败', available: true };
  } catch (e) {
    console.warn('[明道阁] 抽奖请求异常:', e);
    return { ok: false, reason: '网络异常，请稍后再试', available: false };
  }
}

/** 本地每日免费抽记录：按日期计数，跨天自动重置 */
const FREE_KEY = 'mingdaoge_lottery_free';

interface FreeState {
  date: string;
  count: number;
}

/** 读取今日已用免费次数 */
export function getTodayFreeUsed(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(FREE_KEY);
    if (!raw) return 0;
    const state = JSON.parse(raw) as FreeState;
    if (state.date !== today) return 0; // 跨天重置
    return state.count;
  } catch {
    return 0;
  }
}

/** 累加今日免费次数（抽成功一次 +1） */
export function bumpTodayFreeUsed(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(FREE_KEY);
    let state: FreeState = { date: today, count: 0 };
    if (raw) {
      const parsed = JSON.parse(raw) as FreeState;
      state = parsed.date === today ? parsed : { date: today, count: 0 };
    }
    state.count += 1;
    localStorage.setItem(FREE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略 localStorage 异常（隐私模式等），不影响抽奖主流程 */
  }
}
