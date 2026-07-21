/**
 * 首页板块一：串藏雅集 / 品鉴手串。
 * 精选上架手串网格 + CTA 跳转全部门类（#products）。
 */

import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useProducts } from '../../context/ProductContext';
import ProductCard from '../ProductCard';
import type { Product } from '../../types';

interface Props {
  onDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuy: (product: Product) => void;
}

export default function SectionStringCollection({ onDetail, onAddToCart, onBuy }: Props) {
  const { activeProducts } = useProducts();
  const featured = activeProducts.slice(0, 8);

  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box id="string-collection" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 6, md: 9 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '1.8rem', md: '2.4rem' }, color: '#c9a96e' }}>
          串藏雅集
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
          品鉴手串 · 结缘佳器
        </Typography>
      </Box>

      {featured.length === 0 ? (
        <Typography sx={{ textAlign: 'center', color: 'rgba(245,240,235,0.4)', fontFamily: 'var(--font-serif)', py: 4 }}>
          藏品整理中，敬请期待
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onDetail={onDetail} onAddToCart={onAddToCart} onBuy={onBuy} />
          ))}
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          onClick={scrollToProducts}
          endIcon={<ArrowForwardIcon />}
          sx={{
            borderColor: 'rgba(201,169,110,0.4)',
            color: '#c9a96e',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.1em',
            borderRadius: '2px',
            px: 3,
            '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
          }}
          variant="outlined"
        >
          查看全部藏品
        </Button>
      </Box>
    </Box>
  );
}
