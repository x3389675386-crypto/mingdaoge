import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ForumIcon from '@mui/icons-material/Forum';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import { useForum } from '../context/ForumContext';
import { FORUM_CATEGORIES, type ForumCategory } from '../types';
import Navbar from './Navbar';
import Footer from './Footer';

/** 分类标签颜色 */
const categoryColors: Record<string, string> = {
  paranormal: '#9c27b0',
  handcraft: '#c9a96e',
  culture: '#e65100',
  chat: '#546e7a',
};

export default function ForumPage() {
  const { posts, loading, addPost, deletePost, postsByCategory } = useForum();
  const [activeCategory, setActiveCategory] = useState<ForumCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    author: '',
    title: '',
    content: '',
    category: 'paranormal' as ForumCategory,
  });
  const [titleError, setTitleError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const displayPosts = activeCategory === 'all' ? posts : postsByCategory(activeCategory as ForumCategory);

  const getCategoryInfo = (value: string) => FORUM_CATEGORIES.find((c) => c.value === value);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  const handleSubmit = async () => {
    let valid = true;
    if (!newPost.title.trim()) { setTitleError(true); valid = false; }
    if (!newPost.content.trim()) { setContentError(true); valid = false; }
    if (!valid) return;

    try {
      await addPost({
        author: newPost.author.trim() || '匿名道友',
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        category: newPost.category,
      });
      setDialogOpen(false);
      setNewPost({ author: '', title: '', content: '', category: 'paranormal' });
      setTitleError(false);
      setContentError(false);
      setSnackbar({ open: true, message: '发帖成功！', severity: 'success' });
    } catch (err) {
      console.error('发帖失败:', err);
      setSnackbar({ open: true, message: '发帖失败，请重试', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePost(id);
    } catch (err) {
      console.error('删帖失败:', err);
    }
  };

  return (
    <>
      <Navbar />

      {/* 页面头部 */}
      <Box
        sx={{
          pt: 12,
          pb: 4,
          px: 2,
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)',
          borderBottom: '1px solid rgba(201,169,110,0.1)',
        }}
      >
        <ForumIcon sx={{ fontSize: '3rem', color: '#c9a96e', mb: 1 }} />
        <Typography
          sx={{
            fontFamily: 'var(--font-calligraphy)',
            fontSize: { xs: '2rem', md: '2.5rem' },
            color: '#c9a96e',
            mb: 1,
          }}
        >
          道阁论道
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.5)',
            fontSize: '0.9rem',
            letterSpacing: '0.15em',
          }}
        >
          以文会友 · 以道相交 · 畅所欲言
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        {/* 分类筛选 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            label="全部"
            onClick={() => setActiveCategory('all')}
            sx={{
              backgroundColor: activeCategory === 'all' ? 'rgba(201,169,110,0.25)' : 'rgba(201,169,110,0.08)',
              color: activeCategory === 'all' ? '#c9a96e' : 'rgba(245,240,235,0.5)',
              borderColor: activeCategory === 'all' ? '#c9a96e' : 'rgba(201,169,110,0.15)',
              fontFamily: 'var(--font-serif)',
              '&:hover': { backgroundColor: 'rgba(201,169,110,0.15)' },
            }}
            variant="outlined"
          />
          {FORUM_CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              label={`${cat.icon} ${cat.label}`}
              onClick={() => setActiveCategory(cat.value)}
              sx={{
                backgroundColor: activeCategory === cat.value ? `${categoryColors[cat.value]}33` : 'rgba(201,169,110,0.08)',
                color: activeCategory === cat.value ? categoryColors[cat.value] : 'rgba(245,240,235,0.5)',
                borderColor: activeCategory === cat.value ? categoryColors[cat.value] : 'rgba(201,169,110,0.15)',
                fontFamily: 'var(--font-serif)',
                '&:hover': { backgroundColor: `${categoryColors[cat.value]}22` },
              }}
              variant="outlined"
            />
          ))}
        </Box>

        {/* 帖子列表 */}
        {loading ? (
          <Typography sx={{ textAlign: 'center', color: 'rgba(245,240,235,0.4)', py: 8, fontFamily: 'var(--font-serif)' }}>
            加载中...
          </Typography>
        ) : displayPosts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '3rem', mb: 2 }}>📝</Typography>
            <Typography sx={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'var(--font-serif)' }}>
              还没有帖子，来做第一个发言的人吧！
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayPosts.map((post) => {
              const catInfo = getCategoryInfo(post.category);
              return (
                <Card
                  key={post.id}
                  sx={{
                    backgroundColor: 'rgba(22,33,62,0.4)',
                    border: '1px solid rgba(201,169,110,0.08)',
                    borderRadius: '4px',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: 'rgba(201,169,110,0.2)',
                      backgroundColor: 'rgba(22,33,62,0.6)',
                    },
                  }}
                >
                  <CardContent sx={{ pb: '12px !important' }}>
                    {/* 标题行 */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={`${catInfo?.icon || '💬'} ${catInfo?.label || post.category}`}
                            size="small"
                            sx={{
                              backgroundColor: `${categoryColors[post.category] || '#546e7a'}22`,
                              color: categoryColors[post.category] || '#546e7a',
                              fontSize: '0.7rem',
                              height: 22,
                              fontFamily: 'var(--font-serif)',
                            }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: 'var(--font-serif)',
                            color: '#f5f0eb',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            lineHeight: 1.4,
                          }}
                        >
                          {post.title}
                        </Typography>
                      </Box>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(post.id)}
                          sx={{ color: 'rgba(192,57,43,0.3)', '&:hover': { color: '#c0392b' } }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* 内容 */}
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(245,240,235,0.7)',
                        fontSize: '0.9rem',
                        mt: 1,
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        maxHeight: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {post.content}
                    </Typography>

                    {/* 底部信息 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: '0.85rem', color: 'rgba(201,169,110,0.4)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.5)', fontSize: '0.8rem' }}>
                          {post.author}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: '0.85rem', color: 'rgba(201,169,110,0.3)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.35)', fontSize: '0.8rem' }}>
                          {formatTime(post.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* 发帖悬浮按钮 */}
      <Fab
        onClick={() => setDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 40 },
          right: { xs: 24, md: 40 },
          backgroundColor: '#c9a96e',
          color: '#1a1a2e',
          '&:hover': { backgroundColor: '#b8975c' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* 发帖弹窗 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#16213e',
            border: '1px solid rgba(201,169,110,0.15)',
            borderRadius: '4px',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--font-serif)',
            color: '#c9a96e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          发表新帖
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* 昵称 + 分类 */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="昵称（选填）"
                value={newPost.author}
                onChange={(e) => setNewPost((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="匿名道友"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'var(--font-serif)',
                    color: '#f5f0eb',
                    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                  },
                  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
                }}
              />
              <TextField
                select
                label="分类"
                value={newPost.category}
                onChange={(e) => setNewPost((prev) => ({ ...prev, category: e.target.value as ForumCategory }))}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'var(--font-serif)',
                    color: '#f5f0eb',
                    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                  },
                  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
                  '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
                }}
              >
                {FORUM_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value} sx={{ fontFamily: 'var(--font-serif)' }}>
                    {cat.icon} {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* 标题 */}
            <TextField
              label="标题"
              value={newPost.title}
              onChange={(e) => { setNewPost((prev) => ({ ...prev, title: e.target.value })); setTitleError(false); }}
              error={titleError}
              helperText={titleError ? '标题不能为空' : ''}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'var(--font-serif)',
                  color: '#f5f0eb',
                  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                },
                '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
              }}
            />

            {/* 内容 */}
            <TextField
              label="内容"
              value={newPost.content}
              onChange={(e) => { setNewPost((prev) => ({ ...prev, content: e.target.value })); setContentError(false); }}
              error={contentError}
              helperText={contentError ? '内容不能为空' : ''}
              multiline
              rows={6}
              fullWidth
              placeholder="畅所欲言..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'var(--font-serif)',
                  color: '#f5f0eb',
                  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                },
                '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
              }}
            />

            {/* 发帖按钮 */}
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              sx={{
                backgroundColor: 'rgba(201,169,110,0.85)',
                color: '#1a1a2e',
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                py: 1.2,
                '&:hover': { backgroundColor: '#c9a96e' },
              }}
            >
              发表
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily: 'var(--font-serif)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Footer />
    </>
  );
}
