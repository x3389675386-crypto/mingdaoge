import { Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CloudPattern, GreekKeyBorder } from './ChinesePattern';

export default function Hero() {
  const navigate = useNavigate();

  const scrollToProducts = () => {
    const el = document.querySelector('#products');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  /** 三入口统一按钮样式（outlined + 主题金 #c8a45c） */
  const ctaButtonSx = {
    borderColor: 'rgba(200,164,92,0.6)',
    color: '#c8a45c',
    fontFamily: 'var(--font-serif)',
    letterSpacing: '0.2em',
    padding: { xs: '11px 26px', sm: '13px 46px' },
    fontSize: { xs: '0.85rem', sm: '0.95rem' },
    borderRadius: '8px',
    '&:hover': {
      borderColor: '#c8a45c',
      backgroundColor: 'rgba(200,164,92,0.08)',
    },
  } as const;

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
      }}
    >
      {/* 背景装饰 —— 祥云 */}
      <CloudPattern className="absolute top-20 left-8 opacity-60" />
      <CloudPattern className="absolute top-32 right-16 opacity-40 scale-75" />
      <CloudPattern className="absolute bottom-40 left-1/4 opacity-30 scale-50" />

      {/* 背景径向光晕 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(201,169,110,0.06) 0%, transparent 60%)',
        }}
      />

      {/* 上方回字纹 */}
      <div className="absolute top-24 left-0 right-0">
        <GreekKeyBorder />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 text-center px-4 animate-fade-in-up">
        {/* 副标题 */}
        <p className="text-gold/60 tracking-[0.4em] text-xs md:text-sm mb-4 uppercase">
          器物 · 道法 · 同修
        </p>

        {/* 主标题 */}
        <h1
          className="text-5xl md:text-7xl lg:text-8xl text-jade-white mb-6 leading-tight"
          style={{ fontFamily: 'var(--font-calligraphy)' }}
        >
          明道阁
        </h1>

        {/* 装饰分隔 */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="text-gold/40 text-lg">◆</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        {/* 品牌标语 */}
        <p className="text-jade-white/70 text-base md:text-lg mb-2 tracking-widest" style={{ fontFamily: 'var(--font-serif)' }}>
          一念一珠 · 串起山河万象
        </p>
        <p className="text-jade-white/40 text-sm md:text-base mb-12 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-serif)' }}>
          一串一世界，一法一修行。明道阁以手作珠串承东方之美，更以道法修行聚同道之人。
        </p>

        {/* CTA 三入口：品鉴手串 / 修行道法 / 任务集 */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 2.5, sm: 3 },
            px: { xs: 1, sm: 0 },
          }}
        >
          <Button onClick={scrollToProducts} variant="outlined" sx={ctaButtonSx}>
            结缘好物
          </Button>
          <Button onClick={() => navigate('/forum?cat=gongfa')} variant="outlined" sx={ctaButtonSx}>
            修行道法
          </Button>
          <Button onClick={() => navigate('/tasks')} variant="outlined" sx={ctaButtonSx}>
            任务集
          </Button>
        </Box>
      </div>

      {/* 下方回字纹 */}
      <div className="absolute bottom-12 left-0 right-0">
        <GreekKeyBorder />
      </div>

      {/* 底部滚动提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gold/30 text-xs">
        <span>向下滚动</span>
        <div className="w-px h-6 bg-gradient-to-b from-gold/30 to-transparent" />
      </div>
    </section>
  );
}
