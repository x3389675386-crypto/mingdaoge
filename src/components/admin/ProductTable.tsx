import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Typography,
  Tooltip,
  Box,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useProducts } from '../../context/ProductContext';
import ProductEditDialog from './ProductEditDialog';
import type { Product } from '../../types';

/** 分类标签映射 */
const categoryLabel: Record<string, string> = {
  wood: '木质',
  bodhi: '菩提',
  agarwood: '沉香',
};

export default function ProductTable() {
  const { allProducts, addProduct, updateProduct, deleteProduct, toggleStatus } = useProducts();
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  /** 打开编辑弹窗 */
  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setIsNew(false);
    setEditOpen(true);
  };

  /** 打开新增弹窗 */
  const handleAdd = () => {
    setEditProduct(null);
    setIsNew(true);
    setEditOpen(true);
  };

  /** 保存（新增或更新） */
  const handleSave = async (product: Product) => {
    try {
      if (isNew) {
        await addProduct({ ...product, status: 'active' });
      } else {
        await updateProduct(product);
      }
    } catch (err) {
      console.error('保存失败:', err);
      let msg = '未知错误';
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object') {
        msg = JSON.stringify(err);
      }
      alert('保存失败：' + msg + '\n\n如果提示签名错误，请检查 Vercel 环境变量中的 VITE_SUPABASE_ANON_KEY 是否完整复制。');
    }
  };

  /** 删除确认 */
  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  return (
    <>
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <Typography
          sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem' }}
        >
          产品列表
          <span className="text-gold/40 text-sm ml-2">共 {allProducts.length} 件</span>
        </Typography>
        <IconButton
          onClick={handleAdd}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.1)',
            color: '#c9a96e',
            border: '1px solid rgba(201,169,110,0.2)',
            borderRadius: '4px',
            '&:hover': { backgroundColor: 'rgba(201,169,110,0.2)' },
          }}
        >
          <AddIcon />
        </IconButton>
      </div>

      {/* 表格 */}
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
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 64 }}>预览</TableCell>
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)' }}>名称</TableCell>
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)' }}>分类</TableCell>
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)' }}>价格</TableCell>
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 80 }}>状态</TableCell>
              <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 100 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allProducts.map((product) => (
              <TableRow
                key={product.id}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(201,169,110,0.03)' },
                  '& td': { borderBottomColor: 'rgba(201,169,110,0.06)' },
                }}
              >
                {/* 缩略图 */}
                <TableCell>
                  {product.imageUrl ? (
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name ?? ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '4px',
                        background: product.gradient ?? '',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-calligraphy)',
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {product.name?.split('·')[0] ?? ''}
                      </Typography>
                    </Box>
                  )}
                </TableCell>

                {/* 名称 & 材质 */}
                <TableCell>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.9rem' }}>
                    {product.name ?? '未命名'}
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.4)', fontSize: '0.75rem' }}>
                    {(product.material ?? '')} · {(product.origin ?? '')}
                  </Typography>
                </TableCell>

                {/* 分类 */}
                <TableCell>
                  <Chip
                    label={categoryLabel[product.category] || product.category}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(201,169,110,0.08)',
                      color: '#c9a96e',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.75rem',
                      borderColor: 'rgba(201,169,110,0.15)',
                    }}
                    variant="outlined"
                  />
                </TableCell>

                {/* 价格 */}
                <TableCell>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontWeight: 600 }}>
                    ¥{(typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0).toLocaleString()}
                  </Typography>
                </TableCell>

                {/* 上架状态 */}
                <TableCell>
                  <Switch
                    checked={product.status === 'active'}
                    onChange={() => toggleStatus(product.id)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#c9a96e' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'rgba(201,169,110,0.4)' },
                      '& .MuiSwitch-track': { backgroundColor: 'rgba(245,240,235,0.1)' },
                    }}
                  />
                </TableCell>

                {/* 操作 */}
                <TableCell>
                  <div className="flex gap-1">
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleEdit(product)} sx={{ color: 'rgba(201,169,110,0.5)' }}>
                        <EditIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                    {deleteConfirmId === product.id ? (
                      <div className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(product.id)}
                          sx={{ color: '#c0392b' }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                        <span
                          className="text-xs text-jade-white/40 cursor-pointer"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          取消
                        </span>
                      </div>
                    ) : (
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirmId(product.id)}
                          sx={{ color: 'rgba(192,57,43,0.4)' }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 编辑/新增弹窗 — key 强制切换产品时重新挂载，避免 form 残留旧数据 */}
      <ProductEditDialog
        key={editProduct?.id ?? 'new'}
        product={editProduct}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
