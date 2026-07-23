/**
 * 兑换中心（P0-10 / 决策4：阳德提现）。
 *
 * 双 Tab：阳德兑换（手串 redeem + 现金申请 cashout）、积分兑换（法器 / 清修卡）。
 * 余额读 profile（ExchangeContext），兑换 / 提现走 reward.ts RPC 并生成 exchange_orders。
 * 现金申请校验：≥1000 且整千、无手续费、无单笔上限。
 */

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import RedeemIcon from '@mui/icons-material/Redeem';
import PaymentsIcon from '@mui/icons-material/Payments';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpaIcon from '@mui/icons-material/Spa';
import { useExchange } from '../context/ExchangeContext';
import { useAuth } from '../context/AuthContext';
import { listExchangeItems } from '../lib/exchange';
import type { ExchangeItem, ItemType } from '../types';
import Footer from '../components/Footer';

/** 兑换项类型图标 */
const itemIcon: Record<ItemType, ReactElement> = {
  bracelet: <RedeemIcon sx={{ color: '#c9a96e' }} />,
  cash: <PaymentsIcon sx={{ color: '#c9a96e' }} />,
  magic_tool: <AutoAwesomeIcon sx={{ color: '#c9a96e' }} />,
  retreat_card: <SpaIcon sx={{ color: '#c9a96e' }} />,
};

