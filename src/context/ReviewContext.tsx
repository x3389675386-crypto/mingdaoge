import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Review } from '../types';
import { supabase } from '../lib/supabase';

/** Context 值接口 */
interface ReviewContextValue {
  reviews: Review[];
  loading: boolean;
  /** 新增晒图 */
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  /** 删除晒图 */
  deleteReview: (id: number) => Promise<void>;
  /** 获取指定产品的晒图 */
  productReviews: (productId: number) => Review[];
  /** 刷新数据 */
  refresh: () => Promise<void>;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

/** 数据库行 → 前端 Review 对象 */
function mapDbToReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as number,
    nickname: row.nickname as string,
    content: (row.content as string) || '',
    imageUrl: (row.image_url as string) || undefined,
    productId: (row.product_id as number) || undefined,
    createdAt: row.created_at as string,
  };
}

/** Provider 组件 */
export function ReviewProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data || []).map(mapDbToReview));
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        nickname: review.nickname,
        content: review.content,
        image_url: review.imageUrl || null,
        product_id: review.productId || null,
      })
      .select()
      .single();

    if (error) throw error;

    const newReview = mapDbToReview(data as Record<string, unknown>);
    setReviews((prev) => [newReview, ...prev]);
  };

  const deleteReview = async (id: number) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const productReviews = (productId: number): Review[] => {
    return reviews.filter((r) => r.productId === productId);
  };

  return (
    <ReviewContext.Provider
      value={{ reviews, loading, addReview, deleteReview, productReviews, refresh }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

/** 自定义 Hook */
export function useReviews(): ReviewContextValue {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewProvider');
  }
  return context;
}
