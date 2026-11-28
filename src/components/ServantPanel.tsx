import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Check,
  ChevronDown,
  Cloud,
  Download,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Snowflake,
  Sparkles,
  Trash2,
  Trophy,
  Type,
  Users,
  X,
} from 'lucide-react';
import {
  buildReadingPlan,
  DEFAULT_COMPETITION_END_DATE,
  formatDateReadable,
  formatNumber,
  getChapterKey,
  getDayPlan,
  getDaysBetweenInclusive,
  GOSPEL_ORDER,
  TOTAL_GOSPEL_CHAPTERS,
  TOTAL_LENT_DAYS,
} from '../data/readingPlan';
import type {
  AppConfig,
  CardStylePreset,
  CompetitionConfig,
  CompetitionQuestion,
  FontPreset,
  HeroIconKey,
  HeroIconSize,
  Language,
  ProgressStyle,
  RadiusPreset,
  UserAccount,
} from '../types';
import { CustomizationStudio } from './CustomizationStudio';
import { HeroSymbol } from './HeroSymbol';

interface ServantPanelProps {
  isOpen: boolean;
  lang: Language;
  config: AppConfig;
  users: UserAccount[];
  activeUserId: string | null;
  servantName: string;
  onRefreshUsers?: () => Promise<boolean>;
  onClose: () => void;
  onSaveServantContent: (
    nextConfig: AppConfig
  ) => Promise<{ ok: boolean; syncedToCloud: boolean; error?: string }>;
  onNotify: (msg: string) => void;
}

type ServantTab = 'competition' | 'appearance' | 'quotes' | 'practices' | 'users';

const ACCENT_PRESETS = [
  { nameAr: 'أحمر كريسماس', nameEn: 'Christmas Red', hex: '#DC2626' },
  { nameAr: 'أخضر صنوبري', nameEn: 'Pine Green', hex: '#15803D' },
  { nameAr: 'ذهبي احتفالي', nameEn: 'Festive Gold', hex: '#D97706' },
  { nameAr: 'قرمزي داكن', nameEn: 'Deep Crimson', hex: '#B91C1C' },
  { nameAr: 'عنّابي ملكي', nameEn: 'Royal Burgundy', hex: '#9F1239' },
  { nameAr: 'نيلي عميق', nameEn: 'Deep Indigo', hex: '#4338CA' },
];

const CHRISTMAS_MULTI_THEMES = [
  {
    id: 'xmas-classic',
    nameAr: 'أحمر + أخضر + ذهبي',
    nameEn: 'Red + Green + Gold',
    accentColor: '#DC2626',
    darkCanvasColor: '#131A15',
    lightCanvasColor: '#FAF7F2',
    swatches: ['#DC2626', '#15803D', '#FBBF24'],
  },
  {
    id: 'xmas-evergreen',
    nameAr: 'أخضر صنوبري + ذهبي',
    nameEn: 'Evergreen + Gold',
    accentColor: '#15803D',
    darkCanvasColor: '#101914',
    lightCanvasColor: '#F5FAF6',
    swatches: ['#15803D', '#D97706', '#DC2626'],
  },
  {
    id: 'xmas-gold',
    nameAr: 'ذهبي ملكي + أحمر',
    nameEn: 'Royal Gold + Red',
    accentColor: '#B45309',
    darkCanvasColor: '#1A1410',
    lightCanvasColor: '#FDFBF6',
    swatches: ['#D97706', '#DC2626', '#15803D'],
  },
];

const FONT_PRESETS: {
  key: FontPreset;
  nameAr: string;
  nameEn: string;
  sampleFont: string;
}[] = [
  { key: 'cairo', nameAr: 'القاهرة (Cairo) — افتراضي', nameEn: 'Cairo + Plus Jakarta', sampleFont: "'Cairo', sans-serif" },
  { key: 'tajawal', nameAr: 'تجوّل (Tajawal) — حديث', nameEn: 'Tajawal + DM Sans', sampleFont: "'Tajawal', sans-serif" },
  { key: 'almarai', nameAr: 'المراعي (Almarai) — واضح', nameEn: 'Almarai + Outfit', sampleFont: "'Almarai', sans-serif" },
  { key: 'amiri', nameAr: 'أميري (Amiri) — كتابي كلاسيكي', nameEn: 'Amiri + Lora Serif', sampleFont: "'Amiri', serif" },
  { key: 'rubik', nameAr: 'روبيك (Rubik) — ناعم', nameEn: 'Rubik + Manrope', sampleFont: "'Rubik', sans-serif" },
];

const DARK_TEXT_PRESETS = [
  { nameAr: 'افتراضي', nameEn: 'Default', hex: '' },
  { nameAr: 'أبيض ناصع', nameEn: 'Pure White', hex: '#FFFFFF' },
  { nameAr: 'ذهبي ناعم', nameEn: 'Soft Gold', hex: '#FDE68A' },
  { nameAr: 'أخضر فاتح', nameEn: 'Mint Glow', hex: '#BBF7D0' },
];

const LIGHT_TEXT_PRESETS = [
  { nameAr: 'افتراضي', nameEn: 'Default', hex: '' },
  { nameAr: 'عنّابي داكن', nameEn: 'Burgundy Ink', hex: '#7F1D1D' },
  { nameAr: 'أخضر داكن', nameEn: 'Forest Ink', hex: '#14532D' },
  { nameAr: 'كحلي عميق', nameEn: 'Deep Navy', hex: '#1E3A8A' },
];

