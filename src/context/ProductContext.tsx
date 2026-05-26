import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Product } from '../types';
import { products as seedProducts } from '../data/products';

/** localStorage 存储键 */
const STORAGE_KEY = 'mingdao_products';

/** 产品状态接口 */
export interface ProductState {
  products: Product[];
}

/** 产品动作类型 */
export type ProductAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: number }
  | { type: 'TOGGLE_STATUS'; payload: number };

/** 从 localStorage 读取产品数据，若无则初始化 */
function loadProducts(): Product[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: Product[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // 解析失败则使用种子数据
  }
  // 首次加载：将种子数据写入 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProducts));
  return seedProducts;
}

/** 保存到 localStorage */
function saveProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/** Reducer */
function productReducer(state: ProductState, action: ProductAction): ProductState {
  let newProducts: Product[];

  switch (action.type) {
    case 'SET_PRODUCTS':
      newProducts = action.payload;
      break;

    case 'UPDATE_PRODUCT':
      newProducts = state.products.map((p) =>
        p.id === action.payload.id ? action.payload : p
      );
      break;

    case 'ADD_PRODUCT':
      newProducts = [...state.products, action.payload];
      break;

    case 'DELETE_PRODUCT':
      newProducts = state.products.filter((p) => p.id !== action.payload);
      break;

    case 'TOGGLE_STATUS':
      newProducts = state.products.map((p) =>
        p.id === action.payload
          ? { ...p, status: p.status === 'active' ? 'inactive' as const : 'active' as const }
          : p
      );
      break;

    default:
      return state;
  }

  saveProducts(newProducts);
  return { products: newProducts };
}

/* ===== Context ===== */
interface ProductContextValue {
  state: ProductState;
  dispatch: Dispatch<ProductAction>;
  /** 仅上架产品 */
  activeProducts: Product[];
  /** 所有产品（含下架） */
  allProducts: Product[];
  /** 获取下一个可用 ID */
  nextId: () => number;
}

const ProductContext = createContext<ProductContextValue | null>(null);

/* ===== Provider ===== */
export function ProductProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(productReducer, { products: loadProducts() });

  const activeProducts = state.products.filter((p) => p.status === 'active');
  const allProducts = state.products;

  const nextId = (): number => {
    const maxId = state.products.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
  };

  return (
    <ProductContext.Provider value={{ state, dispatch, activeProducts, allProducts, nextId }}>
      {children}
    </ProductContext.Provider>
  );
}

/* ===== Hook ===== */
export function useProducts(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
