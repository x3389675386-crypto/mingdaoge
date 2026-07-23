import { useState, useEffect } from 'react';
import { Button, Typography, Box, Tabs, Tab, TextField, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import ProductTable from './ProductTable';
import MessagePanel from './MessagePanel';
import BuyGuideAdmin from './BuyGuideAdmin';
import ChatView from '../ChatView';
import ExchangeItemPanel from './ExchangeItemPanel';
import CashoutPanel from './CashoutPanel';
import RewardPanel from './RewardPanel';
import GongfaPanel from './GongfaPanel';
import CategoryPanel from './CategoryPanel';
import AdminTaskPanel from './AdminTaskPanel';
import AnnouncementPanel from './AnnouncementPanel';
import { GreekKeyBorder } from '../ChinesePattern';
import { useMessages } from '../../context/MessageContext';
import { useChat } from '../../context/ChatContext';
import { ChatProvider } from '../../context/ChatContext';
import { ADMIN_GUEST_ID, ADMIN_NAME } from '../../lib/chatConstants';
import {
  getInviteRewardPoints,
  setInviteRewardPoints,
  DEFAULT_INVITE_REWARD,
} from '../../lib/invite';
import {
  getPalmistryRewardPoints,
  setPalmistryRewardPoints,
  getPalmistryDailyLimit,
  setPalmistryDailyLimit,
  DEFAULT_PALMIRSTRY_REWARD_POINTS,
  DEFAULT_PALMIRSTRY_DAILY_LIMIT,
} from '../../lib/palmistry';
import ErrorBoundary from '../ErrorBoundary';

/** Tab 面板容器 */
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} style={{ marginTop: 16 }}>
      {value === index && children}
    </div>
  );
}

/** 后台客服身份（固定） */
const ADMIN_IDENTITY = { guest_id: ADMIN_GUEST_ID, nickname: ADMIN_NAME };

/** 客服私信 Tab 内容（admin ChatProvider 已在 AdminPanel 外层提供） */
function AdminChatTab() {
  return <ChatView isAdmin />;
}

