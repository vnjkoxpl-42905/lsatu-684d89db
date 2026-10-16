/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ACTIVE IMPLEMENTATION of the Flaw & Famous Flaws bootcamp (route
// /bootcamp/fallacy-flaw, mounted via src/pages/FallacyFlawBootcamp.tsx).

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home } from './components/Home';
import { FlawCatalog } from './components/FlawCatalog';
import { IntroLesson } from './components/IntroLesson';
import { GuidedDrills } from './components/GuidedDrills';
import { Flashcards } from './components/Flashcards';
import { MistakeJournal } from './components/MistakeJournal';

type View = 'home' | 'intro' | 'catalog' | 'flashcards' | 'drills' | 'journal';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('fallacyFlaw:v2:view') as View | null;
    return saved && ['home', 'intro', 'catalog', 'flashcards', 'drills', 'journal'].includes(saved) ? saved : 'home';
  });
  const [selectedDrillId, setSelectedDrillId] = useState<string | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('fallacyFlaw:v2:view', currentView);
  }, [currentView]);

  const handleGoToDrills = (drillId?: string) => {
    setSelectedDrillId(drillId);
    setCurrentView('drills');
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#f5f2ed] text-[#1a1a1a] font-sans flex flex-col p-6 md:p-12 relative overflow-hidden">
      {/* Header Navigation */}
      <header className="flex justify-between items-start z-10 shrink-0 mb-12">
        <div 
          className="space-y-1 cursor-pointer"
          onClick={() => setCurrentView('home')}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Fallacy Bootcamp</p>
          <p className="text-[10px] text-[#1a1a1a]/50 uppercase tracking-[0.3em]">Logical Reasoning</p>
        </div>
        <nav className="flex gap-8 text-[11px] uppercase tracking-widest font-bold flex-wrap justify-end relative">
          {[
            { id: 'home', label: 'Dashboard' },
            { id: 'intro', label: 'Intro Lesson' },
            { id: 'catalog', label: 'Famous Flaws' },
            { id: 'flashcards', label: 'Flashcards' },
            { id: 'drills', label: 'Guided Drills' },
            { id: 'journal', label: 'Mistake Journal' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => item.id === 'drills' ? handleGoToDrills() : setCurrentView(item.id as View)}
              className={`relative transition-all duration-300 py-1 group ${
                currentView === item.id 
                  ? 'text-[#1a1a1a]' 
                  : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70'
              }`}
            >
              <span className="relative z-10">{item.label}</span>
              {currentView === item.id && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#1a1a1a] rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className={`absolute -bottom-1 left-0 right-0 h-[2px] bg-[#1a1a1a]/10 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${currentView === item.id ? 'hidden' : ''}`} />
            </button>
          ))}
        </nav>
      </header>
      
      <main className="flex-1 overflow-hidden relative border border-black/0 min-h-0">
        {currentView === 'home' && <Home onStartLesson={() => setCurrentView('intro')} onGoToDrills={handleGoToDrills} />}
        {currentView === 'intro' && <IntroLesson onFinish={() => setCurrentView('catalog')} />}
        {currentView === 'catalog' && <FlawCatalog />}
        {currentView === 'flashcards' && <Flashcards />}
        {currentView === 'drills' && <GuidedDrills initialDrillId={selectedDrillId} onClearInitialDrill={() => setSelectedDrillId(undefined)} />}
        {currentView === 'journal' && <MistakeJournal />}
      </main>
    </div>
  );
}