const HERO_ICONS: { key: HeroIconKey; labelAr: string; labelEn: string }[] = [
  { key: 'heart', labelAr: 'قلب', labelEn: 'Heart' },
  { key: 'cross', labelAr: 'صليب', labelEn: 'Cross' },
  { key: 'star', labelAr: 'نجمة', labelEn: 'Star' },
  { key: 'flame', labelAr: 'شمعة', labelEn: 'Candle' },
  { key: 'book', labelAr: 'إنجيل', labelEn: 'Book' },
  { key: 'sun', labelAr: 'نور', labelEn: 'Light' },
];

const EMPTY_COMPETITION: CompetitionConfig = {
  enabled: false,
  titleAr: 'مسابقة صوم الميلاد',
  titleEn: 'Nativity Fast Competition',
  descriptionAr: 'أجب عن أسئلة المسابقة التي يضعها خدام الأسرة.',
  descriptionEn: 'Answer the fellowship competition questions prepared by the servants.',
  rewardAr: '',
  rewardEn: '',
  questions: [],
};

export const ServantPanel: React.FC<ServantPanelProps> = ({
  isOpen,
  lang,
  config,
  users,
  activeUserId,
  servantName,
  onRefreshUsers,
  onClose,
  onSaveServantContent,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ServantTab>('competition');
  const [draft, setDraft] = useState<AppConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState<'progress' | 'recent' | 'name'>('progress');
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [visibleUsersCount, setVisibleUsersCount] = useState(50);
  const [refreshingUsers, setRefreshingUsers] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDraft({
        ...config,
        competition: config.competition || EMPTY_COMPETITION,
      });
      setHasChanges(false);
      setExpandedUserIds({});
      setVisibleUsersCount(50);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, config]);

  if (!isOpen) return null;

  const updateDraft = (updater: (prev: AppConfig) => AppConfig) => {
    setDraft((prev) => updater(prev));
    setHasChanges(true);
  };

  const comp: CompetitionConfig = draft.competition || EMPTY_COMPETITION;

  const updateCompetition = (patch: Partial<CompetitionConfig>) => {
    updateDraft((prev) => ({
      ...prev,
      competition: {
        ...(prev.competition || EMPTY_COMPETITION),
        ...patch,
      },
    }));
  };

  const addCompetitionQuestion = () => {
    const newQ: CompetitionQuestion = {
      id: `comp_${Date.now()}`,
      questionAr: '',
      questionEn: '',
      optionsAr: ['', '', '', ''],
      optionsEn: ['', '', '', ''],
      correctIndex: 0,
    };
    updateCompetition({
      enabled: true,
      questions: [...comp.questions, newQ],
    });
  };

  const updateCompetitionQuestion = (
    id: string,
    patch: Partial<CompetitionQuestion>
  ) => {
    updateCompetition({
      questions: comp.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  };

  const deleteCompetitionQuestion = (id: string) => {
    updateCompetition({
      questions: comp.questions.filter((q) => q.id !== id),
    });
  };

  const quoteForDay = draft.quotes.find((q) => q.day === selectedDay) || {
    day: selectedDay,
    textAr: '',
    textEn: '',
    saintAr: '',
    saintEn: '',
  };

  const updateQuoteForDay = (patch: Partial<typeof quoteForDay>) => {
    updateDraft((prev) => {
      const exists = prev.quotes.some((q) => q.day === selectedDay);
      const nextQuotes = exists
        ? prev.quotes.map((q) => (q.day === selectedDay ? { ...q, ...patch } : q))
        : [...prev.quotes, { ...quoteForDay, ...patch }].sort((a, b) => a.day - b.day);
      return { ...prev, quotes: nextQuotes };
    });
  };

  const deleteQuoteForDay = () => {
    updateDraft((prev) => ({
      ...prev,
      quotes: prev.quotes.filter((q) => q.day !== selectedDay),
    }));
  };

  const practicesForWeek = draft.practices.filter((p) => p.week === selectedWeek);

  const addPracticeToWeek = () => {
    const newId = `w${selectedWeek}-${Date.now()}`;
    updateDraft((prev) => ({
      ...prev,
      practices: [
        ...prev.practices,
        {
          id: newId,
          week: selectedWeek,
          textAr: 'تدريب روحي جديد للأسبوع',
          textEn: 'New weekly spiritual practice',
        },
      ],
    }));
  };

  const updatePractice = (id: string, patch: { textAr?: string; textEn?: string }) => {
    updateDraft((prev) => ({
      ...prev,
      practices: prev.practices.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const deletePractice = (id: string) => {
    updateDraft((prev) => ({
      ...prev,
      practices: prev.practices.filter((p) => p.id !== id),
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await onSaveServantContent(draft);
      setHasChanges(false);
      if (res.syncedToCloud) {
        onNotify(
          lang === 'ar'
            ? 'تم حفظ ونشر التعديلات (المسابقة والمظهر والمحتوى) للجميع'
            : 'Saved & published live to all participants'
        );
        onClose();
      } else {
        onNotify(
          lang === 'ar'
            ? 'تم الحفظ محلياً، تعذّر النشر السحابي حالياً — تأكد من الاتصال بالإنترنت'
            : 'Saved locally — cloud sync failed, check your connection'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const competitionQuestions = (comp.questions || []).filter(
    (q) => q.questionAr?.trim() || q.questionEn?.trim()
  );

  // Full participant progress rows
  const userRows = users.map((u) => {
    const startDate = u.planStartDate || draft.lentStartDate || u.createdAt.slice(0, 10);
    const endDate = draft.lentEndDate || DEFAULT_COMPETITION_END_DATE;
    const userTotalDays = getDaysBetweenInclusive(startDate, endDate);
    const userPlan = buildReadingPlan(userTotalDays);
    const completedSet = new Set(
      (u.completedDays || []).filter((d) => d >= 1 && d <= userTotalDays)
    );
    const completedChapterKeys = new Set<string>();
    for (const d of completedSet) {
      for (const ref of getDayPlan(d, userPlan).readings) {
        completedChapterKeys.add(getChapterKey(ref.book, ref.chapter));
      }
    }
    for (const [k, passed] of Object.entries(u.passedChapters || {})) {
      if (passed) completedChapterKeys.add(k);
    }
    const completedChapters = Math.min(TOTAL_GOSPEL_CHAPTERS, completedChapterKeys.size);
    const percent = Math.round((completedChapters / TOTAL_GOSPEL_CHAPTERS) * 100);
    const passedQuizzesCount = Object.values(u.passedChapters || {}).filter(Boolean).length;
    const practicesDone = Object.values(u.checkedPractices || {}).filter(Boolean).length;

    let compCorrect = 0;
    for (const q of competitionQuestions) {
      if (u.competitionAnswers?.[q.id] === q.correctIndex) {
        compCorrect++;
      }
    }

    const gospelBreakdown = GOSPEL_ORDER.map((g) => {
      let done = 0;
      for (let ch = 1; ch <= g.chaptersCount; ch++) {
        if (completedChapterKeys.has(getChapterKey(g.key, ch))) {
          done++;
        }
      }
      return {
        key: g.key,
        nameAr: g.shortAr,
        nameEn: g.nameEn,
        done,
        total: g.chaptersCount,
      };
    });

    const sortedDays = [...completedSet].sort((a, b) => a - b);
    let streak = 0;
    if (sortedDays.length > 0) {
      let cursor = sortedDays[sortedDays.length - 1];
      while (cursor >= 1 && completedSet.has(cursor)) {
        streak++;
        cursor--;
      }
    }

    return {
      user: u,
      startDate,
      userTotalDays,
      completedDaysList: sortedDays,
      completedDaysCount: completedSet.size,
      completedChapters,
      percent,
      passedQuizzesCount,
      practicesDone,
      compCorrect,
      gospelBreakdown,
      streak,
      arrivedBethlehem: completedSet.size >= userTotalDays || percent >= 100,
    };
  });

  const filteredUserRows = userRows
    .filter((row) =>
      row.user.fullName.toLowerCase().includes(userSearch.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (userSort === 'progress') {
        return b.percent - a.percent || b.completedDaysCount - a.completedDaysCount;
      }
      if (userSort === 'name') {
        return a.user.fullName.localeCompare(b.user.fullName, lang === 'ar' ? 'ar' : 'en');
      }
      return b.user.createdAt.localeCompare(a.user.createdAt);
    });

  const averagePercent =
    userRows.length > 0
      ? Math.round(userRows.reduce((sum, r) => sum + r.percent, 0) / userRows.length)
      : 0;
  const completedAllCount = userRows.filter((r) => r.arrivedBethlehem).length;

  const handleExportUsersCsv = () => {
    const header = [
      'الاسم الثلاثي',
      'الرتبة',
      'تاريخ التسجيل',
      'الأيام المكتملة',
      'إجمالي أيام الخطة',
      'الأصحاحات المقروءة',
      'الأسئلة المحلولة',
      'نسبة الإنجاز %',
      'نتيجة المسابقة',
      'أيام متتالية',
    ].join(',');
    const lines = filteredUserRows.map((r) =>
      [
        `"${r.user.fullName.replace(/"/g, '""')}"`,
        r.user.role === 'servant' ? 'خادم' : 'مشارك',
        r.startDate,
        r.completedDaysCount,
        r.userTotalDays,
        r.completedChapters,
        r.passedQuizzesCount,
        r.percent,
        `${r.compCorrect}/${competitionQuestions.length}`,
        r.streak,
      ].join(',')
    );
    const bom = '\uFEFF';
    const blob = new Blob([bom + [header, ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yalla-negahaz-servant-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(lang === 'ar' ? 'تم تصدير تقرير المتابعة (CSV)' : 'Progress report CSV downloaded');
  };

  const tabs: { key: ServantTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { key: 'competition', labelAr: 'كتابة مسابقة', labelEn: 'Competition', icon: <Trophy className="w-4 h-4" /> },
    { key: 'appearance', labelAr: 'الألوان والخطوط والأشكال', labelEn: 'Colors, Fonts & Shapes', icon: <Palette className="w-4 h-4" /> },
    { key: 'quotes', labelAr: 'الأقوال اليومية', labelEn: 'Daily Quotes', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'practices', labelAr: 'التداريب الأسبوعية', labelEn: 'Weekly Tasks', icon: <Award className="w-4 h-4" /> },
    {
      key: 'users',
      labelAr: `المسجلون (${formatNumber(users.length, 'ar')})`,
      labelEn: `Users (${users.length})`,
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'لوحة الخادم' : 'Servant Panel'}
    >
      <div className="w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col app-card rounded-b-none sm:rounded-b-[var(--radius-card)] bg-white dark:bg-[#1E1619] border border-stone-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {lang === 'ar' ? 'لوحة الخادم' : 'Servant Panel'}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                {lang === 'ar' ? 'رتبة: خادم' : 'Role: Servant'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {lang === 'ar'
                ? `مرحباً ${servantName} — يمكنك كتابة المسابقة وتعديل الأقوال والتداريب ومتابعة كل المسجلين`
                : `Welcome ${servantName} — manage competitions, quotes, weekly tasks, and track all participants`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="min-w-[40px] min-h-[40px] app-control hover:bg-stone-100 dark:hover:bg-white/10 text-stone-500 dark:text-stone-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2.5 border-b border-stone-200 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-stone-50/60 dark:bg-black/20">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[38px] px-3 py-1.5 app-control text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tab 1: Competition Writer */}
          {activeTab === 'competition' && (
            <div className="space-y-5">
              {/* Enable / Disable Toggle */}
              <div className="p-4 app-control border border-[var(--accent)]/30 bg-[var(--accent-soft)]/35 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-[var(--accent)] shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-white">
                      {lang === 'ar' ? 'تفعيل عرض المسابقة للجميع' : 'Show Competition to All Users'}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {lang === 'ar'
                        ? 'عند التفعيل ستظهر المسابقة في الصفحة الرئيسية لكل المسجلين'
                        : 'When enabled, the competition appears on the main page for everyone'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateCompetition({ enabled: !comp.enabled })}
                  className={`min-h-[36px] px-3.5 app-control text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                    comp.enabled
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {comp.enabled
                    ? lang === 'ar'
                      ? 'مفعّلة'
                      : 'Active'
                    : lang === 'ar'
                    ? 'مُخفاة'
                    : 'Hidden'}
                </button>
              </div>

              {/* Title, Reward & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'عنوان المسابقة (عربي)' : 'Competition Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={comp.titleAr}
                    onChange={(e) => updateCompetition({ titleAr: e.target.value })}
                    placeholder="مسابقة صوم الميلاد..."
                    className="w-full min-h-[40px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'عنوان المسابقة (إنجليزي)' : 'Competition Title (English)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={comp.titleEn}
                    onChange={(e) => updateCompetition({ titleEn: e.target.value })}
                    placeholder="Nativity Fast Competition..."
                    className="w-full min-h-[40px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'وصف المسابقة (عربي)' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    dir="rtl"
                    rows={2}
                    value={comp.descriptionAr}
                    onChange={(e) => updateCompetition({ descriptionAr: e.target.value })}
                    placeholder="اكتب نبذة أو شروط المسابقة..."
                    className="w-full p-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'وصف المسابقة (إنجليزي)' : 'Description (English)'}
                  </label>
                  <textarea
                    dir="ltr"
                    rows={2}
                    value={comp.descriptionEn}
                    onChange={(e) => updateCompetition({ descriptionEn: e.target.value })}
                    placeholder="Competition instructions..."
                    className="w-full p-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'الجائزة / المكافأة (اختياري - عربي)' : 'Reward Badge (Optional - AR)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={comp.rewardAr || ''}
                    onChange={(e) => updateCompetition({ rewardAr: e.target.value })}
                    placeholder="مثال: هدية للفائزين في عيد الميلاد"
                    className="w-full min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs text-stone-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'الجائزة / المكافأة (اختياري - إنجليزي)' : 'Reward Badge (Optional - EN)'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={comp.rewardEn || ''}
                    onChange={(e) => updateCompetition({ rewardEn: e.target.value })}
                    placeholder="e.g. Christmas prize for winners"
                    className="w-full min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    {lang === 'ar'
                      ? `أسئلة المسابقة (${formatNumber(comp.questions.length, 'ar')})`
                      : `Competition Questions (${comp.questions.length})`}
                  </h3>
                  <button
                    type="button"
                    onClick={addCompetitionQuestion}
                    className="min-h-[36px] px-3 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إضافة سؤال جديد' : 'Add Question'}</span>
                  </button>
                </div>

                {comp.questions.length === 0 ? (
                  <div className="p-6 text-center app-control border border-dashed border-stone-300 dark:border-white/15 text-xs text-stone-500 dark:text-stone-400">
                    {lang === 'ar'
                      ? 'لا توجد أسئلة بعد — اضغط "إضافة سؤال جديد" لبدء كتابة المسابقة.'
                      : 'No questions yet — click "Add Question" to start building the competition.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comp.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[var(--accent)]">
                            {lang === 'ar'
                              ? `السؤال ${formatNumber(idx + 1, 'ar')}`
                              : `Question ${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteCompetitionQuestion(q.id)}
                            className="min-h-[30px] px-2.5 app-control text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            dir="rtl"
                            value={q.questionAr}
                            onChange={(e) =>
                              updateCompetitionQuestion(q.id, { questionAr: e.target.value })
                            }
                            placeholder="نص السؤال بالعربية..."
                            className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs sm:text-sm text-stone-900 dark:text-white"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={q.questionEn}
                            onChange={(e) =>
                              updateCompetitionQuestion(q.id, { questionEn: e.target.value })
                            }
                            placeholder="Question in English (optional)..."
                            className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs sm:text-sm text-stone-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                            {lang === 'ar'
                              ? 'الاختيارات (اضغط علامة الصح بجانب الإجابة الصحيحة):'
                              : 'Options (click the check icon next to the correct answer):'}
                          </div>
                          {[0, 1, 2, 3].map((optIdx) => {
                            const isCorrect = q.correctIndex === optIdx;
                            return (
                              <div key={optIdx} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCompetitionQuestion(q.id, { correctIndex: optIdx })
                                  }
                                  title={lang === 'ar' ? 'تحديد كإجابة صحيحة' : 'Mark as correct'}
                                  className={`min-w-[34px] min-h-[34px] app-control border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-stone-400 hover:text-emerald-600'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <input
                                  type="text"
                                  dir="rtl"
                                  value={q.optionsAr[optIdx] || ''}
                                  onChange={(e) => {
                                    const nextOpts = [...(q.optionsAr || ['', '', '', ''])];
                                    nextOpts[optIdx] = e.target.value;
                                    updateCompetitionQuestion(q.id, { optionsAr: nextOpts });
                                  }}
                                  placeholder={`اختيار ${formatNumber(optIdx + 1, 'ar')} (عربي)`}
                                  className="flex-1 min-w-[140px] min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={q.optionsEn[optIdx] || ''}
                                  onChange={(e) => {
                                    const nextOpts = [...(q.optionsEn || ['', '', '', ''])];
                                    nextOpts[optIdx] = e.target.value;
                                    updateCompetitionQuestion(q.id, { optionsEn: nextOpts });
                                  }}
                                  placeholder={`Option ${optIdx + 1} (EN)`}
                                  className="flex-1 min-w-[140px] min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Colors, Fonts, Text Colors & Shapes */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Font Family Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-[var(--accent)]" />
                  <label className="text-sm font-bold text-stone-800 dark:text-stone-100">
                    {lang === 'ar' ? 'نوع الخط العام للموقع' : 'Site Font Family'}
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FONT_PRESETS.map((fp) => {
                    const isSelected = (draft.fontPreset || 'cairo') === fp.key;
                    return (
                      <button
                        key={fp.key}
                        type="button"
                        onClick={() => updateDraft((p) => ({ ...p, fontPreset: fp.key }))}
                        style={{ fontFamily: fp.sampleFont }}
                        className={`min-h-[46px] px-3.5 py-2 app-control border text-start flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {lang === 'ar' ? fp.nameAr : fp.nameEn}
                        </span>
                        <span className="text-xs opacity-80">أبجد · Abc</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font / Text Colors */}
              <div className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-4">
                <div className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'ألوان الخط (النصوص)' : 'Font / Text Colors'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark mode font color */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                      {lang === 'ar' ? 'لون الخط في الوضع الداكن' : 'Dark Mode Text Color'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {DARK_TEXT_PRESETS.map((preset) => {
                        const active = (draft.darkTextColor || '').toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.nameEn}
                            type="button"
                            onClick={() =>
                              updateDraft((p) => ({ ...p, darkTextColor: preset.hex }))
                            }
                            className={`min-h-[32px] px-2.5 py-1 app-control border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {preset.hex && (
                              <span
                                className="w-3 h-3 rounded-full border border-stone-400"
                                style={{ backgroundColor: preset.hex }}
                              />
                            )}
                            <span>{lang === 'ar' ? preset.nameAr : preset.nameEn}</span>
                          </button>
                        );
                      })}
                      <label className="min-h-[32px] px-2 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                        <input
                          type="color"
                          value={draft.darkTextColor || '#F8F4F4'}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, darkTextColor: e.target.value }))
                          }
                          className="w-4 h-4 border-0 bg-transparent cursor-pointer"
                        />
                        <span>{lang === 'ar' ? 'مخصص' : 'Custom'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Light mode font color */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                      {lang === 'ar' ? 'لون الخط في الوضع الفاتح' : 'Light Mode Text Color'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {LIGHT_TEXT_PRESETS.map((preset) => {
                        const active = (draft.lightTextColor || '').toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.nameEn}
                            type="button"
                            onClick={() =>
                              updateDraft((p) => ({ ...p, lightTextColor: preset.hex }))
                            }
                            className={`min-h-[32px] px-2.5 py-1 app-control border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {preset.hex && (
                              <span
                                className="w-3 h-3 rounded-full border border-stone-300"
                                style={{ backgroundColor: preset.hex }}
                              />
                            )}
                            <span>{lang === 'ar' ? preset.nameAr : preset.nameEn}</span>
                          </button>
                        );
                      })}
                      <label className="min-h-[32px] px-2 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 flex items-center gap-1.5 cursor-pointer text-[11px] font-bold">
                        <input
                          type="color"
                          value={draft.lightTextColor || '#1C1718'}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, lightTextColor: e.target.value }))
                          }
                          className="w-4 h-4 border-0 bg-transparent cursor-pointer"
                        />
                        <span>{lang === 'ar' ? 'مخصص' : 'Custom'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Christmas Theme Toggle & Palettes */}
              <div className="p-4 app-control border border-[var(--accent)]/30 bg-[var(--accent-soft)]/35 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Snowflake className="w-5 h-5 text-[var(--accent)] shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-white">
                      {lang === 'ar'
                        ? 'ثيم الكريسماس (ثلج وزينة وألوان احتفالية)'
                        : 'Christmas Theme (Snow & Garland)'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((p) => ({
                      ...p,
                      christmasTheme: p.christmasTheme === false ? true : false,
                    }))
                  }
                  className={`min-h-[34px] px-3.5 app-control text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                    draft.christmasTheme !== false
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {draft.christmasTheme !== false
                    ? lang === 'ar'
                      ? 'مفعّل'
                      : 'On'
                    : lang === 'ar'
                    ? 'مُغلق'
                    : 'Off'}
                </button>
              </div>

              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar'
                    ? 'باقات ألوان متكاملة (أخضر + أحمر + ذهبي)'
                    : 'Theme Color Palettes'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CHRISTMAS_MULTI_THEMES.map((combo) => {
                    const isSelected =
                      draft.christmasTheme !== false &&
                      draft.accentColor.toLowerCase() === combo.accentColor.toLowerCase() &&
                      draft.darkCanvasColor.toLowerCase() === combo.darkCanvasColor.toLowerCase();
                    return (
                      <button
                        key={combo.id}
                        type="button"
                        onClick={() =>
                          updateDraft((p) => ({
                            ...p,
                            christmasTheme: true,
                            accentColor: combo.accentColor,
                            darkCanvasColor: combo.darkCanvasColor,
                            lightCanvasColor: combo.lightCanvasColor,
                          }))
                        }
                        className={`p-3 app-control border text-start space-y-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {combo.swatches.map((hex) => (
                            <span
                              key={hex}
                              className="w-4 h-4 rounded-full border border-white/40"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-100">
                          {lang === 'ar' ? combo.nameAr : combo.nameEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'اللون الرئيسي (Accent Color)' : 'Primary Accent Color'}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, accentColor: preset.hex }))}
                      className={`min-h-[36px] px-3 py-1.5 app-control border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        draft.accentColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-stone-900 dark:border-white bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white'
                          : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span>{lang === 'ar' ? preset.nameAr : preset.nameEn}</span>
                    </button>
                  ))}
                  <label className="min-h-[36px] px-3 py-1.5 app-control border border-stone-200 dark:border-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={draft.accentColor}
                      onChange={(e) => updateDraft((p) => ({ ...p, accentColor: e.target.value }))}
                      className="w-5 h-5 border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-stone-700 dark:text-stone-300">
                      {lang === 'ar' ? 'لون مخصص' : 'Custom'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Background Canvas Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'لون خلفية الوضع الداكن' : 'Dark Background Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.darkCanvasColor}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, darkCanvasColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded-lg border border-stone-300 dark:border-white/15 bg-transparent cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, darkCanvasColor: '#181214' }))}
                      className="text-xs font-semibold text-stone-500 hover:text-[var(--accent)] cursor-pointer"
                    >
                      {lang === 'ar' ? 'افتراضي' : 'Default'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                    {lang === 'ar' ? 'لون خلفية الوضع الفاتح' : 'Light Background Color'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.lightCanvasColor}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, lightCanvasColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded-lg border border-stone-300 dark:border-white/15 bg-transparent cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, lightCanvasColor: '#FAF7F4' }))}
                      className="text-xs font-semibold text-stone-500 hover:text-[var(--accent)] cursor-pointer"
                    >
                      {lang === 'ar' ? 'افتراضي' : 'Default'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Shapes: Radius, Card Style, Hero Icon, Progress Style & Size */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'شكل واستدارة الحواف' : 'Corner Radius Shape'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['sharp', lang === 'ar' ? 'حادة' : 'Sharp'],
                      ['soft', lang === 'ar' ? 'ناعمة' : 'Soft'],
                      ['rounded', lang === 'ar' ? 'دائرية' : 'Rounded'],
                    ] as [RadiusPreset, string][]
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, radiusPreset: preset }))}
                      className={`min-h-[40px] app-control border text-xs font-bold cursor-pointer transition-colors ${
                        draft.radiusPreset === preset
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'نمط شكل البطاقات' : 'Card Surface Style'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['bordered', lang === 'ar' ? 'بحدود ناعمة' : 'Bordered'],
                      ['elevated', lang === 'ar' ? 'بظل بارز' : 'Elevated'],
                      ['flat', lang === 'ar' ? 'مسطّح' : 'Flat'],
                    ] as [CardStylePreset, string][]
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, cardStyle: preset }))}
                      className={`min-h-[40px] app-control border text-xs font-bold cursor-pointer transition-colors ${
                        draft.cardStyle === preset
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'شكل الأيقونة الرئيسية' : 'Primary Hero Shape'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {HERO_ICONS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, heroIcon: item.key }))}
                      className={`min-h-[54px] p-2 app-control border flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer transition-colors ${
                        draft.heroIcon === item.key
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <HeroSymbol icon={item.key} className="w-5 h-5" filled />
                      <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'شكل عرض التقدّم الرئيسي' : 'Main Progress Display Shape'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['journey', lang === 'ar' ? 'الطريق إلى بيت لحم' : 'Road to Bethlehem'],
                      ['heart', lang === 'ar' ? 'قلب التقدّم الكلاسيكي' : 'Classic Filling Heart'],
                    ] as [ProgressStyle, string][]
                  ).map(([styleKey, label]) => (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() =>
                        updateDraft((p) => ({ ...p, progressStyle: styleKey, journeyMigrated: true }))
                      }
                      className={`min-h-[40px] px-3 app-control border text-xs font-bold cursor-pointer transition-colors ${
                        (draft.progressStyle || 'journey') === styleKey
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                  {lang === 'ar' ? 'حجم عرض التقدّم' : 'Progress Display Size'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['sm', lang === 'ar' ? 'صغير' : 'Small'],
                      ['md', lang === 'ar' ? 'متوسط' : 'Medium'],
                      ['lg', lang === 'ar' ? 'كبير' : 'Large'],
                    ] as [HeroIconSize, string][]
                  ).map(([sz, label]) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateDraft((p) => ({ ...p, heroIconSize: sz }))}
                      className={`min-h-[40px] app-control border text-xs font-bold cursor-pointer transition-colors ${
                        draft.heroIconSize === sz
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <CustomizationStudio lang={lang} draft={draft} updateDraft={updateDraft} />
            </div>
          )}

          {/* Tab 2: Patristic Quotes Editor */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {lang === 'ar'
                    ? 'تعديل أقوال الآباء اليومية (٤٣ يوماً)'
                    : 'Edit Daily Patristic Quotes (43 Days)'}
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    {lang === 'ar' ? 'اليوم:' : 'Day:'}
                  </label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/30 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    {Array.from({ length: TOTAL_LENT_DAYS }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {lang === 'ar' ? `اليوم ${formatNumber(d, 'ar')}` : `Day ${d}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-3">
                <textarea
                  dir="rtl"
                  rows={3}
                  placeholder="نص القول بالعربية..."
                  value={quoteForDay.textAr}
                  onChange={(e) => updateQuoteForDay({ textAr: e.target.value })}
                  className="w-full p-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-sm text-stone-900 dark:text-white"
                />
                <textarea
                  dir="ltr"
                  rows={2}
                  placeholder="Quote text in English..."
                  value={quoteForDay.textEn}
                  onChange={(e) => updateQuoteForDay({ textEn: e.target.value })}
                  className="w-full p-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-sm text-stone-900 dark:text-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="اسم القديس (عربي)"
                    value={quoteForDay.saintAr}
                    onChange={(e) => updateQuoteForDay({ saintAr: e.target.value })}
                    className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="Saint Name (English)"
                    value={quoteForDay.saintEn}
                    onChange={(e) => updateQuoteForDay({ saintEn: e.target.value })}
                    className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={deleteQuoteForDay}
                    className="min-h-[34px] px-3 app-control text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'حذف قول هذا اليوم' : 'Delete Quote'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Weekly Practices Editor */}
          {activeTab === 'practices' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {lang === 'ar' ? 'تعديل التداريب الأسبوعية' : 'Manage Weekly Practices'}
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/30 text-xs font-bold text-stone-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((w) => (
                      <option key={w} value={w}>
                        {lang === 'ar' ? `الأسبوع ${formatNumber(w, 'ar')}` : `Week ${w}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addPracticeToWeek}
                    className="min-h-[36px] px-3 app-control bg-[var(--accent)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة تدريب' : 'Add Practice'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {practicesForWeek.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        dir="rtl"
                        value={p.textAr}
                        onChange={(e) => updatePractice(p.id, { textAr: e.target.value })}
                        className="flex-1 min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => deletePractice(p.id)}
                        aria-label="Delete practice"
                        className="min-w-[36px] min-h-[36px] app-control text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      value={p.textEn}
                      onChange={(e) => updatePractice(p.id, { textEn: e.target.value })}
                      className="w-full min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Registered Users & Progress */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-2.5 px-3.5 app-control border border-emerald-300/70 dark:border-emerald-700/40 bg-emerald-50/70 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? `متصل بالسحابة — يعرض تقدم كل المسجلين (${formatNumber(userRows.length, 'ar')})`
                      : `Cloud live — showing all ${userRows.length} registered users`}
                  </span>
                </span>
                {onRefreshUsers && (
                  <button
                    type="button"
                    disabled={refreshingUsers}
                    onClick={async () => {
                      setRefreshingUsers(true);
                      const ok = await onRefreshUsers();
                      setRefreshingUsers(false);
                      onNotify(
                        ok
                          ? lang === 'ar'
                            ? 'تم تحديث قائمة تقدم المسجلين'
                            : 'Participants progress refreshed'
                          : lang === 'ar'
                          ? 'تعذّر تحديث القائمة'
                          : 'Could not refresh list'
                      );
                    }}
                    className="min-h-[30px] px-2.5 py-1 app-control border border-emerald-400/50 dark:border-emerald-600/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingUsers ? 'animate-spin' : ''}`} />
                    <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
                  </button>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 app-control border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-black/20 text-center">
                  <div className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
                    {formatNumber(userRows.length, lang)}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    {lang === 'ar' ? 'إجمالي المسجلين' : 'Total Registered'}
                  </div>
                </div>
                <div className="p-3 app-control border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-black/20 text-center">
                  <div className="text-xl sm:text-2xl font-extrabold text-[var(--accent)] tabular-nums">
                    {formatNumber(averagePercent, lang)}%
                  </div>
                  <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    {lang === 'ar' ? 'متوسط التقدّم' : 'Avg. Progress'}
                  </div>
                </div>
                <div className="p-3 app-control border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-black/20 text-center">
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatNumber(completedAllCount, lang)}
                  </div>
                  <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    {lang === 'ar' ? 'وصلوا بيت لحم' : 'Completed 100%'}
                  </div>
                </div>
              </div>

              {/* Search, Sort & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'ابحث بالاسم الثلاثي...' : 'Search by name...'}
                    className="w-full min-h-[38px] ps-9 pe-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs sm:text-sm text-stone-900 dark:text-white"
                  />
                </div>

                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value as 'progress' | 'recent' | 'name')}
                  className="min-h-[38px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs font-bold text-stone-800 dark:text-stone-200"
                >
                  <option value="progress">
                    {lang === 'ar' ? 'ترتيب: الأعلى تقدماً' : 'Sort: Top Progress'}
                  </option>
                  <option value="recent">
                    {lang === 'ar' ? 'ترتيب: الأحدث تسجيلاً' : 'Sort: Most Recent'}
                  </option>
                  <option value="name">
                    {lang === 'ar' ? 'ترتيب: أبجدياً' : 'Sort: Name'}
                  </option>
                </select>

                {userRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportUsersCsv}
                    className="min-h-[38px] px-3 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
                  </button>
                )}
              </div>

              {filteredUserRows.length === 0 ? (
                <div className="p-8 text-center app-control border border-dashed border-stone-300 dark:border-white/15 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                  {lang === 'ar'
                    ? 'لا توجد نتائج مطابقة أو لم تتم مزامنة المسجلين بعد.'
                    : 'No matching users found yet.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUserRows.slice(0, visibleUsersCount).map((row) => {
                    const rowKey = row.user.cloudId || row.user.id;
                    const isActive = row.user.id === activeUserId;
                    const isDetailOpen = Boolean(expandedUserIds[rowKey]);
                    const isRowServant = row.user.role === 'servant';
                    const lastUpdatedLabel = row.user.updatedAt
                      ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        }).format(new Date(row.user.updatedAt))
                      : null;

                    return (
                      <div
                        key={rowKey}
                        className={`p-3.5 sm:p-4 app-control border space-y-2.5 ${
                          isActive
                            ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)]/50'
                            : 'border-stone-200 dark:border-white/10 bg-stone-50/80 dark:bg-black/20'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                                {row.user.fullName}
                              </span>
                              {isRowServant && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                  {lang === 'ar' ? 'خادم' : 'Servant'}
                                </span>
                              )}
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-[var(--accent)] text-white text-[10px] font-bold">
                                  {lang === 'ar' ? 'أنت' : 'You'}
                                </span>
                              )}
                              {row.arrivedBethlehem && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                                  {lang === 'ar' ? 'وصل بيت لحم' : 'Bethlehem'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {lang === 'ar'
                                ? `تاريخ الانضمام: ${formatDateReadable(row.startDate, 'ar')} · الخطة: ${formatNumber(
                                    row.userTotalDays,
                                    'ar'
                                  )} يوماً · اليوم الحالي: ${formatNumber(row.user.currentDay || 1, 'ar')}`
                                : `Joined: ${formatDateReadable(row.startDate, 'en')} · Plan: ${row.userTotalDays}d · Day ${row.user.currentDay || 1}`}
                            </div>
                          </div>

                          <div className="text-end tabular-nums flex items-center gap-2">
                            <span className="text-lg font-extrabold text-[var(--accent)]">
                              {formatNumber(row.percent, lang)}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedUserIds((prev) => ({
                                  ...prev,
                                  [rowKey]: !prev[rowKey],
                                }))
                              }
                              aria-expanded={isDetailOpen}
                              className="min-h-[30px] px-2 py-1 app-control border border-stone-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-[11px] font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isDetailOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              row.arrivedBethlehem ? 'bg-emerald-500' : 'bg-[var(--accent)]'
                            }`}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] text-stone-600 dark:text-stone-300 tabular-nums pt-0.5">
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'الأيام: ' : 'Days: '}
                            </span>
                            <span className="font-bold">
                              {formatNumber(row.completedDaysCount, lang)} / {formatNumber(row.userTotalDays, lang)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'الأصحاحات: ' : 'Chapters: '}
                            </span>
                            <span className="font-bold">
                              {formatNumber(row.completedChapters, lang)} / {formatNumber(TOTAL_GOSPEL_CHAPTERS, lang)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'الأسئلة: ' : 'Quizzes: '}
                            </span>
                            <span className="font-bold">
                              {formatNumber(row.passedQuizzesCount, lang)} / {formatNumber(TOTAL_GOSPEL_CHAPTERS, lang)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'المسابقة: ' : 'Comp: '}
                            </span>
                            <span className="font-bold">
                              {formatNumber(row.compCorrect, lang)} / {formatNumber(competitionQuestions.length, lang)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'التداريب: ' : 'Tasks: '}
                            </span>
                            <span className="font-bold">{formatNumber(row.practicesDone, lang)}</span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-stone-500">
                              {lang === 'ar' ? 'التتابع: ' : 'Streak: '}
                            </span>
                            <span className="font-bold">
                              {formatNumber(row.streak, lang)} {lang === 'ar' ? 'يوم' : 'd'}
                            </span>
                          </div>
                        </div>

                        {isDetailOpen && (
                          <div className="pt-2.5 mt-1 border-t border-stone-200/80 dark:border-white/10 space-y-3 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {row.gospelBreakdown.map((g) => {
                                const gPct = Math.round((g.done / g.total) * 100);
                                return (
                                  <div
                                    key={g.key}
                                    className="p-2 rounded-lg bg-white dark:bg-black/25 border border-stone-200/80 dark:border-white/10 space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span className="text-stone-700 dark:text-stone-200">
                                        {lang === 'ar' ? g.nameAr : g.nameEn}
                                      </span>
                                      <span className="text-[var(--accent)] tabular-nums">
                                        {formatNumber(g.done, lang)}/{formatNumber(g.total, lang)}
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                                      <div
                                        className="h-full bg-[var(--accent)] rounded-full"
                                        style={{ width: `${gPct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-semibold">
                                  {lang === 'ar' ? 'الأيام المكتملة:' : 'Completed days:'}
                                </span>
                                {row.completedDaysList.length === 0 ? (
                                  <span>{lang === 'ar' ? 'لا يوجد بعد' : 'None yet'}</span>
                                ) : (
                                  row.completedDaysList.map((d) => (
                                    <span
                                      key={d}
                                      className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold tabular-nums"
                                    >
                                      {formatNumber(d, lang)}
                                    </span>
                                  ))
                                )}
                              </div>
                              {lastUpdatedLabel && (
                                <span className="tabular-nums">
                                  {lang === 'ar'
                                    ? `آخر نشاط: ${lastUpdatedLabel}`
                                    : `Last active: ${lastUpdatedLabel}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredUserRows.length > visibleUsersCount && (
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleUsersCount((c) => c + 50)}
                        className="min-h-[38px] px-4 py-1.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-xs font-bold text-stone-700 dark:text-stone-200 cursor-pointer"
                      >
                        {lang === 'ar'
                          ? `عرض المزيد (${formatNumber(Math.min(50, filteredUserRows.length - visibleUsersCount), 'ar')} من ${formatNumber(filteredUserRows.length - visibleUsersCount, 'ar')} متبقٍ)`
                          : `Show ${Math.min(50, filteredUserRows.length - visibleUsersCount)} more (${filteredUserRows.length - visibleUsersCount} left)`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleUsersCount(filteredUserRows.length)}
                        className="min-h-[38px] px-3 py-1.5 app-control border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] cursor-pointer"
                      >
                        {lang === 'ar' ? 'عرض الكل' : 'Show all'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-white/10 bg-stone-50/90 dark:bg-black/30 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {hasChanges
              ? lang === 'ar'
                ? 'لديك تعديلات غير محفوظة'
                : 'Unsaved changes'
              : lang === 'ar'
              ? 'كل التعديلات محفوظة'
              : 'All changes saved'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 app-control border border-stone-300 dark:border-white/15 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="min-h-[42px] px-5 py-2 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-65 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? lang === 'ar'
                    ? 'جارٍ النشر...'
                    : 'Publishing...'
                  : lang === 'ar'
                  ? 'حفظ ونشر للجميع'
                  : 'Save & Publish'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
