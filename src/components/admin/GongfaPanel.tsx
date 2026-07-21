/**
 * 后台：功法管理（P0-7 / 决策2：教材获取 = 论坛功法栏目）。
 *
 * 列表展示「功法」栏目帖子及其电子书，支持：
 * - 通过 PostGongfaDialog 上传新功法（category='gongfa'，电子书存 Storage + gongfa_materials）
 * - 删除功法帖（仅管理员，ForumContext.deletePost 双重守卫）
 *
 * 复用 ForumContext（App 已包裹），无需自建查询。
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useForum } from '../../context/ForumContext';
import PostGongfaDialog from '../PostGongfaDialog';

export default function GongfaPanel() {
  const { posts, gongfaMaterials, deletePost, refresh, loading } = useForum();
  const [gongfaOpen, setGongfaOpen] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const gongfaPosts = posts
    .filter((p) => p.category === 'gongfa')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await deletePost(id);
      setSnackbar({ open: true, message: '功法帖已删除', severity: 'success' });
      await refresh();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '删除失败', severity: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon sx={{ color: '#7986cb' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
            功法管理
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={() => setGongfaOpen(true)} variant="contained"
          sx={{ backgroundColor: 'rgba(63,81,181,0.85)', color: '#fff', fontFamily: 'var(--font-serif)', textTransform: 'none', '&:hover': { backgroundColor: '#5c6bc0' } }}
        >
          上传功法
        </Button>
      </Box>
      <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
        功法帖归入「功法」栏目，每帖附一本电子书供道友研习（教材获取）。删除将一并移除电子书记录。
      </Typography>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#7986cb' }} /></Box>
      ) : gongfaPosts.length === 0 ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>
          暂无功法帖
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {gongfaPosts.map((post) => {
            const mats = gongfaMaterials.filter((m) => m.post_id === post.id);
            return (
              <Card key={post.id} sx={{ backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(63,81,181,0.25)', borderRadius: '4px' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MenuBookIcon sx={{ color: '#7986cb' }} />
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.95rem', fontWeight: 600 }}>{post.title}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleDelete(post.id)} disabled={deleting === post.id} sx={{ color: 'rgba(192,57,43,0.8)' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography sx={{ color: 'rgba(245,240,235,0.55)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 1, whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </Typography>
                  {mats.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {mats.map((m) => (
                        <Button
                          key={m.id}
                          component="a"
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<DownloadIcon />}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#f5f0eb', fontFamily: 'var(--font-serif)', fontSize: '0.78rem', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '4px', py: 0.5, '&:hover': { borderColor: 'rgba(201,169,110,0.5)', backgroundColor: 'rgba(201,169,110,0.08)' } }}
                        >
                          {m.file_name}
                        </Button>
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'rgba(245,240,235,0.35)', fontSize: '0.75rem', fontFamily: 'var(--font-serif)' }}>无电子书</Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

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
