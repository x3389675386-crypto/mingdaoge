import { Typography, Box } from '@mui/material';
import { GoldDivider, CloudPattern, GreekKeyBorder } from './ChinesePattern';

export default function About() {
  return (
    <section id="about" className="relative py-24 px-4 md:px-8 overflow-hidden">
      {/* 背景装饰 */}
      <CloudPattern className="absolute top-8 right-8 opacity-20 scale-75" />
      <CloudPattern className="absolute bottom-16 left-4 opacity-15 scale-50" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 标题 */}
        <div className="text-center mb-14">
          <Typography
            sx={{
              fontFamily: 'var(--font-calligraphy)',
              fontSize: { xs: '2rem', md: '2.5rem' },
              color: '#f5f0eb',
              mb: 1,
            }}
          >
            关于明道阁
          </Typography>
          <GoldDivider className="mb-4" />
          <Typography
            sx={{
              fontFamily: 'var(--font-serif)',
              color: 'rgba(245,240,235,0.4)',
              fontSize: '0.85rem',
              letterSpacing: '0.2em',
            }}
          >
            以匠心 · 传文脉
          </Typography>
        </div>

        {/* 品牌故事 */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* 左侧 —— 品牌理念 */}
          <div>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.75)',
                lineHeight: 2,
                fontSize: '0.95rem',
                mb: 3,
              }}
            >
              明道阁，取"明"之通达、"道"之正途、"阁"之清雅，寓意以明德之心、正道之行、阁中雅趣，串每一颗珠，结每一段缘。
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.6)',
                lineHeight: 2,
                fontSize: '0.9rem',
                mb: 3,
              }}
            >
              我们扎根于新中式美学，从千年文脉中汲取灵感。每一款手串，从选材到穿制，皆由匠人手工完成。不追求数量，只在乎每一串的品质与灵魂。
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-serif)',
                color: 'rgba(245,240,235,0.6)',
                lineHeight: 2,
                fontSize: '0.9rem',
              }}
            >
              我们相信，手串不只是饰物，更是一种生活方式的表达。是喧嚣世界中的一片清净，是繁忙日常中的一念禅心。
            </Typography>
          </div>

          {/* 右侧 —— 三大承诺 */}
          <div className="space-y-6">
            {[
              {
                icon: '木',
                title: '天然选材',
                desc: '只选天然原材，拒绝化工染色与人工合成。每颗珠子都保留自然的纹理与气息。',
              },
              {
                icon: '手',
                title: '手工穿制',
                desc: '从打磨到穿制，全程手工。每串手串都独一无二，蕴含匠人的温度与心意。',
              },
              {
                icon: '韵',
                title: '东方美学',
                desc: '设计取法传统，融入当代审美。新中式风格，让古韵与现代自然共存。',
              },
            ].map((item) => (
              <Box
                key={item.title}
                sx={{
                  display: 'flex',
                  gap: 2,
                  padding: '16px',
                  borderRadius: '4px',
                  border: '1px solid rgba(201,169,110,0.08)',
                  backgroundColor: 'rgba(22,33,62,0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'rgba(201,169,110,0.2)',
                    backgroundColor: 'rgba(22,33,62,0.6)',
                  },
                }}
              >
                {/* 图标 */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '1px solid rgba(201,169,110,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-calligraphy)',
                      color: '#c9a96e',
                      fontSize: '1.2rem',
                    }}
                  >
                    {item.icon}
                  </Typography>
                </Box>

                <div>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      color: '#c9a96e',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      color: 'rgba(245,240,235,0.55)',
                      fontSize: '0.8rem',
                      lineHeight: 1.7,
                    }}
                  >
                    {item.desc}
                  </Typography>
                </div>
              </Box>
            ))}
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="mt-16">
          <GreekKeyBorder />
          <Typography
            className="text-center mt-4"
            sx={{
              fontFamily: 'var(--font-calligraphy)',
              color: 'rgba(201,169,110,0.25)',
              fontSize: '1.3rem',
              letterSpacing: '0.3em',
            }}
          >
            一念一珠 · 串起山河万象
          </Typography>
        </div>
      </div>
    </section>
  );
}
