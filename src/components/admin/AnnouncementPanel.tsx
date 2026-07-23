/**
 * 后台：公告管理（第 11 个 Tab）。
 *
 * 对应 supabase/migrations/040_announcements.sql 的 public.announcements 表。
 * 写操作受 announcements_admin_all RLS 守卫（仅 is_admin() 可写）。
 * 提供：① 新增（tag/title/content，active 默认 true）② 编辑 ③ 上下架切换 ④ 删除。
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface AnnouncementRow {
  id: string;
  tag: string;
  title: string;
  content: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

const emptyForm = (): Omit<AnnouncementRow, 'id'> => ({
  tag: '公告',
  title: '',
  content: '',
  active: true,
  sort_order: 0,
});

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--font-serif)',
    color: '#f5f0eb',
    '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
  },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
} as const;

const outlineBtnSx = {
  borderColor: 'rgba(201,169,110,0.4)',
  color: '#c9a96e',
  fontFamily: 'var(--font-serif)',
  textTransform: 'none',
  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
} as const;

export default function AnnouncementPanel() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<AnnouncementRow, 'id'>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSnackbar({ open: true, message: 'Supabase 未配置，无法读取公告', severity: 'error' });
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[明道阁] 加载公告失败:', error);
      setSnackbar({ open: true, message: '加载公告失败：' + error.message, severity: 'error' });
    } else {
      setRows((data as AnnouncementRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: AnnouncementRow) => {
    setEditingId(row.id);
    setForm({ tag: row.tag, title: row.title, content: row.content, active: row.active, sort_order: row.sort_order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setSnackbar({ open: true, message: '标题不能为空', severity: 'error' });
      return;
    }
    if (!form.content.trim()) {
      setSnackbar({ open: true, message: '内容不能为空', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            tag: form.tag.trim(),
            title: form.title.trim(),
            content: form.content.trim(),
            active: form.active,
            sort_order: Number(form.sort_order) || 0,
          })
          .eq('id', editingId);
        if (error) throw error;
        setSnackbar({ open: true, message: '公告已更新', severity: 'success' });
      } else {
        const { error } = await supabase.from('announcements').insert({
          tag: form.tag.trim(),
          title: form.title.trim(),
          content: form.content.trim(),
          active: form.active,
          sort_order: Number(form.sort_order) || 0,
        });
        if (error) throw error;
        setSnackbar({ open: true, message: '公告已新增', severity: 'success' });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '保存失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: AnnouncementRow) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active: !row.active })
        .eq('id', row.id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '切换失败', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      setSnackbar({ open: true, message: '公告已删除', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '删除失败', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CampaignIcon sx={{ color: '#c9a96e' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
            公告管理
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={openAdd} sx={outlineBtnSx}>
          新增公告
        </Button>
      </Box>
      <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
        仅上架（active）的公告会在首页公告条展示；关闭即下架，前台立刻隐藏。写操作仅管理员可用。
      </Typography>

      {loading ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>
          加载中…
        </Typography>
      ) : rows.length === 0 ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>
          暂无公告，点击右上角「新增公告」
        </Typography>
      ) : (
        <TableContainer sx={{ border: '1px solid rgba(201,169,110,0.1)', borderRadius: '4px' }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  '& .MuiTableCell-root': {
                    color: 'rgba(201,169,110,0.7)',
                    fontFamily: 'var(--font-serif)',
                    borderBottom: '1px solid rgba(201,169,110,0.15)',
                  },
                }}
              >
                <TableCell>标签</TableCell>
                <TableCell>标题</TableCell>
                <TableCell>内容</TableCell>
                <TableCell>排序</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{ '& .MuiTableCell-root': { color: '#f5f0eb', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(245,240,235,0.06)' } }}
                >
                  <TableCell>
                    <Chip
                      label={row.tag}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(201,169,110,0.15)',
                        color: '#c9a96e',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-serif)',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{row.title}</TableCell>
                  <TableCell
                    sx={{
                      color: 'rgba(245,240,235,0.6)',
                      fontSize: '0.8rem',
                      maxWidth: 320,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.content}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{row.sort_order}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.active ? '上架' : '下架'}
                      size="small"
                      sx={{
                        backgroundColor: row.active ? 'rgba(67,160,71,0.18)' : 'rgba(120,120,120,0.18)',
                        color: row.active ? '#81c784' : 'rgba(245,240,235,0.55)',
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <FormControlLabel
                      control={<Switch size="small" checked={row.active} onChange={() => toggleActive(row)} />}
                      label=""
                      sx={{ mr: 0.5 }}
                    />
                    <IconButton size="small" onClick={() => openEdit(row)} sx={{ color: 'rgba(201,169,110,0.8)' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteId(row.id)} sx={{ color: 'rgba(192,57,43,0.8)' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新增 / 编辑弹窗 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>{editingId ? '编辑公告' : '新增公告'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="标签（如 新功能/活动/公告）"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                sx={fieldSx}
              />
              <TextField
                label="排序"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                sx={{ width: 100, ...fieldSx }}
              />
            </Box>
            <TextField
              label="标题"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              sx={fieldSx}
            />
            <TextField
              label="内容"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              multiline
              rows={4}
              sx={fieldSx}
            />
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
              label={<Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.7)', fontSize: '0.85rem' }}>上架（在前台展示）</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        maxWidth="xs"
        fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(245,240,235,0.7)', fontFamily: 'var(--font-serif)' }}>删除公告后不可恢复，确定？</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ fontFamily: 'var(--font-serif)' }}>删除</Button>
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
