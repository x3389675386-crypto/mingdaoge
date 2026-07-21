/**
 * AuthContext —— 全局身份认证状态与身份解析入口
 *
 * - 订阅 supabase.auth.onAuthStateChange，登录后载入 profile 并绑定老 localStorage guest_id（历史认领）。
 * - 暴露 getMyGuestId() 作为「我是谁」的唯一寻址入口（客服→chat_guest_id，登录→guest_id，游客→localStorage）。
 * - 提供 signUp / signInPassword / signInOtp / verifyOtp / resetPassword / signOut / updateNickname。
 *
 * 约定：业务层一律通过 useAuth().getMyGuestId() 寻址，禁止直读 localStorage 或 profile.guest_id。
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getGuest, setNickname as saveNickname, syncGuestId } from '../lib/guestIdentity';
import { resolveGuestId, type ProfileRow } from '../lib/identity';
import { mapAuthError } from '../lib/authErrors';
import { ADMIN_EMAILS } from '../lib/adminConfig';

/** 鉴权操作结果 */
interface AuthResult {
  /** 发生错误时返回中文错误文案 */
  error?: string;
}

/** Context 暴露的值 */
interface AuthContextValue {
  /** 当前会话 */
  session: Session | null;
  /** 当前用户（未登录为 null） */
  user: User | null;
  /** 当前用户 profile 行（未登录为 null） */
  profile: ProfileRow | null;
  /** 初始会话恢复中 */
  loading: boolean;
  /** 是否已登录（!!user） */
  isAuthenticated: boolean;
  /** 是否管理员（role='admin' 或白名单邮箱，与 is_admin() 对齐） */
  isAdmin: boolean;
  /** 是否客服（role='agent' 或存在 chat_guest_id） */
  isAgent: boolean;
  /** 全局寻址入口：客服→chat_guest_id，登录→guest_id，游客→localStorage */
  getMyGuestId: () => string | null;
  signUp: (email: string, password: string, nickname: string) => Promise<AuthResult>;
  signInPassword: (email: string, password: string) => Promise<AuthResult>;
  signInOtp: (email: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateNickname: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** AuthProvider 组件 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 载入 profile + 绑定老 localStorage guest_id（历史认领）。
   * 把浏览器此前游客身份的 guest_id 写回 profile，从而让历史私聊/论坛行「认主」。
   */
  const loadProfile = useCallback(async (currentUser: User) => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, guest_id, nickname, chat_guest_id, role, created_at')
        .eq('id', currentUser.id)
        .single();
      if (error) {
        console.error('[明道阁] 载入 profile 失败:', error.message);
        setLoading(false);
        return;
      }
      const row = data as ProfileRow;
      setProfile(row);

      // 绑定老游客历史：把 localStorage 的 guest_id 写回 profile（认领历史行）
      const local = getGuest();
      if (local && local.guest_id) {
        const { error: upsertError } = await supabase
          .from('profiles')
          .update({ guest_id: local.guest_id, nickname: local.nickname || row.nickname || '' })
          .eq('id', currentUser.id);
        if (!upsertError) {
          setProfile((prev) => (prev ? { ...prev, guest_id: local.guest_id } : prev));
        } else {
          console.warn('[明道阁] 绑定老 guest_id 冲突（可能已被其它账号占用），保留服务端身份');
        }
      } else {
        // 无本地游客身份：把服务端 guest_id 写回 localStorage，便于退出后继续沿用
        syncGuestId(row.guest_id, row.nickname);
      }
    } catch (err) {
      console.error('[明道阁] 载入 profile 异常:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化：读取已有 session + 订阅 auth 状态变化
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        void loadProfile(s.user);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === 'SIGNED_IN' && s?.user) {
        void loadProfile(s.user);
      } else if (event === 'USER_UPDATED' && s?.user) {
        void loadProfile(s.user);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  /** 全局寻址入口 */
  const getMyGuestId = useCallback((): string | null => {
    return resolveGuestId(profile);
  }, [profile]);

  const isAuthenticated = !!user;

  const isAdmin = useMemo(() => {
    if (profile?.role === 'admin') return true;
    if (user?.email && ADMIN_EMAILS.includes(user.email)) return true;
    return false;
  }, [profile, user]);

  const isAgent = useMemo(() => {
    if (profile?.role === 'agent') return true;
    return !!profile?.chat_guest_id;
  }, [profile]);

  const signUp = useCallback(
    async (email: string, password: string, nickname: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { error: '服务暂未配置，无法注册' };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });
      if (error) return { error: mapAuthError(error) };
      return {};
    },
    []
  );

  const signInPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { error: '服务暂未配置，无法登录' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: mapAuthError(error) };
      return {};
    },
    []
  );

  const signInOtp = useCallback(async (email: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: '服务暂未配置，无法发送验证码' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    if (error) return { error: mapAuthError(error) };
    return {};
  }, []);

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { error: '服务暂未配置，无法验证' };
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) return { error: mapAuthError(error) };
      return {};
    },
    []
  );

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: '服务暂未配置，无法重置密码' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/verify-email`,
    });
    if (error) return { error: mapAuthError(error) };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  }, []);

  /**
   * 修改昵称：三处同步 raw_user_meta_data + profiles.nickname + localStorage。
   * 游客态（未配置 Supabase 或未登录）仅写 localStorage。
   */
  const updateNickname = useCallback(
    async (name: string) => {
      const trimmed = name;
      if (isSupabaseConfigured && user) {
        const { error } = await supabase.auth.updateUser({ data: { nickname: trimmed } });
        if (error) console.error('[明道阁] 更新 raw_user_meta_data 失败:', error.message);
        const { error: pErr } = await supabase
          .from('profiles')
          .update({ nickname: trimmed })
          .eq('id', user.id);
        if (pErr) console.error('[明道阁] 更新 profiles.nickname 失败:', pErr.message);
        setProfile((prev) => (prev ? { ...prev, nickname: trimmed } : prev));
        syncGuestId(resolveGuestId(profile) ?? '', trimmed);
      } else {
        saveNickname(trimmed);
      }
    },
    [user, profile]
  );

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isAgent,
    getMyGuestId,
    signUp,
    signInPassword,
    signInOtp,
    verifyOtp,
    resetPassword,
    signOut,
    updateNickname,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 自定义 Hook */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
