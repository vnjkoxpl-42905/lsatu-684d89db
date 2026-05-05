/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, CheckSquare, FileText, LayoutDashboard, Printer, User, Target, Zap, Flame } from 'lucide-react';
import TodayView from './components/TodayView';
import WelcomeScreen from './components/WelcomeScreen';
import CommandPalette from './components/CommandPalette';
import { StudyResource } from './data';
import { ElegantShape } from './components/ui/shape-landing-hero';
import { computeStreak, readStreakDates } from './lib/streak';

const Overview = lazy(() => import('./components/Overview'));
const Schedule = lazy(() => import('./components/Schedule'));
const Learn = lazy(() => import('./components/Learn'));
const Practice = lazy(() => import('./components/Practice'));
const ReviewLog = lazy(() => import('./components/ReviewLog'));
const Profile = lazy(() => import('./components/Profile'));
const FlashcardsView = lazy(() => import('./components/Flashcards'));

function ViewFallback() {
  return (
    <div className="py-24 flex justify-center" role="status" aria-live="polite">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Loading…</span>
    </div>
  );
}

export type Tab = 'start' | 'today' | 'schedule' | 'learn' | 'practice' | 'flashcards' | 'review' | 'profile';

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [currentDay, setCurrentDay] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('lsatStudentName');
    if (savedName) {
      setUserName(savedName);
    }
    const savedDay = localStorage.getItem('lsatCurrentDay');
    if (savedDay) {
      const parsedDay = parseInt(savedDay, 10);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 14) {
        setCurrentDay(parsedDay);
      }
    }
    setIsLoaded(true);
  }, []);

  const handleSaveName = (name: string) => {
    localStorage.setItem('lsatStudentName', name);
    setUserName(name);
  };

  const handleSetDay = (day: number) => {
    setCurrentDay(day);
    localStorage.setItem('lsatCurrentDay', day.toString());
  };

  const setTabAndScroll = (tab: Tab) => {
    setActiveTab(tab);
    const main = document.getElementById('app-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startToday = () => setTabAndScroll('today');

  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const refresh = () => setStreak(computeStreak(readStreakDates()));
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lsatStreakDates') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('lsat-streak-updated', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lsat-streak-updated', refresh);
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

  // Practice → ReviewLog handoff: jump to review tab when a Log to Review Log button fires.
  useEffect(() => {
    const onPrefill = () => setTabAndScroll('review');
    window.addEventListener('lsat-prefill-review', onPrefill);
    return () => window.removeEventListener('lsat-prefill-review', onPrefill);
  }, []);

  const [learnSubTab, setLearnSubTab] = useState<'flaw' | 'principle'>('flaw');
  const [learnTargetSection, setLearnTargetSection] = useState<string | null>(null);

  const navigateToResource = (resource: Partial<StudyResource>) => {
    if (resource.category?.includes('Flaw')) {
      setLearnSubTab('flaw');
      setLearnTargetSection(resource.id === 'flaw-notes-strategy' ? 'flaw-styles' : 'flaw-intro');
      setTabAndScroll('learn');
    } else if (resource.category?.includes('Principle')) {
      setLearnSubTab('principle');
      setLearnTargetSection('principle-intro');
      setTabAndScroll('learn');
    } else if (resource.category?.includes('Homework')) {
      setTabAndScroll('practice');
    } else if (resource.id === 'Review Log') {
      setTabAndScroll('review');
    } else if (resource.id === 'Schedule') {
      setTabAndScroll('schedule');
    }
    
    // Clear section after small delay to allow effect to run
    setTimeout(() => {
      setLearnTargetSection(null);
    }, 100);
  };

  const handleReset = () => {
    localStorage.removeItem('lsatStudentName');
    localStorage.removeItem('lsatCurrentDay');
    localStorage.removeItem('lsatReviewLogs');
    localStorage.removeItem('lsatCompletedDays');
    localStorage.removeItem('lsatDailyChecklists');
    localStorage.removeItem('lsatStreakDates');
    localStorage.removeItem('lsatFlashcardSRS');
    localStorage.removeItem('lsatFlashcardMastery');
    localStorage.removeItem('lsatQuestionStatus');
    localStorage.removeItem('lsatRedoQueue');
    setUserName(null);
    setCurrentDay(1);
    setStreak(0);
    setTabAndScroll('today');
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#030303]"></div>;

  if (!userName) {
    return <WelcomeScreen onSaveName={handleSaveName} />;
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-300 font-sans selection:bg-emerald-900 selection:text-white overflow-hidden relative">
      {/* Global Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03] blur-3xl" />
        <ElegantShape
          delay={1}
          width={400}
          height={80}
          rotate={-15}
          gradient="from-indigo-500/[0.1]"
          className="left-[-5%] top-[10%]"
        />
        <ElegantShape
          delay={1.5}
          width={300}
          height={60}
          rotate={10}
          gradient="from-emerald-500/[0.1]"
          className="right-[-5%] bottom-[15%]"
        />
      </div>

      <div className="flex h-screen relative z-10 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-900 bg-[#030303]/95 flex-shrink-0 lg:flex flex-col hidden">
          <div className="h-20 flex flex-col justify-center px-6 border-b border-zinc-900/50">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">LSAT Mastery</span>
            <h1 className="text-sm font-serif italic text-zinc-200 tracking-tight">{userName}</h1>
          </div>
          {streak > 0 && (
            <div className="px-6 py-3 border-b border-zinc-900/50 flex items-center gap-2">
              <Flame size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">{streak} day streak</span>
            </div>
          )}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className="pb-3 px-3">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Plan</span>
            </div>
            <NavItem icon={<LayoutDashboard size={16} />} label="Start Here" active={activeTab === 'start'} onClick={() => setTabAndScroll('start')} />
            <NavItem icon={<CheckSquare size={16} />} label="Today" active={activeTab === 'today'} onClick={() => setTabAndScroll('today')} />
            <NavItem icon={<Calendar size={16} />} label="Schedule" active={activeTab === 'schedule'} onClick={() => setTabAndScroll('schedule')} />
            
            <div className="pt-8 pb-3 px-3">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Training</span>
            </div>
            <NavItem icon={<FileText size={16} />} label="Learn" active={activeTab === 'learn'} onClick={() => setTabAndScroll('learn')} />
            <NavItem icon={<Zap size={16} />} label="Flashcards" active={activeTab === 'flashcards'} onClick={() => setTabAndScroll('flashcards')} />
            <NavItem icon={<Target size={16} />} label="Practice" active={activeTab === 'practice'} onClick={() => setTabAndScroll('practice')} />
            <NavItem icon={<BookOpen size={16} />} label="Review Log" active={activeTab === 'review'} onClick={() => setTabAndScroll('review')} />
          </nav>

          <div className="p-4 border-t border-zinc-900/50 space-y-1">
            <button
              onClick={() => setTabAndScroll('profile')}
              className={`flex items-center gap-3 w-full px-3 py-2 text-xs rounded-lg transition-all duration-300 ${
                activeTab === 'profile' 
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-lg shadow-white/5' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg transition-all"
            >
              <Printer size={16} aria-hidden="true" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main id="app-main" className="flex-1 h-screen overflow-y-auto bg-transparent print:bg-white print:text-black custom-scrollbar">
          {/* Mobile Header */}
          <div className="lg:hidden h-16 border-b border-zinc-900 bg-[#030303]/85 backdrop-blur-lg flex items-center justify-between px-6 sticky top-0 z-50 print:hidden">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">LSAT Mastery</span>
              <h1 className="text-sm font-serif italic text-zinc-100 tracking-tight">{userName}</h1>
            </div>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  <Flame size={12} /> {streak}d
                </span>
              )}
              <button
                onClick={() => setTabAndScroll('profile')}
                aria-label="Profile"
                className={`p-1.5 rounded-lg border transition-colors ${activeTab === 'profile' ? 'border-emerald-500/50 text-emerald-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}
              >
                <User size={14} />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-10 md:p-16 pb-24 lg:pb-16 max-w-6xl mx-auto print:max-w-none print:p-0 relative">
            <Suspense fallback={<ViewFallback />}>
              {activeTab === 'start' && <Overview userName={userName} onStart={startToday} />}
              {activeTab === 'today' && <TodayView userName={userName} day={currentDay} setDay={handleSetDay} onOpenResource={navigateToResource} onJumpToTab={setTabAndScroll} />}
              {activeTab === 'schedule' && <Schedule currentDay={currentDay} setDay={handleSetDay} />}
              {activeTab === 'learn' && (
                <Learn
                  initialTab={learnSubTab}
                  targetSection={learnTargetSection}
                />
              )}
              {activeTab === 'practice' && <Practice currentDay={currentDay} onOpenResource={navigateToResource} />}
              {activeTab === 'flashcards' && <FlashcardsView />}
              {activeTab === 'review' && <ReviewLog />}
              {activeTab === 'profile' && <Profile currentName={userName} onUpdateName={handleSaveName} onReset={handleReset} />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-[#030303]/95 backdrop-blur-md print:hidden">
        <ul className="flex items-stretch">
          {[
            { tab: 'today' as Tab, label: 'Today', icon: <CheckSquare size={18} /> },
            { tab: 'learn' as Tab, label: 'Learn', icon: <FileText size={18} /> },
            { tab: 'flashcards' as Tab, label: 'Cards', icon: <Zap size={18} /> },
            { tab: 'practice' as Tab, label: 'Practice', icon: <Target size={18} /> },
            { tab: 'review' as Tab, label: 'Review', icon: <BookOpen size={18} /> },
          ].map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <li key={item.tab} className="flex-1">
                <button
                  onClick={() => setTabAndScroll(item.tab)}
                  className={`relative w-full h-16 flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavIndicator"
                      className="absolute top-0 inset-x-6 h-0.5 bg-emerald-400 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setTabAndScroll}
      />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 w-full min-h-[40px] px-3 py-2 text-sm rounded-lg transition-colors ${
        active
          ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-lg shadow-white/5'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
      }`}
    >
      <span className={active ? 'text-zinc-950' : 'text-zinc-600'} aria-hidden="true">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
