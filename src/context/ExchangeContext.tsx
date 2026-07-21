/**
 * ExchangeContext —— 兑换中心状态与 RPC 调用封装。
 *
 * 余额变动一律经由 reward.ts 的 RPC（redeem_item / create_cashout_order），
 * 成功后调用 AuthContext.refreshProfile 同步导航栏余额。前端不直接改 profiles。
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ExchangeOrder, RewardLedger } from '../types';
import { useAuth } from './AuthContext';
import { fetchBalance, redeemItem, createCashout } from '../lib/reward';
import { listMyOrders, listMyLedger } from '../lib/exchange';

interface ExchangeContextValue {
  /** 当前余额（优先 profile，操作后即时刷新） */
  yang_de: number;
  points: number;
  /** 我的兑换 / 提现订单 */
  orders: ExchangeOrder[];
  /** 我的余额流水 */
  ledger: RewardLedger[];
  loading: boolean;
  error: string | null;
  /** 兑换实物 / 法器 / 清修卡 */
  redeem: (itemId: number) => Promise<void>;
  /** 阳德提现申请（≥1000 且整千） */
  requestCashout: (amount: number, note?: string) => Promise<void>;
  /** 刷新余额 / 订单 / 流水 */
  refresh: () => Promise<void>;
}

const ExchangeContext = createContext<ExchangeContextValue | null>(null);

export function ExchangeProvider({ children }: { children: ReactNode }) {
  const { profile, user, refreshProfile } = useAuth();
  const [yang_de, setYangDe] = useState(0);
  const [points, setPoints] = useState(0);
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [ledger, setLedger] = useState<RewardLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bal = await fetchBalance(user.id);
      if (bal) {
        setYangDe(bal.yang_de);
        setPoints(bal.points);
      }
      const [ords, led] = await Promise.all([listMyOrders(), listMyLedger()]);
      setOrders(ords);
      setLedger(led);
    } catch (err) {
      console.error('[明道阁] 兑换中心加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // profile 变化（含 refreshProfile）同步本地余额
  useEffect(() => {
    if (profile) {
      setYangDe(profile.yang_de ?? 0);
      setPoints(profile.points ?? 0);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const redeem = useCallback(
    async (itemId: number) => {
      setError(null);
      try {
        await redeemItem(itemId);
        await refreshProfile();
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '兑换失败';
        setError(msg);
        throw err;
      }
    },
    [refreshProfile, refresh]
  );

  const requestCashout = useCallback(
    async (amount: number, note?: string) => {
      setError(null);
      try {
        await createCashout(amount, note);
        await refreshProfile();
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '提现申请失败';
        setError(msg);
        throw err;
      }
    },
    [refreshProfile, refresh]
  );

  return (
    <ExchangeContext.Provider
      value={{ yang_de, points, orders, ledger, loading, error, redeem, requestCashout, refresh }}
    >
      {children}
    </ExchangeContext.Provider>
  );
}

/** 自定义 Hook */
export function useExchange(): ExchangeContextValue {
  const context = useContext(ExchangeContext);
  if (!context) {
    throw new Error('useExchange must be used within an ExchangeProvider');
  }
  return context;
}
