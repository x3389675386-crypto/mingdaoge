import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import type { ForumPost } from '../types';
import { FORUM_CATEGORIES } from '../types';
import { useComments } from '../context/CommentContext';
import { useForum } from '../context/ForumContext';
import { useAuth } from '../context/AuthContext';
import PrivateChatButton from './PrivateChatButton';
import UserAvatar from './UserAvatar';
import { fetchAvatarsByGuestIds } from '../lib/realtimeAvatar';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';

/** 分类标签颜色 */
const categoryColors: Record<string, string> = {
  paranormal: '#9c27b0',
  handcraft: '#c9a96e',
  culture: '#e65100',
  chat: '#546e7a',
  gongfa: '#3f51b5',
};

interface PostDetailDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 帖子数据 */
  post: ForumPost | null;
}

export default function PostDetailDialog({ open, onClose, post }: PostDetailDialogProps) {
const { commentsByPostId, addComment, deleteComment, lastWarning } = useComments();
const { likePost, posts: forumPosts, gongfaMaterials, hasLiked, avatarByGuestId } = useForum();
const { isAuthenticated, profile } = useAuth();
const [newComment, setNewComment] = useState({ content: '' });
const [submitting, setSubmitting] = useState(false);
const [commentError, setCommentError] = useState('');
/** 实时头像映射（合并 Context 中帖子级映射 + 评论级按需查询），key = guest_id */
const [liveAvatarMap, setLiveAvatarMap] = useState<Record<string, string>>(avatarByGuestId);

/**
 * 评论区头像实时化：收集本帖评论 guest_id，批量查 profiles 当前头像，
 * 与 Context 帖子级映射合并。失败（含 050 未执行）静默降级，回退首字母。
 */
useEffect(() => {
  if (!post) return;
  const ids = [post.guest_id, ...commentsByPostId(post.id).map((c) => c.guest_id)];
  let active = true;
  void fetchAvatarsByGuestIds(ids).then((fetched) => {
    if (!active) return;
    setLiveAvatarMap({ ...avatarByGuestId, ...fetched });
  });
  return () => {
    active = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [post?.id]);

  if (!post) return null;

  const comments = commentsByPostId(post.id);
  const catInfo = FORUM_CATEGORIES.find((c) => c.value === post.category);
  // 从 Context 取最新帖子，保证点赞数实时同步
  const livePost = forumPosts.find((p) => p.id === post.id) ?? post;
  const liked = hasLiked(post.id);
  const materials = post.category === 'gongfa' ? gongfaMaterials.filter((m) => m.post_id === post.id) : [];

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

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      setCommentError('登录后才能评论~');
      return;
    }
    if (!newComment.content.trim()) {
      setCommentError('评论内容不能为空');
      return;
    }

    try {
      setSubmitting(true);
      setCommentError('');
      await addComment({
        postId: post.id,
        author: profile?.nickname?.trim() || '匿名道友',
        content: newComment.content.trim(),
      });
      setNewComment({ content: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '评论失败，请重试';
      setCommentError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewComment({ content: '' });
    setCommentError('');
    onClose();
  };

  /** 点赞：游客态引导登录，已赞禁用 */
  const handleLike = () => {
    if (!isAuthenticated) {
      setCommentError('登录后即可点赞~');
      return;
    }
    if (liked) return;
    void likePost(livePost.id);
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: '#16213e',
          border: '1px solid rgba(201,169,110,0.15)',
          borderRadius: '4px',
          maxHeight: '90vh',
        },
      }}
    >
      {/* 标题栏 */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pr: 1,
          pb: 1,
        }}
      >
        <Box sx={{ flex: 1 }}>
          {/* 分类标签 */}
          <Chip
            label={`${catInfo?.icon || '💬'} ${catInfo?.label || post.category}`}
            size="small"
            sx={{
              backgroundColor: `${categoryColors[post.category] || '#546e7a'}22`,
              color: categoryColors[post.category] || '#546e7a',
              fontSize: '0.75rem',
              height: 24,
              fontFamily: 'var(--font-serif)',
              mb: 1,
            }}
          />
          {/* 标题 */}
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: '#f5f0eb',
              fontSize: { xs: '1.1rem', md: '1.3rem' },
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {post.title}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            color: 'rgba(245,240,235,0.5)',
            '&:hover': { color: '#f5f0eb' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* 作者 & 时间 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserAvatar
              name={post.author_nickname || post.author}
              avatarUrl={liveAvatarMap[post.guest_id ?? ''] || post.author_avatar_url}
              size={28}
            />
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.7)', fontSize: '0.9rem', fontWeight: 600 }}>
              {post.author_nickname || post.author}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: '0.9rem', color: 'rgba(201,169,110,0.35)' }} />
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.4)', fontSize: '0.85rem' }}>
              {formatTime(post.createdAt)}
            </Typography>
          </Box>
          <PrivateChatButton guestId={post.guest_id} nickname={post.author} />
          {/* 点赞按钮 */}
          <Box
            component="button"
            onClick={handleLike}
            disabled={liked}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              background: 'rgba(201,169,110,0.06)',
              border: '1px solid rgba(201,169,110,0.15)',
              borderRadius: '4px',
              cursor: liked ? 'default' : 'pointer',
              padding: '2px 10px',
              ml: 'auto',
              color: liked ? '#c9a96e' : 'rgba(201,169,110,0.6)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.82rem',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: liked ? 'rgba(201,169,110,0.06)' : 'rgba(201,169,110,0.18)',
                borderColor: 'rgba(201,169,110,0.4)',
                color: '#c9a96e',
              },
            }}
          >
            <ThumbUpAltIcon sx={{ fontSize: '0.9rem' }} />
            <Typography component="span" sx={{ fontFamily: 'var(--font-serif)' }}>
              {livePost.likes ?? 0}
            </Typography>
          </Box>
        </Box>

        {/* 帖子图片 */}
        {post.imageUrl && (
          <Box
            component="img"
            src={post.imageUrl}
            sx={{
              width: '100%',
              maxHeight: 400,
              objectFit: 'contain',
              borderRadius: '4px',
              mb: 2,
            }}
          />
        )}

        {/* 完整内容 */}
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            mb: 3,
          }}
        >
          {post.content}
        </Typography>

        {/* 功法电子书下载（教材获取） */}
        {post.category === 'gongfa' && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MenuBookIcon sx={{ fontSize: '1.1rem', color: '#3f51b5' }} />
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '0.95rem', fontWeight: 600 }}>
                功法电子书
              </Typography>
            </Box>
            {materials.length === 0 ? (
              <Typography sx={{ color: 'rgba(245,240,235,0.4)', fontSize: '0.85rem', fontFamily: 'var(--font-serif)' }}>
                暂未附电子书
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {materials.map((m) => (
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
                      border: '1px solid rgba(201,169,110,0.2)',
                      borderRadius: '4px',
                      px: 2,
                      py: 1,
                      '&:hover': { borderColor: 'rgba(201,169,110,0.5)', backgroundColor: 'rgba(201,169,110,0.08)' },
                    }}
                  >
                    {m.file_name}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(201,169,110,0.1)', mb: 2 }} />

        {/* 评论区标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: '1.1rem', color: '#c9a96e' }} />
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: '#c9a96e',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            评论 ({comments.length})
          </Typography>
        </Box>

        {/* 评论列表 */}
        {comments.length === 0 ? (
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.3)',
              fontSize: '0.85rem',
              textAlign: 'center',
              py: 2,
            }}
          >
            暂无评论，来做第一个留言的人吧
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            {comments.map((comment) => (
              <Box
                key={comment.id}
                sx={{
                  backgroundColor: 'rgba(26,26,46,0.4)',
                  border: '1px solid rgba(201,169,110,0.06)',
                  borderRadius: '4px',
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserAvatar name={comment.author} avatarUrl={liveAvatarMap[comment.guest_id ?? '']} size={22} />
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(201,169,110,0.6)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {comment.author}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(201,169,110,0.3)',
                        fontSize: '0.75rem',
                        ml: 1,
                      }}
                    >
                      {formatTime(comment.createdAt)}
                    </Typography>
                    <PrivateChatButton guestId={comment.guest_id} nickname={comment.author} />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => deleteComment(comment.id)}
                    sx={{ color: 'rgba(192,57,43,0.2)', '&:hover': { color: '#c0392b' }, p: 0.3 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--font-serif)',
                    color: 'rgba(245,240,235,0.75)',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {comment.content}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* 评论输入区 */}
        <Box
          sx={{
            backgroundColor: 'rgba(26,26,46,0.3)',
            border: '1px solid rgba(201,169,110,0.08)',
            borderRadius: '4px',
            p: 2,
          }}
        >
          {/* 过滤警告 */}
          {lastWarning && (
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: '#e65100',
                fontSize: '0.8rem',
                mb: 1,
              }}
            >
              ⚠ {lastWarning}
            </Typography>
          )}
          {commentError && (
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: '#c0392b',
                fontSize: '0.8rem',
                mb: 1,
              }}
            >
              {commentError}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
            <UserAvatar name={profile?.nickname || '我'} size={32} />
            <TextField
              label="评论内容"
              value={newComment.content}
              onChange={(e) => {
                setNewComment((prev) => ({ ...prev, content: e.target.value }));
                setCommentError('');
              }}
              placeholder="说点什么..."
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'var(--font-serif)',
                  color: '#f5f0eb',
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                },
                '& .MuiInputLabel-root': {
                  fontFamily: 'var(--font-serif)',
                  color: 'rgba(245,240,235,0.5)',
                  fontSize: '0.85rem',
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              disabled={submitting || !newComment.content.trim()}
              onClick={handleSubmitComment}
              endIcon={<SendIcon sx={{ fontSize: '0.9rem' }} />}
              sx={{
                backgroundColor: 'rgba(201,169,110,0.85)',
                color: '#1a1a2e',
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                '&:hover': { backgroundColor: '#c9a96e' },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(201,169,110,0.3)',
                  color: 'rgba(26,26,46,0.5)',
                },
              }}
            >
              发表评论
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
    </>
  );
}
