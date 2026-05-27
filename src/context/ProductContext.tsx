import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Product, ProductCategory } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
    status: row.status === true ? 'active' : row.status === false ? 'inactive' : (row.status as 'active' | 'inactive'),
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

      if (!isSupabaseConfigured) {
        console.warn('[明道阁] Supabase 未配置，使用本地种子数据');
        setProducts(seedProducts);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (fetchError) {
        console.error('[明道阁] 加载产品失败:', fetchError);
        setError('加载产品失败: ' + fetchError.message);
        setProducts(seedProducts);
        return;
      }

      // 如果数据库为空，初始化种子数据
      if (!data || data.length === 0) {
        console.log('[明道阁] 数据库为空，初始化种子数据...');
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
          console.error('[明道阁] 种子数据插入失败:', insertError);
          setError('初始化数据失败: ' + insertError.message);
          setProducts(seedProducts);
          return;
        }

        console.log('[明道阁] 种子数据初始化成功，共', inserted?.length, '条');
        setProducts(inserted ? inserted.map(mapDbToProduct) : seedProducts);
        return;
      }

      console.log('[明道阁] 从 Supabase 加载', data.length, '个产品');
      setProducts(data.map(mapDbToProduct));
    } catch (err) {
      console.error('[明道阁] 产品加载异常:', err);
      setError(err instanceof Error ? err.message : '加载产品数据失败');
      setProducts(seedProducts);
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
    if (!isSupabaseConfigured) {
      const newProduct = { ...product, id: nextId() };
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    }

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
    if (!isSupabaseConfigured) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      return;
    }

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
    if (!isSupabaseConfigured) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    }

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

    if (!isSupabaseConfigured) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
      return;
    }

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
