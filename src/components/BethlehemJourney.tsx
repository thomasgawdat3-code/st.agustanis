import React, { useId, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import {
  computeSuggestedDay,
  DEFAULT_COMPETITION_END_DATE,
  DEFAULT_COMPETITION_START_DATE,
  formatNumber,
  getDaysBetweenInclusive,
} from '../data/readingPlan';
import type { HeroIconSize, Language, ThemeMode } from '../types';

interface BethlehemJourneyProps {
  completedDaysCount: number;
  totalDays: number;
  percent: number;
  currentDay: number;
  lentStartDate: string;
  lentEndDate: string;
  userStartDate: string;
  lang: Language;
  theme: ThemeMode;
  christmasTheme?: boolean;
  size: HeroIconSize;
  caption: string;
}

function formatShortMonthDay(dateStr: string, lang: Language): string {
  const dt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(dt);
}

/**
 * Computes a winding hillside caravan road point (x, y) for normalized progress t in [0, 1].
 * ViewBox is 600x270 for crisp panoramic landscape detail without clipping on mobile.
 */
function getRoadPoint(t: number, isRtl: boolean): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const startX = isRtl ? 526 : 74;
  const endX = isRtl ? 112 : 488;
  const x = startX + (endX - startX) * clamped;
  const y = 214 - Math.sin(clamped * Math.PI * 2.2) * 10 - clamped * 8;
  return { x, y };
}

