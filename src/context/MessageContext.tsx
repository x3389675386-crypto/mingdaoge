import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Message } from '../types';
import { supabase } from '../lib/supabase';

/** Context 值接口 */
interface MessageContextValue {
  messages: Message[];
  loading: boolean;
  /** 新增留言 */
  addMessage: (message: Omit<Message, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  /** 标记已读 */
  markRead: (id: number) => Promise<void>;
  /** 标记未读 */
  markUnread: (id: number) => Promise<void>;
  /** 删除留言 */
  deleteMessage: (id: number) => Promise<void>;
  /** 未读留言数 */
  unreadCount: number;
  /** 刷新数据 */
  refresh: () => Promise<void>;
}

const MessageContext = createContext<MessageContextValue | null>(null);

/** 数据库行 → 前端 Message 对象 */
function mapDbToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as number,
    name: row.name as string,
    contact: row.contact as string,
    message: (row.message as string) || '',
    createdAt: row.created_at as string,
    read: (row.is_read as boolean) || false,
  };
}

/** Provider 组件 */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages((data || []).map(mapDbToMessage));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMessage = async (msg: Omit<Message, 'id' | 'createdAt' | 'read'>) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        name: msg.name,
        contact: msg.contact,
        message: msg.message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    const newMessage = mapDbToMessage(data as Record<string, unknown>);
    setMessages((prev) => [newMessage, ...prev]);
  };

  const markRead = async (id: number) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: true } : m))
    );
  };

  const markUnread = async (id: number) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: false })
      .eq('id', id);

    if (error) throw error;

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: false } : m))
    );
  };

  const deleteMessage = async (id: number) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <MessageContext.Provider
      value={{ messages, loading, addMessage, markRead, markUnread, deleteMessage, unreadCount, refresh }}
    >
      {children}
    </MessageContext.Provider>
  );
}

/** 自定义 Hook */
export function useMessages(): MessageContextValue {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
}
