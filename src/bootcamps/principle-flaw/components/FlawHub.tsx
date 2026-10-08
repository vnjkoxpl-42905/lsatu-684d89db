import React, { useState } from 'react';
import { flawHubData } from '../data';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, AlertCircle, Info, Map, Terminal, ListChecks, HelpCircle, ArrowRight, BookOpen, Download, Table, Zap, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadFlawNotes } from '../lib/downloads';

interface FlawStyle {
  id: string;
  style: string;
  meaning: string;
  language: string[];
  test: string;
  correctBehavior: string;
  wrongBehavior: string;
  studentTest: string;
  reviewPrompt: string;
}

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  step?: string;
  id?: string;
}

const Section = ({ title, icon: Icon, children, step, id }: SectionProps) => (
    <div className="space-y-4 scroll-mt-24" id={id}>
      <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Icon size={18} />
          </div>
          <div className="flex flex-col">
            {step && <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{step}</span>}
            <h3 className="text-xl font-serif italic text-zinc-100">{title}</h3>
          </div>
        </div>
      </div>
      <div className="pl-0 sm:pl-11 space-y-8">
        {children}
      </div>
    </div>
  );

const TeachingCard = ({ title, data }: { title: string; data: FlawStyle }) => (
  <div className="bg-zinc-900/40 rounded-[32px] border border-white/[0.05] overflow-hidden shadow-2xl shadow-black/40 group hover:border-white/10 transition-colors duration-200">
    <div className="p-8 border-b border-white/[0.03] bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-between">
      <h4 className="text-2xl font-serif italic text-zinc-50 tracking-tight">{title}</h4>
      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <HelpCircle size={18} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
      </div>
    </div>
    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-8">
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Plain-English Meaning</span>
          <p className="text-base text-zinc-300 leading-relaxed font-light">{data.meaning}</p>
        </div>
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">How to Spot It</span>
          <div className="flex flex-wrap gap-2">
            {data.language.map((lang: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/5 text-[11px] text-zinc-300 font-mono italic shadow-inner">
                "{lang}"
              </span>
            ))}
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] block">The Test to Use</span>
          </div>
          <p className="text-lg text-emerald-400 leading-relaxed font-medium font-serif italic">{data.test}</p>
        </div>
      </div>
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/[0.03] space-y-3">
             <div className="flex items-center gap-2">
               <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
               <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Correct Answer</span>
             </div>
             <p className="text-xs text-zinc-400 font-light leading-relaxed">{data.correctBehavior}</p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/[0.03] space-y-3">
             <div className="flex items-center gap-2">
               <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
               <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-[0.2em] block">Wrong Answer Trap</span>
             </div>
             <p className="text-xs text-zinc-400 font-light leading-relaxed">{data.wrongBehavior}</p>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.02] relative group/prompt">
          <div className="absolute top-4 right-4 text-zinc-800 group-hover/prompt:text-zinc-600 transition-colors">
            <Terminal size={14} />
          </div>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] block mb-3">Self-Check Tool</span>
          <p className="text-lg text-zinc-200 font-serif italic leading-snug">"{data.studentTest}"</p>
        </div>
        <div className="p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em]">Review Prompt</span>
          </div>
          <p className="text-xs text-zinc-400 font-light italic leading-relaxed">"{data.reviewPrompt}"</p>
        </div>
      </div>
    </div>
  </div>
);

