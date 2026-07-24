/**
 * 登录/注册等鉴权页共用的 MUI sx 样式片段
 * 沿用现有深色 + 金（#c9a96e）主题与 var(--font-serif) 衬线字体。
 */

import type { SxProps, Theme } from '@mui/material';

/** 输入框统一样式 */
export const authFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--font-serif)',
    color: '#f5f0eb',
    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#c9a96e' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--font-serif)',
    color: 'rgba(245,240,235,0.5)',
  },
  '& .MuiFormHelperText-root': { fontFamily: 'var(--font-serif)' },
};

/** 主按钮统一样式 */
export const authButtonSx: SxProps<Theme> = {
  backgroundColor: 'rgba(201,169,110,0.85)',
  color: '#1a1a2e',
  fontFamily: 'var(--font-serif)',
  fontWeight: 600,
  py: 1.25,
  mt: 1,
  '&:hover': { backgroundColor: '#c9a96e' },
  '&.Mui-disabled': {
    backgroundColor: 'rgba(201,169,110,0.2)',
    color: 'rgba(245,240,235,0.3)',
  },
};
