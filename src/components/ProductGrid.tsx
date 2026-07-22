import { useState, useMemo } from 'react';
import {
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { categoryLabels } from '../data/products';
import { useProducts } from '../context/ProductContext';
import { GoldDivider } from './ChinesePattern';
import ProductCard from './ProductCard';
import BuyGuideDialog from './BuyGuideDialog';
import type { Product, Category } from '../types';

/** 排序方式 */
type SortMode = 'default' | 'price_asc' | 'price_desc';

interface ProductGridProps {
  onDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ onDetail, onAddToCart }: ProductGridProps) {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('default');
  const [buyOpen, setBuyOpen] = useState(false);
  const { activeProducts } = useProducts();

  /** 计算顺序：分类过滤 → 搜索过滤 → 排序 */
  const filtered = useMemo(() => {
    // 1. 按分类过滤
    let list = category === 'all' ? activeProducts : activeProducts.filter((p) => p.category === category);

    // 2. 按搜索过滤（名称 + 材质，不区分大小写）
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.material.toLowerCase().includes(q)
      );
    }

    // 3. 排序
    if (sort === 'price_asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [category, activeProducts, search, sort]);

  return (
    <section id="products" className="py-12 px-4 md:px-8 max-w-[1200px] mx-auto">
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

        {/* 搜索 + 排序 工具栏 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-between items-stretch sm:items-center">
          {/* 搜索输入框 */}
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索名称或材质…"
            size="small"
            fullWidth
            sx={{
              maxWidth: { sm: 320 },
              '& .MuiOutlinedInput-root': {
                fontFamily: 'var(--font-serif)',
                color: '#f5f0eb',
                borderRadius: '2px',
                '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#c9a96e' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(245,240,235,0.35)', opacity: 1 },
              '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(201,169,110,0.5)' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* 排序控件 */}
          <TextField
            select
            label="排序"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            size="small"
            sx={{
              minWidth: { xs: '100%', sm: 160 },
              '& .MuiOutlinedInput-root': {
                fontFamily: 'var(--font-serif)',
                color: '#f5f0eb',
                borderRadius: '2px',
                '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#c9a96e' },
              },
              '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
              '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
            }}
          >
            <MenuItem value="default" sx={{ fontFamily: 'var(--font-serif)' }}>默认</MenuItem>
            <MenuItem value="price_asc" sx={{ fontFamily: 'var(--font-serif)' }}>价格从低到高</MenuItem>
            <MenuItem value="price_desc" sx={{ fontFamily: 'var(--font-serif)' }}>价格从高到低</MenuItem>
          </TextField>
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
              onBuy={() => setBuyOpen(true)}
            />
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-jade-white/30" style={{ fontFamily: 'var(--font-serif)' }}>
          {search.trim() ? '没有找到相关商品' : '此分类暂无产品'}
        </div>
      )}

      {/* 购买引导弹窗 */}
      <BuyGuideDialog open={buyOpen} onClose={() => setBuyOpen(false)} />
    </section>
  );
}
