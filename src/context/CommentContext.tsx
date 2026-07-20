import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { containsProfanity, getProfanityWarning } from '../utils/profanityFilter';
import { ensureGuestId } from '../lib/guestIdentity';

/** 评论接口 */
export interface ForumComment {
  /** 评论唯一ID */
  id: number;
  /** 关联帖子ID */
  postId: number;
  /** 评论者昵称 */
  author: string;
  /** 评论内容 */
  content: string;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 聊天身份 guest_id（用于作者「私聊」入口，历史内容为空） */
  guest_id?: string;
}

/** Context 值接口 */
interface CommentContextValue {
  /** 所有评论 */
  comments: ForumComment[];
  /** 加载状态 */
  loading: boolean;
  /** 获取指定帖子的评论（按时间升序） */
  commentsByPostId: (postId: number) => ForumComment[];
  /** 添加评论 */
  addComment: (comment: Omit<ForumComment, 'id' | 'createdAt'>) => Promise<void>;
  /** 删除评论 */
  deleteComment: (id: number) => Promise<void>;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 最后一次过滤警告 */
  lastWarning: string | null;
}

const CommentContext = createContext<CommentContextValue | null>(null);

/** 数据库行 → 前端 ForumComment 对象 */
function mapDbToComment(row: Record<string, unknown>): ForumComment {
  return {
    id: row.id as number,
    postId: row.post_id as number,
    author: (row.author as string) || '匿名',
    content: (row.content as string) || '',
    createdAt: row.created_at as string,
    guest_id: (row.guest_id as string) || undefined,
  };
}

/** Provider 组件 */
export function CommentProvider({ children }: { children: ReactNode }) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      if (!isSupabaseConfigured) {
        // 本地模式：无需从远程加载，数据已在内存中
        return;
      }

      const { data, error } = await supabase
        .from('forum_comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data || []).map(mapDbToComment));
    } catch (err) {
      console.error('[明道阁] 加载评论失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面加载时从 Supabase 拉取评论，确保所有人都能看到
  useEffect(() => {
    refresh();
  }, [refresh]);

  const commentsByPostId = useCallback(
    (postId: number): ForumComment[] => {
      return comments
        .filter((c) => c.postId === postId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    [comments]
  );

  const addComment = async (comment: Omit<ForumComment, 'id' | 'createdAt'>) => {
    // 文明用词过滤
    const filterResult = containsProfanity(comment.content);
    if (!filterResult.clean) {
      const warning = getProfanityWarning(comment.content);
      setLastWarning(warning);
      throw new Error(warning || '内容包含过多违规词汇，请修改后重新发布');
    }

    // 即使通过校验（badWordCount <= 3），也使用过滤后的文本
    const finalContent = filterResult.filteredText;

    // 同样过滤昵称
    const authorFilter = containsProfanity(comment.author);
    const finalAuthor = authorFilter.filteredText;

    // 记录过滤警告（如有）
    const warning = getProfanityWarning(comment.content);
    if (warning) {
      setLastWarning(warning);
    } else {
      setLastWarning(null);
    }

    const guestId = ensureGuestId();

    if (!isSupabaseConfigured) {
      const newComment: ForumComment = {
        id: Date.now(),
        postId: comment.postId,
        author: finalAuthor || '匿名',
        content: finalContent,
        createdAt: new Date().toISOString(),
        guest_id: guestId,
      };
      setComments((prev) => [...prev, newComment]);
      return;
    }

    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: comment.postId,
        author: finalAuthor || '匿名',
        content: finalContent,
        guest_id: guestId,
      })
      .select()
      .single();

    if (error) {
      console.error('[明道阁] 评论失败详情:', JSON.stringify(error, null, 2));
      if (error.code === '42P01') {
        throw new Error('评论数据表尚未创建，请在 Supabase SQL Editor 中执行建表语句');
      }
      if (error.message?.includes('policy') || error.code === '42501') {
        throw new Error('权限不足，请检查 Supabase RLS 策略是否已配置');
      }
      throw new Error(error.message || '评论失败，请稍后重试');
    }

    const newComment = mapDbToComment(data as Record<string, unknown>);
    setComments((prev) => [...prev, newComment]);
  };

  const deleteComment = async (id: number) => {
    if (!isSupabaseConfigured) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      return;
    }

    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CommentContext.Provider
      value={{
        comments,
        loading,
        commentsByPostId,
        addComment,
        deleteComment,
        refresh,
        lastWarning,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
}

/** 自定义 Hook */
export function useComments(): CommentContextValue {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentProvider');
  }
  return context;
}
