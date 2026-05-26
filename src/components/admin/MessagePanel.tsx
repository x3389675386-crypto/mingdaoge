import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  Box,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMessages } from '../../context/MessageContext';

/** 格式化时间 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagePanel() {
  const { messages, markRead, markUnread, deleteMessage, unreadCount } = useMessages();

  return (
    <div>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem' }}>
          客户留言
          <span className="text-gold/40 text-sm ml-2">共 {messages.length} 条</span>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} 条未读`}
              size="small"
              sx={{
                ml: 1,
                backgroundColor: 'rgba(192,57,43,0.15)',
                color: '#e74c3c',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.75rem',
              }}
            />
          )}
        </Typography>
      </div>

      {messages.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography
            sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.3)', fontSize: '0.95rem' }}
          >
            暂无客户留言
          </Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: 'rgba(22,33,62,0.4)',
            border: '1px solid rgba(201,169,110,0.1)',
            borderRadius: '4px',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 120 }}>时间</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 80 }}>称呼</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 140 }}>联系方式</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)' }}>留言内容</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 80 }}>状态</TableCell>
                <TableCell sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.6)', borderBottomColor: 'rgba(201,169,110,0.08)', width: 100 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map((msg) => (
                <TableRow
                  key={msg.id}
                  sx={{
                    backgroundColor: msg.read ? 'transparent' : 'rgba(201,169,110,0.04)',
                    '&:hover': { backgroundColor: 'rgba(201,169,110,0.03)' },
                    '& td': { borderBottomColor: 'rgba(201,169,110,0.06)' },
                  }}
                >
                  {/* 时间 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: msg.read ? 'rgba(245,240,235,0.5)' : '#f5f0eb',
                        fontSize: '0.8rem',
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                  </TableCell>

                  {/* 称呼 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: msg.read ? 'rgba(245,240,235,0.5)' : '#c9a96e',
                        fontSize: '0.85rem',
                        fontWeight: msg.read ? 400 : 600,
                      }}
                    >
                      {msg.name}
                    </Typography>
                  </TableCell>

                  {/* 联系方式 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: msg.read ? 'rgba(245,240,235,0.4)' : '#f5f0eb',
                        fontSize: '0.85rem',
                      }}
                    >
                      {msg.contact}
                    </Typography>
                  </TableCell>

                  {/* 留言内容 */}
                  <TableCell>
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        color: msg.read ? 'rgba(245,240,235,0.4)' : 'rgba(245,240,235,0.8)',
                        fontSize: '0.85rem',
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {msg.message || '—'}
                    </Typography>
                  </TableCell>

                  {/* 状态 */}
                  <TableCell>
                    <Chip
                      label={msg.read ? '已读' : '未读'}
                      size="small"
                      sx={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.7rem',
                        backgroundColor: msg.read ? 'rgba(201,169,110,0.08)' : 'rgba(192,57,43,0.15)',
                        color: msg.read ? 'rgba(201,169,110,0.6)' : '#e74c3c',
                      }}
                    />
                  </TableCell>

                  {/* 操作 */}
                  <TableCell>
                    <div className="flex gap-1 items-center">
                      <Tooltip title={msg.read ? '标记未读' : '标记已读'}>
                        <IconButton
                          size="small"
                          onClick={() => msg.read ? markUnread(msg.id) : markRead(msg.id)}
                          sx={{ color: msg.read ? 'rgba(201,169,110,0.4)' : '#c9a96e' }}
                        >
                          {msg.read ? <RadioButtonUncheckedIcon sx={{ fontSize: '1rem' }} /> : <CheckCircleIcon sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          onClick={() => deleteMessage(msg.id)}
                          sx={{ color: 'rgba(192,57,43,0.4)' }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
