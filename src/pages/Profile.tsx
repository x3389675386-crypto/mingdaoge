/**
 * 个人中心页：登录态用户查看信息并修改昵称 / 密码 / 身份。
 * 沿用现有深色 + 金（#c9a96e）主题与 var(--font-serif) 衬线字体。
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
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
  Container,
  Divider,
  Snackbar,
} from '@mui/material';
import CheckinCard from '../components/CheckinCard';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { IDENTITY_GROUPS, getIdentityLabel } from '../lib/identities';
import { authFieldSx, authButtonSx } from './authStyles';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { buildInviteLink, copyToClipboard } from '../lib/invite';
import type { IdentityType } from '../types';

/** 反馈信息结构 */
interface Feedback {
  type: 'success' | 'error';
  message: string;
}

export default function Profile() {
  const { isAuthenticated, profile, user, signOut, updateNickname, updateIdentity, updatePassword, updateAvatar } = useAuth();
  const navigate = useNavigate();

  /** 退出登录 */
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  /** 更换头像：选择图片后上传到 Storage images/avatars/，写回 profiles.avatar_url */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 允许重新选择同一文件（重置 value 以触发后续 change）
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showFeedback('error', '请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showFeedback('error', '图片大小不能超过 2MB');
      return;
    }
    if (!isSupabaseConfigured) {
      showFeedback('error', '服务未配置，暂不支持上传头像');
      return;
    }
    setAvatarUploading(true);
    setFeedback(null);
    try {
      const filePath = `avatars/${user!.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      await updateAvatar(data.publicUrl);
      showFeedback('success', '头像已更新');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '头像上传失败，请重试';
      showFeedback('error', `头像上传失败：${msg}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  const [nickname, setNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [identityType, setIdentityType] = useState<IdentityType>('customer');
  const [identitySubtype, setIdentitySubtype] = useState<string | null>('customer');

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savingSection, setSavingSection] = useState<'nickname' | 'password' | 'identity' | null>(null);

  /** 邀请链接（由 user_code 动态拼接当前域名） */
  const inviteLink = profile?.user_code ? buildInviteLink(profile.user_code) : '';
  /** 复制邀请链接反馈 */
  const [copySnack, setCopySnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });

  /** 复制邀请链接到剪贴板 */
  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    const ok = await copyToClipboard(inviteLink);
    setCopySnack({
      open: true,
      msg: ok ? '邀请链接已复制，去分享给好友吧~' : '复制失败，请长按手动复制',
      severity: ok ? 'success' : 'error',
    });
  };

  /** 头像上传相关：隐藏 file input 的 ref 与上传中状态 */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
        <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              borderRadius: '4px',
              backgroundColor: 'rgba(22,33,62,0.85)',
              border: '1px solid rgba(201,169,110,0.15)',
            }}
          >
            <UserAvatar name="?" size={72} />
            <Typography
              sx={{
                fontFamily: 'var(--font-calligraphy)',
                color: '#c9a96e',
                fontSize: '1.6rem',
                mt: 2,
                mb: 1,
              }}
            >
              个人中心
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.6)',
                fontSize: '0.9rem',
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              登录后查看你的修行档案，管理昵称与身份，记录阳德与积分。
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ ...authButtonSx, width: 200 }}
            >
              去登录
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  /** 当前身份分组（取二级细分下拉项） */
  const activeGroup = IDENTITY_GROUPS.find((g) => g.type === identityType) ?? IDENTITY_GROUPS[0];
  const needsSubtype = identityType !== 'customer';
  const identityLabel = getIdentityLabel(profile.identity_type, profile.identity_subtype);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: '100%',
            p: { xs: 3, md: 6 },
            borderRadius: '4px',
            backgroundColor: 'rgba(22,33,62,0.85)',
            border: '1px solid rgba(201,169,110,0.15)',
          }}
        >
          {/* 个人中心头部：大头像 + 昵称 + 身份 / 阳德 / 积分概览 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 1 }}>
            {/* 头像 + 更换按钮 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <UserAvatar name={profile.nickname} avatarUrl={profile.avatar_url} size={80} />
              <Button
                component="label"
                variant="outlined"
                size="small"
                disabled={!isSupabaseConfigured || avatarUploading}
                sx={{
                  color: '#c9a96e',
                  borderColor: 'rgba(201,169,110,0.4)',
                  fontFamily: 'var(--font-serif)',
                  textTransform: 'none',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: '#c9a96e',
                    backgroundColor: 'rgba(201,169,110,0.08)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(201,169,110,0.3)',
                    borderColor: 'rgba(201,169,110,0.15)',
                  },
                }}
              >
                {avatarUploading ? '上传中…' : (isSupabaseConfigured ? '更换头像' : '服务未配置')}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </Button>
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  color: '#f5f0eb',
                  fontSize: { xs: '1.5rem', md: '1.8rem' },
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {profile.nickname}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  color: 'rgba(245,240,235,0.45)',
                  fontSize: '0.82rem',
                  mt: 0.5,
                }}
              >
                {user?.email ?? ''}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <InfoBadge label="阳德" value={String(profile.yang_de)} />
                  <InfoBadge label="积分" value={String(profile.points)} />
                </Box>
              </Box>
            </Box>
            <Button
              onClick={handleLogout}
              size="small"
              variant="outlined"
              sx={{
                color: '#c9a96e',
                borderColor: 'rgba(201,169,110,0.4)',
                fontFamily: 'var(--font-serif)',
                textTransform: 'none',
                '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
              }}
            >
              退出登录
            </Button>
          </Box>

          <Divider sx={{ borderColor: 'rgba(201,169,110,0.12)', my: 3 }} />

          {/* 每日签到卡片 */}
          <CheckinCard />

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

          {/* 道友编号（其余概览已置于头部） */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            <InfoBadge label="道友编号" value={profile.user_code ?? '—'} />
          </Box>

          {/* 我的邀请（暗金卡片：邀请码 + 邀请链接 + 复制） */}
          <Section title="我的邀请">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center' }}>
              <InfoBadge label="我的邀请码" value={profile.user_code ?? '—'} />
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', mb: 1 }}>
              邀请链接（分享给好友，TA 注册后你得积分奖励）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 200,
                  px: 2,
                  py: 1,
                  backgroundColor: 'rgba(201,169,110,0.06)',
                  border: '1px solid rgba(201,169,110,0.12)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  color: '#c9a96e',
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {inviteLink || '—'}
              </Box>
              <Button
                variant="outlined"
                onClick={handleCopyInvite}
                disabled={!inviteLink}
                sx={{
                  color: '#c9a96e',
                  borderColor: 'rgba(201,169,110,0.4)',
                  fontFamily: 'var(--font-serif)',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
                  '&.Mui-disabled': { color: 'rgba(201,169,110,0.3)', borderColor: 'rgba(201,169,110,0.15)' },
                }}
              >
                复制链接
              </Button>
            </Box>
          </Section>

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
      </Container>

      {/* 复制邀请链接反馈 */}
      <Snackbar
        open={copySnack.open}
        autoHideDuration={2500}
        onClose={() => setCopySnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={copySnack.severity}
          sx={{ fontFamily: 'var(--font-serif)' }}
          onClose={() => setCopySnack((prev) => ({ ...prev, open: false }))}
        >
          {copySnack.msg}
        </Alert>
      </Snackbar>
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
