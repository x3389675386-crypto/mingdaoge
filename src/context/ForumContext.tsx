import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ForumPost, ForumCategory } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { containsProfanity, getProfanityWarning } from '../utils/profanityFilter';
import { ensureGuestId } from '../lib/guestIdentity';

/** Context 值接口 */
interface ForumContextValue {
  posts: ForumPost[];
  loading: boolean;
  /** 发帖 */
  addPost: (post: Omit<ForumPost, 'id' | 'createdAt'>) => Promise<void>;
  /** 删帖 */
  deletePost: (id: number) => Promise<void>;
  /** 点赞 */
  likePost: (id: number) => Promise<void>;
  /** 按分类筛选 */
  postsByCategory: (category: ForumCategory) => ForumPost[];
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 最后一次过滤警告 */
  lastWarning: string | null;
}

const ForumContext = createContext<ForumContextValue | null>(null);

/** 数据库行 → 前端 ForumPost 对象 */
function mapDbToPost(row: Record<string, unknown>): ForumPost {
  return {
    id: row.id as number,
    author: (row.author as string) || '匿名',
    title: (row.title as string) || '',
    content: (row.content as string) || '',
    category: (row.category as string) || 'chat',
    createdAt: row.created_at as string,
    imageUrl: (row.image_url as string) || undefined,
    likes: (row.likes as number) ?? 0,
    guest_id: (row.guest_id as string) || undefined,
  };
}

/** Provider 组件 */
export function ForumProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      if (!isSupabaseConfigured) {
        setPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data || []).map(mapDbToPost));
    } catch (err) {
      console.error('[明道阁] 加载论坛帖子失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = async (post: Omit<ForumPost, 'id' | 'createdAt'>) => {
    // 文明用词过滤 - 标题
    const titleFilter = containsProfanity(post.title);
    if (!titleFilter.clean) {
      const warning = getProfanityWarning(post.title);
      setLastWarning(warning);
      throw new Error(warning || '标题包含过多违规词汇，请修改后重新发布');
    }

    // 文明用词过滤 - 内容
    const contentFilter = containsProfanity(post.content);
    if (!contentFilter.clean) {
      const warning = getProfanityWarning(post.content);
      setLastWarning(warning);
      throw new Error(warning || '内容包含过多违规词汇，请修改后重新发布');
    }

    // 使用过滤后的文本
    const finalTitle = titleFilter.filteredText;
    const finalContent = contentFilter.filteredText;

    // 过滤昵称
    const authorFilter = containsProfanity(post.author);
    const finalAuthor = authorFilter.filteredText;

    // 记录过滤警告（如有）
    const titleWarning = getProfanityWarning(post.title);
    const contentWarning = getProfanityWarning(post.content);
    if (titleWarning || contentWarning) {
      setLastWarning(contentWarning || titleWarning || null);
    } else {
      setLastWarning(null);
    }

    const guestId = ensureGuestId();

    if (!isSupabaseConfigured) {
      const newPost: ForumPost = {
        id: Date.now(),
        author: finalAuthor || '匿名',
        title: finalTitle,
        content: finalContent,
        category: post.category,
        createdAt: new Date().toISOString(),
        imageUrl: post.imageUrl,
        guest_id: guestId,
      };
      setPosts((prev) => [newPost, ...prev]);
      return;
    }

    const insertData: Record<string, unknown> = {
      author: finalAuthor || '匿名',
      title: finalTitle,
      content: finalContent,
      category: post.category,
      guest_id: guestId,
    };
    if (post.imageUrl) {
      insertData.image_url = post.imageUrl;
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[明道阁] 发帖失败详情:', JSON.stringify(error, null, 2));
      // 如果表不存在，给出明确提示
      if (error.code === '42P01') {
        throw new Error('论坛数据表尚未创建，请在 Supabase SQL Editor 中执行建表语句');
      }
      if (error.message?.includes('policy') || error.code === '42501') {
        throw new Error('权限不足，请检查 Supabase RLS 策略是否已配置');
      }
      throw new Error(error.message || '发帖失败，请稍后重试');
    }

    const newPost = mapDbToPost(data as Record<string, unknown>);
    setPosts((prev) => [newPost, ...prev]);
  };

  const deletePost = async (id: number) => {
    if (!isSupabaseConfigured) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      return;
    }

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const likePost = async (id: number) => {
    const target = posts.find((p) => p.id === id);
    const newVal = (target?.likes ?? 0) + 1;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: newVal } : p)));
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('forum_posts')
      .update({ likes: newVal })
      .eq('id', id);
    if (error) {
      console.error('[明道阁] 点赞失败:', error);
    }
  };

  const postsByCategory = (category: ForumCategory): ForumPost[] => {
    return posts.filter((p) => p.category === category);
  };

  return (
    <ForumContext.Provider
      value={{ posts, loading, addPost, deletePost, likePost, postsByCategory, refresh, lastWarning }}
    >
      {children}
    </ForumContext.Provider>
  );
}

/** 自定义 Hook */
export function useForum(): ForumContextValue {
  const context = useContext(ForumContext);
  if (!context) {
    throw new Error('useForum must be used within a ForumProvider');
  }
  return context;
}
