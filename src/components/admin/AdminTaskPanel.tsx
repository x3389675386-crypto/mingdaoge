/**
 * 后台「任务管理」面板（P2 修行任务派发系统）。
 *
 * 三大区块：
 *   1. 发布任务表单（publishTask，status 默认 published）
 *   2. 待审凭证列表（fetchPendingClaims → approve_task / reject_task）
 *   3. 已发布任务列表（fetchPublishedTasks → closeTask 下架）
 *
 * 身份可见范围（identity_scope）：多选 散修/法脉；留空 = 全员可见。
 * 注意：顾客不可参与修行任务（claim_task 与前端双重拦截），故 selector 不含顾客。
 *
 * 视觉沿用后台深色 + 金（#c9a96e）主题。
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  Snackbar,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  publishTask,
  fetchPendingClaims,
  approveTask,
  rejectTask,
  closeTask,
  fetchPublishedTasks,
} from '../../lib/task';
import type { CultivationTask, PendingTaskClaim, ProofType, IdentityType } from '../../types';

/** 身份类型 → 中文标签（selector 仅含修行身份） */
const IDENTITY_LABELS: Record<string, string> = {
  sanxiu: '散修',
  famai: '法脉',
  customer: '顾客',
};

/** 凭证类型选项 */
const PROOF_OPTIONS: { value: ProofType; label: string }[] = [
  { value: 'both', label: '文字 + 图片' },
  { value: 'text', label: '仅文字' },
  { value: 'image', label: '仅图片' },
];

/** 任务可见范围标签 */
function scopeLabel(scope: string[] | null): string {
  if (!scope || scope.length === 0) return '全员可见';
  return scope.map((s) => IDENTITY_LABELS[s] ?? s).join('、');
}

