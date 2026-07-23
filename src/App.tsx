import { useState, useCallback, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material';
import { CartProvider, useCart } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { MessageProvider } from './context/MessageContext';
import { ForumProvider } from './context/ForumContext';
import { CommentProvider } from './context/CommentContext';
import { ChatProvider } from './context/ChatContext';
import { ExchangeProvider } from './context/ExchangeContext';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import type { Product } from './types';

/** 轻量首屏组件（导航 / 首页区块）静态引入，重路由组件走 lazy 拆包 */
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ExchangePage = lazy(() => import('./pages/ExchangePage'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const ForumPage = lazy(() => import('./components/ForumPage'));
const ChatPage = lazy(() => import('./components/ChatPage'));
const TaskHall = lazy(() => import('./pages/TaskHall'));
const MyTasks = lazy(() => import('./pages/MyTasks'));

/** 首屏下方区块与交互弹窗：静态 import 改为 lazy，减小首屏 bundle */
const SectionDaoTreasury = lazy(() => import('./components/front/SectionDaoTreasury'));
const SectionMeritSquare = lazy(() => import('./components/front/SectionMeritSquare'));
const About = lazy(() => import('./components/About'));
const Cart = lazy(() => import('./components/Cart'));
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const BuyGuideDialog = lazy(() => import('./components/BuyGuideDialog'));

/** 教程完整内容页 */
const Tutorial = lazy(() => import('./pages/Tutorial'));

/** 首屏下方区块占位 */
const sectionFallback = (
  <Box sx={{ minHeight: 160, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <CircularProgress sx={{ color: '#c9a96e' }} />
  </Box>
);

/** MUI 深色主题定制 */
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#c9a96e' },
    secondary: { main: '#c0392b' },
    background: { default: '#1a1a2e', paper: '#16213e' },
    text: { primary: '#f5f0eb', secondary: 'rgba(245,240,235,0.6)' },
  },
  typography: {
    fontFamily: '"Noto Serif SC", serif',
  },
  shape: { borderRadius: 2 },
});

/** 前台页面内容 */
function FrontPage() {
  const { addToCart } = useCart();
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  /** 打开产品详情 */
  const handleDetail = useCallback((product: Product) => {
    setDetailProduct(product);
    setDetailOpen(true);
  }, []);

  /** 关闭产品详情 */
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setDetailProduct(null), 300);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <Cart />
      </Suspense>

      <main>
        <Hero />
        <Box id="products">
          <ProductGrid onDetail={handleDetail} onAddToCart={addToCart} />
        </Box>
        <Suspense fallback={sectionFallback}>
          <SectionDaoTreasury />
        </Suspense>
        <Suspense fallback={sectionFallback}>
          <SectionMeritSquare />
        </Suspense>
        <Suspense fallback={sectionFallback}>
          <About />
        </Suspense>
      </main>

      <Footer />

      <Suspense fallback={null}>
        <ProductDetail
          product={detailProduct}
          open={detailOpen}
          onClose={handleCloseDetail}
          onAddToCart={addToCart}
          onBuy={() => setBuyOpen(true)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BuyGuideDialog open={buyOpen} onClose={() => setBuyOpen(false)} />
      </Suspense>
    </>
  );
}

/** 根组件 */
export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ProductProvider>
        <MessageProvider>
          <ForumProvider>
            <CommentProvider>
              <CartProvider>
                <ChatProvider>
                  <ExchangeProvider>
                    <ErrorBoundary title="页面出错了">
                      {/* 全站常驻头部：公告栏 + 导航栏统一为 sticky，置于文档流中，
                          页面内容自动下移，无需各页手动 pt（修复缺陷 A / B） */}
                      <Box
                        component="header"
                        sx={{
                          position: 'sticky',
                          top: 0,
                          zIndex: (theme) => theme.zIndex.appBar,
                          bgcolor: '#1a1a2e',
                        }}
                      >
                        <AnnouncementBar />
                        <Navbar />
                      </Box>
                      <Suspense
                        fallback={
                          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
                            <CircularProgress sx={{ color: '#c9a96e' }} />
                          </Box>
                        }
                      >
                        <Routes>
                          <Route path="/" element={<FrontPage />} />
                          <Route path="/forum" element={<ForumPage />} />
                          <Route path="/tutorials/:slug" element={<Tutorial />} />
                          <Route path="/chat" element={<ChatPage />} />
                          <Route path="/admin" element={<AdminPanel />} />
                          <Route path="/exchange" element={<ExchangePage />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/verify-email" element={<VerifyEmail />} />
                          <Route path="/tasks" element={<TaskHall />} />
                          <Route path="/tasks/mine" element={<MyTasks />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </ExchangeProvider>
                </ChatProvider>
              </CartProvider>
            </CommentProvider>
          </ForumProvider>
        </MessageProvider>
      </ProductProvider>
    </ThemeProvider>
  );
}
