import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import type { Product } from '../types';

interface ProductDetailProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetail({ product, open, onClose, onAddToCart }: ProductDetailProps) {
  if (!product) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#16213e',
          border: '1px solid rgba(201,169,110,0.15)',
          borderRadius: '4px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ padding: 0 }}>
        {/* 关闭按钮 */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'rgba(201,169,110,0.6)',
            zIndex: 10,
            '&:hover': { color: '#c9a96e' },
          }}
        >
          <CloseIcon />
        </IconButton>

        <div className="flex flex-col md:flex-row">
          {/* 左侧产品图 */}
          <Box
            sx={{
              flex: { md: '0 0 45%' },
              height: { xs: 280, md: 460 },
              background: product.imageUrl ? 'transparent' : product.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              '&::after': product.imageUrl ? {} : {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)',
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
              <Typography
                className="relative z-10"
                sx={{
                  fontFamily: 'var(--font-calligraphy)',
                  fontSize: { xs: '3rem', md: '4.5rem' },
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {product.name.split('·')[0]}
              </Typography>
            )}
          </Box>

          {/* 右侧信息 */}
          <div className="flex-1 p-6 md:p-8 flex flex-col">
            {/* 分类标签 */}
            <Chip
              label={product.material}
              size="small"
              sx={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(201,169,110,0.1)',
                color: '#c9a96e',
                borderColor: 'rgba(201,169,110,0.2)',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.75rem',
                mb: 2,
              }}
              variant="outlined"
            />

            {/* 产品名 */}
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.6rem',
                color: '#f5f0eb',
                fontWeight: 700,
                mb: 1,
              }}
            >
              {product.name}
            </Typography>

            {/* 产地 & 珠径 */}
            <div className="flex flex-wrap gap-4 mb-4">
              <Typography sx={{ fontSize: '0.8rem', color: 'rgba(201,169,110,0.6)', fontFamily: 'var(--font-serif)' }}>
                产地：{product.origin}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'rgba(201,169,110,0.6)', fontFamily: 'var(--font-serif)' }}>
                珠径：{product.diameter}
              </Typography>
            </div>

            {/* 描述 */}
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: '0.9rem',
                color: 'rgba(245,240,235,0.65)',
                lineHeight: 1.8,
                mb: 4,
                flex: 1,
              }}
            >
              {product.description}
            </Typography>

            {/* 价格 */}
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                color: '#c9a96e',
                fontWeight: 700,
                mb: 3,
              }}
            >
              ¥{product.price.toLocaleString()}
            </Typography>

            {/* 购买按钮 */}
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddShoppingCartIcon />}
              onClick={() => { onAddToCart(product); onClose(); }}
              sx={{
                backgroundColor: 'rgba(192, 57, 43, 0.85)',
                color: '#f5f0eb',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.95rem',
                letterSpacing: '0.15em',
                padding: '12px 0',
                borderRadius: '2px',
                '&:hover': {
                  backgroundColor: '#c0392b',
                },
              }}
            >
              加入购物车
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
