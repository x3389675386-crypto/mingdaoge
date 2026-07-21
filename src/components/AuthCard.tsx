/**
 * AuthCard —— 登录/注册/找回/验证页共用的卡片容器
 * 沿用现有深色 + 金主题。
 */

import { type ReactNode } from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface AuthCardProps {
  /** 卡片标题（书法字体） */
  title: string;
  /** 副标题提示 */
  subtitle?: string;
  /** 卡片主体内容 */
  children: ReactNode;
  /** 底部链接区（如 注册/忘记密码 入口） */
  footer?: ReactNode;
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 380,
          maxWidth: '100%',
          p: 4,
          borderRadius: '4px',
          backgroundColor: 'rgba(22,33,62,0.85)',
          border: '1px solid rgba(201,169,110,0.15)',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-calligraphy)',
            color: '#c9a96e',
            fontSize: '1.8rem',
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.45)',
              fontSize: '0.82rem',
              textAlign: 'center',
              mb: 3,
            }}
          >
            {subtitle}
          </Typography>
        )}
        {children}
        {footer && (
          <Box sx={{ mt: 3, textAlign: 'center', fontFamily: 'var(--font-serif)' }}>
            {footer}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