export const BethlehemJourney: React.FC<BethlehemJourneyProps> = ({
  completedDaysCount,
  totalDays,
  percent,
  currentDay,
  lentStartDate,
  lentEndDate,
  userStartDate,
  lang,
  theme,
  christmasTheme = true,
  size,
  caption,
}) => {
  const uid = useId().replace(/:/g, '');
  const isRtl = lang === 'ar';
  const isDark = theme === 'dark';

  const fastStart = lentStartDate || DEFAULT_COMPETITION_START_DATE;
  const fastEnd = lentEndDate || DEFAULT_COMPETITION_END_DATE;
  const fastTotalDays = Math.max(1, getDaysBetweenInclusive(fastStart, fastEnd));
  const fastTodayDay = computeSuggestedDay(fastStart, fastTotalDays);

  const joinOffsetDays =
    userStartDate > fastStart
      ? Math.min(
          fastTotalDays - 1,
          Math.max(0, getDaysBetweenInclusive(fastStart, userStartDate) - 1)
        )
      : 0;

  const userPlanDays = Math.max(1, totalDays);
  const clampedUserDone = Math.max(0, Math.min(userPlanDays, completedDaysCount));
  const hasArrived = clampedUserDone >= userPlanDays || percent >= 100;

  const remainingFastSpan = Math.max(1, fastTotalDays - joinOffsetDays);
  const journeyCompletedDays = hasArrived
    ? fastTotalDays
    : Math.min(
        fastTotalDays,
        Math.round(joinOffsetDays + (clampedUserDone / userPlanDays) * remainingFastSpan)
      );
  const activeFastMarkerDay = Math.min(fastTotalDays, joinOffsetDays + currentDay);

  const progressRatio = hasArrived ? 1 : journeyCompletedDays / fastTotalDays;
  const remainingDays = Math.max(0, fastTotalDays - journeyCompletedDays);

  const { roadPathD, milestones } = useMemo(() => {
    const samples = 72;
    const pts: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = getRoadPoint(t, isRtl);
      pts.push(`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }

    const stops = Array.from({ length: fastTotalDays }, (_, idx) => {
      const dayNum = idx + 1;
      const t = dayNum / fastTotalDays;
      const p = getRoadPoint(t, isRtl);
      return {
        dayNum,
        x: p.x,
        y: p.y,
        done: dayNum <= journeyCompletedDays,
        isCurrent: dayNum === activeFastMarkerDay || dayNum === fastTodayDay,
      };
    });

    return {
      roadPathD: pts.join(' '),
      milestones: stops,
    };
  }, [isRtl, fastTotalDays, journeyCompletedDays, activeFastMarkerDay, fastTodayDay]);

  const travelerT = hasArrived ? 0.96 : progressRatio * 0.9;
  const travelerPos = getRoadPoint(travelerT, isRtl);
  const bethlehemX = isRtl ? 82 : 518;
  const startX = isRtl ? 528 : 72;
  const moonX = isRtl ? 470 : 130;
  const shepherdX = isRtl ? 275 : 325;
  const magiX = isRtl ? 205 : 395;
  const startDateShort = formatShortMonthDay(fastStart, lang);
  const endDateShort = formatShortMonthDay(fastEnd, lang);

  const containerWidthClass =
    size === 'sm' ? 'max-w-xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-3xl';
  const svgMaxHeightClass =
    size === 'sm'
      ? 'max-h-56 sm:max-h-64'
      : size === 'lg'
      ? 'max-h-72 sm:max-h-88'
      : 'max-h-64 sm:max-h-76';

  // Theme-aware luminous atmospheric palette
  const skyTop = isDark ? '#0B1020' : '#183254';
  const skyMid = isDark ? '#19213D' : '#355E8E';
  const skyHorizon = isDark ? '#322030' : '#E8C59B';
  const hillDeepTop = isDark ? '#1A1E33' : '#6A718B';
  const hillDeepBot = isDark ? '#121424' : '#4C526B';
  const hillFarTop = isDark ? '#241F32' : '#8F7A82';
  const hillFarBot = isDark ? '#171322' : '#6D5B65';
  const hillMidTop = isDark ? '#33242D' : '#BE9571';
  const hillMidBot = isDark ? '#22171E' : '#966D4B';
  const groundTop = isDark ? '#291D23' : '#D9B994';
  const groundBot = isDark ? '#171014' : '#B99065';
  const roadCasing = isDark ? '#09070A' : '#FFFFFF';
  const roadBed = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(90,54,30,0.26)';
  const stoneWall = isDark ? '#4B323A' : '#C8A682';
  const stoneHighlight = isDark ? '#6B4752' : '#E4C6A4';
  const stoneShadow = isDark ? '#2B1B20' : '#8A6747';
  const caveInner = isDark ? '#13090D' : '#3A2316';
  const josephCloak = isDark ? '#9A3412' : '#7C2D12';
  const josephMantle = isDark ? '#D97706' : '#B45309';
  const maryRobe = isDark ? '#1D4ED8' : '#1E3A8A';
  const maryMantle = isDark ? '#60A5FA' : '#2563EB';
  const donkeyMain = isDark ? '#9CA3AF' : '#57534E';
  const donkeyLight = isDark ? '#D1D5DB' : '#78716C';
  const donkeyDark = isDark ? '#6B7280' : '#44403C';

  return (
    <div className={`w-full ${containerWidthClass} mx-auto pt-2`}>
      <div className="app-card border border-stone-200 dark:border-white/10 bg-white dark:bg-[#22191C] overflow-hidden shadow-sm">
        {/* Top Journey Status Bar */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-stone-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-stone-50/80 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-snug">
              {hasArrived
                ? isRtl
                  ? 'وصلت الأسرة إلى بيت لحم — وُلِدَ المخلّص!'
                  : 'Arrived in Bethlehem — The Savior is Born!'
                : isRtl
                ? 'الطريق إلى بيت لحم (مريم ويوسف في الطريق)'
                : 'On the Road to Bethlehem (Mary & Joseph)'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
            <span className="text-[var(--accent)]">
              {isRtl
                ? `${formatNumber(journeyCompletedDays, 'ar')} / ${formatNumber(fastTotalDays, 'ar')} يوماً`
                : `${journeyCompletedDays} / ${fastTotalDays} Days`}
            </span>
            <span aria-hidden="true" className="text-stone-400 dark:text-stone-500">
              ·
            </span>
            <span className="text-stone-700 dark:text-stone-200">
              {formatNumber(Math.round(progressRatio * 100), lang)}%
            </span>
          </div>
        </div>

        {/* Rich Panoramic Illustration: Road to Bethlehem */}
        <div className="relative w-full overflow-hidden" style={{ backgroundColor: groundBot }}>
          <svg
            viewBox="0 0 600 270"
            className={`w-full h-auto ${svgMaxHeightClass} block select-none`}
            preserveAspectRatio="xMidYMid meet"
            shapeRendering="geometricPrecision"
            role="img"
            aria-label={
              isRtl
                ? `رحلة مريم ويوسف إلى بيت لحم: تم اجتياز ${formatNumber(journeyCompletedDays, 'ar')} من ${formatNumber(fastTotalDays, 'ar')} يوماً`
                : `Mary and Joseph journey to Bethlehem: ${journeyCompletedDays} of ${fastTotalDays} days`
            }
          >
            <defs>
              {/* Atmospheric Sky */}
              <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={skyTop} />
                <stop offset="54%" stopColor={skyMid} />
                <stop offset="100%" stopColor={skyHorizon} />
              </linearGradient>

              {/* Soft Milky Way Sky Wash */}
              <linearGradient id={`nebula-${uid}`} x1="0" y1="0" x2="1" y2="0.6">
                <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0" />
                <stop offset="50%" stopColor="#E0E7FF" stopOpacity={isDark ? 0.14 : 0.08} />
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
              </linearGradient>

              {/* Active Theme Accent Horizon Glow */}
              <radialGradient id={`accentHorizon-${uid}`} cx="50%" cy="74%" r="62%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={isDark ? 0.36 : 0.24} />
                <stop offset="65%" stopColor="var(--accent)" stopOpacity={isDark ? 0.12 : 0.08} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </radialGradient>

              <linearGradient id={`hillDeep-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hillDeepTop} />
                <stop offset="100%" stopColor={hillDeepBot} />
              </linearGradient>

              <linearGradient id={`hillFar-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hillFarTop} />
                <stop offset="100%" stopColor={hillFarBot} />
              </linearGradient>

              <linearGradient id={`hillMid-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hillMidTop} />
                <stop offset="100%" stopColor={hillMidBot} />
              </linearGradient>

              <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={groundTop} />
                <stop offset="100%" stopColor={groundBot} />
              </linearGradient>

              <radialGradient id={`starGlow-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF9C3" stopOpacity="1" />
                <stop offset="30%" stopColor="#FBBF24" stopOpacity="0.62" />
                <stop offset="68%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={`moonHalo-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={`lanternGlow-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.98" />
                <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.46" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>

              <radialGradient id={`fireGlow-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#EA580C" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
              </radialGradient>

              <linearGradient id={`starRay-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity={hasArrived ? 0.72 : 0.42} />
                <stop offset="65%" stopColor="#FDE68A" stopOpacity={hasArrived ? 0.24 : 0.1} />
                <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
              </linearGradient>

              <filter id={`softGlow-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Sky + Nebula + Theme Accent Ambient Horizon */}
            <rect x="0" y="0" width="600" height="270" fill={`url(#sky-${uid})`} />
            <path d="M0 95 Q 240 20 600 85 L 600 140 Q 250 70 0 145 Z" fill={`url(#nebula-${uid})`} />
            <rect x="0" y="0" width="600" height="270" fill={`url(#accentHorizon-${uid})`} />

            {/* Soft Drifting Night Clouds */}
            <g className="bethlehem-cloud-drift" opacity={isDark ? 0.16 : 0.28}>
              <path
                d="M175 72 Q 192 60 212 68 Q 228 60 245 72 Q 258 74 256 80 L 168 80 Q 165 73 175 72 Z"
                fill="#FFFFFF"
              />
              <path
                d="M350 54 Q 368 44 388 52 Q 402 45 416 55 Q 426 58 424 63 L 342 63 Q 338 56 350 54 Z"
                fill="#FFFFFF"
              />
            </g>

            {/* 2. Crescent Moon with Soft Corona */}
            <g transform={`translate(${moonX}, 44)`}>
              <circle cx="0" cy="0" r="24" fill={`url(#moonHalo-${uid})`} />
              <path
                d="M-5 -13 A 13 13 0 1 0 12 8 A 10.2 10.2 0 1 1 -5 -13 Z"
                fill="#FEF3C7"
                opacity={isDark ? 0.92 : 0.72}
              />
            </g>

            {/* 3. Rich Twinkling Starfield */}
            {[
              [48, 34, 1.3, 0.2],
              [102, 26, 1.5, 0.7],
              [155, 58, 1.2, 1.3],
              [210, 22, 1.8, 1.8],
              [248, 46, 1.3, 0.4],
              [296, 26, 1.6, 2.2],
              [332, 62, 1.2, 0.9],
              [378, 30, 1.8, 1.5],
              [426, 52, 1.3, 2.0],
              [466, 26, 1.5, 0.5],
              [545, 38, 1.4, 1.1],
              [568, 66, 1.1, 2.4],
              [188, 92, 1.1, 0.8],
              [310, 88, 1.1, 1.6],
              [412, 86, 1.1, 2.5],
            ].map(([sx, sy, sr, delay], idx) => (
              <circle
                key={idx}
                cx={sx}
                cy={sy}
                r={sr}
                fill="#FEF3C7"
                opacity={isDark ? 0.82 : 0.7}
                className="xmas-light"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}

            {/* 4. Rotating Celestial Star of Bethlehem Directly Above Nativity Cave */}
            <g transform={`translate(${bethlehemX}, 46)`}>
              {/* Outer Radiant Beam Shafts down to the Manger */}
              <polygon points="0,4 -62,165 62,165" fill={`url(#starRay-${uid})`} />
              <polygon points="0,4 -24,165 24,165" fill={`url(#starRay-${uid})`} opacity="0.6" />

              {/* Layered Golden Aura */}
              <circle cx="0" cy="0" r={hasArrived ? 52 : 38} fill={`url(#starGlow-${uid})`} />

              {/* Counter-rotating 12-point Celestial Corona (centered at 0,0) */}
              <g className="bethlehem-star-spin-reverse">
                <path
                  d="M-15 -15 L-2.6 -4 L15 -15 L4 -2.6 L15 15 L2.6 4 L-15 15 L-4 2.6 Z"
                  fill="#FDE68A"
                  opacity="0.72"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="17"
                  fill="none"
                  stroke="#FEF3C7"
                  strokeOpacity="0.4"
                  strokeWidth="0.8"
                  strokeDasharray="2 3.5"
                />
              </g>

              {/* Main Faceted Rotating 8-point Star of Bethlehem */}
              <g className="bethlehem-star-spin" filter={`url(#softGlow-${uid})`}>
                <path
                  d="M0 -23 L3.6 -4.6 L23 0 L3.6 4.6 L0 23 L-3.6 4.6 L-23 0 L-3.6 -4.6 Z"
                  fill="#FBBF24"
                  stroke="#92400E"
                  strokeOpacity={isDark ? 0.45 : 0.65}
                  strokeWidth="0.9"
                />
                <path
                  d="M-11 -11 L-2 -2.4 L11 -11 L2.4 -2 L11 11 L2 2.4 L-11 11 L-2.4 2 Z"
                  fill="#FEF3C7"
                  opacity="0.94"
                />
                <circle cx="0" cy="0" r="3.4" fill="#FFFBEB" />
              </g>
            </g>

            {/* 5. Four Layered Judean Mountain & Desert Ridges */}
            <path
              d="M0 154 Q 80 110 175 138 Q 280 105 390 136 Q 495 108 600 146 L 600 270 L 0 270 Z"
              fill={`url(#hillDeep-${uid})`}
            />
            {/* Subtle Magi / Camel Caravan Silhouette on the Far Ridge */}
            <g transform={`translate(${magiX}, 131)`} opacity={isDark ? 0.55 : 0.45}>
              {[-18, 0, 18].map((ox, i) => (
                <g key={i} transform={`translate(${ox}, ${i === 1 ? -1 : 1}) scale(${isRtl ? -0.58 : 0.58}, 0.58)`}>
                  <path d="M-8 0 L-7 -9 Q -2 -15 3 -10 Q 7 -14 10 -15 L 12 -13 L 9 -6 L 8 0 L 6 0 L 6 -5 L -5 -5 L -5 0 Z" fill={hillDeepBot} />
                  <circle cx="1" cy="-16" r="2.2" fill={hillDeepBot} />
                </g>
              ))}
            </g>

            <path
              d="M0 176 Q 110 138 225 164 T 445 156 T 600 172 L 600 270 L 0 270 Z"
              fill={`url(#hillFar-${uid})`}
            />
            <path
              d="M0 198 Q 145 168 290 188 T 515 178 T 600 194 L 600 270 L 0 270 Z"
              fill={`url(#hillMid-${uid})`}
            />

            {/* Distant Shepherds by a Warm Campfire & Sheep on the Hillside */}
            <g transform={`translate(${shepherdX}, 178)`}>
              <circle cx="0" cy="-2" r="14" fill={`url(#fireGlow-${uid})`} />
              {/* Firewood & flame */}
              <polygon points="-3,0 0,-6 3,0" fill="#F97316" />
              <polygon points="-1.5,0 0,-4 1.5,0" fill="#FEF08A" />
              {/* Shepherd with staff */}
              <g transform="translate(-8, 0)">
                <path d="M-2.2 0 L-1.5 -10 L1.5 -10 L2.2 0 Z" fill={stoneShadow} />
                <circle cx="0" cy="-12" r="1.8" fill="#E6BE9A" />
                <line x1="2.8" y1="-13" x2="2.5" y2="0" stroke="#92400E" strokeWidth="0.9" />
              </g>
              {/* Grazing sheep silhouettes */}
              <ellipse cx="9" cy="-2" rx="3.2" ry="2.1" fill="#F5F5F4" opacity="0.82" />
              <circle cx="12" cy="-3" r="1.1" fill="#D6D3D1" />
              <ellipse cx="16" cy="-1.2" rx="2.8" ry="1.8" fill="#E7E5E4" opacity="0.75" />
            </g>

            {/* Foreground Meadow / Desert Road Terrain */}
            <path
              d="M0 220 Q 170 202 335 216 T 600 212 L 600 270 L 0 270 Z"
              fill={`url(#ground-${uid})`}
            />

            {/* 6. Olive, Cypress & Festive Evergreen Trees */}
            {christmasTheme ? (
              <g opacity={isDark ? 0.94 : 0.92}>
                {[
                  [148, 180, 0.86],
                  [170, 185, 0.65],
                  [252, 184, 0.78],
                  [392, 178, 0.88],
                  [414, 184, 0.65],
                  [468, 182, 0.8],
                ].map(([tx, ty, sc], idx) => (
                  <g key={idx} transform={`translate(${tx}, ${ty}) scale(${sc})`}>
                    <rect x="-2.2" y="-3" width="4.4" height="8" fill="#78350F" />
                    <polygon points="0,-34 -12,-15 12,-15" fill={isDark ? '#15803D' : '#16A34A'} />
                    <polygon points="0,-34 -6,-24 6,-24" fill="#F8FAFC" opacity="0.9" />
                    <polygon points="0,-22 -15,-3 15,-3" fill={isDark ? '#166534' : '#15803D'} />
                    <circle
                      cx={idx % 2 === 0 ? -4.5 : 4.5}
                      cy="-10"
                      r="1.6"
                      fill={idx % 2 === 0 ? '#FDE047' : 'var(--accent)'}
                      className="xmas-light"
                    />
                    <circle
                      cx={idx % 2 === 0 ? 3.5 : -3.5}
                      cy="-17"
                      r="1.3"
                      fill={idx % 2 === 0 ? 'var(--accent)' : '#FDE047'}
                      className="xmas-light"
                      style={{ animationDelay: `${idx * 0.45}s` }}
                    />
                  </g>
                ))}
              </g>
            ) : (
              <g opacity={isDark ? 0.55 : 0.68}>
                {[150, 255, 395, 465].map((tx, idx) => (
                  <g key={idx} transform={`translate(${tx}, 182)`}>
                    <rect x="-1.6" y="-6" width="3.2" height="9" fill="#573B2A" />
                    <ellipse cx="0" cy="-13" rx="6.5" ry="9" fill={isDark ? '#2E4028' : '#5F774B'} />
                  </g>
                ))}
              </g>
            )}

            {/* 7. Nazareth Starting Village (Detailed Stone Architecture + Palm Tree) */}
            <g transform={`translate(${startX}, 212)`}>
              <ellipse cx="-2" cy="4" rx="28" ry="4.5" fill="rgba(0,0,0,0.25)" />
              {/* Palm tree behind Nazareth */}
              <g transform="translate(-22, -2)">
                <path d="M0 0 Q -3 -15 -1 -28" fill="none" stroke="#78350F" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M-1 -28 Q -10 -33 -13 -26" fill="none" stroke={isDark ? '#166534' : '#15803D'} strokeWidth="2" strokeLinecap="round" />
                <path d="M-1 -28 Q 8 -33 11 -26" fill="none" stroke={isDark ? '#15803D' : '#16A34A'} strokeWidth="2" strokeLinecap="round" />
                <path d="M-1 -28 Q -6 -38 3 -36" fill="none" stroke={isDark ? '#15803D' : '#22C55E'} strokeWidth="1.8" strokeLinecap="round" />
              </g>
              {/* Main domed house */}
              <rect x="-18" y="-25" width="17" height="25" rx="1.5" fill={stoneWall} stroke={stoneShadow} strokeWidth="0.8" />
              <path d="M-18 -25 Q -9.5 -34 -1 -25 Z" fill={stoneHighlight} />
              <path d="M-12 0 L-12 -8 A 3 3 0 0 1 -6 -8 L-6 0 Z" fill={caveInner} opacity="0.7" />
              <rect x="-14" y="-19" width="4.5" height="5" rx="1" fill="#FBBF24" opacity="0.9" />
              {/* Adjacent cottage */}
              <rect x="0" y="-18" width="14" height="18" rx="1.5" fill={stoneHighlight} stroke={stoneShadow} strokeWidth="0.8" />
              <rect x="4" y="-12" width="4" height="4.5" rx="1" fill="#FBBF24" opacity="0.78" />
            </g>

            {/* 8. Bethlehem Hillside Village & Sculpted Nativity Grotto */}
            <g transform={`translate(${bethlehemX}, 210)`}>
              {/* Background Bethlehem stone towers & domes */}
              <rect x="-46" y="-42" width="20" height="40" rx="2" fill={stoneWall} opacity="0.88" stroke={stoneShadow} strokeWidth="0.7" />
              <path d="M-46 -42 Q -36 -54 -26 -42 Z" fill={stoneHighlight} />
              <rect x="-39" y="-31" width="4.5" height="5.5" rx="1" fill="#FDE68A" opacity="0.85" />
              <rect x="-39" y="-20" width="4.5" height="5.5" rx="1" fill="#FDE68A" opacity="0.65" />

              <rect x="26" y="-36" width="18" height="34" rx="2" fill={stoneWall} opacity="0.88" stroke={stoneShadow} strokeWidth="0.7" />
              <path d="M26 -36 Q 35 -46 44 -36 Z" fill={stoneHighlight} />
              <rect x="32" y="-25" width="4.5" height="5.5" rx="1" fill="#FDE68A" opacity="0.82" />

              {/* Ground shadow under Cave */}
              <ellipse cx="0" cy="6" rx="40" ry="5.5" fill="rgba(0,0,0,0.3)" />

              {/* Outer Limestone Grotto & Wooden Stable Roof Beams */}
              <path
                d="M-36 5 C -36 -38, 36 -38, 36 5 Z"
                fill={stoneWall}
                stroke={stoneHighlight}
                strokeWidth="1.8"
              />
              {/* Timber overhang inside arch */}
              <polygon points="-28,-16 0,-30 28,-16 24,-13 0,-25 -24,-13" fill="#78350F" opacity="0.92" />
              <path d="M-26 5 C -26 -25, 26 -25, 26 5 Z" fill={caveInner} />

              {/* Hanging Grotto Lantern */}
              <line x1="0" y1="-25" x2="0" y2="-20" stroke="#F59E0B" strokeWidth="1" />
              <circle cx="0" cy="-18" r="2.3" fill="#FEF08A" />

              {/* Warm Hearth Radiance inside Cave */}
              <ellipse
                cx="0"
                cy="-7"
                rx="22"
                ry="14"
                fill="#F59E0B"
                opacity={hasArrived ? 0.48 : 0.2}
              />

              {/* Wooden Manger Cradle with Straw */}
              <g transform="translate(0, -1)">
                <path
                  d="M-10 -4.5 L10 -4.5 L7.5 2 L-7.5 2 Z"
                  fill="#92400E"
                  stroke="#F59E0B"
                  strokeWidth="0.9"
                />
                <line x1="-6.5" y1="2" x2="-8.5" y2="5.5" stroke="#78350F" strokeWidth="1.7" />
                <line x1="6.5" y1="2" x2="8.5" y2="5.5" stroke="#78350F" strokeWidth="1.7" />
                <path d="M-9 -4.5 Q 0 -7.5 9 -4.5" fill="#FBBF24" opacity="0.9" />

                {hasArrived && (
                  <g>
                    {/* Infant Christ Child Nimbus & Swaddling Cloth */}
                    <circle cx="0" cy="-9" r="11" fill="#FDE68A" opacity="0.56" />
                    <circle cx="0" cy="-8" r="5" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.1" />
                    <ellipse cx="0" cy="-6.8" rx="7" ry="2.8" fill="#FFFBEB" />
                    <circle cx="-3.6" cy="-8" r="2.3" fill="#F3D2B3" />

                    {/* St. Mary kneeling in prayer inside Bethlehem */}
                    <g transform="translate(-15.5, 0)">
                      <circle cx="0" cy="-17" r="4.5" fill="none" stroke="#FBBF24" strokeWidth="1.2" opacity="0.95" />
                      <path d="M-5.5 4.5 C -5.5 -6, -3 -13, 0 -14 C 3 -13, 5.5 -6, 4.5 4.5 Z" fill={maryRobe} />
                      <path d="M-4.5 -13 Q 0 -17 3.5 -12 L 1.5 -4 L -3.5 -4 Z" fill={maryMantle} />
                      <circle cx="0.6" cy="-16.5" r="2.7" fill="#F3D2B3" />
                    </g>

                    {/* St. Joseph standing watch with staff inside Bethlehem */}
                    <g transform="translate(15.5, 0)">
                      <circle cx="0" cy="-19" r="4.5" fill="none" stroke="#FBBF24" strokeWidth="1.1" opacity="0.92" />
                      <path d="M-4.5 4.5 L -3.5 -15 L 3.5 -15 L 4.5 4.5 Z" fill={josephCloak} />
                      <path d="M-4 -14 L 3.5 -13 L 2 -5 L -4 -7 Z" fill={josephMantle} opacity="0.88" />
                      <circle cx="0" cy="-18.5" r="2.8" fill="#E6BE9A" />
                      <line x1="6.5" y1="-21" x2="5.5" y2="4.5" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" />
                    </g>
                  </g>
                )}
              </g>
            </g>

            {/* 9. Road Track with High-Contrast Casing & Accent Progress Fill */}
            {/* Soft road ground shadow */}
            <path
              d={roadPathD}
              fill="none"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="12.5"
              strokeLinecap="round"
              transform="translate(0, 2)"
            />
            <path
              d={roadPathD}
              fill="none"
              stroke={roadCasing}
              strokeOpacity={isDark ? 0.72 : 0.9}
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d={roadPathD}
              fill="none"
              stroke={roadBed}
              strokeWidth="6.4"
              strokeLinecap="round"
              strokeDasharray="6 5"
            />

            {/* Traveled Accent Progress Path */}
            <path
              d={roadPathD}
              pathLength={100}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6.2"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={100 - progressRatio * 100}
              style={{ transition: 'stroke-dashoffset 650ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
            <path
              d={roadPathD}
              pathLength={100}
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.38"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={100 - progressRatio * 100}
              style={{ transition: 'stroke-dashoffset 650ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />

            {/* 10. 43-Day Milestone Nodes along the Caravan Trail */}
            {milestones.map((m) => {
              const isWeekStop =
                m.dayNum % 7 === 0 || m.dayNum === 1 || m.dayNum === fastTotalDays;
              return (
                <g key={m.dayNum}>
                  {m.isCurrent && (
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={7.5}
                      fill="var(--accent)"
                      opacity="0.28"
                    />
                  )}
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={m.isCurrent ? 4.3 : isWeekStop ? 3 : 1.7}
                    fill={
                      m.done
                        ? 'var(--accent)'
                        : isDark
                        ? 'rgba(255,255,255,0.36)'
                        : 'rgba(120,80,50,0.42)'
                    }
                    stroke={
                      m.isCurrent
                        ? '#FBBF24'
                        : m.done
                        ? isDark
                          ? '#181214'
                          : '#FFFFFF'
                        : 'none'
                    }
                    strokeWidth={m.isCurrent ? 1.7 : 0.9}
                  />
                </g>
              );
            })}

            {/* 11. St. Mary & St. Joseph Traveling Together Toward Bethlehem */}
            {!hasArrived && (
              <g
                style={{
                  transform: `translate(${travelerPos.x.toFixed(1)}px, ${travelerPos.y.toFixed(1)}px)`,
                  transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <g transform={isRtl ? 'scale(-1.28, 1.28)' : 'scale(1.28)'}>
                  {/* Ground shadow remains steady */}
                  <ellipse cx="-1" cy="3.8" rx="28" ry="4" fill="rgba(0,0,0,0.3)" />

                  <g className="bethlehem-traveler-bob">
                    {/* Warm Lantern Light Casting Forward */}
                    <circle cx="26" cy="-19" r="30" fill={`url(#lanternGlow-${uid})`} />

                    {/* Gentle Donkey Carrying St. Mary */}
                    <g transform="translate(-8, -2)">
                      {/* Back & front legs */}
                      <line x1="-11" y1="-8" x2="-12.5" y2="3.2" stroke={donkeyDark} strokeWidth="2.6" strokeLinecap="round" />
                      <line x1="-6" y1="-8" x2="-4.8" y2="3.2" stroke={donkeyMain} strokeWidth="2.4" strokeLinecap="round" />
                      <line x1="6" y1="-8" x2="7.2" y2="3.2" stroke={donkeyDark} strokeWidth="2.6" strokeLinecap="round" />
                      <line x1="10" y1="-8" x2="12" y2="3.2" stroke={donkeyMain} strokeWidth="2.4" strokeLinecap="round" />
                      {/* Tail */}
                      <path d="M-13.5 -14 Q -19 -9.5 -17.5 -4.5" fill="none" stroke={donkeyDark} strokeWidth="1.7" strokeLinecap="round" />
                      {/* Body & shoulder highlight */}
                      <ellipse cx="-1" cy="-12" rx="14" ry="7" fill={donkeyMain} />
                      <ellipse cx="0" cy="-14.2" rx="9.5" ry="3.5" fill={donkeyLight} opacity="0.5" />
                      {/* Accent Woven Saddle Blanket with Gold Trim */}
                      <path
                        d="M-9 -18.8 Q 0 -20 7 -17.8 L 5.5 -9.5 L -8 -9.5 Z"
                        fill="var(--accent)"
                        stroke="#FDE68A"
                        strokeWidth="0.8"
                      />
                      {/* Neck, Head, Ears & Bridle */}
                      <path d="M9 -14 L 16.5 -23.5 L 23.5 -20.5 L 21 -15.8 L 13 -11 Z" fill={donkeyMain} />
                      <path d="M15 -23.5 L 14 -31 L 17.5 -24.5 Z" fill={donkeyDark} />
                      <path d="M17.5 -22.5 L 18.5 -30 L 19.5 -22.5 Z" fill={donkeyLight} />
                      <circle cx="19" cy="-21" r="0.7" fill="#1C1917" />
                      <line x1="18" y1="-19" x2="22" y2="-18" stroke="#D97706" strokeWidth="0.9" />
                    </g>

                    {/* St. Mary Seated Serenely on Saddle */}
                    <g transform="translate(-9, -16)">
                      <circle cx="0" cy="-22.5" r="6.5" fill="none" stroke="#FBBF24" strokeWidth="1.35" opacity="0.96" />
                      <path d="M-6.2 2.2 C -6.2 -9, -4 -17.5, 0 -18.5 C 5 -17.5, 6.2 -8, 6.2 2.2 Z" fill={maryRobe} />
                      <path d="M-4.2 -18.5 Q 1.2 -22.5 5.2 -16 L 3.2 -3 L -4.2 -4 Z" fill={maryMantle} stroke="#FDE68A" strokeOpacity="0.5" strokeWidth="0.6" />
                      <circle cx="1.2" cy="-22" r="3.3" fill="#F3D2B3" />
                      <path d="M2.2 -13 Q 6.2 -11 4.2 -8" fill="none" stroke="#F3D2B3" strokeWidth="1.8" strokeLinecap="round" />
                    </g>

                    {/* St. Joseph Walking Ahead with Staff & Swaying Lantern */}
                    <g transform="translate(17.5, 0)">
                      <circle cx="0" cy="-35.5" r="6.2" fill="none" stroke="#FBBF24" strokeWidth="1.3" opacity="0.94" />
                      <line x1="-2.2" y1="-10" x2="-5" y2="2.2" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
                      <line x1="2.2" y1="-10" x2="5" y2="2.2" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
                      <path d="M-5.2 -8 L -4 -29.5 L 4 -29.5 L 5.2 -8 Z" fill={josephCloak} />
                      <path d="M-5.2 -28.5 Q 0 -31.5 5.2 -26.5 L 3 -14 L -5.2 -16 Z" fill={josephMantle} opacity="0.92" />
                      <circle cx="0.5" cy="-34.5" r="3.5" fill="#E6BE9A" />
                      <path d="M-1.5 -32.2 Q 1 -28.5 3.6 -32.2" fill="#6B4F3A" />
                      <line x1="3" y1="-24" x2="9.2" y2="-21" stroke="#E6BE9A" strokeWidth="2" strokeLinecap="round" />
                      <line x1="9.2" y1="-39.5" x2="7.2" y2="2.2" stroke="#B45309" strokeWidth="2.1" strokeLinecap="round" />
                      <g className="bethlehem-lantern-sway">
                        <line x1="9.2" y1="-26.5" x2="9.2" y2="-21" stroke="#D97706" strokeWidth="1" />
                        <rect x="6.6" y="-21" width="5.2" height="6.6" rx="1.3" fill="#FEF08A" stroke="#B45309" strokeWidth="0.95" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Bottom Route Landmarks & Caption */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-stone-200/80 dark:border-white/10 flex flex-col gap-1.5 bg-stone-50/70 dark:bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] sm:text-xs font-semibold text-stone-600 dark:text-stone-300">
            <span>
              {isRtl ? `الناصرة · ${startDateShort}` : `Nazareth · ${startDateShort}`}
            </span>
            <span className="text-[var(--accent)] font-bold tabular-nums text-center">
              {hasArrived
                ? isRtl
                  ? 'اكتمل الطريق في بيت لحم!'
                  : 'Reached Bethlehem!'
                : isRtl
                ? `اليوم ${formatNumber(fastTodayDay, 'ar')} من ${formatNumber(fastTotalDays, 'ar')} في الصوم · متبقّي ${formatNumber(remainingDays, 'ar')} يوماً للوصول`
                : `Fast Day ${fastTodayDay} of ${fastTotalDays} · ${remainingDays} days to Bethlehem`}
            </span>
            <span>
              {isRtl ? `بيت لحم · ${endDateShort}` : `Bethlehem · ${endDateShort}`}
            </span>
          </div>

          {caption && (
            <p className="text-center text-xs font-semibold text-stone-600 dark:text-stone-300 pt-0.5">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