/** 通用数字配置面板（邀请 / 看手相复用） */
function NumberSettingPanel({
  title,
  description,
  read,
  write,
  fallback,
}: {
  title: string;
  description: string;
  read: () => Promise<number>;
  write: (v: number) => Promise<void>;
  fallback: number;
}) {
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    read()
      .then((v) => {
        if (active) setValue(String(v));
      })
      .catch(() => {
        // 读取失败用默认（060 未执行也回填默认值，绝不白屏）
        if (active) setValue(String(fallback));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [read, fallback]);

  const handleSave = async () => {
    const n = Number(value);
    if (value.trim() === '' || Number.isNaN(n) || !Number.isInteger(n) || n < 0) {
      setMsg({ type: 'error', text: '请输入非负整数' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await write(n);
      setMsg({ type: 'success', text: '已保存' });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#c9a96e', fontSize: '1.3rem', mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem', mb: 2 }}>
        {description}
      </Typography>
      <TextField
        type="number"
        label="数值（积分 / 次数）"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setMsg(null);
        }}
        disabled={loading || saving}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } },
          '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' },
        }}
      />
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={loading || saving}
        sx={{ mt: 2, backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', '&:hover': { backgroundColor: '#c9a96e' } }}
      >
        {saving ? '保存中…' : '保存配置'}
      </Button>
      {msg && (
        <Alert severity={msg.type} sx={{ mt: 2, fontFamily: 'var(--font-serif)' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}
    </Box>
  );
}

/** 邀请设置：每成功邀请 1 人奖励积分 */
function InviteSettingsPanel() {
  return (
    <NumberSettingPanel
      title="邀请设置"
      description="被邀请人通过你的邀请链接注册成功后，你将获得的积分奖励。"
      read={getInviteRewardPoints}
      write={setInviteRewardPoints}
      fallback={DEFAULT_INVITE_REWARD}
    />
  );
}

/** 看手相奖励设置：单次积分 + 每日限领次数 */
function PalmistrySettingsPanel() {
  const [reward, setReward] = useState<string>('');
  const [limit, setLimit] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getPalmistryRewardPoints(), getPalmistryDailyLimit()])
      .then(([r, l]) => {
        if (!active) return;
        setReward(String(r));
        setLimit(String(l));
      })
      .catch(() => {
        if (!active) return;
        setReward(String(DEFAULT_PALMIRSTRY_REWARD_POINTS));
        setLimit(String(DEFAULT_PALMIRSTRY_DAILY_LIMIT));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const r = Number(reward);
    const l = Number(limit);
    if (reward.trim() === '' || limit.trim() === '' || Number.isNaN(r) || Number.isNaN(l) || !Number.isInteger(r) || !Number.isInteger(l) || r < 0 || l < 0) {
      setMsg({ type: 'error', text: '请输入非负整数（每日次数设为 0 即关闭活动）' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all([setPalmistryRewardPoints(r), setPalmistryDailyLimit(l)]);
      setMsg({ type: 'success', text: '已保存看手相奖励配置' });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography sx={{ fontFamily: 'var(--font-calligraphy)', color: '#c9a96e', fontSize: '1.3rem', mb: 1 }}>
        看手相奖励设置
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)', fontSize: '0.85rem', mb: 2 }}>
        用户发布「看手相」主题帖即可领奖；每日限领次数设为 0 即关闭活动。
      </Typography>
      <TextField
        type="number"
        label="单次奖励积分"
        value={reward}
        onChange={(e) => { setReward(e.target.value); setMsg(null); }}
        disabled={loading || saving}
        fullWidth
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } }, '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' } }}
      />
      <TextField
        type="number"
        label="每日限领次数（0=关闭）"
        value={limit}
        onChange={(e) => { setLimit(e.target.value); setMsg(null); }}
        disabled={loading || saving}
        fullWidth
        sx={{ '& .MuiOutlinedInput-root': { fontFamily: 'var(--font-serif)', color: '#f5f0eb', '& fieldset': { borderColor: 'rgba(201,169,110,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(201,169,110,0.4)' } }, '& .MuiInputLabel-root': { fontFamily: 'var(--font-serif)', color: 'rgba(245,240,235,0.5)' } }}
      />
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={loading || saving}
        sx={{ mt: 2, backgroundColor: 'rgba(201,169,110,0.9)', color: '#1a1a2e', fontFamily: 'var(--font-serif)', letterSpacing: '0.1em', '&:hover': { backgroundColor: '#c9a96e' } }}
      >
        {saving ? '保存中…' : '保存配置'}
      </Button>
      {msg && (
        <Alert severity={msg.type} sx={{ mt: 2, fontFamily: 'var(--font-serif)' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}
    </Box>
  );
}


/** 面板主体（在 admin ChatProvider 内，可使用 useChat 读未读） */
function AdminPanelInner() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const { unreadCount } = useMessages();
  const { unreadTotal } = useChat();

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 md:px-8 max-w-5xl mx-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Typography
            sx={{
              fontFamily: 'var(--font-calligraphy)',
              fontSize: '1.8rem',
              color: '#f5f0eb',
            }}
          >
            明道阁 · 管理
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(201,169,110,0.4)',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
            }}
          >
            管理面板
          </Typography>
        </div>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{
            color: 'rgba(201,169,110,0.6)',
            fontFamily: 'var(--font-serif)',
            borderColor: 'rgba(201,169,110,0.2)',
            '&:hover': {
              borderColor: 'rgba(201,169,110,0.4)',
              backgroundColor: 'rgba(201,169,110,0.06)',
            },
          }}
          variant="outlined"
          size="small"
        >
          返回前台
        </Button>
      </div>

      <GreekKeyBorder className="mb-6" />

      {/* 标签页 */}
      <Tabs
        value={tabValue}
        onChange={(_, val) => setTabValue(val)}
        sx={{
          borderBottom: '1px solid rgba(201,169,110,0.1)',
          mb: 2,
          '& .MuiTab-root': {
            fontFamily: 'var(--font-serif)',
            color: 'rgba(201,169,110,0.5)',
            fontSize: '0.9rem',
            letterSpacing: '0.05em',
            '&.Mui-selected': {
              color: '#c9a96e',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#c9a96e',
            height: 2,
          },
        }}
      >
        <Tab label="产品管理" />
        <Tab
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              客户留言
              {unreadCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    backgroundColor: '#c0392b',
                    color: '#f5f0eb',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    px: 0.5,
                  }}
                >
                  {unreadCount}
                </Box>
              )}
            </span>
          }
        />
        <Tab label="购买引导图" />
        <Tab label="兑换项" />
        <Tab
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              阳德提现
              {unreadTotal > 0 && (
                <Box
                  component="span"
                  sx={{
                    backgroundColor: '#c0392b',
                    color: '#f5f0eb',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    px: 0.5,
                  }}
                >
                  {unreadTotal}
                </Box>
              )}
            </span>
          }
        />
        <Tab label="奖励调整" />
        <Tab label="功法管理" />
        <Tab label="论坛分类" />
        <Tab
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              客服私信
              {unreadTotal > 0 && (
                <Box
                  component="span"
                  sx={{
                    backgroundColor: '#c0392b',
                    color: '#f5f0eb',
                    fontSize: '0.65rem',
                    minWidth: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    px: 0.5,
                  }}
                >
                  {unreadTotal}
                </Box>
              )}
            </span>
          }
        />
        <Tab label="任务管理" />
        <Tab label="公告管理" />
        <Tab label="邀请设置" />
        <Tab label="看手相奖励" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <ProductTable />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <MessagePanel />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <BuyGuideAdmin />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <ExchangeItemPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
        <CashoutPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={5}>
        <RewardPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={6}>
        <GongfaPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={7}>
        <CategoryPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={8}>
        <AdminChatTab />
      </TabPanel>
      <TabPanel value={tabValue} index={9}>
        <AdminTaskPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={10}>
        <AnnouncementPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={11}>
        <InviteSettingsPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={12}>
        <PalmistrySettingsPanel />
      </TabPanel>

      {/* 底部提示 */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(245,240,235,0.15)',
            fontSize: '0.75rem',
          }}
        >
          产品 / 留言仍为本地存储；论坛、身份、兑换、提现、奖励均存于云端数据库
        </Typography>
      </Box>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <AdminRoute>
      <ChatProvider identityOverride={ADMIN_IDENTITY}>
        {/* 错误边界：捕获任一 Tab 面板的渲染异常，避免单点崩溃导致整页白屏，并显示错误信息便于定位 */}
        <ErrorBoundary title="管理面板出错了">
          <AdminPanelInner />
        </ErrorBoundary>
      </ChatProvider>
    </AdminRoute>
  );
}
