import { IconButton, Tooltip } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateChatButtonProps {
  /** 对方聊天身份 guest_id；为空（历史内容 / 未落身份）时不渲染按钮 */
  guestId?: string;
  /** 对方展示昵称，用于私聊跳转携带与 tooltip 提示 */
  nickname: string;
}

/**
 * 论坛帖 / 评论 / 晒图作者处的「私聊」入口（P2-3 / P0-3 / P0-4 / P1-1 / P0-5）。
 *
 * 显示规则：
 * - guest_id 为空（旧内容 / 未落身份）→ 不渲染（P0-5 降级）
 * - guest_id 等于自己 → 不渲染（P1-1，不能和自己聊）
 *
 * 点击：navigate('/chat?peer=<guestId>&name=<nickname>')，由 ChatPage 读参后自动建会话（方案 B，Q1）。
 * 同时 stopPropagation，避免触发卡片其它点击（如打开详情）。
 */
export default function PrivateChatButton({ guestId, nickname }: PrivateChatButtonProps) {
  const navigate = useNavigate();
  const { getMyGuestId } = useAuth();
  const myId = getMyGuestId();

  // 无 guest_id（旧内容 / 未落身份）或作者即自己 → 隐藏按钮
  if (!guestId || guestId === myId) return null;

  const displayName = nickname || '匿名道友';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止冒泡触发卡片点击（如打开帖子详情）
    navigate(
      `/chat?peer=${encodeURIComponent(guestId)}&name=${encodeURIComponent(displayName)}`
    );
  };

  return (
    <Tooltip title={`与 ${displayName} 私聊`}>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label="私聊"
        sx={{
          color: '#c9a96e',
          p: 0.3,
          ml: 0.3,
          '&:hover': {
            color: '#e0c089',
            backgroundColor: 'rgba(201,169,110,0.15)',
          },
        }}
      >
        <ChatIcon sx={{ fontSize: '0.95rem' }} />
      </IconButton>
    </Tooltip>
  );
}
