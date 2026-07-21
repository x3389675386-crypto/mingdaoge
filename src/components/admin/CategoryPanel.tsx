/**
 * 后台：论坛分类管理（一期 P0-5 / 决策：原 4 类 + 功法 is_system=true，可改名/排序，不可删）。
 *
 * 复用 ForumContext.categories / refresh（App 已包裹 ForumProvider）。
 * 写操作（改名 / 排序 / 新增非系统类 / 删除非系统类）直接走 forum_categories 表，
 * 受 forum_categories_admin_w RLS 守卫（仅管理员可写）。
 */

import { useState } from 'react';
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
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { supabase } from '../../lib/supabase';
import { useForum } from '../../context/ForumContext';
import type { ForumCategoryDB } from '../../types';

/** 行内编辑草稿 */
interface RowDraft {
  label: string;
  icon: string;
  sort_order: number;
}

/** 新增非系统分类草稿 */
interface NewDraft {
  value: string;
  label: string;
  icon: string;
  sort_order: number;
}

const emptyNew = (): NewDraft => ({ value: '', label: '', icon: '🏷️', sort_order: 99 });

export default function CategoryPanel() {
  const { categories, refresh } = useForum();
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newDraft, setNewDraft] = useState<NewDraft>(emptyNew());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const getDraft = (cat: ForumCategoryDB): RowDraft =>
    drafts[cat.id] ?? { label: cat.label, icon: cat.icon ?? '', sort_order: cat.sort_order };

  const updateDraft = (id: number, patch: Partial<RowDraft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft({ id, label: '', icon: '', sort_order: 0 } as ForumCategoryDB), ...patch } }));

  const handleSaveRow = async (cat: ForumCategoryDB) => {
    const d = getDraft(cat);
    if (!d.label.trim()) {
      setSnackbar({ open: true, message: '分类名称不能为空', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('forum_categories')
        .update({ label: d.label.trim(), icon: d.icon || null, sort_order: d.sort_order })
        .eq('id', cat.id);
      if (error) throw error;
      setSnackbar({ open: true, message: '分类已更新', severity: 'success' });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[cat.id];
        return next;
      });
      await refresh();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '更新失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const value = newDraft.value.trim();
    if (!value || !newDraft.label.trim()) {
      setSnackbar({ open: true, message: 'value 与名称均不能为空', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('forum_categories').insert({
        value,
        label: newDraft.label.trim(),
        icon: newDraft.icon || null,
        sort_order: newDraft.sort_order,
        is_system: false,
      });
      if (error) throw error;
      setSnackbar({ open: true, message: '已新增分类', severity: 'success' });
      setAddOpen(false);
      setNewDraft(emptyNew());
      await refresh();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '新增失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      const { error } = await supabase.from('forum_categories').delete().eq('id', deleteId);
      if (error) throw error;
      setSnackbar({ open: true, message: '分类已删除', severity: 'success' });
      await refresh();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '删除失败', severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CategoryIcon sx={{ color: '#c9a96e' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
            论坛分类管理
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={() => { setNewDraft(emptyNew()); setAddOpen(true); }} sx={outlineBtnSx}>
          新增分类
        </Button>
      </Box>
      <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
        系统分类（灵异 / 手作 / 国风 / 闲聊 / 功法）可改名、排序，但不可删除；新增分类非系统，可删除。
      </Typography>

      {sorted.length === 0 ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>暂无分类</Typography>
      ) : (
        <TableContainer sx={{ border: '1px solid rgba(201,169,110,0.1)', borderRadius: '4px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { color: 'rgba(201,169,110,0.7)', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(201,169,110,0.15)' } }}>
                <TableCell>图标</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>value</TableCell>
                <TableCell>排序</TableCell>
                <TableCell>类型</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((cat) => {
                const d = getDraft(cat);
                const dirty = drafts[cat.id] != null;
                return (
                  <TableRow key={cat.id} sx={{ '& .MuiTableCell-root': { color: '#f5f0eb', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(245,240,235,0.06)' } }}>
                    <TableCell>
                      <TextField value={d.icon} onChange={(e) => updateDraft(cat.id, { icon: e.target.value })} size="small" sx={{ width: 64, ...fieldSx }} />
                    </TableCell>
                    <TableCell>
                      <TextField value={d.label} onChange={(e) => updateDraft(cat.id, { label: e.target.value })} size="small" sx={{ minWidth: 140, ...fieldSx }} />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem' }}>{cat.value}</TableCell>
                    <TableCell>
                      <TextField type="number" value={d.sort_order} onChange={(e) => updateDraft(cat.id, { sort_order: Number(e.target.value) || 0 })} size="small" sx={{ width: 80, ...fieldSx }} />
                    </TableCell>
                    <TableCell>
                      {cat.is_system ? (
                        <Chip label="系统" size="small" sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontSize: '0.7rem' }} />
                      ) : (
                        <Chip label="自定义" size="small" sx={{ backgroundColor: 'rgba(120,120,120,0.2)', color: 'rgba(245,240,235,0.6)', fontSize: '0.7rem' }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleSaveRow(cat)} disabled={!dirty || saving} sx={{ color: dirty ? '#c9a96e' : 'rgba(245,240,235,0.25)' }}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                      {!cat.is_system && (
                        <IconButton size="small" onClick={() => setDeleteId(cat.id)} sx={{ color: 'rgba(192,57,43,0.8)' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新增弹窗 */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>新增分类</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="value（英文标识，唯一）" value={newDraft.value} onChange={(e) => setNewDraft({ ...newDraft, value: e.target.value })} sx={fieldSx} />
            <TextField label="名称" value={newDraft.label} onChange={(e) => setNewDraft({ ...newDraft, label: e.target.value })} sx={fieldSx} />
            <TextField label="图标 emoji" value={newDraft.icon} onChange={(e) => setNewDraft({ ...newDraft, icon: e.target.value })} sx={fieldSx} />
            <TextField label="排序" type="number" value={newDraft.sort_order} onChange={(e) => setNewDraft({ ...newDraft, sort_order: Number(e.target.value) || 0 })} sx={fieldSx} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleAdd} disabled={saving} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            {saving ? '新增中…' : '新增'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(245,240,235,0.7)', fontFamily: 'var(--font-serif)' }}>删除自定义分类后不可恢复，确定？</Typography>
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

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
} as const;

const outlineBtnSx = {
  borderColor: 'rgba(201,169,110,0.4)',
  color: '#c9a96e',
  fontFamily: 'var(--font-serif)',
  textTransform: 'none',
  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
} as const;
