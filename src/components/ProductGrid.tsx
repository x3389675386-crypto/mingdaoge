import { useState, useMemo } from 'react';
import { ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import { categoryLabels } from '../data/products';
import { useProducts } from '../context/ProductContext';
import { GoldDivider } from './ChinesePattern';
import ProductCard from './ProductCard';
import type { Product, Category } from '../types';

interface ProductGridProps {
  onDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ onDetail, onAddToCart }: ProductGridProps) {
  const [category, setCategory] = useState<Category>('all');
  const { activeProducts } = useProducts();

  /** 根据分类筛选产品（只显示上架的） */
  const filtered = useMemo(() => {
    if (category === 'all') return activeProducts;
    return activeProducts.filter((p) => p.category === category);
  }, [category, activeProducts]);

  return (
    <section id="products" className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* 标题 */}
      <div className="text-center mb-12">
        <Typography
          sx={{
            fontFamily: 'var(--font-calligraphy)',
            fontSize: { xs: '2rem', md: '2.5rem' },
            color: '#f5f0eb',
            mb: 1,
          }}
        >
          匠心手串
        </Typography>
        <GoldDivider className="mb-4" />
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.5)',
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
          }}
        >
          每一串，都是与自然的一次对话
        </Typography>
      </div>

      {/* 分类筛选 */}
      <div className="flex justify-center mb-10">
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, val) => { if (val) setCategory(val); }}
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(201,169,110,0.5)',
              borderColor: 'rgba(201,169,110,0.15)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.85rem',
              padding: '6px 20px',
              letterSpacing: '0.1em',
              '&.Mui-selected': {
                backgroundColor: 'rgba(201,169,110,0.12)',
                color: '#c9a96e',
                borderColor: 'rgba(201,169,110,0.4)',
                '&:hover': {
                  backgroundColor: 'rgba(201,169,110,0.18)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(201,169,110,0.06)',
              },
            },
          }}
        >
          {Object.entries(categoryLabels).map(([key, label]) => (
            <ToggleButton key={key} value={key}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      {/* 产品网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((product, index) => (
          <div key={product.id} style={{ animationDelay: `${index * 0.1}s` }}>
            <ProductCard
              product={product}
              onDetail={onDetail}
              onAddToCart={onAddToCart}
            />
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-jade-white/30" style={{ fontFamily: 'var(--font-serif)' }}>
          此分类暂无产品
        </div>
      )}
    </section>
  );
}