export default function ExchangePage() {
  const { yang_de, points, orders, redeem, requestCashout, error } = useExchange();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 现金申请表单
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [cashError, setCashError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setItemsLoading(true);
    listExchangeItems().then((data) => {
      if (active) {
        setItems(data);
        setItemsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const yangItems = useMemo(() => items.filter((i) => i.cost_kind === 'yang_de' && i.status === 'active'), [items]);
  const pointItems = useMemo(() => items.filter((i) => i.cost_kind === 'points' && i.status === 'active'), [items]);

  const handleRedeem = async (item: ExchangeItem) => {
    try {
      await redeem(item.id);
      setSnackbar({ open: true, message: `已兑换「${item.title}」`, severity: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '兑换失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleCashout = async () => {
    setCashError('');
    const amt = Number(cashAmount);
    if (!cashAmount.trim() || Number.isNaN(amt) || amt <= 0) {
      setCashError('请输入有效的阳德数量');
      return;
    }
    if (amt < 1000) {
      setCashError('阳德提现最低 1000');
      return;
    }
    if (amt % 1000 !== 0) {
      setCashError('提现金额须为 1000 的整数倍');
      return;
    }
    if (amt > yang_de) {
      setCashError('阳德余额不足');
      return;
    }
    setSubmitting(true);
    try {
      await requestCashout(amt, cashNote.trim() || undefined);
      setSnackbar({ open: true, message: `已提交 ${amt} 阳德提现申请，等待管理员审核`, severity: 'success' });
      setCashAmount('');
      setCashNote('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提现申请失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Box sx={{ pt: 12, textAlign: 'center', color: 'rgba(245,240,235,0.6)', fontFamily: 'var(--font-serif)', minHeight: '60vh' }}>
          <Typography sx={{ fontSize: '1.2rem' }}>请先登录后再进入兑换中心</Typography>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, md: 4 }, py: 8 }}>
        {/* 标题 + 余额 */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontFamily: 'var(--font-calligraphy)', fontSize: '2.2rem', color: '#c9a96e' }}>兑换中心</Typography>
          <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.9rem', letterSpacing: '0.15em', mt: 0.5 }}>
            阳德结缘 · 积分兑换 · 功德变现
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Chip label={`阳德 ${yang_de}`} sx={balanceChipSx('#c9a96e')} />
            <Chip label={`积分 ${points}`} sx={balanceChipSx('#9c27b0')} />
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontFamily: 'var(--font-serif)' }}>{error}</Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          centered
          sx={{
            borderBottom: '1px solid rgba(201,169,110,0.1)',
            mb: 3,
            '& .MuiTab-root': { fontFamily: 'var(--font-serif)', color: 'rgba(201,169,110,0.5)', fontSize: '0.95rem', '&.Mui-selected': { color: '#c9a96e' } },
            '& .MuiTabs-indicator': { backgroundColor: '#c9a96e' },
          }}
        >
          <Tab label="阳德兑换" />
          <Tab label="积分兑换" />
        </Tabs>

        {itemsLoading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: '#c9a96e' }} /></Box>
        ) : (
          <>
            {/* 阳德兑换：手串 redeem + 现金申请 */}
            {tab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 现金提现表单 */}
                <Card sx={cardSx}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <PaymentsIcon sx={{ color: '#c9a96e' }} />
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1.05rem', fontWeight: 600 }}>
                        阳德提现
                      </Typography>
                    </Box>
                    <Typography sx={{ color: 'rgba(245,240,235,0.5)', fontSize: '0.8rem', fontFamily: 'var(--font-serif)', mb: 2 }}>
                      最低 1000 阳德、须为整千、无手续费、无单笔上限。提交后由管理员审核兑付。
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <TextField
                        label="提现阳德数量"
                        type="number"
                        value={cashAmount}
                        onChange={(e) => { setCashAmount(e.target.value); setCashError(''); }}
                        error={!!cashError}
                        helperText={cashError || ' '}
                        sx={fieldSx}
                      />
                      <TextField
                        label="备注（选填）"
                        value={cashNote}
                        onChange={(e) => setCashNote(e.target.value)}
                        sx={fieldSx}
                      />
                      <Button
                        variant="contained"
                        disabled={submitting}
                        onClick={handleCashout}
                        sx={{ backgroundColor: 'rgba(201,169,110,0.85)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', alignSelf: 'center', '&:hover': { backgroundColor: '#c9a96e' } }}
                      >
                        {submitting ? '提交中…' : '申请提现'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* 阳德兑换项（手串等） */}
                {yangItems.filter((i) => i.item_type !== 'cash').length === 0 ? (
                  <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', fontFamily: 'var(--font-serif)' }}>
                    暂无可兑换的阳德商品
                  </Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    {yangItems.filter((i) => i.item_type !== 'cash').map((item) => (
                      <Card key={item.id} sx={cardSx}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {itemIcon[item.item_type]}
                            <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1rem', fontWeight: 600 }}>
                              {item.title}
                            </Typography>
                          </Box>
                          {item.description && (
                            <Typography sx={{ color: 'rgba(245,240,235,0.6)', fontSize: '0.82rem', fontFamily: 'var(--font-serif)', mb: 1.5 }}>
                              {item.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Chip label={`${item.cost_amount} 阳德`} size="small" sx={balanceChipSx('#c9a96e')} />
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={yang_de < item.cost_amount}
                              onClick={() => handleRedeem(item)}
                              sx={{ borderColor: 'rgba(201,169,110,0.4)', color: '#c9a96e', fontFamily: 'var(--font-serif)', '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' } }}
                            >
                              {yang_de < item.cost_amount ? '阳德不足' : '兑换'}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* 积分兑换：法器 / 清修卡 */}
            {tab === 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {pointItems.length === 0 ? (
                  <Typography sx={{ color: 'rgba(245,240,235,0.4)', textAlign: 'center', gridColumn: '1/-1', fontFamily: 'var(--font-serif)' }}>
                    暂无可兑换的积分商品
                  </Typography>
                ) : (
                  pointItems.map((item) => (
                    <Card key={item.id} sx={cardSx}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {itemIcon[item.item_type]}
                          <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '1rem', fontWeight: 600 }}>
                            {item.title}
                          </Typography>
                        </Box>
                        {item.description && (
                          <Typography sx={{ color: 'rgba(245,240,235,0.6)', fontSize: '0.82rem', fontFamily: 'var(--font-serif)', mb: 1.5 }}>
                            {item.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Chip label={`${item.cost_amount} 积分`} size="small" sx={balanceChipSx('#9c27b0')} />
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={points < item.cost_amount}
                            onClick={() => handleRedeem(item)}
                            sx={{ borderColor: 'rgba(201,169,110,0.4)', color: '#c9a96e', fontFamily: 'var(--font-serif)', '&:hover': { borderColor: '#c9a96e', backgroundColor: 'rgba(201,169,110,0.08)' } }}
                          >
                            {points < item.cost_amount ? '积分不足' : '兑换'}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            )}

            {/* 我的兑换记录 */}
            <Divider sx={{ borderColor: 'rgba(201,169,110,0.1)', my: 4 }} />
            <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#c9a96e', fontSize: '1.1rem', mb: 2 }}>我的兑换记录</Typography>
            {orders.length === 0 ? (
              <Typography sx={{ color: 'rgba(245,240,235,0.4)', fontFamily: 'var(--font-serif)' }}>暂无记录</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {orders.map((o) => (
                  <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, border: '1px solid rgba(201,169,110,0.1)', borderRadius: '4px' }}>
                    <Box>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: '#f5f0eb', fontSize: '0.9rem' }}>
                        {o.kind === 'cashout' ? `阳德提现 ${o.amount}` : `兑换支出 ${o.amount} ${o.cost_kind === 'yang_de' ? '阳德' : '积分'}`}
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.4)', fontSize: '0.75rem' }}>
                        {new Date(o.created_at).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                    <Chip
                      label={o.status === 'pending' ? '待审核' : o.status === 'approved' ? '已通过' : o.status === 'rejected' ? '已驳回' : '已完成'}
                      size="small"
                      sx={{ backgroundColor: orderStatusColor(o.status), color: '#1a1a2e', fontSize: '0.72rem', fontFamily: 'var(--font-serif)' }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      <Footer />

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
    </>
  );
}

function orderStatusColor(status: string): string {
  switch (status) {
    case 'pending': return '#e0a96d';
    case 'approved': return '#c9a96e';
    case 'rejected': return '#c0392b';
    case 'fulfilled': return '#7cb342';
    default: return '#888';
  }
}

const cardSx = {
  backgroundColor: 'rgba(22,33,62,0.5)',
  border: '1px solid rgba(201,169,110,0.1)',
  borderRadius: '4px',
} as const;

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
} as const;

function balanceChipSx(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    fontFamily: 'var(--font-serif)',
    border: `1px solid ${color}55`,
  } as const;
}
