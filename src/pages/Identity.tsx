/**
 * 身份晋升权益页（二期新增，路由 /identity）。
 *
 * 三阶体系：顾客(customer) → 散修(sanxiu) → 法脉(famai)。
 * 读取当前 profile.identity_type 高亮当前阶，展示晋升进度（依据 profile.points 估算，
 * 门槛值前端常量集中定义，便于后续后台接管）。纯前端，无后端依赖。
 *
 * 视觉：暗金 + 衬线，与论坛 / 兑换中心一致。
 */

import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Chip, LinearProgress, Divider } from '@mui/material';
import EmojiNatureIcon from '@mui/icons-material/EmojiNature';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { useAuth } from '../context/AuthContext';
import { IDENTITY_TYPE_LABEL } from '../lib/identities';
import type { IdentityType } from '../types';
import Footer from '../components/Footer';

/**
 * 身份门槛常量（集中定义，便于后续后台接管 / 调整）。
 * 含义：达到对应积分门槛即可晋升该阶（如 200 积分→散修，1000 积分→法脉）。
 */
export const IDENTITY_THRESHOLDS: Record<IdentityType, number> = {
  customer: 0,
  sanxiu: 200,
  famai: 1000,
};

/** 三阶顺序 */
const TIER_ORDER: IdentityType[] = ['customer', 'sanxiu', 'famai'];

interface TierInfo {
  type: IdentityType;
  /** 展示图标 */
  icon: ReactNode;
  /** 专属标识文案 */
  badge: string;
  /** 权益点（贴合修行调性） */
  benefits: string[];
  /** 积分加成文案 */
  pointBonus: string;
  /** 客服权益文案 */
  support: string;
}

const TIERS: Record<IdentityType, TierInfo> = {
  customer: {
    type: 'customer',
    icon: <EmojiNatureIcon sx={{ fontSize: '2rem', color: '#c9a96e' }} />,
    badge: '凡夫俗子',
    benefits: ['自由浏览与下单结缘', '参与道阁论道论坛', '每日免费幸运转盘', '阳德 / 积分基础获取'],
    pointBonus: '积分加成：无',
    support: '客服：标准排队',
  },
  sanxiu: {
    type: 'sanxiu',
    icon: <AutoStoriesIcon sx={{ fontSize: '2rem', color: '#c9a96e' }} />,
    badge: '散修',
    benefits: ['解锁「散修」专属标识', '积分加成 +10%', '优先客服接入', '限定法器预购资格', '专属修行社群'],
    pointBonus: '积分加成：+10%',
    support: '客服：优先接入',
  },
  famai: {
    type: 'famai',
    icon: <WorkspacePremiumIcon sx={{ fontSize: '2rem', color: '#c9a96e' }} />,
    badge: '法脉',
    benefits: ['「法脉」传承标识', '积分加成 +20%', '专属一对一客服', '限量孤品优先购', '门派活动邀约', '可申请认证师傅'],
    pointBonus: '积分加成：+20%',
    support: '客服：一对一专属',
  },
};

