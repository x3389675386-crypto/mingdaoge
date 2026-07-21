/**
 * 找回密码页：发送重置邮件
 */

import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { TextField, Button, Box, Alert } from '@mui/material';
import AuthCard from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';
import { authFieldSx, authButtonSx } from './authStyles';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError('');
    setInfo('');
    const e = email.trim();
    if (!e) {
      setError('请输入邮箱');
      return;
    }
    setLoading(true);
    const { error: err } = await resetPassword(e);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo('重置邮件已发送，请按邮件指引设置新密码。');
  };

  return (
    <AuthCard
      title="找回密码"
      subtitle="重置您的登录密码"
      footer={
        <Box sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem' }}>
          想起密码了？{' '}
          <RouterLink to="/login" style={{ color: '#c9a96e', textDecoration: 'none' }}>
            返回登录
          </RouterLink>
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: 'var(--font-serif)' }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2, fontFamily: 'var(--font-serif)' }}>
          {info}
        </Alert>
      )}
      <TextField
        fullWidth
        label="邮箱"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleReset();
        }}
        sx={authFieldSx}
        margin="normal"
      />
      <Button
        fullWidth
        variant="contained"
        onClick={handleReset}
        disabled={loading}
        sx={authButtonSx}
      >
        发送重置邮件
      </Button>
    </AuthCard>
  );
}
