import { useState } from 'react';
import { Typography, Box, Button, Card, CardContent, Dialog, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useReviews } from '../context/ReviewContext';
import { useProducts } from '../context/ProductContext';
import { GoldDivider } from './ChinesePattern';
import ReviewForm from './ReviewForm';

/** 格式化时间为相对时间 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function ReviewSection() {
  const { reviews } = useReviews();
  const { activeProducts } = useProducts();
  const [formOpen, setFormOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  /** 获取产品名称 */
  const getProductName = (productId?: number): string | null => {
    if (!productId) return null;
    const product = activeProducts.find((p) => p.id === productId);
    return product ? product.name : null;
  };

  return (
    <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
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
          晒单分享
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
          万千手串，各有故事
        </Typography>
      </div>

      {/* 晒图列表 */}
      {reviews.length === 0 ? (
        <div className="text-center py-16">
          <CameraAltIcon sx={{ fontSize: '3rem', color: 'rgba(201,169,110,0.2)', mb: 2 }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.3)',
              fontSize: '0.95rem',
            }}
          >
            暂无晒图，快来第一个分享吧！
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const productName = getProductName(review.productId);
            return (
              <Card
                key={review.id}
                sx={{
                  backgroundColor: 'rgba(22, 33, 62, 0.6)',
                  border: '1px solid rgba(201,169,110,0.1)',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'rgba(201,169,110,0.3)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* 昵称和时间 */}
                  <div className="flex items-center justify-between mb-2">
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: '#c9a96e',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    >
                      {review.nickname}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(245,240,235,0.3)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {formatRelativeTime(review.createdAt)}
                    </Typography>
                  </div>

                  {/* 关联产品 */}
                  {productName && (
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(201,169,110,0.5)',
                        fontSize: '0.75rem',
                        mb: 1,
                      }}
                    >
                      📿 {productName}
                    </Typography>
                  )}

                  {/* 评论内容 */}
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      color: 'rgba(245,240,235,0.7)',
                      fontSize: '0.85rem',
                      lineHeight: 1.8,
                      mb: review.imageUrl ? 2 : 0,
                    }}
                  >
                    {review.content}
                  </Typography>

                  {/* 晒图缩略图 */}
                  {review.imageUrl && (
                    <Box
                      sx={{
                        width: '100%',
                        height: 160,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid rgba(201,169,110,0.1)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewImage(review.imageUrl!)}
                    >
                      <img
                        src={review.imageUrl}
                        alt="晒图"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 我要晒图按钮 */}
      <div className="text-center mt-10">
        <Button
          variant="outlined"
          startIcon={<CameraAltIcon />}
          onClick={() => setFormOpen(true)}
          sx={{
            borderColor: 'rgba(201,169,110,0.4)',
            color: '#c9a96e',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            px: 4,
            py: 1.2,
            borderRadius: '2px',
            '&:hover': {
              borderColor: '#c9a96e',
              backgroundColor: 'rgba(201,169,110,0.08)',
            },
          }}
        >
          我要晒图
        </Button>
      </div>

      {/* 晒图表单弹窗 */}
      <ReviewForm open={formOpen} onClose={() => setFormOpen(false)} />

      {/* 图片预览弹窗 */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'rgba(10,10,20,0.95)',
            overflow: 'hidden',
          },
        }}
      >
        <IconButton
          onClick={() => setPreviewImage(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'rgba(201,169,110,0.6)',
            zIndex: 10,
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="晒图大图"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                display: 'block',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
