import { useState, useRef, useMemo } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ForumIcon from '@mui/icons-material/Forum';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CommentIcon from '@mui/icons-material/Comment';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { useForum } from '../context/ForumContext';
import { useComments } from '../context/CommentContext';
import { FORUM_CATEGORIES, type ForumPost } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import PostDetailDialog from './PostDetailDialog';
import PrivateChatButton from './PrivateChatButton';
import PostGongfaDialog from './PostGongfaDialog';

/** 分类标签颜色 */
const categoryColors: Record<string, string> = {
  paranormal: '#9c27b0',
  handcraft: '#c9a96e',
  culture: '#e65100',
  chat: '#546e7a',
  gongfa: '#3f51b5',
};

/** 发帖快捷表情 */
const QUICK_EMOJIS = ['👍', '😂', '🔥', '👏', '💡', '🍀', '🙏', '✨', '🌿', '📿', '💬', '🌟'];

export default function ForumPage() {
  const { posts, loading, addPost, deletePost, likePost, hasLiked, categories, lastWarning: forumWarning } = useForum();
  const { commentsByPostId } = useComments();
  const { isAdmin, isAuthenticated, profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'latest' | 'hot'>('latest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gongfaOpen, setGongfaOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<ForumPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    author: '',
    title: '',
    content: '',
    category: 'paranormal' as string,
    imageFile: null as File | null,
    imagePreview: null as string | null,
  });
  const [titleError, setTitleError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  /** 动态分类（forum_categories）优先，未配置时降级硬编码 */
  const activeCategories = categories.length > 0
    ? categories
    : FORUM_CATEGORIES.map((c) => ({ id: 0, value: c.value, label: c.label, icon: c.icon, sort_order: 0, is_system: true }));
  const defaultCategory = activeCategories.find((c) => c.value !== 'gongfa')?.value || 'paranormal';

  const displayPosts = useMemo(() => {
    const list = activeCategory === 'all' ? posts : posts.filter((p) => p.category === activeCategory);
    const sorted = [...list];
    if (sortMode === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    }
    return sorted;
  }, [posts, activeCategory, sortMode]);

  const getCategoryInfo = (value: string) =>
    activeCategories.find((c) => c.value === value) ||
    FORUM_CATEGORIES.find((c) => c.value === value);

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

  const handleOpenDetail = (post: ForumPost) => {
    setDetailPost(post);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setDetailPost(null), 300);
  };

  /** 点赞（游客态引导登录，已赞禁用） */
  const handleLike = (post: ForumPost) => {
    if (!isAuthenticated) {
      setSnackbar({ open: true, message: '登录后即可点赞~', severity: 'info' });
      return;
    }
    void likePost(post.id);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setSnackbar({ open: true, message: '登录后才能发帖~', severity: 'info' });
      return;
    }
    let valid = true;
    if (!newPost.title.trim()) { setTitleError(true); valid = false; }
    if (!newPost.content.trim()) { setContentError(true); valid = false; }
    if (!valid) return;

    try {
      let imageUrl: string | undefined;

      if (newPost.imageFile) {
          if (isSupabaseConfigured) {
            const fileExt = newPost.imageFile.name.split('.').pop() || 'jpg';
            const filePath = `forum_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(filePath, newPost.imageFile);
            if (uploadError) {
              console.error('[明道阁] 图片上传失败:', uploadError);
              setSnackbar({ open: true, message: `图片上传失败：${uploadError.message}`, severity: 'error' });
              return;
            }
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
          } else {
            imageUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('图片读取失败'));
              reader.readAsDataURL(newPost.imageFile!);
            });
          }
        }

        await addPost({
          author: profile?.nickname?.trim() || newPost.author.trim() || '匿名道友',
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          category: newPost.category,
          imageUrl,
        });
        setDialogOpen(false);
        setNewPost({ author: '', title: '', content: '', category: defaultCategory, imageFile: null, imagePreview: null });
        setTitleError(false);
        setContentError(false);
        if (forumWarning) {
          setSnackbar({ open: true, message: `发帖成功（${forumWarning}）`, severity: 'warning' });
        } else {
          setSnackbar({ open: true, message: '发帖成功！', severity: 'success' });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        console.error('发帖失败:', err);
        setSnackbar({ open: true, message: msg || '发帖失败，请重试', severity: 'error' });
      }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      await deletePost(id);
      setSnackbar({ open: true, message: '已删除', severity: 'success' });
    } catch (err) {
      console.error('删帖失败:', err);
      setSnackbar({ open: true, message: '删除失败', severity: 'error' });
    }
  };

  return (
    <>
      <Navbar />

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
        <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: { xs: '2rem', md: '2.5rem' }, color: '#c9a96e', mb: 1 }}>
          道阁论道
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.9rem', letterSpacing: '0.15em' }}>
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
          {activeCategories.map((cat) => (
            <Chip
              key={cat.value}
              label={`${cat.icon || '💬'} ${cat.label}`}
              onClick={() => setActiveCategory(cat.value)}
              sx={{
                backgroundColor: activeCategory === cat.value ? `${categoryColors[cat.value] || '#546e7a'}33` : 'rgba(201,169,110,0.08)',
                color: activeCategory === cat.value ? categoryColors[cat.value] || '#546e7a' : 'rgba(245,240,235,0.5)',
                borderColor: activeCategory === cat.value ? categoryColors[cat.value] || '#546e7a' : 'rgba(201,169,110,0.15)',
                fontFamily: 'var(--font-serif)',
                '&:hover': { backgroundColor: `${categoryColors[cat.value] || '#546e7a'}22` },
              }}
              variant="outlined"
            />
          ))}
        </Box>

        {/* 排序切换 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup
            value={sortMode}
            exclusive
            size="small"
            onChange={(_, val) => { if (val) setSortMode(val); }}
            sx={{
              '& .MuiToggleButton-root': {
                color: 'rgba(201,169,110,0.5)',
                borderColor: 'rgba(201,169,110,0.15)',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.78rem',
                padding: '3px 16px',
                letterSpacing: '0.1em',
                '&.Mui-selected': { backgroundColor: 'rgba(201,169,110,0.12)', color: '#c9a96e', borderColor: 'rgba(201,169,110,0.4)' },
              },
            }}
          >
            <ToggleButton value="latest">最新</ToggleButton>
            <ToggleButton value="hot">热门</ToggleButton>
          </ToggleButtonGroup>
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
              const commentCount = commentsByPostId(post.id).length;
              const liked = hasLiked(post.id);
              return (
                <Card
                  key={post.id}
                  onClick={() => handleOpenDetail(post)}
                  sx={{
                    backgroundColor: 'rgba(22,33,62,0.4)',
                    border: '1px solid rgba(201,169,110,0.08)',
                    borderRadius: '4px',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'rgba(201,169,110,0.2)', backgroundColor: 'rgba(22,33,62,0.6)' },
                  }}
                >
                  <CardContent sx={{ pb: '12px !important' }}>
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
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.4 }}>
                          {post.title}
                        </Typography>
                      </Box>
                      {isAdmin && (
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(e, post.id)}
                            sx={{ color: 'rgba(192,57,43,0.3)', '&:hover': { color: '#c0392b' } }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {post.imageUrl && (
                      <Box component="img" src={post.imageUrl} sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: '4px', mb: 1, mt: 1 }} />
                    )}
                    <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.7)', fontSize: '0.9rem', mt: 1, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.content}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: '0.85rem', color: 'rgba(201,169,110,0.4)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.5)', fontSize: '0.8rem' }}>{post.author}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: '0.85rem', color: 'rgba(201,169,110,0.3)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.35)', fontSize: '0.8rem' }}>{formatTime(post.createdAt)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CommentIcon sx={{ fontSize: '0.85rem', color: 'rgba(201,169,110,0.3)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.35)', fontSize: '0.8rem' }}>{commentCount}</Typography>
                      </Box>
                      <PrivateChatButton guestId={post.guest_id} nickname={post.author} />
                      <Box
                        component="button"
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleLike(post); }}
                        disabled={liked}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          background: 'none',
                          border: 'none',
                          cursor: liked ? 'default' : 'pointer',
                          padding: 0,
                          ml: 'auto',
                          color: liked ? '#c9a96e' : 'rgba(201,169,110,0.45)',
                          fontFamily: 'var(--font-serif)',
                          fontSize: '0.8rem',
                          transition: 'color 0.2s',
                          '&:hover': { color: liked ? '#c9a96e' : '#c9a96e' },
                        }}
                      >
                        <ThumbUpAltIcon sx={{ fontSize: '0.85rem' }} />
                        <Typography component="span" sx={{ fontFamily: 'var(--font-serif)' }}>{post.likes ?? 0}</Typography>
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
      <Box sx={{ position: 'fixed', bottom: { xs: 24, md: 40 }, right: { xs: 24, md: 40 }, display: 'flex', flexDirection: 'column', gap: 1.5, zIndex: 10 }}>
        {isAdmin && (
          <Tooltip title="发功法帖（上传电子书）">
            <Fab
              onClick={() => setGongfaOpen(true)}
              sx={{ backgroundColor: '#3f51b5', color: '#fff', '&:hover': { backgroundColor: '#5c6bc0' } }}
            >
              <MenuBookIcon />
            </Fab>
          </Tooltip>
        )}
        <Fab
          onClick={() => { setNewPost((p) => ({ ...p, category: defaultCategory })); setDialogOpen(true); }}
          sx={{ backgroundColor: '#c9a96e', color: '#1a1a2e', '&:hover': { backgroundColor: '#b8975c' } }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* 发帖弹窗 */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setNewPost({ author: '', title: '', content: '', category: defaultCategory, imageFile: null, imagePreview: null });
        }}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          发表新帖
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="昵称（选填）"
                value={newPost.author}
                onChange={(e) => setNewPost((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="匿名道友"
                fullWidth
                sx={fieldSx}
              />
              <TextField
                select
                label="分类"
                value={newPost.category}
                onChange={(e) => setNewPost((prev) => ({ ...prev, category: e.target.value }))}
                fullWidth
                sx={fieldSx}
              >
                {activeCategories.filter((c) => c.value !== 'gongfa').map((cat) => (
                  <MenuItem key={cat.value} value={cat.value} sx={{ fontFamily: 'var(--font-serif)' }}>
                    {cat.icon} {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              label="标题"
              value={newPost.title}
              onChange={(e) => { setNewPost((prev) => ({ ...prev, title: e.target.value })); setTitleError(false); }}
              error={titleError}
              helperText={titleError ? '标题不能为空' : ''}
              fullWidth
              sx={fieldSx}
            />

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
              sx={fieldSx}
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {QUICK_EMOJIS.map((emoji) => (
                <Box
                  key={emoji}
                  component="button"
                  onClick={() => setNewPost((prev) => ({ ...prev, content: prev.content + emoji }))}
                  sx={emojiBtnSx}
                >
                  {emoji}
                </Box>
              ))}
            </Box>

            <Box>
              {newPost.imagePreview ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box component="img" src={newPost.imagePreview} sx={{ height: 100, borderRadius: '4px', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    onClick={() => { setNewPost((prev) => ({ ...prev, imageFile: null, imagePreview: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    sx={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', color: '#f5f0eb', width: 24, height: 24, '&:hover': { backgroundColor: 'rgba(192,57,43,0.8)' } }}
                  >
                    <CloseIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderColor: 'rgba(201,169,110,0.3)', color: 'rgba(201,169,110,0.7)', fontFamily: 'var(--font-serif)', fontSize: '0.85rem', textTransform: 'none', '&:hover': { borderColor: 'rgba(201,169,110,0.5)', backgroundColor: 'rgba(201,169,110,0.08)' } }}
                >
                  添加图片
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    setSnackbar({ open: true, message: '图片大小不能超过10MB', severity: 'warning' });
                    e.target.value = '';
                    return;
                  }
                  const preview = URL.createObjectURL(file);
                  setNewPost((prev) => ({ ...prev, imageFile: file, imagePreview: preview }));
                }}
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', fontWeight: 600, letterSpacing: '0.1em', py: 1.2, '&:hover': { backgroundColor: '#c9a96e' } }}
            >
              发表
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 帖子详情弹窗 */}
      <PostDetailDialog open={detailOpen} onClose={handleCloseDetail} post={detailPost} />

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ fontFamily: 'var(--font-serif)' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Footer />

      {/* 管理员发功法帖（含电子书上传） */}
      <PostGongfaDialog open={gongfaOpen} onClose={() => setGongfaOpen(false)} onSuccess={() => setSnackbar({ open: true, message: '功法帖发布成功！', severity: 'success' })} />
    </>
  );
}

/** 表单字段统一样式 */
const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
  '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
} as const;

/** 快捷表情按钮 */
const emojiBtnSx = {
  background: 'rgba(201,169,110,0.06)',
  border: '1px solid rgba(201,169,110,0.15)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1.1rem',
  lineHeight: 1,
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  '&:hover': { backgroundColor: 'rgba(201,169,110,0.18)', borderColor: 'rgba(201,169,110,0.4)', transform: 'translateY(-2px)' },
} as const;
