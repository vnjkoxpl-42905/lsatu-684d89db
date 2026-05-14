import React, { useState } from 'react';
import { METHOD_PATTERNS, QUESTION_STEMS } from '../../data/mockData';
import { BookOpen, Search, Info, Terminal, ChevronRight, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

type TabType = 'patterns' | 'stems';

export const MethodsLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('patterns');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(METHOD_PATTERNS[0].id);

  const filteredPatterns = METHOD_PATTERNS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.plainEnglish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStems = QUESTION_STEMS.filter(s => 
    s.stem.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPattern = METHOD_PATTERNS.find(p => p.id === selectedId);
  const selectedStem = QUESTION_STEMS.find(s => s.id === selectedId);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm('');
    if (tab === 'patterns') {
      setSelectedId(METHOD_PATTERNS[0].id);
    } else {
      setSelectedId(QUESTION_STEMS[0].id);
    }
  };

  return (
    <div id="methods-library-view" className="flex h-full overflow-hidden bg-white">
      {/* Sidebar - list of patterns */}
      <div className="w-104 border-r-4 border-brutal-ink flex flex-col bg-white">
        <div className="p-8 border-b-4 border-brutal-ink bg-brutal-cyan/10">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-6 h-6 text-brutal-ink" />
            <h2 className="text-3xl font-black uppercase tracking-tighter text-brutal-ink">Methods Library</h2>
          </div>

          <div className="flex bg-white border-4 border-brutal-ink p-1 mb-8 brutal-shadow-sm">
            <button 
              onClick={() => handleTabChange('patterns')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'patterns' ? "bg-brutal-ink text-white" : "text-brutal-ink/40 hover:bg-brutal-ink/5"
              )}
            >
              PATTERNS
            </button>
            <button 
              onClick={() => handleTabChange('stems')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'stems' ? "bg-brutal-ink text-white" : "text-brutal-ink/40 hover:bg-brutal-ink/5"
              )}
            >
              STEMS
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brutal-ink/30" />
            <input 
              type="text"
              placeholder={activeTab === 'patterns' ? "SEARCH PATTERNS..." : "SEARCH STEMS..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-4 border-brutal-ink py-4 pl-12 pr-6 text-md font-black text-brutal-ink uppercase placeholder:text-brutal-ink/20 focus:outline-none brutal-shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === 'patterns' ? (
            filteredPatterns.map(pattern => (
              <button
                key={pattern.id}
                onClick={() => setSelectedId(pattern.id)}
                className={cn(
                  "w-full text-left p-6 border-4 transition-all duration-100 group relative",
                  selectedId === pattern.id 
                    ? "bg-brutal-yellow border-brutal-ink brutal-shadow-sm translate-x-[2px] translate-y-[2px]" 
                    : "bg-white border-brutal-ink text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000]"
                )}
              >
                <div className="font-black text-lg uppercase tracking-tighter leading-none mb-2">{pattern.name}</div>
                <div className="text-xs font-bold opacity-60 truncate uppercase tracking-tight">{pattern.plainEnglish}</div>
              </button>
            ))
          ) : (
            filteredStems.map(stem => (
              <button
                key={stem.id}
                onClick={() => setSelectedId(stem.id)}
                className={cn(
                  "w-full text-left p-6 border-4 transition-all duration-100 group relative",
                  selectedId === stem.id 
                    ? "bg-brutal-pink border-brutal-ink brutal-shadow-sm translate-x-[2px] translate-y-[2px]" 
                    : "bg-white border-brutal-ink text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000]"
                )}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase bg-brutal-ink text-white px-2 py-0.5 w-fit">{stem.category}</span>
                  <div className="font-black text-lg uppercase tracking-tighter leading-none">{stem.stem}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-16 bg-white custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'patterns' && selectedPattern ? (
            <motion.div
              key={selectedPattern.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-4 mb-10">
                <span className="px-3 py-1 bg-brutal-ink text-white text-[10px] font-black uppercase tracking-widest rotate-[-2deg]">Method Pattern</span>
                <div className="h-1 flex-1 bg-brutal-ink/10" />
              </div>

              <h1 className="text-7xl font-black tracking-tighter text-brutal-ink mb-16 leading-none uppercase italic border-l-[12px] border-brutal-cyan pl-10">
                {selectedPattern.name}
              </h1>

              <div className="space-y-20">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-brutal-green p-2 border-2 border-brutal-ink brutal-shadow-sm">
                      <Info className="w-6 h-6 text-brutal-ink" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink opacity-40">Plain English Translation</h3>
                  </div>
                  <p className="text-4xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic bg-brutal-green/10 p-10 border-4 border-brutal-ink brutal-shadow">
                    {selectedPattern.plainEnglish}
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-brutal-ink p-2 border-2 border-brutal-ink brutal-shadow-sm">
                      <Terminal className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink opacity-40">Answer Choice Language</h3>
                  </div>
                  <div className="bg-white border-4 border-brutal-ink p-10 brutal-shadow-lg relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brutal-yellow border-l-4 border-b-4 border-brutal-ink flex items-center justify-center font-black italic">!</div>
                    <p className="text-2xl font-black text-brutal-ink italic leading-tight uppercase tracking-tighter border-l-8 border-brutal-ink pl-8">
                      "{selectedPattern.answerChoiceLanguage}"
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <section>
                    <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-6 bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">Must Happen in Stimulus</h4>
                    <div className="p-8 border-4 border-brutal-ink brutal-shadow-sm bg-white">
                      <p className="text-lg text-brutal-ink font-bold leading-tight uppercase italic">
                        {selectedPattern.mustHappen}
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-6 bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">Concrete Mock Example</h4>
                    <div className="p-8 border-4 border-brutal-ink brutal-shadow bg-white relative">
                      <div className="text-md italic text-brutal-ink font-bold mb-6 leading-tight uppercase">
                        "{selectedPattern.example.stimulus}"
                      </div>
                      <div className="pt-6 border-t-2 border-brutal-ink flex items-start gap-4">
                        <div className="mt-1 bg-brutal-green p-1 border border-brutal-ink">
                          <ChevronRight className="w-3 h-3 text-brutal-ink" />
                        </div>
                        <p className="text-sm text-brutal-ink font-black uppercase tracking-tight">
                          {selectedPattern.example.explanation}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-24 pt-16 border-t-4 border-brutal-ink">
                <div className="flex gap-6">
                  <button className="flex-1 px-10 py-6 bg-white border-4 border-brutal-ink text-brutal-ink font-black uppercase tracking-widest hover:bg-brutal-ink hover:text-white transition-all text-sm brutal-shadow">
                    Mark as Understood
                  </button>
                  <button className="flex-1 px-10 py-6 bg-brutal-cyan text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-widest hover:bg-brutal-cyan/80 transition-all text-sm brutal-shadow">
                    Try Practice Drills
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'stems' && selectedStem ? (
            <motion.div
              key={selectedStem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-4 mb-10">
                <span className="px-3 py-1 bg-brutal-ink text-white text-[10px] font-black uppercase tracking-widest rotate-[-1deg]">{selectedStem.category} Stem</span>
                <div className="h-1 flex-1 bg-brutal-ink/10" />
              </div>

              <h1 className="text-6xl font-black tracking-tighter text-brutal-ink mb-20 leading-none uppercase italic border-l-[12px] border-brutal-pink pl-10">
                {selectedStem.stem}
              </h1>

              <section className="space-y-10">
                <div className="flex items-center gap-3">
                  <div className="bg-brutal-yellow p-2 border-2 border-brutal-ink brutal-shadow-sm">
                    <HelpCircle className="w-6 h-6 text-brutal-ink" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink opacity-40">LSAT Interpretation</h3>
                </div>
                <div className="p-12 border-4 border-brutal-ink bg-white brutal-shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-brutal-cyan border-l-4 border-b-4 border-brutal-ink flex items-center justify-center font-black text-xl italic group-hover:bg-brutal-cyan/80 transition-colors">!</div>
                  <p className="text-4xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic">
                    {selectedStem.explanation}
                  </p>
                </div>
              </section>

              <div className="mt-28 pt-16 border-t-4 border-brutal-ink">
                <div className="bg-brutal-yellow/10 p-10 border-4 border-brutal-ink brutal-shadow">
                  <h4 className="text-xs font-black text-brutal-ink uppercase tracking-[0.2em] mb-6 inline-block bg-brutal-yellow px-3 py-1 border-2 border-brutal-ink">Official Coach Note</h4>
                  <p className="text-xl font-bold text-brutal-ink leading-tight uppercase tracking-tight italic">
                    When you see this stem, your priority is to identify the {selectedStem.category.toLowerCase()} of the argument. 
                    Do not let the "distractor" claims pull you away from the core structure.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="w-12 h-12 text-white/10 mb-4" />
              <h3 className="text-lg font-bold text-white/40">No matches found</h3>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
