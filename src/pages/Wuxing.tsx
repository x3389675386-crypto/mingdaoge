/**
 * 五行体检 + 手串材质智能推荐页（纯前端，无 DB）。
 *
 * 流程：选择出生日期（原生 date，避免引入重型日期库）+ 性别 + 出生时辰（可选）
 *  → 点击「测算」→ 展示四柱干支、五行进度条、日主强弱、喜用神、推荐材质 chips。
 *
 * 视觉：沿用暗金 + 衬线主题（#c9a96e / #1a1a2e / var(--font-serif)）。
 * 免责声明：本测算仅供娱乐参考，不构成任何专业建议。
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  MenuItem,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  analyzeBazi,
  WUXING_MATERIALS,
  WUXING_COLOR,
  WUXING_LIST,
  SHICHEN,
  type BaziResult,
  type Wuxing,
} from '../lib/bazi';

/** 性别选项 */
const GENDERS = ['男', '女', '不便透露'];

/** 五行强度文案 */
const STRENGTH_COLOR: Record<BaziResult['strength'], string> = {
  强: '#c0392b',
  弱: '#4a90d9',
  中和: '#c9a96e',
};

/** 单柱标签 */
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'];

export default function Wuxing() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [birthDate, setBirthDate] = useState(today);
  const [gender, setGender] = useState('男');
  const [shichen, setShichen] = useState<number | 'unknown'>('unknown');
  const [result, setResult] = useState<BaziResult | null>(null);
  const [snack, setSnack] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null);

  /** 执行测算 */
  const handleAnalyze = () => {
    if (!birthDate) {
      setSnack({ type: 'error', msg: '请先选择出生日期' });
      return;
    }
    const [y, m, d] = birthDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(date.getTime())) {
      setSnack({ type: 'error', msg: '日期格式有误' });
      return;
    }
    // 时辰已知则写入对应小时（用于时柱推算）
    const withHour = shichen !== 'unknown';
    if (withHour) date.setUTCHours((shichen as number) * 2);
    setResult(analyzeBazi(date, withHour));
  };

  /** 组装可复制的测算结果文本 */
  const buildResultText = (r: BaziResult): string => {
    const pillars = [r.year, r.month, r.day, ...(r.hour ? [r.hour] : [])]
      .map((p, i) => `${PILLAR_LABELS[i]}：${p.ganzhi}`)
      .join('  ');
    const counts = WUXING_LIST.map((w) => `${w}${r.counts[w]}`).join(' ');
    const materials = r.xiyong.flatMap((w) => WUXING_MATERIALS[w]).join('、');
    return [
      '【明道阁 · 五行体检】',
      pillars,
      `五行计数：${counts}`,
      `日主：${r.dayMasterChar}${r.dayMaster}（身${r.strength}）`,
      r.xiyongText,
      `推荐材质：${materials}`,
      '—— 本测算仅供娱乐参考，不构成任何专业建议',
    ].join('\n');
  };

  /** 复制结果 */
  const handleCopy = async () => {
    if (!result) return;
    const text = buildResultText(result);
    try {
      await navigator.clipboard.writeText(text);
      setSnack({ type: 'success', msg: '测算结果已复制' });
    } catch {
      setSnack({ type: 'error', msg: '复制失败，请手动选择文本' });
    }
  };

  /** 推荐材质列表（去重） */
  const recommendedMaterials = result
    ? Array.from(new Set(result.xiyong.flatMap((w) => WUXING_MATERIALS[w])))
    : [];

  /** 五行计数最大值（用于进度条比例） */
  const maxCount = result ? Math.max(1, ...WUXING_LIST.map((w) => result.counts[w])) : 1;

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      {/* 标题 */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography
          sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '2rem', md: '2.6rem' }, color: '#c9a96e' }}
        >
          五行体检
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
          探本命五行 · 配手串材质
        </Typography>
      </Box>

      {/* 免责声明 */}
      <Paper
        elevation={0}
        sx={{ p: 1.5, mb: 3, borderRadius: '4px', backgroundColor: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)' }}
      >
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(224,201,154,0.85)', fontSize: '0.78rem', textAlign: 'center' }}>
          ⚠ 本测算仅供娱乐参考，不构成任何专业命理 / 医疗 / 投资建议
        </Typography>
      </Paper>

      {/* 输入区 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '4px', backgroundColor: 'rgba(26,26,46,0.4)', border: '1px solid rgba(201,169,110,0.1)' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="出生日期"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField select label="性别" value={gender} onChange={(e) => setGender(e.target.value)} sx={fieldSx}>
            {GENDERS.map((g) => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="出生时辰（可选）"
            value={shichen === 'unknown' ? 'unknown' : String(shichen)}
            onChange={(e) => setShichen(e.target.value === 'unknown' ? 'unknown' : Number(e.target.value))}
            sx={fieldSx}
          >
            <MenuItem value="unknown">不详 / 仅测前三柱</MenuItem>
            {SHICHEN.map((s) => (
              <MenuItem key={s.zhiIndex} value={String(s.zhiIndex)}>{s.name}（{s.range}）</MenuItem>
            ))}
          </TextField>
        </Box>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          startIcon={<AutoAwesomeIcon />}
          sx={{
            mt: 3,
            width: '100%',
            backgroundColor: 'rgba(201,169,110,0.9)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.15em',
            py: 1.1,
            borderRadius: '2px',
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
        >
          测算我的五行
        </Button>
      </Paper>

      {/* 结果区 */}
      {result && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,169,110,0.18)' }}>
          {/* 四柱 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 3 }}>
            {[result.year, result.month, result.day, ...(result.hour ? [result.hour] : [])].map((p, i) => (
              <Box key={i} sx={{ textAlign: 'center', minWidth: 72 }}>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', fontSize: '0.75rem', mb: 0.5 }}>
                  {PILLAR_LABELS[i]}
                </Typography>
                <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#f5f0eb', fontSize: '1.6rem', lineHeight: 1 }}>
                  {p.ganzhi}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderColor: 'rgba(201,169,110,0.12)', mb: 2.5 }} />

          {/* 五行进度条 */}
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.95rem', fontWeight: 600, mb: 1.5 }}>
            五行计数
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: 3 }}>
            {WUXING_LIST.map((w) => (
              <Box key={w} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.9rem', width: 20 }}>{w}</Typography>
                <Box sx={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: 'rgba(245,240,235,0.08)', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${(result.counts[w] / maxCount) * 100}%`,
                      height: '100%',
                      backgroundColor: WUXING_COLOR[w],
                      borderRadius: 5,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.8rem', width: 16, textAlign: 'right' }}>
                  {result.counts[w]}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 日主 / 喜用神 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 1 }}>
            <Chip
              label={`日主 ${result.dayMasterChar}${result.dayMaster}`}
              sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-serif)', border: '1px solid rgba(201,169,110,0.3)' }}
            />
            <Chip
              label={`身${result.strength}`}
              sx={{ backgroundColor: `${STRENGTH_COLOR[result.strength]}22`, color: STRENGTH_COLOR[result.strength], fontFamily: 'var(--font-serif)', border: `1px solid ${STRENGTH_COLOR[result.strength]}55` }}
            />
            {result.missing.map((w) => (
              <Chip key={w} label={`缺${w}`} sx={{ backgroundColor: 'rgba(192,57,43,0.12)', color: '#e0908a', fontFamily: 'var(--font-serif)' }} />
            ))}
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.8)', fontSize: '0.88rem', lineHeight: 1.7, mb: 2 }}>
            {result.xiyongText}。{result.summary}
          </Typography>

          {/* 推荐材质 chips */}
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.95rem', fontWeight: 600, mb: 1.2 }}>
            为你推荐的材质
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {recommendedMaterials.map((mat) => (
              <Chip
                key={mat}
                label={mat}
                onClick={() => navigate(`/exchange?material=${encodeURIComponent(mat)}`)}
                sx={{
                  backgroundColor: 'rgba(201,169,110,0.1)',
                  color: '#e0c99a',
                  fontFamily: 'var(--font-serif)',
                  border: '1px solid rgba(201,169,110,0.3)',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(201,169,110,0.22)' },
                }}
              />
            ))}
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleCopy}
              startIcon={<ContentCopyIcon />}
              sx={{ borderColor: 'rgba(201,169,110,0.5)', color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none' }}
            >
              复制结果
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/exchange')}
              startIcon={<ShoppingBagOutlinedIcon />}
              sx={{ backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', textTransform: 'none', '&:hover': { backgroundColor: '#c9a96e' } }}
            >
              去商城看看
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

/** 表单字段统一样式（暗金主题） */
const fieldSx = {
  flex: { xs: '1 1 100%', sm: '1 1 30%' },
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--font-serif)',
    color: '#f5f0eb',
    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
  },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
  '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
} as const;
