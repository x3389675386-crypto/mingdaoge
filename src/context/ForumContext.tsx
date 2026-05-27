import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ForumPost, ForumCategory } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Context 值接口 */
interface ForumContextValue {
  posts: ForumPost[];
  loading: boolean;
  /** 发帖 */
  addPost: (post: Omit<ForumPost, 'id' | 'createdAt'>) => Promise<void>;
  /** 删帖 */
  deletePost: (id: number) => Promise<void>;
  /** 按分类筛选 */
  postsByCategory: (category: ForumCategory) => ForumPost[];
  /** 刷新数据 */
  refresh: () => Promise<void>;
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
  };
}

/** Provider 组件 */
export function ForumProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!isSupabaseConfigured) {
      const newPost: ForumPost = {
        id: Date.now(),
        author: post.author,
        title: post.title,
        content: post.content,
        category: post.category,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [newPost, ...prev]);
      return;
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        author: post.author,
        title: post.title,
        content: post.content,
        category: post.category,
      })
      .select()
      .single();

    if (error) throw error;

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

  const postsByCategory = (category: ForumCategory): ForumPost[] => {
    return posts.filter((p) => p.category === category);
  };

  return (
    <ForumContext.Provider
      value={{ posts, loading, addPost, deletePost, postsByCategory, refresh }}
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
