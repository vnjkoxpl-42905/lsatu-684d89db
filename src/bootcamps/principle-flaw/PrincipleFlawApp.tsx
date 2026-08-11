/**
 * Principle & Flaw bootcamp — self-contained sub-app.
 *
 * Ported from the standalone "principle-flaw" bundle. Differences vs. the
 * original src/App.tsx in that bundle:
 *   - No WelcomeScreen — userName is supplied by the LSAT U auth session.
 *   - No StrictMode root, no full-screen fixed background (ElegantShape moved
 *     to absolute inside the bootcamp container so it doesn't bleed into the
 *     rest of the app).
 *   - The bootcamp keeps its own mobile bottom sub-nav (lg:hidden) for tab
 *     switching; the host page layers the global Return-to-Mainhub header above
 *     it. (The original standalone bundle's app-level mobile chrome was dropped
 *     in favor of LSAT U's.)
 *   - All localStorage keys are namespaced under `pf:` (see lib/streak,
 *     components/*, etc.).
 */

import React, { useState, useEffect, Suspense } from 'react';
import { safeLazy } from '@/lib/safeLazy';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, CheckSquare, FileText, LayoutDashboard, User, Target, Zap, Flame } from 'lucide-react';
import './principle-flaw.css';
import TodayView from './components/TodayView';
import CommandPalette from './components/CommandPalette';
import { StudyResource } from './data';
import { ElegantShape } from './components/ui/shape-landing-hero';
import { computeStreak, readStreakDates } from './lib/streak';
import { mirroredSetItem, mirroredRemoveItem } from '@/lib/cloudMirror';
import { setBootcampContext } from '@/lib/helpContextBus';

const Overview = safeLazy(() => import('./components/Overview'));
const Schedule = safeLazy(() => import('./components/Schedule'));
const Learn = safeLazy(() => import('./components/Learn'));
const Practice = safeLazy(() => import('./components/Practice'));
const ReviewLog = safeLazy(() => import('./components/ReviewLog'));
const Profile = safeLazy(() => import('./components/Profile'));
const FlashcardsView = safeLazy(() => import('./components/Flashcards'));

function ViewFallback() {
  return (
    <div className="py-24 flex justify-center" role="status" aria-live="polite">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Loading…</span>
    </div>
  );
}

export type Tab = 'start' | 'today' | 'schedule' | 'learn' | 'practice' | 'flashcards' | 'review' | 'profile';

interface Props {
  userName: string;
}

