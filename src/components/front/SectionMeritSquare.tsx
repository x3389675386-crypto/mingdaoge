/**
 * 首页板块三：积德坊 / 功德赚取。
 * 展示当前阳德 / 积分余额（读 profile），CTA 跳 /exchange，附「任务系统即将上线」提示条。
 */

import { Box, Typography, Button, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SectionMeritSquare() {
  const { profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const yangDe = profile?.yang_de ?? 0;
  const points = profile?.points ?? 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 6, md: 9 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '1.8rem', md: '2.4rem' }, color: '#c9a96e' }}>
          积德坊
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
          功德赚取 · 阳德变现
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'center',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Chip
          icon={<AutoAwesomeIcon />}
          label={isAuthenticated ? `阳德 ${yangDe}` : '阳德 —'}
          sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-serif)', fontSize: '0.95rem', border: '1px solid rgba(201,169,110,0.4)', px: 1, py: 2.5 }}
        />
        <Chip
          icon={<AutoAwesomeIcon />}
          label={isAuthenticated ? `积分 ${points}` : '积分 —'}
          sx={{ backgroundColor: 'rgba(156,39,176,0.15)', color: '#ce93d8', fontFamily: 'var(--font-serif)', fontSize: '0.95rem', border: '1px solid rgba(156,39,176,0.4)', px: 1, py: 2.5 }}
        />
      </Box>

      <Box
        sx={{
          maxWidth: 640,
          mx: 'auto',
          mb: 3,
          p: 1.5,
          textAlign: 'center',
          border: '1px dashed rgba(201,169,110,0.3)',
          borderRadius: '4px',
          backgroundColor: 'rgba(201,169,110,0.05)',
        }}
      >
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.82rem' }}>
          任务系统即将上线 —— 签到、发帖、结缘皆可得功德
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Button
          onClick={() => navigate('/exchange')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.85)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.1em',
            borderRadius: '2px',
            px: 3,
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
          variant="contained"
        >
          {isAuthenticated ? '前往兑换中心' : '登录后开启功德账户'}
        </Button>
      </Box>
    </Box>
  );
}
