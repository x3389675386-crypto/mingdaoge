/**
 * 登录页：邮箱密码登录 + 邮箱验证码/魔法链接登录切换
 */

import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Alert } from '@mui/material';
import AuthCard from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';
import { authFieldSx, authButtonSx } from './authStyles';

export default function Login() {
  const { signInPassword, signInOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async () => {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    const { error: err } = await signInPassword(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate('/');
  };

  const handleOtpLogin = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    setLoading(true);
    const { error: err } = await signInOtp(email.trim());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo('验证邮件已发送，请查收链接或验证码（回跳后自动登录）');
  };

  return (
    <AuthCard
      title="登录明道阁"
      subtitle="以文会友 · 暗通私语"
      footer={
        <Box sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem' }}>
          {mode === 'password' ? (
            <>
              还没有账号？{' '}
              <RouterLink to="/register" style={{ color: '#c9a96e', textDecoration: 'none' }}>
                注册
              </RouterLink>
            </>
          ) : (
            <>
              想起密码了？{' '}
              <RouterLink to="/login" style={{ color: '#c9a96e', textDecoration: 'none' }}>
                密码登录
              </RouterLink>
            </>
          )}
          {' · '}
          <RouterLink
            to="/forgot-password"
            style={{ color: 'rgba(245,240,235,0.5)', textDecoration: 'none' }}
          >
            忘记密码
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
        sx={authFieldSx}
        margin="normal"
      />

      {mode === 'password' && (
        <TextField
          fullWidth
          label="密码"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handlePasswordLogin();
          }}
          sx={authFieldSx}
          margin="normal"
        />
      )}

      <Button
        fullWidth
        variant="contained"
        onClick={mode === 'password' ? handlePasswordLogin : handleOtpLogin}
        disabled={loading}
        sx={authButtonSx}
      >
        {mode === 'password' ? '登录' : '发送验证码 / 魔法链接'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button
          size="small"
          onClick={() => {
            setMode(mode === 'password' ? 'otp' : 'password');
            setError('');
            setInfo('');
          }}
          sx={{
            color: 'rgba(201,169,110,0.7)',
            fontFamily: 'var(--font-serif)',
            textTransform: 'none',
          }}
        >
          {mode === 'password' ? '使用邮箱验证码 / 魔法链接登录' : '改用密码登录'}
        </Button>
      </Box>
    </AuthCard>
  );
}
