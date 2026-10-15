import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, X, Zap } from 'lucide-react';

interface LogicVisualizerProps {
  flawId: string;
}

export function LogicVisualizer({ flawId }: LogicVisualizerProps) {
  switch (flawId) {
    case 'necessary-vs-sufficient':
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-8">
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border-2 border-[#1a1a1a]/10 flex items-center justify-center font-serif text-2xl bg-white shadow-sm">P</div>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Premise</span>
            </div>
            <ArrowRight className="w-8 h-8 text-[#1a1a1a]/20" strokeWidth={1} />
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border-2 border-[#1a1a1a]/10 flex items-center justify-center font-serif text-2xl bg-white shadow-sm">Q</div>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Guaranteed</span>
            </div>
          </div>
          
          <div className="w-full max-w-xs h-[1px] bg-[#1a1a1a]/5 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[9px] uppercase tracking-widest font-bold text-[#1a1a1a]/30">The Fatal Turn</div>
          </div>

          <div className="flex items-center gap-12 relative">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -top-6 -right-6"
            >
              <div className="px-2 py-1 bg-[#1a1a1a] text-white text-[8px] font-bold uppercase tracking-tighter rounded">BAD LOGIC</div>
            </motion.div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border-2 border-[#1a1a1a] flex items-center justify-center font-serif text-2xl bg-[#1a1a1a] text-white shadow-xl">Q</div>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Observed</span>
            </div>
            <div className="relative">
              <ArrowRight className="w-8 h-8 text-[#1a1a1a]/80" strokeWidth={1} />
              <div className="absolute inset-0 flex items-center justify-center scale-150">
                <X className="text-red-500/40 w-12 h-12" strokeWidth={0.5} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border-2 border-[#1a1a1a]/40 border-dashed flex items-center justify-center font-serif text-2xl bg-white text-[#1a1a1a]/40">P</div>
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Assumed</span>
            </div>
          </div>
        </div>
      );

    case 'causal-flaw':
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-12">
          <div className="flex items-center gap-8 px-8 py-4 bg-[#1a1a1a]/5 rounded-2xl border border-[#1a1a1a]/5">
            <div className="w-12 h-12 rounded-full border border-[#1a1a1a]/10 flex items-center justify-center bg-white shadow-sm text-sm font-bold">A</div>
            <Plus className="w-4 h-4 text-[#1a1a1a]/20" />
            <div className="w-12 h-12 rounded-full border border-[#1a1a1a]/10 flex items-center justify-center bg-white shadow-sm text-sm font-bold">B</div>
            <div className="h-4 w-[1px] bg-[#1a1a1a]/10 mx-2" />
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Correlation</span>
          </div>

          <div className="relative w-full max-w-sm flex justify-center">
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-8 text-red-500 font-bold text-xs uppercase tracking-widest"
            >
              The Trap
            </motion.div>
            
            <div className="flex items-center gap-12">
               <div className="w-16 h-16 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shadow-xl font-bold">A</div>
               <div className="relative">
                 <ArrowRight className="w-12 h-12 text-[#1a1a1a]" strokeWidth={1} />
                 <Zap className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 text-yellow-500 fill-yellow-500" />
               </div>
               <div className="w-16 h-16 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center bg-white shadow-lg font-bold">B</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 w-full max-w-md pt-8 border-t border-[#1a1a1a]/5">
            <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-help">
               <div className="w-10 h-10 rounded-full border border-dashed border-[#1a1a1a] flex items-center justify-center text-[10px]">B→A</div>
               <span className="text-[8px] uppercase font-bold text-center">Reverse<br/>Causality</span>
            </div>
            <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-help">
               <div className="w-10 h-10 rounded-full border border-dashed border-[#1a1a1a] flex items-center justify-center text-xs">C</div>
               <span className="text-[8px] uppercase font-bold text-center">Third<br/>Factor</span>
            </div>
             <div className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-help">
               <div className="w-10 h-10 rounded-full border border-dashed border-[#1a1a1a] flex items-center justify-center text-xs">🎲</div>
               <span className="text-[8px] uppercase font-bold text-center">Mere<br/>Chance</span>
            </div>
          </div>
        </div>
      );

    case 'sampling-fallacy':
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-8">
          <div className="relative p-12 bg-[#1a1a1a]/5 rounded-3xl border border-[#1a1a1a]/10 w-full max-w-sm overflow-hidden">
            <div className="flex flex-wrap gap-2 justify-center opacity-20">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
              ))}
            </div>
            
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-xl shadow-2xl flex flex-col items-center gap-2">
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
                   <div className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
                   <div className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest">Small Sample</span>
              </div>
            </motion.div>
          </div>

          <ArrowRight className="w-8 h-8 text-[#1a1a1a]/20 rotate-90" strokeWidth={1} />

          <div className="p-6 bg-[#1a1a1a] text-white rounded-xl shadow-xl w-full max-w-xs text-center border-b-4 border-red-500">
            <h5 className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Sweeping Conclusion</h5>
            <p className="font-serif italic text-lg text-white">"Everyone does X."</p>
          </div>
        </div>
      );

    case 'part-vs-whole':
      return (
        <div className="flex flex-col items-center justify-center py-6 gap-8 px-4 w-full max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-1 mb-2">
            <h5 className="text-[10px] uppercase tracking-[0.3em] font-black text-[#1a1a1a]/40">Fatal Directionality</h5>
            <div className="h-[2px] w-12 bg-[#1a1a1a]/10 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full relative">
            {/* The Trap Icon in the middle for desktop */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-12 h-12 rounded-full bg-white border-2 border-[#1a1a1a] flex items-center justify-center shadow-xl rotate-12">
                <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              </div>
            </div>

            {/* Path 1: Composition (Part -> Whole) */}
            <div className="flex flex-col items-center p-6 bg-white rounded border border-[#1a1a1a]/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600/60 mb-4">Direction: Composition</span>
              <h6 className="text-xs font-bold mb-6 text-center">Part → Whole Error</h6>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600">★</div>
                  ))}
                </div>
                <ArrowRight className="w-6 h-6 text-[#1a1a1a]/10" />
                <div className="w-16 h-24 rounded border-2 border-[#1a1a1a] bg-[#1a1a1a] flex items-center justify-center relative shadow-lg">
                  <div className="absolute inset-0 opacity-20 flex flex-wrap p-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-1/2 h-1/3 border-[0.5px] border-white/50" />
                    ))}
                  </div>
                  <X className="w-8 h-8 text-red-500 z-10" strokeWidth={3} />
                </div>
              </div>
              
              <div className="space-y-3 w-full">
                <div className="p-3 bg-blue-50/50 rounded border border-blue-100/50">
                  <p className="text-[10px] font-bold uppercase text-blue-700/60 mb-1">The "Ingredients" Trap</p>
                  <p className="text-[11px] leading-relaxed text-[#1a1a1a]/80">A soup can be salty even if no single ingredient was salty.</p>
                </div>
              </div>
            </div>

            {/* Path 2: Division (Whole -> Part) */}
            <div className="flex flex-col items-center p-6 bg-white rounded border border-[#1a1a1a]/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-600/60 mb-4">Direction: Division</span>
              <h6 className="text-xs font-bold mb-6 text-center">Whole → Part Error</h6>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-24 rounded border-2 border-[#1a1a1a] bg-white flex items-center justify-center relative shadow-md">
                   <div className="absolute inset-0 bg-red-50/30" />
                   <div className="text-[10px] font-bold text-[#1a1a1a]/40 text-center px-1">"BEST TEAM"</div>
                </div>
                <ArrowRight className="w-6 h-6 text-[#1a1a1a]/10" />
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-8 h-8 rounded-full border border-red-200 bg-red-50 flex items-center justify-center relative group-hover:scale-110 transition-transform">
                    <span className="text-[10px] font-bold text-red-600">👤</span>
                    <X className="absolute -top-1 -right-1 w-4 h-4 text-red-500" strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-bold uppercase opacity-40">Mediocre Player</span>
                </div>
              </div>

              <div className="space-y-3 w-full">
                <div className="p-3 bg-red-50/50 rounded border border-red-100/50">
                  <p className="text-[10px] font-bold uppercase text-red-700/60 mb-1">The "Collective" Trap</p>
                  <p className="text-[11px] leading-relaxed text-[#1a1a1a]/80">Being on the best team doesn't make an individual the best player.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full mt-4 p-4 bg-[#1a1a1a] rounded flex flex-col items-center gap-3 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Critical Mastery Note</span>
            </div>
            <p className="text-xs text-white/90 text-center leading-relaxed font-serif italic max-w-lg">
              "The fallacy isn't just about sizes; it's about <span className="text-yellow-500">properties that don't transfer</span>. Directionality matters: check if they are going from pieces to whole, or whole to pieces."
            </p>
          </div>
        </div>
      );

    default:
      // Not every flaw has a bespoke diagram. This is an intentional state, not
      // a placeholder: the written breakdown below carries the full teaching.
      return (
        <div className="flex flex-col items-center justify-center py-14 gap-5 text-center">
          <div className="w-16 h-16 rounded-full border border-[#1a1a1a]/15 bg-[#1a1a1a]/[0.03] flex items-center justify-center text-2xl">
            ✦
          </div>
          <p className="text-[11px] uppercase font-bold tracking-[0.2em] max-w-[260px] leading-relaxed text-[#1a1a1a]/55">
            This flaw is taught through the written breakdown below.
          </p>
        </div>
      );
  }
}
