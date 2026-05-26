import { Typography, Box, IconButton, Button } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BookIcon from '@mui/icons-material/MenuBook';
import { GreekKeyBorder } from './ChinesePattern';

/** 小红书链接 */
const XHS_LINK = 'https://xhslink.com/m/1DN3RLemnJW';

export default function Footer() {
  return (
    <footer id="footer" className="relative border-t border-gold/10">
      <GreekKeyBorder />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {/* 品牌 */}
          <div>
            <Typography
              sx={{
                fontFamily: 'var(--font-calligraphy)',
                color: '#c9a96e',
                fontSize: '1.8rem',
                mb: 1,
              }}
            >
              明道阁
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(201,169,110,0.4)',
                fontSize: '0.75rem',
                letterSpacing: '0.3em',
                mb: 2,
              }}
            >
              新中式 · 手工定制
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.45)',
                fontSize: '0.85rem',
                lineHeight: 1.8,
              }}
            >
              以明德之心，选天然之材，<br />
              以匠人之手，串每一颗珠。<br />
              愿您于纷繁世间，得一份宁静与雅致。
            </Typography>
          </div>

          {/* 联系方式 */}
          <div>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: '#c9a96e',
                fontSize: '1rem',
                fontWeight: 600,
                mb: 2,
              }}
            >
              联系我们
            </Typography>
            <div className="space-y-3">
              {[
                { icon: <PhoneIcon sx={{ fontSize: '1rem' }} />, text: '18064344001' },
                { icon: <EmailIcon sx={{ fontSize: '1rem' }} />, text: '3389675386@qq.com' },
                { icon: <LocationOnIcon sx={{ fontSize: '1rem' }} />, text: '陕西省西安市万寿八仙宫' },
              ].map((item) => (
                <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <span className="text-gold/50">{item.icon}</span>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      color: 'rgba(245,240,235,0.5)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </div>
          </div>

          {/* 社交 & 小红书 */}
          <div>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: '#c9a96e',
                fontSize: '1rem',
                fontWeight: 600,
                mb: 2,
              }}
            >
              关注我们
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.45)',
                fontSize: '0.85rem',
                mb: 2,
                lineHeight: 1.8,
              }}
            >
              关注小红书，获取新品首发与盘玩指南。
            </Typography>

            {/* 小红书按钮 */}
            <Button
              variant="outlined"
              startIcon={<BookIcon sx={{ fontSize: '1rem' }} />}
              href={XHS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderColor: 'rgba(192,57,43,0.4)',
                color: '#c0392b',
                fontFamily: 'var(--font-serif)',
                fontSize: '0.8rem',
                letterSpacing: '0.1em',
                borderRadius: '2px',
                padding: '6px 16px',
                '&:hover': {
                  borderColor: '#c0392b',
                  backgroundColor: 'rgba(192,57,43,0.08)',
                },
              }}
            >
              小红书
            </Button>

            <div className="flex gap-2 mt-3">
              <IconButton
                sx={{
                  border: '1px solid rgba(201,169,110,0.2)',
                  borderRadius: '4px',
                  color: 'rgba(201,169,110,0.5)',
                  '&:hover': {
                    borderColor: 'rgba(201,169,110,0.4)',
                    color: '#c9a96e',
                    backgroundColor: 'rgba(201,169,110,0.06)',
                  },
                }}
                href={XHS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="小红书"
              >
                <BookIcon sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-12 pt-6 border-t border-gold/8 text-center">
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.2)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
            }}
          >
            © 2025 明道阁 · 新中式手串 · 保留所有权利
          </Typography>
        </div>
      </div>
    </footer>
  );
}
