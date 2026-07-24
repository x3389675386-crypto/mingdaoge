/**
 * 求签小游戏 / 灵签（纯前端，无 DB）。
 *
 * 规则：
 *  - 暗金签筒（CSS 绘制）+ 「摇签」按钮，点击随机抽一条（抖动动画）。
 *  - 每日限抽 1 次：localStorage 记录 { date:'YYYY-MM-DD', lotId }，
 *    当天已抽则直接展示上次结果并提示「今日已求签，明日再来」，跨天自动重置。
 *  - 「复制签文」按钮（navigator.clipboard）+ 提示可去论坛分享。
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Chip, Snackbar, Alert } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ForumIcon from '@mui/icons-material/Forum';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { ORACLE_LOTS, drawRandomLot, type OracleLot } from '../data/oracleLots';

/** 本地存储键 */
const STORAGE_KEY = 'mdg_oracle';

/** 签等级配色 */
const LEVEL_COLOR: Record<OracleLot['level'], string> = {
  上上签: '#e0c99a',
  上签: '#c9a96e',
  中签: '#5cb85c',
  下签: '#c0392b',
};

/** 读取今日已抽签记录 */
function loadTodayLot(): OracleLot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as { date: string; lotId: number };
    const today = new Date().toISOString().slice(0, 10);
    if (rec.date !== today) return null; // 跨天，视为未抽
    return ORACLE_LOTS.find((l) => l.id === rec.lotId) ?? null;
  } catch {
    return null;
  }
}

/** 保存今日抽签结果 */
function saveTodayLot(lot: OracleLot) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, lotId: lot.id }));
}

export default function Oracle() {
  const navigate = useNavigate();
  const [lot, setLot] = useState<OracleLot | null>(() => loadTodayLot());
  const [shaking, setShaking] = useState(false);
  const [snack, setSnack] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null);
  const shakeTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    };
  }, []);

  /** 摇签 */
  const handleDraw = () => {
    if (lot) return; // 今日已抽
    setShaking(true);
    // 抖动结束后揭晓
    shakeTimer.current = window.setTimeout(() => {
      const drawn = drawRandomLot();
      setLot(drawn);
      saveTodayLot(drawn);
      setShaking(false);
    }, 800);
  };

  /** 复制签文 */
  const handleCopy = async () => {
    if (!lot) return;
    const text = `【明道阁 · 灵签】\n${lot.level}\n${lot.poem}\n解曰：${lot.interpretation}\n宜：${lot.yi}\n忌：${lot.ji}`;
    try {
      await navigator.clipboard.writeText(text);
      setSnack({ type: 'success', msg: '签文已复制，可去论坛分享' });
    } catch {
      setSnack({ type: 'error', msg: '复制失败，请手动选择文本' });
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      {/* 标题 */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '2rem', md: '2.6rem' }, color: '#c9a96e' }}>
          求签问卜
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
          心诚则灵 · 每日一签
        </Typography>
      </Box>

      {/* 签筒（CSS 绘制） */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Box
          className={shaking ? 'animate-oracle-shake' : ''}
          sx={{
            width: 96,
            height: 150,
            borderRadius: '12px 12px 6px 6px',
            background: 'linear-gradient(180deg, #c9a96e 0%, #a07d3a 100%)',
            border: '2px solid rgba(224,201,154,0.6)',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 -10px 20px rgba(160,125,58,0.6)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 10, left: 12, right: 12, height: 16, borderRadius: 4,
              background: 'rgba(26,26,46,0.25)',
            },
          }}
        >
          {/* 签筒口露出的签枝 */}
          <Box sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ width: 4, height: 22, background: '#e0c99a', borderRadius: '2px', transform: `rotate(${i - 1}deg)` }} />
            ))}
          </Box>
        </Box>

        {!lot && (
          <Button
            variant="contained"
            onClick={handleDraw}
            disabled={shaking}
            startIcon={<AutoAwesomeIcon />}
            sx={{
              mt: 3,
              backgroundColor: 'rgba(201,169,110,0.9)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.15em',
              px: 4, py: 1.1, borderRadius: '2px',
              '&:hover': { backgroundColor: '#c9a96e' },
              '&:disabled': { backgroundColor: 'rgba(201,169,110,0.3)', color: 'rgba(26,26,46,0.6)' },
            }}
          >
            {shaking ? '摇签中…' : '摇签'}
          </Button>
        )}
        {lot && (
          <Chip
            label="今日已求签，明日再来"
            sx={{ mt: 3, backgroundColor: 'rgba(201,169,110,0.12)', color: '#c9a96e', fontFamily: 'var(--font-serif)' }}
          />
        )}
      </Box>

      {/* 结果卡 */}
      {lot && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '4px',
            backgroundColor: 'rgba(22,33,62,0.5)',
            border: `1px solid ${LEVEL_COLOR[lot.level]}55`,
            boxShadow: `0 0 24px ${LEVEL_COLOR[lot.level]}22`,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Chip
              label={lot.level}
              sx={{ backgroundColor: `${LEVEL_COLOR[lot.level]}22`, color: LEVEL_COLOR[lot.level], fontFamily: 'var(--font-serif)', fontSize: '0.95rem', border: `1px solid ${LEVEL_COLOR[lot.level]}66`, px: 1, py: 2.5 }}
            />
          </Box>

          {/* 签诗 */}
          <Typography
            sx={{
              fontFamily: 'var(--font-calligraphy)',
              color: '#f5f0eb',
              fontSize: '1.25rem',
              lineHeight: 1.9,
              textAlign: 'center',
              whiteSpace: 'pre-line',
              mb: 2,
            }}
          >
            {lot.poem}
          </Typography>

          <Box sx={{ borderTop: '1px dashed rgba(201,169,110,0.25)', borderBottom: '1px dashed rgba(201,169,110,0.25)', py: 2, mb: 2 }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.7)', fontSize: '0.8rem', mb: 0.5 }}>
              解曰
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.85)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              {lot.interpretation}
            </Typography>
          </Box>

          {/* 宜 / 忌 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 140 }}>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#5cb85c', fontSize: '0.8rem', mb: 0.5 }}>宜</Typography>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.75)', fontSize: '0.88rem' }}>{lot.yi}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 140 }}>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c0392b', fontSize: '0.8rem', mb: 0.5 }}>忌</Typography>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.75)', fontSize: '0.88rem' }}>{lot.ji}</Typography>
            </Box>
          </Box>

          {/* 操作 */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleCopy}
              startIcon={<ContentCopyIcon />}
              sx={{ borderColor: 'rgba(201,169,110,0.5)', color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none' }}
            >
              复制签文
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/forum')}
              startIcon={<ForumIcon />}
              sx={{ backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', textTransform: 'none', '&:hover': { backgroundColor: '#c9a96e' } }}
            >
              去论坛分享今日灵签
            </Button>
          </Box>
        </Paper>
      )}

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
    </Box>
  );
}
