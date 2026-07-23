import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { announcements as staticAnnouncements } from '../data/announcements';

/** 公告条目结构（静态与 Supabase 返回字段对齐） */
interface AnnouncementItem {
  id: string;
  tag: string;
  title: string;
  content: string;
}

/**
 * 「不再显示」持久化键。
 * 注意：此前误用 localStorage —— 点一次就永久消失（根因：公告看不见）。
 * 现改为 sessionStorage：刷新页面公告会恢复显示，关闭标签页才清空。
 */
const DISMISSED_KEY = 'mdg_dismissed_announcements';

/** 读取已关闭的公告 ID 集合（会话级） */
function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

/** 写入已关闭的公告 ID 集合（会话级） */
function saveDismissed(ids: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* sessionStorage 不可用时静默降级，仅当前会话内隐藏 */
  }
}

/** 首页顶部可关闭公告条（暗金风格，仅首页挂载） */
export default function AnnouncementBar() {
  // 初始先用静态数据兜底，避免首屏空白；Supabase 就绪后替换
  const [remoteAnnouncements, setRemoteAnnouncements] = useState<AnnouncementItem[] | null>(null);

  // 已关闭集合（会话内可变），初始从 sessionStorage 读取
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [index, setIndex] = useState(0);

  /** 拉取后台公告（已上架、按排序），失败则回退静态数据 */
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('[明道阁] 加载公告失败，回退静态数据:', error);
          return;
        }
        const rows = (data || []) as Array<{ id: string; tag: string; title: string; content: string }>;
        if (rows.length > 0) {
          setRemoteAnnouncements(
            rows.map((r) => ({ id: r.id, tag: r.tag, title: r.title, content: r.content }))
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // 数据源：优先后台公告，未配置或加载失败回退静态
  const all: AnnouncementItem[] =
    remoteAnnouncements && remoteAnnouncements.length > 0 ? remoteAnnouncements : staticAnnouncements;

  /** 仍可见的公告列表（过滤掉已「不再显示」的） */
  const visible = useMemo(
    () => all.filter((a) => !dismissed.has(a.id)),
    [all, dismissed]
  );

  // 列表因关闭变短时，约束 index 不越界
  const safeIndex = visible.length === 0 ? 0 : Math.min(index, visible.length - 1);
  const current = visible[safeIndex];

  /** 上一条 */
  const handlePrev = useCallback(() => {
    setIndex((i) => (i - 1 + visible.length) % visible.length);
  }, [visible.length]);

  /** 下一条 */
  const handleNext = useCallback(() => {
    setIndex((i) => (i + 1) % visible.length);
  }, [visible.length]);

  /** 不再显示当前条：记录 ID 并跳转下一条 */
  const handleDismiss = useCallback(() => {
    if (!current) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      saveDismissed(next);
      return next;
    });
    // 关闭后自动前进到下一条（visible 缩短会触发 safeIndex 约束）
    setIndex((i) => (i + 1) % Math.max(visible.length, 1));
  }, [current, visible.length]);

  // 全部关闭后不渲染任何内容
  if (visible.length === 0 || !current) {
    return null;
  }

  const showArrows = visible.length > 1;

  return (
    <Box
      component="section"
      role="region"
      aria-label="站点公告"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        backgroundColor: 'rgba(22, 33, 62, 0.92)',
        borderBottom: '1px solid rgba(201,169,110,0.18)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 1.4,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 46,
        }}
      >
        {/* 左切换（多条时显示） */}
        {showArrows && (
          <IconButton
            aria-label="上一条公告"
            size="small"
            onClick={handlePrev}
            sx={{
              color: 'rgba(201,169,110,0.55)',
              '&:hover': { color: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        )}

        {/* 标签 */}
        <Chip
          label={current.tag}
          size="small"
          sx={{
            flexShrink: 0,
            height: 22,
            fontFamily: 'var(--font-serif)',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: '#1a1a2e',
            backgroundColor: 'rgba(201,169,110,0.85)',
            fontWeight: 600,
            '& .MuiChip-label': { px: 1 },
          }}
        />

        {/* 正文 */}
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <Typography
            component="span"
            sx={{
              fontFamily: 'var(--font-serif)',
              color: '#f5f0eb',
              fontSize: { xs: '0.8rem', md: '0.85rem' },
              letterSpacing: '0.02em',
            }}
          >
            <Box
              component="span"
              sx={{ color: '#c9a96e', fontWeight: 600, mr: 1 }}
            >
              {current.title}
            </Box>
            {current.content}
          </Typography>
        </Box>

        {/* 右切换（多条时显示） */}
        {showArrows && (
          <IconButton
            aria-label="下一条公告"
            size="small"
            onClick={handleNext}
            sx={{
              color: 'rgba(201,169,110,0.55)',
              '&:hover': { color: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' },
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: '0.9rem' }} />
          </IconButton>
        )}

        {/* 不再显示 */}
        <IconButton
          aria-label="不再显示此公告"
          size="small"
          onClick={handleDismiss}
          title="不再显示"
          sx={{
            color: 'rgba(245,240,235,0.4)',
            flexShrink: 0,
            '&:hover': { color: '#f5f0eb', backgroundColor: 'rgba(245,240,235,0.06)' },
          }}
        >
          <CloseIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
}