export default function PrincipleFlawApp({ userName: incomingName }: Props) {
  const [userName, setUserName] = useState(incomingName);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [currentDay, setCurrentDay] = useState(1);

  useEffect(() => {
    const savedDay = localStorage.getItem('pf:currentDay');
    if (savedDay) {
      const parsed = parseInt(savedDay, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 14) setCurrentDay(parsed);
    }
  }, []);

  useEffect(() => { setUserName(incomingName); }, [incomingName]);

  // Item A (Wave 6A) — publish bootcamp context so the Help sheet can
  // attach "you're on day N of Principle Flaw" without coupling.
  useEffect(() => {
    setBootcampContext({ id: 'principle-flaw', day: currentDay });
    return () => setBootcampContext(null);
  }, [currentDay]);

  const handleSaveName = (name: string) => {
    mirroredSetItem('pf:studentName', name);
    setUserName(name);
  };

  const handleSetDay = (day: number) => {
    setCurrentDay(day);
    mirroredSetItem('pf:currentDay', day.toString());
  };

  const setTabAndScroll = (tab: Tab) => {
    setActiveTab(tab);
    const main = document.getElementById('pf-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startToday = () => setTabAndScroll('today');

  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const refresh = () => setStreak(computeStreak(readStreakDates()));
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === 'pf:streakDates') refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pf-streak-updated', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pf-streak-updated', refresh);
    };
  }, []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onPrefill = () => setTabAndScroll('review');
    window.addEventListener('pf-prefill-review', onPrefill);
    return () => window.removeEventListener('pf-prefill-review', onPrefill);
  }, []);

  const [learnSubTab, setLearnSubTab] = useState<'flaw' | 'principle'>('flaw');
  const [learnTargetSection, setLearnTargetSection] = useState<string | null>(null);

  const navigateToResource = (resource: Partial<StudyResource>) => {
    const category = resource.category ?? '';
    const id = resource.id ?? resource.title;
    if (category.includes('Homework') || category.includes('Practice')) {
      setTabAndScroll('practice');
    } else if (category.includes('Flaw')) {
      setLearnSubTab('flaw');
      setLearnTargetSection(resource.id === 'flaw-notes-strategy' ? 'flaw-styles' : 'flaw-intro');
      setTabAndScroll('learn');
    } else if (category.includes('Principle')) {
      setLearnSubTab('principle');
      setLearnTargetSection('principle-intro');
      setTabAndScroll('learn');
    } else if (id === 'Review Log') {
      setTabAndScroll('review');
    } else if (id === 'Schedule') {
      setTabAndScroll('schedule');
    }
    setTimeout(() => setLearnTargetSection(null), 100);
  };

  const handleReset = () => {
    [
      'pf:studentName','pf:currentDay','pf:reviewLogs','pf:completedDays',
      'pf:dailyChecklists','pf:streakDates','pf:flashcardSRS','pf:flashcardMastery',
      'pf:questionStatus','pf:redoQueue',
    ].forEach((k) => mirroredRemoveItem(k));
    setCurrentDay(1);
    setStreak(0);
    setTabAndScroll('today');
  };

  return (
    <div
      className="pf-bootcamp relative font-sans selection:bg-emerald-900 selection:text-white overflow-hidden"
      style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}
    >
      {/* Scoped background decoration (absolute, not fixed — stays inside the bootcamp) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />
        <ElegantShape delay={1} width={400} height={80} rotate={-15} gradient="from-indigo-500/[0.1]" className="left-[-5%] top-[10%]" />
        <ElegantShape delay={1.5} width={300} height={60} rotate={10} gradient="from-emerald-500/[0.1]" className="right-[-5%] bottom-[15%]" />
      </div>

      <div className="flex relative z-10 min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside
          className="w-64 border-r flex-shrink-0 lg:flex flex-col hidden"
          style={{ background: 'var(--pf-nav-bg)', borderColor: 'var(--pf-nav-border)' }}
        >
          <div className="h-20 flex flex-col justify-center px-6 border-b" style={{ borderColor: 'var(--pf-nav-border)' }}>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Principle & Flaw</span>
            <h1 className="text-sm font-serif italic text-zinc-200 tracking-tight">{userName}</h1>
          </div>
          {streak > 0 && (
            <div className="px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--pf-nav-border)' }}>
              <Flame size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">{streak} day streak</span>
            </div>
          )}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="pb-3 px-3"><span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Plan</span></div>
            <NavItem icon={<LayoutDashboard size={16} />} label="Start Here" active={activeTab === 'start'} onClick={() => setTabAndScroll('start')} />
            <NavItem icon={<CheckSquare size={16} />} label="Today" active={activeTab === 'today'} onClick={() => setTabAndScroll('today')} />
            <NavItem icon={<Calendar size={16} />} label="Schedule" active={activeTab === 'schedule'} onClick={() => setTabAndScroll('schedule')} />

            <div className="pt-8 pb-3 px-3"><span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Training</span></div>
            <NavItem icon={<FileText size={16} />} label="Learn" active={activeTab === 'learn'} onClick={() => setTabAndScroll('learn')} />
            <NavItem icon={<Zap size={16} />} label="Flashcards" active={activeTab === 'flashcards'} onClick={() => setTabAndScroll('flashcards')} />
            <NavItem icon={<Target size={16} />} label="Practice" active={activeTab === 'practice'} onClick={() => setTabAndScroll('practice')} />
            <NavItem icon={<BookOpen size={16} />} label="Review Log" active={activeTab === 'review'} onClick={() => setTabAndScroll('review')} />
          </nav>

          <div className="p-4 border-t space-y-1" style={{ borderColor: 'var(--pf-nav-border)' }}>
            <button
              onClick={() => setTabAndScroll('profile')}
              className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-lg transition-colors duration-150 active:scale-[0.97] transition-transform ${activeTab === 'profile' ? 'font-semibold' : ''}`}
              style={activeTab === 'profile'
                ? { background: 'var(--pf-nav-active-bg)', color: 'var(--pf-nav-active-text)' }
                : { color: 'var(--pf-text-faint)' }
              }
            >
              <User size={16} /><span>Profile</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main id="pf-main" className="flex-1 bg-transparent print:bg-white print:text-black">
          {/* Mobile sub-header (lives inside the bootcamp) */}
          <div
            className="lg:hidden h-14 border-b backdrop-blur-lg flex items-center justify-between px-4 sticky top-0 z-30 print:hidden"
            style={{ background: 'color-mix(in srgb, var(--pf-nav-bg) 85%, transparent)', borderColor: 'var(--pf-nav-border)' }}
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Principle & Flaw</span>
              <h1 className="text-xs font-serif italic text-zinc-100 tracking-tight">{userName}</h1>
            </div>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                <Flame size={12} /> {streak}d
              </span>
            )}
          </div>

          <div className="p-6 sm:p-10 md:p-16 pb-32 lg:pb-16 max-w-6xl mx-auto print:max-w-none print:p-0 relative">
            <Suspense fallback={<ViewFallback />}>
              {activeTab === 'start' && <Overview userName={userName} onStart={startToday} />}
              {activeTab === 'today' && <TodayView userName={userName} day={currentDay} setDay={handleSetDay} onOpenResource={navigateToResource} onJumpToTab={setTabAndScroll} />}
              {activeTab === 'schedule' && <Schedule currentDay={currentDay} setDay={handleSetDay} />}
              {activeTab === 'learn' && <Learn initialTab={learnSubTab} targetSection={learnTargetSection} />}
              {activeTab === 'practice' && <Practice currentDay={currentDay} onOpenResource={navigateToResource} />}
              {activeTab === 'flashcards' && <FlashcardsView />}
              {activeTab === 'review' && <ReviewLog />}
              {activeTab === 'profile' && <Profile currentName={userName} onUpdateName={handleSaveName} onReset={handleReset} />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile sub-nav for the bootcamp */}
      <nav
        className="lg:hidden sticky bottom-0 border-t backdrop-blur-md print:hidden z-40"
        style={{ background: 'color-mix(in srgb, var(--pf-nav-bg) 95%, transparent)', borderColor: 'var(--pf-nav-border)' }}
      >
        <ul className="grid grid-cols-4 sm:grid-cols-8">
          {[
            { tab: 'start' as Tab, label: 'Start', icon: <LayoutDashboard size={18} /> },
            { tab: 'today' as Tab, label: 'Today', icon: <CheckSquare size={18} /> },
            { tab: 'schedule' as Tab, label: 'Plan', icon: <Calendar size={18} /> },
            { tab: 'learn' as Tab, label: 'Learn', icon: <FileText size={18} /> },
            { tab: 'flashcards' as Tab, label: 'Cards', icon: <Zap size={18} /> },
            { tab: 'practice' as Tab, label: 'Practice', icon: <Target size={18} /> },
            { tab: 'review' as Tab, label: 'Review', icon: <BookOpen size={18} /> },
            { tab: 'profile' as Tab, label: 'Profile', icon: <User size={18} /> },
          ].map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <li key={item.tab}>
                <button onClick={() => setTabAndScroll(item.tab)}
                  className={`relative w-full h-16 flex flex-col items-center justify-center gap-1 transition-colors duration-150 active:scale-[0.94] transition-transform ${isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'}`}
                  aria-label={item.label} aria-current={isActive ? 'page' : undefined}>
                  {item.icon}
                  <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="pfMobileNavIndicator"
                      className="absolute top-0 inset-x-6 h-0.5 bg-emerald-400 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={setTabAndScroll} />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 w-full min-h-[40px] px-3 py-2 text-sm rounded-lg active:scale-[0.97] transition-transform duration-100 overflow-hidden ${
        active ? 'font-semibold' : 'text-zinc-500 hover:text-zinc-200'
      }`}
      style={active ? { color: 'var(--pf-nav-active-text)' } : undefined}
    >
      {active && (
        <motion.div
          layoutId="pfSidebarIndicator"
          className="absolute inset-0 rounded-lg shadow-lg"
          style={{ background: 'var(--pf-nav-active-bg)' }}
          transition={{ type: 'spring', bounce: 0.12, duration: 0.4 }}
        />
      )}
      {!active && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-150"
          style={{ background: 'var(--pf-nav-hover-bg)' }}
          aria-hidden="true"
        />
      )}
      <span
        className="relative z-10"
        style={{ color: active ? 'var(--pf-nav-active-text)' : 'var(--pf-text-dim)' }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="relative z-10 truncate">{label}</span>
    </button>
  );
}
