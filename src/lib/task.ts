/**
 * 修行任务派发系统（P2）数据层 RPC 封装。
 *
 * 铁律：任何阳德 / 积分变动必须经以下 RPC 之一（claim_task→审核 approve_task /
 * daily_checkin / grant_daily_merit），RPC 内部必写 reward_ledger。前端严禁直接
 * UPDATE profiles.yang_de / points。
 *
 * 全部沿用 reward.ts 风格：从 './supabase' 导入 supabase / isSupabaseConfigured，
 * RPC 调用失败抛出已映射错误；列表读取失败返回空数组并打日志。
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  CultivationTask,
  TaskClaim,
  MyTaskClaim,
  PendingTaskClaim,
  TaskStatus,
  ClaimStatus,
  ProofType,
} from '../types';

/** 凭证图片 Storage 路径前缀（公开读、仅登录用户写，见 030_task_system.sql） */
export const TASK_PROOF_PREFIX = 'task-proof';

/** 行 → CultivationTask */
function mapDbToTask(row: Record<string, unknown>): CultivationTask {
  return {
    id: row.id as number,
    title: (row.title as string) || '',
    description: (row.description as string) ?? null,
    reward_yang_de: (row.reward_yang_de as number) ?? 0,
    reward_points: (row.reward_points as number) ?? 0,
    proof_type: (row.proof_type as ProofType) ?? 'both',
    identity_scope: (row.identity_scope as string[] | null) ?? null,
    status: (row.status as TaskStatus) ?? 'draft',
    slots: (row.slots as number | null) ?? null,
    claimed_count: (row.claimed_count as number) ?? 0,
    deadline: (row.deadline as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

/** 行 → TaskClaim（携带可选关联任务信息） */
function mapDbToClaim(row: Record<string, unknown>): TaskClaim {
  return {
    id: row.id as number,
    task_id: row.task_id as number,
    user_id: (row.user_id as string) ?? '',
    status: (row.status as ClaimStatus) ?? 'claimed',
    proof_text: (row.proof_text as string) ?? null,
    proof_image_url: (row.proof_image_url as string) ?? null,
    submitted_at: (row.submitted_at as string) ?? null,
    reviewed_at: (row.reviewed_at as string) ?? null,
    review_note: (row.review_note as string) ?? null,
    reward_granted: (row.reward_granted as boolean) ?? false,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

/** 行 → 联表视图（注入关联任务信息） */
function withTask(row: Record<string, unknown>): MyTaskClaim {
  const claim = mapDbToClaim(row) as MyTaskClaim;
  const taskRow = row.cultivation_tasks as Record<string, unknown> | undefined;
  if (taskRow) {
    claim.task = {
      title: (taskRow.title as string) || '',
      reward_yang_de: (taskRow.reward_yang_de as number) ?? 0,
      reward_points: (taskRow.reward_points as number) ?? 0,
      proof_type: (taskRow.proof_type as ProofType) ?? 'both',
    };
  }
  return claim;
}

/** 发布任务入参 */
export interface PublishTaskParams {
  title: string;
  description?: string | null;
  reward_yang_de?: number;
  reward_points?: number;
  proof_type?: ProofType;
  identity_scope?: string[] | null;
  deadline?: string | null;
  slots?: number | null;
  status?: TaskStatus;
}

/** 管理员发布任务（status 默认 published） */
export async function publishTask(params: PublishTaskParams): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法发布任务');
  const { data, error } = await supabase.rpc('publish_task', {
    p_title: params.title,
    p_description: params.description ?? null,
    p_reward_yang_de: params.reward_yang_de ?? 0,
    p_reward_points: params.reward_points ?? 0,
    p_proof_type: params.proof_type ?? 'both',
    p_identity_scope: params.identity_scope ?? null,
    p_deadline: params.deadline ?? null,
    p_slots: params.slots ?? null,
    p_status: params.status ?? 'published',
  });
  if (error) throw error;
  return data as number;
}

/** 认领任务（登录态；顾客不在 scope 等由各 RPC 拦截并返回中文错误） */
export async function claimTask(taskId: number): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法认领任务');
  const { data, error } = await supabase.rpc('claim_task', { p_task_id: taskId });
  if (error) throw error;
  return data as number;
}

/** 提交凭证（本人 claim → submitted；驳回后可重交） */
export async function submitTask(
  taskId: number,
  proofText?: string | null,
  proofImageUrl?: string | null
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法提交凭证');
  const { error } = await supabase.rpc('submit_task', {
    p_task_id: taskId,
    p_proof_text: proofText ?? null,
    p_proof_image_url: proofImageUrl ?? null,
  });
  if (error) throw error;
}

/** 审核通过（仅 admin） */
export async function approveTask(claimId: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法审核');
  const { error } = await supabase.rpc('approve_task', { p_claim_id: claimId });
  if (error) throw error;
}

/** 审核驳回（仅 admin，允许重交） */
export async function rejectTask(claimId: number, note?: string | null): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法审核');
  const { error } = await supabase.rpc('reject_task', { p_claim_id: claimId, p_note: note ?? null });
  if (error) throw error;
}

/** 每日签到：返回本次获得阳德（已签返回 0） */
export async function dailyCheckin(): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法签到');
  const { data, error } = await supabase.rpc('daily_checkin');
  if (error) throw error;
  return (data as number) ?? 0;
}

/** 系统自动功德（发帖 / 结缘）：超每日上限返回 0 */
export async function grantDailyMerit(kind: string, amount: number, dailyCap: number): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法发放功德');
  const { data, error } = await supabase.rpc('grant_daily_merit', {
    p_kind: kind,
    p_amount: amount,
    p_daily_cap: dailyCap,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** 管理员下架任务（status → closed，依赖 is_admin RLS） */
export async function closeTask(taskId: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法下架任务');
  const { error } = await supabase
    .from('cultivation_tasks')
    .update({ status: 'closed' })
    .eq('id', taskId);
  if (error) throw error;
}

/** 上传任务凭证图片到 images/task-proof/，返回公开 URL */
export async function uploadTaskProof(file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('服务暂未配置，无法上传凭证');
  const safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
  const filePath = `${TASK_PROOF_PREFIX}/${userId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('images').upload(filePath, file);
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(filePath);
  return data.publicUrl;
}

/** 读取已发布任务列表（任务大厅） */
export async function fetchPublishedTasks(): Promise<CultivationTask[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('cultivation_tasks')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[明道阁] 加载任务大厅失败:', error);
    return [];
  }
  return (data || []).map(mapDbToTask);
}

/** 读取当前用户的认领记录（MyTasks，join 任务标题与奖励） */
export async function fetchMyClaims(userId: string): Promise<MyTaskClaim[]> {
  if (!isSupabaseConfigured || !userId) return [];
  const { data, error } = await supabase
    .from('task_claims')
    .select('*, cultivation_tasks(title, reward_yang_de, reward_points, proof_type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[明道阁] 加载我的任务失败:', error);
    return [];
  }
  return (data || []).map(withTask);
}

/**
 * 查询当前用户今日是否已签到（用于前端禁用签到按钮）。
 * @returns 今日已签到返回 true
 */
export async function fetchCheckinToday(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('checkin_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle();
  if (error) {
    console.error('[明道阁] 查询签到状态失败:', error);
    return false;
  }
  return !!data;
}

/** 读取待审认领列表（admin，join 任务标题与奖励） */
export async function fetchPendingClaims(): Promise<PendingTaskClaim[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('task_claims')
    .select('*, cultivation_tasks(title, reward_yang_de, reward_points, proof_type)')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true });
  if (error) {
    console.error('[明道阁] 加载待审任务失败:', error);
    return [];
  }
  return (data || []).map((row) => withTask(row) as PendingTaskClaim);
}
