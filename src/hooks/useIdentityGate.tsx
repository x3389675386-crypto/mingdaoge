import { useCallback, useRef, useState, type ReactNode } from 'react';
import NicknameDialog from '../components/NicknameDialog';
import { useChat } from '../context/ChatContext';
import { getGuest } from '../lib/guestIdentity';

/**
 * 发布身份闸（P2-3 / Q5 / P0-2 行为变更）。
 *
 * 论坛发帖 / 评论 / 晒图发布前，必须先确保已设置聊天昵称（即已落 guest_id 身份）。
 * - 已有昵称：立即执行被拦截的发布动作；
 * - 无昵称：弹出 NicknameDialog 引导设置，设置成功后自动执行发布动作；
 *           （取消设置则不执行，发布被中止）
 *
 * 与 ChatPage 现有的「首访填昵称」逻辑互不干扰：本 Hook 各自渲染独立的 NicknameDialog 实例，
 * 仅在调用方（发布入口）内部挂载 dialog 节点。
 */
export function useIdentityGate() {
  const { ensureIdentity } = useChat();
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  /** 包裹发布动作：有昵称立即执行，无昵称则弹窗引导后再执行 */
  const withIdentity = useCallback(
    (action: () => void) => {
      if (ensureIdentity()) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setOpen(true);
    },
    [ensureIdentity]
  );

  /** 昵称弹窗关闭：通过 localStorage 同步读取判断是否已成功设置昵称 */
  const handleClose = useCallback(() => {
    setOpen(false);
    const g = getGuest();
    if (g && g.nickname && g.nickname.trim()) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action) action();
    } else {
      // 取消设置昵称，丢弃待执行的发布动作
      pendingActionRef.current = null;
    }
  }, []);

  const dialog: ReactNode = <NicknameDialog open={open} onClose={handleClose} />;

  return { withIdentity, dialog };
}
