import { useState } from 'react';
import { AppBar, Toolbar, IconButton, Badge, Drawer, List, ListItem, ListItemText, useMediaQuery, useTheme, Tooltip, Box, Avatar } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { CloudPattern } from './ChinesePattern';
import UserAvatar from './UserAvatar';
import { ADMIN_GUEST_ID, ADMIN_NAME } from '../lib/chatConstants';
import { getIdentityLabel } from '../lib/identities';

/** 导航链接列表（登录 / 注册 统一收到右上角用户图标入口） */
const navLinks = [
  { label: '首页', href: '#hero', sectionId: 'hero' },
  { label: '产品', href: '#products', sectionId: 'products' },
  { label: '论坛', href: '/forum', isRoute: true },
  { label: '兑换', href: '/exchange', isRoute: true },
  { label: '私聊', href: '/chat', isRoute: true },
  { label: '任务大厅', href: '/tasks', isRoute: true },
  { label: '关于', href: '#about', sectionId: 'about' },
  { label: '联系', href: '#footer', sectionId: 'footer' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems, dispatch } = useCart();
  const { isAuthenticated, profile, user, signOut, isAdmin } = useAuth();
  const { unreadTotal, openConversation } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /** 登录态展示名称 */
  const displayName = profile?.nickname || user?.email || '我的';

  /** 登录态身份标签（散修·风水师 / 法脉·道医 / 顾客） */
  const identityLabel = profile
    ? getIdentityLabel(profile.identity_type, profile.identity_subtype)
    : '';

  /** 退出登录处理 */
  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    navigate('/');
  };

  /** 已登录时移除「登录/注册」入口 */
  const displayLinks = isAuthenticated
    ? navLinks.filter((l) => l.label !== '登录' && l.label !== '注册')
    : navLinks;

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
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(26, 26, 46, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(201, 169, 110, 0.1)',
        }}
      >
        <Toolbar className="max-w-7xl mx-auto w-full px-5 md:px-10">
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
            <span className="hidden lg:inline text-xs text-gold/50 tracking-widest mt-1">
              · 新中式手串
            </span>
          </a>

          {/* 桌面端导航链接 */}
          {!isMobile && (
            <nav className="flex-1 flex justify-center gap-7 md:gap-9">
              {displayLinks.map((link) => (
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

            {/* 管理入口（隐蔽小图标，桌面端显示；移动端在抽屉中已有入口） */}
            {!isMobile && (
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
            )}

            {/* 用户入口：单个图标按钮（已登录显示金色头像首字，未登录显示 Person 图标）。
                点击进入个人中心 /profile，未登录时该页引导去登录。移动端常驻。 */}
            <Tooltip title={isAuthenticated ? (profile?.nickname || '个人中心') : '登录 / 注册'}>
              <IconButton
                onClick={() => navigate('/profile')}
                sx={{ p: 0.5, ml: 0.5 }}
                aria-label="个人中心"
              >
                {isAuthenticated && profile?.nickname ? (
                  <UserAvatar name={profile.nickname} avatarUrl={profile?.avatar_url} size={32} />
                ) : (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'rgba(201,169,110,0.15)',
                      color: 'rgba(201,169,110,0.85)',
                      border: '1px solid rgba(201,169,110,0.3)',
                    }}
                  >
                    <PersonIcon sx={{ fontSize: '1.2rem' }} />
                  </Avatar>
                )}
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
          {displayLinks.map((link) => (
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
          {/* 已登录用户：身份 + 余额 + 退出入口（移动端） */}
          {isAuthenticated && profile && (
            <>
              <ListItem
                sx={{ cursor: 'default', flexDirection: 'column', alignItems: 'center', py: 1.5 }}
              >
                <Box className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-jade-white/90 text-sm"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {displayName}
                    {identityLabel ? ` · ${identityLabel}` : ''}
                  </span>
                  <span className="text-[0.7rem] text-jade-white/55">
                    阳德 {profile.yang_de} · 积分 {profile.points}
                    {profile.user_code ? ` · ${profile.user_code}` : ''}
                  </span>
                </Box>
              </ListItem>
              <ListItem
                component="a"
                onClick={handleLogout}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(201,169,110,0.08)' },
                }}
              >
                <ListItemText
                  primary="退出"
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: '#c9a96e',
                      fontFamily: 'var(--font-serif)',
                      letterSpacing: '0.1em',
                      textAlign: 'center',
                    },
                  }}
                />
              </ListItem>
              {/* 后台管理入口（仅管理员可见，移动端） */}
              {isAdmin && (
                <ListItem
                  component="a"
                  onClick={() => { setMobileOpen(false); navigate('/admin'); }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(201,169,110,0.08)' },
                  }}
                >
                  <ListItemText
                    primary="后台管理"
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: '#c9a96e',
                        fontFamily: 'var(--font-serif)',
                        letterSpacing: '0.1em',
                        textAlign: 'center',
                      },
                    }}
                  />
                </ListItem>
              )}
            </>
          )}

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
