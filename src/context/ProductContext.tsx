import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Product, ProductCategory } from '../types';
import { supabase } from '../lib/supabase';
import { products as seedProducts } from '../data/products';

/** 产品状态接口 */
export interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/** Context 值接口 */
interface ProductContextValue {
  state: ProductState;
  /** 仅上架产品 */
  activeProducts: Product[];
  /** 所有产品（含下架） */
  allProducts: Product[];
  /** 获取下一个可用 ID */
  nextId: () => number;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 添加产品 */
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  /** 更新产品 */
  updateProduct: (product: Product) => Promise<void>;
  /** 删除产品 */
  deleteProduct: (id: number) => Promise<void>;
  /** 切换上架状态 */
  toggleStatus: (id: number) => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | null>(null);

/** 从 Supabase 加载产品数据，若无则初始化种子数据 */
async function loadProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Failed to load products:', error);
    return [];
  }

  // 如果数据库为空，初始化种子数据
  if (!data || data.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(seedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        image_url: p.imageUrl || null,
        status: p.status,
        gradient: p.gradient,
        material: p.material,
        origin: p.origin,
        diameter: p.diameter,
      })))
      .select();

    if (insertError) {
      console.error('Failed to seed products:', insertError);
      return [];
    }

    return inserted.map(mapDbToProduct);
  }

  return data.map(mapDbToProduct);
}

/** 数据库行 → 前端 Product 对象 */
function mapDbToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    name: row.name as string,
    material: (row.material as string) || '',
    category: row.category as ProductCategory,
    price: Number(row.price),
    description: (row.description as string) || '',
    gradient: (row.gradient as string) || '',
    imageUrl: (row.image_url as string) || undefined,
    origin: (row.origin as string) || '',
    diameter: (row.diameter as string) || '',
    status: row.status as 'active' | 'inactive',
  };
}

/** Provider 组件 */
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载产品数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeProducts = products.filter((p) => p.status === 'active');
  const allProducts = products;

  const nextId = (): number => {
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    return maxId + 1;
  };

  const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
    const id = nextId();
    const { data, error: insertError } = await supabase
      .from('products')
      .insert({
        id,
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        image_url: product.imageUrl || null,
        status: product.status,
        gradient: product.gradient,
        material: product.material,
        origin: product.origin,
        diameter: product.diameter,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const newProduct = mapDbToProduct(data as Record<string, unknown>);
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = async (product: Product) => {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        image_url: product.imageUrl || null,
        status: product.status,
        gradient: product.gradient,
        material: product.material,
        origin: product.origin,
        diameter: product.diameter,
      })
      .eq('id', product.id);

    if (updateError) throw updateError;

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? product : p))
    );
  };

  const deleteProduct = async (id: number) => {
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleStatus = async (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const newStatus = product.status === 'active' ? 'inactive' : 'active';

    const { error: updateError } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', id);

    if (updateError) throw updateError;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  return (
    <ProductContext.Provider
      value={{
        state: { products, loading, error },
        activeProducts,
        allProducts,
        nextId,
        refresh,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleStatus,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

/** 自定义 Hook */
export function useProducts(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
