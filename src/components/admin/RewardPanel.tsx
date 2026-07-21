/**
 * 后台：阳德 / 积分手动调整（P0-11）。
 *
 * 管理员按 user_code（MDG-XXXXX）或 guest_id 定位目标用户，
 * 选择阳德 / 积分与增减额度，记录原因后调用 admin_adjust_reward RPC。
 * 余额变动一律经 RPC（写 reward_ledger），前端绝不直接改 profiles。
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SearchIcon from '@mui/icons-material/Search';
import { lookupProfileByIdentifier, adminAdjustReward } from '../../lib/reward';
import { getIdentityLabel } from '../../lib/identities';
import { useAuth } from '../../context/AuthContext';
import type { CostKind, IdentityType } from '../../types';

/** 已解析的目标用户展示 */
interface ResolvedUser {
  id: string;
  nickname: string;
  user_code: string | null;
  yang_de: number;
  points: number;
  identity_type?: IdentityType;
  identity_subtype?: string | null;
}

export default function RewardPanel() {
  const { profile: myProfile } = useAuth();
  const [code, setCode] = useState('');
  const [resolved, setResolved] = useState<ResolvedUser | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);

  const [kind, setKind] = useState<CostKind>('yang_de');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [deltaError, setDeltaError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleLookup = async () => {
    setLookupError('');
    setResolved(null);
    const input = code.trim();
    if (!input) {
      setLookupError('请输入对方 user_code（MDG-XXXXX）或 guest_id');
      return;
    }
    setLooking(true);
    try {
      const user = await lookupProfileByIdentifier(input);
      if (!user) {
        setLookupError('未找到该 ID 对应的用户，请确认后重试');
        return;
      }
      setResolved(user);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setLooking(false);
    }
  };

  const handleAdjust = async () => {
    if (!resolved) return;
    setDeltaError('');
    const amt = Number(delta);
    if (!delta.trim() || Number.isNaN(amt) || amt === 0) {
      setDeltaError('请输入非 0 的增减额度（正数发放，负数扣减）');
      return;
    }
    setSubmitting(true);
    try {
      const balanceAfter = await adminAdjustReward(resolved.id, kind, amt, reason.trim() || '管理员调整');
      setSnackbar({
        open: true,
        message: `已${amt > 0 ? '发放' : '扣减'} ${Math.abs(amt)} ${kind === 'yang_de' ? '阳德' : '积分'} 给 ${resolved.nickname}（余额 ${balanceAfter}）`,
        severity: 'success',
      });
      // 同步本地展示
      setResolved((prev) =>
        prev
          ? {
              ...prev,
              yang_de: kind === 'yang_de' ? balanceAfter : prev.yang_de,
              points: kind === 'points' ? balanceAfter : prev.points,
            }
          : prev
      );
      setDelta('');
      setReason('');
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '调整失败', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AccountBalanceWalletIcon sx={{ color: '#c9a96e' }} />
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
          阳德 / 积分调整
        </Typography>
      </Box>
      <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
        按 user_code（MDG-XXXXX）或 guest_id 定位用户，手动发放或扣减阳德 / 积分（记录流水，操作可逆）。
      </Typography>

      {/* 定位用户 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          label="用户 ID（MDG-XXXXX 或 guest_id）"
          value={code}
          onChange={(e) => { setCode(e.target.value); setLookupError(''); }}
          error={!!lookupError}
          helperText={lookupError || ' '}
          sx={fieldSx}
        />
        <Button
          variant="outlined"
          startIcon={looking ? <CircularProgress size={16} sx={{ color: '#c9a96e' }} /> : <SearchIcon />}
          disabled={looking}
          onClick={handleLookup}
          sx={outlineBtnSx}
        >
          {looking ? '查询中' : '定位用户'}
        </Button>
      </Box>

      {resolved && (
        <Box sx={{ mt: 2, p: 2, border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.4)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.95rem', fontWeight: 600 }}>
              {resolved.nickname}
            </Typography>
            {resolved.user_code && (
              <Box component="span" sx={{ fontSize: '0.7rem', px: 1.5, py: 0.2, borderRadius: '999px', backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', border: '1px solid rgba(201,169,110,0.3)' }}>
                {resolved.user_code}
              </Box>
            )}
            {(resolved.identity_type) && (
              <Box component="span" sx={{ fontSize: '0.7rem', px: 1.5, py: 0.2, borderRadius: '999px', backgroundColor: 'rgba(201,169,110,0.1)', color: 'rgba(245,240,235,0.7)' }}>
                {getIdentityLabel(resolved.identity_type, resolved.identity_subtype)}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.8)', fontSize: '0.85rem' }}>
              当前阳德：<b style={{ color: '#c9a96e' }}>{resolved.yang_de}</b>
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.8)', fontSize: '0.85rem' }}>
              当前积分：<b style={{ color: '#c9a96e' }}>{resolved.points}</b>
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(201,169,110,0.1)', mb: 2 }} />

          {/* 调整表单 */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel sx={labelSx}>类型</InputLabel>
              <Select
                value={kind}
                label="类型"
                onChange={(e) => setKind(e.target.value as CostKind)}
                sx={selectSx}
              >
                <MenuItem value="yang_de">阳德</MenuItem>
                <MenuItem value="points">积分</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="增减额度（正发负扣）"
              type="number"
              value={delta}
              onChange={(e) => { setDelta(e.target.value); setDeltaError(''); }}
              error={!!deltaError}
              helperText={deltaError || ' '}
              sx={fieldSx}
            />
            <TextField
              label="原因（选填）"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={fieldSx}
            />
            <Button
              variant="contained"
              disabled={submitting}
              onClick={handleAdjust}
              sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', alignSelf: 'center', '&:hover': { backgroundColor: '#c9a96e' } }}
            >
              {submitting ? '处理中…' : '确认调整'}
            </Button>
          </Box>
        </Box>
      )}

      {!myProfile && (
        <Typography sx={{ color: 'rgba(245,240,235,0.35)', fontSize: '0.75rem', mt: 2 }}>
          提示：当前管理员身份未加载到 profile，调整操作可能被 RPC 的 is_admin 守卫拒绝。
        </Typography>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ fontFamily: 'var(--font-serif)' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
} as const;

const labelSx = { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' } as const;

const selectSx = {
  fontFamily: 'var(--font-serif)',
  color: '#f5f0eb',
  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
  '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
  '& .MuiSvgIcon-root': { color: '#c9a96e' },
} as const;

const outlineBtnSx = {
  borderColor: 'rgba(201,169,110,0.4)',
  color: '#c9a96e',
  fontFamily: 'var(--font-serif)',
  textTransform: 'none',
  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
} as const;
