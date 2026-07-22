/**
 * 任务大厅页（P2 修行任务派发系统）。
 *
 * 列出 status='published' 的 cultivation_tasks（全员可见，含 scope=NULL 的任务），
 * 提供「认领」入口。认领逻辑（前端闸，与 claim_task RPC 双重守卫）：
 *   - 未登录        → 提示去登录（跳 /login）
 *   - 顾客          → 提示「顾客不可参与修行任务」（product 规则，顾客不可修行任务）
 *   - 其余身份      → claimTask(id)，成功后刷新列表
 *
 * 视觉沿用深色 + 金（#c9a96e）主题与 var(--font-serif) 衬线字体。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { fetchPublishedTasks, claimTask } from '../lib/task';
import type { CultivationTask, ProofType } from '../types';

/** 身份类型 → 中文标签 */
const IDENTITY_LABELS: Record<string, string> = {
  sanxiu: '散修',
  famai: '法脉',
  customer: '顾客',
};

/** 任务可见范围标签 */
function scopeLabel(scope: string[] | null): string {
  if (!scope || scope.length === 0) return '全员可见';
  return scope.map((s) => IDENTITY_LABELS[s] ?? s).join('、');
}

/** 凭证类型标签 */
function proofTypeLabel(t: ProofType): string {
  if (t === 'text') return '文字凭证';
  if (t === 'image') return '图片凭证';
  return '文字 + 图片';
}

/** 截止时间格式化 */
function formatDeadline(iso: string | null): string {
  if (!iso) return '长期有效';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '长期有效';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 任务卡片 */
function TaskCard({
  task,
  claiming,
  onClaim,
}: {
  task: CultivationTask;
  claiming: boolean;
  onClaim: (task: CultivationTask) => void;
}) {
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
        transition: 'border-color 0.3s',
        '&:hover': { borderColor: 'rgba(201,169,110,0.35)' },
      }}
    >
      <Typography
        sx={{
          fontFamily: 'var(--font-serif)',
          color: '#f5f0eb',
          fontSize: '1.15rem',
          fontWeight: 600,
        }}
      >
        {task.title}
      </Typography>

      {task.description && (
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.55)',
            fontSize: '0.85rem',
            lineHeight: 1.7,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {task.reward_yang_de > 0 && (
          <Chip
            label={`阳德 +${task.reward_yang_de}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(201,169,110,0.15)',
              color: '#c9a96e',
              fontFamily: 'var(--font-serif)',
              border: '1px solid rgba(201,169,110,0.3)',
            }}
          />
        )}
        {task.reward_points > 0 && (
          <Chip
            label={`积分 +${task.reward_points}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(201,169,110,0.08)',
              color: 'rgba(201,169,110,0.8)',
              fontFamily: 'var(--font-serif)',
              border: '1px solid rgba(201,169,110,0.2)',
            }}
          />
        )}
        <Chip
          label={proofTypeLabel(task.proof_type)}
          size="small"
          variant="outlined"
          sx={{
            color: 'rgba(245,240,235,0.6)',
            fontFamily: 'var(--font-serif)',
            borderColor: 'rgba(201,169,110,0.2)',
          }}
        />
        <Chip
          label={`范围：${scopeLabel(task.identity_scope)}`}
          size="small"
          variant="outlined"
          sx={{
            color: 'rgba(245,240,235,0.6)',
            fontFamily: 'var(--font-serif)',
            borderColor: 'rgba(201,169,110,0.2)',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.75rem' }}>
          截止：{formatDeadline(task.deadline)}
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.45)', fontSize: '0.75rem' }}>
          已认领：{task.claimed_count}
          {task.slots != null ? ` / ${task.slots}` : ''}
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={() => onClaim(task)}
        disabled={claiming}
        sx={{
          mt: 1,
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(201,169,110,0.9)',
          color: '#1a1a2e',
          fontFamily: 'var(--font-serif)',
          letterSpacing: '0.1em',
          borderRadius: '2px',
          '&:hover': { backgroundColor: '#c9a96e' },
          '&:disabled': { backgroundColor: 'rgba(201,169,110,0.3)', color: 'rgba(26,26,46,0.6)' },
        }}
      >
        {claiming ? '认领中…' : '认领任务'}
      </Button>
    </Paper>
  );
}

export default function TaskHall() {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<CultivationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [snack, setSnack] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchPublishedTasks();
    setTasks(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClaim = async (task: CultivationTask) => {
    if (!isAuthenticated) {
      setSnack({ type: 'info', msg: '请先登录后再认领任务' });
      navigate('/login');
      return;
    }
    // 产品规则：顾客不可参与修行任务
    if (profile?.identity_type === 'customer') {
      setSnack({ type: 'error', msg: '顾客不可参与修行任务' });
      return;
    }
    setClaimingId(task.id);
    try {
      await claimTask(task.id);
      setSnack({ type: 'success', msg: '认领成功，快去完成任务吧！' });
      await load();
    } catch (err) {
      setSnack({
        type: 'error',
        msg: err instanceof Error ? err.message : '认领失败，请重试',
      });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.9) 100%)' }}>
      <Navbar />
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 6 }}>
        <Box sx={{ width: 960, maxWidth: '100%' }}>
          {/* 标题栏 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-calligraphy)',
                  color: '#c9a96e',
                  fontSize: '2rem',
                }}
              >
                修行任务大厅
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-serif)',
                  color: 'rgba(245,240,235,0.45)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.15em',
                }}
              >
                结缘善缘，积功累德
              </Typography>
            </Box>
            {isAuthenticated && (
              <Button
                variant="outlined"
                onClick={() => navigate('/tasks/mine')}
                sx={{
                  color: '#c9a96e',
                  borderColor: 'rgba(201,169,110,0.4)',
                  fontFamily: 'var(--font-serif)',
                  borderRadius: '2px',
                  '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
                }}
              >
                我的任务
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: '#c9a96e' }} />
            </Box>
          ) : tasks.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: '4px',
                backgroundColor: 'rgba(22,33,62,0.4)',
                border: '1px solid rgba(201,169,110,0.1)',
              }}
            >
              <VolunteerActivismIcon sx={{ color: 'rgba(201,169,110,0.5)', fontSize: '2.5rem', mb: 1 }} />
              <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.6)' }}>
                暂无进行中的修行任务，敬请期待
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  claiming={claimingId === task.id}
                  onClaim={handleClaim}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.type ?? 'info'} sx={{ fontFamily: 'var(--font-serif)' }} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
