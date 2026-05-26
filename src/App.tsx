import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { CartProvider, useCart } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { MessageProvider } from './context/MessageContext';
import { ReviewProvider } from './context/ReviewContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import About from './components/About';
import ReviewSection from './components/ReviewSection';
import Footer from './components/Footer';
import AdminPanel from './components/admin/AdminPanel';
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
        <ProductGrid onDetail={handleDetail} onAddToCart={addToCart} />
        <ReviewSection />
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
            <CartProvider>
              <Routes>
                <Route path="/" element={<FrontPage />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </CartProvider>
          </MessageProvider>
        </ReviewProvider>
      </ProductProvider>
    </ThemeProvider>
  );
}
