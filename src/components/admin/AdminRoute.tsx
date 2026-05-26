import { useState, type ReactNode } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

/** 管理面板密码 */
const ADMIN_PASSWORD = 'mingdao2026';

interface AdminRouteProps {
  children: ReactNode;
}

/** 简易密码验证守卫 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('mingdao_admin_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('mingdao_admin_auth', 'true');
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (authenticated) {
    return <>{children}</>;
  }

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
          明道阁管理后台
        </Typography>
        <TextField
          fullWidth
          type="password"
          label="请输入管理密码"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={handleKeyDown}
          error={error}
          helperText={error ? '密码错误' : ''}
          sx={{
            mb: 2,
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
            '& .MuiFormHelperText-root': {
              fontFamily: 'var(--font-serif)',
            },
          }}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.8)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
        >
          进入管理
        </Button>
      </Box>
    </Box>
  );
}
