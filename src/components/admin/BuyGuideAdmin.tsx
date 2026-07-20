import { useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { BUY_GUIDE_OBJECT, getBuyGuideUrl, setLocalBuyGuideUrl } from '../../lib/buyGuide';

/** 图片大小限制 10MB */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * 后台「购买引导图」管理：上传到 Supabase Storage bucket `images`，固定对象名 `buy-guide`（覆盖即替换）。
 * 未配置 Supabase 时降级为本地预览（仅当前会话有效）。
 */
export default function BuyGuideAdmin() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [tip, setTip] = useState('');

  const currentUrl = getBuyGuideUrl();
  const previewUrl = currentUrl ? `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setError('图片过大，请选择 10MB 以内的图片');
      return;
    }

    setError('');
    setTip('');
    setUploading(true);

    try {
      if (isSupabaseConfigured) {
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(BUY_GUIDE_OBJECT, file, { upsert: true });

        if (uploadError) {
          console.error('[明道阁] 购买引导图上传失败:', uploadError);
          throw new Error('上传失败: ' + uploadError.message);
        }
        setTip('已上传并持久化到云端，前台刷新即可生效');
      } else {
        // 降级：本地预览，仅当前会话有效
        const localUrl = URL.createObjectURL(file);
        setLocalBuyGuideUrl(localUrl);
        setTip('配置 Supabase 后替换才会持久化（当前仅本会话预览）');
      }
    } catch (err) {
      console.error('购买引导图上传失败:', err);
      setError('上传失败：' + (err instanceof Error ? err.message : '请重试'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Box sx={{ color: '#f5f0eb' }}>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1rem', mb: 0.5 }}>
        购买引导图
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', mb: 2 }}>
        上传后将作为商品卡片「购买」按钮弹窗中的图片，固定对象名「buy-guide」，覆盖上传即替换。
      </Typography>

      <Box
        sx={{
          width: '100%',
          maxWidth: 320,
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid rgba(201,169,110,0.2)',
          backgroundColor: previewUrl ? '#f5f0eb' : 'rgba(201,169,110,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 160,
          mb: 2,
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="购买引导图" style={{ width: '100%', display: 'block' }} />
        ) : (
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.4)', fontSize: '0.85rem' }}>
            尚未设置购买引导图
          </Typography>
        )}
      </Box>

      <Button
        variant="outlined"
        startIcon={<PhotoCameraIcon />}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        sx={{
          borderColor: 'rgba(201,169,110,0.3)',
          color: '#c9a96e',
          fontFamily: 'var(--font-serif)',
          fontSize: '0.8rem',
          '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
        }}
      >
        {uploading ? '上传中...' : '上传 / 替换图片'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {tip && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.8)', fontSize: '0.78rem', mt: 1.5 }}>
          {tip}
        </Typography>
      )}
      {error && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c0392b', fontSize: '0.78rem', mt: 1.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
