/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FlawCatalog } from './components/FlawCatalog';
import { IntroLesson } from './components/IntroLesson';
import { GuidedDrills } from './components/GuidedDrills';
import { Flashcards } from './components/Flashcards';

type View = 'intro' | 'catalog' | 'flashcards' | 'drills' | 'journal';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('intro');

  return (
    <div className="h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans flex flex-col p-8 md:p-12 relative overflow-hidden">
      {/* Header Navigation */}
      <header className="flex justify-between items-start z-10 shrink-0 mb-12">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Flaw Bootcamp</p>
          <p className="text-[10px] text-[#1a1a1a]/50 uppercase tracking-[0.3em]">Logical Reasoning</p>
        </div>
        <nav className="flex gap-8 text-[11px] uppercase tracking-widest font-semibold">
          <button 
            onClick={() => setCurrentView('intro')}
            className={`transition-colors hover:text-[#1a1a1a] ${currentView === 'intro' ? 'border-b border-[#1a1a1a] pb-1' : 'text-[#1a1a1a]/40'}`}
          >
            Intro Lesson
          </button>
          <button 
            onClick={() => setCurrentView('catalog')}
            className={`transition-colors hover:text-[#1a1a1a] ${currentView === 'catalog' ? 'border-b border-[#1a1a1a] pb-1' : 'text-[#1a1a1a]/40'}`}
          >
            Famous Flaws
          </button>
          <button 
            onClick={() => setCurrentView('flashcards')}
            className={`transition-colors hover:text-[#1a1a1a] ${currentView === 'flashcards' ? 'border-b border-[#1a1a1a] pb-1' : 'text-[#1a1a1a]/40'}`}
          >
            Flashcards
          </button>
          <button 
            onClick={() => setCurrentView('drills')}
            className={`transition-colors hover:text-[#1a1a1a] ${currentView === 'drills' ? 'border-b border-[#1a1a1a] pb-1' : 'text-[#1a1a1a]/40'}`}
          >
            Guided Drills
          </button>
          <button 
            onClick={() => setCurrentView('journal')}
            className={`transition-colors hover:text-[#1a1a1a] ${currentView === 'journal' ? 'border-b border-[#1a1a1a] pb-1' : 'text-[#1a1a1a]/40'}`}
          >
            Mistake Journal
          </button>
        </nav>
      </header>
      
      <main className="flex-1 overflow-hidden relative border border-black/0 min-h-0">
        {currentView === 'intro' && <IntroLesson onFinish={() => setCurrentView('catalog')} />}
        {currentView === 'catalog' && <FlawCatalog />}
        {currentView === 'flashcards' && <Flashcards />}
        {currentView === 'drills' && <GuidedDrills />}
        {currentView === 'journal' && (
          <div className="flex-1 flex justify-center items-center h-full">
            <p className="font-serif italic text-xl text-[#1a1a1a]/50">Mistake Journal coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}
