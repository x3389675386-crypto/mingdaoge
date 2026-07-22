/**
 * 首页板块二：道藏阁 / 教材获取。
 * 复用论坛「功法」栏目（forum_posts category='gongfa' + gongfa_materials）。
 * 展示最新功法资料卡 + 管理员上传入口 + CTA 跳 /forum?cat=gongfa。
 */

import { useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Snackbar, Alert } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../../context/ForumContext';
import { useAuth } from '../../context/AuthContext';
import PostGongfaDialog from '../PostGongfaDialog';

export default function SectionDaoTreasury() {
  const { posts, gongfaMaterials, refresh } = useForum();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [gongfaOpen, setGongfaOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const gongfaPosts = posts.filter((p) => p.category === 'gongfa').slice(0, 4);

  return (
    <Box sx={{ background: 'linear-gradient(180deg, rgba(22,33,62,0.4) 0%, rgba(26,26,46,0.2) 100%)' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 12, md: 16 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '1.8rem', md: '2.4rem' }, color: '#c9a96e' }}>
            道藏阁
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', letterSpacing: '0.2em', fontSize: '0.85rem', mt: 0.5 }}>
            教材获取 · 功法研习
          </Typography>
        </Box>

        {gongfaPosts.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'rgba(245,240,235,0.4)', fontFamily: 'var(--font-serif)', py: 2 }}>
            暂无公开功法，敬请期待
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {gongfaPosts.map((post) => {
              const mats = gongfaMaterials.filter((m) => m.post_id === post.id);
              return (
                <Card key={post.id} sx={{ backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(63,81,181,0.25)', borderRadius: '4px' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MenuBookIcon sx={{ color: '#7986cb' }} />
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1rem', fontWeight: 600 }}>
                        {post.title}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(245,240,235,0.6)',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        maxHeight: 70,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mb: 1.5,
                      }}
                    >
                      {post.content}
                    </Typography>
                    {mats.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 1 }}>
                        {mats.map((m) => (
                          <Button
                            key={m.id}
                            component="a"
                            href={m.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<DownloadIcon />}
                            sx={{
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              color: '#f5f0eb',
                              fontFamily: 'var(--font-serif)',
                              fontSize: '0.8rem',
                              border: '1px solid rgba(201,169,110,0.2)',
                              borderRadius: '4px',
                              py: 0.6,
                              '&:hover': { borderColor: 'rgba(201,169,110,0.5)', backgroundColor: 'rgba(201,169,110,0.08)' },
                            }}
                          >
                            {m.file_name}
                          </Button>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, flexWrap: 'wrap' }}>
          <Button
            onClick={() => navigate('/forum?cat=gongfa')}
            endIcon={<ArrowForwardIcon />}
            sx={{ borderColor: 'rgba(201,169,110,0.4)', color: '#c9a96e', fontFamily: 'var(--font-serif)', borderRadius: '2px', px: 3, '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' } }}
            variant="outlined"
          >
            前往功法栏目
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setGongfaOpen(true)}
              startIcon={<MenuBookIcon />}
              sx={{ backgroundColor: 'rgba(63,81,181,0.85)', color: '#fff', fontFamily: 'var(--font-serif)', borderRadius: '2px', px: 3, '&:hover': { backgroundColor: '#5c6bc0' } }}
              variant="contained"
            >
              上传功法
            </Button>
          )}
        </Box>
      </Box>

      <PostGongfaDialog
        open={gongfaOpen}
        onClose={() => setGongfaOpen(false)}
        onSuccess={() => {
          void refresh();
          setSnackbar({ open: true, message: '功法帖发布成功！', severity: 'success' });
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
