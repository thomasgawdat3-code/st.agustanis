/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { AuthGate } from './components/AuthGate';
import { BethlehemJourney } from './components/BethlehemJourney';
import { ChristmasAtmosphere } from './components/ChristmasAtmosphere';
import { CompetitionSection } from './components/CompetitionSection';
import { GospelReader } from './components/GospelReader';
import { Header } from './components/Header';
import { HeroSymbol } from './components/HeroSymbol';
import { ProgressAndDayNav } from './components/ProgressAndDayNav';
import { ProgressHeart } from './components/ProgressHeart';
import { OfflineIndicator, PWABanner } from './components/PWABanner';
import { QuoteAndPractices } from './components/QuoteAndPractices';
import { ReadingBuddy } from './components/ReadingBuddy';
import { ServantPanel } from './components/ServantPanel';
import { DEFAULT_LAYOUT_SETTINGS, DEFAULT_SECTION_ORDER } from './data/defaultConfig';
import { formatNumber, getChapterKey, getDayPlan, getQuoteDayForPlanDay } from './data/readingPlan';
import { useAppState } from './hooks/useAppState';
import { useCalmMusic } from './hooks/useCalmMusic';
import type { PageSectionId } from './types';

export default function App() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [servantOpen, setServantOpen] = useState(false);
  const [isReadingChapter, setIsReadingChapter] = useState(false);

  const {
    state,
    activeUser,
    adminUser,
    isAdminVerified,
    allKnownUsers,
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
    signInDeveloperGoogle,
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
  } = useAppState(adminOpen || servantOpen);

  const { isMusicPlaying, toggleMusic } = useCalmMusic();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const handleShareText = async (text: string) => {
    const signature =
      state.lang === 'ar'
        ? `\n— ${state.config.copy.ar.heroTitle} | ${state.config.copy.ar.familyName}`
        : `\n— ${state.config.copy.en.heroTitle} | ${state.config.copy.en.familyName}`;
    const fullText = `${text}${signature}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: fullText });
        return;
      } catch {
        // user cancelled or share failed; fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(fullText);
      showToast(state.lang === 'ar' ? 'تم النسخ للمشاركة' : 'Copied to clipboard');
    } catch {
      showToast(state.lang === 'ar' ? 'تعذّر النسخ' : 'Could not copy');
    }
  };

  const handleLockedDayAttempt = (targetDay: number) => {
    const requiredDay = maxUnlockedDay;
    showToast(
      state.lang === 'ar'
        ? `لا يمكنك فتح اليوم ${formatNumber(targetDay, 'ar')} قبل إنهاء اليوم ${formatNumber(requiredDay, 'ar')} أولاً`
        : `Complete Day ${requiredDay} first before opening Day ${targetDay}`
    );
  };

  const handleLockedChapterAttempt = () => {
    showToast(
      state.lang === 'ar'
        ? 'أجب عن سؤال الأصحاح السابق إجابة صحيحة أولاً لفتح هذا الأصحاح'
        : 'Answer the previous chapter’s question correctly first to unlock this chapter'
    );
  };

  const copy = state.config.copy[state.lang];
  const dayPlan = getDayPlan(currentDay, readingPlan);
  const mappedQuoteDay = getQuoteDayForPlanDay(currentDay, totalDays);
  const currentQuote = state.config.quotes.find((q) => q.day === mappedQuoteDay);
  const weekPractices = state.config.practices.filter((p) => p.week === dayPlan.week);
  const isDayCompleted = completedDays.includes(currentDay);
  const remainingTonightChapters = isDayCompleted
    ? 0
    : dayPlan.readings.filter(
        (r) => !passedChapters[getChapterKey(r.book, r.chapter)]
      ).length;
  const totalRemainingChapters = Math.max(0, stats.totalChapters - stats.completedChapters);
  const existingUsersList = Object.values(state.users);
  const christmasEnabled = state.config.christmasTheme !== false;
  const layout = {
    ...DEFAULT_LAYOUT_SETTINGS,
    ...(state.config.layoutSettings || {}),
  };

  const resolvedSectionOrder: PageSectionId[] = (() => {
    const out: PageSectionId[] = [];
    for (const id of state.config.sectionOrder || []) {
      if (DEFAULT_SECTION_ORDER.includes(id) && !out.includes(id)) {
        out.push(id);
      }
    }
    for (const id of DEFAULT_SECTION_ORDER) {
      if (!out.includes(id)) {
        out.push(id);
      }
    }
    return out;
  })();

  const logoSizeClass =
    layout.logoSize === 'sm'
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : layout.logoSize === 'lg'
      ? 'w-24 h-24 sm:w-32 sm:h-32'
      : 'w-20 h-20 sm:w-24 sm:h-24';

  const logoShapeClass =
    layout.logoShape === 'circle'
      ? 'rounded-full'
      : layout.logoShape === 'square'
      ? 'rounded-none'
      : 'app-control';

  const logoIconInnerClass =
    layout.logoSize === 'sm'
      ? 'w-7 h-7 sm:w-8 sm:h-8'
      : layout.logoSize === 'lg'
      ? 'w-12 h-12 sm:w-16 sm:h-16'
      : 'w-10 h-10 sm:w-12 sm:h-12';

  const renderSection = (sectionId: PageSectionId) => {
    if (sectionId === 'hero') {
      const welcomeBlock = (
        <div key="welcome" className="space-y-4">
          <div
            className={
              layout.heroLogoPosition === 'top'
                ? 'flex flex-col items-center justify-center gap-3.5 text-center'
                : layout.heroLogoPosition === 'banner'
                ? 'app-card border border-stone-200 dark:border-white/10 bg-white/70 dark:bg-[#22191C]/80 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6'
                : 'flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5'
            }
          >
            <div
              className={`${logoSizeClass} shrink-0 ${logoShapeClass} overflow-hidden border border-stone-200 dark:border-white/15 bg-white dark:bg-[#261C20] shadow-sm flex items-center justify-center`}
            >
              {state.config.logoDataUrl ? (
                <img
                  src={state.config.logoDataUrl}
                  alt={copy.familyName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[var(--accent)] inline-flex items-center justify-center">
                  <HeroSymbol icon={state.config.heroIcon} className={logoIconInnerClass} filled />
                </span>
              )}
            </div>

            <div
              className={`space-y-1.5 min-w-0 ${
                layout.heroLogoPosition === 'top'
                  ? 'text-center'
                  : 'sm:text-start text-center'
              }`}
            >
              <div
                className={`flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--accent)] ${
                  layout.heroLogoPosition === 'top'
                    ? 'justify-center'
                    : 'justify-center sm:justify-start'
                }`}
              >
                <span>{copy.heroTitle}</span>
                <span aria-hidden="true" className="text-stone-400 dark:text-stone-500">
                  ·
                </span>
                <span className="text-stone-600 dark:text-stone-300">{copy.familyName}</span>
              </div>

              <h1
                data-el="hero-name"
                className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white text-balance leading-tight"
              >
                {activeUser?.fullName}
              </h1>
            </div>
          </div>

          <p
            data-el="hero-sub"
            className="max-w-2xl mx-auto text-base sm:text-lg text-stone-700 dark:text-stone-200 leading-relaxed text-balance"
          >
            {state.lang === 'ar'
              ? `أهلاً ومرحباً بك يا ${activeUser?.fullName} — ${copy.heroSubtitle}`
              : `Welcome, ${activeUser?.fullName} — ${copy.heroSubtitle}`}
          </p>
        </div>
      );

      const journeyBlock =
        (state.config.progressStyle || 'journey') === 'journey' ? (
          <BethlehemJourney
            key="journey"
            completedDaysCount={stats.completedDaysCount}
            totalDays={totalDays}
            percent={stats.percent}
            currentDay={currentDay}
            lentStartDate={state.config.lentStartDate}
            lentEndDate={lentEndDate}
            userStartDate={userStartDate}
            lang={state.lang}
            theme={state.theme}
            christmasTheme={christmasEnabled}
            size={state.config.heroIconSize || 'md'}
            caption={copy.heartProgressCaption}
          />
        ) : (
          <ProgressHeart
            key="journey"
            percent={stats.percent}
            lang={state.lang}
            icon={state.config.heroIcon}
            size={state.config.heroIconSize || 'md'}
            caption={copy.heartProgressCaption}
          />
        );

      return (
        <div key="hero" className="space-y-8">
          <section data-el="hero" className="text-center space-y-5 py-2 sm:py-4">
            {layout.heroArrangement === 'journey-first'
              ? [journeyBlock, welcomeBlock]
              : [welcomeBlock, journeyBlock]}
          </section>
          <PWABanner
            lang={state.lang}
            title={copy.pwaTitle}
            description={copy.pwaDesc}
            installLabel={copy.pwaInstallBtn}
            dismissed={state.pwaBannerDismissed}
            onDismiss={dismissPwaBanner}
          />
        </div>
      );
    }

    if (sectionId === 'progress') {
      return (
        <ProgressAndDayNav
          key="progress"
          lang={state.lang}
          currentDay={currentDay}
          totalDays={totalDays}
          readingPlan={readingPlan}
          completedDays={completedDays}
          planStartDate={userStartDate}
          lentEndDate={lentEndDate}
          stats={stats}
          maxUnlockedDay={maxUnlockedDay}
          sequentialLock={state.config.sequentialLock}
          cardsArrangement={layout.cardsArrangement}
          copy={{
            progressTitle: copy.progressTitle,
            streakTitle: copy.streakTitle,
            streakLabel: copy.streakLabel,
            completedDaysLabel: copy.completedDaysLabel,
          }}
          onSelectDay={setCurrentDay}
          onLockedDayAttempt={handleLockedDayAttempt}
          onJumpToToday={() => {
            const res = jumpToToday();
            if (res.wasCapped) {
              showToast(
                state.lang === 'ar'
                  ? `تم الانتقال إلى اليوم ${formatNumber(res.targetDay, 'ar')} — أنهِهِ أولاً لفتح الأيام التالية`
                  : `Moved to Day ${res.targetDay} — complete it first to unlock later days`
              );
            }
          }}
        />
      );
    }

    if (sectionId === 'gospels') {
      return (
        <GospelReader
          key="gospels"
          lang={state.lang}
          currentDay={currentDay}
          readingPlan={readingPlan}
          maxUnlockedDay={maxUnlockedDay}
          sequentialLock={state.config.sequentialLock}
          isDayCompleted={isDayCompleted}
          passedChapters={passedChapters}
          isChapterUnlocked={isChapterUnlocked}
          fontSize={readerFontSize}
          title={copy.gospelSectionTitle}
          editionLabel={copy.gospelEditionLabel}
          markReadBtn={copy.markReadBtn}
          markReadDoneBtn={copy.markReadDoneBtn}
          encouragementMsg={copy.encouragementMsg}
          onFontSizeChange={setReaderFontSize}
          onPassChapter={(book, ch) => {
            markChapterPassed(book, ch);
            showToast(
              state.lang === 'ar'
                ? 'إجابة صحيحة! تم فتح الأصحاح التالي'
                : 'Correct! Next chapter is unlocked'
            );
          }}
          onToggleDayCompleted={() => {
            const res = toggleDayCompleted(currentDay);
            if (!res.ok && res.missingQuizzes) {
              showToast(
                state.lang === 'ar'
                  ? 'أجب عن أسئلة جميع أصحاحات اليوم أولاً لإتمام القراءة'
                  : 'Answer all of today’s chapter questions first to complete the day'
              );
              return;
            }
            if (!isDayCompleted) {
              showToast(copy.encouragementMsg);
            }
          }}
          onLockedDayAttempt={handleLockedDayAttempt}
          onLockedChapterAttempt={() => handleLockedChapterAttempt()}
          onShareText={handleShareText}
          onReadingStateChange={setIsReadingChapter}
        />
      );
    }

    if (sectionId === 'quotePractices') {
      return (
        <QuoteAndPractices
          key="quotePractices"
          lang={state.lang}
          currentDay={currentDay}
          currentWeek={dayPlan.week}
          cardsArrangement={layout.cardsArrangement}
          quoteSectionTitle={copy.quoteSectionTitle}
          practicesSectionTitle={copy.practicesSectionTitle}
          quote={currentQuote}
          weekPractices={weekPractices}
          checkedPractices={checkedPractices}
          onTogglePractice={togglePractice}
          onShareText={handleShareText}
        />
      );
    }

    if (sectionId === 'competition') {
      return (
        <CompetitionSection
          key="competition"
          lang={state.lang}
          competition={state.config.competition}
          answers={activeUser?.competitionAnswers || {}}
          onAnswerQuestion={answerCompetitionQuestion}
        />
      );
    }

    return null;
  };

  return (
    <>
      <ChristmasAtmosphere enabled={christmasEnabled} theme={state.theme} />

      {!activeUser ? (
        <AuthGate
          lang={state.lang}
          theme={state.theme}
          christmasTheme={christmasEnabled}
          musicPlaying={isMusicPlaying}
          familyName={copy.familyName}
          heroTitle={copy.heroTitle}
          authWelcomeTitle={copy.authWelcomeTitle}
          authWelcomeSubtitle={copy.authWelcomeSubtitle}
          logoDataUrl={state.config.logoDataUrl}
          heroIcon={state.config.heroIcon}
          lentStartDate={state.config.lentStartDate}
          lentEndDate={lentEndDate}
          existingUsers={existingUsersList}
          onToggleLang={toggleLang}
          onToggleTheme={toggleTheme}
          onToggleMusic={() => void toggleMusic()}
          onOpenAdmin={() => setAdminOpen(true)}
          onRegister={registerUser}
          onLogin={loginUser}
        />
      ) : (
        <div className="min-h-screen flex flex-col relative z-10">
          {/* 1. Header & Branding */}
          <Header
            lang={state.lang}
            theme={state.theme}
            christmasTheme={christmasEnabled}
            musicPlaying={isMusicPlaying}
            familyName={copy.familyName}
            userName={activeUser.fullName}
            isServant={activeUser.role === 'servant'}
            logoDataUrl={state.config.logoDataUrl}
            heroIcon={state.config.heroIcon}
            logoShape={layout.logoShape}
            onToggleLang={toggleLang}
            onToggleTheme={toggleTheme}
            onToggleMusic={() => void toggleMusic()}
            onOpenServant={() => setServantOpen(true)}
            onOpenAdmin={() => setAdminOpen(true)}
            onLogout={logoutUser}
          />

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
            {resolvedSectionOrder.map((secId) => renderSection(secId))}
          </main>

          {/* Quiet Editorial Footer */}
          <footer
            data-el="footer"
            className="border-t border-stone-200/80 dark:border-white/10 py-6 mt-8"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span>{copy.familyName}</span>
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                {state.lang === 'ar' ? 'إعدادات المطورين' : 'Developer Settings'}
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Developer Settings Panel (Password 2027) */}
      <AdminPanel
        isOpen={adminOpen}
        lang={state.lang}
        theme={state.theme}
        config={state.config}
        users={allKnownUsers}
        activeUserId={state.activeUserId}
        adminEmail={adminUser?.email || null}
        isAdminVerified={isAdminVerified}
        onGoogleSignIn={signInDeveloperGoogle}
        onGoogleSignOut={signOutDeveloperGoogle}
        onRefreshUsers={refreshCloudUsers}
        onPromoteUser={promoteParticipantRole}
        onClose={() => setAdminOpen(false)}
        onSaveConfig={saveConfig}
        onImportConfig={importConfig}
        onResetDefaults={resetConfigToDefaults}
        onNotify={showToast}
      />

      {/* Servant Panel (Only for participants promoted to 'servant') */}
      {activeUser?.role === 'servant' && (
        <ServantPanel
          isOpen={servantOpen}
          lang={state.lang}
          config={state.config}
          users={allKnownUsers}
          activeUserId={state.activeUserId}
          servantName={activeUser.fullName}
          onRefreshUsers={refreshCloudUsers}
          onClose={() => setServantOpen(false)}
          onSaveServantContent={saveServantContent}
          onNotify={showToast}
        />
      )}

      {/* Cute Roaming Reading Buddy */}
      {activeUser && (
        <ReadingBuddy
          lang={state.lang}
          theme={state.theme}
          christmasTheme={christmasEnabled}
          userName={activeUser.fullName}
          remainingTonightChapters={remainingTonightChapters}
          totalRemainingChapters={totalRemainingChapters}
          completedChapters={stats.completedChapters}
          totalChapters={stats.totalChapters}
          streak={stats.streak}
          percent={stats.percent}
          isReading={isReadingChapter}
          paused={adminOpen || servantOpen}
          onGoToReader={() => {
            document
              .querySelector('[data-el="reader"]')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* Offline Indicator */}
      <OfflineIndicator lang={state.lang} />

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 app-control bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold shadow-xl text-center max-w-[90vw]"
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}
