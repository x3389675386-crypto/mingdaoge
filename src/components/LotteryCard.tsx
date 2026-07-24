/**
 * 幸运转盘卡片（积分商城抽奖）。
 *
 * 视觉：暗金 + 衬线，与兑换中心一致。
 * 逻辑：
 *  - 展示当前积分、每日免费剩余（localStorage 按日期计数，跨天重置）。
 *  - 「免费抽一次」「花 N 积分抽一次」两个按钮调 drawLottery(paid)。
 *  - 抽奖中显示转动动画；成功 Toast 显示档位；失败按 available 区分
 *    「功能暂未开放」（070 未跑）与「积分不足，去赚积分」等友好提示。
 *  - 任何 Supabase 读取失败均回退默认值，绝不白屏。
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  getLotteryCost,
  getLotteryFreeDaily,
  getLotteryTiers,
  drawLottery,
  getTodayFreeUsed,
  bumpTodayFreeUsed,
  DEFAULT_LOTTERY_COST,
  DEFAULT_LOTTERY_FREE_DAILY,
  DEFAULT_LOTTERY_TIERS,
  type LotteryTier,
} from '../lib/lottery';
import { useExchange } from '../context/ExchangeContext';

/** 抽奖转盘扇区配色（暗金主题，循环取用） */
const SECTOR_COLORS = ['#c9a96e', '#9c27b0', '#4a90d9', '#5cb85c', '#c0392b', '#e0c99a', '#7cb342'];

