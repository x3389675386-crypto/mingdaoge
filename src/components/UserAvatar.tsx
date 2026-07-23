import { Avatar } from '@mui/material';

/** 统一的金色昵称首字头像（全站论坛 / 个人中心复用） */
export default function UserAvatar({ name, size = 32 }: { name?: string; size?: number }) {
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
