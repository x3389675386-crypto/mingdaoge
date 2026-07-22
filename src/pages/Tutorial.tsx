import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { getTutorial } from '../data/tutorials';

/**
 * 功法教程完整内容页（/tutorials/:slug）
 *
 * 由 App.tsx 以 lazy 方式加载，自身不再包 Suspense。
 * 按路由参数 slug 读取对应教程，渲染结构化章节内容；未找到时给出返回入口。
 */
export default function Tutorial() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const t = getTutorial(slug || '');

  // 未找到对应教程
  if (!t) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#c9a96e', fontWeight: 700, mb: 2 }}>
          未找到该教程
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>
          该教程可能已下架或链接有误。
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/forum?cat=gongfa')}
          sx={{
            borderColor: 'rgba(201,169,110,0.4)',
            color: '#c9a96e',
            fontFamily: 'var(--font-serif)',
            textTransform: 'none',
            '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
          }}
        >
          返回功法大厅
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 顶部返回 */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          color: 'rgba(245,240,235,0.6)',
          fontFamily: 'var(--font-serif)',
          textTransform: 'none',
          mb: 2,
          '&:hover': { color: '#c9a96e' },
        }}
      >
        返回
      </Button>

      {/* 标题与导语 */}
      <Typography variant="h4" sx={{ color: '#c9a96e', fontWeight: 700, fontFamily: 'var(--font-calligraphy)' }}>
        {t.title}
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 2, fontFamily: 'var(--font-serif)' }}>
        {t.summary}
      </Typography>

      {/* 章节内容 */}
      {t.sections.map((s) => (
        <Box component="section" sx={{ mb: 4 }} key={s.heading}>
          <Typography variant="h6" sx={{ color: '#c9a96e', mt: 2, mb: 1, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
            {s.heading}
          </Typography>
          {s.paragraphs.map((p, i) => (
            <Typography
              variant="body1"
              sx={{ color: 'rgba(245,240,235,0.82)', lineHeight: 1.9, mb: 1.2, fontFamily: 'var(--font-serif)' }}
              key={i}
            >
              {p}
            </Typography>
          ))}
        </Box>
      ))}

      {/* 底部返回入口 */}
      <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
        <Button
          variant="contained"
          onClick={() => navigate('/forum?cat=gongfa')}
          sx={{
            backgroundColor: 'rgba(201,169,110,0.85)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'none',
            px: 4,
            py: 1.1,
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
        >
          返回功法大厅
        </Button>
      </Box>
    </Container>
  );
}
