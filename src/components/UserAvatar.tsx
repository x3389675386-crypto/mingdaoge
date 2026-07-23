import { Avatar } from '@mui/material';

/**
 * 统一的用户头像组件（全站论坛 / 个人中心 / 导航栏复用）。
 *
 * 优先展示真实头像图片（avatarUrl）；未上传时回退为「昵称首字 + 金色圆形」占位头像。
 *
 * @param name 昵称（无头像时取首字；缺省显示 '?'）
 * @param avatarUrl 头像图片 URL（Storage images 桶 avatars/ 前缀下的公共读 URL），可为空
 * @param size 头像直径（px），默认 32
 */
export default function UserAvatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name?: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <Avatar
        src={avatarUrl}
        sx={{ width: size, height: size, bgcolor: '#c9a96e', color: '#1a1a2e' }}
      />
    );
  }
  const ch = (name && name.trim()[0]) || '?';
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: '#c9a96e',
        color: '#1a1a2e',
        fontWeight: 700,
        fontSize: size * 0.45,
      }}
    >
      {ch}
    </Avatar>
  );
}
