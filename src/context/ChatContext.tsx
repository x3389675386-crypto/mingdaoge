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
import {
  getGuest,
  setNickname as saveNickname,
  type GuestIdentity,
} from '../lib/guestIdentity';
import {
  CHAT_REALTIME_CHANNEL,
  CHAT_STORAGE_KEY,
  getConversationId,
} from '../lib/chatConstants';
import { containsProfanity } from '../utils/profanityFilter';

/** Context 值接口 */
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
  /** 修改昵称（P1-3） */
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

interface ChatProviderProps {
  children: ReactNode;
  /** 强制指定身份（后台客服以 admin 身份收发时使用） */
  identityOverride?: GuestIdentity | null;
}

/** Provider 组件 */
export function ChatProvider({ children, identityOverride }: ChatProviderProps) {
  const [guest, setGuest] = useState<GuestIdentity | null>(
    () => identityOverride ?? getGuest()
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 记忆对方信息：conversationId -> {id, name}，用于尚无消息的新会话展示 */
  const peerNamesRef = useRef<Record<string, { id: string; name: string }>>({});

  const myId = guest?.guest_id ?? null;

  /** 是否还有昵称 */
  const ensureIdentity = useCallback((): boolean => {
    return !!(guest && guest.nickname && guest.nickname.trim());
  }, [guest]);

  /** 拉取当前 guest 参与的全部消息 */
  const getConversations = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const all = loadLocalMessages();
        setMessages(all.filter((m) => m.senderId === myId || m.receiverId === myId));
        return;
      }
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data || []).map(mapRow));
    } catch (err) {
      console.error('[明道阁] 加载私聊消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, [myId]);

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
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        const rows = (data || []).map(mapRow);
        setMessages((prev) => {
          const others = prev.filter((m) => m.conversationId !== convId);
          return [...others, ...rows];
        });
      } catch (err) {
        console.error('[明道阁] 拉取会话消息失败:', err);
      }
    },
    [myId]
  );

  /** 标记会话已读 */
  const markRead = useCallback(
    async (convId: string) => {
      if (!myId) return;
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
        console.error('[明道阁] 标记已读失败:', err);
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
      if (!guest || !myId) return;
      const finalName = guest.nickname || '匿名道友';
      const rawContent = content;
      // 文本消息做文明用词过滤（图片无文本）
      const filtered = type === 'text' ? containsProfanity(rawContent).filteredText : rawContent;
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
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    },
    [guest, myId]
  );

  /** 订阅 Realtime（仅 Supabase 配置时） */
  const subscribeRealtime = useCallback((): (() => void) => {
    if (!isSupabaseConfigured || !myId) return () => {};
    const channel = supabase
      .channel(CHAT_REALTIME_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          const sender = row.sender_id as string;
          const receiver = row.receiver_id as string;
          if (sender !== myId && receiver !== myId) return; // 应用层过滤：仅本人会话
          const msg = mapRow(row);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  /** 修改昵称（P1-3） */
  const setNickname = useCallback((name: string) => {
    if (identityOverride) return; // 强制身份不可改
    const next = saveNickname(name);
    setGuest(next);
  }, [identityOverride]);

  // 挂载：订阅 Realtime + 拉历史
  useEffect(() => {
    if (!myId) return;
    const unsub = subscribeRealtime();
    getConversations();
    return unsub;
  }, [myId, getConversations, subscribeRealtime]);

  // 断线补拉：页面重新可见时刷新当前会话
  useEffect(() => {
    if (!myId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        getConversations();
        if (activeConversationId) getMessages(activeConversationId);
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
        (m) => m.receiverId === myId && !m.isRead
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
    result.sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    return result;
  }, [messages, myId]);

  /** 未读总数 */
  const unreadTotal = useMemo(() => {
    if (!myId) return 0;
    return messages.filter((m) => m.receiverId === myId && !m.isRead).length;
  }, [messages, myId]);

  /** 当前会话消息（升序） */
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messages
      .filter((m) => m.conversationId === activeConversationId)
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
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
