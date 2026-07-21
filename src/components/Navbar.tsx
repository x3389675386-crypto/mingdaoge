import { useState } from 'react';
import { AppBar, Toolbar, IconButton, Badge, Drawer, List, ListItem, ListItemText, useMediaQuery, useTheme, Tooltip, Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { CloudPattern } from './ChinesePattern';
import { ADMIN_GUEST_ID, ADMIN_NAME } from '../lib/chatConstants';

/** 导航链接列表 */
const navLinks = [
  { label: '首页', href: '#hero', sectionId: 'hero' },
  { label: '产品', href: '#products', sectionId: 'products' },
  { label: '论坛', href: '/forum', isRoute: true },
  { label: '私聊', href: '/chat', isRoute: true },
  { label: '关于', href: '#about', sectionId: 'about' },
  { label: '联系', href: '#footer', sectionId: 'footer' },
  { label: '登录', href: '/login', isRoute: true },
  { label: '注册', href: '/register', isRoute: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems, dispatch } = useCart();
  const { unreadTotal, openConversation } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /** 滚动到指定 section */
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return true;
    }
    return false;
  };

  const handleNavClick = (href: string, isRoute?: boolean, sectionId?: string) => {
    setMobileOpen(false);
    if (isRoute) {
      navigate(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (location.pathname !== '/') {
      // 在非首页（如论坛页），先跳回首页，等渲染完再滚动
      navigate('/');
      setTimeout(() => {
        if (sectionId) scrollToSection(sectionId);
      }, 300);
    } else {
      // 在首页，直接滚动
      if (sectionId) scrollToSection(sectionId);
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: 'rgba(26, 26, 46, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(201, 169, 110, 0.1)',
        }}
      >
        <Toolbar className="max-w-7xl mx-auto w-full px-4 md:px-8">
          {/* 品牌 Logo */}
          <a
            href="#hero"
            className="flex items-center gap-2 no-underline"
            onClick={(e) => { e.preventDefault(); handleNavClick('#hero', false, 'hero'); }}
          >
            <span
              className="text-2xl md:text-3xl text-gold"
              style={{ fontFamily: 'var(--font-calligraphy)' }}
            >
              明道阁
            </span>
            <span className="hidden sm:inline text-xs text-gold/50 tracking-widest mt-1">
              · 新中式手串
            </span>
          </a>

          {/* 桌面端导航链接 */}
          {!isMobile && (
            <nav className="flex-1 flex justify-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.isRoute ? link.href : undefined}
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href, link.isRoute, link.sectionId); }}
                  className="text-jade-white/70 hover:text-gold transition-colors duration-300 text-sm tracking-wider no-underline relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-px after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.label}
                  {link.label === '私聊' && unreadTotal > 0 && (
                    <span
                      className="ml-1 inline-flex items-center justify-center text-[0.6rem] leading-none text-jade-white bg-[#c0392b] rounded-full"
                      style={{ minWidth: 16, height: 16, padding: '0 4px' }}
                    >
                      {unreadTotal}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          )}

          {/* 右侧操作区 */}
          <div className="flex items-center gap-1 ml-auto">
            {/* 联系客服快捷按钮 */}
            <Tooltip title={`联系客服（${ADMIN_NAME}）`}>
              <IconButton
                onClick={() => { openConversation(ADMIN_GUEST_ID, ADMIN_NAME); navigate('/chat'); }}
                sx={{ color: 'rgba(201,169,110,0.6)', '&:hover': { color: '#c9a96e' } }}
                aria-label="联系客服"
                size="small"
              >
                <SupportAgentIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Tooltip>

            {/* 私聊入口（带未读角标） */}
            <Tooltip title="私聊">
              <IconButton
                onClick={() => navigate('/chat')}
                sx={{ color: 'rgba(201,169,110,0.8)' }}
                aria-label="私聊"
                size="small"
              >
                <Badge
                  badgeContent={unreadTotal}
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#c0392b',
                      color: '#f5f0eb',
                      fontSize: '0.7rem',
                      minWidth: '18px',
                      height: '18px',
                    },
                  }}
                >
                  <ChatIcon sx={{ fontSize: '1.2rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* 管理入口（隐蔽小图标） */}
            <Tooltip title="管理">
              <IconButton
                onClick={() => navigate('/admin')}
                sx={{ color: 'rgba(201,169,110,0.25)', '&:hover': { color: 'rgba(201,169,110,0.5)' } }}
                aria-label="管理后台"
                size="small"
              >
                <SettingsIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>

            {/* 购物车图标 */}
            <IconButton
              onClick={() => dispatch({ type: 'OPEN_CART' })}
              sx={{ color: 'rgba(201,169,110,0.8)' }}
              aria-label="打开购物车"
            >
              <Badge
                badgeContent={totalItems}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#c0392b',
                    color: '#f5f0eb',
                    fontSize: '0.7rem',
                    minWidth: '18px',
                    height: '18px',
                  },
                }}
              >
                <ShoppingCartIcon />
              </Badge>
            </IconButton>

            {/* 移动端菜单按钮 */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ color: 'rgba(201,169,110,0.8)' }}
                aria-label="打开菜单"
              >
                <MenuIcon />
              </IconButton>
            )}
          </div>
        </Toolbar>
      </AppBar>

      {/* 移动端侧边导航抽屉 */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#16213e',
            width: 240,
            borderLeft: '1px solid rgba(201,169,110,0.15)',
          },
        }}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-gold/10">
          <span className="text-gold text-lg" style={{ fontFamily: 'var(--font-calligraphy)' }}>
            导航
          </span>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#c9a96e' }}>
            <CloseIcon />
          </IconButton>
        </div>
        <CloudPattern className="opacity-40 mt-2" />
        <List>
          {navLinks.map((link) => (
            <ListItem
              key={link.href}
              component="a"
              href={link.isRoute ? link.href : undefined}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.href, link.isRoute, link.sectionId); }}
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(201,169,110,0.08)' },
              }}
            >
              <ListItemText
                primary={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    {link.label}
                    {link.label === '私聊' && unreadTotal > 0 && (
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
                sx={{
                  '& .MuiListItemText-primary': {
                    color: '#f5f0eb',
                    fontFamily: 'var(--font-serif)',
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                  },
                }}
              />
            </ListItem>
          ))}
          {/* 管理入口 */}
          <ListItem
            component="a"
            onClick={() => { setMobileOpen(false); navigate('/admin'); }}
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(201,169,110,0.08)' },
            }}
          >
            <ListItemText
              primary="管理"
              sx={{
                '& .MuiListItemText-primary': {
                  color: 'rgba(201,169,110,0.3)',
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                },
              }}
            />
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
