/**
 * 兑换中心数据读取 / 兑换项 CRUD 封装层。
 *
 * 普通用户：读兑换项列表、我的订单、我的流水（均受 RLS 约束，仅本人可见）。
 * 管理员：兑换项 CRUD（受 exchange_items_admin 策略约束）。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  ExchangeItem,
  ExchangeOrder,
  RewardLedger,
  ItemType,
  CostKind,
} from '../types';

/** 兑换项列表（公开读，按 sort_order 升序） */
export async function listExchangeItems(): Promise<ExchangeItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('exchange_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('[明道阁] 读取兑换项失败:', error.message);
    return [];
  }
  return (data as ExchangeItem[]) || [];
}

/** 我的兑换 / 提现订单（本人，按时间倒序） */
export async function listMyOrders(): Promise<ExchangeOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('exchange_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[明道阁] 读取我的订单失败:', error.message);
    return [];
  }
  return (data as ExchangeOrder[]) || [];
}

/** 我的余额变动流水（本人，按时间倒序，限 200 条） */
export async function listMyLedger(): Promise<RewardLedger[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('reward_ledger')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[明道阁] 读取流水失败:', error.message);
    return [];
  }
  return (data as RewardLedger[]) || [];
}

/** 全部订单（admin：提现审核用，含他人） */
export async function listAllOrders(): Promise<ExchangeOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('exchange_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[明道阁] 读取全部订单失败:', error.message);
    return [];
  }
  return (data as ExchangeOrder[]) || [];
}

/** 新建 / 更新兑换项（admin） */
export async function upsertExchangeItem(
  item: Partial<ExchangeItem> & { id?: number }
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法保存');
  const { error } = await supabase.from('exchange_items').upsert(item);
  if (error) throw error;
}

/** 删除兑换项（admin） */
export async function deleteExchangeItem(id: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法删除');
  const { error } = await supabase.from('exchange_items').delete().eq('id', id);
  if (error) throw error;
}

/** 新建兑换项默认值 */
export function emptyExchangeItem(): Omit<ExchangeItem, 'id' | 'created_at' | 'updated_at'> {
  return {
    title: '',
    description: null,
    cost_kind: 'yang_de' as CostKind,
    cost_amount: 1000,
    stock: null,
    item_type: 'bracelet' as ItemType,
    status: 'active',
    sort_order: 0,
  };
}
