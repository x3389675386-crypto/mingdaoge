import { type ReactNode } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminRouteProps {
  children: ReactNode;
}

/** 基于登录态的权限守卫（与 AuthContext.isAdmin 对齐） */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // 会话恢复中：先展示加载态，避免刷新 /admin 时因 session 异步恢复而闪现「去登录」
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          backgroundColor: '#16213e',
        }}
      >
        <CircularProgress sx={{ color: '#c9a96e' }} />
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: '#c9a96e',
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
          }}
        >
          加载中…
        </Typography>
      </Box>
    );
  }

  // 管理员：直接放行
  if (isAdmin) {
    return <>{children}</>;
  }

  // 已登录但非管理员：无权限提示
  if (isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 340,
            p: 4,
            borderRadius: '4px',
            border: '1px solid rgba(201,169,110,0.15)',
            backgroundColor: 'rgba(22,33,62,0.8)',
            textAlign: 'center',
          }}
        >
          <LockIcon sx={{ fontSize: '2rem', color: '#c9a96e', mb: 2 }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: '#f5f0eb',
              fontSize: '1.1rem',
              mb: 3,
            }}
          >
            无权限访问管理后台
          </Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate('/')}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.8)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            返回首页
          </Button>
        </Box>
      </Box>
    );
  }

  // 未登录：引导登录
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 340,
          p: 4,
          borderRadius: '4px',
          border: '1px solid rgba(201,169,110,0.15)',
          backgroundColor: 'rgba(22,33,62,0.8)',
          textAlign: 'center',
        }}
      >
        <LockIcon sx={{ fontSize: '2rem', color: '#c9a96e', mb: 2 }} />
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: '#f5f0eb',
            fontSize: '1.1rem',
            mb: 3,
          }}
        >
          请以管理员账号登录后访问
        </Typography>
        <Button
          fullWidth
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.8)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
        >
          去登录
        </Button>
      </Box>
    </Box>
  );
}
