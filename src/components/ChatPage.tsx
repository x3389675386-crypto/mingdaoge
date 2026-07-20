import { Box, Typography } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatView from './ChatView';
import NicknameDialog from './NicknameDialog';
import { useChat } from '../context/ChatContext';
import { isSupabaseConfigured } from '../lib/supabase';
import ChatIcon from '@mui/icons-material/Chat';

/** 私聊页（前台 /chat 路由） */
export default function ChatPage() {
  const { guest } = useChat();

  // 首访（guest 为 null）或昵称为空 → 必须设置昵称
  const needsNickname = !guest || !guest.nickname || !guest.nickname.trim();

  return (
    <>
      <Navbar />
      <Box
        sx={{
          pt: 10,
          background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)',
          borderBottom: '1px solid rgba(201,169,110,0.1)',
        }}
      >
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChatIcon sx={{ fontSize: '2rem', color: '#c9a96e' }} />
          <Box>
            <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: '1.8rem', color: '#c9a96e' }}>
              私信
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
              以文会友 · 暗通私语
            </Typography>
          </Box>
        </Box>
      </Box>

      {!isSupabaseConfigured && (
        <Box
          sx={{
            maxWidth: 1100,
            mx: 'auto',
            width: '100%',
            px: { xs: 2, md: 4 },
            mt: 2,
          }}
        >
          <Typography
            sx={{
              backgroundColor: 'rgba(120,120,120,0.12)',
              color: 'rgba(245,240,235,0.55)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.8rem',
              px: 2,
              py: 1,
              borderRadius: '4px',
              border: '1px solid rgba(245,240,235,0.08)',
            }}
          >
            未连接云端，消息仅本机留存（不实时、不清缓存不丢失）。
          </Typography>
        </Box>
      )}

      <Box sx={{ maxWidth: 1100, mx: 'auto', width: '100%' }}>
        <ChatView />
      </Box>

      <Footer />

      {/* 昵称弹窗：needsNickname 直接驱动 open，避免 null-guest 不弹窗；
          onClose 设为 no-op，防止点击背景关闭后陷入无昵称死锁（确认后由 setNickname 自动隐藏） */}
      <NicknameDialog open={needsNickname} onClose={() => {}} />
    </>
  );
}
