import { useState } from 'react';
import { Button, Typography, Box, Tabs, Tab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import ProductTable from './ProductTable';
import MessagePanel from './MessagePanel';
import ReviewPanel from './ReviewPanel';
import BuyGuideAdmin from './BuyGuideAdmin';
import ChatView from '../ChatView';
import ExchangeItemPanel from './ExchangeItemPanel';
import CashoutPanel from './CashoutPanel';
import RewardPanel from './RewardPanel';
import GongfaPanel from './GongfaPanel';
import CategoryPanel from './CategoryPanel';
import { GreekKeyBorder } from '../ChinesePattern';
import { useMessages } from '../../context/MessageContext';
import { useChat } from '../../context/ChatContext';
import { ChatProvider } from '../../context/ChatContext';
import { ADMIN_GUEST_ID, ADMIN_NAME } from '../../lib/chatConstants';
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
        <Tab label="晒图管理" />
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
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <ProductTable />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <MessagePanel />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <ReviewPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <BuyGuideAdmin />
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
        <ExchangeItemPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={5}>
        <CashoutPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={6}>
        <RewardPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={7}>
        <GongfaPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={8}>
        <CategoryPanel />
      </TabPanel>
      <TabPanel value={tabValue} index={9}>
        <AdminChatTab />
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
          产品 / 留言 / 晒图仍为本地存储；论坛、身份、兑换、提现、奖励均存于云端数据库
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