export default function LotteryCard() {
  const navigate = useNavigate();
  const { points, refresh } = useExchange();

  const [cost, setCost] = useState(DEFAULT_LOTTERY_COST);
  const [freeDaily, setFreeDaily] = useState(DEFAULT_LOTTERY_FREE_DAILY);
  const [tiers, setTiers] = useState<LotteryTier[]>(DEFAULT_LOTTERY_TIERS);
  const [freeUsed, setFreeUsed] = useState(getTodayFreeUsed());
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  /** 加载抽奖配置（失败回退默认） */
  useEffect(() => {
    let active = true;
    Promise.all([getLotteryCost(), getLotteryFreeDaily(), getLotteryTiers()])
      .then(([c, f, t]) => {
        if (!active) return;
        setCost(c);
        setFreeDaily(f);
        setTiers(t);
      })
      .catch(() => {
        /* 静默降级：保留默认配置 */
      });
    return () => {
      active = false;
    };
  }, []);

  /** 免费剩余 = max(0, 每日免费 - 今日已用) */
  const freeRemaining = Math.max(0, freeDaily - freeUsed);

  /** 转盘扇区（按权重生成 conic-gradient 角度） */
  const sectors = useMemo(() => {
    const total = tiers.reduce((s, t) => s + (t.weight || 0), 0) || 1;
    let acc = 0;
    return tiers.map((t, i) => {
      const start = (acc / total) * 360;
      acc += t.weight || 0;
      const end = (acc / total) * 360;
      return { ...t, start, end, color: SECTOR_COLORS[i % SECTOR_COLORS.length] };
    });
  }, [tiers]);

  const wheelGradient = useMemo(
    () =>
      `conic-gradient(${sectors
        .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
        .join(', ')})`,
    [sectors]
  );

  /** 执行抽奖 */
  const handleDraw = async (paid: boolean) => {
    if (spinning) return;

    // 免费抽前置校验
    if (!paid && freeRemaining <= 0) {
      setSnack({ open: true, message: '今日免费次数已用完，明天再来~', severity: 'info' });
      return;
    }
    // 付费抽前置校验（提前提示，体验更友好；服务端亦有兜底）
    if (paid && points < cost) {
      setSnack({ open: true, message: '积分不足，去赚积分吧~', severity: 'warning' });
      return;
    }

    setSpinning(true);
    // 让转盘至少转一圈多一点，营造抽奖感
    setRotation((r) => r + 360 * (2 + Math.random() * 2));

    try {
      const res = await drawLottery(paid);
      if (res.ok) {
        // 免费抽成功：本地计数 +1
        if (!paid) {
          bumpTodayFreeUsed();
          setFreeUsed(getTodayFreeUsed());
        }
        // 刷新余额（RPC 已改 profiles.points，同步本地展示）
        void refresh();
        const prizeText =
          (res.prize ?? 0) > 0 ? `恭喜抽中「${res.tier}」+${res.prize} 积分！` : `本次「${res.tier}」，再接再厉~`;
        setSnack({ open: true, message: prizeText, severity: (res.prize ?? 0) > 0 ? 'success' : 'info' });
      } else {
        // 功能未部署
        if (!res.available) {
          setSnack({ open: true, message: '功能暂未开放', severity: 'info' });
          return;
        }
        const reason = res.reason || '抽奖失败';
        if (/积分不足/.test(reason)) {
          setSnack({ open: true, message: '积分不足，去赚积分吧~', severity: 'warning' });
        } else if (/请先登录/.test(reason)) {
          setSnack({ open: true, message: '请先登录后再抽奖', severity: 'warning' });
        } else {
          setSnack({ open: true, message: reason, severity: 'error' });
        }
      }
    } finally {
      // 动画结束后解锁（与 CSS transition 时长匹配）
      setTimeout(() => setSpinning(false), 1800);
    }
  };

  const goEarn = () => navigate('/tasks');

  return (
    <Card sx={cardSx}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CasinoIcon sx={{ color: '#c9a96e' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.05rem', fontWeight: 600 }}>
            幸运转盘
          </Typography>
        </Box>
        <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
          每日免费抽 · 消耗积分抽好礼，积分变动均由服务端结算
        </Typography>

        {/* 余额 + 免费剩余 */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={`当前积分 ${points}`} sx={balanceChipSx('#9c27b0')} />
          <Chip label={`今日免费剩 ${freeRemaining} 次`} sx={balanceChipSx('#c9a96e')} />
        </Box>

        {/* 转盘（CSS conic-gradient + 旋转动画） */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            ref={wheelRef}
            sx={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: wheelGradient,
              border: '4px solid rgba(201,169,110,0.6)',
              boxShadow: '0 0 24px rgba(201,169,110,0.25)',
              position: 'relative',
              transition: spinning ? 'transform 1.8s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
              transform: `rotate(${rotation}deg)`,
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(26,26,46,0.95)',
                border: '2px solid rgba(201,169,110,0.8)',
                boxShadow: '0 0 12px rgba(201,169,110,0.4)',
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                zIndex: 1,
                color: '#c9a96e',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '1.6rem' }} />
            </Box>
          </Box>
        </Box>

        {/* 档位说明 chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center', mb: 2 }}>
          {tiers.map((t, i) => (
            <Chip
              key={i}
              label={`${t.tier}${t.prize > 0 ? `（${t.weight}%）` : ''}`}
              size="small"
              sx={{
                backgroundColor: `${SECTOR_COLORS[i % SECTOR_COLORS.length]}22`,
                color: SECTOR_COLORS[i % SECTOR_COLORS.length],
                fontFamily: 'var(--font-serif)',
                fontSize: '0.72rem',
              }}
            />
          ))}
        </Box>

        {/* 按钮 */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            disabled={spinning || freeRemaining <= 0}
            onClick={() => handleDraw(false)}
            sx={btnSx('#c9a96e')}
          >
            {spinning ? <CircularProgress size={18} sx={{ color: '#c9a96e' }} /> : freeRemaining > 0 ? '免费抽一次' : '今日免费已用完'}
          </Button>
          <Button
            variant="contained"
            disabled={spinning}
            onClick={() => handleDraw(true)}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.9)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            {spinning ? <CircularProgress size={18} sx={{ color: '#1a1a2e' }} /> : `花 ${cost} 积分抽一次`}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 1.5 }}>
          <Typography
            component="button"
            onClick={goEarn}
            sx={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(201,169,110,0.7)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.8rem',
              textDecoration: 'underline',
              '&:hover': { color: '#c9a96e' },
            }}
          >
            积分不够？去做任务赚积分 →
          </Typography>
        </Box>
      </CardContent>

      <Snackbar
        open={!!snack?.open}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'info'} sx={{ fontFamily: 'var(--font-serif)' }} onClose={() => setSnack(null)}>
          {snack?.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}

const cardSx = {
  backgroundColor: 'rgba(22,33,62,0.5)',
  border: '1px solid rgba(201,169,110,0.2)',
  borderRadius: '4px',
  mb: 3,
} as const;

function balanceChipSx(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    fontFamily: 'var(--font-serif)',
    border: `1px solid ${color}55`,
  } as const;
}

function btnSx(color: string) {
  return {
    borderColor: `${color}66`,
    color,
    fontFamily: 'var(--font-serif)',
    textTransform: 'none',
    '&:hover': { borderColor: color, backgroundColor: `${color}11` },
    '&.Mui-disabled': { color: `${color}55`, borderColor: `${color}33` },
  } as const;
}
