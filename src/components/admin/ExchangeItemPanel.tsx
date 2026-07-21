/**
 * 后台：兑换项管理（P0-10）。
 *
 * 列表展示 exchange_items，支持新增 / 编辑 / 删除（admin RLS 守卫）。
 * 字段：标题 / 描述 / 消耗种类（阳德·积分）/ 消耗数量 / 类型（手串·现金·法器·清修卡）/ 状态 / 排序 / 库存。
 * 写操作全部经 exchange.ts 的 upsert / delete。
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { listExchangeItems, upsertExchangeItem, deleteExchangeItem, emptyExchangeItem } from '../../lib/exchange';
import type { ExchangeItem, ItemType, CostKind } from '../../types';

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  bracelet: '手串',
  cash: '现金',
  magic_tool: '法器',
  retreat_card: '清修卡',
};

const KIND_LABEL: Record<CostKind, string> = {
  yang_de: '阳德',
  points: '积分',
};

type EditableItem = Omit<ExchangeItem, 'id' | 'created_at' | 'updated_at'> & { id?: number };

export default function ExchangeItemPanel() {
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EditableItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listExchangeItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(emptyExchangeItem());
    setEditOpen(true);
  };

  const openEdit = (item: ExchangeItem) => {
    setEditing({
      id: item.id,
      title: item.title,
      description: item.description,
      cost_kind: item.cost_kind,
      cost_amount: item.cost_amount,
      stock: item.stock,
      item_type: item.item_type,
      status: item.status,
      sort_order: item.sort_order,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setSnackbar({ open: true, message: '标题不能为空', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      await upsertExchangeItem(editing);
      setSnackbar({ open: true, message: editing.id ? '兑换项已更新' : '兑换项已新增', severity: 'success' });
      setEditOpen(false);
      await load();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '保存失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteExchangeItem(deleteId);
      setSnackbar({ open: true, message: '兑换项已删除', severity: 'success' });
      await load();
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
          <StorefrontIcon sx={{ color: '#c9a96e' }} />
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
            兑换项管理
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={openCreate} sx={outlineBtnSx}>
          新增兑换项
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#c9a96e' }} /></Box>
      ) : items.length === 0 ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>
          暂无兑换项
        </Typography>
      ) : (
        <TableContainer sx={{ border: '1px solid rgba(201,169,110,0.1)', borderRadius: '4px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { color: 'rgba(201,169,110,0.7)', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(201,169,110,0.15)' } }}>
                <TableCell>标题</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>消耗</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>排序</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} sx={{ '& .MuiTableCell-root': { color: '#f5f0eb', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(245,240,235,0.06)' } }}>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.85rem' }}>{item.title}</Typography>
                    {item.description && (
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(245,240,235,0.4)' }}>{item.description}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{ITEM_TYPE_LABEL[item.item_type]}</TableCell>
                  <TableCell>
                    <Chip label={`${item.cost_amount} ${KIND_LABEL[item.cost_kind]}`} size="small" sx={{ backgroundColor: item.cost_kind === 'yang_de' ? 'rgba(201,169,110,0.15)' : 'rgba(156,39,176,0.2)', color: item.cost_kind === 'yang_de' ? '#c9a96e' : '#ce93d8', fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={item.status === 'active' ? '上架' : '下架'} size="small" sx={{ backgroundColor: item.status === 'active' ? 'rgba(124,179,66,0.2)' : 'rgba(120,120,120,0.2)', color: item.status === 'active' ? '#aed581' : 'rgba(245,240,235,0.5)', fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>{item.sort_order}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: 'rgba(201,169,110,0.7)' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteId(item.id)} sx={{ color: 'rgba(192,57,43,0.8)' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>{editing?.id ? '编辑兑换项' : '新增兑换项'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {editing && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label="标题" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} sx={fieldSx} />
              <TextField label="描述（选填）" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value || null })} multiline rows={2} sx={fieldSx} />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 130, flex: 1 }}>
                  <InputLabel sx={labelSx}>消耗种类</InputLabel>
                  <Select value={editing.cost_kind} label="消耗种类" onChange={(e) => setEditing({ ...editing, cost_kind: e.target.value as CostKind })} sx={selectSx}>
                    <MenuItem value="yang_de">阳德</MenuItem>
                    <MenuItem value="points">积分</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="消耗数量" type="number" value={editing.cost_amount} onChange={(e) => setEditing({ ...editing, cost_amount: Number(e.target.value) || 0 })} sx={{ ...fieldSx, flex: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 130, flex: 1 }}>
                  <InputLabel sx={labelSx}>兑换类型</InputLabel>
                  <Select value={editing.item_type} label="兑换类型" onChange={(e) => setEditing({ ...editing, item_type: e.target.value as ItemType })} sx={selectSx}>
                    <MenuItem value="bracelet">手串</MenuItem>
                    <MenuItem value="cash">现金</MenuItem>
                    <MenuItem value="magic_tool">法器</MenuItem>
                    <MenuItem value="retreat_card">清修卡</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 130, flex: 1 }}>
                  <InputLabel sx={labelSx}>状态</InputLabel>
                  <Select value={editing.status} label="状态" onChange={(e) => setEditing({ ...editing, status: e.target.value as 'active' | 'inactive' })} sx={selectSx}>
                    <MenuItem value="active">上架</MenuItem>
                    <MenuItem value="inactive">下架</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="排序（越小越前）" type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} sx={{ ...fieldSx, flex: 1 }} />
                <TextField label="库存（选填，null 为不限）" type="number" value={editing.stock ?? ''} onChange={(e) => setEditing({ ...editing, stock: e.target.value === '' ? null : Number(e.target.value) })} sx={{ ...fieldSx, flex: 1 }} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleSave} disabled={saving} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(245,240,235,0.7)', fontFamily: 'var(--font-serif)' }}>删除后不可恢复，确定删除该兑换项？</Typography>
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

const labelSx = { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' } as const;

const selectSx = {
  fontFamily: 'var(--font-serif)',
  color: '#f5f0eb',
  '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' },
  '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' },
  '& .MuiSvgIcon-root': { color: '#c9a96e' },
} as const;

const outlineBtnSx = {
  borderColor: 'rgba(201,169,110,0.4)',
  color: '#c9a96e',
  fontFamily: 'var(--font-serif)',
  textTransform: 'none',
  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
} as const;
