import { createContext, useContext, useReducer, useCallback, type Dispatch, type ReactNode } from 'react';
import type { CartState, CartAction, Product } from '../types';
import { useProducts } from './ProductContext';

/* ===== 初始状态 ===== */
const initialState: CartState = {
  items: [],
  isOpen: false,
};

/* ===== Reducer ===== */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((item) => item.productId === action.payload.id);
      if (existing) {
        return {
          ...state,
          isOpen: true,
          items: state.items.map((item) =>
            item.productId === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        isOpen: true,
        items: [...state.items, { productId: action.payload.id, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.productId !== action.payload),
      };

    case 'UPDATE_QTY': {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.productId !== id),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === id ? { ...item, quantity } : item
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };

    case 'OPEN_CART':
      return { ...state, isOpen: true };

    case 'CLOSE_CART':
      return { ...state, isOpen: false };

    default:
      return state;
  }
}

/* ===== Context 创建 ===== */
interface CartContextValue {
  state: CartState;
  dispatch: Dispatch<CartAction>;
  /** 购物车商品总数 */
  totalItems: number;
  /** 购物车总价 */
  totalPrice: number;
  /** 加入购物车快捷方法 */
  addToCart: (product: Product) => void;
  /** 按ID解析实时产品（来自 ProductProvider） */
  getProduct: (id: number) => Product | undefined;
}

const CartContext = createContext<CartContextValue | null>(null);

/* ===== Provider 组件 ===== */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { allProducts } = useProducts();

  /** 按ID解析实时产品（来自 ProductProvider） */
  const getProduct = useCallback(
    (id: number): Product | undefined => allProducts.find((p) => p.id === id),
    [allProducts]
  );

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce(
    (sum, item) => sum + (getProduct(item.productId)?.price ?? 0) * item.quantity,
    0
  );

  const addToCart = (product: Product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  };

  return (
    <CartContext.Provider value={{ state, dispatch, totalItems, totalPrice, addToCart, getProduct }}>
      {children}
    </CartContext.Provider>
  );
}

/* ===== 自定义 Hook ===== */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
