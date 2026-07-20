import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useChat } from '../context/ChatContext';
import { containsProfanity, getProfanityWarning } from '../utils/profanityFilter';

/** 首次设置昵称弹窗 */
export default function NicknameDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { setNickname } = useChat();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('昵称不能为空');
      return;
    }
    if (trimmed.length > 20) {
      setError('昵称不能超过 20 字');
      return;
    }
    const filter = containsProfanity(trimmed);
    if (!filter.clean) {
      setError(getProfanityWarning(trimmed) || '昵称包含过多违规词');
      return;
    }
    setNickname(filter.filteredText);
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
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
          textAlign: 'center',
        }}
      >
        设置昵称
      </DialogTitle>
      <DialogContent>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.5)',
            fontSize: '0.8rem',
            mb: 2,
            textAlign: 'center',
          }}
        >
          无需注册，填写一个昵称即可发起和接收私信
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="昵称"
          placeholder="匿名道友"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error || ' '}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: 'var(--font-serif)',
              color: '#f5f0eb',
              '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
            },
            '& .MuiInputLabel-root': {
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.5)',
            },
            '& .MuiFormHelperText-root': { fontFamily: 'var(--font-serif)' },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleConfirm}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.85)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              py: 1,
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            确定
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
