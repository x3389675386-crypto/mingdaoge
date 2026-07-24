/**
 * 每日运势 / 黄历卡（纯前端，无 DB）。
 *
 * 展示：公历日期 + 星期 + 干支日（复用 bazi.ts 日柱函数）+ 十二建除宜忌 + 12 生肖今日运势。
 * 与 CheckinCard 签到卡并列放置（首页积德坊 / 个人中心），强化每日回访钩子。
 *
 * 说明：干支日 / 建除为民俗近似，生肖运势纯娱乐，不构成任何指引。
 */

import { Box, Typography, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getDayGanZhi, getJianChu, getZodiacFortunes, type ZodiacFortune } from '../lib/bazi';

/** 星期中文 */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 生肖运势等级配色 */
const ZODIAC_LEVEL_COLOR: Record<ZodiacFortune['level'], string> = {
  吉: '#5cb85c',
  平: '#c9a96e',
  凶: '#c0392b',
};

interface DailyFortuneProps {
  /** compact 形态用于首页横排并列；完整形态信息更全 */
  compact?: boolean;
}

export default function DailyFortune({ compact = false }: DailyFortuneProps) {
  const now = new Date();
  const dayGanZhi = getDayGanZhi(now);
  const jianChu = getJianChu(now);
  const fortunes = getZodiacFortunes(now);
  const weekday = WEEKDAYS[now.getUTCDay()];
  const dateLabel = `${now.getUTCFullYear()}年${now.getUTCMonth() + 1}月${now.getUTCDate()}日`;

  if (compact) {
    return (
      <Box
        sx={{
          p: 3,
          borderRadius: '6px',
          backgroundColor: 'rgba(22,33,62,0.6)',
          border: '1px solid rgba(201,169,110,0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: '#c9a96e', fontSize: '1.1rem' }} />
          <Box>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.9rem', fontWeight: 600 }}>
              每日运势
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.72rem' }}>
              {dateLabel} · 星期{weekday}
            </Typography>
          </Box>
          <Chip
            label={dayGanZhi.ganzhi}
            size="small"
            sx={{ ml: 'auto', backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-calligraphy)', fontSize: '0.9rem', border: '1px solid rgba(201,169,110,0.3)' }}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1 }}>
          <Chip label={`建除·${jianChu.term}`} size="small" sx={{ backgroundColor: 'rgba(201,169,110,0.1)', color: 'rgba(224,201,154,0.85)', fontFamily: 'var(--font-serif)', fontSize: '0.7rem' }} />
          {jianChu.yi.slice(0, 3).map((y) => (
            <Chip key={y} label={`宜${y}`} size="small" sx={{ backgroundColor: 'rgba(92,184,92,0.12)', color: '#7ec97e', fontFamily: 'var(--font-serif)', fontSize: '0.7rem' }} />
          ))}
          {jianChu.ji.slice(0, 2).map((j) => (
            <Chip key={j} label={`忌${j}`} size="small" sx={{ backgroundColor: 'rgba(192,57,43,0.12)', color: '#e0908a', fontFamily: 'var(--font-serif)', fontSize: '0.7rem' }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: '6px',
        backgroundColor: 'rgba(22,33,62,0.6)',
        border: '1px solid rgba(201,169,110,0.12)',
      }}
    >
      {/* 头部 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <AutoAwesomeIcon sx={{ color: '#c9a96e' }} />
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
          每日运势 · 黄历
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.82rem', mb: 1.5 }}>
        {dateLabel} · 星期{weekday} · 干支 {dayGanZhi.ganzhi} 日
      </Typography>

      {/* 建除宜忌 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 2.5 }}>
        <Chip label={`建除·${jianChu.term}`} sx={{ backgroundColor: 'rgba(201,169,110,0.13)', color: '#c9a96e', fontFamily: 'var(--font-serif)', border: '1px solid rgba(201,169,110,0.3)' }} />
        {jianChu.yi.map((y) => (
          <Chip key={`yi-${y}`} label={`宜${y}`} size="small" sx={{ backgroundColor: 'rgba(92,184,92,0.12)', color: '#7ec97e', fontFamily: 'var(--font-serif)', fontSize: '0.72rem' }} />
        ))}
        {jianChu.ji.map((j) => (
          <Chip key={`ji-${j}`} label={`忌${j}`} size="small" sx={{ backgroundColor: 'rgba(192,57,43,0.12)', color: '#e0908a', fontFamily: 'var(--font-serif)', fontSize: '0.72rem' }} />
        ))}
      </Box>

      {/* 12 生肖运势 */}
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.9rem', fontWeight: 600, mb: 1.2 }}>
        十二生肖今日
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
        {fortunes.map((f) => (
          <Box
            key={f.zodiac}
            className="daily-zodiac-card"
            sx={{
              border: '1px solid rgba(201,169,110,0.12)',
              borderRadius: '4px',
              p: 1,
              textAlign: 'center',
              backgroundColor: 'rgba(26,26,46,0.4)',
            }}
          >
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.95rem' }}>
              {f.zodiac}
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: ZODIAC_LEVEL_COLOR[f.level], fontSize: '0.72rem', fontWeight: 600 }}>
              {f.level}
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.62rem', lineHeight: 1.3, mt: 0.3 }}>
              {f.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
