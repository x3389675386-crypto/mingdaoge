/**
 * 注册页：邮箱 + 密码 + 昵称（复用违规词过滤）
 */

import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Alert } from '@mui/material';
import AuthCard from '../components/AuthCard';
import IdentitySelector, { type IdentityValue } from '../components/IdentitySelector';
import { useAuth } from '../context/AuthContext';
import { containsProfanity, getProfanityWarning } from '../utils/profanityFilter';
import { authFieldSx, authButtonSx } from './authStyles';
import type { IdentityType } from '../types';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [identity, setIdentity] = useState<IdentityValue>({ type: 'customer', subtype: 'customer' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setInfo('');
    const e = email.trim();
    if (!e) {
      setError('请输入邮箱');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    const n = nickname.trim();
    if (!n) {
      setError('请设置昵称');
      return;
    }
    if (n.length > 20) {
      setError('昵称不能超过 20 字');
      return;
    }
    const filter = containsProfanity(n);
    if (!filter.clean) {
      setError(getProfanityWarning(n) || '昵称包含过多违规词');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(e, password, filter.filteredText, {
      type: identity.type as IdentityType,
      subtype: identity.subtype,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo(
      '注册成功！若开启邮箱验证，请查收验证邮件并登录。登录后系统将为您生成专属 ID（MDG-开头），可在导航栏查看。'
    );
    setTimeout(() => navigate('/'), 2200);
  };

  return (
    <AuthCard
      title="注册明道阁"
      subtitle="结缘手串 · 以文会友"
      footer={
        <Box sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem' }}>
          已有账号？{' '}
          <RouterLink to="/login" style={{ color: '#c9a96e', textDecoration: 'none' }}>
            登录
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
          if (e.key === 'Enter') void handleRegister();
        }}
        sx={authFieldSx}
        margin="normal"
      />
      <TextField
        fullWidth
        label="昵称"
        placeholder="匿名道友"
        value={nickname}
        onChange={(e) => {
          setNickname(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleRegister();
        }}
        sx={authFieldSx}
        margin="normal"
      />
      <Box sx={authFieldSx} marginTop="8px !important">
        <IdentitySelector value={identity} onChange={setIdentity} />
      </Box>
      <Button
        fullWidth
        variant="contained"
        onClick={handleRegister}
        disabled={loading}
        sx={{ ...authButtonSx, mt: 1 }}
      >
        注册
      </Button>
    </AuthCard>
  );
}
