/**
 * 每日签到卡片（P2 修行任务派发系统）。
 *
 * - 调用 daily_checkin()（RPC 内固定 +5 阳德，每用户每日一次，已签返回 0）。
 * - 刷新前后读取 checkin_logs 判定今日是否已签，已签则禁用按钮。
 * - 两种形态：compact（首页横条）/ 完整卡片（个人中心）。
 * - 未登录：compact 形态展示「去登录」CTA；完整形态不渲染（个人中心已要求登录）。
 *
 * 视觉沿用深色 + 金（#c9a96e）主题。
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Chip, Paper, Snackbar, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../context/AuthContext';
import { dailyCheckin, fetchCheckinToday } from '../lib/task';

/** 每日签到固定阳德 */
const DAILY_YANG = 5;

interface CheckinCardProps {
  /** 首页版为紧凑横条；个人中心版为完整卡片 */
  compact?: boolean;
}

export default function CheckinCard({ compact = false }: CheckinCardProps) {
  const { isAuthenticated, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checkedToday, setCheckedToday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null);

  /** 挂载时查询今日是否已签到 */
  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      void fetchCheckinToday(user.id).then((done) => {
        if (active) setCheckedToday(done);
      });
    } else {
      setCheckedToday(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const handleCheckin = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const gained = await dailyCheckin();
      if (gained > 0) {
        setCheckedToday(true);
        setSnack({ type: 'success', msg: `签到成功，获得阳德 +${gained}` });
        // 刷新导航栏余额
        await refreshProfile();
      } else {
        setCheckedToday(true);
        setSnack({ type: 'info', msg: '今日已签到' });
      }
    } catch (err) {
      setSnack({
        type: 'error',
        msg: err instanceof Error ? err.message : '签到失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  /** Snackbar（所有形态共用） */
  const snackbar = (
    <Snackbar
      open={!!snack}
      autoHideDuration={3000}
      onClose={() => setSnack(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={snack?.type ?? 'info'} sx={{ fontFamily: 'var(--font-serif)' }} onClose={() => setSnack(null)}>
        {snack?.msg}
      </Alert>
    </Snackbar>
  );

  /** 未登录：仅 compact 形态展示引流 CTA */
  if (!isAuthenticated) {
    if (!compact) return null;
    return (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2,
            borderRadius: '6px',
            backgroundColor: 'rgba(22,33,62,0.6)',
            border: '1px solid rgba(201,169,110,0.12)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoAwesomeIcon sx={{ color: '#c9a96e', fontSize: '1.1rem' }} />
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.7)', fontSize: '0.85rem' }}>
              登录后每日签到领 {DAILY_YANG} 阳德
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => navigate('/login')}
            sx={{ color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            去登录
          </Button>
        </Box>
        {snackbar}
      </>
    );
  }

  /** compact 首页横条 */
  if (compact) {
    return (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2,
            borderRadius: '6px',
            backgroundColor: 'rgba(22,33,62,0.6)',
            border: '1px solid rgba(201,169,110,0.12)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AutoAwesomeIcon sx={{ color: '#c9a96e', fontSize: '1.1rem' }} />
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.9rem', fontWeight: 600 }}>
                每日签到
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.72rem' }}>
                今日阳德 +{DAILY_YANG}
              </Typography>
            </Box>
          </Box>
          {checkedToday ? (
            <Chip
              icon={<CheckCircleOutlineIcon />}
              label="今日已签"
              size="small"
              sx={{ backgroundColor: 'rgba(201,169,110,0.12)', color: '#c9a96e', fontFamily: 'var(--font-serif)' }}
            />
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleCheckin}
              disabled={loading}
              sx={{
                backgroundColor: 'rgba(201,169,110,0.9)',
                color: '#1a1a2e',
                fontFamily: 'var(--font-serif)',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: '#c9a96e' },
                '&:disabled': { backgroundColor: 'rgba(201,169,110,0.3)', color: 'rgba(26,26,46,0.6)' },
              }}
            >
              {loading ? '签到中…' : '签到'}
            </Button>
          )}
        </Box>
        {snackbar}
      </>
    );
  }

  /** 完整卡片（个人中心） */
  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '4px',
          backgroundColor: 'rgba(26,26,46,0.4)',
          border: '1px solid rgba(201,169,110,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#c9a96e' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
            每日签到
          </Typography>
          <Chip
            label={`+${DAILY_YANG} 阳德/天`}
            size="small"
            sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-serif)', border: '1px solid rgba(201,169,110,0.3)' }}
          />
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.55)', fontSize: '0.85rem', mb: 2 }}>
          每日签到可得 {DAILY_YANG} 阳德，日积月累助你修行更进一层。
        </Typography>
        {checkedToday ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#c9a96e' }}>
            <CheckCircleOutlineIcon fontSize="small" />
            <Typography sx={{ fontFamily: 'var(--font-serif)' }}>今日已签到，明日再来～</Typography>
          </Box>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={handleCheckin}
            disabled={loading}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.9)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.15em',
              py: 1,
              borderRadius: '2px',
              '&:hover': { backgroundColor: '#c9a96e' },
              '&:disabled': { backgroundColor: 'rgba(201,169,110,0.3)', color: 'rgba(26,26,46,0.6)' },
            }}
          >
            {loading ? '签到中…' : '立即签到'}
          </Button>
        )}
      </Paper>
      {snackbar}
    </>
  );
}
