import React, { useState } from 'react';
import { FLAW_CATALOG, FlawCard as FlawCardType } from '../data/flaws';

export function FlawCatalog() {
  const [selectedFlawId, setSelectedFlawId] = useState<string | null>(null);

  const groups = ['Group 1', 'Group 2', 'Practical LSAT Tricks'];

  const selectedFlaw = selectedFlawId 
    ? FLAW_CATALOG.find(f => f.id === selectedFlawId) 
    : null;

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-12 h-full overflow-hidden">
      {/* Left Navigation / List */}
      <div className="w-full md:w-1/3 flex flex-col gap-8 h-full overflow-y-auto pr-4 pb-12 custom-scrollbar">
        <div>
          <h2 className="text-4xl font-serif tracking-tighter italic mb-8">Famous Flaws</h2>
          
          <div className="space-y-12">
            {groups.map(group => (
              <div key={group}>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#1a1a1a]/50 font-bold mb-4">
                  {group}
                </h3>
                <div className="flex flex-col gap-2">
                  {FLAW_CATALOG.filter(f => f.group === group).map(flaw => (
                    <button
                      key={flaw.id}
                      onClick={() => setSelectedFlawId(flaw.id)}
                      className={`text-left text-lg font-serif transition-colors py-1 border-b border-[#1a1a1a]/10 hover:border-[#1a1a1a]/50 ${
                        selectedFlawId === flaw.id ? 'text-[#1a1a1a] font-medium italic' : 'text-[#1a1a1a]/60'
                      }`}
                    >
                      {flaw.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Detail View (Keycard) */}
      <div className="w-full md:w-2/3 h-full overflow-y-auto pb-12 relative flex">
        {selectedFlaw ? (
          <div className="bg-white border border-[#1a1a1a]/10 p-8 md:p-12 shadow-sm w-full max-w-3xl flex flex-col gap-8">
            <div className="border-b border-[#1a1a1a]/10 pb-6">
              <div className="flex justify-between items-start mb-4">
                 <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/50">{selectedFlaw.group}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif tracking-tighter italic">{selectedFlaw.name}</h1>
            </div>

            <div className="space-y-8 text-sm md:text-base text-[#1a1a1a]/80 font-light leading-relaxed">
              
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a] mb-2">Definition</h4>
                <p className="text-lg text-[#1a1a1a]">{selectedFlaw.definition}</p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <section>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a] mb-2">What They're Doing Wrong</h4>
                  <p>{selectedFlaw.doingWrong}</p>
                </section>

                <section className="bg-[#1a1a1a] text-[#f5f2ed] p-6 -mx-6 md:mx-0">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 mb-2">The Counter-Question</h4>
                  <p className="font-serif text-lg italic tracking-tight">{selectedFlaw.counterQuestion}</p>
                </section>
              </div>

              <section className="bg-[#1a1a1a]/5 p-6 border-l-2 border-[#1a1a1a]">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 mb-2">Tiny Example</h4>
                <p className="font-serif">"{selectedFlaw.tinyExample}"</p>
              </section>

              <section className="space-y-4 pt-4 border-t border-[#1a1a1a]/10">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]">Wording Translations</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Everyday:</span> {selectedFlaw.everydayWording}</div>
                  <div><span className="font-medium">Abstract:</span> {selectedFlaw.abstractWording}</div>
                  <div><span className="font-medium">LSAT:</span> {selectedFlaw.lsatWording}</div>
                </div>
              </section>

              <section className="pt-4 border-t border-[#1a1a1a]/10">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a] mb-2">Don't Confuse With</h4>
                <p>{selectedFlaw.dontConfuseWith}</p>
              </section>

              <section className="pt-4 border-t border-[#1a1a1a]/10">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a] mb-2">Common Answer Choice Phrasing</h4>
                <ul className="list-disc pl-5 space-y-2 text-[#1a1a1a]/70">
                  {selectedFlaw.answerChoicePhrasing.map((phrase, idx) => (
                    <li key={idx}>{phrase}</li>
                  ))}
                </ul>
              </section>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 border border-[#1a1a1a]/10 border-dashed">
             <div className="w-16 h-16 rounded-full border border-[#1a1a1a]/20 flex items-center justify-center text-2xl mb-4 font-serif italic text-[#1a1a1a]/30">✦</div>
             <p className="text-xl font-serif italic text-[#1a1a1a]/50 tracking-tight">Select a flaw keycard from the catalog to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
