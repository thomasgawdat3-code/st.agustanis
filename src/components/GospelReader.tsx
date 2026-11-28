import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lock,
  Minus,
  Plus,
  Share2,
} from 'lucide-react';
import { getChapterQuestion } from '../data/chapterQuestions';
import {
  formatNumber,
  formatReadingRange,
  getChapterDay,
  getChapterKey,
  getDayPlan,
  getNextChapter,
  GOSPEL_ORDER,
} from '../data/readingPlan';
import type { DayPlan, GospelKey, GospelsDataset, Language } from '../types';

interface GospelReaderProps {
  lang: Language;
  currentDay: number;
  readingPlan: DayPlan[];
  maxUnlockedDay: number;
  sequentialLock: boolean;
  isDayCompleted: boolean;
  passedChapters: Record<string, boolean>;
  isChapterUnlocked: (book: GospelKey, chapter: number) => boolean;
  fontSize: number;
  title: string;
  editionLabel: string;
  markReadBtn: string;
  markReadDoneBtn: string;
  encouragementMsg: string;
  onFontSizeChange: (size: number) => void;
  onPassChapter: (book: GospelKey, chapter: number) => void;
  onToggleDayCompleted: () => void;
  onLockedDayAttempt: (day: number) => void;
  onLockedChapterAttempt: (book: GospelKey, chapter: number) => void;
  onShareText: (text: string) => void;
  onReadingStateChange?: (isReading: boolean) => void;
}

type ReaderTab = 'today' | GospelKey;

