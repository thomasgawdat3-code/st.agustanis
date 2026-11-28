import React, { useId } from 'react';
import { formatNumber } from '../data/readingPlan';
import type { HeroIconKey, HeroIconSize, Language } from '../types';
import { HeroSymbol } from './HeroSymbol';

interface ProgressHeartProps {
  percent: number; // 0..100
  lang: Language;
  icon: HeroIconKey;
  size: HeroIconSize;
  caption: string;
}

export const ProgressHeart: React.FC<ProgressHeartProps> = ({
  percent,
  lang,
  icon,
  size,
  caption,
}) => {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(100, percent));

  const sizePx = size === 'sm' ? 76 : size === 'lg' ? 124 : 98;
  // Heart SVG viewBox is 0..100 x 0..92; inner path spans roughly y=10..84
  const fillTopY = 84 - (clamped / 100) * 74;

  return (
    <div className="pt-2 flex flex-col items-center justify-center gap-2.5">
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: sizePx, height: sizePx }}
      >
        {/* Ambient ruby glow scales with completion */}
        <div
          className="absolute inset-1 rounded-full blur-xl heart-aura transition-opacity duration-500"
          style={{
            backgroundColor: 'var(--accent-glow)',
            opacity: 0.35 + (clamped / 100) * 0.65,
          }}
        />

        {icon === 'heart' ? (
          <svg
            viewBox="0 0 100 92"
            className="relative w-full h-full drop-shadow-sm"
            role="img"
            aria-label={
              lang === 'ar'
                ? `نسبة امتلاء القلب ${formatNumber(clamped, 'ar')} في المئة`
                : `Heart filled ${clamped}%`
            }
          >
            <defs>
              <clipPath id={clipId}>
                <path d="M50 85.5C48.3 85.5 46.7 84.9 45.4 83.7C21.2 61.9 8 48.2 8 30.8C8 17.6 18.4 7.5 31.6 7.5C39.2 7.5 46.2 11.1 50 17.1C53.8 11.1 60.8 7.5 68.4 7.5C81.6 7.5 92 17.6 92 30.8C92 48.2 78.8 61.9 54.6 83.7C53.3 84.9 51.7 85.5 50 85.5Z" />
              </clipPath>
              <linearGradient id={`${clipId}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent-hover)" />
              </linearGradient>
            </defs>

            {/* Empty heart base */}
            <path
              d="M50 85.5C48.3 85.5 46.7 84.9 45.4 83.7C21.2 61.9 8 48.2 8 30.8C8 17.6 18.4 7.5 31.6 7.5C39.2 7.5 46.2 11.1 50 17.1C53.8 11.1 60.8 7.5 68.4 7.5C81.6 7.5 92 17.6 92 30.8C92 48.2 78.8 61.9 54.6 83.7C53.3 84.9 51.7 85.5 50 85.5Z"
              fill="var(--accent-soft)"
              stroke="var(--accent)"
              strokeWidth="2.8"
            />

            {/* Liquid rising fill clipped inside the heart */}
            <g clipPath={`url(#${clipId})`}>
              <rect
                x="0"
                y={fillTopY}
                width="100"
                height="96"
                fill={`url(#${clipId}-fill)`}
                style={{ transition: 'y 550ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
              {clamped > 0 && clamped < 100 && (
                <>
                  <path
                    d={`M0 ${fillTopY} Q 25 ${fillTopY - 4}, 50 ${fillTopY} T 100 ${fillTopY} L 100 96 L 0 96 Z`}
                    fill="var(--accent)"
                    style={{ transition: 'd 550ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                  <path
                    d={`M0 ${fillTopY + 1} Q 25 ${fillTopY + 4}, 50 ${fillTopY + 1} T 100 ${fillTopY + 1}`}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeOpacity="0.45"
                    strokeWidth="1.4"
                  />
                </>
              )}
              {/* Delicate specular highlight sheen on upper left lobe */}
              <path
                d="M21 20 C 17 24, 16 32, 19 38"
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.35"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>

            {/* Inner percentage text */}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              className="font-ui font-extrabold tabular-nums"
              fontSize="16"
              fill={clamped >= 48 ? '#FFFFFF' : 'var(--accent)'}
            >
              {formatNumber(clamped, lang)}%
            </text>
          </svg>
        ) : (
          <div className="relative w-full h-full rounded-2xl bg-[var(--accent-soft)] border-2 border-[var(--accent)]/40 text-[var(--accent)] flex flex-col items-center justify-center overflow-hidden">
            <div
              className="absolute inset-x-0 bottom-0 bg-[var(--accent)] transition-all duration-500"
              style={{ height: `${clamped}%`, opacity: 0.22 }}
            />
            <HeroSymbol icon={icon} className="relative w-8 h-8" filled={clamped === 100} />
            <span className="relative text-xs font-extrabold tabular-nums mt-0.5">
              {formatNumber(clamped, lang)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
        {caption}
      </p>
    </div>
  );
};
