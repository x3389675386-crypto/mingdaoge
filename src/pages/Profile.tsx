/**
 * 个人中心页：登录态用户查看信息并修改昵称 / 密码 / 身份。
 * 沿用现有深色 + 金（#c9a96e）主题与 var(--font-serif) 衬线字体。
 */

import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { IDENTITY_GROUPS, getIdentityLabel } from '../lib/identities';
import { authFieldSx, authButtonSx } from './authStyles';
import type { IdentityType } from '../types';

/** 反馈信息结构 */
interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export default function Profile() {
  const { isAuthenticated, profile, user, updateNickname, updateIdentity, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [identityType, setIdentityType] = useState<IdentityType>('customer');
  const [identitySubtype, setIdentitySubtype] = useState<string | null>('customer');

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savingSection, setSavingSection] = useState<'nickname' | 'password' | 'identity' | null>(null);

  /** 登录态：用 profile 初始化各表单默认值 */
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setIdentityType(profile.identity_type);
      setIdentitySubtype(profile.identity_type === 'customer' ? 'customer' : (profile.identity_subtype ?? 'customer'));
    }
  }, [profile]);

  /** 反馈辅助 */
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  };

  /** 修改昵称 */
  const handleSaveNickname = async () => {
    const name = nickname.trim();
    if (!name) {
      showFeedback('error', '昵称不能为空');
      return;
    }
    setSavingSection('nickname');
    setFeedback(null);
    try {
      await updateNickname(name);
      showFeedback('success', '昵称已更新');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '昵称更新失败，请重试';
      showFeedback('error', msg);
    } finally {
      setSavingSection(null);
    }
  };

  /** 修改密码 */
  const handleSavePassword = async () => {
    if (!newPassword) {
      showFeedback('error', '请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      showFeedback('error', '密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback('error', '两次输入的密码不一致');
      return;
    }
    setSavingSection('password');
    setFeedback(null);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        showFeedback('error', error);
      } else {
        showFeedback('success', '密码已修改，请使用新密码登录');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '密码修改失败，请重试';
      showFeedback('error', msg);
    } finally {
      setSavingSection(null);
    }
  };

  /** 大类切换：重置二级细分（顾客无细分，其它取第一项） */
  const handleIdentityTypeChange = (type: IdentityType) => {
    setIdentityType(type);
    const group = IDENTITY_GROUPS.find((g) => g.type === type);
    if (!group) return;
    setIdentitySubtype(type === 'customer' ? 'customer' : group.subtypes[0].key);
  };

  /** 修改身份 */
  const handleSaveIdentity = async () => {
    setSavingSection('identity');
    setFeedback(null);
    try {
      const subtype = identityType === 'customer' ? 'customer' : identitySubtype;
      await updateIdentity(identityType, subtype);
      showFeedback('success', '身份已更新');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '身份更新失败，请重试';
      showFeedback('error', msg);
    } finally {
      setSavingSection(null);
    }
  };

  /** 未登录：引导去登录 */
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
        <Navbar />
        <Box
          sx={{
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.3rem' }}>
            请先登录
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{ ...authButtonSx, width: 200 }}
          >
            去登录
          </Button>
        </Box>
      </Box>
    );
  }

  /** 当前身份分组（取二级细分下拉项） */
  const activeGroup = IDENTITY_GROUPS.find((g) => g.type === identityType) ?? IDENTITY_GROUPS[0];
  const needsSubtype = identityType !== 'customer';
  const identityLabel = getIdentityLabel(profile.identity_type, profile.identity_subtype);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
      <Navbar />
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 6 }}>
        <Paper
          elevation={0}
          sx={{
            width: 520,
            maxWidth: '100%',
            p: { xs: 3, md: 5 },
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
            个人中心
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.45)',
              fontSize: '0.82rem',
              textAlign: 'center',
              mb: 3,
            }}
          >
            {user?.email ?? ''}
          </Typography>

          {/* 反馈信息 */}
          {feedback && (
            <Alert
              severity={feedback.type}
              sx={{ mb: 3, fontFamily: 'var(--font-serif)' }}
              onClose={() => setFeedback(null)}
            >
              {feedback.message}
            </Alert>
          )}

          {/* 基本信息展示 */}
          <Box
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: '4px',
              backgroundColor: 'rgba(26,26,46,0.4)',
              border: '1px solid rgba(201,169,110,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.2rem', fontWeight: 600 }}>
                {profile.nickname}
              </Typography>
              {identityLabel && (
                <Chip
                  label={identityLabel}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(201,169,110,0.15)',
                    color: '#c9a96e',
                    fontFamily: 'var(--font-serif)',
                    border: '1px solid rgba(201,169,110,0.3)',
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <InfoBadge label="道友编号" value={profile.user_code ?? '—'} />
              <InfoBadge label="阳德" value={String(profile.yang_de)} />
              <InfoBadge label="积分" value={String(profile.points)} />
            </Box>
          </Box>

          {/* 修改昵称 */}
          <Section title="修改昵称">
            <TextField
              fullWidth
              label="昵称"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setFeedback(null);
              }}
              sx={authFieldSx}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveNickname}
              disabled={savingSection === 'nickname'}
              sx={authButtonSx}
            >
              {savingSection === 'nickname' ? '保存中…' : '保存昵称'}
            </Button>
          </Section>

          {/* 修改密码 */}
          <Section title="修改密码">
            <TextField
              fullWidth
              label="新密码"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFeedback(null);
              }}
              sx={authFieldSx}
              margin="normal"
            />
            <TextField
              fullWidth
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFeedback(null);
              }}
              sx={authFieldSx}
              margin="normal"
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleSavePassword}
              disabled={savingSection === 'password'}
              sx={authButtonSx}
            >
              {savingSection === 'password' ? '保存中…' : '保存密码'}
            </Button>
          </Section>

          {/* 修改身份 */}
          <Section title="修改身份">
            <FormControl fullWidth sx={{ ...authFieldSx, mt: 2 }}>
              <InputLabel sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' }}>
                身份大类
              </InputLabel>
              <Select
                value={identityType}
                label="身份大类"
                onChange={(e) => handleIdentityTypeChange(e.target.value as IdentityType)}
                sx={{
                  fontFamily: 'var(--font-serif)',
                  color: '#f5f0eb',
                  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                  '& .MuiSvgIcon-root': { color: 'rgba(201,169,110,0.6)' },
                }}
              >
                {IDENTITY_GROUPS.map((g) => (
                  <MenuItem key={g.type} value={g.type} sx={{ fontFamily: 'var(--font-serif)' }}>
                    {g.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {needsSubtype && (
              <FormControl fullWidth sx={{ ...authFieldSx, mt: 2 }}>
                <InputLabel sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' }}>
                  细分
                </InputLabel>
                <Select
                  value={identitySubtype ?? ''}
                  label="细分"
                  onChange={(e) => setIdentitySubtype(e.target.value)}
                  sx={{
                    fontFamily: 'var(--font-serif)',
                    color: '#f5f0eb',
                    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                    '& .MuiSvgIcon-root': { color: 'rgba(201,169,110,0.6)' },
                  }}
                >
                  {activeGroup.subtypes.map((s) => (
                    <MenuItem key={s.key} value={s.key} sx={{ fontFamily: 'var(--font-serif)' }}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              fullWidth
              variant="contained"
              onClick={handleSaveIdentity}
              disabled={savingSection === 'identity'}
              sx={{ ...authButtonSx, mt: 2 }}
            >
              {savingSection === 'identity' ? '保存中…' : '保存身份'}
            </Button>
          </Section>
        </Paper>
      </Box>
    </Box>
  );
}

/** 信息小标签 */
function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(201,169,110,0.06)',
        border: '1px solid rgba(201,169,110,0.12)',
        borderRadius: '4px',
        px: 2,
        py: 1,
      }}
    >
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.7rem' }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.95rem', fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

/** 分区容器 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        mb: 3,
        pb: 3,
        borderBottom: '1px solid rgba(201,169,110,0.1)',
        '&:last-of-type': { borderBottom: 'none', mb: 0, pb: 0 },
      }}
    >
      <Typography
        sx={{
          fontFamily: 'var(--font-serif)',
          color: '#c9a96e',
          fontSize: '1rem',
          fontWeight: 600,
          mb: 1.5,
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}
