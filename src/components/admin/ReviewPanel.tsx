import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useReviews } from '../../context/ReviewContext';
import { useProducts } from '../../context/ProductContext';

/** 格式化时间 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReviewPanel() {
  const { reviews, deleteReview } = useReviews();
  const { allProducts } = useProducts();

  /** 获取产品名称 */
  const getProductName = (productId?: number): string => {
    if (!productId) return '—';
    const product = allProducts.find((p) => p.id === productId);
    return product ? product.name : '—';
  };

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem' }}>
          晒图管理
          <span className="text-gold/40 text-sm ml-2">共 {reviews.length} 条</span>
        </Typography>
      </div>

      {reviews.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.3)', fontSize: '0.95rem' }}
          >
            暂无晒图数据
          </Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: 'rgba(22,33,62,0.4)',
            border: '1px solid rgba(201,169,110,0.1)',
            borderRadius: '4px',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 80 }}>昵称</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)' }}>内容</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 120 }}>关联产品</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 64 }}>图片</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 100 }}>时间</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 60 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow
                  key={review.id}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(201,169,110,0.03)' },
                    '& td': { borderBottomColor: 'rgba(201,169,110,0.06)' },
                  }}
                >
                  {/* 昵称 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: '#c9a96e',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {review.nickname}
                    </Typography>
                  </TableCell>

                  {/* 内容（截断） */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(245,240,235,0.7)',
                        fontSize: '0.85rem',
                        maxWidth: 250,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {review.content}
                    </Typography>
                  </TableCell>

                  {/* 关联产品 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(201,169,110,0.5)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {getProductName(review.productId)}
                    </Typography>
                  </TableCell>

                  {/* 图片缩略图 */}
                  <TableCell>
                    {review.imageUrl ? (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid rgba(201,169,110,0.1)',
                        }}
                      >
                        <img
                          src={review.imageUrl}
                          alt="晒图"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    ) : (
                      <Typography
                        sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.2)', fontSize: '0.75rem' }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* 时间 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(245,240,235,0.4)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {formatTime(review.createdAt)}
                    </Typography>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => deleteReview(review.id)}
                        sx={{ color: 'rgba(192,57,43,0.4)' }}
                      >
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