export const GospelReader: React.FC<GospelReaderProps> = ({
  lang,
  currentDay,
  readingPlan,
  maxUnlockedDay,
  sequentialLock,
  isDayCompleted,
  passedChapters,
  isChapterUnlocked,
  fontSize,
  title,
  editionLabel,
  markReadBtn,
  markReadDoneBtn,
  encouragementMsg,
  onFontSizeChange,
  onPassChapter,
  onToggleDayCompleted,
  onLockedDayAttempt,
  onLockedChapterAttempt,
  onShareText,
  onReadingStateChange,
}) => {
  const [datasets, setDatasets] = useState<{ ar?: GospelsDataset; en?: GospelsDataset }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState<ReaderTab>('today');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerseKey, setSelectedVerseKey] = useState<string | null>(null);
  const [wrongChoiceByChapter, setWrongChoiceByChapter] = useState<Record<string, number | null>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const toggleChapterExpanded = (chKey: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chKey]: !prev[chKey],
    }));
  };

  const loadDataset = async (targetLang: Language) => {
    if (datasets[targetLang]) {
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/gospels-${targetLang}.json`);
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as GospelsDataset;
      setDatasets((prev) => ({ ...prev, [targetLang]: json }));
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset(lang);
  }, [lang]);

  // Reset selected verse when switching day/tab/chapter
  useEffect(() => {
    setSelectedVerseKey(null);
  }, [currentDay, activeTab, selectedChapter]);

  // If sequential lock tightens (e.g. unmarking an earlier day), ensure no locked chapter stays open
  useEffect(() => {
    if (sequentialLock && activeTab !== 'today') {
      if (!isChapterUnlocked(activeTab, selectedChapter)) {
        setActiveTab('today');
      }
    }
  }, [sequentialLock, activeTab, selectedChapter, isChapterUnlocked]);

  // When clicking a gospel tab, default to first unlocked chapter or today's chapter in that gospel
  const handleTabChange = (tab: ReaderTab) => {
    if (tab !== 'today') {
      if (sequentialLock && !isChapterUnlocked(tab, 1)) {
        const firstChapterDay = getChapterDay(tab, 1, readingPlan);
        if (firstChapterDay > maxUnlockedDay) {
          onLockedDayAttempt(firstChapterDay);
        } else {
          onLockedChapterAttempt(tab, 1);
        }
        return;
      }
      setActiveTab(tab);
      const plan = getDayPlan(currentDay, readingPlan);
      const match = plan.readings.find((r) => r.book === tab);
      const candidate = match ? match.chapter : 1;
      const resolvedChapter = isChapterUnlocked(tab, candidate) ? candidate : 1;
      setSelectedChapter(resolvedChapter);
      setExpandedChapters((prev) => ({
        ...prev,
        [getChapterKey(tab, resolvedChapter)]: true,
      }));
      return;
    }
    setActiveTab(tab);
  };

  const dayPlan = useMemo(() => getDayPlan(currentDay, readingPlan), [currentDay, readingPlan]);
  const totalTodayCount = dayPlan.readings.length;
  const remainingTonightCount = useMemo(() => {
    if (isDayCompleted) return 0;
    return dayPlan.readings.filter(
      (r) => !passedChapters[getChapterKey(r.book, r.chapter)]
    ).length;
  }, [dayPlan.readings, isDayCompleted, passedChapters]);

  const remainingTonightLabel = useMemo(() => {
    if (totalTodayCount === 0) {
      return lang === 'ar' ? 'مراجعة وتأمل' : 'Review';
    }
    if (remainingTonightCount <= 0) {
      return lang === 'ar' ? 'اكتملت لليلة' : 'Done tonight';
    }
    if (lang === 'ar') {
      if (remainingTonightCount === 1) return 'باقي أصحاح ١ لليلة';
      if (remainingTonightCount === 2) return 'باقي أصحاحين لليلة';
      if (remainingTonightCount <= 10) {
        return `باقي ${formatNumber(remainingTonightCount, 'ar')} أصحاحات لليلة`;
      }
      return `باقي ${formatNumber(remainingTonightCount, 'ar')} أصحاحاً لليلة`;
    }
    return `${remainingTonightCount} ${remainingTonightCount === 1 ? 'chapter' : 'chapters'} left tonight`;
  }, [lang, totalTodayCount, remainingTonightCount]);

  const activeDataset = datasets[lang];

  // Build chapters to render
  const chaptersToRender = useMemo(() => {
    if (!activeDataset) return [];
    if (activeTab === 'today') {
      return dayPlan.readings.map((ref) => {
        const book = activeDataset[ref.book];
        const verses = book?.chapters[ref.chapter - 1] || [];
        return {
          bookKey: ref.book,
          bookName: lang === 'ar' ? book?.nameAr : book?.nameEn,
          shortName: lang === 'ar' ? book?.shortAr : book?.nameEn,
          chapter: ref.chapter,
          verses,
        };
      });
    } else {
      const book = activeDataset[activeTab];
      const maxCh = book?.chapters.length || 1;
      const safeCh = Math.max(1, Math.min(maxCh, selectedChapter));
      return [
        {
          bookKey: activeTab,
          bookName: lang === 'ar' ? book?.nameAr : book?.nameEn,
          shortName: lang === 'ar' ? book?.shortAr : book?.nameEn,
          chapter: safeCh,
          verses: book?.chapters[safeCh - 1] || [],
        },
      ];
    }
  }, [activeDataset, activeTab, dayPlan, lang, selectedChapter]);

  const isAnyVisibleChapterExpanded = useMemo(
    () =>
      chaptersToRender.some((ch) =>
        Boolean(expandedChapters[getChapterKey(ch.bookKey, ch.chapter)])
      ),
    [chaptersToRender, expandedChapters]
  );

  useEffect(() => {
    onReadingStateChange?.(isAnyVisibleChapterExpanded);
  }, [isAnyVisibleChapterExpanded, onReadingStateChange]);

  const handleShareCurrentReading = () => {
    if (chaptersToRender.length === 0) return;
    const refLabel =
      activeTab === 'today'
        ? formatReadingRange(dayPlan.readings, lang)
        : `${chaptersToRender[0].bookName} ${formatNumber(chaptersToRender[0].chapter, lang)}`;
    const firstVerse = chaptersToRender[0].verses[0] || '';
    const msg =
      lang === 'ar'
        ? `قراءة اليوم (${refLabel} — ترجمة فاندايك):\n"${firstVerse}"`
        : `Today's Gospel Reading (${refLabel}):\n"${firstVerse}"`;
    onShareText(msg);
  };

  const selectedBookMeta =
    activeTab !== 'today' ? GOSPEL_ORDER.find((g) => g.key === activeTab) : null;

  return (
    <section
      data-el="reader"
      className="app-card border border-stone-200 dark:border-white/10 bg-white dark:bg-[#22191C] overflow-hidden"
      aria-labelledby="gospel-reader-heading"
    >
      {/* Top Reader Header */}
      <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{editionLabel}</span>
            </div>
            <h2
              id="gospel-reader-heading"
              className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white"
            >
              {title}
            </h2>
          </div>

          {/* Font size & Share controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-stone-200 dark:border-white/10 app-control bg-stone-50 dark:bg-white/5 overflow-hidden">
              <button
                type="button"
                onClick={() => onFontSizeChange(fontSize - 2)}
                disabled={fontSize <= 16}
                aria-label={lang === 'ar' ? 'تصغير الخط' : 'Decrease font size'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-white/10 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold text-stone-600 dark:text-stone-300 tabular-nums select-none">
                {lang === 'ar' ? 'حجم الخط' : 'Text'}
              </span>
              <button
                type="button"
                onClick={() => onFontSizeChange(fontSize + 2)}
                disabled={fontSize >= 30}
                aria-label={lang === 'ar' ? 'تكبير الخط' : 'Increase font size'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-white/10 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleShareCurrentReading}
              className="min-h-[40px] px-3 app-control border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Gospel Quick Tabs: Today's Plan + 4 Gospels */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label={lang === 'ar' ? 'تبويبات الأناجيل' : 'Gospel tabs'}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'today'}
            onClick={() => handleTabChange('today')}
            className={`min-h-[40px] px-4 py-2 app-control text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'today'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
            }`}
          >
            <span>
              {lang === 'ar'
                ? `القراءة اليومية (${formatReadingRange(dayPlan.readings, 'ar')})`
                : `Daily Reading (${formatReadingRange(dayPlan.readings, 'en')})`}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${
                activeTab === 'today'
                  ? 'bg-white/20 text-white'
                  : remainingTonightCount === 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--accent-soft)] text-[var(--accent)]'
              }`}
            >
              {remainingTonightLabel}
            </span>
          </button>

          {GOSPEL_ORDER.map((g) => {
            const bookFirstDay = getChapterDay(g.key, 1, readingPlan);
            const isBookLocked = sequentialLock && !isChapterUnlocked(g.key, 1);
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={activeTab === g.key}
                onClick={() => handleTabChange(g.key)}
                className={`min-h-[40px] px-4 py-2 app-control text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === g.key
                    ? 'bg-[var(--accent)] text-white'
                    : isBookLocked
                    ? 'bg-stone-100/60 dark:bg-white/[0.03] text-stone-400 dark:text-stone-500'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                }`}
              >
                {isBookLocked && <Lock className="w-3 h-3 shrink-0" />}
                <span>{lang === 'ar' ? g.shortAr : g.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* Chapter Selector when browsing an individual Gospel */}
        {activeTab !== 'today' && selectedBookMeta && (
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 me-1">
              {lang === 'ar' ? 'الأصحاح:' : 'Chapter:'}
            </span>
            {Array.from({ length: selectedBookMeta.chaptersCount }, (_, i) => i + 1).map((ch) => {
              const chDay = getChapterDay(activeTab, ch, readingPlan);
              const isChLocked = !isChapterUnlocked(activeTab, ch);
              const isChPassed = Boolean(passedChapters[getChapterKey(activeTab, ch)]);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    if (isChLocked) {
                      if (chDay > maxUnlockedDay) {
                        onLockedDayAttempt(chDay);
                      } else {
                        onLockedChapterAttempt(activeTab, ch);
                      }
                      return;
                    }
                    setSelectedChapter(ch);
                    setExpandedChapters((prev) => ({
                      ...prev,
                      [getChapterKey(activeTab, ch)]: true,
                    }));
                  }}
                  className={`min-w-[36px] min-h-[36px] px-2 app-control text-xs font-bold tabular-nums transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    selectedChapter === ch
                      ? 'bg-[var(--accent)] text-white'
                      : isChLocked
                      ? 'bg-stone-100/60 dark:bg-white/[0.03] text-stone-400 dark:text-stone-600'
                      : isChPassed
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                  }`}
                >
                  {isChLocked && <Lock className="w-2.5 h-2.5 shrink-0" />}
                  {!isChLocked && isChPassed && selectedChapter !== ch && (
                    <Check className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>{formatNumber(ch, lang)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scripture Reading Body */}
      <div className="p-5 sm:p-8">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {lang === 'ar' ? 'جاري تحميل نص الإنجيل...' : 'Loading Gospel text...'}
            </p>
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {lang === 'ar'
                ? 'تعذّر تحميل نص الإنجيل الآن.'
                : 'Unable to load Gospel text right now.'}
            </p>
            <button
              type="button"
              onClick={() => loadDataset(lang)}
              className="min-h-[40px] px-4 py-2 app-control bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {chaptersToRender.map((chBlock) => {
              const chKey = getChapterKey(chBlock.bookKey, chBlock.chapter);
              const chUnlocked = isChapterUnlocked(chBlock.bookKey, chBlock.chapter);
              const isChPassed = Boolean(passedChapters[chKey]);
              const isExpanded = Boolean(expandedChapters[chKey]);
              const quiz = getChapterQuestion(chBlock.bookKey, chBlock.chapter);
              const wrongIdx = wrongChoiceByChapter[chKey] ?? null;
              const options = lang === 'ar' ? quiz.optionsAr : quiz.optionsEn;
              const optionLabels = lang === 'ar' ? ['أ', 'ب', 'ج'] : ['A', 'B', 'C'];
              const nextRef = getNextChapter(chBlock.bookKey, chBlock.chapter);
              const nextIsUnlockedInSameBook =
                Boolean(nextRef) &&
                nextRef!.book === chBlock.bookKey &&
                isChapterUnlocked(nextRef!.book, nextRef!.chapter);
              const NextArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

              if (!chUnlocked) {
                return (
                  <article
                    key={chKey}
                    className="app-card border border-dashed border-stone-300 dark:border-white/15 bg-stone-50/80 dark:bg-white/[0.02] p-5 sm:p-6 text-center space-y-2.5"
                  >
                    <div className="w-10 h-10 mx-auto rounded-full bg-stone-200/80 dark:bg-white/10 text-stone-500 dark:text-stone-400 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100">
                      {chBlock.bookName} —{' '}
                      {lang === 'ar'
                        ? `الأصحاح ${formatNumber(chBlock.chapter, 'ar')}`
                        : `Chapter ${chBlock.chapter}`}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                      {lang === 'ar'
                        ? 'هذا الأصحاح مقفول حالياً. أجب عن سؤال الأصحاح السابق إجابة صحيحة ليُفتح تلقائياً.'
                        : 'This chapter is locked. Answer the previous chapter’s question correctly to unlock it.'}
                    </p>
                  </article>
                );
              }

              return (
                <article
                  key={chKey}
                  className={`app-card border transition-colors ${
                    isExpanded
                      ? 'border-[var(--accent)]/40 bg-stone-50/30 dark:bg-white/[0.015]'
                      : 'border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.02]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleChapterExpanded(chKey)}
                    aria-expanded={isExpanded}
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-start hover:bg-stone-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
                          isExpanded
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                        {chBlock.bookName} —{' '}
                        <span className="text-[var(--accent)]">
                          {lang === 'ar'
                            ? `الأصحاح ${formatNumber(chBlock.chapter, 'ar')}`
                            : `Chapter ${chBlock.chapter}`}
                        </span>
                      </h3>
                      {isChPassed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          <Check className="w-3 h-3" />
                          {lang === 'ar' ? 'تمت الإجابة' : 'Done'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {lang === 'ar'
                          ? `${formatNumber(chBlock.verses.length, 'ar')} آية`
                          : `${chBlock.verses.length} verses`}
                      </span>
                      <span className="hidden sm:inline-block text-[11px] font-semibold text-[var(--accent)]">
                        {isExpanded
                          ? lang === 'ar'
                            ? 'إغلاق'
                            : 'Close'
                          : lang === 'ar'
                          ? 'فتح'
                          : 'Open'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-5 pt-2 sm:px-6 sm:pb-6 space-y-6 border-t border-stone-200/80 dark:border-white/10">
                      <div
                        data-el="reader-text"
                        className="font-scripture text-stone-900 dark:text-stone-100 leading-[2.15] space-y-2.5 select-text pt-2"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                    {chBlock.verses.map((verseText, vIdx) => {
                      const verseNum = vIdx + 1;
                      const vKey = `${chBlock.bookKey}-${chBlock.chapter}-${verseNum}`;
                      const isSelected = selectedVerseKey === vKey;
                      return (
                        <div
                          key={vKey}
                          onClick={() => setSelectedVerseKey(isSelected ? null : vKey)}
                          className={`rounded-lg px-2.5 py-1.5 -mx-2.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent-soft)]'
                              : 'hover:bg-stone-100/80 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="inline-block font-ui text-xs font-bold text-[var(--accent)] me-2 tabular-nums align-middle">
                            ﴿{formatNumber(verseNum, lang)}﴾
                          </span>
                          <span>{verseText}</span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const ref = `${chBlock.shortName} ${formatNumber(
                                  chBlock.chapter,
                                  lang
                                )}: ${formatNumber(verseNum, lang)}`;
                                onShareText(`«${verseText}»\n(${ref})`);
                              }}
                              className="ms-3 inline-flex items-center gap-1 font-ui text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-2.5 py-1 rounded-md align-middle transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>{lang === 'ar' ? 'مشاركة الآية' : 'Share Verse'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* End-of-Chapter Verification Question */}
                  <div
                    className={`app-card border p-4 sm:p-5 space-y-3.5 transition-colors ${
                      isChPassed
                        ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20'
                        : 'border-stone-200 dark:border-white/15 bg-stone-50/90 dark:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--accent)]">
                        {isChPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <HelpCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span className={isChPassed ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                          {lang === 'ar'
                            ? `سؤال نهاية الأصحاح ${formatNumber(chBlock.chapter, 'ar')}`
                            : `Chapter ${chBlock.chapter} Question`}
                        </span>
                      </div>
                      {isChPassed && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                          {lang === 'ar' ? 'تم الفتح' : 'Unlocked'}
                        </span>
                      )}
                    </div>

                    <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-white leading-relaxed">
                      {lang === 'ar' ? quiz.questionAr : quiz.questionEn}
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {options.map((optText, idx) => {
                        const isCorrectOpt = idx === quiz.correctIndex;
                        const isWrongSelected = !isChPassed && wrongIdx === idx;
                        const showAsCorrect = isChPassed && isCorrectOpt;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isChPassed}
                            onClick={() => {
                              if (isChPassed) return;
                              if (idx === quiz.correctIndex) {
                                setWrongChoiceByChapter((prev) => ({ ...prev, [chKey]: null }));
                                onPassChapter(chBlock.bookKey, chBlock.chapter);
                              } else {
                                setWrongChoiceByChapter((prev) => ({ ...prev, [chKey]: idx }));
                              }
                            }}
                            className={`w-full min-h-[44px] px-3.5 py-2.5 app-control border text-start text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 transition-all ${
                              showAsCorrect
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                : isWrongSelected
                                ? 'border-red-400 dark:border-red-500/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 cursor-pointer'
                                : isChPassed
                                ? 'border-stone-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] text-stone-400 dark:text-stone-500'
                                : 'border-stone-200 dark:border-white/15 bg-white dark:bg-[#22191C] text-stone-800 dark:text-stone-100 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] cursor-pointer'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                                  showAsCorrect
                                    ? 'bg-white/20 text-white'
                                    : isWrongSelected
                                    ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-200'
                                    : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-200'
                                }`}
                              >
                                {optionLabels[idx]}
                              </span>
                              <span>{optText}</span>
                            </span>
                            {showAsCorrect && <Check className="w-4 h-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {wrongIdx !== null && !isChPassed && (
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {lang === 'ar'
                          ? 'إجابة غير صحيحة — راجع الأصحاح بالأعلى واختر الإجابة الصحيحة لفتح الأصحاح التالي.'
                          : 'Not quite — check the chapter text above and choose the right answer to unlock the next chapter.'}
                      </p>
                    )}

                    {isChPassed && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {lang === 'ar'
                            ? 'أحسنت! إجابة صحيحة — يمكنك الآن متابعة الأصحاح التالي.'
                            : 'Well done! Correct answer — the next chapter is now unlocked.'}
                        </p>
                        {activeTab !== 'today' && nextIsUnlockedInSameBook && nextRef && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapter(nextRef.chapter);
                              setExpandedChapters((prev) => ({
                                ...prev,
                                [getChapterKey(nextRef.book, nextRef.chapter)]: true,
                              }));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 app-control bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            <span>
                              {lang === 'ar'
                                ? `افتح الأصحاح ${formatNumber(nextRef.chapter, 'ar')}`
                                : `Open Chapter ${nextRef.chapter}`}
                            </span>
                            <NextArrow className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                      {/* Bottom Collapse Button so user doesn't have to scroll back up */}
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() => toggleChapterExpanded(chKey)}
                          className="min-h-[40px] px-4 py-2 app-control border border-stone-200 dark:border-white/15 bg-white dark:bg-[#22191C] hover:bg-stone-100 dark:hover:bg-white/10 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ChevronUp className="w-4 h-4 text-[var(--accent)]" />
                          <span>
                            {lang === 'ar'
                              ? `إغلاق الأصحاح ${formatNumber(chBlock.chapter, 'ar')}`
                              : `Collapse Chapter ${chBlock.chapter}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {/* Hint for verse tap */}
            <p className="text-xs text-center text-stone-400 dark:text-stone-500 pt-2">
              {lang === 'ar'
                ? 'اضغط على أي آية لتحديدها ومشاركتها بسهولة'
                : 'Tap any verse to highlight and share it'}
            </p>
          </div>
        )}
      </div>

      {/* Completion Action Footer */}
      {(() => {
        const passedInDayCount = dayPlan.readings.filter((r) =>
          Boolean(passedChapters[getChapterKey(r.book, r.chapter)])
        ).length;
        const totalInDayCount = dayPlan.readings.length;
        const allDayQuestionsPassed = passedInDayCount >= totalInDayCount;
        const needsQuizBeforeFinish = sequentialLock && !isDayCompleted && !allDayQuestionsPassed;

        return (
          <div className="px-5 py-5 sm:px-8 border-t border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-start">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                {isDayCompleted
                  ? encouragementMsg
                  : lang === 'ar'
                  ? `أنهيت قراءة اليوم ${formatNumber(currentDay, 'ar')} (${formatReadingRange(
                      dayPlan.readings,
                      'ar'
                    )})؟`
                  : `Finished Day ${currentDay} (${formatReadingRange(dayPlan.readings, 'en')})?`}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {needsQuizBeforeFinish
                  ? lang === 'ar'
                    ? `أجب عن أسئلة أصحاحات اليوم (${formatNumber(passedInDayCount, 'ar')} من ${formatNumber(
                        totalInDayCount,
                        'ar'
                      )}) لتتمّ اليوم وتفتح اليوم التالي`
                    : `Answer today's chapter questions (${passedInDayCount} of ${totalInDayCount}) to finish and unlock the next day`
                  : lang === 'ar'
                  ? 'يتم حفظ تقدمك تلقائياً على جهازك'
                  : 'Your progress is saved automatically on this device'}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleDayCompleted}
              className={`w-full sm:w-auto min-h-[48px] px-6 py-3 app-control text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                isDayCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : needsQuizBeforeFinish
                  ? 'bg-stone-300 dark:bg-white/15 text-stone-700 dark:text-stone-200 hover:bg-stone-400/70'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-lg shadow-[var(--accent-glow)]'
              }`}
            >
              {isDayCompleted ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{markReadDoneBtn}</span>
                </>
              ) : needsQuizBeforeFinish ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{markReadBtn}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{markReadBtn}</span>
                </>
              )}
            </button>
          </div>
        );
      })()}
    </section>
  );
};
