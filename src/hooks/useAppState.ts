import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  DEFAULT_CONFIG,
  DEFAULT_ELEMENT_COLORS,
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_SECTION_ORDER,
} from '../data/defaultConfig';
import {
  buildReadingPlan,
  computeMaxUnlockedDay,
  computeSuggestedDay,
  DEFAULT_COMPETITION_END_DATE,
  DEFAULT_COMPETITION_START_DATE,
  getChapterDay,
  getChapterKey,
  getDayPlan,
  getDaysBetweenInclusive,
  getEffectiveStartDate,
  getPreviousChapter,
  getTodayDateString,
  TOTAL_GOSPEL_CHAPTERS,
} from '../data/readingPlan';
import {
  backfillParticipantsSummaryInCloud,
  createParticipantInCloud,
  fetchAllParticipantsOnce,
  fetchParticipantsSummaryOnce,
  getParticipantDocId,
  hashParticipantPin,
  isVerifiedAdminUser,
  lookupParticipantInCloud,
  promoteParticipantRoleInCloud,
  publishAppConfigToCloud,
  publishServantContentToCloud,
  signInDeveloperWithGoogle,
  signOutDeveloperGoogle,
  subscribeAdminAuth,
  subscribeAllParticipants,
  subscribeAppConfig,
  subscribeParticipantSelf,
  syncParticipantProgressToCloud,
} from '../firebase';
import type {
  AppConfig,
  AppState,
  ElementColorsConfig,
  GospelKey,
  Language,
  PageSectionId,
  ParticipantRole,
  ThemeMode,
  UserAccount,
} from '../types';
import { isValidTripleName, normalizeDigits, normalizeNameKey } from '../utils/digits';

const STORAGE_KEY = 'yalla_negahaz_state_v2';
const LEGACY_STORAGE_KEY = 'yalla_negahaz_state_v1';

function mergeConfig(
  base: AppConfig,
  incoming?: Partial<AppConfig> | null
): AppConfig {
  if (!incoming) {
    return {
      ...base,
      pin2027Migrated: true,
      journeyMigrated: true,
      startNov25Migrated: true,
    };
  }
  const rawPin = incoming.adminPin ? normalizeDigits(incoming.adminPin).replace(/\s+/g, '') : '';
  const needs2027Upgrade = !incoming.pin2027Migrated && (!rawPin || rawPin === '1234');
  const needsNov25Start =
    !incoming.startNov25Migrated &&
    (!incoming.lentStartDate || incoming.lentStartDate === '2026-11-26');
  const oldArCaption = 'يمتلئ القلب تدريجياً حتى يكتمل في نهاية الصوم';
  const oldEnCaption = 'The heart fills day by day until Lent is complete';
  const nextArCopy = { ...base.copy.ar, ...(incoming.copy?.ar || {}) };
  const nextEnCopy = { ...base.copy.en, ...(incoming.copy?.en || {}) };
  if (!incoming.journeyMigrated) {
    if (nextArCopy.heartProgressCaption === oldArCaption) {
      nextArCopy.heartProgressCaption = base.copy.ar.heartProgressCaption;
    }
    if (nextEnCopy.heartProgressCaption === oldEnCaption) {
      nextEnCopy.heartProgressCaption = base.copy.en.heartProgressCaption;
    }
  }
  return {
    ...base,
    ...incoming,
    lentStartDate: needsNov25Start
      ? DEFAULT_COMPETITION_START_DATE
      : incoming.lentStartDate || DEFAULT_COMPETITION_START_DATE,
    startNov25Migrated: true,
    christmasTheme: incoming.christmasTheme !== undefined ? incoming.christmasTheme : true,
    progressStyle: !incoming.journeyMigrated ? 'journey' : incoming.progressStyle || 'journey',
    journeyMigrated: true,
    sectionOrder: normalizeSectionOrder(incoming.sectionOrder || base.sectionOrder),
    layoutSettings: {
      ...DEFAULT_LAYOUT_SETTINGS,
      ...(base.layoutSettings || {}),
      ...(incoming.layoutSettings || {}),
    },
    elementColors: {
      ...DEFAULT_ELEMENT_COLORS,
      ...(incoming.elementColors || {}),
    },
    adminPinEnabled: true,
    adminPin: needs2027Upgrade ? '2027' : rawPin || base.adminPin,
    pin2027Migrated: true,
    copy: {
      ar: nextArCopy,
      en: nextEnCopy,
    },
    quotes:
      Array.isArray(incoming.quotes) && incoming.quotes.length > 0
        ? incoming.quotes
        : base.quotes,
    practices:
      Array.isArray(incoming.practices) && incoming.practices.length > 0
        ? incoming.practices
        : base.practices,
    competition: incoming.competition
      ? {
          ...(base.competition || {
            enabled: false,
            titleAr: 'مسابقة صوم الميلاد',
            titleEn: 'Nativity Fast Competition',
            descriptionAr: '',
            descriptionEn: '',
            rewardAr: '',
            rewardEn: '',
            questions: [],
          }),
          ...incoming.competition,
          questions: Array.isArray(incoming.competition.questions)
            ? incoming.competition.questions
            : base.competition?.questions || [],
        }
      : base.competition,
  };
}

