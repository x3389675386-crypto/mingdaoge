/**
 * ChatContext —— 私聊核心
 *
 * 本次改造要点（兼容 Supabase Auth 双态共存）：
 * - 全局寻址改走 useAuth().getMyGuestId()（客服→'admin'，登录→profile.guest_id，游客→localStorage）。
 * - 读取改走 RPC：游客/登录走 get_my_chat_messages(p_guest_id)；admin 走 get_all_chat_messages()。
 * - 登录态用 Realtime 订阅（RLS 已按身份过滤自身行）；游客态（无 auth.uid）改 setInterval 轮询兜底（每 5s）。
 * - 发送 sender_id = getMyGuestId()；未读/标记已读逻辑保留（游客无 DB 写权限，用本地 sessionRead 兜底）。
 * - 昵称：登录态经 AuthContext.updateNickname 三处同步；游客态写 localStorage。
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { ChatMessage, ChatConversation } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getGuest, setNickname as saveNickname, type GuestIdentity } from '../lib/guestIdentity';
import { CHAT_REALTIME_CHANNEL, CHAT_STORAGE_KEY, getConversationId } from '../lib/chatConstants';
import { containsProfanity } from '../utils/profanityFilter';
import { useAuth } from './AuthContext';

/** Context 值接口（与既有 UI 契约保持一致） */
interface ChatContextValue {
  /** 当前身份（null 表示尚未设置昵称） */
  guest: GuestIdentity | null;
  /** 当前 guest 参与的会话（派生） */
  conversations: ChatConversation[];
  /** 当前打开会话的消息 */
  messages: ChatMessage[];
  /** 加载状态 */
  loading: boolean;
  /** 未读总数（导航角标用） */
  unreadTotal: number;
  /** 当前打开的会话ID */
  activeConversationId: string | null;
  /** 是否需要设置昵称（无昵称时返回 false 触发弹窗） */
  ensureIdentity: () => boolean;
  /** 拉取/派生会话列表 */
  getConversations: () => Promise<void>;
  /** 打开/新建会话并拉历史 */
  openConversation: (peerId: string, peerName: string) => Promise<void>;
  /** 拉取指定会话消息 */
  getMessages: (convId: string) => Promise<void>;
  /** 发送消息（文本或图片） */
  sendMessage: (
    peerId: string,
    peerName: string,
    content: string,
    type?: 'text' | 'image',
    imageUrl?: string
  ) => Promise<void>;
  /** 订阅 Realtime，返回取消订阅函数 */
  subscribeRealtime: () => () => void;
  /** 标记会话已读 */
  markRead: (convId: string) => Promise<void>;
  /** 修改昵称（登录态同步 profile+raw_user_meta_data） */
  setNickname: (name: string) => void;
  /** 读取已记住的对方信息（新会话尚无消息时） */
  getPeer: (convId: string) => { id: string; name: string } | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/** 数据库行 → 前端 ChatMessage 对象 */
function mapRow(r: Record<string, unknown>): ChatMessage {
  return {
    id: r.id as number,
    conversationId: r.conversation_id as string,
    senderId: r.sender_id as string,
    senderName: (r.sender_name as string) || '匿名道友',
    receiverId: r.receiver_id as string,
    receiverName: (r.receiver_name as string) || '匿名道友',
    content: (r.content as string) || '',
    type: (r.type as 'text' | 'image') || 'text',
    imageUrl: (r.image_url as string) || undefined,
    isRead: (r.is_read as boolean) ?? false,
    createdAt: r.created_at as string,
  };
}

/** 读取本机留存消息 */
function loadLocalMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** 写入本机留存消息（最多保留最近 500 条） */
function saveLocalMessages(msgs: ChatMessage[]) {
  try {
    const trimmed = [...msgs]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-500);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* 忽略写入失败（如隐私模式） */
  }
}

/**
 * 从 Supabase 拉取当前身份的私聊消息。
 * - 管理员：get_all_chat_messages（is_admin 守卫）
 * - 普通用户/游客：get_my_chat_messages(p_guest_id)（SECURITY DEFINER，绕过被拒的直读）
 */
async function fetchMyMessages(myId: string, isAdminUser: boolean): Promise<ChatMessage[]> {
  if (isAdminUser) {
    const { data, error } = await supabase.rpc('get_all_chat_messages');
    if (error) throw error;
    return ((data as Record<string, unknown>[]) || []).map(mapRow);
  }
  const { data, error } = await supabase.rpc('get_my_chat_messages', { p_guest_id: myId });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) || []).map(mapRow);
}

interface ChatProviderProps {
  children: ReactNode;
  /** 强制指定身份（保留兼容；新后台鉴权改由 AuthContext 提供 admin 身份） */
  identityOverride?: GuestIdentity | null;
}

