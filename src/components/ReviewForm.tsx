import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useReviews } from '../context/ReviewContext';
import { useProducts } from '../context/ProductContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** 图片大小限制 10MB */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

interface ReviewFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ReviewForm({ open, onClose }: ReviewFormProps) {
  const { addReview } = useReviews();
  const { activeProducts } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [nicknameError, setNicknameError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [imageError, setImageError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  /** 重置表单 */
  const resetForm = () => {
    setNickname('');
    setContent('');
    setImageUrl(undefined);
    setProductId(undefined);
    setNicknameError(false);
    setContentError(false);
    setImageError('');
  };

  /** 处理图片上传 */
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('图片过大，请选择10MB以内的图片');
      return;
    }

    setImageError('');
    setUploading(true);

    try {
      // 本地预览
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);

      // 上传到 Supabase Storage
      if (!isSupabaseConfigured) {
        throw new Error('Supabase 未配置，无法上传图片');
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('[明道阁] 晒图上传失败:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (err) {
      console.error('图片上传失败:', err);
      setImageError('图片上传失败：' + (err instanceof Error ? err.message : '请重试'));
      setImageUrl(undefined);
    } finally {
      setUploading(false);
    }

    // 重置 file input 以便重复选择同一文件
    e.target.value = '';
  };

  /** 删除图片 */
  const handleRemoveImage = () => {
    setImageUrl(undefined);
    setImageError('');
  };

  /** 提交晒图 */
  const handleSubmit = () => {
    let valid = true;
    if (!nickname.trim()) {
      setNicknameError(true);
      valid = false;
    }
    if (!content.trim()) {
      setContentError(true);
      valid = false;
    }
    if (!valid) return;

    addReview({
      nickname: nickname.trim(),
      content: content.trim(),
      imageUrl,
      productId,
    });

    resetForm();
    setSnackbarOpen(true);
    onClose();
  };

  /** 处理关闭 */
  const handleClose = () => {
    resetForm();
    onClose();
  };

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
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
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
          分享你的手串
          <IconButton onClick={handleClose} sx={{ color: 'rgba(201,169,110,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="昵称"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); if (e.target.value.trim()) setNicknameError(false); }}
              fullWidth
              required
              error={nicknameError}
              helperText={nicknameError ? '请输入昵称' : ''}
              placeholder="手串达人"
              sx={fieldSx}
            />

            <TextField
              label="评论内容"
              value={content}
              onChange={(e) => { setContent(e.target.value); if (e.target.value.trim()) setContentError(false); }}
              multiline
              rows={3}
              fullWidth
              required
              error={contentError}
              helperText={contentError ? '请输入评论内容' : ''}
              placeholder="手串质感超好！"
              sx={fieldSx}
            />

            {/* 晒图上传 */}
            <div>
              <Typography
                sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem', mb: 1 }}
              >
                晒图（选填）
              </Typography>

              {imageUrl ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={imageUrl}
                    alt="晒图预览"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid rgba(201,169,110,0.2)',
                    }}
                  />
                  <Button
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 'auto',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#f5f0eb',
                      fontSize: '0.7rem',
                      px: 1,
                      py: 0.3,
                      '&:hover': { backgroundColor: 'rgba(192,57,43,0.8)' },
                    }}
                  >
                    删除
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleImageSelect}
                  disabled={uploading}
                  sx={{
                    borderColor: 'rgba(201,169,110,0.3)',
                    color: '#c9a96e',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.8rem',
                    '&:hover': {
                      borderColor: '#c9a96e',
                      backgroundColor: 'rgba(201,169,110,0.08)',
                    },
                  }}
                >
                  上传晒图
                </Button>
              )}

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

            {/* 关联产品选择 */}
            <TextField
              select
              label="关联产品（选填）"
              value={productId ?? ''}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : undefined)}
              fullWidth
              sx={fieldSx}
            >
              <MenuItem value="">
                <em style={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.4)' }}>不关联</em>
              </MenuItem>
              {activeProducts.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
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
            提交分享
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            fontFamily: 'var(--font-serif)',
            backgroundColor: 'rgba(201,169,110,0.9)',
            color: '#1a1a2e',
            fontWeight: 600,
          }}
        >
          分享成功，感谢您！
        </Alert>
      </Snackbar>
    </>
  );
}
