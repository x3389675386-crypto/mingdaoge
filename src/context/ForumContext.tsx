import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ForumPost, ForumCategory, ForumCategoryDB, GongfaMaterial } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { grantDailyMerit } from '../lib/task';
import { containsProfanity, getProfanityWarning } from '../utils/profanityFilter';
import { ensureGuestId } from '../lib/guestIdentity';
import { useAuth } from './AuthContext';

/** 新建帖子入参（支持功法电子书上传） */
export interface NewForumPost extends Omit<ForumPost, 'id' | 'createdAt' | 'author'> {
  /** 作者昵称（选填，不传则由 ForumContext 自动取当前登录用户昵称） */
  author?: string;
  /** 功法电子书文件（仅 gongfa 帖，admin 上传） */
  ebookFile?: File | null;
}

/** Context 值接口 */
interface ForumContextValue {
  posts: ForumPost[];
  categories: ForumCategoryDB[];
  gongfaMaterials: GongfaMaterial[];
  loading: boolean;
  /** 当前用户已点赞的帖子 id 集合 */
  likedPosts: Set<number>;
  /** 发帖 */
  addPost: (post: NewForumPost) => Promise<number | null>;
  /** 删帖（仅管理员） */
  deletePost: (id: number) => Promise<void>;
  /** 点赞（已登录→查已赞+rpc add_like；游客态仅本地 +1） */
  likePost: (id: number) => Promise<void>;
  /** 是否已点赞 */
  hasLiked: (id: number) => boolean;
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
  const author = (row.author as string) || '匿名';
  const authorNickname = (row.author_nickname as string) || author;
  return {
    id: row.id as number,
    author,
    author_nickname: authorNickname,
    title: (row.title as string) || '',
    content: (row.content as string) || '',
    category: (row.category as string) || 'chat',
    createdAt: row.created_at as string,
    imageUrl: (row.image_url as string) || undefined,
    likes: (row.likes as number) ?? 0,
    guest_id: (row.guest_id as string) || undefined,
    author_avatar_url: (row.author_avatar_url as string) || undefined,
  };
}

/** 数据库行 → 前端 GongfaMaterial 对象 */
function mapDbToMaterial(row: Record<string, unknown>): GongfaMaterial {
  return {
    id: row.id as number,
    post_id: row.post_id as number,
    file_url: row.file_url as string,
    file_name: row.file_name as string,
    file_size: row.file_size as number,
    uploaded_by: (row.uploaded_by as string) ?? null,
    created_at: row.created_at as string,
  };
}