/** Provider 组件 */
export function ChatProvider({ children, identityOverride }: ChatProviderProps) {
  const { isAuthenticated, isAdmin, getMyGuestId, profile, updateNickname } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const peerNamesRef = useRef<Record<string, { id: string; name: string }>>({});
  /** 本会话内已手动标记已读的会话（游客无 DB 写权限时的本地兜底） */
  const sessionReadRef = useRef<Set<string>>(new Set());

  // 全局寻址：登录态 = profile.chat_guest_id/guest_id；游客态 = localStorage.guest_id
  const myId = getMyGuestId();

  // 昵称来源：登录态 profile.nickname；游客态 localStorage.nickname
  const myName = isAuthenticated && profile ? profile.nickname || '' : getGuest()?.nickname || '';

  // 对外暴露的 guest（兼容 ChatView / PrivateChatButton / NicknameDialog）
  const [guest, setGuest] = useState<GuestIdentity | null>(() =>
    identityOverride ?? (myId ? { guest_id: myId, nickname: myName } : null)
  );

  // 登录态：以 profile 派生 guest（优先于 localStorage）
  useEffect(() => {
    if (identityOverride) return;
    setGuest(myId ? { guest_id: myId, nickname: myName } : null);
  }, [myId, myName, identityOverride]);

  /** 是否还有昵称 */
  const ensureIdentity = useCallback((): boolean => {
    return !!(guest && guest.nickname && guest.nickname.trim());
  }, [guest]);

  /** 拉取当前身份参与的全部消息 */
  const getConversations = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const all = loadLocalMessages();
        setMessages(all.filter((m) => m.senderId === myId || m.receiverId === myId));
        return;
      }
      setMessages(await fetchMyMessages(myId, isAdmin));
    } catch (err) {
      console.error('[明道阁] 加载私聊消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, [myId, isAdmin]);

  /** 拉取指定会话消息（断线补拉用） */
  const getMessages = useCallback(
    async (convId: string) => {
      if (!myId) return;
      try {
        if (!isSupabaseConfigured) {
          const all = loadLocalMessages();
          setMessages(all.filter((m) => m.senderId === myId || m.receiverId === myId));
          return;
        }
        const rows = await fetchMyMessages(myId, isAdmin);
        const filtered = rows.filter((m) => m.conversationId === convId);
        setMessages((prev) => {
          const others = prev.filter((m) => m.conversationId !== convId);
          return [...others, ...filtered];
        });
      } catch (err) {
        console.error('[明道阁] 拉取会话消息失败:', err);
      }
    },
    [myId, isAdmin]
  );

  /** 标记会话已读 */
  const markRead = useCallback(
    async (convId: string) => {
      if (!myId) return;
      sessionReadRef.current.add(convId);
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === convId && m.receiverId === myId && !m.isRead
            ? { ...m, isRead: true }
            : m
        )
      );
      if (!isSupabaseConfigured) {
        saveLocalMessages(
          loadLocalMessages().map((m) =>
            m.conversationId === convId && m.receiverId === myId ? { ...m, isRead: true } : m
          )
        );
        return;
      }
      try {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .eq('receiver_id', myId);
      } catch (err) {
        // 游客（anon）无 UPDATE 权限属预期，本地已标记已读
        console.debug('[明道阁] 标记已读（服务端）受限：', err);
      }
    },
    [myId]
  );

  /** 打开/新建会话 */
  const openConversation = useCallback(
    async (peerId: string, peerName: string) => {
      if (!myId) return;
      const convId = getConversationId(myId, peerId);
      peerNamesRef.current[convId] = { id: peerId, name: peerName };
      setActiveConversationId(convId);
      await getMessages(convId);
      await markRead(convId);
    },
    [myId, getMessages, markRead]
  );

  /** 发送消息 */
  const sendMessage = useCallback(
    async (
      peerId: string,
      peerName: string,
      content: string,
      type: 'text' | 'image' = 'text',
      imageUrl?: string
    ) => {
      if (!myId) return;
      const finalName = myName || '匿名道友';
      // 文本消息做文明用词过滤（图片无文本）
      const filtered = type === 'text' ? containsProfanity(content).filteredText : content;
      const convId = getConversationId(myId, peerId);
      peerNamesRef.current[convId] = { id: peerId, name: peerName };
      setActiveConversationId(convId);

      const now = new Date().toISOString();

      if (!isSupabaseConfigured) {
        const localMsg: ChatMessage = {
          id: -Date.now(),
          conversationId: convId,
          senderId: myId,
          senderName: finalName,
          receiverId: peerId,
          receiverName: peerName,
          content: filtered,
          type,
          imageUrl,
          isRead: false,
          createdAt: now,
        };
        setMessages((prev) => [...prev, localMsg]);
        saveLocalMessages([...loadLocalMessages(), localMsg]);
        return;
      }

      const insertData: Record<string, unknown> = {
        conversation_id: convId,
        sender_id: myId,
        sender_name: finalName,
        receiver_id: peerId,
        receiver_name: peerName,
        content: filtered,
        type,
        is_read: false,
      };
      if (imageUrl) insertData.image_url = imageUrl;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      const newMsg = mapRow(data as Record<string, unknown>);
      // 追加真实行（Realtime 回显会按 id 去重）
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    },
    [myId, myName]
  );

  /** 订阅 Realtime（仅 Supabase 配置且登录态时） */
  const subscribeRealtime = useCallback((): (() => void) => {
    if (!isSupabaseConfigured || !myId) return () => {};
    // 每次生成唯一通道名，避免对相同 myId 复用一个「已订阅」通道，
    // 否则再次 .on() 会抛 "cannot add postgres_changes callbacks ... after subscribe()" 并导致白屏。
    const channelName = `${CHAT_REALTIME_CHANNEL}_${myId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new;
            const sender = row.sender_id as string;
            const receiver = row.receiver_id as string;
            if (sender !== myId && receiver !== myId) return; // 应用层过滤：仅本人会话
            const msg = mapRow(row);
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        )
        .subscribe();
    } catch (err) {
      // Realtime 订阅异常（如通道已订阅）属可恢复问题，绝不向上抛出以免白屏
      console.debug('[明道阁] Realtime 订阅失败（已忽略，不影响页面）:', err);
      return () => {};
    }
    return () => {
      if (!channel) return;
      try {
        supabase.removeChannel(channel);
      } catch {
        /* 移除失败忽略，避免影响页面 */
      }
    };
  }, [myId]);

  /** 修改昵称（登录态经 AuthContext 三处同步） */
  const setNickname = useCallback(
    (name: string) => {
      if (identityOverride) return; // 强制身份不可改
      const trimmed = name;
      if (isAuthenticated && profile) {
        // 同步 raw_user_meta_data + profiles.nickname + localStorage（由 AuthContext 完成）
        void updateNickname(trimmed);
      } else {
        const next = saveNickname(trimmed);
        setGuest(next);
      }
    },
    [identityOverride, isAuthenticated, profile, updateNickname]
  );

  // 挂载：登录态订阅 Realtime；游客态轮询兜底；均拉历史
  useEffect(() => {
    if (!myId) return;
    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    if (isSupabaseConfigured) {
      if (isAuthenticated) {
        // 登录态：Realtime 订阅（RLS 已按身份过滤自身行）
        unsub = subscribeRealtime();
      }
      void getConversations();
      if (!isAuthenticated) {
        // 游客态：Realtime RLS 已开启，anon 收不到自己会话实时事件 → 轮询兜底
        pollTimer = setInterval(() => {
          void getConversations();
        }, 5000);
      }
    } else {
      void getConversations();
    }

    return () => {
      if (unsub) unsub();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [myId, isAuthenticated, isSupabaseConfigured, getConversations, subscribeRealtime]);

  // 断线补拉：页面重新可见时刷新当前会话
  useEffect(() => {
    if (!myId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void getConversations();
        if (activeConversationId) void getMessages(activeConversationId);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [myId, activeConversationId, getConversations, getMessages]);

  /** 派生会话列表 */
  const conversations = useMemo<ChatConversation[]>(() => {
    if (!myId) return [];
    const groups = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      if (m.senderId !== myId && m.receiverId !== myId) continue;
      const arr = groups.get(m.conversationId) || [];
      arr.push(m);
      groups.set(m.conversationId, arr);
    }
    const result: ChatConversation[] = [];
    for (const [convId, msgs] of groups.entries()) {
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const last = sorted[sorted.length - 1];
      const peerId = last.senderId === myId ? last.receiverId : last.senderId;
      const peerName =
        peerNamesRef.current[convId]?.name ||
        (last.senderId === myId ? last.receiverName : last.senderName) ||
        '匿名道友';
      const unreadCount = sorted.filter(
        (m) => m.receiverId === myId && !m.isRead && !sessionReadRef.current.has(convId)
      ).length;
      result.push({
        conversationId: convId,
        peerId,
        peerName,
        lastMessage: last.type === 'image' ? '[图片]' : last.content,
        lastAt: last.createdAt,
        unreadCount,
      });
    }
    result.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return result;
  }, [messages, myId]);

  /** 未读总数 */
  const unreadTotal = useMemo(() => {
    if (!myId) return 0;
    return messages.filter(
      (m) => m.receiverId === myId && !m.isRead && !sessionReadRef.current.has(m.conversationId)
    ).length;
  }, [messages, myId]);

  /** 当前会话消息（升序） */
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messages
      .filter((m) => m.conversationId === activeConversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, activeConversationId]);

  const value: ChatContextValue = {
    guest,
    conversations,
    messages: activeMessages,
    loading,
    unreadTotal,
    activeConversationId,
    ensureIdentity,
    getConversations,
    openConversation,
    getMessages,
    sendMessage,
    subscribeRealtime,
    markRead,
    setNickname,
    getPeer: (convId: string) => peerNamesRef.current[convId] || null,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/** 自定义 Hook */
export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
