import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface ErrorBoundaryProps {
  /** 被保护的子节点 */
  children: ReactNode;
  /** 兜底标题（用于区分不同业务区块） */
  title?: string;
}

interface ErrorBoundaryState {
  /** 捕获到的错误；为 null 表示正常渲染 */
  error: Error | null;
}

/**
 * 通用错误边界（class 组件，唯一能捕获渲染期异常的方式）。
 *
 * 用途：包裹高风险区块（如后台管理面板），避免单点渲染崩溃导致整页白屏。
 * 捕获后展示「出错信息」便于定位（含 error.message），并提供「重试 / 返回前台」操作。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[明道阁] 渲染出错（已被 ErrorBoundary 捕获，避免整页白屏）:', error, info.componentStack);
  }

  /** 重置错误状态后重试 */
  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          px: 3,
          backgroundColor: '#16213e',
          textAlign: 'center',
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: '2.5rem', color: '#c9a96e' }} />
        <Typography
          sx={{
            fontFamily: 'var(--font-calligraphy)',
            color: '#f5f0eb',
            fontSize: '1.4rem',
          }}
        >
          {this.props.title ?? '页面出错了'}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.6)',
            fontSize: '0.85rem',
            maxWidth: 520,
            wordBreak: 'break-word',
          }}
        >
          {error.message || '渲染过程中发生了未知错误'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={this.handleRetry}
            sx={{
              color: '#c9a96e',
              borderColor: 'rgba(201,169,110,0.4)',
              fontFamily: 'var(--font-serif)',
              '&:hover': { borderColor: '#c9a96e' },
            }}
          >
            重试
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              this.handleRetry();
              window.location.href = '/';
            }}
            sx={{
              backgroundColor: 'rgba(201,169,110,0.85)',
              color: '#1a1a2e',
              fontFamily: 'var(--font-serif)',
              '&:hover': { backgroundColor: '#c9a96e' },
            }}
          >
            返回前台
          </Button>
        </Box>
      </Box>
    );
  }
}
