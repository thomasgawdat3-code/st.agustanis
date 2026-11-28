import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  Shield,
  Snowflake,
  Sparkles,
  Trash2,
  Trophy,
  Type,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  buildReadingPlan,
  DEFAULT_COMPETITION_END_DATE,
  formatDateReadable,
  formatNumber,
  getChapterKey,
  getChapterPaceSummary,
  getDayPlan,
  getDaysBetweenInclusive,
  getEffectiveStartDate,
  GOSPEL_ORDER,
  TOTAL_GOSPEL_CHAPTERS,
  TOTAL_LENT_DAYS,
} from '../data/readingPlan';
import type {
  AppConfig,
  CardStylePreset,
  CompetitionConfig,
  CompetitionQuestion,
  CopyFields,
  FontPreset,
  HeroIconKey,
  HeroIconSize,
  Language,
  ParticipantRole,
  ProgressStyle,
  RadiusPreset,
  ThemeMode,
  UserAccount,
} from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { normalizeDigits } from '../utils/digits';
import { CustomizationStudio } from './CustomizationStudio';
import { HeroSymbol } from './HeroSymbol';

interface AdminPanelProps {
  isOpen: boolean;
  lang: Language;
  theme: ThemeMode;
  config: AppConfig;
  users: UserAccount[];
  activeUserId: string | null;
  adminEmail: string | null;
  isAdminVerified: boolean;
  onGoogleSignIn: () => Promise<{
    ok: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;
  onGoogleSignOut: () => Promise<void>;
  onRefreshUsers?: () => Promise<boolean>;
  onPromoteUser?: (
    user: UserAccount,
    nextRole: ParticipantRole
  ) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  onSaveConfig: (
    nextConfig: AppConfig
  ) => Promise<{ ok: boolean; syncedToCloud: boolean; error?: string }>;
  onImportConfig: (incoming: Partial<AppConfig>) => Promise<void> | void;
  onResetDefaults: () => Promise<void> | void;
  onNotify: (msg: string) => void;
}

type AdminTab = 'identity' | 'users' | 'texts' | 'theme' | 'content' | 'export';

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
    nameAr: 'أحمر + أخضر + ذهبي (كريسماس كلاسيكي)',
    nameEn: 'Red + Green + Gold (Classic)',
    accentColor: '#DC2626',
    darkCanvasColor: '#131A15',
    lightCanvasColor: '#FAF7F2',
    swatches: ['#DC2626', '#15803D', '#FBBF24'],
  },
  {
    id: 'xmas-evergreen',
    nameAr: 'أخضر صنوبري + ذهبي + أحمر',
    nameEn: 'Evergreen + Gold + Red',
    accentColor: '#15803D',
    darkCanvasColor: '#101914',
    lightCanvasColor: '#F5FAF6',
    swatches: ['#15803D', '#D97706', '#DC2626'],
  },
  {
    id: 'xmas-gold',
    nameAr: 'ذهبي ملكي + أحمر + أخضر',
    nameEn: 'Royal Gold + Red + Green',
    accentColor: '#B45309',
    darkCanvasColor: '#1A1410',
    lightCanvasColor: '#FDFBF6',
    swatches: ['#D97706', '#DC2626', '#15803D'],
  },
];

