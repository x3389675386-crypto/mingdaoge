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
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMessages } from '../context/MessageContext';

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactDialog({ open, onClose }: ContactDialogProps) {
  const { addMessage } = useMessages();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState(false);
  const [contactError, setContactError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  /** 重置表单 */
  const resetForm = () => {
    setName('');
    setContact('');
    setMessage('');
    setNameError(false);
    setContactError(false);
  };

  /** 提交留言 */
  const handleSubmit = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError(true);
      valid = false;
    }
    if (!contact.trim()) {
      setContactError(true);
      valid = false;
    }
    if (!valid) return;

    addMessage({ name: name.trim(), contact: contact.trim(), message: message.trim() });
    resetForm();
    setSnackbarOpen(true);
    onClose();
  };

  /** 处理关闭 */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  /** 输入框统一样式 */
  const fieldSx = {
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
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          联系我们
          <IconButton onClick={handleClose} sx={{ color: 'rgba(201,169,110,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="称呼"
              value={name}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
              fullWidth
              required
              error={nameError}
              helperText={nameError ? '请输入您的称呼' : ''}
              placeholder="张先生"
              sx={fieldSx}
            />

            <TextField
              label="联系方式"
              value={contact}
              onChange={(e) => { setContact(e.target.value); if (e.target.value.trim()) setContactError(false); }}
              fullWidth
              required
              error={contactError}
              helperText={contactError ? '请输入联系方式' : ''}
              placeholder="微信号/手机号/QQ"
              sx={fieldSx}
            />

            <TextField
              label="留言内容"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="想要小叶紫檀那款"
              sx={fieldSx}
            />

            {/* 隐私提示 */}
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: '0.75rem',
                color: 'rgba(201,169,110,0.5)',
                lineHeight: 1.6,
              }}
            >
              🔒 您的联系方式仅店主可见，其他用户无法查看
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.85)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              py: 1.2,
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            提交留言
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            fontFamily: 'var(--font-serif)',
            backgroundColor: 'rgba(201,169,110,0.9)',
            color: '#1a1a2e',
            fontWeight: 600,
          }}
        >
          留言已提交，我们会尽快联系您！
        </Alert>
      </Snackbar>
    </>
  );
}
