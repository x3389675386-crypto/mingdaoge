/**
 * 后台：阳德提现审核（决策4：≥1000 且整千 / 无手续费 / 无单笔上限 / 记录制）。
 *
 * 读取全部 cashout 订单（listAllOrders 过滤 kind='cashout'），
 * 管理员逐单处理：approve（通过）/ reject（驳回退回阳德）/ fulfill（标记已兑付）。
 * 状态流转：pending → approved/fulfilled，approved → fulfilled。
 * 操作经 approve_cashout RPC（is_admin 守卫），前端不直接改表。
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
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { listAllOrders } from '../../lib/exchange';
import { approveCashout } from '../../lib/reward';
import { supabase } from '../../lib/supabase';
import type { ExchangeOrder } from '../../types';

/** 用户昵称 / ID 映射 */
interface UserBrief {
  nickname: string;
  user_code: string | null;
}

export default function CashoutPanel() {
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserBrief>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; action: 'approve' | 'reject' | 'fulfill' } | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: true,
    message: '',
    severity: 'success',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAllOrders();
    const cashouts = data.filter((o) => o.kind === 'cashout');
    setOrders(cashouts);
    // 批量解析用户名
    const userIds = Array.from(new Set(cashouts.map((o) => o.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, nickname, user_code')
        .in('id', userIds);
      const map: Record<string, UserBrief> = {};
      (users as Array<{ id: string; nickname: string; user_code: string | null }> | null)?.forEach((u) => {
        map[u.id] = { nickname: u.nickname || '道友', user_code: u.user_code ?? null };
      });
      setUserMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConfirm = async () => {
    if (!confirm) return;
    setProcessing(confirm.id);
    try {
      await approveCashout(confirm.id, confirm.action);
      const label = confirm.action === 'approve' ? '已通过' : confirm.action === 'reject' ? '已驳回并退回阳德' : '已标记兑付';
      setSnackbar({ open: true, message: `订单 #${confirm.id} ${label}`, severity: 'success' });
      setConfirm(null);
      await load();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '操作失败', severity: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const canApprove = (status: string) => status === 'pending';
  const canReject = (status: string) => status === 'pending' || status === 'approved';
  const canFulfill = (status: string) => status === 'approved';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PaymentsIcon sx={{ color: '#c9a96e' }} />
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
          阳德提现审核
        </Typography>
      </Box>
      <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
        最低 1000、整千、无手续费、无单笔上限。通过 → 待兑付；驳回 → 退回阳德；兑付 → 完成。
      </Typography>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#c9a96e' }} /></Box>
      ) : orders.length === 0 ? (
        <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)', py: 4 }}>暂无提现申请</Typography>
      ) : (
        <TableContainer sx={{ border: '1px solid rgba(201,169,110,0.1)', borderRadius: '4px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { color: 'rgba(201,169,110,0.7)', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(201,169,110,0.15)' } }}>
                <TableCell>申请人</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>备注</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>申请时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => {
                const u = userMap[o.user_id];
                return (
                  <TableRow key={o.id} sx={{ '& .MuiTableCell-root': { color: '#f5f0eb', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(245,240,235,0.06)' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem' }}>{u?.nickname ?? '道友'}</Typography>
                      {u?.user_code && (
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(245,240,235,0.45)' }}>{u.user_code}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#c9a96e', fontWeight: 600 }}>{o.amount} 阳德</TableCell>
                    <TableCell sx={{ color: 'rgba(245,240,235,0.6)', fontSize: '0.8rem' }}>{o.note ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={statusLabel(o.status)} size="small" sx={{ backgroundColor: statusColor(o.status), color: '#1a1a2e', fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.75rem' }}>{new Date(o.created_at).toLocaleString('zh-CN')}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {canApprove(o.status) && (
                          <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => setConfirm({ id: o.id, action: 'approve' })} disabled={processing === o.id} sx={actionBtnSx('#7cb342')}>通过</Button>
                        )}
                        {canFulfill(o.status) && (
                          <Button size="small" startIcon={<DoneAllIcon />} onClick={() => setConfirm({ id: o.id, action: 'fulfill' })} disabled={processing === o.id} sx={actionBtnSx('#c9a96e')}>兑付</Button>
                        )}
                        {canReject(o.status) && (
                          <Button size="small" startIcon={<CancelIcon />} onClick={() => setConfirm({ id: o.id, action: 'reject' })} disabled={processing === o.id} sx={actionBtnSx('#c0392b')}>驳回</Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={confirm != null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth
        sx={{ '& .MuiDialog-paper': { backgroundColor: '#16213e', border: '1px solid rgba(201,169,110,0.15)', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e' }}>确认操作</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'rgba(245,240,235,0.7)', fontFamily: 'var(--font-serif)' }}>
            {confirm?.action === 'approve' && '将通过该提现申请（进入待兑付）。'}
            {confirm?.action === 'reject' && '将驳回并退回对应阳德给申请人。'}
            {confirm?.action === 'fulfill' && '将标记该提现已兑付完成。'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
          <Button onClick={handleConfirm} disabled={processing != null} variant="contained"
            sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', '&:hover': { backgroundColor: '#c9a96e' } }}
          >
            {processing != null ? '处理中…' : '确认'}
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
    </Box>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return '待审核';
    case 'approved': return '已通过';
    case 'rejected': return '已驳回';
    case 'fulfilled': return '已兑付';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'pending': return '#e0a96d';
    case 'approved': return '#c9a96e';
    case 'rejected': return '#c0392b';
    case 'fulfilled': return '#7cb342';
    default: return '#888';
  }
}

const actionBtnSx = (color: string) => ({
  color,
  borderColor: `${color}66`,
  fontFamily: 'var(--font-serif)',
  textTransform: 'none',
  fontSize: '0.75rem',
  '&:hover': { borderColor: color, backgroundColor: `${color}22` },
  '&.Mui-disabled': { color: 'rgba(245,240,235,0.3)', borderColor: 'rgba(245,240,235,0.15)' },
});