const MiniDrill = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const current = flawHubData.miniDrill[currentIndex];

  const next = () => {
    setRevealed(false);
    setCurrentIndex((prev) => (prev + 1) % flawHubData.miniDrill.length);
  };

  return (
    <div className="bg-zinc-950/50 rounded-2xl border border-white/[0.03] p-8 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Mini-Drill</span>
        <h4 className="text-2xl font-serif italic text-zinc-50">"Which style is this?"</h4>
        <p className="text-xs text-zinc-500">Classify the generic answer-choice stem below.</p>
      </div>

      <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/[0.02] text-center min-h-[120px] flex items-center justify-center">
        <h5 className="text-xl text-zinc-200 font-light italic">"{current.stem}"</h5>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {flawHubData.styles.map((s) => (
          <Button 
            key={s.id}
            onClick={() => {
              setAnswers({...answers, [currentIndex]: s.style});
              setRevealed(true);
            }}
            variant="outline"
            disabled={revealed}
            className={`h-12 text-[10px] uppercase font-bold tracking-widest rounded-xl transition-colors duration-150 active:scale-[0.97] transition-transform ${
              revealed && s.style === current.style ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 
              revealed && answers[currentIndex] === s.style ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 
              'border-white/[0.05] text-zinc-400'
            }`}
          >
            {s.style}
          </Button>
        ))}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-zinc-900 border border-white/[0.05] space-y-3"
          >
            <div className="flex items-center gap-2">
               {answers[currentIndex] === current.style ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}
               <span className={`text-sm font-bold ${answers[currentIndex] === current.style ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {answers[currentIndex] === current.style ? "Correct" : `Incorrect - It's ${current.style}`}
               </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{current.why}</p>
            <Button onClick={next} variant="link" className="text-emerald-500 p-0 h-auto text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              Next Drill <ArrowRight size={12} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FlawHub() {
  const downloadPacket = downloadFlawNotes;

  if (!flawHubData?.styles?.length) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3 py-12">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">No flaw library yet</div>
          <p className="text-sm text-zinc-400 font-light leading-relaxed">
            The Flaw reference is still loading. Refresh the page or check back in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Daily Audit Section */}
      <div className="p-1 rounded-[32px] bg-gradient-to-br from-emerald-500/20 to-transparent">
        <div className="bg-zinc-950 rounded-[31px] p-8 md:p-12 space-y-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Zap size={20} />
              </div>
              <h1 className="text-3xl font-serif italic text-zinc-50">Daily Flaw Action</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Read", detail: "The 4-Step Method below. Don't skip the 'Plain English' translation." },
                { title: "Drill", detail: "Classify 10 answer stems using the Mini-Drill below until you hit 100% accuracy." },
                { title: "Review", detail: "Log every 'Wrong Flaw' trap you fell for today. Pattern match the language." }
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">0{i+1}. {item.title}</span>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Section title="What Flaw questions ask" icon={Info} step="Introduction" id="flaw-intro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              Flaw questions are not asking if you disagree with the author. They are asking you to diagnose <span className="text-zinc-100 font-medium">what went wrong in the reasoning</span>. 
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              The answer is not just "something bad." It must be a precise description of the <span className="text-emerald-400 font-medium italic">gap</span> between the factual evidence provided and the conclusion reached.
            </p>
            <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 block">Tutor Tip</span>
              <p className="text-xs text-zinc-300 italic font-light leading-relaxed">"If the argument gives you evidence A and concludes B, the flaw is that A does not have to prove B. Your job is to say why."</p>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-zinc-900/30 border border-white/[0.02] space-y-4">
             <div className="flex items-center gap-3 text-zinc-100">
               <Download size={18} className="text-emerald-500" />
               <h4 className="text-sm font-bold uppercase tracking-widest font-serif italic">Materials</h4>
             </div>
             <p className="text-xs text-zinc-500 font-light leading-relaxed">Download a backup of the full Flaw Lesson plan.</p>
             <Button onClick={downloadPacket} className="w-full h-12 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2">
               Download Flaw Packet <Download size={14} />
             </Button>
          </div>
        </div>
      </Section>

      <Section title="The 4-Step Method" icon={ListChecks} step="Core Process" id="flaw-method">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: "Conclusion", d: "What is the author trying to prove?", s: "Underline the main claim." },
            { t: "Evidence", d: "What support is provided?", s: "Look for since or because." },
            { t: "Assumption", d: "What is the missing link?", s: "What must be true for this to work?" },
            { t: "Flaw", d: "Name the error.", s: "State the gap in plain English." }
          ].map((item, i) => (
            <div key={i} className="group p-5 rounded-2xl bg-zinc-900/40 border border-white/[0.03] hover:bg-zinc-900 transition-colors">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 block">Step {i+1}</span>
              <h4 className="text-zinc-100 font-serif italic text-lg mb-2">{item.t}</h4>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed font-light">{item.d}</p>
              <p className="text-[10.5px] text-emerald-500 font-bold uppercase tracking-widest">{item.s}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Answer-choice styles" icon={Terminal} step="The Vocabulary of Flaw" id="flaw-styles">
        <div className="space-y-12">
          <div className="space-y-8">
            {flawHubData.styles.map((style) => (
              <TeachingCard key={style.id} title={style.style} data={style} />
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <Table size={16} className="text-zinc-600" />
               <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Comparison Summary</h4>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.03] bg-zinc-900/10 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950/50 border-b border-white/[0.03]">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Style</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Key Language</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">The Test</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ask Yourself</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {flawHubData.styles.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-zinc-200">{s.style}</td>
                        <td className="px-6 py-4 text-[10px] text-zinc-500 whitespace-pre-wrap">{s.language.join(", ")}</td>
                        <td className="px-6 py-4 text-[11px] text-zinc-400 leading-snug">{s.test}</td>
                        <td className="px-6 py-4 text-[11px] text-emerald-500 font-serif italic italic leading-snug">{s.studentTest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <MiniDrill />

          <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Next Step</span>
                <h4 className="text-xl font-serif italic text-zinc-50">Master the Vocabulary</h4>
                <p className="text-xs text-zinc-500 font-light leading-relaxed">Apply these style categories on your next Flaw Worksheet.</p>
             </div>
             <Button className="h-12 px-8 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Go to Practice
             </Button>
          </div>
        </div>
      </Section>

      <Section title="Common Traps" icon={AlertCircle} step="Avoid This" id="flaw-traps">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flawHubData.traps.map((trap, i) => (
            <div key={i} className="group p-8 rounded-[32px] bg-rose-500/[0.02] border border-rose-500/10 hover:bg-rose-500/5 hover:border-rose-500/30 transition-colors duration-200 flex flex-col justify-between shadow-2xl shadow-black/20">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-rose-500/10">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-rose-500 uppercase tracking-[0.2em]">{trap.trap}</span>
                   </div>
                   <AlertCircle size={14} className="text-rose-500/40" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-zinc-600 uppercase tracking-widest block">The Anatomy</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-light">{trap.meaning}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950/40 border border-white/[0.02] space-y-1">
                    <span className="text-[10.5px] font-bold text-rose-500/60 uppercase tracking-widest block">The Trick</span>
                    <p className="text-[11px] text-zinc-400 italic leading-relaxed font-light">"{trap.trick}"</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-rose-500/10">
                <div className="flex items-start gap-3">
                   <Zap size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                   <div>
                      <span className="text-[10.5px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Defense Maneuver</span>
                      <p className="text-[11px] text-zinc-200 font-medium leading-relaxed">{trap.avoid}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Famous Flaw Map" icon={Map} step="Encyclopedia" id="flaw-map">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {flawHubData.famousFlaws.map((flaw, i) => (
            <div key={i} className="p-8 rounded-[28px] bg-zinc-900/40 border border-white/[0.05] hover:bg-zinc-900 transition-colors duration-200 space-y-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-serif italic text-zinc-50 leading-tight">{flaw.flaw}</h4>
                  <div className="px-2 py-0.5 rounded-md bg-zinc-950 border border-white/5 text-[10px] text-zinc-500 uppercase font-black tracking-widest">Type {i+1}</div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5">
                     <span className="text-[10.5px] text-zinc-600 font-bold uppercase tracking-widest block mb-1.5">Logical Failure</span>
                     <p className="text-[13px] text-zinc-300 font-light leading-relaxed">{flaw.meaning}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                     <div className="space-y-1.5 border-l border-zinc-800 pl-3">
                        <span className="text-[10.5px] text-zinc-600 font-bold uppercase tracking-widest block">Spot Pattern</span>
                        <p className="text-[11px] text-zinc-500 italic leading-snug">{flaw.spot}</p>
                     </div>
                     <div className="space-y-1.5 border-l border-emerald-500/20 pl-3">
                        <span className="text-[10.5px] text-emerald-500/60 font-bold uppercase tracking-widest block">Crucial Question</span>
                        <p className="text-[11px] text-emerald-400 font-serif italic italic leading-snug">{flaw.ask}</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-6 rounded-3xl mt-8">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex gap-4 items-center">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Target size={18} />
                 </div>
                 <div className="space-y-0.5">
                    <h5 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Map the Pattern</h5>
                    <p className="text-xs text-zinc-500 font-light italic">Drills on these flaws are available in Mastery Level 1.</p>
                 </div>
              </div>
              <Button variant="outline" className="h-10 border-white/10 text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                 Open Drills
              </Button>
           </div>
        </div>
      </Section>

      <Section title="Required Review Template" icon={BookOpen} step="Mastery" id="flaw-review">
        <div className="bg-zinc-900/40 rounded-3xl border border-white/[0.03] overflow-hidden">
          <div className="p-8 border-b border-white/[0.03] bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-2xl font-serif italic text-zinc-50 leading-tight">Your Flaw Review Blueprint</h4>
              <p className="text-xs text-zinc-500 font-light">Every question you miss must follow this format in your log.</p>
            </div>
            <Button variant="outline" className="h-12 px-8 rounded-xl border-white/[0.1] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
              Copy Template
            </Button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              {flawHubData.reviewTemplate.slice(0, 4).map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-zinc-950/30 border border-white/[0.02]">
                   <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">{item.label}</span>
                   <p className="text-xs text-zinc-400 font-light italic opacity-60">"{item.prompt}"</p>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {flawHubData.reviewTemplate.slice(4).map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                   <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">{item.label}</span>
                   <p className="text-xs text-zinc-400 font-light italic opacity-60">"{item.prompt}"</p>
                </div>
              ))}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-white/[0.05] mt-4">
                 <span className="text-xs font-bold text-zinc-100 uppercase tracking-widest block mb-2 font-serif italic text-center">Now Use This</span>
                 <p className="text-[11px] text-zinc-500 text-center mb-6 leading-relaxed">
                   Apply these styles on the Flaw Worksheet and Progressive Mastery levels 1 & 2.
                 </p>
                 <div className="space-y-2">
                    <Button className="w-full h-11 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                       Flaw Worksheet
                    </Button>
                    <Button variant="outline" className="w-full h-11 border-white/[0.05] text-zinc-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                       Mastery Level 1
                    </Button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