/** 截止时间格式化 */
function formatDeadline(iso: string | null): string {
  if (!iso) return '长期';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '长期';
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminTaskPanel() {
  const [tasks, setTasks] = useState<CultivationTask[]>([]);
  const [pending, setPending] = useState<PendingTaskClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 发布表单
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardYang, setRewardYang] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [proofType, setProofType] = useState<ProofType>('both');
  const [scope, setScope] = useState<IdentityType[]>([]);
  const [deadline, setDeadline] = useState('');
  const [slots, setSlots] = useState('');
  const [publishing, setPublishing] = useState(false);

  // 驳回理由（内联）
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([fetchPublishedTasks(), fetchPendingClaims()]);
    setTasks(t);
    setPending(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePublish = async () => {
    if (!title.trim()) {
      setSnack({ type: 'error', msg: '请填写任务标题' });
      return;
    }
    setPublishing(true);
    try {
      await publishTask({
        title: title.trim(),
        description: description.trim() || null,
        reward_yang_de: Number(rewardYang) || 0,
        reward_points: Number(rewardPoints) || 0,
        proof_type: proofType,
        identity_scope: scope.length ? scope : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        slots: slots ? Number(slots) : null,
        status: 'published',
      });
      setSnack({ type: 'success', msg: '任务已发布' });
      setTitle('');
      setDescription('');
      setRewardYang(0);
      setRewardPoints(0);
      setProofType('both');
      setScope([]);
      setDeadline('');
      setSlots('');
      await refresh();
    } catch (err) {
      setSnack({
        type: 'error',
        msg: err instanceof Error ? err.message : '发布失败，请重试',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleApprove = async (claimId: number) => {
    try {
      await approveTask(claimId);
      setSnack({ type: 'success', msg: '已通过，奖励已发放' });
      await refresh();
    } catch (err) {
      setSnack({ type: 'error', msg: err instanceof Error ? err.message : '审核失败' });
    }
  };

  const handleReject = async (claimId: number) => {
    if (!rejectNote.trim()) {
      setSnack({ type: 'error', msg: '请填写驳回原因' });
      return;
    }
    try {
      await rejectTask(claimId, rejectNote.trim() || null);
      setSnack({ type: 'success', msg: '已驳回' });
      setRejectId(null);
      setRejectNote('');
      await refresh();
    } catch (err) {
      setSnack({ type: 'error', msg: err instanceof Error ? err.message : '驳回失败' });
    }
  };

  const handleClose = async (taskId: number) => {
    try {
      await closeTask(taskId);
      setSnack({ type: 'success', msg: '任务已下架' });
      await refresh();
    } catch (err) {
      setSnack({ type: 'error', msg: err instanceof Error ? err.message : '下架失败' });
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } },
    '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
    '& .MuiSelect-icon': { color: 'rgba(201,169,110,0.6)' },
  };

  return (
    <Box>
      {/* ============ 1. 发布任务 ============ */}
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
        发布任务
      </Typography>
      <Paper elevation={0} sx={{ p: 3, borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,169,110,0.12)', mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <TextField label="任务标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>凭证类型</InputLabel>
            <Select value={proofType} label="凭证类型" onChange={(e) => setProofType(e.target.value as ProofType)}>
              {PROOF_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontFamily: 'var(--font-serif)' }}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="阳德奖励" type="number" value={rewardYang} onChange={(e) => setRewardYang(Number(e.target.value))} fullWidth sx={fieldSx} />
          <TextField label="积分奖励" type="number" value={rewardPoints} onChange={(e) => setRewardPoints(Number(e.target.value))} fullWidth sx={fieldSx} />
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>参与身份</InputLabel>
            <Select
              multiple
              value={scope}
              label="参与身份"
              onChange={(e) => setScope(e.target.value as IdentityType[])}
              renderValue={(sel) => (sel as IdentityType[]).map((s) => IDENTITY_LABELS[s] ?? s).join('、') || '全员可见'}
            >
              <MenuItem value="sanxiu">
                <Checkbox checked={scope.includes('sanxiu')} sx={{ color: '#c9a96e' }} /> 散修
              </MenuItem>
              <MenuItem value="famai">
                <Checkbox checked={scope.includes('famai')} sx={{ color: '#c9a96e' }} /> 法脉
              </MenuItem>
            </Select>
          </FormControl>
          <TextField label="名额上限（留空=不限）" type="number" value={slots} onChange={(e) => setSlots(e.target.value)} fullWidth sx={fieldSx} />
          <TextField label="截止时间（留空=长期）" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} fullWidth sx={{ ...fieldSx, '& input': { colorScheme: 'dark' } }} InputLabelProps={{ shrink: true }} />
          <TextField label="任务描述" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} fullWidth sx={{ ...fieldSx, gridColumn: { md: '1 / -1' } }} />
        </Box>
        <Button
          variant="contained"
          onClick={handlePublish}
          disabled={publishing}
          sx={{ mt: 2, backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { backgroundColor: '#c9a96e' } }}
        >
          {publishing ? '发布中…' : '发布任务'}
        </Button>
      </Paper>

      {/* ============ 2. 待审凭证 ============ */}
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
        待审凭证（{pending.length}）
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#c9a96e' }} /></Box>
      ) : pending.length === 0 ? (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.85rem', mb: 4 }}>暂无待审凭证</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {pending.map((c) => (
            <Paper key={c.id} elevation={0} sx={{ p: 3, borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,169,110,0.12)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontWeight: 600 }}>{c.task?.title ?? '任务'}</Typography>
                <Chip label="待审核" size="small" sx={{ backgroundColor: 'rgba(74,144,217,0.15)', color: '#4a90d9', fontFamily: 'var(--font-serif)' }} />
              </Box>
              {c.proof_text && (
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.65)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', mb: 1 }}>
                  {c.proof_text}
                </Typography>
              )}
              {c.proof_image_url && (
                <Box component="img" src={c.proof_image_url} alt="凭证" sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(201,169,110,0.15)', mb: 1 }} />
              )}

              {rejectId === c.id ? (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    label="驳回原因"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button size="small" variant="contained" color="error" onClick={() => handleReject(c.id)} disabled={!rejectNote.trim()} sx={{ fontFamily: 'var(--font-serif)', borderRadius: '2px' }}>确认驳回</Button>
                    <Button size="small" variant="text" onClick={() => { setRejectId(null); setRejectNote(''); }} sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}>取消</Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button size="small" variant="contained" startIcon={<CheckCircleIcon />} onClick={() => handleApprove(c.id)} sx={{ backgroundColor: '#5cb85c', color: '#1a1a2e', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { backgroundColor: '#4cae4c' } }}>通过</Button>
                  <Button size="small" variant="outlined" startIcon={<CancelIcon />} onClick={() => setRejectId(c.id)} sx={{ color: '#c0392b', borderColor: 'rgba(192,57,43,0.5)', fontFamily: 'var(--font-serif)', borderRadius: '2px' }}>驳回</Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(201,169,110,0.1)', my: 3 }} />

      {/* ============ 3. 已发布任务 ============ */}
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
        已发布任务（{tasks.length}）
      </Typography>
      {tasks.length === 0 ? (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.85rem' }}>暂无已发布任务</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tasks.map((t) => (
            <Paper key={t.id} elevation={0} sx={{ p: 2.5, borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,169,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontWeight: 600 }}>{t.title}</Typography>
                <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.75rem' }}>
                  奖励 阳德+{t.reward_yang_de}/积分+{t.reward_points} · 范围 {scopeLabel(t.identity_scope)} · 已认领 {t.claimed_count}
                  {t.slots != null ? `/${t.slots}` : ''} · 截止 {formatDeadline(t.deadline)}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityOffIcon />}
                onClick={() => handleClose(t.id)}
                sx={{ color: 'rgba(245,240,235,0.6)', borderColor: 'rgba(201,169,110,0.25)', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { borderColor: '#c9a96e', color: '#c9a96e' } }}
              >
                下架
              </Button>
            </Paper>
          ))}
        </Box>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack?.type ?? 'info'} sx={{ fontFamily: 'var(--font-serif)' }} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