const KNOWN_SECTIONS: PageSectionId[] = [
  'hero',
  'progress',
  'gospels',
  'quotePractices',
  'competition',
];

function normalizeSectionOrder(order?: PageSectionId[]): PageSectionId[] {
  const out: PageSectionId[] = [];
  for (const id of order || []) {
    if (KNOWN_SECTIONS.includes(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

function createInitialState(): AppState {
  const defaultState: AppState = {
    lang: 'ar',
    theme: 'dark',
    activeUserId: null,
    users: {},
    pwaBannerDismissed: false,
    config: DEFAULT_CONFIG,
  };

  if (typeof window === 'undefined') return defaultState;

  let importedConfig: Partial<AppConfig> | null = null;
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#cfg=')) {
      const encoded = hash.slice(5);
      const jsonStr = decodeURIComponent(escape(atob(encoded)));
      importedConfig = JSON.parse(jsonStr);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch {
    importedConfig = null;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      let mergedCfg = mergeConfig(DEFAULT_CONFIG, parsed.config);
      mergedCfg = mergeConfig(mergedCfg, importedConfig);
      return {
        ...defaultState,
        ...parsed,
        users: parsed.users || {},
        activeUserId: parsed.activeUserId && parsed.users?.[parsed.activeUserId] ? parsed.activeUserId : null,
        config: mergedCfg,
      };
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy) as { lang?: Language; theme?: ThemeMode; config?: Partial<AppConfig> };
      let mergedCfg = mergeConfig(DEFAULT_CONFIG, parsedLegacy.config);
      mergedCfg = mergeConfig(mergedCfg, importedConfig);
      return {
        ...defaultState,
        lang: parsedLegacy.lang || 'ar',
        theme: parsedLegacy.theme || 'dark',
        config: mergedCfg,
      };
    }
  } catch {
    // ignore storage errors
  }

  if (importedConfig) {
    return {
      ...defaultState,
      config: mergeConfig(DEFAULT_CONFIG, importedConfig),
    };
  }

  return defaultState;
}

function darkenHex(hex: string, amount = 0.16): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#B91C1C';
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(220, 38, 38, ${alpha})`;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useAppState(monitoringOpen = false) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [cloudUsers, setCloudUsers] = useState<UserAccount[]>([]);
  const [summaryUsers, setSummaryUsers] = useState<UserAccount[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const syncTimerRef = useRef<number | null>(null);
  const pendingSyncRef = useRef<{ user: UserAccount; needsSummary: boolean } | null>(null);
  const lastSummaryFetchAtRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  // Listen to Firebase Admin Google authentication state
  useEffect(() => {
    return subscribeAdminAuth((user) => {
      setAdminUser(user);
    });
  }, []);

  const isAdminVerified = useMemo(() => isVerifiedAdminUser(adminUser), [adminUser]);

  // Live Firestore listener on app_config/main: pushes any developer edit to all users in real time
  useEffect(() => {
    return subscribeAppConfig((remote) => {
      const remoteTs = typeof remote.updatedAt === 'number' ? remote.updatedAt : 0;
      if (remoteTs <= 0) return;

      setState((prev) => {
        const localTs = typeof prev.config.updatedAt === 'number' ? prev.config.updatedAt : 0;
        if (remoteTs < localTs) return prev;
        // Preserve local adminPin (never stored in Firestore)
        const merged = mergeConfig(prev.config, {
          ...remote,
          adminPin: prev.config.adminPin,
          adminPinEnabled: prev.config.adminPinEnabled,
        });
        return {
          ...prev,
          config: {
            ...merged,
            updatedAt: remoteTs,
          },
        };
      });
    });
  }, []);

  // Only listen live to all participants when verified admin actually opens the monitoring panel
  useEffect(() => {
    if (!isAdminVerified || !monitoringOpen) {
      return;
    }
    return subscribeAllParticipants((usersList) => {
      setCloudUsers(usersList);
    });
  }, [isAdminVerified, monitoringOpen]);

  // Clear admin cloud list on sign-out
  useEffect(() => {
    if (!isAdminVerified) {
      setCloudUsers([]);
    }
  }, [isAdminVerified]);

  // Backfill sharded non-PII summary buckets whenever Admin views cloud users
  useEffect(() => {
    if (!isAdminVerified || !monitoringOpen || cloudUsers.length === 0) return;
    void backfillParticipantsSummaryInCloud(cloudUsers, stateRef.current.config);
  }, [isAdminVerified, monitoringOpen, cloudUsers]);

  const activeUser: UserAccount | null = useMemo(() => {
    if (!state.activeUserId) return null;
    return state.users[state.activeUserId] || null;
  }, [state.activeUserId, state.users]);

  const isServant = activeUser?.role === 'servant';
  const canViewAllUsers = isAdminVerified || isServant;

  // Listen to live role updates for the currently signed-in participant
  useEffect(() => {
    const cloudId = activeUser?.cloudId;
    const userId = activeUser?.id;
    if (!cloudId || !userId) return;
    return subscribeParticipantSelf(cloudId, ({ role }) => {
      setState((prev) => {
        const current = prev.users[userId];
        if (!current || (current.role || 'member') === role) return prev;
        return {
          ...prev,
          users: {
            ...prev.users,
            [userId]: {
              ...current,
              role,
            },
          },
        };
      });
    });
  }, [activeUser?.cloudId, activeUser?.id]);

  const summaryCountRef = useRef(0);
  summaryCountRef.current = summaryUsers.length;

  // Fetch sharded progress summary ONLY when Servant/Admin opens the monitoring panel (with 15s cooldown)
  useEffect(() => {
    if (!canViewAllUsers) {
      setSummaryUsers([]);
      return;
    }
    if (!monitoringOpen) return;
    const now = Date.now();
    if (now - lastSummaryFetchAtRef.current < 15000 && summaryCountRef.current > 0) {
      return;
    }
    let cancelled = false;
    lastSummaryFetchAtRef.current = now;
    void fetchParticipantsSummaryOnce().then((res) => {
      if (!cancelled && res.ok) {
        setSummaryUsers(res.users);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [canViewAllUsers, monitoringOpen]);

  const refreshCloudUsers = useCallback(async (): Promise<boolean> => {
    if (isAdminVerified) {
      const [allRes, sumRes] = await Promise.all([
        fetchAllParticipantsOnce(),
        fetchParticipantsSummaryOnce(),
      ]);
      if (allRes.ok) {
        setCloudUsers(allRes.users);
      }
      if (sumRes.ok) {
        lastSummaryFetchAtRef.current = Date.now();
        setSummaryUsers(sumRes.users);
      }
      return allRes.ok;
    }
    if (isServant) {
      const sumRes = await fetchParticipantsSummaryOnce();
      if (sumRes.ok) {
        lastSummaryFetchAtRef.current = Date.now();
        setSummaryUsers(sumRes.users);
      }
      return sumRes.ok;
    }
    return false;
  }, [isAdminVerified, isServant]);

  // Fallback static public/config.json sync when newer
  useEffect(() => {
    let active = true;
    const syncRemoteConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}config.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const remote = (await res.json()) as Partial<AppConfig>;
        if (!active || !remote || typeof remote !== 'object') return;
        const remoteTs = typeof remote.updatedAt === 'number' ? remote.updatedAt : 0;
        if (remoteTs <= 0) return;

        setState((prev) => {
          const localTs = typeof prev.config.updatedAt === 'number' ? prev.config.updatedAt : 0;
          if (remoteTs <= localTs) return prev;
          return {
            ...prev,
            config: {
              ...mergeConfig(prev.config, remote),
              updatedAt: remoteTs,
            },
          };
        });
      } catch {
        // Offline or unavailable; keep local config cleanly
      }
    };

    syncRemoteConfig();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRemoteConfig();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === 'ar' ? 'rtl' : 'ltr';

    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const {
      accentColor,
      lightCanvasColor,
      darkCanvasColor,
      lightTextColor,
      darkTextColor,
      fontPreset,
      radiusPreset,
      cardStyle,
    } = state.config;
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-hover', darkenHex(accentColor, 0.16));
    root.style.setProperty('--accent-soft', hexToRgba(accentColor, 0.14));
    root.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.28));
    root.style.setProperty('--canvas-light', lightCanvasColor);
    root.style.setProperty('--canvas-dark', darkCanvasColor);

    if (lightTextColor && lightTextColor.trim()) {
      root.style.setProperty('--text-light', lightTextColor.trim());
      root.setAttribute('data-custom-light-text', 'true');
    } else {
      root.style.setProperty('--text-light', '#1C1718');
      root.removeAttribute('data-custom-light-text');
    }

    if (darkTextColor && darkTextColor.trim()) {
      root.style.setProperty('--text-dark', darkTextColor.trim());
      root.setAttribute('data-custom-dark-text', 'true');
    } else {
      root.style.setProperty('--text-dark', '#F8F4F4');
      root.removeAttribute('data-custom-dark-text');
    }

    const activeFont = fontPreset || 'cairo';
    const fontStack =
      activeFont === 'tajawal'
        ? state.lang === 'en'
          ? "'DM Sans', 'Tajawal', system-ui, sans-serif"
          : "'Tajawal', 'DM Sans', system-ui, sans-serif"
        : activeFont === 'almarai'
        ? state.lang === 'en'
          ? "'Outfit', 'Almarai', system-ui, sans-serif"
          : "'Almarai', 'Outfit', system-ui, sans-serif"
        : activeFont === 'amiri'
        ? state.lang === 'en'
          ? "'Lora', 'Amiri', Georgia, serif"
          : "'Amiri', 'Lora', Georgia, serif"
        : activeFont === 'rubik'
        ? state.lang === 'en'
          ? "'Manrope', 'Rubik', system-ui, sans-serif"
          : "'Rubik', 'Manrope', system-ui, sans-serif"
        : state.lang === 'en'
        ? "'Plus Jakarta Sans', 'Cairo', system-ui, sans-serif"
        : "'Cairo', 'Plus Jakarta Sans', system-ui, sans-serif";
    root.style.setProperty('--font-ui', fontStack);

    const cardRadius =
      radiusPreset === 'sharp' ? '0.375rem' : radiusPreset === 'rounded' ? '1.75rem' : '1.125rem';
    const controlRadius =
      radiusPreset === 'sharp' ? '0.25rem' : radiusPreset === 'rounded' ? '1rem' : '0.75rem';
    root.style.setProperty('--radius-card', cardRadius);
    root.style.setProperty('--radius-control', controlRadius);
    root.setAttribute('data-card-style', cardStyle || 'bordered');
    root.setAttribute('data-christmas', state.config.christmasTheme !== false ? 'true' : 'false');

    const elColors: ElementColorsConfig = state.config.elementColors || {};
    const elColorBindings: [keyof ElementColorsConfig, string, string][] = [
      ['headerBg', '--el-header-bg', 'data-has-el-header-bg'],
      ['headerText', '--el-header-text', 'data-has-el-header-text'],
      ['heroBg', '--el-hero-bg', 'data-has-el-hero-bg'],
      ['heroNameColor', '--el-hero-name', 'data-has-el-hero-name'],
      ['heroSubtitleColor', '--el-hero-sub', 'data-has-el-hero-sub'],
      ['progressBg', '--el-progress-bg', 'data-has-el-progress-bg'],
      ['progressText', '--el-progress-text', 'data-has-el-progress-text'],
      ['progressBarColor', '--el-progress-bar', 'data-has-el-progress-bar'],
      ['readerBg', '--el-reader-bg', 'data-has-el-reader-bg'],
      ['readerText', '--el-reader-text', 'data-has-el-reader-text'],
      ['quoteBg', '--el-quote-bg', 'data-has-el-quote-bg'],
      ['quoteText', '--el-quote-text', 'data-has-el-quote-text'],
      ['practicesBg', '--el-practices-bg', 'data-has-el-practices-bg'],
      ['practicesText', '--el-practices-text', 'data-has-el-practices-text'],
      ['competitionBg', '--el-competition-bg', 'data-has-el-competition-bg'],
      ['competitionText', '--el-competition-text', 'data-has-el-competition-text'],
      ['footerBg', '--el-footer-bg', 'data-has-el-footer-bg'],
      ['footerText', '--el-footer-text', 'data-has-el-footer-text'],
    ];
    for (const [key, cssVar, attr] of elColorBindings) {
      const val = elColors[key]?.trim();
      if (val) {
        root.style.setProperty(cssVar, val);
        root.setAttribute(attr, 'true');
      } else {
        root.style.removeProperty(cssVar);
        root.removeAttribute(attr);
      }
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', state.theme === 'dark' ? darkCanvasColor : lightCanvasColor);
    }
  }, [state.lang, state.theme, state.config]);

  // Ensure active participant always syncs back up to Firestore (including legacy local-only users)
  useEffect(() => {
    if (!activeUser) return;
    const ensureCloudRecord = async () => {
      const nameKey = normalizeNameKey(activeUser.fullName);
      const docId = activeUser.cloudId || (await getParticipantDocId(nameKey));
      const pinHash =
        activeUser.pinHash ||
        (activeUser.pin ? await hashParticipantPin(nameKey, activeUser.pin) : '');
      if (!pinHash) return;

      const hasStarted =
        (activeUser.completedDays?.length || 0) > 0 ||
        Object.values(activeUser.passedChapters || {}).some(Boolean);
      const effectiveStart = getEffectiveStartDate(stateRef.current.config.lentStartDate);
      const nextPlanStartDate = !hasStarted
        ? effectiveStart
        : activeUser.planStartDate || effectiveStart;

      const enriched: UserAccount = {
        ...activeUser,
        cloudId: docId,
        pinHash,
        planStartDate: nextPlanStartDate,
      };

      if (
        !activeUser.cloudId ||
        !activeUser.pinHash ||
        activeUser.planStartDate !== nextPlanStartDate
      ) {
        setState((prev) => {
          if (!prev.users[activeUser.id]) return prev;
          return {
            ...prev,
            users: {
              ...prev.users,
              [activeUser.id]: {
                ...prev.users[activeUser.id],
                cloudId: docId,
                pinHash,
                planStartDate: nextPlanStartDate,
              },
            },
          };
        });
      }
      await syncParticipantProgressToCloud(enriched, stateRef.current.config);
    };
    void ensureCloudRecord();
  }, [activeUser?.id]);

  const flushPendingCloudSync = useCallback(() => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    const pending = pendingSyncRef.current;
    if (!pending) return;
    pendingSyncRef.current = null;
    void syncParticipantProgressToCloud(pending.user, stateRef.current.config, {
      skipSummary: !pending.needsSummary,
      skipPreRead: true,
    });
  }, []);

  const scheduleCloudSync = useCallback(
    (user: UserAccount, needsSummary = true) => {
      const prevNeedsSummary = pendingSyncRef.current?.needsSummary || false;
      pendingSyncRef.current = {
        user,
        needsSummary: prevNeedsSummary || needsSummary,
      };
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        flushPendingCloudSync();
      }, 1500);
    },
    [flushPendingCloudSync]
  );

  // Flush any queued progress write immediately if the user backgrounds or closes the tab/PWA
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingCloudSync();
      }
    };
    const onPageHide = () => {
      flushPendingCloudSync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      flushPendingCloudSync();
    };
  }, [flushPendingCloudSync]);

  const registerUser = useCallback(
    async (rawName: string, rawPin: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidTripleName(rawName)) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'يرجى كتابة الاسم ثلاثي (٣ كلمات على الأقل)'
              : 'Please enter a full triple name (at least 3 words)',
        };
      }
      const cleanPin = normalizeDigits(rawPin).replace(/\D/g, '');
      if (!/^\d{4}$/.test(cleanPin)) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'كلمة المرور يجب أن تكون ٤ أرقام'
              : 'Password must be exactly 4 digits',
        };
      }

      const id = normalizeNameKey(rawName);
      if (stateRef.current.users[id]) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'هذا الاسم مسجّل بالفعل، اختر "دخول لحسابي" وأدخل كلمة المرور'
              : 'This name is already registered. Switch to Sign In and enter your PIN.',
        };
      }

      const cloudLookup = await lookupParticipantInCloud(id);
      if (cloudLookup.exists) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'هذا الاسم مسجّل بالفعل، اختر "دخول لحسابي" وأدخل كلمة المرور'
              : 'This name is already registered. Switch to Sign In and enter your PIN.',
        };
      }

      const pinHash = await hashParticipantPin(id, cleanPin);
      const nowIso = new Date().toISOString();
      const effectiveStart = getEffectiveStartDate(stateRef.current.config.lentStartDate);
      const newUser: UserAccount = {
        id,
        cloudId: cloudLookup.docId,
        fullName: rawName.trim().replace(/\s+/g, ' '),
        pin: cleanPin,
        pinHash,
        role: 'member',
        currentDay: 1,
        completedDays: [],
        passedChapters: {},
        checkedPractices: {},
        competitionAnswers: {},
        readerFontSize: 21,
        planStartDate: effectiveStart,
        createdAt: nowIso,
        updatedAt: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        activeUserId: id,
        users: {
          ...prev.users,
          [id]: newUser,
        },
      }));

      await createParticipantInCloud(newUser, pinHash, stateRef.current.config);
      return { ok: true };
    },
    []
  );

  const loginUser = useCallback(
    async (rawName: string, rawPin: string): Promise<{ ok: boolean; error?: string }> => {
      const id = normalizeNameKey(rawName);
      const cleanPin = normalizeDigits(rawPin).replace(/\D/g, '');
      const pinHash = await hashParticipantPin(id, cleanPin);
      const localExisting = stateRef.current.users[id];

      const cloudLookup = await lookupParticipantInCloud(id);
      if (cloudLookup.exists && cloudLookup.data) {
        if (cloudLookup.data.pinHash !== pinHash) {
          return {
            ok: false,
            error:
              stateRef.current.lang === 'ar'
                ? 'كلمة المرور (٤ أرقام) غير صحيحة'
                : 'Incorrect 4-digit PIN',
          };
        }

        const localTs = localExisting?.updatedAt || 0;
        const cloudTs = cloudLookup.data.updatedAt || 0;
        const useLocalProgress = Boolean(localExisting && localTs > cloudTs);

        const mergedUser: UserAccount = {
          id,
          cloudId: cloudLookup.docId,
          fullName: cloudLookup.data.fullName || localExisting?.fullName || rawName.trim(),
          pin: cleanPin,
          pinHash,
          role: cloudLookup.data.role || localExisting?.role || 'member',
          currentDay: useLocalProgress ? localExisting!.currentDay : cloudLookup.data.currentDay || 1,
          completedDays: useLocalProgress
            ? localExisting!.completedDays
            : cloudLookup.data.completedDays || [],
          passedChapters: useLocalProgress
            ? localExisting!.passedChapters || {}
            : cloudLookup.data.passedChapters || {},
          checkedPractices: useLocalProgress
            ? localExisting!.checkedPractices || {}
            : cloudLookup.data.checkedPractices || {},
          competitionAnswers: useLocalProgress
            ? localExisting!.competitionAnswers || {}
            : cloudLookup.data.competitionAnswers || {},
          readerFontSize: useLocalProgress
            ? localExisting!.readerFontSize || 21
            : cloudLookup.data.readerFontSize || 21,
          planStartDate:
            cloudLookup.data.planStartDate || localExisting?.planStartDate || getTodayDateString(),
          createdAt: cloudLookup.data.createdAt || localExisting?.createdAt || new Date().toISOString(),
          updatedAt: Math.max(localTs, cloudTs),
        };

        setState((prev) => ({
          ...prev,
          activeUserId: id,
          users: {
            ...prev.users,
            [id]: mergedUser,
          },
        }));

        if (useLocalProgress) {
          void syncParticipantProgressToCloud(mergedUser, stateRef.current.config);
        }
        return { ok: true };
      }

      if (!localExisting) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'لا يوجد حساب بهذا الاسم الثلاثي، تأكد من الاسم أو أنشئ حساباً جديداً'
              : 'No account found with this name. Check spelling or create a new account.',
        };
      }

      if (localExisting.pin !== cleanPin) {
        return {
          ok: false,
          error:
            stateRef.current.lang === 'ar'
              ? 'كلمة المرور (٤ أرقام) غير صحيحة'
              : 'Incorrect 4-digit PIN',
        };
      }

      const upgradedUser: UserAccount = {
        ...localExisting,
        cloudId: cloudLookup.docId,
        pinHash,
      };
      setState((prev) => ({
        ...prev,
        activeUserId: id,
        users: {
          ...prev.users,
          [id]: upgradedUser,
        },
      }));

      if (!cloudLookup.offlineOrError) {
        await createParticipantInCloud(upgradedUser, pinHash, stateRef.current.config);
      }
      return { ok: true };
    },
    []
  );

  const logoutUser = useCallback(() => {
    flushPendingCloudSync();
    setState((prev) => ({ ...prev, activeUserId: null }));
  }, [flushPendingCloudSync]);

  const toggleLang = useCallback(() => {
    setState((prev) => ({ ...prev, lang: prev.lang === 'ar' ? 'en' : 'ar' }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const completedDays = activeUser?.completedDays || [];
  const passedChapters = activeUser?.passedChapters || {};
  const checkedPractices = activeUser?.checkedPractices || {};
  const readerFontSize = activeUser?.readerFontSize || 21;

  const userStartDate = activeUser?.planStartDate || state.config.lentStartDate || getTodayDateString();
  const lentEndDate = state.config.lentEndDate || DEFAULT_COMPETITION_END_DATE;

  const totalDays = useMemo(
    () => getDaysBetweenInclusive(userStartDate, lentEndDate),
    [userStartDate, lentEndDate]
  );

  const readingPlan = useMemo(() => buildReadingPlan(totalDays), [totalDays]);

  const maxUnlockedDay = useMemo(() => {
    if (!state.config.sequentialLock) return totalDays;
    return computeMaxUnlockedDay(completedDays, totalDays);
  }, [completedDays, state.config.sequentialLock, totalDays]);

  const currentDay = useMemo(() => {
    const raw = activeUser?.currentDay || 1;
    const clampedTotal = Math.min(raw, totalDays);
    return state.config.sequentialLock ? Math.min(clampedTotal, maxUnlockedDay) : clampedTotal;
  }, [activeUser?.currentDay, state.config.sequentialLock, maxUnlockedDay, totalDays]);

  const updateActiveUser = useCallback(
    (updater: (u: UserAccount) => UserAccount, options?: { syncSummary?: boolean }) => {
      const syncSummary = options?.syncSummary !== false;
      setState((prev) => {
        if (!prev.activeUserId || !prev.users[prev.activeUserId]) return prev;
        const base = prev.users[prev.activeUserId];
        const updated: UserAccount = {
          ...updater(base),
          updatedAt: Date.now(),
        };
        scheduleCloudSync(updated, syncSummary);
        return {
          ...prev,
          users: {
            ...prev.users,
            [prev.activeUserId]: updated,
          },
        };
      });
    },
    [scheduleCloudSync]
  );

  const setCurrentDay = useCallback(
    (day: number): boolean => {
      const clamped = Math.max(1, Math.min(totalDays, day));
      if (state.config.sequentialLock && clamped > maxUnlockedDay) {
        return false;
      }
      updateActiveUser((u) => ({ ...u, currentDay: clamped }), { syncSummary: false });
      return true;
    },
    [state.config.sequentialLock, maxUnlockedDay, totalDays, updateActiveUser]
  );

  const markChapterPassed = useCallback(
    (book: GospelKey, chapter: number) => {
      const key = getChapterKey(book, chapter);
      updateActiveUser((u) => ({
        ...u,
        passedChapters: {
          ...(u.passedChapters || {}),
          [key]: true,
        },
      }));
    },
    [updateActiveUser]
  );

  const isChapterUnlocked = useCallback(
    (book: GospelKey, chapter: number): boolean => {
      if (!state.config.sequentialLock) return true;
      const chDay = getChapterDay(book, chapter, readingPlan);
      if (chDay > maxUnlockedDay) return false;
      const prev = getPreviousChapter(book, chapter);
      if (!prev) return true;
      const prevKey = getChapterKey(prev.book, prev.chapter);
      const prevDay = getChapterDay(prev.book, prev.chapter, readingPlan);
      return Boolean(passedChapters[prevKey] || completedDays.includes(prevDay));
    },
    [state.config.sequentialLock, readingPlan, maxUnlockedDay, passedChapters, completedDays]
  );

  const toggleDayCompleted = useCallback(
    (day: number): { ok: boolean; missingQuizzes?: boolean } => {
      const alreadyDone = completedDays.includes(day);
      if (!alreadyDone && state.config.sequentialLock) {
        const dayReadings = getDayPlan(day, readingPlan).readings;
        const missing = dayReadings.some(
          (r) => !passedChapters[getChapterKey(r.book, r.chapter)]
        );
        if (missing) {
          return { ok: false, missingQuizzes: true };
        }
      }

      updateActiveUser((u) => {
        const exists = u.completedDays.includes(day);
        const nextDays = exists
          ? u.completedDays.filter((d) => d !== day)
          : [...u.completedDays, day].sort((a, b) => a - b);
        const nextMax = state.config.sequentialLock
          ? computeMaxUnlockedDay(nextDays, totalDays)
          : totalDays;
        return {
          ...u,
          completedDays: nextDays,
          currentDay: Math.min(u.currentDay, nextMax),
        };
      });
      return { ok: true };
    },
    [completedDays, passedChapters, readingPlan, state.config.sequentialLock, totalDays, updateActiveUser]
  );

  const togglePractice = useCallback(
    (practiceId: string) => {
      updateActiveUser((u) => ({
        ...u,
        checkedPractices: {
          ...u.checkedPractices,
          [practiceId]: !u.checkedPractices[practiceId],
        },
      }));
    },
    [updateActiveUser]
  );

  const answerCompetitionQuestion = useCallback(
    (questionId: string, optionIndex: number) => {
      updateActiveUser((u) => ({
        ...u,
        competitionAnswers: {
          ...(u.competitionAnswers || {}),
          [questionId]: optionIndex,
        },
      }));
    },
    [updateActiveUser]
  );

  const setReaderFontSize = useCallback(
    (size: number) => {
      const clamped = Math.max(16, Math.min(30, size));
      updateActiveUser((u) => ({ ...u, readerFontSize: clamped }), { syncSummary: false });
    },
    [updateActiveUser]
  );

  const jumpToToday = useCallback(() => {
    const todayDay = computeSuggestedDay(userStartDate, totalDays);
    const targetDay = state.config.sequentialLock
      ? Math.min(todayDay, maxUnlockedDay)
      : todayDay;
    updateActiveUser((u) => ({ ...u, currentDay: targetDay }), { syncSummary: false });
    return { targetDay, wasCapped: state.config.sequentialLock && todayDay > maxUnlockedDay };
  }, [userStartDate, totalDays, state.config.sequentialLock, maxUnlockedDay, updateActiveUser]);

  const dismissPwaBanner = useCallback(() => {
    setState((prev) => ({ ...prev, pwaBannerDismissed: true }));
  }, []);

  const saveConfig = useCallback(
    async (
      nextConfig: AppConfig
    ): Promise<{ ok: boolean; syncedToCloud: boolean; error?: string }> => {
      const stamped: AppConfig = {
        ...nextConfig,
        updatedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        config: stamped,
      }));

      if (!isAdminVerified) {
        return { ok: true, syncedToCloud: false, error: 'not-admin-auth' };
      }

      const cloudRes = await publishAppConfigToCloud(stamped);
      if (cloudRes.ok && cloudRes.updatedAt) {
        setState((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            updatedAt: cloudRes.updatedAt,
          },
        }));
      }
      return {
        ok: true,
        syncedToCloud: cloudRes.ok,
        error: cloudRes.error,
      };
    },
    [isAdminVerified]
  );

  const importConfig = useCallback(
    async (incoming: Partial<AppConfig>) => {
      const merged = {
        ...mergeConfig(stateRef.current.config, incoming),
        updatedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        config: merged,
      }));
      if (isAdminVerified) {
        await publishAppConfigToCloud(merged);
      }
    },
    [isAdminVerified]
  );

  const resetConfigToDefaults = useCallback(async () => {
    const resetCfg: AppConfig = {
      ...DEFAULT_CONFIG,
      updatedAt: Date.now(),
    };
    setState((prev) => ({ ...prev, config: resetCfg }));
    if (isAdminVerified) {
      await publishAppConfigToCloud(resetCfg);
    }
  }, [isAdminVerified]);

  const saveServantContent = useCallback(
    async (
      nextConfig: AppConfig
    ): Promise<{ ok: boolean; syncedToCloud: boolean; error?: string }> => {
      const servantDocId = activeUser?.cloudId;
      const now = Date.now();
      const updatedCfg: AppConfig = {
        ...stateRef.current.config,
        quotes: nextConfig.quotes,
        practices: nextConfig.practices,
        competition: nextConfig.competition,
        lentStartDate: nextConfig.lentStartDate,
        lentEndDate: nextConfig.lentEndDate,
        accentColor: nextConfig.accentColor,
        lightCanvasColor: nextConfig.lightCanvasColor,
        darkCanvasColor: nextConfig.darkCanvasColor,
        lightTextColor: nextConfig.lightTextColor || '',
        darkTextColor: nextConfig.darkTextColor || '',
        fontPreset: nextConfig.fontPreset || 'cairo',
        radiusPreset: nextConfig.radiusPreset,
        cardStyle: nextConfig.cardStyle,
        heroIcon: nextConfig.heroIcon,
        heroIconSize: nextConfig.heroIconSize,
        progressStyle: nextConfig.progressStyle || 'journey',
        sectionOrder: normalizeSectionOrder(nextConfig.sectionOrder),
        layoutSettings: {
          ...DEFAULT_LAYOUT_SETTINGS,
          ...(nextConfig.layoutSettings || {}),
        },
        elementColors: nextConfig.elementColors || {},
        christmasTheme: nextConfig.christmasTheme !== false,
        updatedAt: now,
      };
      setState((prev) => ({
        ...prev,
        config: updatedCfg,
      }));

      if (isAdminVerified) {
        const adminRes = await publishAppConfigToCloud(updatedCfg);
        return { ok: true, syncedToCloud: adminRes.ok, error: adminRes.error };
      }

      if (!servantDocId || activeUser?.role !== 'servant') {
        return { ok: false, syncedToCloud: false, error: 'not-servant' };
      }

      const cloudRes = await publishServantContentToCloud(servantDocId, updatedCfg);
      if (cloudRes.ok && cloudRes.updatedAt) {
        setState((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            updatedAt: cloudRes.updatedAt,
          },
        }));
      }
      return {
        ok: true,
        syncedToCloud: cloudRes.ok,
        error: cloudRes.error,
      };
    },
    [activeUser?.cloudId, activeUser?.role, isAdminVerified]
  );

  const promoteParticipantRole = useCallback(
    async (
      user: UserAccount,
      nextRole: ParticipantRole
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await promoteParticipantRoleInCloud(
        user,
        nextRole,
        stateRef.current.config
      );
      if (!res.ok) return res;

      const now = Date.now();
      setState((prev) => {
        if (!prev.users[user.id]) return prev;
        return {
          ...prev,
          users: {
            ...prev.users,
            [user.id]: {
              ...prev.users[user.id],
              role: nextRole,
              updatedAt: now,
            },
          },
        };
      });
      setCloudUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole, updatedAt: now } : u))
      );
      setSummaryUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole, updatedAt: now } : u))
      );
      return { ok: true };
    },
    []
  );

  // Merge local state.users + summaryUsers + cloudUsers (all devices)
  const allKnownUsers: UserAccount[] = useMemo(() => {
    const mergedMap = new Map<string, UserAccount>();
    for (const u of Object.values(state.users)) {
      mergedMap.set(u.id, u);
    }
    for (const su of summaryUsers) {
      const localMatch = mergedMap.get(su.id);
      if (!localMatch || (su.updatedAt || 0) >= (localMatch.updatedAt || 0)) {
        mergedMap.set(su.id, {
          ...localMatch,
          ...su,
          pin: localMatch?.pin || '',
        });
      }
    }
    for (const cu of cloudUsers) {
      const localMatch = mergedMap.get(cu.id);
      if (!localMatch || (cu.updatedAt || 0) >= (localMatch.updatedAt || 0)) {
        mergedMap.set(cu.id, {
          ...localMatch,
          ...cu,
          pin: localMatch?.pin || '',
        });
      }
    }
    return Array.from(mergedMap.values());
  }, [state.users, summaryUsers, cloudUsers]);

  const stats = useMemo(() => {
    const completedSet = new Set(completedDays.filter((d) => d >= 1 && d <= totalDays));
    const completedChapterKeys = new Set<string>();
    for (const d of completedSet) {
      for (const ref of getDayPlan(d, readingPlan).readings) {
        completedChapterKeys.add(getChapterKey(ref.book, ref.chapter));
      }
    }
    for (const [k, passed] of Object.entries(passedChapters)) {
      if (passed) completedChapterKeys.add(k);
    }
    const completedChapters = Math.min(TOTAL_GOSPEL_CHAPTERS, completedChapterKeys.size);
    const percent = Math.round((completedChapters / TOTAL_GOSPEL_CHAPTERS) * 100);

    const sorted = [...completedSet].sort((a, b) => a - b);
    let currentStreak = 0;
    if (sorted.length > 0) {
      let anchor = sorted[sorted.length - 1];
      if (completedSet.has(currentDay)) {
        anchor = currentDay;
      }
      let cursor = anchor;
      while (cursor >= 1 && completedSet.has(cursor)) {
        currentStreak++;
        cursor--;
      }
    }

    return {
      completedDaysCount: completedSet.size,
      completedChapters,
      totalChapters: TOTAL_GOSPEL_CHAPTERS,
      percent,
      streak: currentStreak,
    };
  }, [completedDays, passedChapters, currentDay, totalDays, readingPlan]);

  return {
    state,
    activeUser,
    adminUser,
    isAdminVerified,
    allKnownUsers,
    cloudUsersCount: cloudUsers.length,
    userStartDate,
    lentEndDate,
    totalDays,
    readingPlan,
    currentDay,
    completedDays,
    passedChapters,
    checkedPractices,
    readerFontSize,
    maxUnlockedDay,
    stats,
    registerUser,
    loginUser,
    logoutUser,
    signInDeveloperGoogle: signInDeveloperWithGoogle,
    signOutDeveloperGoogle,
    toggleLang,
    toggleTheme,
    setCurrentDay,
    markChapterPassed,
    isChapterUnlocked,
    toggleDayCompleted,
    togglePractice,
    answerCompetitionQuestion,
    setReaderFontSize,
    dismissPwaBanner,
    saveConfig,
    saveServantContent,
    promoteParticipantRole,
    importConfig,
    resetConfigToDefaults,
    jumpToToday,
    refreshCloudUsers,
  };
}
