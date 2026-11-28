import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, EyeOff, MessageCircleHeart, Sparkles, X } from 'lucide-react';
import { formatNumber } from '../data/readingPlan';
import type { Language, ThemeMode } from '../types';

interface ReadingBuddyProps {
  lang: Language;
  theme: ThemeMode;
  christmasTheme: boolean;
  userName: string;
  remainingTonightChapters: number;
  totalRemainingChapters: number;
  completedChapters: number;
  totalChapters: number;
  streak: number;
  percent: number;
  isReading?: boolean;
  paused?: boolean;
  onGoToReader: () => void;
}

const BUDDY_SIZE = 78;
const SAFE_MARGIN_X = 14;
const SAFE_TOP = 78;
const SAFE_BOTTOM = 82;

function formatArabicChapters(count: number): string {
  if (count === 1) return 'أصحاح واحد';
  if (count === 2) return 'أصحاحين';
  if (count <= 10) return `${formatNumber(count, 'ar')} أصحاحات`;
  return `${formatNumber(count, 'ar')} أصحاحاً`;
}

export const ReadingBuddy: React.FC<ReadingBuddyProps> = ({
  lang,
  theme,
  christmasTheme,
  userName,
  remainingTonightChapters,
  totalRemainingChapters,
  completedChapters,
  totalChapters,
  streak,
  percent,
  isReading = false,
  paused = false,
  onGoToReader,
}) => {
  const firstName = useMemo(() => {
    const clean = (userName || '').trim().split(/\s+/)[0];
    return clean || (lang === 'ar' ? 'صديقي' : 'Friend');
  }, [userName, lang]);

  const [minimized, setMinimized] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [moveDurationMs, setMoveDurationMs] = useState(4200);
  const [isDragging, setIsDragging] = useState(false);
  const [happyBurst, setHappyBurst] = useState(false);

  const getCornerParkPos = useCallback(() => {
    if (typeof window === 'undefined') return { x: 18, y: 520 };
    const isRtl = document.documentElement.dir === 'rtl';
    const x = isRtl
      ? SAFE_MARGIN_X
      : Math.max(SAFE_MARGIN_X, window.innerWidth - BUDDY_SIZE - SAFE_MARGIN_X);
    const y = Math.max(SAFE_TOP, window.innerHeight - BUDDY_SIZE - 18);
    return { x, y };
  }, []);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 24, y: 180 };
    const startX =
      document.documentElement.dir === 'rtl'
        ? SAFE_MARGIN_X + 8
        : Math.max(SAFE_MARGIN_X, window.innerWidth - BUDDY_SIZE - 20);
    const startY = Math.max(
      SAFE_TOP,
      Math.min(window.innerHeight - BUDDY_SIZE - SAFE_BOTTOM, 160)
    );
    return { x: startX, y: startY };
  });

  const posRef = useRef(pos);
  posRef.current = pos;

  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const maxX = Math.max(SAFE_MARGIN_X, window.innerWidth - BUDDY_SIZE - SAFE_MARGIN_X);
    const maxY = Math.max(SAFE_TOP, window.innerHeight - BUDDY_SIZE - SAFE_BOTTOM);
    return {
      x: Math.max(SAFE_MARGIN_X, Math.min(maxX, x)),
      y: Math.max(SAFE_TOP, Math.min(maxY, y)),
    };
  }, []);

  // Keep buddy inside viewport if window resizes / rotates
  useEffect(() => {
    const onResize = () => {
      if (isReading) {
        setPos(getCornerParkPos());
      } else {
        setPos((curr) => clampPosition(curr.x, curr.y));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPosition, getCornerParkPos, isReading]);

  // When user starts reading an expanded chapter, smoothly park the buddy in the corner and close the bubble
  useEffect(() => {
    if (isReading) {
      setIsWalking(false);
      setBubbleOpen(false);
      setMoveDurationMs(1400);
      setPos(getCornerParkPos());
    }
  }, [isReading, getCornerParkPos]);

  // Balanced lively roaming cycle: playful medium stroll across display, calm 5s pause with bubble open to read
  useEffect(() => {
    if (minimized || paused || isReading || prefersReducedMotion || isDragging || isHovered) {
      setIsWalking(false);
      return;
    }

    let timer: number | null = null;

    if (bubbleOpen) {
      // Stay still for 5.2s while bubble is open so the message is completely steady and easy to read
      setIsWalking(false);
      timer = window.setTimeout(() => {
        setBubbleOpen(false);
      }, 5200);
    } else {
      // Launch next playful stroll almost immediately (350ms) toward a distinctly different spot on screen
      timer = window.setTimeout(() => {
        if (typeof window === 'undefined') return;
        const maxX = Math.max(SAFE_MARGIN_X + 10, window.innerWidth - BUDDY_SIZE - SAFE_MARGIN_X);
        const maxY = Math.max(SAFE_TOP + 10, window.innerHeight - BUDDY_SIZE - SAFE_BOTTOM);

        let chosen = clampPosition(
          SAFE_MARGIN_X + Math.random() * (maxX - SAFE_MARGIN_X),
          SAFE_TOP + Math.random() * (maxY - SAFE_TOP)
        );

        // Ensure each stroll covers a noticeable distance across the display
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = clampPosition(
            SAFE_MARGIN_X + Math.random() * (maxX - SAFE_MARGIN_X),
            SAFE_TOP + Math.random() * (maxY - SAFE_TOP)
          );
          if (Math.hypot(candidate.x - posRef.current.x, candidate.y - posRef.current.y) >= 130) {
            chosen = candidate;
            break;
          }
        }

        const dx = chosen.x - posRef.current.x;
        const dy = chosen.y - posRef.current.y;
        const dist = Math.hypot(dx, dy);

        // Smooth playful stroll (~58px/s, 1.8s to 4.2s)
        const duration = Math.round(Math.max(1800, Math.min(4200, (dist / 58) * 1000)));
        setFacingRight(dx >= 0);
        setMoveDurationMs(duration);
        setIsWalking(true);
        setPos(chosen);

        timer = window.setTimeout(() => {
          setIsWalking(false);
          setMsgIndex((idx) => idx + 1);
          setBubbleOpen(true);
        }, duration);
      }, 350);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [
    bubbleOpen,
    minimized,
    paused,
    isReading,
    prefersReducedMotion,
    isDragging,
    isHovered,
    clampPosition,
  ]);

  const messages = useMemo(() => {
    if (lang === 'ar') {
      const tonightAr = formatArabicChapters(remainingTonightChapters);
      const totalRemAr = formatArabicChapters(totalRemainingChapters);
      const doneAr = formatNumber(completedChapters, 'ar');
      const totalAr = formatNumber(totalChapters, 'ar');
      const pctAr = formatNumber(percent, 'ar');

      if (totalRemainingChapters <= 0) {
        return [
          `مبروك يا ${firstName}! ختمت الأناجيل الأربعة (${totalAr} أصحاح) ووصلت بيت لحم ✨`,
          `عاش يا ${firstName}! إنجاز ${pctAr}٪ — قلبك منوّر بكلمة ربنا ❤️`,
          `أهلاً بيك في بيت لحم يا ${firstName}! تقدر تراجع أي أصحاح تحبه في أي وقت 📖`,
        ];
      }

      if (remainingTonightChapters <= 0) {
        return [
          `عاش يا ${firstName}! خلصت قراءة الليلة 🎉 فاضل ليك ${totalRemAr} في الرحلة كلها`,
          `برافو عليك يا ${firstName} 🌟 قرأت ${doneAr} من ${totalAr} أصحاح لحد دلوقتي!`,
          `قلبك بيتجهز للميلاد يا ${firstName} 🤍 باقي ${totalRemAr} ونوصل بيت لحم مع بعض!`,
        ];
      }

      return [
        `يلا نقرأ يا ${firstName}! فاضل ليك ${tonightAr} النهارده بس 📖`,
        `شد حيلك يا ${firstName}، باقي ${tonightAr} الليلة ونقفل قراءة اليوم ✨`,
        `كلمة واحدة من الإنجيل بتفرّح اليوم كله يا ${firstName} — فاضل ${tonightAr} لليلة ❤️`,
        streak > 0
          ? `أنت مستمر ${formatNumber(streak, 'ar')} أيام ورا بعض يا ${firstName} 🔥 يلا نكمل ${tonightAr}!`
          : `أهلاً يا ${firstName}! يلا نبدأ رحلة القراءة مع بعض — فاضل ${tonightAr} النهارده 🌟`,
        `فاضل ليك ${tonightAr} النهارده، و${totalRemAr} في الرحلة كلها (${pctAr}٪ مكتمل) 💪`,
      ];
    }

    if (totalRemainingChapters <= 0) {
      return [
        `Amazing, ${firstName}! You finished all ${totalChapters} Gospel chapters and reached Bethlehem ✨`,
        `100% complete, ${firstName}! Your heart is glowing with His Word ❤️`,
      ];
    }

    if (remainingTonightChapters <= 0) {
      return [
        `Well done, ${firstName}! Today's reading is complete 🎉 ${totalRemainingChapters} chapters left overall!`,
        `Keep shining, ${firstName}! You've read ${completedChapters} of ${totalChapters} chapters 🌟`,
      ];
    }

    const tonightEn = `${remainingTonightChapters} ${remainingTonightChapters === 1 ? 'chapter' : 'chapters'}`;
    return [
      `Let's read, ${firstName}! Only ${tonightEn} left for tonight 📖`,
      `You've got this, ${firstName} — ${tonightEn} left to finish today's reading ✨`,
      streak > 0
        ? `${streak}-day streak, ${firstName}! 🔥 Let's read ${tonightEn} tonight!`
        : `Ready to read, ${firstName}? ${tonightEn} waiting for you tonight ❤️`,
      `${totalRemainingChapters} chapters left in the whole journey (${percent}% done) 💪`,
    ];
  }, [
    lang,
    firstName,
    remainingTonightChapters,
    totalRemainingChapters,
    completedChapters,
    totalChapters,
    streak,
    percent,
  ]);

  const currentMessage = messages[msgIndex % messages.length];

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || !d.active || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setIsDragging(true);
      setIsWalking(false);
    }
    if (d.moved) {
      setFacingRight(dx >= 0);
      setPos(clampPosition(d.origX + dx, d.origY + dy));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const wasMoved = d.moved;
    dragRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!wasMoved) {
      setMsgIndex((idx) => idx + 1);
      setBubbleOpen((open) => (isReading ? !open : true));
      setHappyBurst(true);
      window.setTimeout(() => setHappyBurst(false), 550);
    }
  };

  if (paused) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 end-4 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            setBubbleOpen(true);
            setMsgIndex((i) => i + 1);
          }}
          aria-label={lang === 'ar' ? 'إظهار رفيق القراءة' : 'Show reading companion'}
          title={lang === 'ar' ? 'إظهار رفيق القراءة' : 'Show reading companion'}
          className="min-h-[44px] px-3.5 py-2 app-control border border-stone-200 dark:border-white/15 bg-white/95 dark:bg-[#22191C]/95 backdrop-blur-md shadow-lg text-xs font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 hover:border-[var(--accent)] transition-colors cursor-pointer"
        >
          <MessageCircleHeart className="w-4 h-4 text-[var(--accent)]" />
          <span>{lang === 'ar' ? 'نونو' : 'Buddy'}</span>
        </button>
      </div>
    );
  }

  // Smart speech bubble placement so it never clips off top/bottom/left/right edges
  const winW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const bubbleW = winW < 640 ? 252 : 284;
  const idealAbsX = pos.x + (BUDDY_SIZE - bubbleW) / 2;
  const clampedAbsX = Math.max(12, Math.min(winW - bubbleW - 12, idealAbsX));
  const bubbleRelLeft = Math.round(clampedAbsX - pos.x);
  const showBubbleBelow = pos.y < 185;
  const isNearBottom = pos.y > winH - 140;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none overflow-hidden"
      aria-live="polite"
    >
      <div
        className="absolute top-0 left-0 will-change-transform"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: isDragging
            ? 'none'
            : `transform ${moveDurationMs}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
        }}
      >
        <div
          className="relative flex flex-col items-center"
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') setIsHovered(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setIsHovered(false);
          }}
        >
          {/* Speech Bubble */}
          {bubbleOpen && (
            <div
              style={{ width: `${bubbleW}px`, left: `${bubbleRelLeft}px` }}
              className={`pointer-events-auto buddy-bubble-in absolute ${
                showBubbleBelow && !isNearBottom ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
              } app-card border border-stone-200 dark:border-white/15 bg-white/95 dark:bg-[#241B1E]/95 backdrop-blur-md shadow-xl p-3.5 text-start space-y-2.5`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 leading-relaxed">
                  {currentMessage}
                </p>
                <div className="flex items-center gap-0.5 shrink-0 -mt-0.5 -me-1">
                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    aria-label={lang === 'ar' ? 'إخفاء الشخصية مؤقتاً' : 'Hide companion'}
                    title={lang === 'ar' ? 'إخفاء مؤقتاً' : 'Minimize'}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBubbleOpen(false)}
                    aria-label={lang === 'ar' ? 'إغلاق الرسالة' : 'Close message'}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {remainingTonightChapters > 0 && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onGoToReader();
                      setBubbleOpen(false);
                    }}
                    className="min-h-[34px] px-3.5 py-1.5 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'يلا نقرأ دلوقتي' : 'Read Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgIndex((i) => i + 1)}
                    className="min-h-[34px] px-2.5 py-1 app-control text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تشجيع تاني' : 'Next tip'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Extra-Cute Chibi Fluffy Lamb Character ("نونو") */}
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            aria-label={
              lang === 'ar'
                ? 'رفيق القراءة اللطيف — اضغط للتشجيع أو اسحب لتحريكه'
                : 'Cute reading companion — tap for encouragement or drag to move'
            }
            className={`pointer-events-auto relative w-[78px] h-[78px] flex items-center justify-center select-none touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-full transition-transform ${
              isDragging
                ? 'scale-110 cursor-grabbing'
                : happyBurst
                ? '-translate-y-2.5 scale-110 cursor-pointer'
                : isReading
                ? 'opacity-85 hover:opacity-100 hover:scale-105 cursor-pointer'
                : 'hover:scale-105 cursor-grab'
            }`}
          >
            {/* Soft warm shadow under paws */}
            <span
              aria-hidden="true"
              className={`absolute bottom-1 w-11 h-2.5 rounded-full blur-[3px] transition-transform ${
                theme === 'dark' ? 'bg-black/60' : 'bg-stone-900/20'
              } ${isWalking ? 'scale-x-75' : 'scale-x-100'}`}
            />

            <div
              className={isWalking ? 'buddy-hop' : 'buddy-idle'}
              style={{
                transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)',
              }}
            >
              <svg
                viewBox="0 0 80 80"
                width="74"
                height="74"
                className="drop-shadow-md overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="buddyAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Gentle soft aura */}
                <circle cx="40" cy="42" r="34" fill="url(#buddyAura)" />

                {/* Floating tiny Bethlehem Star */}
                <g className="buddy-star-float" transform="translate(61, 13)">
                  <path
                    d="M0,-6.5 L1.7,-1.7 L6.5,0 L1.7,1.7 L0,6.5 L-1.7,1.7 L-6.5,0 L-1.7,-1.7 Z"
                    fill="#FBBF24"
                    stroke="#D97706"
                    strokeWidth="0.6"
                  />
                  <circle cx="0" cy="0" r="1.4" fill="#FEF3C7" />
                </g>

                {/* Cute Fluffy Tail */}
                <circle
                  cx="17"
                  cy="52"
                  r="5.5"
                  fill={theme === 'dark' ? '#FAF4EE' : '#FFFDFB'}
                  stroke={theme === 'dark' ? '#46393C' : '#D9CEC6'}
                  strokeWidth="1.3"
                />

                {/* Cute Stubby Rounded Paws */}
                <rect x="27" y="59" width="6.5" height="10" rx="3.2" fill="#5A453E" />
                <rect x="44.5" y="59" width="6.5" height="10" rx="3.2" fill="#5A453E" />
                <rect x="35.5" y="58" width="6" height="9" rx="3" fill="#70574F" />

                {/* Cloud-Fluffy Wool Body */}
                <g
                  fill={theme === 'dark' ? '#FAF4EE' : '#FFFFFF'}
                  stroke={theme === 'dark' ? '#46393C' : '#D9CEC6'}
                  strokeWidth="1.3"
                >
                  <circle cx="27" cy="50" r="11.5" />
                  <circle cx="38.5" cy="46" r="12.5" />
                  <circle cx="50" cy="50.5" r="10.8" />
                  <circle cx="38.5" cy="54" r="11.5" />
                </g>
                <ellipse
                  cx="39"
                  cy="50.5"
                  rx="16.5"
                  ry="10.5"
                  fill={theme === 'dark' ? '#FAF4EE' : '#FFFFFF'}
                />

                {/* Cozy Knitted Scarf + Golden Bell */}
                <path
                  d="M28 40.5 Q41 46 53 40.5 Q54.5 45.5 41 48.5 Q28 46 28 40.5 Z"
                  fill="var(--accent)"
                />
                <path
                  d="M31 44.5 L27.5 55.5 L33.2 56.2 L35.5 46.5 Z"
                  fill="var(--accent)"
                />
                {christmasTheme && (
                  <g transform="translate(41, 45.8)">
                    <circle cx="0" cy="0" r="3" fill="#FBBF24" stroke="#B45309" strokeWidth="0.7" />
                    <circle cx="-0.7" cy="-0.8" r="0.8" fill="#FEF3C7" />
                  </g>
                )}

                {/* Soft Floppy Ears with Pink Inner Cushion */}
                <g transform="rotate(-24 23 28)">
                  <ellipse
                    cx="23"
                    cy="28"
                    rx="7.5"
                    ry="4.2"
                    fill="#F5D6C3"
                    stroke={theme === 'dark' ? '#46393C' : '#CFC2B8'}
                    strokeWidth="1.2"
                  />
                  <ellipse cx="23" cy="28.3" rx="4.5" ry="2.2" fill="#FDA4AF" opacity="0.55" />
                </g>
                <g transform="rotate(24 58 28)">
                  <ellipse
                    cx="58"
                    cy="28"
                    rx="7.5"
                    ry="4.2"
                    fill="#F5D6C3"
                    stroke={theme === 'dark' ? '#46393C' : '#CFC2B8'}
                    strokeWidth="1.2"
                  />
                  <ellipse cx="58" cy="28.3" rx="4.5" ry="2.2" fill="#FDA4AF" opacity="0.55" />
                </g>

                {/* Oversized Sweet Chibi Face */}
                <ellipse
                  cx="40.5"
                  cy="31"
                  rx="15"
                  ry="13"
                  fill="#FCE9DC"
                  stroke={theme === 'dark' ? '#46393C' : '#D9CEC6'}
                  strokeWidth="1.3"
                />

                {/* Fluffy Forehead Wool Tuft */}
                <g
                  fill={theme === 'dark' ? '#FAF4EE' : '#FFFFFF'}
                  stroke={theme === 'dark' ? '#46393C' : '#D9CEC6'}
                  strokeWidth="1.1"
                >
                  <circle cx="33.5" cy="18.5" r="5.5" />
                  <circle cx="40.5" cy="17" r="6.3" />
                  <circle cx="47.5" cy="18.8" r="5.4" />
                </g>
                <ellipse
                  cx="40.5"
                  cy="20"
                  rx="10.5"
                  ry="4.5"
                  fill={theme === 'dark' ? '#FAF4EE' : '#FFFFFF'}
                />

                {/* Big Glossy Kawaii Eyes (or peaceful happy eyes while parked reading) */}
                {isReading ? (
                  <g stroke="#2D1F1D" strokeWidth="1.6" strokeLinecap="round" fill="none">
                    <path d="M32 30.5 Q35 28 38 30.5" />
                    <path d="M43 30.5 Q46 28 49 30.5" />
                  </g>
                ) : (
                  <g className="buddy-eye-blink">
                    {/* Left Eye */}
                    <circle cx="34.8" cy="30.2" r="3.4" fill="#2A1C1A" />
                    <circle cx="33.7" cy="28.9" r="1.25" fill="#FFFFFF" />
                    <circle cx="36" cy="31.5" r="0.65" fill="#FFFFFF" opacity="0.85" />
                    {/* Right Eye */}
                    <circle cx="46.5" cy="30.2" r="3.4" fill="#2A1C1A" />
                    <circle cx="45.4" cy="28.9" r="1.25" fill="#FFFFFF" />
                    <circle cx="47.7" cy="31.5" r="0.65" fill="#FFFFFF" opacity="0.85" />
                  </g>
                )}

                {/* Warm Rosy Blushing Cheeks */}
                <ellipse cx="30.5" cy="34.5" rx="3.2" ry="1.8" fill="#FB7185" opacity="0.58" />
                <ellipse cx="50.5" cy="34.5" rx="3.2" ry="1.8" fill="#FB7185" opacity="0.58" />

                {/* Tiny Pink Nose & Sweet :3 Smile */}
                <ellipse cx="40.5" cy="33.8" rx="1.5" ry="1" fill="#F43F5E" opacity="0.75" />
                <path
                  d="M37.4 36.2 Q39 38.2 40.5 36.3 Q42 38.2 43.6 36.2"
                  fill="none"
                  stroke="#5E4039"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Cute Mini Gospel Book Held Happily */}
                <g transform="translate(49, 44) rotate(10)">
                  <rect
                    x="0"
                    y="0"
                    width="12"
                    height="14.5"
                    rx="2.3"
                    fill="#B91C1C"
                    stroke="#7F1D1D"
                    strokeWidth="1"
                  />
                  <line x1="2.8" y1="1.1" x2="2.8" y2="13.4" stroke="#FDE68A" strokeWidth="1" />
                  <path
                    d="M7.3 4.2 L7.3 10.2 M5 6.5 L9.6 6.5"
                    stroke="#FDE68A"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </g>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