/** Provider 组件 */
export function ForumProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, user, profile, getMyGuestId } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategoryDB[]>([]);
  const [gongfaMaterials, setGongfaMaterials] = useState<GongfaMaterial[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  /** 加载动态分类（forum_categories） */
  const loadCategories = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCategories([]);
      return;
    }
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[明道阁] 加载论坛分类失败:', error);
      setCategories([]);
      return;
    }
    setCategories((data as ForumCategoryDB[]) || []);
  }, []);

  /** 加载我的已点赞集合（登录态） */
  const loadMyLikes = useCallback(async () => {
    if (!isSupabaseConfigured || !isAuthenticated || !user) {
      setLikedPosts(new Set());
      return;
    }
    const { data, error } = await supabase
      .from('forum_post_likes')
      .select('post_id')
      .eq('user_id', user.id);
    if (error) {
      console.error('[明道阁] 加载已点赞失败:', error);
      return;
    }
    const ids = new Set<number>((data as Array<{ post_id: number }>).map((r) => r.post_id));
    setLikedPosts(ids);
  }, [isAuthenticated, user]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      if (!isSupabaseConfigured) {
        setPosts([]);
        setGongfaMaterials([]);
        return;
      }

      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data || []).map(mapDbToPost));

      // 功法电子书元信息（公开读）
      const { data: mData, error: mErr } = await supabase
        .from('gongfa_materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (mErr) {
        console.error('[明道阁] 加载功法资料失败:', mErr);
        setGongfaMaterials([]);
      } else {
        setGongfaMaterials((mData || []).map(mapDbToMaterial));
      }
    } catch (err) {
      console.error('[明道阁] 加载论坛帖子失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    void loadCategories();
  }, [refresh, loadCategories]);

  useEffect(() => {
    void loadMyLikes();
  }, [loadMyLikes]);

  const addPost = async (post: NewForumPost): Promise<number | null> => {
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

    // 功法帖：文件名同样过违规词（P0-8）
    if (post.ebookFile) {
      const nameFilter = containsProfanity(post.ebookFile.name);
      if (!nameFilter.clean) {
        const warning = getProfanityWarning(post.ebookFile.name);
        setLastWarning(warning);
        throw new Error(warning || '文件名包含过多违规词汇，请修改后重新上传');
      }
    }

    const finalTitle = titleFilter.filteredText;
    const finalContent = contentFilter.filteredText;
    // 作者昵称：登录态自动取当前用户昵称（与论坛展示一致），兜底「匿名道友」
    const finalAuthor =
      containsProfanity(profile?.nickname?.trim() || post.author || '匿名道友').filteredText;

    // 记录过滤警告（如有）
    const titleWarning = getProfanityWarning(post.title);
    const contentWarning = getProfanityWarning(post.content);
    setLastWarning(titleWarning || contentWarning || null);

    // 作者 guest_id：登录态用 profile.guest_id，未登录兜底本地 guest_id
    const guestId = getMyGuestId() ?? ensureGuestId();

    if (!isSupabaseConfigured) {
      const newPost: ForumPost = {
        id: Date.now(),
        author: finalAuthor || '匿名',
        author_nickname: finalAuthor || '匿名',
        title: finalTitle,
        content: finalContent,
        category: post.category,
        createdAt: new Date().toISOString(),
        imageUrl: post.imageUrl,
        guest_id: guestId,
        author_avatar_url: profile?.avatar_url ?? null,
      };
      setPosts((prev) => [newPost, ...prev]);
      return newPost.id;
    }

    const insertData: Record<string, unknown> = {
      author: finalAuthor || '匿名',
      author_nickname: finalAuthor || '匿名',
      title: finalTitle,
      content: finalContent,
      category: post.category,
      guest_id: guestId,
      // 作者头像：写入当前用户头像，保证帖子展示真图（兼容 050 未执行时回退）
      author_avatar_url: profile?.avatar_url ?? null,
    };
    if (post.imageUrl) insertData.image_url = post.imageUrl;

    // 主插入：带 author_nickname / author_avatar_url；
    // 兼容尚未执行「author_nickname 列」或「050 author_avatar_url 列」迁移的环境
    const res = await supabase.from('forum_posts').insert(insertData).select().single();
    let data: Record<string, unknown> | null = (res.data as Record<string, unknown>) ?? null;
    let error = res.error;

    if (
      error &&
      (error.code === '42703' ||
        (error.message || '').includes('author_nickname') ||
        (error.message || '').includes('author_avatar_url'))
    ) {
      const { author_nickname: _omitN, author_avatar_url: _omitA, ...legacyData } = insertData;
      void _omitN;
      void _omitA;
      const retry = await supabase.from('forum_posts').insert(legacyData).select().single();
      data = (retry.data as Record<string, unknown>) ?? null;
      error = retry.error;
    }

    if (error) {
      console.error('[明道阁] 发帖失败详情:', JSON.stringify(error, null, 2));
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

    // 发帖得功德：系统自动发放，每日上限 10 阳德（grant_daily_merit 内部校验登录 / 上限）
    if (isSupabaseConfigured && isAuthenticated) {
      grantDailyMerit('发帖得功德', 2, 10).catch((err) => {
        console.debug('[明道阁] 发帖得功德发放失败（可忽略）:', err);
      });
    }

    // 功法电子书上传（Storage images/gongfa/）+ 写 gongfa_materials
    const ebook = post.ebookFile;
    if (ebook && newPost.id) {
      if (ebook.size > 10 * 1024 * 1024) {
        throw new Error('电子书大小不能超过 10MB');
      }
      const safeName = ebook.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
      const filePath = `gongfa/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('images')
        .upload(filePath, ebook);
      if (upErr) {
        console.error('[明道阁] 功法电子书上传失败:', upErr);
        throw new Error(`电子书上传失败：${upErr.message}`);
      }
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
      const { error: matErr } = await supabase.from('gongfa_materials').insert({
        post_id: newPost.id,
        file_url: urlData.publicUrl,
        file_name: ebook.name,
        file_size: ebook.size,
        uploaded_by: user?.id ?? null,
      });
      if (matErr) {
        console.error('[明道阁] 功法资料写入失败:', matErr);
      } else {
        // 本地乐观追加，刷新时再校准
        setGongfaMaterials((prev) => [
          {
            id: -Date.now(),
            post_id: newPost.id,
            file_url: urlData.publicUrl,
            file_name: ebook.name,
            file_size: ebook.size,
            uploaded_by: user?.id ?? null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }

    return newPost.id;
  };

  const deletePost = async (id: number) => {
    // 仅管理员可删（前端闸 + 后端 RLS 双重守卫）
    if (!isAdmin) {
      throw new Error('仅管理员可删除帖子');
    }
    if (!isSupabaseConfigured) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (error) throw error;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setGongfaMaterials((prev) => prev.filter((m) => m.post_id !== id));
  };

  const hasLiked = useCallback((id: number): boolean => likedPosts.has(id), [likedPosts]);

  const likePost = async (id: number) => {
    const target = posts.find((p) => p.id === id);
    const base = target?.likes ?? 0;

    // 游客态（未登录 / 未配置）：仅本地 +1 展示，不落库（无法保证唯一）
    if (!isSupabaseConfigured || !isAuthenticated) {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
      return;
    }

    // 已登录：已赞则直接返回（每人每帖仅一次）
    if (likedPosts.has(id)) return;

    const { data, error } = await supabase.rpc('add_like', { p_post_id: id });
    if (error) {
      console.error('[明道阁] 点赞失败:', error);
      return;
    }
    const newCount = (typeof data === 'number' ? data : base + 1) as number;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: newCount } : p)));
    setLikedPosts((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const postsByCategory = (category: ForumCategory): ForumPost[] => {
    return posts.filter((p) => p.category === category);
  };

  return (
    <ForumContext.Provider
      value={{
        posts,
        categories,
        gongfaMaterials,
        loading,
        likedPosts,
        addPost,
        deletePost,
        likePost,
        hasLiked,
        postsByCategory,
        refresh,
        lastWarning,
      }}
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
