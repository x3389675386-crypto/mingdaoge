/**
 * 首页板块三：积德坊 / 功德赚取。
 * 展示当前阳德 / 积分余额（读 profile），CTA 跳 /exchange，附「任务大厅已开放」提示条。
 */

import { Box, Typography, Button, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import CheckinCard from '../../components/CheckinCard';
import { useAuth } from '../../context/AuthContext';

export default function SectionMeritSquare() {
  const { profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const yangDe = profile?.yang_de ?? 0;
  const points = profile?.points ?? 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 12, md: 16 } }}>
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

      {/* 任务大厅引导 */}
      <Box sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: 3 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          任务大厅已开放 —— 认领修行任务、提交凭证，赚取阳德与积分
        </Typography>
      </Box>

      {/* 操作按钮（移动端自动换行） */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: { xs: 1.5, sm: 2 },
          maxWidth: '100%',
          mb: 1,
        }}
      >
        <Button
          onClick={() => navigate('/tasks')}
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
          前往任务大厅
        </Button>
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
          前往兑换中心
        </Button>
      </Box>

      {/* 签到卡片（完整形态，显眼展示） */}
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 3 }}>
        <CheckinCard />
      </Box>
    </Box>
  );
}
