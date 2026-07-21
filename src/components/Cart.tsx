import { useState } from 'react';
import { Drawer, IconButton, Typography, Box, Button, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useCart } from '../context/CartContext';
import { GreekKeyBorder } from './ChinesePattern';
import ContactDialog from './ContactDialog';

export default function Cart() {
  const { state, dispatch, totalItems, totalPrice, getProduct } = useCart();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <Drawer
        anchor="right"
        open={state.isOpen}
        onClose={() => dispatch({ type: 'CLOSE_CART' })}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            backgroundColor: '#16213e',
            borderLeft: '1px solid rgba(201,169,110,0.12)',
          },
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon sx={{ color: '#c9a96e', fontSize: '1.2rem' }} />
            <Typography
              sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem' }}
            >
              购物车
            </Typography>
            {totalItems > 0 && (
              <span className="text-xs text-gold/50">({totalItems}件)</span>
            )}
          </div>
          <IconButton onClick={() => dispatch({ type: 'CLOSE_CART' })} sx={{ color: 'rgba(201,169,110,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </div>

        <GreekKeyBorder />

        {/* 购物车内容 */}
        {state.items.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-jade-white/30">
            <ShoppingBagIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.3 }} />
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem' }}>
              购物车空空如也
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.8rem', mt: 0.5, opacity: 0.5 }}>
              去挑选一串心仪的手串吧
            </Typography>
          </div>
        ) : (
          <>
            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {state.items.map((item) => {
                const product = getProduct(item.productId);
                return (
                <div key={item.productId}>
                  <div className="flex gap-3">
                    {/* 产品缩略图 */}
                    {product?.imageUrl ? (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '4px',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '4px',
                          background: product?.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: 'var(--font-calligraphy)',
                            fontSize: '1rem',
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {product?.name?.split('·')[0] ?? ''}
                        </Typography>
                      </Box>
                    )}

                    {/* 产品信息 */}
                    <div className="flex-1 min-w-0">
                      <Typography
                        noWrap
                        sx={{
                          fontFamily: 'var(--font-serif)',
                          color: '#f5f0eb',
                          fontSize: '0.9rem',
                          mb: 0.5,
                        }}
                      >
                        {product?.name ?? '商品已失效'}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-serif)',
                          color: '#c9a96e',
                          fontSize: '0.85rem',
                          mb: 1,
                        }}
                      >
                        ¥{(product?.price ?? 0).toLocaleString()}
                      </Typography>

                      {!product && (
                        <Typography
                          sx={{
                            fontFamily: 'var(--font-serif)',
                            color: 'rgba(192,57,43,0.7)',
                            fontSize: '0.75rem',
                            mb: 1,
                          }}
                        >
                          该商品已失效，请移除
                        </Typography>
                      )}

                      {/* 数量操作 */}
                      <div className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_QTY',
                              payload: { id: item.productId, quantity: item.quantity - 1 },
                            })
                          }
                          sx={{ color: 'rgba(201,169,110,0.6)', padding: '4px' }}
                        >
                          <RemoveIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                        <span
                          className="text-jade-white w-8 text-center text-sm"
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          {item.quantity}
                        </span>
                        <IconButton
                          size="small"
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_QTY',
                              payload: { id: item.productId, quantity: item.quantity + 1 },
                            })
                          }
                          sx={{ color: 'rgba(201,169,110,0.6)', padding: '4px' }}
                        >
                          <AddIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>

                        {/* 删除 */}
                        <IconButton
                          size="small"
                          onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.productId })}
                          sx={{ color: 'rgba(192,57,43,0.5)', padding: '4px', ml: 'auto' }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: '0.95rem' }} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                  <Divider sx={{ borderColor: 'rgba(201,169,110,0.08)', mt: 2 }} />
                </div>
                );
              })}
            </div>

            {/* 底部结算区 */}
            <div className="border-t border-gold/10 px-5 py-4">
              <div className="flex justify-between items-center mb-3">
                <Typography
                  sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.9rem' }}
                >
                  合计
                </Typography>
                <Typography
                  sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1.3rem', fontWeight: 700 }}
                >
                  ¥{totalPrice.toLocaleString()}
                </Typography>
              </div>
              <Button
                fullWidth
                variant="contained"
                onClick={() => setContactOpen(true)}
                sx={{
                  backgroundColor: 'rgba(192,57,43,0.85)',
                  color: '#f5f0eb',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '0.95rem',
                  letterSpacing: '0.15em',
                  padding: '10px 0',
                  borderRadius: '2px',
                  mb: 1.5,
                  '&:hover': { backgroundColor: '#c0392b' },
                }}
              >
                去联系
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
                sx={{
                  color: 'rgba(201,169,110,0.4)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '0.8rem',
                  '&:hover': { color: 'rgba(201,169,110,0.7)', backgroundColor: 'transparent' },
                }}
              >
                清空购物车
              </Button>
            </div>
          </>
        )}
      </Drawer>

      {/* 联系留言弹窗 */}
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
