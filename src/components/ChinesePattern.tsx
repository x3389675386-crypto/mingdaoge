/** 中式装饰组件 —— 祥云、回字纹、分隔线等 */

/** 祥云装饰 SVG */
export function CloudPattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-float-cloud ${className}`}
      width="120"
      height="60"
      viewBox="0 0 120 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 50C10 50 15 30 30 30C35 20 50 15 60 25C65 20 80 15 85 25C95 20 110 30 105 40C115 40 115 55 100 55L15 55C5 55 0 45 10 50Z"
        fill="rgba(201,169,110,0.08)"
        stroke="rgba(201,169,110,0.15)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** 回字纹装饰线 */
export function GreekKeyBorder({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="12"
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="greekKey" x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M0 12V6H4V2H8V10H12V6H16V2H20V12"
            fill="none"
            stroke="rgba(201,169,110,0.25)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="400" height="12" fill="url(#greekKey)" />
    </svg>
  );
}

/** 金色分隔线 */
export function GoldDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-gold/30" />
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6L8 0Z" fill="rgba(201,169,110,0.3)" />
      </svg>
      <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-gold/30" />
    </div>
  );
}

/** 竖向装饰纹 */
export function VerticalOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="2"
      height="100%"
      viewBox="0 0 2 200"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="1" y1="0" x2="1" y2="200" stroke="rgba(201,169,110,0.15)" strokeWidth="1" strokeDasharray="4 8" />
    </svg>
  );
}
