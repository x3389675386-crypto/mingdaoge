import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { MessageState, MessageAction, Message } from '../types';

/** localStorage 存储键 */
const STORAGE_KEY = 'mingdao_messages';

/** 从 localStorage 读取留言数据 */
function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Message[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // 解析失败则返回空数组
  }
  return [];
}

/** 保存到 localStorage */
function saveMessages(messages: Message[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

/** Reducer */
function messageReducer(state: MessageState, action: MessageAction): MessageState {
  let newMessages: Message[];

  switch (action.type) {
    case 'ADD_MESSAGE':
      newMessages = [action.payload, ...state.messages];
      break;

    case 'MARK_READ':
      newMessages = state.messages.map((m) =>
        m.id === action.payload ? { ...m, read: true } : m
      );
      break;

    case 'MARK_UNREAD':
      newMessages = state.messages.map((m) =>
        m.id === action.payload ? { ...m, read: false } : m
      );
      break;

    case 'DELETE_MESSAGE':
      newMessages = state.messages.filter((m) => m.id !== action.payload);
      break;

    default:
      return state;
  }

  saveMessages(newMessages);
  return { messages: newMessages };
}

/** Context 值接口 */
interface MessageContextValue {
  state: MessageState;
  dispatch: Dispatch<MessageAction>;
  /** 所有留言 */
  messages: Message[];
  /** 新增留言 */
  addMessage: (message: Omit<Message, 'id' | 'createdAt' | 'read'>) => void;
  /** 标记已读 */
  markRead: (id: number) => void;
  /** 标记未读 */
  markUnread: (id: number) => void;
  /** 删除留言 */
  deleteMessage: (id: number) => void;
  /** 未读留言数 */
  unreadCount: number;
}

const MessageContext = createContext<MessageContextValue | null>(null);

/** Provider 组件 */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(messageReducer, { messages: loadMessages() });

  const messages = state.messages;

  const addMessage = (msg: Omit<Message, 'id' | 'createdAt' | 'read'>) => {
    const maxId = messages.reduce((max, m) => Math.max(max, m.id), 0);
    const newMessage: Message = {
      ...msg,
      id: maxId + 1,
      createdAt: new Date().toISOString(),
      read: false,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
  };

  const markRead = (id: number) => {
    dispatch({ type: 'MARK_READ', payload: id });
  };

  const markUnread = (id: number) => {
    dispatch({ type: 'MARK_UNREAD', payload: id });
  };

  const deleteMessage = (id: number) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <MessageContext.Provider
      value={{ state, dispatch, messages, addMessage, markRead, markUnread, deleteMessage, unreadCount }}
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
