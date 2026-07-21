/**
 * 验证邮箱页：处理魔法链接回跳 + 验证码两态
 *
 * - 魔法链接（implicit/PKCE）：Supabase 回跳到 /verify-email 时携带 #access_token 或 ?code= ，
 *   supabase-js 自动交换会话并触发 SIGNED_IN；本页检测到已登录即提示成功。
 * - token_hash 回跳（如某些 OTP 流程）：调用 verifyOtp({ token_hash, type }) 兑换。
 * - 手动验证码：用户在邮件中取得 6 位验证码，输入邮箱 + 验证码后 verifyOtp({ email, token, type:'email' })。
 */

import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import AuthCard from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authFieldSx, authButtonSx } from './authStyles';

export default function VerifyEmail() {
  const { isAuthenticated, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [processing, setProcessing] = useState(false);

  // 处理魔法链接 / token_hash 回跳
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code'); // PKCE 授权码
    const tokenHash = params.get('token_hash'); // OTP token_hash
    const type = params.get('type'); // 例如 'magiclink' / 'recovery' / 'email'

    const finish = (ok: boolean, message: string) => {
      setProcessing(false);
      if (ok) {
        setInfo(message || '验证成功，正在进入…');
        setTimeout(() => navigate('/'), 1200);
      } else {
        setError(message);
      }
    };

    if (codeParam) {
      setProcessing(true);
      supabase.auth
        .exchangeCodeForSession(codeParam)
        .then(({ error }) => finish(!error, error ? error.message : '验证成功，正在进入…'))
        .catch((e) => finish(false, e instanceof Error ? e.message : '验证失败'));
    } else if (tokenHash && type) {
      setProcessing(true);
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: type as never })
        .then(({ error }) => finish(!error, error ? error.message : '验证成功，正在进入…'))
        .catch((e) => finish(false, e instanceof Error ? e.message : '验证失败'));
    }
  }, [navigate]);

  // 已登录（魔法链接自动回跳）则提示成功
  useEffect(() => {
    if (isAuthenticated && !processing) {
      setInfo('验证成功，正在进入…');
      const t = setTimeout(() => navigate('/'), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isAuthenticated, processing, navigate]);

  const handleVerifyCode = async () => {
    setError('');
    setInfo('');
    const e = email.trim();
    if (!e) {
      setError('请输入邮箱');
      return;
    }
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    setProcessing(true);
    const { error } = await verifyOtp(e, code.trim());
    setProcessing(false);
    if (error) {
      setError(error);
      return;
    }
    setInfo('验证成功，正在进入…');
    setTimeout(() => navigate('/'), 1200);
  };

  if (!isSupabaseConfigured) {
    return (
      <AuthCard title="验证邮箱">
        <Alert severity="info" sx={{ fontFamily: 'var(--font-serif)' }}>
          当前服务未连接云端，无法验证邮箱。
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="验证邮箱"
      subtitle="输入收到的验证码完成登录"
      footer={
        <Box sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem' }}>
          返回{' '}
          <RouterLink to="/login" style={{ color: '#c9a96e', textDecoration: 'none' }}>
            登录
          </RouterLink>
        </Box>
      }
    >
      {processing && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <CircularProgress size={24} sx={{ color: '#c9a96e' }} />
        </Box>
      )}
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
      <TextField
        fullWidth
        label="验证码"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleVerifyCode();
        }}
        sx={authFieldSx}
        margin="normal"
      />
      <Button
        fullWidth
        variant="contained"
        onClick={handleVerifyCode}
        disabled={processing}
        sx={authButtonSx}
      >
        验证并登录
      </Button>
    </AuthCard>
  );
}
