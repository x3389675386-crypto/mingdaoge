import { Card, CardContent, CardActions, Button, Chip, Box, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import type { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { grantDailyMerit } from '../lib/task';

interface ProductCardProps {
  product: Product;
  onDetail: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuy: (product: Product) => void;
}

/** 分类标签颜色映射 */
const categoryChipColor: Record<string, string> = {
  wood: '#8D6E63',
  bodhi: '#A1887F',
  agarwood: '#5D4037',
};

export default function ProductCard({ product, onDetail, onAddToCart, onBuy }: ProductCardProps) {
  const { isAuthenticated } = useAuth();

  /** 金色「购买/结缘」按钮：触发结缘得功德（每日上限 10），再打开购买引导弹窗 */
  const handleBuy = () => {
    if (isAuthenticated) {
      void grantDailyMerit('结缘得功德', 5, 10).catch(() => {});
    }
    onBuy(product);
  };
  return (
    <Card
      className="animate-fade-in-up group"
      sx={{
        backgroundColor: 'rgba(22, 33, 62, 0.6)',
        border: '1px solid rgba(201,169,110,0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.4s ease',
        '&:hover': {
          borderColor: 'rgba(201,169,110,0.3)',
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(201,169,110,0.05)',
        },
      }}
    >
      {/* 产品图片区域 */}
      <Box
        className="relative cursor-pointer"
        onClick={() => onDetail(product)}
        sx={{
          height: 200,
          background: product.imageUrl ? 'transparent' : product.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::after': product.imageUrl ? {} : {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)',
          },
        }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          /* 产品名称水印 */
          <Typography
            className="relative z-10 text-white/80 group-hover:text-white transition-colors duration-300"
            sx={{
              fontFamily: 'var(--font-calligraphy)',
              fontSize: '2rem',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {product.name.split('·')[0]}
          </Typography>
        )}

        {/* 分类标签 */}
        <Chip
          label={product.material}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: categoryChipColor[product.category] || '#5D4037',
            color: '#f5f0eb',
            fontSize: '0.7rem',
            height: 22,
            fontFamily: 'var(--font-serif)',
          }}
        />
      </Box>

      <CardContent sx={{ padding: '20px 20px 10px' }}>
        {/* 产品名 */}
        <Typography
          className="cursor-pointer hover:text-gold transition-colors"
          onClick={() => onDetail(product)}
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1rem',
            color: '#f5f0eb',
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          {product.name}
        </Typography>

        {/* 产地与尺寸 */}
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'rgba(201,169,110,0.6)',
            fontFamily: 'var(--font-serif)',
            mb: 1,
          }}
        >
          {product.origin} · {product.diameter}
        </Typography>

        {/* 价格 */}
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            color: '#c9a96e',
            fontWeight: 700,
          }}
        >
          ¥{product.price.toLocaleString()}
        </Typography>
      </CardContent>

      <CardActions sx={{ padding: '12px 20px 20px', gap: 1.5 }}>
        <Button
          size="small"
          startIcon={<AddShoppingCartIcon />}
          onClick={() => onAddToCart(product)}
          sx={{
            borderColor: 'rgba(201,169,110,0.3)',
            color: '#c9a96e',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.8rem',
            borderRadius: '8px',
            '&:hover': {
              borderColor: '#c9a96e',
              backgroundColor: 'rgba(201,169,110,0.08)',
            },
          }}
          variant="outlined"
        >
          加入购物车
        </Button>
        <Button
          size="small"
          startIcon={<ShoppingBagIcon />}
          onClick={handleBuy}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.9)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '2px',
            flex: 1,
            '&:hover': {
              backgroundColor: '#c9a96e',
            },
          }}
          variant="contained"
        >
          购买
        </Button>
      </CardActions>
    </Card>
  );
}