const HERO_ICONS: { key: HeroIconKey; labelAr: string; labelEn: string }[] = [
  { key: 'heart', labelAr: 'قلب', labelEn: 'Heart' },
  { key: 'cross', labelAr: 'صليب', labelEn: 'Cross' },
  { key: 'star', labelAr: 'نجمة', labelEn: 'Star' },
  { key: 'flame', labelAr: 'شمعة', labelEn: 'Candle' },
  { key: 'book', labelAr: 'إنجيل', labelEn: 'Book' },
  { key: 'sun', labelAr: 'نور', labelEn: 'Light' },
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

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  lang,
  config,
  users,
  activeUserId,
  adminEmail,
  isAdminVerified,
  onGoogleSignIn,
  onGoogleSignOut,
  onRefreshUsers,
  onPromoteUser,
  onClose,
  onSaveConfig,
  onImportConfig,
  onResetDefaults,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('identity');
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Draft state: edits only commit when Developer clicks "حفظ التعديلات"
  const [draft, setDraft] = useState<AppConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [googleAuthBusy, setGoogleAuthBusy] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  const [editLang, setEditLang] = useState<Language>(lang);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [importText, setImportText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState<'progress' | 'recent' | 'name'>('progress');
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [visibleUsersCount, setVisibleUsersCount] = useState(50);
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  // Reset lock ONLY when modal opens from closed state (never kick developer out on background syncs)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setUnlocked(false);
      setPinInput('');
      setPinError(false);
      setDraft(config);
      setHasChanges(false);
      setEditLang(lang);
      setExpandedUserIds({});
      setVisibleUsersCount(50);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, config, lang]);

  if (!isOpen) return null;

  const updateDraft = (updater: (prev: AppConfig) => AppConfig) => {
    setDraft((prev) => updater(prev));
    setHasChanges(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = normalizeDigits(pinInput).replace(/[\s\u200E\u200F\u202A-\u202E]/g, '');
    const expected = normalizeDigits(config.adminPin || '2027').replace(/[\s\u200E\u200F\u202A-\u202E]/g, '');
    if (entered === expected) {
      setUnlocked(true);
      setPinError(false);
      setPinInput('');
      setShowPin(false);
      setDraft({ ...config, pin2027Migrated: true });
      setHasChanges(false);
    } else {
      setPinError(true);
    }
  };

  const handleGoogleConnect = async () => {
    if (googleAuthBusy) return;
    setGoogleAuthBusy(true);
    setGoogleAuthError(null);
    setUnauthorizedDomain(null);
    try {
      const res = await onGoogleSignIn();
      if (!res.ok) {
        if (res.errorCode === 'auth/unauthorized-domain') {
          const host = window.location.hostname;
          setUnauthorizedDomain(host);
          setGoogleAuthError(
            lang === 'ar'
              ? `النطاق (${host}) غير مضاف بعد في Firebase Authorized Domains. يجب أن يضيفه مالك المشروع مرة واحدة من لوحة Firebase > Authentication > Settings > Authorized domains.`
              : `Domain (${host}) is not added in Firebase Authorized Domains yet. The project owner must add it once in Firebase Console > Authentication > Settings > Authorized domains.`
          );
        } else if (res.errorCode !== 'auth/popup-closed-by-user') {
          setGoogleAuthError(
            lang === 'ar'
              ? 'تعذّر تسجيل الدخول بحساب جوجل، حاول مرة أخرى'
              : res.errorMessage || 'Google Sign-In failed'
          );
        }
        return;
      }
      onNotify(
        lang === 'ar'
          ? 'تم ربط حساب المطور بنجاح — يمكنك الآن نشر التعديلات ورؤية جميع المسجلين'
          : 'Developer Google account connected'
      );
    } finally {
      setGoogleAuthBusy(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await onSaveConfig(draft);
      setHasChanges(false);
      if (res.syncedToCloud) {
        onNotify(
          lang === 'ar'
            ? 'تم حفظ التعديلات ونشرها فوراً لجميع المستخدمين'
            : 'Saved & published live to all users'
        );
        onClose();
      } else if (res.error === 'logo-too-large') {
        onNotify(
          lang === 'ar'
            ? 'تم الحفظ محلياً، لكن حجم الصورة كبير جداً للمزامنة — اختر صورة أصغر'
            : 'Saved locally, but logo size exceeds cloud limit — try a smaller image'
        );
      } else {
        onNotify(
          lang === 'ar'
            ? 'تم الحفظ على هذا الجهاز — اربط حساب المطور بجوجل لتصل التعديلات للجميع تلقائياً'
            : 'Saved locally — connect Developer Google account to sync to all users'
        );
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 192;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let dataUrl = canvas.toDataURL('image/png', 0.9);
          if (dataUrl.length > 180000) {
            dataUrl = canvas.toDataURL('image/webp', 0.85);
          }
          if (dataUrl.length > 180000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
          updateDraft((prev) => ({ ...prev, logoDataUrl: dataUrl }));
        }
      };
      if (typeof reader.result === 'string') img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const stamped = { ...draft, updatedAt: Date.now() };
    const blob = new Blob([JSON.stringify(stamped, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(lang === 'ar' ? 'تم تنزيل config.json (ارفعه في مجلد public ليصل للجميع فوراً)' : 'Downloaded config.json (place in public/ to sync for everyone)');
  };

  const handleCopyShareLink = async () => {
    try {
      const { logoDataUrl: _omitLogo, ...lightweightConfig } = draft;
      const stamped = { ...lightweightConfig, updatedAt: Date.now() };
      const jsonStr = JSON.stringify(stamped);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      const shareUrl = `${window.location.origin}${window.location.pathname}#cfg=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      onNotify(
        lang === 'ar'
          ? 'تم نسخ رابط الإعدادات المحدّث لمشاركته مع الأسرة'
          : 'Updated shareable settings link copied to clipboard'
      );
    } catch {
      onNotify(lang === 'ar' ? 'تعذّر نسخ الرابط' : 'Could not copy link');
    }
  };

  const handleImportJsonString = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      onImportConfig(parsed);
      setImportText('');
      onNotify(lang === 'ar' ? 'تم استيراد الإعدادات بنجاح' : 'Settings imported successfully');
      onClose();
    } catch {
      onNotify(lang === 'ar' ? 'ملف أو نص JSON غير صالح' : 'Invalid JSON format');
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleImportJsonString(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Current quote for selectedDay in draft
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

  const defaultComp: CompetitionConfig = {
    enabled: false,
    titleAr: 'مسابقة صوم الميلاد',
    titleEn: 'Nativity Fast Competition',
    descriptionAr: 'أجب عن أسئلة المسابقة التي يضعها خدام الأسرة.',
    descriptionEn: 'Answer the fellowship competition questions prepared by the servants.',
    rewardAr: '',
    rewardEn: '',
    questions: [],
  };
  const draftCompetition: CompetitionConfig = draft.competition || defaultComp;

  const updateDraftCompetition = (patch: Partial<CompetitionConfig>) => {
    updateDraft((prev) => ({
      ...prev,
      competition: {
        ...(prev.competition || defaultComp),
        ...patch,
      },
    }));
  };

  const addDraftCompetitionQuestion = () => {
    const newQ: CompetitionQuestion = {
      id: `comp_${Date.now()}`,
      questionAr: '',
      questionEn: '',
      optionsAr: ['', '', '', ''],
      optionsEn: ['', '', '', ''],
      correctIndex: 0,
    };
    updateDraftCompetition({
      enabled: true,
      questions: [...draftCompetition.questions, newQ],
    });
  };

  const updateDraftCompetitionQuestion = (
    id: string,
    patch: Partial<CompetitionQuestion>
  ) => {
    updateDraftCompetition({
      questions: draftCompetition.questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q
      ),
    });
  };

  const deleteDraftCompetitionQuestion = (id: string) => {
    updateDraftCompetition({
      questions: draftCompetition.questions.filter((q) => q.id !== id),
    });
  };

  const handleToggleRole = async (user: UserAccount) => {
    if (!onPromoteUser) return;
    if (!isAdminVerified) {
      onNotify(
        lang === 'ar'
          ? 'اربط حساب المطور بجوجل أولاً للتمكّن من ترقية الرتب'
          : 'Connect Developer Google account first to promote roles'
      );
      return;
    }
    const nextRole: ParticipantRole = user.role === 'servant' ? 'member' : 'servant';
    setPromotingId(user.id);
    try {
      const res = await onPromoteUser(user, nextRole);
      if (res.ok) {
        onNotify(
          nextRole === 'servant'
            ? lang === 'ar'
              ? `تمت ترقية ${user.fullName} إلى رتبة خادم`
              : `${user.fullName} promoted to Servant`
            : lang === 'ar'
            ? `تمت إعادة ${user.fullName} إلى رتبة مشارك`
            : `${user.fullName} changed back to Member`
        );
      } else {
        onNotify(
          lang === 'ar'
            ? 'تعذّر تحديث الرتبة، تأكد من صلاحية حساب جوجل'
            : 'Could not update role'
        );
      }
    } finally {
      setPromotingId(null);
    }
  };

  const tabs: { key: AdminTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { key: 'identity', labelAr: 'الهوية والأمان', labelEn: 'Identity & Lock', icon: <Shield className="w-4 h-4" /> },
    { key: 'users', labelAr: `المسجلون (${formatNumber(users.length, 'ar')})`, labelEn: `Users (${users.length})`, icon: <Users className="w-4 h-4" /> },
    { key: 'texts', labelAr: 'كل النصوص', labelEn: 'All Texts', icon: <FileText className="w-4 h-4" /> },
    { key: 'theme', labelAr: 'الأشكال والألوان', labelEn: 'Shapes & Theme', icon: <Palette className="w-4 h-4" /> },
    { key: 'content', labelAr: 'الأقوال والتداريب', labelEn: 'Quotes & Tasks', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'export', labelAr: 'تصدير / استيراد', labelEn: 'Export / Import', icon: <Share2 className="w-4 h-4" /> },
  ];

  // Compute full progress metrics (days, chapters union, per-Gospel breakdown, quizzes, practices, streak)
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
      'تاريخ التسجيل',
      'الأيام المكتملة',
      'إجمالي أيام الخطة',
      'الأصحاحات المقروءة',
      'الأسئلة المحلولة',
      'نسبة الإنجاز %',
      'أيام متتالية',
    ].join(',');
    const lines = filteredUserRows.map((r) =>
      [
        `"${r.user.fullName.replace(/"/g, '""')}"`,
        r.startDate,
        r.completedDaysCount,
        r.userTotalDays,
        r.completedChapters,
        r.passedQuizzesCount,
        r.percent,
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
    a.download = 'yalla-negahaz-users-progress.csv';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(lang === 'ar' ? 'تم تصدير تقرير المتابعة (CSV)' : 'Progress report CSV downloaded');
  };

  const textFieldsList: [keyof CopyFields, string][] = [
    ['familyName', lang === 'ar' ? 'اسم الأسرة في الشريط العلوي' : 'Fellowship Name'],
    ['authWelcomeTitle', lang === 'ar' ? 'عنوان شاشة التسجيل' : 'Auth Screen Title'],
    ['authWelcomeSubtitle', lang === 'ar' ? 'وصف شاشة التسجيل' : 'Auth Screen Subtitle'],
    ['heroTitle', lang === 'ar' ? 'العنوان الرئيسي' : 'Hero Title'],
    ['heroSubtitle', lang === 'ar' ? 'الجملة الترحيبية' : 'Welcome Subtitle'],
    ['heartProgressCaption', lang === 'ar' ? 'نص أسفل مسار التقدّم' : 'Progress Path Caption'],
    ['pwaTitle', lang === 'ar' ? 'عنوان بطاقة تثبيت التطبيق' : 'PWA Banner Title'],
    ['pwaDesc', lang === 'ar' ? 'وصف بطاقة تثبيت التطبيق' : 'PWA Banner Description'],
    ['pwaInstallBtn', lang === 'ar' ? 'نص زر التثبيت' : 'PWA Install Button'],
    ['progressTitle', lang === 'ar' ? 'عنوان بطاقة نسبة التقدّم' : 'Progress Card Title'],
    ['streakTitle', lang === 'ar' ? 'عنوان بطاقة الاستمرارية' : 'Streak Card Title'],
    ['streakLabel', lang === 'ar' ? 'وصف عدّاد الأيام المتتالية' : 'Streak Counter Label'],
    ['completedDaysLabel', lang === 'ar' ? 'وصف عدّاد الأيام المكتملة' : 'Completed Days Label'],
    ['gospelSectionTitle', lang === 'ar' ? 'عنوان قسم الأناجيل الأربعة' : 'Gospels Section Title'],
    ['gospelEditionLabel', lang === 'ar' ? 'اسم ترجمة/طبعة الإنجيل' : 'Gospel Translation Label'],
    ['markReadBtn', lang === 'ar' ? 'نص زر إتمام القراءة' : 'Mark Read Button'],
    ['markReadDoneBtn', lang === 'ar' ? 'نص الزر بعد الإتمام' : 'Completed Button'],
    ['encouragementMsg', lang === 'ar' ? 'رسالة التشجيع بعد القراءة' : 'Encouragement Message'],
    ['quoteSectionTitle', lang === 'ar' ? 'عنوان قسم أقوال الآباء' : 'Quote Section Title'],
    ['practicesSectionTitle', lang === 'ar' ? 'عنوان تداريب الأسبوع' : 'Practices Section Title'],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'إعدادات المطورين' : 'Developer Settings'}
    >
      <div className="w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col app-card rounded-b-none sm:rounded-b-[var(--radius-card)] bg-white dark:bg-[#1E1619] border border-stone-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              {lang === 'ar' ? 'إعدادات المطورين' : 'Developer Settings'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {unlocked
                ? lang === 'ar'
                  ? 'عدّل ما تشاء ثم اضغط "حفظ التعديلات" لتطبيق التغييرات'
                  : 'Edit any setting then click "Save Changes" to apply'
                : lang === 'ar'
                ? 'هذه المنطقة مخصّصة للمطورين فقط'
                : 'Restricted to developers only'}
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

        {!unlocked ? (
          /* Developer Password Gate */
          <form onSubmit={handlePinSubmit} className="p-6 sm:p-10 max-w-sm mx-auto w-full text-center space-y-4">
            <div className="w-12 h-12 mx-auto app-control bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {lang === 'ar' ? 'دخول المطورين' : 'Developer Access'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {lang === 'ar'
                ? 'أدخل كلمة مرور المطورين لفتح التعديل الكامل على النصوص والأشكال'
                : 'Enter the developer password to edit all texts, shapes, and content'}
            </p>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                dir="ltr"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg font-bold min-h-[44px] px-10 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/30 text-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                aria-label={showPin ? (lang === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (lang === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                className="absolute inset-y-0 right-1.5 flex items-center justify-center w-9 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && (
              <p className="text-xs font-semibold text-red-500">
                {lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect developer password'}
              </p>
            )}
            <button
              type="submit"
              className="w-full min-h-[44px] app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold cursor-pointer"
            >
              {lang === 'ar' ? 'دخول' : 'Unlock'}
            </button>
          </form>
        ) : (
          <>
            {/* Live Cloud Sync Bar */}
            <div
              className={`px-4 py-2.5 border-b border-stone-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                isAdminVerified
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/25'
                  : 'bg-amber-50/80 dark:bg-amber-950/20'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                {isAdminVerified ? (
                  <>
                    <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">
                      {lang === 'ar'
                        ? `النشر السحابي المباشر مفعّل (${adminEmail}) — كل تعديل يظهر فوراً لجميع المسجلين`
                        : `Live Cloud Sync Active (${adminEmail})`}
                    </span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      {adminEmail
                        ? lang === 'ar'
                          ? `الحساب (${adminEmail}) غير مصرح له بالنشر السحابي`
                          : `Account (${adminEmail}) is not authorized`
                        : lang === 'ar'
                        ? 'اربط حساب المطور بجوجل لتصل تعديلاتك (الصور والنصوص) فوراً لكل المسجلين'
                        : 'Connect Developer Google account to push edits live to everyone'}
                    </span>
                  </>
                )}
              </div>

              {isAdminVerified ? (
                <button
                  type="button"
                  onClick={() => void onGoogleSignOut()}
                  className="min-h-[32px] px-2.5 py-1 app-control border border-emerald-300 dark:border-emerald-700/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'فصل جوجل' : 'Disconnect'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={googleAuthBusy}
                  onClick={handleGoogleConnect}
                  className="min-h-[34px] px-3 py-1 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>
                    {googleAuthBusy
                      ? lang === 'ar'
                        ? 'جارٍ الربط...'
                        : 'Connecting...'
                      : lang === 'ar'
                      ? 'ربط حساب المطور بجوجل'
                      : 'Connect Google Admin'}
                  </span>
                </button>
              )}

              {googleAuthError && (
                <div className="w-full space-y-2 pt-1">
                  <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                    {googleAuthError}
                  </p>
                  {unauthorizedDomain && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(unauthorizedDomain);
                            onNotify(
                              lang === 'ar'
                                ? `تم نسخ النطاق (${unauthorizedDomain})`
                                : `Copied domain (${unauthorizedDomain})`
                            );
                          } catch {
                            // ignore clipboard error
                          }
                        }}
                        className="min-h-[30px] px-2.5 py-1 app-control border border-red-300 dark:border-red-500/40 bg-white dark:bg-black/25 text-[11px] font-bold text-red-700 dark:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>
                          {lang === 'ar'
                            ? `نسخ (${unauthorizedDomain})`
                            : `Copy (${unauthorizedDomain})`}
                        </span>
                      </button>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[30px] px-2.5 py-1 app-control bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <span>
                          {lang === 'ar' ? 'فتح إعدادات Firebase' : 'Open Firebase Settings'}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
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

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {activeTab === 'identity' && (
                <div className="space-y-5">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'شعار (لوجو) الأسرة' : 'Fellowship Logo'}
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-16 h-16 app-control border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/25 flex items-center justify-center overflow-hidden">
                        {draft.logoDataUrl ? (
                          <img
                            src={draft.logoDataUrl}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[var(--accent)]">
                            <HeroSymbol icon={draft.heroIcon} className="w-7 h-7" filled />
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="min-h-[40px] px-4 py-2 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'رفع / تغيير اللوجو' : 'Upload Logo'}</span>
                      </button>
                      {draft.logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => updateDraft((p) => ({ ...p, logoDataUrl: null }))}
                          className="min-h-[40px] px-3 py-2 app-control border border-stone-300 dark:border-white/15 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                        >
                          {lang === 'ar' ? 'إزالة الصورة' : 'Remove'}
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Competition Start & End Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                        {lang === 'ar' ? 'تاريخ بداية المسابقة (الافتراضي)' : 'Default Start Date'}
                      </label>
                      <input
                        type="date"
                        value={draft.lentStartDate}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, lentStartDate: e.target.value }))
                        }
                        className="w-full min-h-[42px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                        {lang === 'ar' ? 'تاريخ آخر يوم في المسابقة' : 'Competition End Date'}
                      </label>
                      <input
                        type="date"
                        value={draft.lentEndDate}
                        onChange={(e) =>
                          updateDraft((p) => ({ ...p, lentEndDate: e.target.value }))
                        }
                        className="w-full min-h-[42px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Live Dynamic Plan Calculation Preview */}
                  {(() => {
                    const compDays = getDaysBetweenInclusive(
                      draft.lentStartDate,
                      draft.lentEndDate
                    );
                    const todayEff = getEffectiveStartDate(draft.lentStartDate);
                    const remToday = getDaysBetweenInclusive(todayEff, draft.lentEndDate);
                    const paceToday = getChapterPaceSummary(remToday, lang);
                    return (
                      <div className="p-3 app-control border border-[var(--accent)]/25 bg-[var(--accent-soft)]/40 text-xs text-stone-700 dark:text-stone-200 space-y-1 tabular-nums">
                        <div>
                          {lang === 'ar'
                            ? `المدة الكاملة للمسابقة: ${formatNumber(compDays, 'ar')} يوماً`
                            : `Total competition duration: ${compDays} days`}
                        </div>
                        <div className="font-semibold text-[var(--accent)]">
                          {lang === 'ar'
                            ? `لمن يسجل اليوم: المتبقي ${formatNumber(remToday, 'ar')} يوماً — يتم تقسيم الـ ${formatNumber(TOTAL_GOSPEL_CHAPTERS, 'ar')} أصحاحاً تلقائياً (${paceToday.label})`
                            : `For anyone joining today: ${remToday} days left — ${TOTAL_GOSPEL_CHAPTERS} chapters split automatically (${paceToday.label})`}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sequential Day Lock Toggle */}
                  <div className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-black/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--accent)]" />
                      <div>
                        <div className="text-sm font-bold text-stone-900 dark:text-white">
                          {lang === 'ar' ? 'قفل الأيام بالتسلسل' : 'Sequential Day Lock'}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          {lang === 'ar'
                            ? 'يمنع فتح اليوم التالي إلا بعد إتمام مهام اليوم الحالي'
                            : 'Require completing current day before opening the next day'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((p) => ({ ...p, sequentialLock: !p.sequentialLock }))
                      }
                      className={`min-h-[36px] px-3 app-control text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                        draft.sequentialLock
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {draft.sequentialLock
                        ? lang === 'ar'
                          ? 'مفعّل'
                          : 'On'
                        : lang === 'ar'
                        ? 'مفتوح'
                        : 'Off'}
                    </button>
                  </div>

                  {/* Developer Password Change */}
                  <div className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-black/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[var(--accent)]" />
                      <div className="text-sm font-bold text-stone-900 dark:text-white">
                        {lang === 'ar' ? 'كلمة مرور المطورين' : 'Developer Password'}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={draft.adminPin}
                      onChange={(e) =>
                        updateDraft((p) => ({ ...p, adminPin: normalizeDigits(e.target.value) }))
                      }
                      className="w-40 min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-sm font-bold text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Cloud Verification Callout or Live Sync Refresh */}
                  {!isAdminVerified ? (
                    <div className="p-3.5 app-control border border-amber-300 dark:border-amber-500/40 bg-amber-50/90 dark:bg-amber-950/25 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                        <span className="font-bold block">
                          {lang === 'ar'
                            ? 'لعرض كل المسجلين وتقدمهم من جميع الموبايلات:'
                            : 'Load all registered users from every device:'}
                        </span>
                        <span>
                          {lang === 'ar'
                            ? 'اربط حساب المطور بجوجل ليظهر تقدم جميع المشاركين لحظياً.'
                            : 'Connect your Developer Google account to sync all participants live.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={googleAuthBusy}
                        onClick={handleGoogleConnect}
                        className="min-h-[36px] px-3 py-1.5 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>
                          {googleAuthBusy
                            ? lang === 'ar'
                              ? 'جارٍ الربط...'
                              : 'Connecting...'
                            : lang === 'ar'
                            ? 'ربط حساب جوجل'
                            : 'Connect Google'}
                        </span>
                      </button>
                    </div>
                  ) : (
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
                  )}

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

                  {/* Search, Sort & Export Controls */}
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

                  {/* Users List */}
                  {filteredUserRows.length === 0 ? (
                    <div className="p-8 text-center app-control border border-dashed border-stone-300 dark:border-white/15 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                      {users.length === 0
                        ? lang === 'ar'
                          ? 'لم يسجل أي مستخدم على هذا الجهاز بعد.'
                          : 'No registered users on this device yet.'
                        : lang === 'ar'
                        ? 'لا توجد نتائج مطابقة للبحث.'
                        : 'No matching users found.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredUserRows.slice(0, visibleUsersCount).map((row) => {
                        const rowKey = row.user.cloudId || row.user.id;
                        const isActive = row.user.id === activeUserId;
                        const isDetailOpen = Boolean(expandedUserIds[rowKey]);
                        const isRowServant = row.user.role === 'servant';
                        const isPromotingThis = promotingId === row.user.id;
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
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                      <Award className="w-3 h-3" />
                                      <span>{lang === 'ar' ? 'خادم' : 'Servant'}</span>
                                    </span>
                                  )}
                                  {isActive && (
                                    <span className="px-2 py-0.5 rounded-md bg-[var(--accent)] text-white text-[10px] font-bold">
                                      {lang === 'ar' ? 'نشط الآن' : 'Active'}
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

                              <div className="text-end tabular-nums flex flex-wrap items-center gap-1.5">
                                {onPromoteUser && (
                                  <button
                                    type="button"
                                    disabled={isPromotingThis}
                                    onClick={() => void handleToggleRole(row.user)}
                                    className={`min-h-[30px] px-2.5 py-1 app-control border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 ${
                                      isRowServant
                                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25'
                                        : 'border-[var(--accent)]/40 bg-[var(--accent-soft)]/60 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
                                    }`}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>
                                      {isPromotingThis
                                        ? lang === 'ar'
                                          ? 'جارٍ الحفظ...'
                                          : 'Saving...'
                                        : isRowServant
                                        ? lang === 'ar'
                                          ? 'إرجاع لمشارك'
                                          : 'Demote'
                                        : lang === 'ar'
                                        ? 'ترقية إلى خادم'
                                        : 'Promote to Servant'}
                                    </span>
                                  </button>
                                )}
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

                            {/* Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  row.arrivedBethlehem ? 'bg-emerald-500' : 'bg-[var(--accent)]'
                                }`}
                                style={{ width: `${row.percent}%` }}
                              />
                            </div>

                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-stone-600 dark:text-stone-300 tabular-nums pt-0.5">
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
                                  {lang === 'ar' ? 'التداريب: ' : 'Tasks: '}
                                </span>
                                <span className="font-bold">
                                  {formatNumber(row.practicesDone, lang)}
                                </span>
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

                            {/* Full Breakdown Drawer per User */}
                            {isDetailOpen && (
                              <div className="pt-2.5 mt-1 border-t border-stone-200/80 dark:border-white/10 space-y-3 text-xs">
                                {/* Per-Gospel Progress */}
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

                                {/* Completed Days Badges & Last Activity */}
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

              {activeTab === 'texts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                      {lang === 'ar' ? 'لغة النصوص الجاري تعديلها:' : 'Editing Language:'}
                    </span>
                    <div className="flex gap-1.5">
                      {(['ar', 'en'] as Language[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setEditLang(l)}
                          className={`px-3 py-1.5 app-control text-xs font-bold cursor-pointer ${
                            editLang === l
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {l === 'ar' ? 'العربية' : 'English'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {textFieldsList.map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                        {label}
                      </label>
                      <input
                        type="text"
                        dir={editLang === 'ar' ? 'rtl' : 'ltr'}
                        value={draft.copy[editLang][field]}
                        onChange={(e) =>
                          updateDraft((p) => ({
                            ...p,
                            copy: {
                              ...p.copy,
                              [editLang]: {
                                ...p.copy[editLang],
                                [field]: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full min-h-[40px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-sm text-stone-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="space-y-6">
                  {/* Developer-Only Christmas Theme & Falling Snow Toggle */}
                  <div className="p-4 app-control border border-[var(--accent)]/30 bg-[var(--accent-soft)]/35 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Snowflake className="w-5 h-5 text-[var(--accent)] shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-stone-900 dark:text-white">
                          {lang === 'ar'
                            ? 'ثيم الكريسماس (ثلج خلف الكلام + شجر وزينة)'
                            : 'Christmas Theme (Snow, Trees & Garland)'}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          {lang === 'ar'
                            ? 'يظهر للجميع عند الحفظ ويتحكم فيه المطور فقط'
                            : 'Controlled exclusively by Developers and synced to all users'}
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
                      className={`min-h-[36px] px-3.5 app-control text-xs font-bold cursor-pointer transition-colors shrink-0 ${
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

                  {/* Multi-Color Christmas Theme Combos (Red + Green + Gold together) */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar'
                        ? 'باقات ألوان الكريسماس المتكاملة (أخضر + أحمر + ذهبي)'
                        : 'Multi-Color Christmas Theme Palettes (Red + Green + Gold)'}
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
                            <div className="text-xs font-bold text-stone-800 dark:text-stone-100 leading-snug">
                              {lang === 'ar' ? combo.nameAr : combo.nameEn}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'اللون الرئيسي (Accent Color)' : 'Primary Accent Color'}
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {ACCENT_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() =>
                            updateDraft((p) => ({ ...p, accentColor: preset.hex }))
                          }
                          className={`min-h-[38px] px-3 py-1.5 app-control border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
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
                      <label className="min-h-[38px] px-3 py-1.5 app-control border border-stone-200 dark:border-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                        <input
                          type="color"
                          value={draft.accentColor}
                          onChange={(e) =>
                            updateDraft((p) => ({ ...p, accentColor: e.target.value }))
                          }
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
                        {lang === 'ar' ? 'خلفية الوضع الداكن' : 'Dark Mode Background'}
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
                          onClick={() =>
                            updateDraft((p) => ({ ...p, darkCanvasColor: '#181214' }))
                          }
                          className="text-xs font-semibold text-stone-500 hover:text-[var(--accent)] cursor-pointer"
                        >
                          {lang === 'ar' ? 'عنّابي فحمي افتراضي' : 'Default Burgundy'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                        {lang === 'ar' ? 'خلفية الوضع الفاتح' : 'Light Mode Background'}
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
                          onClick={() =>
                            updateDraft((p) => ({ ...p, lightCanvasColor: '#FAF7F4' }))
                          }
                          className="text-xs font-semibold text-stone-500 hover:text-[var(--accent)] cursor-pointer"
                        >
                          {lang === 'ar' ? 'أبيض دافئ افتراضي' : 'Default Warm Ivory'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Font Family & Text Colors */}
                  <div className="space-y-3">
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
                            className={`min-h-[44px] px-3.5 py-2 app-control border text-start flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                : 'border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-bold">
                              {lang === 'ar' ? fp.nameAr : fp.nameEn}
                            </span>
                            <span className="text-xs opacity-80">أبجد · Abc</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-3">
                    <div className="text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'ألوان الخط (النصوص)' : 'Font / Text Colors'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                className={`min-h-[30px] px-2 py-1 app-control border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
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
                          <input
                            type="color"
                            value={draft.darkTextColor || '#F8F4F4'}
                            onChange={(e) =>
                              updateDraft((p) => ({ ...p, darkTextColor: e.target.value }))
                            }
                            className="w-7 h-7 border border-stone-300 dark:border-white/15 rounded bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
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
                                className={`min-h-[30px] px-2 py-1 app-control border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
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
                          <input
                            type="color"
                            value={draft.lightTextColor || '#1C1718'}
                            onChange={(e) =>
                              updateDraft((p) => ({ ...p, lightTextColor: e.target.value }))
                            }
                            className="w-7 h-7 border border-stone-300 dark:border-white/15 rounded bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Border Radius */}
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
                          onClick={() =>
                            updateDraft((p) => ({ ...p, radiusPreset: preset }))
                          }
                          className={`min-h-[42px] app-control border text-xs font-bold cursor-pointer transition-colors ${
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

                  {/* Card Surface Style */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'نمط شكل البطاقات' : 'Card Surface Style'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['bordered', lang === 'ar' ? 'بحدود ناعمة' : 'Bordered'],
                          ['elevated', lang === 'ar' ? 'بظل بارز' : 'Elevated Shadow'],
                          ['flat', lang === 'ar' ? 'مسطّح بدون حدود' : 'Flat Minimal'],
                        ] as [CardStylePreset, string][]
                      ).map(([preset, label]) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            updateDraft((p) => ({ ...p, cardStyle: preset }))
                          }
                          className={`min-h-[42px] app-control border text-xs font-bold cursor-pointer transition-colors ${
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

                  {/* Hero Icon Picker */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'شكل الأيقونة الرئيسية' : 'Primary Hero Shape'}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {HERO_ICONS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            updateDraft((p) => ({ ...p, heroIcon: item.key }))
                          }
                          className={`min-h-[56px] p-2 app-control border flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer transition-colors ${
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

                  {/* Progress Visual Style */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'شكل عرض التقدّم الرئيسي' : 'Main Progress Display Style'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['journey', lang === 'ar' ? 'الطريق إلى بيت لحم (مريم ويوسف)' : 'Road to Bethlehem (Mary & Joseph)'],
                          ['heart', lang === 'ar' ? 'قلب التقدّم الكلاسيكي' : 'Classic Filling Heart'],
                        ] as [ProgressStyle, string][]
                      ).map(([styleKey, label]) => (
                        <button
                          key={styleKey}
                          type="button"
                          onClick={() =>
                            updateDraft((p) => ({ ...p, progressStyle: styleKey, journeyMigrated: true }))
                          }
                          className={`min-h-[42px] px-3 app-control border text-xs font-bold cursor-pointer transition-colors ${
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

                  {/* Hero Progress Size */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-800 dark:text-stone-100">
                      {lang === 'ar' ? 'حجم عرض التقدّم الرئيسي' : 'Main Progress Size'}
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
                          onClick={() =>
                            updateDraft((p) => ({ ...p, heroIconSize: sz }))
                          }
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

              {activeTab === 'content' && (
                <div className="space-y-8">
                  {/* Competition Builder */}
                  <div className="space-y-3 pb-5 border-b border-stone-200 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[var(--accent)]" />
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                          {lang === 'ar' ? 'كتابة وإعداد المسابقة' : 'Competition Builder'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraftCompetition({ enabled: !draftCompetition.enabled })
                        }
                        className={`min-h-[32px] px-3 app-control text-xs font-bold cursor-pointer ${
                          draftCompetition.enabled
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {draftCompetition.enabled
                          ? lang === 'ar'
                            ? 'المسابقة مفعّلة'
                            : 'Active'
                          : lang === 'ar'
                          ? 'المسابقة مخفية'
                          : 'Hidden'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        dir="rtl"
                        value={draftCompetition.titleAr}
                        onChange={(e) => updateDraftCompetition({ titleAr: e.target.value })}
                        placeholder="عنوان المسابقة (عربي)"
                        className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs sm:text-sm text-stone-900 dark:text-white"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        value={draftCompetition.titleEn}
                        onChange={(e) => updateDraftCompetition({ titleEn: e.target.value })}
                        placeholder="Competition Title (English)"
                        className="min-h-[38px] px-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs sm:text-sm text-stone-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <textarea
                        dir="rtl"
                        rows={2}
                        value={draftCompetition.descriptionAr}
                        onChange={(e) => updateDraftCompetition({ descriptionAr: e.target.value })}
                        placeholder="وصف المسابقة بالعربية..."
                        className="p-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs text-stone-900 dark:text-white"
                      />
                      <textarea
                        dir="ltr"
                        rows={2}
                        value={draftCompetition.descriptionEn}
                        onChange={(e) => updateDraftCompetition({ descriptionEn: e.target.value })}
                        placeholder="Competition description (English)..."
                        className="p-2.5 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs text-stone-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                        {lang === 'ar'
                          ? `الأسئلة (${formatNumber(draftCompetition.questions.length, 'ar')})`
                          : `Questions (${draftCompetition.questions.length})`}
                      </span>
                      <button
                        type="button"
                        onClick={addDraftCompetitionQuestion}
                        className="min-h-[34px] px-3 app-control bg-[var(--accent)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'إضافة سؤال للمسابقة' : 'Add Question'}</span>
                      </button>
                    </div>

                    {draftCompetition.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 app-control border border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/20 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--accent)]">
                            {lang === 'ar' ? `سؤال ${formatNumber(idx + 1, 'ar')}` : `Q${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteDraftCompetitionQuestion(q.id)}
                            className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            dir="rtl"
                            value={q.questionAr}
                            onChange={(e) =>
                              updateDraftCompetitionQuestion(q.id, { questionAr: e.target.value })
                            }
                            placeholder="نص السؤال بالعربية"
                            className="min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                          />
                          <input
                            type="text"
                            dir="ltr"
                            value={q.questionEn}
                            onChange={(e) =>
                              updateDraftCompetitionQuestion(q.id, { questionEn: e.target.value })
                            }
                            placeholder="Question (EN)"
                            className="min-h-[36px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                          />
                        </div>
                        {[0, 1, 2, 3].map((optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraftCompetitionQuestion(q.id, { correctIndex: optIdx })
                              }
                              className={`min-w-[30px] min-h-[30px] app-control border flex items-center justify-center shrink-0 cursor-pointer ${
                                q.correctIndex === optIdx
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-stone-400'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="text"
                              dir="rtl"
                              value={q.optionsAr[optIdx] || ''}
                              onChange={(e) => {
                                const next = [...(q.optionsAr || ['', '', '', ''])];
                                next[optIdx] = e.target.value;
                                updateDraftCompetitionQuestion(q.id, { optionsAr: next });
                              }}
                              placeholder={`اختيار ${formatNumber(optIdx + 1, 'ar')}`}
                              className="flex-1 min-h-[34px] px-2.5 app-control border border-stone-300 dark:border-white/15 bg-white dark:bg-black/30 text-xs text-stone-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Patristic Quotes Editor */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        {lang === 'ar' ? 'إدارة أقوال الآباء (٤٣ يوماً)' : 'Manage Patristic Quotes (43 Days)'}
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
                        rows={2}
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

                  {/* Weekly Practices Editor */}
                  <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        {lang === 'ar' ? 'إدارة تداريب الأسبوع' : 'Manage Weekly Practices'}
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
                </div>
              )}

              {activeTab === 'export' && (
                <div className="space-y-5">
                  <div className="p-3.5 app-control border border-[var(--accent)]/30 bg-[var(--accent-soft)]/50 text-xs text-stone-700 dark:text-stone-200 leading-relaxed">
                    {lang === 'ar'
                      ? 'التعديلات التي تحفظها هنا تُطبَّق على جهازك فوراً. لتصل إلى جميع الأشخاص الذين لديهم رابط الموقع تلقائياً: نزّل ملف config.json وارفعه داخل مجلد public على GitHub، أو شارك رابط الإعدادات المباشر.'
                      : 'Saved changes apply immediately on this device. To push your settings to everyone who opens the link automatically, download config.json and place it in public/ on GitHub, or share the direct settings link.'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="min-h-[44px] px-4 py-2.5 app-control bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تنزيل config.json للنشر للجميع' : 'Download config.json for Everyone'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="min-h-[44px] px-4 py-2.5 app-control border border-stone-300 dark:border-white/15 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-800 dark:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-[var(--accent)]" />
                      <span>{lang === 'ar' ? 'نسخ رابط مشاركة للأسرة' : 'Copy Shareable Config Link'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-white/10">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      {lang === 'ar' ? 'استيراد إعدادات من ملف أو نص JSON' : 'Import from JSON File or Text'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jsonFileInputRef.current?.click()}
                        className="min-h-[38px] px-3.5 py-1.5 app-control border border-stone-300 dark:border-white/15 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'اختيار ملف JSON' : 'Choose JSON File'}</span>
                      </button>
                      <input
                        ref={jsonFileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleJsonFileUpload}
                        className="hidden"
                      />
                    </div>
                    <textarea
                      dir="ltr"
                      rows={4}
                      placeholder='{"accentColor": "#DC2626", ...}'
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="w-full p-3 app-control border border-stone-300 dark:border-white/15 bg-stone-50 dark:bg-black/25 text-xs font-mono text-stone-900 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={!importText.trim()}
                      onClick={() => handleImportJsonString(importText)}
                      className="min-h-[40px] px-4 py-2 app-control bg-stone-900 dark:bg-white text-white dark:text-stone-900 disabled:opacity-40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تطبيق الإعدادات الملصوقة' : 'Apply Pasted JSON'}</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-stone-200 dark:border-white/10 flex justify-between items-center">
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {lang === 'ar' ? 'استعادة الألوان والنصوص والمحتوى الافتراضي' : 'Restore default colors, texts & content'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResetDefaults();
                        onNotify(lang === 'ar' ? 'تمت استعادة الإعدادات الافتراضية' : 'Defaults restored');
                        onClose();
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 app-control border border-red-300 dark:border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Save / Cancel Footer */}
            <div className="px-5 py-3.5 border-t border-stone-200 dark:border-white/10 bg-stone-50/90 dark:bg-black/30 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {hasChanges
                  ? lang === 'ar'
                    ? 'لديك تعديلات غير محفوظة'
                    : 'Unsaved changes'
                  : lang === 'ar'
                  ? 'كل الإعدادات محفوظة'
                  : 'All changes saved'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 app-control border border-stone-300 dark:border-white/15 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
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
                      ? 'حفظ التعديلات'
                      : 'Save Changes'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
