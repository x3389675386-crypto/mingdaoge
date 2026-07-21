import { useState, useCallback, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material';
import { CartProvider, useCart } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { MessageProvider } from './context/MessageContext';
import { ReviewProvider } from './context/ReviewContext';
import { ForumProvider } from './context/ForumContext';
import { CommentProvider } from './context/CommentContext';
import { ChatProvider } from './context/ChatContext';
import { ExchangeProvider } from './context/ExchangeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import About from './components/About';
import ReviewSection from './components/ReviewSection';
import ForumPage from './components/ForumPage';
import Footer from './components/Footer';
import AdminPanel from './components/admin/AdminPanel';
import ChatPage from './components/ChatPage';
import SectionStringCollection from './components/front/SectionStringCollection';
import SectionDaoTreasury from './components/front/SectionDaoTreasury';
import SectionMeritSquare from './components/front/SectionMeritSquare';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ExchangePage = lazy(() => import('./pages/ExchangePage'));
import type { Product } from './types';

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
      <Navbar />
      <Cart />

      <main>
        <Hero />
        <SectionStringCollection onDetail={handleDetail} onAddToCart={addToCart} onBuy={addToCart} />
        <Box id="products">
          <ProductGrid onDetail={handleDetail} onAddToCart={addToCart} />
        </Box>
        <ReviewSection />
        <SectionDaoTreasury />
        <SectionMeritSquare />
        <About />
      </main>

      <Footer />

      <ProductDetail
        product={detailProduct}
        open={detailOpen}
        onClose={handleCloseDetail}
        onAddToCart={addToCart}
      />
    </>
  );
}

/** 根组件 */
export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ProductProvider>
        <ReviewProvider>
          <MessageProvider>
            <ForumProvider>
              <CommentProvider>
                <CartProvider>
                  <ChatProvider>
                    <ExchangeProvider>
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
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/exchange" element={<ExchangePage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                    </Routes>
                    </Suspense>
                    </ExchangeProvider>
                  </ChatProvider>
                </CartProvider>
              </CommentProvider>
            </ForumProvider>
          </MessageProvider>
        </ReviewProvider>
      </ProductProvider>
    </ThemeProvider>
  );
}
