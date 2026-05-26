import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Product, ProductCategory } from '../../types';

/** 图片大小限制 500KB */
const MAX_IMAGE_SIZE = 500 * 1024;

interface ProductEditDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
}

/** 分类选项 */
const categoryOptions: { value: ProductCategory; label: string }[] = [
  { value: 'wood', label: '木质' },
  { value: 'bodhi', label: '菩提' },
  { value: 'agarwood', label: '沉香' },
];

/** 渐变色预设 */
const gradientPresets = [
  'linear-gradient(135deg, #5D4037 0%, #3E2723 50%, #4E342E 100%)',
  'linear-gradient(135deg, #4E342E 0%, #1B0000 50%, #3E2723 100%)',
  'linear-gradient(135deg, #A1887F 0%, #6D4C41 50%, #8D6E63 100%)',
  'linear-gradient(135deg, #8D6E63 0%, #5D4037 50%, #6D4C41 100%)',
  'linear-gradient(135deg, #795548 0%, #4E342E 50%, #5D4037 100%)',
  'linear-gradient(135deg, #D7CCC8 0%, #BCAAA4 50%, #A1887F 100%)',
  'linear-gradient(135deg, #3E2723 0%, #1A0000 50%, #4E342E 100%)',
  'linear-gradient(135deg, #6D4C41 0%, #3E2723 50%, #5D4037 100%)',
];

/** 输入框统一样式 */
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--font-serif)',
    color: '#f5f0eb',
    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--font-serif)',
    color: 'rgba(245,240,235,0.5)',
  },
  '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
  '& .MuiMenuItem-root': {
    fontFamily: 'var(--font-serif)',
  },
};

export default function ProductEditDialog({ product, open, onClose, onSave }: ProductEditDialogProps) {
  const isNew = !product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Product>(
    product ?? {
      id: 0,
      name: '',
      material: '',
      category: 'wood',
      price: 0,
      description: '',
      gradient: gradientPresets[0],
      imageUrl: undefined,
      origin: '',
      diameter: '10mm',
      status: 'active',
    }
  );

  const [nameError, setNameError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [imageError, setImageError] = useState('');

  /** 更新表单字段 */
  const updateField = <K extends keyof Product>(key: K, value: Product[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'name') setNameError(false);
    if (key === 'price') setPriceError(false);
  };

  /** 处理图片上传 */
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('图片过大，请选择500KB以内的图片');
      return;
    }

    setImageError('');
    const reader = new FileReader();
    reader.onload = () => {
      updateField('imageUrl', reader.result as string);
    };
    reader.readAsDataURL(file);

    // 重置 file input 以便重复选择同一文件
    e.target.value = '';
  };

  /** 删除图片 */
  const handleRemoveImage = () => {
    updateField('imageUrl', undefined);
    setImageError('');
  };

  const handleSave = () => {
    let valid = true;
    if (!form.name.trim()) { setNameError(true); valid = false; }
    if (form.price <= 0) { setPriceError(true); valid = false; }
    if (!valid) return;
    onSave(form);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#16213e',
          border: '1px solid rgba(201,169,110,0.15)',
          borderRadius: '4px',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'var(--font-serif)',
          color: '#c9a96e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {isNew ? '新增产品' : '编辑产品'}
        <IconButton onClick={onClose} sx={{ color: 'rgba(201,169,110,0.6)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* 产品图片区域 */}
          <div>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem', mb: 1 }}>
              产品图片
            </Typography>
            {form.imageUrl ? (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(201,169,110,0.2)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={form.imageUrl}
                    alt="产品图片"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
                <div className="flex flex-col gap-1">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PhotoCameraIcon />}
                    onClick={handleImageSelect}
                    sx={{
                      borderColor: 'rgba(201,169,110,0.3)',
                      color: '#c9a96e',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.75rem',
                      '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
                    }}
                  >
                    替换图片
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handleRemoveImage}
                    sx={{
                      color: 'rgba(192,57,43,0.6)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.75rem',
                      '&:hover': { color: '#c0392b', backgroundColor: 'rgba(192,57,43,0.08)' },
                    }}
                  >
                    删除图片
                  </Button>
                </div>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '4px',
                    background: form.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(201,169,110,0.1)',
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-calligraphy)',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {form.name || '产品'}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleImageSelect}
                  sx={{
                    borderColor: 'rgba(201,169,110,0.3)',
                    color: '#c9a96e',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.75rem',
                    '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
                  }}
                >
                  上传图片
                </Button>
              </Box>
            )}

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {imageError && (
              <Typography
                sx={{ fontFamily: 'var(--font-serif)', color: '#c0392b', fontSize: '0.75rem', mt: 0.5 }}
              >
                {imageError}
              </Typography>
            )}
          </div>

          <TextField
            label="产品名称"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            fullWidth
            error={nameError}
            helperText={nameError ? '产品名称不能为空' : ''}
            sx={fieldSx}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="材质"
              value={form.material}
              onChange={(e) => updateField('material', e.target.value)}
              fullWidth
              sx={fieldSx}
            />
            <TextField
              select
              label="分类"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value as ProductCategory)}
              fullWidth
              sx={fieldSx}
            >
              {categoryOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="价格（元）"
              type="number"
              value={form.price}
              onChange={(e) => updateField('price', Number(e.target.value))}
              fullWidth
              error={priceError}
              helperText={priceError ? '价格必须大于0' : ''}
              sx={fieldSx}
            />
            <TextField
              label="珠径"
              value={form.diameter}
              onChange={(e) => updateField('diameter', e.target.value)}
              fullWidth
              sx={fieldSx}
            />
          </Box>

          <TextField
            label="产地"
            value={form.origin}
            onChange={(e) => updateField('origin', e.target.value)}
            fullWidth
            sx={fieldSx}
          />

          <TextField
            label="产品描述"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            multiline
            rows={4}
            fullWidth
            sx={fieldSx}
          />

          {/* 渐变色选择 */}
          <div>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem', mb: 1 }}>
              占位图配色（无图片时使用）
            </Typography>
            <div className="flex flex-wrap gap-2">
              {gradientPresets.map((g) => (
                <button
                  key={g}
                  type="button"
                  className="w-10 h-10 rounded border-2 transition-all cursor-pointer"
                  style={{
                    background: g,
                    borderColor: form.gradient === g ? '#c9a96e' : 'rgba(201,169,110,0.15)',
                  }}
                  onClick={() => updateField('gradient', g)}
                />
              ))}
            </div>
          </div>

          {/* 预览 */}
          <Box
            sx={{
              height: 120,
              borderRadius: '4px',
              background: form.imageUrl ? 'transparent' : form.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(201,169,110,0.1)',
              overflow: 'hidden',
            }}
          >
            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt="预览"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography
                sx={{
                  fontFamily: 'var(--font-calligraphy)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '1.5rem',
                }}
              >
                {form.name || '产品名'}
              </Typography>
            )}
          </Box>

          {/* 保存按钮 */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.85)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              py: 1.2,
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            保存
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
