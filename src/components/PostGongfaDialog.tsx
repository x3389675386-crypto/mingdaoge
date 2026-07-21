/**
 * 管理员发功法帖 + 上传电子书（P0-7 / 决策2：教材获取=论坛功法栏目）。
 *
 * 仅管理员可用（ForumPage 已按 isAdmin 控制入口）。
 * 帖子 category='gongfa'，电子书上传至 Storage images/gongfa/ 并写入 gongfa_materials。
 * 违规词覆盖标题 / 描述 / 文件名（由 ForumContext.addPost 统一过滤）。
 */

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useForum } from '../context/ForumContext';
import { useAuth } from '../context/AuthContext';
import { getProfanityWarning } from '../utils/profanityFilter';

interface PostGongfaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PostGongfaDialog({ open, onClose, onSuccess }: PostGongfaDialogProps) {
  const { addPost } = useForum();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setContent('');
    setFile(null);
    setFileError('');
    setTitleError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setFileError('电子书大小不能超过 10MB');
      e.target.value = '';
      return;
    }
    setFileError('');
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setTitleError(true); return; }
    if (!file) { setFileError('请上传功法电子书'); return; }

    setSubmitting(true);
    try {
      await addPost({
        author: profile?.nickname || '明道阁',
        title: title.trim(),
        content: content.trim() || '（详见下方电子书）',
        category: 'gongfa',
        ebookFile: file,
      });
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      // 违规词等过滤提示
      const warn = getProfanityWarning(title) || getProfanityWarning(content) || getProfanityWarning(file.name);
      setSnackbar({ open: true, message: warn || msg || '发布失败', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBookIcon /> 发布功法帖
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'rgba(245,240,235,0.5)' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', mb: 2, fontFamily: 'var(--font-serif)' }}>
            功法帖将归入「功法」栏目，并上传一本电子书供道友研习（教材获取）。
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="功法标题"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
              error={titleError}
              helperText={titleError ? '标题不能为空' : ''}
              fullWidth
              sx={fieldSx}
            />
            <TextField
              label="简介 / 描述"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="这门功法的来由、心法要点……"
              sx={fieldSx}
            />
            <Box>
              {file ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid rgba(201,169,110,0.2)', borderRadius: '4px' }}>
                  <MenuBookIcon sx={{ color: '#c9a96e' }} />
                  <Typography sx={{ flex: 1, color: '#f5f0eb', fontSize: '0.85rem', fontFamily: 'var(--font-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </Typography>
                  <IconButton size="small" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} sx={{ color: 'rgba(245,240,235,0.5)' }}>
                    <CloseIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<MenuBookIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderColor: 'rgba(201,169,110,0.3)', color: 'rgba(201,169,110,0.7)', fontFamily: 'var(--font-serif)', fontSize: '0.85rem', textTransform: 'none', '&:hover': { borderColor: 'rgba(201,169,110,0.5)', backgroundColor: 'rgba(201,169,110,0.08)' } }}
                >
                  上传电子书（PDF / EPUB 等）
                </Button>
              )}
              {fileError && (
                <Typography sx={{ color: '#c0392b', fontSize: '0.75rem', mt: 0.5, fontFamily: 'var(--font-serif)' }}>{fileError}</Typography>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.epub,.mobi,.txt,.doc,.docx" hidden onChange={handleFile} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            {submitting ? '发布中…' : '发布'}
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
    </>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
} as const;
