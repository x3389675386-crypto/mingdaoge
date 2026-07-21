/**
 * 双账户余额变动 RPC 封装层。
 *
 * 铁律：任何阳德 / 积分变动必须经以下 RPC 之一，且 RPC 内部必写 reward_ledger。
 * 前端严禁直接 UPDATE profiles.yang_de / points。
 *
 * RPC 均沿用 011 风格：SECURITY DEFINER + SET search_path = public。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { CostKind, IdentityType } from '../types';

/** 余额快照 */
export interface ProfileBalance {
  yang_de: number;
  points: number;
}

/** 按 user_code / guest_id 解析出的用户概要（admin 奖励调整用） */
export interface ProfileLookup {
  /** auth.users.id（admin_adjust_reward 需要） */
  id: string;
  /** 昵称 */
  nickname: string;
  /** 私聊 ID（MDG-XXXXX），可能没有 */
  user_code: string | null;
  /** 阳德余额 */
  yang_de: number;
  /** 积分余额 */
  points: number;
  /** 身份大类 */
  identity_type?: IdentityType;
  /** 身份二级细分 */
  identity_subtype?: string | null;
}

/**
 * 按 user_code（MDG-XXXXX，忽略大小写）或旧 guest_id 解析用户概要。
 * 用于管理员手动调整奖励时定位目标用户（profiles 公开读，admin 可读取全部）。
 * @returns 解析到的用户；未找到返回 null
 */
export async function lookupProfileByIdentifier(code: string): Promise<ProfileLookup | null> {
  const input = (code || '').trim();
  if (!input) return null;
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, user_code, yang_de, points, identity_type, identity_subtype')
    .or(`user_code.eq.${input.toUpperCase()},guest_id.eq.${input}`)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ProfileLookup;
  return {
    id: row.id,
    nickname: row.nickname || '道友',
    user_code: row.user_code ?? null,
    yang_de: row.yang_de ?? 0,
    points: row.points ?? 0,
    identity_type: row.identity_type,
    identity_subtype: row.identity_subtype ?? null,
  };
}

/**
 * 读取指定用户余额（admin 场景：传入目标 user_id；普通用户传自身 id）。
 * 不改动余额，仅 SELECT。
 */
export async function fetchBalance(userId: string): Promise<ProfileBalance | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('yang_de, points')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[明道阁] 读取余额失败:', error.message);
    return null;
  }
  const row = data as { yang_de: number; points: number };
  return { yang_de: row.yang_de ?? 0, points: row.points ?? 0 };
}

/**
 * 管理员手动加减阳德 / 积分（写 reward_ledger，operator_id = 当前管理员）。
 * @returns 变动后的余额
 */
export async function adminAdjustReward(
  userId: string,
  kind: CostKind,
  delta: number,
  reason: string
): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法操作');
  const { data, error } = await supabase.rpc('admin_adjust_reward', {
    p_user_id: userId,
    p_kind: kind,
    p_delta: delta,
    p_reason: reason || '管理员调整',
  });
  if (error) throw error;
  return data as number;
}

/**
 * 兑换实物 / 法器 / 清修卡（扣对应余额，生成 fulfilled 订单）。
 * @returns 新建订单 id
 */
export async function redeemItem(itemId: number): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法兑换');
  const { data, error } = await supabase.rpc('redeem_item', { p_item_id: itemId });
  if (error) throw error;
  return data as number;
}

/**
 * 阳德提现申请（≥1000 且整千，提交即锁定余额，生成 pending 订单）。
 * @returns 新建订单 id
 */
export async function createCashout(amount: number, note?: string | null): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法提现');
  const { data, error } = await supabase.rpc('create_cashout_order', {
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data as number;
}

/**
 * 管理员处理提现：approve（通过）/ reject（驳回退回）/ fulfill（标记已兑付）。
 */
export async function approveCashout(
  orderId: number,
  action: 'approve' | 'reject' | 'fulfill'
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法审核');
  const { error } = await supabase.rpc('approve_cashout', {
    p_order_id: orderId,
    p_action: action,
  });
  if (error) throw error;
}
