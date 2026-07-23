/**
 * 我的任务页（P2 修行任务派发系统）。
 *
 * 读取当前用户的认领记录（task_claims，联表任务标题/奖励），分两栏：
 *   - 进行中：status ∈ {claimed, submitted}
 *       · claimed  → 提交凭证（文字 / 图片，按 proof_type 决定）
 *       · submitted → 展示「待审核」
 *   - 已完成：status ∈ {approved, rejected}
 *       · approved → 已通过 + 奖励
 *       · rejected → 已驳回 + 审核意见（可重交）
 *
 * 视觉沿用深色 + 金（#c9a96e）主题。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyClaims,
  submitTask,
  uploadTaskProof,
} from '../lib/task';
import type { MyTaskClaim, ClaimStatus, ProofType } from '../types';

/** 认领状态 → 中文标签 + 颜色 */
const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; color: string }> = {
  claimed: { label: '已认领', color: '#c9a96e' },
  submitted: { label: '待审核', color: '#4a90d9' },
  approved: { label: '已通过', color: '#5cb85c' },
  rejected: { label: '已驳回', color: '#c0392b' },
};

/** 凭证类型标签 */
function proofTypeLabel(t: ProofType): string {
  if (t === 'text') return '文字凭证';
  if (t === 'image') return '图片凭证';
  return '文字 + 图片';
}

/** 单个认领记录卡片 */
function ClaimCard({
  claim,
  onOpenSubmit,
}: {
  claim: MyTaskClaim;
  onOpenSubmit: (claim: MyTaskClaim) => void;
}) {
  const meta = CLAIM_STATUS_META[claim.status];
  const task = claim.task;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '4px',
        backgroundColor: 'rgba(22, 33, 62, 0.6)',
        border: '1px solid rgba(201,169,110,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.1rem', fontWeight: 600 }}>
          {task?.title ?? '任务'}
        </Typography>
        <Chip
          label={meta.label}
          size="small"
          icon={
            claim.status === 'approved' ? <CheckCircleIcon /> :
            claim.status === 'rejected' ? <CancelIcon /> :
            claim.status === 'submitted' ? <HourglassEmptyIcon /> : undefined
          }
          sx={{
            backgroundColor: `${meta.color}22`,
            color: meta.color,
            fontFamily: 'var(--font-serif)',
            border: `1px solid ${meta.color}55`,
          }}
        />
      </Box>

      {task && (task.reward_yang_de > 0 || task.reward_points > 0) && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {task.reward_yang_de > 0 && (
            <Chip label={`阳德 +${task.reward_yang_de}`} size="small" sx={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e', fontFamily: 'var(--font-serif)' }} />
          )}
          {task.reward_points > 0 && (
            <Chip label={`积分 +${task.reward_points}`} size="small" sx={{ backgroundColor: 'rgba(201,169,110,0.08)', color: 'rgba(201,169,110,0.8)', fontFamily: 'var(--font-serif)' }} />
          )}
          <Chip label={proofTypeLabel(task.proof_type)} size="small" variant="outlined" sx={{ color: 'rgba(245,240,235,0.6)', fontFamily: 'var(--font-serif)', borderColor: 'rgba(201,169,110,0.2)' }} />
        </Box>
      )}

      {/* 已提交文字凭证预览 */}
      {claim.proof_text && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
          {claim.proof_text}
        </Typography>
      )}
      {/* 已提交图片凭证预览 */}
      {claim.proof_image_url && (
        <Box
          component="img"
          src={claim.proof_image_url}
          alt="凭证"
          sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(201,169,110,0.15)' }}
        />
      )}

      {/* 审核意见 */}
      {claim.review_note && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: claim.status === 'rejected' ? '#e08a82' : 'rgba(245,240,235,0.6)', fontSize: '0.82rem' }}>
          {claim.status === 'rejected' ? '驳回原因：' : '审核备注：'}
          {claim.review_note}
        </Typography>
      )}

      {/* 进行中且尚未提交 → 提交凭证入口 */}
      {claim.status === 'claimed' && (
        <Button
          variant="contained"
          onClick={() => onOpenSubmit(claim)}
          sx={{
            mt: 1,
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(201,169,110,0.9)',
            color: '#1a1a2e',
            fontFamily: 'var(--font-serif)',
            borderRadius: '2px',
            '&:hover': { backgroundColor: '#c9a96e' },
          }}
        >
          提交凭证
        </Button>
      )}
      {claim.status === 'submitted' && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(74,144,217,0.85)', fontSize: '0.82rem' }}>
          凭证已提交，等待管理员审核…
        </Typography>
      )}
      {claim.status === 'rejected' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.7)', fontSize: '0.82rem' }}>
            可重新认领并提交凭证
          </Typography>
          <Button
            variant="contained"
            onClick={() => onOpenSubmit(claim)}
            sx={{
              mt: 0.5,
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(201,169,110,0.9)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              borderRadius: '2px',
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            重新提交凭证
          </Button>
        </Box>
      )}
    </Paper>
  );
}

