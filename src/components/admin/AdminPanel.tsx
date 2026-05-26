import { useState } from 'react';
import { Button, Typography, Box, Tabs, Tab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import ProductTable from './ProductTable';
import MessagePanel from './MessagePanel';
import ReviewPanel from './ReviewPanel';
import { GreekKeyBorder } from '../ChinesePattern';
import { useMessages } from '../../context/MessageContext';

/** Tab 面板容器 */
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} style={{ marginTop: 16 }}>
      {value === index && children}
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const { unreadCount } = useMessages();

  return (
    <AdminRoute>
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

        {/* 底部提示 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.15)',
              fontSize: '0.75rem',
            }}
          >
            数据保存在浏览器本地存储中，清除浏览器数据将重置为默认
          </Typography>
        </Box>
      </div>
    </AdminRoute>
  );
}
