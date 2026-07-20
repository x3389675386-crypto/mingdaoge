import { useState } from 'react';
import { Dialog, DialogContent, IconButton, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getBuyGuideUrl } from '../lib/buyGuide';

interface BuyGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

/** 品牌联系方式（文案提示） */
const CONTACT_INFO = '18064344001';

/**
 * 购买引导弹窗：展示后台上传的购买引导图（如收款码 / 购买引导图）。
 * 图片为 null 或加载失败时显示联系客服提示。
 */
export default function BuyGuideDialog({ open, onClose }: BuyGuideDialogProps) {
  const url = getBuyGuideUrl();
  const [imgError, setImgError] = useState(false);

  // 每次打开时重置加载失败状态，并追加时间戳避免浏览器缓存导致替换后不刷新
  const src = url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#16213e',
          border: '1px solid rgba(201,169,110,0.2)',
          borderRadius: '4px',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2.5,
          pt: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-calligraphy)',
            fontSize: '1.3rem',
            color: '#c9a96e',
          }}
        >
          购买指引
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'rgba(201,169,110,0.6)' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 1, textAlign: 'center' }}>
        {src && !imgError ? (
          <Box
            sx={{
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(201,169,110,0.15)',
              backgroundColor: '#f5f0eb',
            }}
          >
            <img
              src={src}
              alt="购买引导图"
              onError={() => setImgError(true)}
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box sx={{ py: 4, px: 1 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.75)',
                fontSize: '0.95rem',
                lineHeight: 1.8,
              }}
            >
              购买引导图尚未设置，请联系客服
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: '#c9a96e',
                fontSize: '1.1rem',
                fontWeight: 700,
                mt: 1,
                letterSpacing: '0.05em',
              }}
            >
              微信 / 电话：{CONTACT_INFO}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
