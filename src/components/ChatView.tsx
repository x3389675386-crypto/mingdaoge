import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SmsIcon from '@mui/icons-material/Sms';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoodIcon from '@mui/icons-material/Mood';
import { useMediaQuery, useTheme } from '@mui/material';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { ADMIN_GUEST_ID, ADMIN_NAME, avatarColor } from '../lib/chatConstants';
import { guestIdSuffix } from '../lib/guestIdentity';
import { uploadChatImage } from '../lib/chatImage';
import { resolveById } from '../lib/chatResolve';
import type { ChatMessage } from '../types';

/** 私聊快捷表情 */
const QUICK_EMOJIS = ['👍', '😂', '🔥', '👏', '💡', '🍀', '🙏', '✨', '🌿', '📿', '💬', '🌟'];

/** 格式化时间 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return d.toLocaleDateString('zh-CN');
}

/** 头像（首字 + 稳定色块） */
function peerInitial(name: string): string {
  return (name || '友').trim().charAt(0) || '友';
}

export default function ChatView({ isAdmin = false }: { isAdmin?: boolean }) {
  const {
    guest,
    conversations,
    messages,
    activeConversationId,
    openConversation,
    sendMessage,
    markRead,
    setNickname,
    getPeer,
  } = useChat();
  const { profile } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileShowList, setMobileShowList] = useState(true);

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [newError, setNewError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const myId = guest?.guest_id ?? null;

  const activeConv = useMemo(() => {
    const found = conversations.find((c) => c.conversationId === activeConversationId);
    if (found) return found;
    // 新会话尚无消息时，回退到已记住的对方信息
    if (activeConversationId) {
      const p = getPeer(activeConversationId);
      if (p) {
        return {
          conversationId: activeConversationId,
          peerId: p.id,
          peerName: p.name,
          lastMessage: '',
          lastAt: new Date().toISOString(),
          unreadCount: 0,
        };
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeConversationId, getPeer]);

  // 自动滚动到底部
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  // 打开会话后自动标记已读
  useEffect(() => {
    if (activeConversationId && activeConv && activeConv.unreadCount > 0) {
      markRead(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, messages]);

  const handleSend = async () => {
    if (!guest || !myId || !activeConv) return;
    const content = text.trim();
    if (!content) return;
    setText('');
    setShowEmoji(false);
    try {
      await sendMessage(activeConv.peerId, activeConv.peerName, content, 'text');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发送失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guest || !myId || !activeConv) return;
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({ open: true, message: '图片大小不能超过10MB', severity: 'warning' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      await sendMessage(activeConv.peerId, activeConv.peerName, '[图片]', 'image', url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '图片发送失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewConversation = async () => {
    const target = newTarget.trim();
    if (!target) {
      setNewError('请输入对方 user_code（MDG-XXXXX）或 guest_id');
      return;
    }
    // 客服快捷入口兜底（管理员固定身份）
    const isAdminTarget = target === ADMIN_GUEST_ID || target.toLowerCase() === 'admin';
    if (isAdminTarget) {
      setNewOpen(false);
      setNewTarget('');
      setNewError('');
      openConversation(ADMIN_GUEST_ID, ADMIN_NAME);
      if (isMobile) setMobileShowList(false);
      return;
    }
    // 按 ID 解析（兼容 user_code MDG-XXXXX 与旧 guest_id）
    const peer = await resolveById(target);
    if (!peer) {
      setNewError('未找到该 ID 对应的用户，请确认后重试');
      return;
    }
    setNewOpen(false);
    setNewTarget('');
    setNewError('');
    openConversation(peer.guest_id, peer.nickname);
    if (isMobile) setMobileShowList(false);
  };

  const handleContactAdmin = () => {
    setNewOpen(false);
    openConversation(ADMIN_GUEST_ID, ADMIN_NAME);
    if (isMobile) setMobileShowList(false);
  };

  const handleEditName = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('昵称不能为空');
      return;
    }
    if (trimmed.length > 20) {
      setEditError('昵称不能超过 20 字');
      return;
    }
    setNickname(trimmed);
    setEditOpen(false);
    setEditName('');
    setEditError('');
    setMenuAnchor(null);
    setSnackbar({ open: true, message: '昵称已更新', severity: 'success' });
  };

  const handleCopyId = () => {
    const copyTarget = profile?.user_code || myId;
    if (copyTarget) {
      navigator.clipboard?.writeText(copyTarget).catch(() => {});
      setSnackbar({
        open: true,
        message: profile?.user_code ? '我的 ID（MDG）已复制' : '我的 guest_id 已复制',
        severity: 'success',
      });
    }
    setMenuAnchor(null);
  };

  // ---------- 左侧会话列表 ----------
  const renderList = (
    <Box
      sx={{
        width: isMobile ? '100%' : 320,
        borderRight: isMobile ? 'none' : '1px solid rgba(201,169,110,0.1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(22,33,62,0.4)',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(201,169,110,0.1)',
        }}
      >
        <SmsIcon sx={{ color: '#c9a96e' }} />
        <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#f5f0eb', fontSize: '1.2rem', flex: 1 }}>
          {isAdmin ? '客服私信' : '私聊'}
        </Typography>
        {!isAdmin && (
          <Tooltip title="更多">
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: 'rgba(201,169,110,0.6)' }}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setNewOpen(true)}
          sx={{
            borderColor: 'rgba(201,169,110,0.3)',
            color: '#c9a96e',
            fontFamily: 'var(--font-serif)',
            textTransform: 'none',
            '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
          }}
        >
          新建会话
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>💬</Typography>
            <Typography sx={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'var(--font-serif)', fontSize: '0.85rem' }}>
              还没有私信？联系客服或新建会话吧。
            </Typography>
            <Button
              size="small"
              onClick={handleContactAdmin}
              sx={{ mt: 1.5, color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none' }}
            >
              联系客服
            </Button>
          </Box>
        ) : (
          conversations.map((c) => {
            const active = c.conversationId === activeConversationId;
            return (
              <Box
                key={c.conversationId}
                onClick={() => {
                  openConversation(c.peerId, c.peerName);
                  if (isMobile) setMobileShowList(false);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  cursor: 'pointer',
                  borderLeft: active ? '3px solid #c9a96e' : '3px solid transparent',
                  backgroundColor: active ? 'rgba(201,169,110,0.1)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(201,169,110,0.06)' },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: avatarColor(c.peerId),
                    width: 40,
                    height: 40,
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1rem',
                  }}
                >
                  {peerInitial(c.peerName)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography
                      sx={{
                        color: '#f5f0eb',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.9rem',
                        fontWeight: c.unreadCount > 0 ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.peerName}
                    </Typography>
                    <Typography sx={{ color: 'rgba(245,240,235,0.35)', fontSize: '0.7rem', flexShrink: 0, ml: 1 }}>
                      {formatTime(c.lastAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
                    <Typography
                      sx={{
                        color: c.unreadCount > 0 ? 'rgba(245,240,235,0.8)' : 'rgba(245,240,235,0.45)',
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-serif)',
                      }}
                    >
                      {c.lastMessage}
                    </Typography>
                    {c.unreadCount > 0 && (
                      <Badge
                        badgeContent={c.unreadCount}
                        sx={{
                          ml: 1,
                          '& .MuiBadge-badge': {
                            backgroundColor: '#c0392b',
                            color: '#f5f0eb',
                            fontSize: '0.65rem',
                            minWidth: 16,
                            height: 16,
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );

  // ---------- 右侧对话窗口 ----------
  const renderWindow = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {activeConv ? (
        <>
          {/* 头部 */}
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid rgba(201,169,110,0.1)',
              backgroundColor: 'rgba(22,33,62,0.6)',
            }}
          >
            {isMobile && (
              <IconButton size="small" onClick={() => setMobileShowList(true)} sx={{ color: '#c9a96e' }}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <Avatar sx={{ bgcolor: avatarColor(activeConv.peerId), width: 36, height: 36, fontFamily: 'var(--font-serif)' }}>
              {peerInitial(activeConv.peerName)}
            </Avatar>
            <Box>
              <Typography sx={{ color: '#f5f0eb', fontFamily: 'var(--font-serif)', fontSize: '0.95rem' }}>
                {activeConv.peerName}
              </Typography>
              <Typography sx={{ color: 'rgba(245,240,235,0.35)', fontSize: '0.7rem' }}>
                ID: {guestIdSuffix(activeConv.peerId)}
              </Typography>
            </Box>
          </Box>

          {/* 消息流 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {messages.map((m: ChatMessage) => {
              const mine = m.senderId === myId;
              return (
                <Box
                  key={m.id}
                  sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}
                >
                  <Box sx={{ maxWidth: '75%' }}>
                    <Box
                      sx={{
                        backgroundColor: mine ? 'rgba(201,169,110,0.9)' : 'rgba(22,33,62,0.8)',
                        color: mine ? '#1a1a2e' : '#f5f0eb',
                        borderRadius: '10px',
                        px: 1.5,
                        py: 1,
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                        border: mine ? 'none' : '1px solid rgba(201,169,110,0.12)',
                      }}
                    >
                      {m.type === 'image' && m.imageUrl ? (
                        <Box
                          component="img"
                          src={m.imageUrl}
                          sx={{ maxWidth: '100%', borderRadius: '6px', display: 'block' }}
                        />
                      ) : (
                        m.content
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: mine ? 'flex-end' : 'flex-start',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 0.3,
                        px: 0.5,
                      }}
                    >
                      <Typography sx={{ color: 'rgba(245,240,235,0.3)', fontSize: '0.65rem' }}>
                        {formatTime(m.createdAt)}
                      </Typography>
                      {mine && (
                        <Typography
                          sx={{
                            color: m.isRead ? 'rgba(201,169,110,0.7)' : 'rgba(245,240,235,0.3)',
                            fontSize: '0.65rem',
                          }}
                        >
                          {m.isRead ? '已读' : '未读'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
            <div ref={listEndRef} />
          </Box>

          {/* 输入区 */}
          <Box sx={{ borderTop: '1px solid rgba(201,169,110,0.1)', p: 1.5, backgroundColor: 'rgba(22,33,62,0.6)' }}>
            {showEmoji && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {QUICK_EMOJIS.map((emoji) => (
                  <Box
                    key={emoji}
                    component="button"
                    onClick={() => setText((t) => t + emoji)}
                    sx={{
                      background: 'rgba(201,169,110,0.06)',
                      border: '1px solid rgba(201,169,110,0.15)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      width: 34,
                      height: 34,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      '&:hover': { backgroundColor: 'rgba(201,169,110,0.18)' },
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="输入消息..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'var(--font-serif)',
                    color: '#f5f0eb',
                    borderRadius: '20px',
                    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
                  },
                }}
              />
              <Tooltip title="表情">
                <IconButton onClick={() => setShowEmoji((s) => !s)} sx={{ color: 'rgba(201,169,110,0.7)' }}>
                  <MoodIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="发送图片">
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{ color: 'rgba(201,169,110,0.7)' }}
                >
                  <ImageIcon />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={handleSend}
                disabled={!text.trim() || uploading}
                sx={{ color: '#1a1a2e', backgroundColor: 'rgba(201,169,110,0.85)', '&:hover': { backgroundColor: '#c9a96e' }, '&.Mui-disabled': { backgroundColor: 'rgba(201,169,110,0.2)', color: 'rgba(245,240,235,0.3)' } }}
              >
                <SendIcon />
              </IconButton>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImage} />
            </Box>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(245,240,235,0.35)',
            fontFamily: 'var(--font-serif)',
          }}
        >
          <Typography sx={{ fontSize: '3rem', mb: 1 }}>💬</Typography>
          <Typography>选择左侧会话，或新建会话开始私聊</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* 移动端：列表/窗口切换 */}
      {isMobile ? (
        mobileShowList ? renderList : renderWindow
      ) : (
        <>
          {renderList}
          {renderWindow}
        </>
      )}

      {/* 更多菜单（仅前台） */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditOpen(true); setEditName(guest?.nickname || ''); setMenuAnchor(null); }}>
          <EditIcon fontSize="small" sx={{ mr: 1, color: '#c9a96e' }} /> 修改昵称
        </MenuItem>
        <MenuItem onClick={handleCopyId}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1, color: '#c9a96e' }} /> 复制我的 ID
        </MenuItem>
      </Menu>

      {/* 新建会话弹窗 */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>新建会话</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', mb: 2, fontFamily: 'var(--font-serif)' }}>
            输入对方的 ID 即可发起私聊：可填 user_code（MDG-XXXXX）或 guest_id（可在对方分享的资料中获取）。
          </Typography>
          <TextField
            fullWidth
            label="对方 ID（MDG-XXXXX 或 guest_id）"
            placeholder="例如 MDG-A1B2C 或 1b9d4c2a-..."
            value={newTarget}
            onChange={(e) => { setNewTarget(e.target.value); setNewError(''); }}
            error={!!newError}
            helperText={newError || ' '}
            sx={{
              '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' } },
              '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
            }}
          />
          <Button
            fullWidth
            onClick={handleContactAdmin}
            sx={{ mt: 2, color: '#c9a96e', fontFamily: 'var(--font-serif)', textTransform: 'none', borderColor: 'rgba(201,169,110,0.3)', border: '1px solid', borderRadius: '4px', py: 1 }}
          >
            联系客服（明道阁客服）
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewOpen(false)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={() => void handleNewConversation()} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            开始
          </Button>
        </DialogActions>
      </Dialog>

      {/* 修改昵称弹窗 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>修改昵称</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="昵称"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
            error={!!editError}
            helperText={editError || ' '}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEditName(); }}
            sx={{
              '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' } },
              '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleEditName} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

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