export default function Identity() {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  const currentType: IdentityType = (profile?.identity_type as IdentityType) || 'customer';
  const points = profile?.points ?? 0;

  /** 计算晋升进度：当前阶 → 下一阶（按积分门槛估算） */
  const progress = useMemo(() => {
    const idx = TIER_ORDER.indexOf(currentType);
    const curThreshold = IDENTITY_THRESHOLDS[currentType];
    // 已是最高阶
    if (idx >= TIER_ORDER.length - 1) {
      return { nextType: null, percent: 100, toNext: 0 };
    }
    const nextType = TIER_ORDER[idx + 1];
    const nextThreshold = IDENTITY_THRESHOLDS[nextType];
    const span = nextThreshold - curThreshold;
    const gained = Math.max(0, points - curThreshold);
    const percent = span > 0 ? Math.min(100, Math.round((gained / span) * 100)) : 100;
    return { nextType, percent, toNext: Math.max(0, nextThreshold - points) };
  }, [currentType, points]);

  if (!isAuthenticated) {
    return (
      <>
        <Box sx={{ pt: 12, textAlign: 'center', color: 'rgba(245,240,235,0.6)', fontFamily: 'var(--font-serif)', minHeight: '60vh' }}>
          <Typography sx={{ fontSize: '1.2rem' }}>请先登录后查看身份晋升</Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2, borderColor: 'rgba(201,169,110,0.5)', color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none' }}
            onClick={() => navigate('/login?redirect=/identity')}
          >
            去登录
          </Button>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Box sx={{ maxWidth: 1080, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 6 } }}>
        {/* 标题 */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '2rem', md: '2.6rem' }, color: '#c9a96e' }}>
            修行身份 · 晋升之路
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
            凡夫 → 散修 → 法脉，步步生莲
          </Typography>
        </Box>

        {/* 当前身份 + 进度 */}
        <Card sx={{ backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '4px', mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {TIERS[currentType].icon}
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.2rem', fontWeight: 600 }}>
                    当前身份：{IDENTITY_TYPE_LABEL[currentType]}（{TIERS[currentType].badge}）
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.82rem' }}>
                    当前积分 {points} · 门槛 {IDENTITY_THRESHOLDS[currentType]} 已达成
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={
                  progress.nextType
                    ? `距「${IDENTITY_TYPE_LABEL[progress.nextType]}」还差 ${progress.toNext} 积分`
                    : '已达最高阶 · 法脉'
                }
                sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-serif)', border: '1px solid rgba(201,169,110,0.3)' }}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress.percent}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(245,240,235,0.08)',
                '& .MuiLinearProgress-bar': { backgroundColor: '#c9a96e', borderRadius: 5 },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.4)', fontSize: '0.75rem' }}>
                晋升进度 {progress.percent}%
              </Typography>
              {progress.nextType && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#c9a96e' }}>
                  <ArrowUpwardIcon sx={{ fontSize: '0.9rem' }} />
                  <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.75rem' }}>
                    {IDENTITY_TYPE_LABEL[progress.nextType]}（{IDENTITY_THRESHOLDS[progress.nextType]} 积分）
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* 三阶对比卡片 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {TIER_ORDER.map((t) => {
            const info = TIERS[t];
            const isCurrent = t === currentType;
            const idx = TIER_ORDER.indexOf(t);
            const isUnlocked = idx <= TIER_ORDER.indexOf(currentType);
            return (
              <Card
                key={t}
                sx={{
                  backgroundColor: isCurrent ? 'rgba(201,169,110,0.1)' : 'rgba(22,33,62,0.4)',
                  border: `1px solid ${isCurrent ? '#c9a96e' : 'rgba(201,169,110,0.12)'}`,
                  borderRadius: '4px',
                  position: 'relative',
                  transition: 'all 0.3s',
                  '&:hover': { borderColor: 'rgba(201,169,110,0.4)' },
                }}
              >
                {isCurrent && (
                  <Chip
                    label="当前阶"
                    size="small"
                    sx={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#c9a96e', color: '#1a1a2e', fontFamily: 'var(--font-serif)', fontWeight: 700 }}
                  />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {info.icon}
                    <Box>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
                        {IDENTITY_TYPE_LABEL[t]}
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.8)', fontSize: '0.78rem' }}>
                        {info.badge}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.8rem', mb: 1.5 }}>
                    晋升门槛：{IDENTITY_THRESHOLDS[t]} 积分 {isUnlocked ? '（已达成）' : ''}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(201,169,110,0.12)', mb: 1.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 1.5 }}>
                    {info.benefits.map((b, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-start' }}>
                        <Typography sx={{ color: '#c9a96e', fontSize: '0.85rem', lineHeight: 1.4 }}>·</Typography>
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.8)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {b}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.55)', fontSize: '0.78rem' }}>
                    {info.pointBonus}
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.55)', fontSize: '0.78rem' }}>
                    {info.support}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* 去赚积分 */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/tasks')}
            sx={{ backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', px: 4, py: 1.1, '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            去赚积分，加速晋升 →
          </Button>
        </Box>
      </Box>

      <Footer />
    </>
  );
}