/** 提交凭证抽屉（内联表单） */
function SubmitForm({
  claim,
  onClose,
  onSubmitted,
}: {
  claim: MyTaskClaim;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const proofType: ProofType = claim.task?.proof_type ?? 'both';
  const needText = proofType === 'text' || proofType === 'both';
  const needImage = proofType === 'image' || proofType === 'both';

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    if (needText && !text.trim() && needImage && !file) {
      setSnack({ type: 'error', msg: '请至少填写文字或上传图片凭证' });
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        setUploading(true);
        imageUrl = await uploadTaskProof(file, user.id);
        setUploading(false);
      }
      await submitTask(claim.task_id, needText ? text.trim() || null : null, imageUrl);
      setSnack({ type: 'success', msg: '凭证已提交，等待审核' });
      onSubmitted();
    } catch (err) {
      setSnack({
        type: 'error',
        msg: err instanceof Error ? err.message : '提交失败，请重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '4px',
        backgroundColor: 'rgba(26,26,46,0.5)',
        border: '1px solid rgba(201,169,110,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#c9a96e', fontSize: '1.2rem' }}>
        提交凭证 · {claim.task?.title ?? '任务'}
      </Typography>

      {needText && (
        <TextField
          label="文字凭证"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } },
            '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
          }}
        />
      )}

      {needImage && (
        <Box>
          <Button
            variant="outlined"
            component="label"
            startIcon={<ImageIcon />}
            sx={{ color: '#c9a96e', borderColor: 'rgba(201,169,110,0.4)', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { borderColor: '#c9a96e' } }}
          >
            选择图片凭证
            <input
              hidden
              accept="image/*"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && (
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)', fontSize: '0.8rem', mt: 1 }}>
              已选：{file.name}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || uploading}
          sx={{ backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { backgroundColor: '#c9a96e' } }}
        >
          {uploading ? '上传中…' : submitting ? '提交中…' : '提交审核'}
        </Button>
        <Button
          variant="text"
          onClick={onClose}
          sx={{ color: 'rgba(245,240,235,0.5)', fontFamily: 'var(--font-serif)' }}
        >
          取消
        </Button>
      </Box>

      {snack && (
        <Alert severity={snack.type} sx={{ fontFamily: 'var(--font-serif)' }} onClose={() => setSnack(null)}>
          {snack.msg}
        </Alert>
      )}
    </Paper>
  );
}

export default function MyTasks() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [claims, setClaims] = useState<MyTaskClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [submitClaim, setSubmitClaim] = useState<MyTaskClaim | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await fetchMyClaims(user.id);
    setClaims(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      void load();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, load]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 'calc(100vh - 64px)' }}>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.3rem' }}>请先登录</Typography>
          <Button variant="contained" onClick={() => navigate('/login')} sx={{ backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', borderRadius: '2px' }}>
            去登录
          </Button>
        </Box>
      </Box>
    );
  }

  const inProgress = claims.filter((c) => c.status === 'claimed' || c.status === 'submitted');
  const done = claims.filter((c) => c.status === 'approved' || c.status === 'rejected');

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 6 }}>
        <Box sx={{ width: 800, maxWidth: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#c9a96e', fontSize: '2rem' }}>我的任务</Typography>
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.85rem', letterSpacing: '0.15em' }}>
                修行足迹，功德所成
              </Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate('/tasks')} sx={{ color: '#c9a96e', borderColor: 'rgba(201,169,110,0.4)', fontFamily: 'var(--font-serif)', borderRadius: '2px', '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' } }}>
              任务大厅
            </Button>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: '1px solid rgba(201,169,110,0.1)',
              mb: 3,
              '& .MuiTab-root': { fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.5)', '&.Mui-selected': { color: '#c9a96e' } },
              '& .MuiTabs-indicator': { backgroundColor: '#c9a96e' },
            }}
          >
            <Tab label={`进行中 (${inProgress.length})`} />
            <Tab label={`已完成 (${done.length})`} />
          </Tabs>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: '#c9a96e' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {submitClaim && (
                <SubmitForm claim={submitClaim} onClose={() => setSubmitClaim(null)} onSubmitted={() => { setSubmitClaim(null); void load(); }} />
              )}

              {tab === 0 &&
                (inProgress.length === 0 ? (
                  <EmptyHint text="还没有进行中的任务，去任务大厅认领一个吧～" />
                ) : (
                  inProgress.map((c) => (
                    <ClaimCard key={c.id} claim={c} onOpenSubmit={setSubmitClaim} />
                  ))
                ))}

              {tab === 1 &&
                (done.length === 0 ? (
                  <EmptyHint text="暂无已完成任务" />
                ) : (
                  done.map((c) => (
                    <ClaimCard key={c.id} claim={c} onOpenSubmit={setSubmitClaim} />
                  ))
                ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/** 空状态提示 */
function EmptyHint({ text }: { text: string }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 6, textAlign: 'center', borderRadius: '4px', backgroundColor: 'rgba(22,33,62,0.4)', border: '1px solid rgba(201,169,110,0.1)' }}
    >
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)' }}>{text}</Typography>
    </Paper>
  );
}
