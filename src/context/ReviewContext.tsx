import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { ReviewState, ReviewAction, Review } from '../types';

/** localStorage 存储键 */
const STORAGE_KEY = 'mingdao_reviews';

/** 从 localStorage 读取晒图数据 */
function loadReviews(): Review[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Review[] = JSON.parse(stored);
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
function saveReviews(reviews: Review[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

/** Reducer */
function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  let newReviews: Review[];

  switch (action.type) {
    case 'ADD_REVIEW':
      newReviews = [action.payload, ...state.reviews];
      break;

    case 'DELETE_REVIEW':
      newReviews = state.reviews.filter((r) => r.id !== action.payload);
      break;

    default:
      return state;
  }

  saveReviews(newReviews);
  return { reviews: newReviews };
}

/** Context 值接口 */
interface ReviewContextValue {
  state: ReviewState;
  dispatch: Dispatch<ReviewAction>;
  /** 所有晒图 */
  reviews: Review[];
  /** 新增晒图 */
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;
  /** 删除晒图 */
  deleteReview: (id: number) => void;
  /** 获取指定产品的晒图 */
  productReviews: (productId: number) => Review[];
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

/** Provider 组件 */
export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, { reviews: loadReviews() });

  const reviews = state.reviews;

  const addReview = (review: Omit<Review, 'id' | 'createdAt'>) => {
    const maxId = reviews.reduce((max, r) => Math.max(max, r.id), 0);
    const newReview: Review = {
      ...review,
      id: maxId + 1,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_REVIEW', payload: newReview });
  };

  const deleteReview = (id: number) => {
    dispatch({ type: 'DELETE_REVIEW', payload: id });
  };

  const productReviews = (productId: number): Review[] => {
    return reviews.filter((r) => r.productId === productId);
  };

  return (
    <ReviewContext.Provider
      value={{ state, dispatch, reviews, addReview, deleteReview, productReviews }}
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
