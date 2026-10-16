import React from 'react';
import { principleHubData } from '../data';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, AlertCircle, Info, Map, Terminal, ListChecks, Zap, ArrowRightLeft, Target, BookOpen, Download, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { downloadPrincipleNotes } from '../lib/downloads';

interface HubSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  step?: string;
  id?: string;
}

const HubSection = ({ title, icon: Icon, children, step, id }: HubSectionProps) => (
  <div className="space-y-4 scroll-mt-24" id={id}>
    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          {step && <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{step}</span>}
          <h3 className="text-xl font-serif italic text-zinc-100">{title}</h3>
        </div>
      </div>
    </div>
    <div className="pl-0 sm:pl-11 space-y-6">
      {children}
    </div>
  </div>
);

export default function PrincipleHub() {
  const downloadPacket = downloadPrincipleNotes;

  if (!principleHubData?.varieties?.length) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3 py-12">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">No principle library yet</div>
          <p className="text-sm text-zinc-400 font-light leading-relaxed">
            The Principle reference is still loading. Refresh the page or check back in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Daily Audit Section */}
      <div className="p-1 rounded-[32px] bg-gradient-to-br from-blue-500/20 to-transparent">
        <div className="bg-zinc-950 rounded-[31px] p-8 md:p-12 space-y-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Target size={20} />
              </div>
              <h1 className="text-3xl font-serif italic text-zinc-50">Daily Principle Action</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Identify", detail: "Is this a Strengthen, Conform, or Application? Look at the stem FIRST." },
                { title: "Map", detail: "Sketch the IF -> THEN skeleton. Identify the Trigger vs. Outcome." },
                { title: "Verify", detail: "Is the correct answer pulling the Trigger correctly? Check for reversals." }
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">0{i+1}. {item.title}</span>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <HubSection title="What Principle asks" icon={Info} step="Introduction" id="principle-intro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              {principleHubData.intro}
            </p>
            <div className="bg-blue-950/20 p-5 rounded-2xl border border-blue-500/20">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 block">The Core Shift</span>
              <p className="text-xs text-zinc-300 italic font-light leading-relaxed">"In Flaw, we look at why an argument is bad. In Principle, we look at the 'laws' that either justify that argument or match its skeleton."</p>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-zinc-900/30 border border-white/[0.02] space-y-4">
             <div className="flex items-center gap-3 text-zinc-100">
               <Download size={18} className="text-blue-500" />
               <h4 className="text-sm font-bold uppercase tracking-widest font-serif italic">Materials</h4>
             </div>
             <p className="text-xs text-zinc-500 font-light leading-relaxed">Download a backup of the full Principle Lesson plan.</p>
             <Button onClick={downloadPacket} className="w-full h-12 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2">
               Download Principle Packet <Download size={14} />
             </Button>
          </div>
        </div>
      </HubSection>

      <HubSection title="Principle is not one type" icon={Zap} step="Classification" id="principle-varieties">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {principleHubData.varieties.map((form, i) => (
            <div key={i} className="group p-5 rounded-2xl bg-zinc-900/40 border border-white/[0.05] hover:bg-zinc-900 hover:border-blue-500/20 transition-colors duration-200 space-y-3 flex flex-col justify-between shadow-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <strong className="text-zinc-100 block text-xs font-serif italic">{form.t}</strong>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed font-light">{form.d}</p>
              </div>
            </div>
          ))}
        </div>
      </HubSection>

      <HubSection title="The Rule Framework" icon={ArrowRightLeft} step="The Four Pillars" id="principle-framework">
        <div className="space-y-8">
          <p className="text-sm text-zinc-400 font-light max-w-2xl leading-relaxed">
            Every principle has four parts. If you misidentify either side of the 'arrow' (the trigger vs. the outcome), you will fall for a reversal trap.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {principleHubData.framework.map((item, i) => (
              <div key={i} className="group p-6 rounded-[24px] bg-zinc-900/40 border border-white/[0.03] hover:bg-zinc-950 hover:border-blue-500/20 transition-colors duration-200 shadow-xl">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 block">Pillar {i+1}</span>
                <h4 className="text-xl font-serif italic text-zinc-50 mb-2">{item.t}</h4>
                <p className="text-xs text-zinc-400 font-light mb-4 leading-relaxed">{item.d}</p>
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.02]">
                   <span className="text-[10.5px] font-bold text-blue-500/60 uppercase tracking-widest block mb-2">Primary Match</span>
                   <p className="text-[10px] text-zinc-300 leading-relaxed italic">"{item.detail}"</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-rose-950/10 p-5 rounded-2xl border border-rose-500/20">
             <div className="flex gap-3">
               <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="text-xs text-rose-400 font-bold mb-1 uppercase tracking-widest">Common Mistake: Outcome Overload</p>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">Picking a rule that has the perfect "Conclusion" result, but where the "Trigger" doesn't actually match the evidence provided in the story.</p>
               </div>
             </div>
          </div>
        </div>
      </HubSection>

      <HubSection title="Major Types Deep-Dive" icon={Target} step="Strategic Breakdown" id="principle-types">
        <div className="space-y-6">
          {principleHubData.majorTypes.map((type, i) => (
            <div key={i} className="group bg-zinc-900/40 rounded-[32px] border border-white/[0.05] overflow-hidden shadow-2xl shadow-black/40 hover:border-blue-500/20 transition-colors duration-200">
               <div className="p-8 pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                     <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">Module {i+1}</span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/10 text-[10.5px] font-bold text-blue-400 uppercase tracking-widest">
                     Core Strategy
                  </div>
               </div>
               <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2">
                       <h4 className="text-2xl font-serif italic text-zinc-50 tracking-tight">{type.type}</h4>
                       <p className="text-sm text-zinc-400 font-light italic leading-relaxed">"{type.meaning}"</p>
                    </div>
                    <div className="space-y-4">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">How to Spot It</span>
                       <div className="flex flex-wrap gap-2">
                          {(type.spot || "").split(",").map((word, idx) => (
                             <span key={idx} className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/5 text-[10px] text-zinc-300 font-mono italic">
                                "{word.trim()}"
                             </span>
                          ))}
                       </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-950/50 border border-white/[0.02] space-y-2 relative overflow-hidden">
                        <div className="absolute -top-2 -right-2 text-zinc-900">
                           <HelpCircle size={40} strokeWidth={1} />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">The Student Question</span>
                        <p className="text-base text-zinc-100 font-serif italic leading-relaxed relative z-10">"{type.question}"</p>
                    </div>
                  </div>
                  <div className="space-y-8">
                     <div className="p-6 rounded-2xl bg-blue-500/[0.02] border border-blue-500/10 space-y-4">
                        <div className="flex items-center gap-2">
                           <Zap size={14} className="text-blue-500" />
                           <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">Step-by-Step Move</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed font-light">{type.strategy}</p>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        <div className="p-5 rounded-2xl bg-rose-500/[0.02] border border-rose-500/10 space-y-2">
                           <div className="flex items-center gap-2">
                              <AlertCircle size={12} className="text-rose-500" />
                              <span className="text-[10.5px] font-bold text-rose-500 uppercase tracking-widest">Common Trap</span>
                           </div>
                           <p className="text-[11px] text-zinc-400 font-light leading-relaxed">{type.mistake}</p>
                        </div>
                     </div>
                     <div className="pt-4">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Practice Connection</span>
                        <div className="flex gap-2">
                           <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              Required Worksheet
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </HubSection>

      <HubSection title="Required Review Template" icon={BookOpen} step="Mastery" id="principle-review">
        <div className="bg-zinc-900/40 rounded-3xl border border-white/[0.03] overflow-hidden">
          <div className="p-8 border-b border-white/[0.03] bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-2xl font-serif italic text-zinc-50 leading-tight">Your Principle Review Blueprint</h4>
              <p className="text-xs text-zinc-500 font-light">Map every missed principle to this framework to find your trigger errors.</p>
            </div>
            <Button variant="outline" className="h-12 px-8 rounded-xl border-white/[0.1] text-xs font-bold uppercase tracking-widest whitespace-nowrap border-blue-500/20 text-blue-400">
              Copy Template
            </Button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-4">
              {principleHubData.reviewTemplate.slice(0, 4).map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-zinc-950/30 border border-white/[0.02]">
                   <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">{item.label}</span>
                   <p className="text-xs text-zinc-400 font-light italic opacity-60">"{item.prompt}"</p>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {principleHubData.reviewTemplate.slice(4).map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                   <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">{item.label}</span>
                   <p className="text-xs text-zinc-400 font-light italic opacity-60">"{item.prompt}"</p>
                </div>
              ))}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-white/[0.05] mt-4">
                 <span className="text-xs font-bold text-zinc-100 uppercase tracking-widest block mb-2 font-serif italic text-center">Now Use This</span>
                 <p className="text-[11px] text-zinc-500 text-center mb-6 leading-relaxed">
                   Apply this framework on Principle Strengthen, Application, and Conform homework.
                 </p>
                 <div className="space-y-2">
                    <Button className="w-full h-11 bg-zinc-100 text-zinc-950 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                       Strengthen Homework
                    </Button>
                    <Button variant="outline" className="w-full h-11 border-white/[0.05] text-blue-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                       Conform Homework
                    </Button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </HubSection>
    </div>
  );
}

const Section = ({ title, icon: Icon, children, step, id }: { title: string, icon: any, children: React.ReactNode, step?: string, id?: string }) => (
  <div className="space-y-4 scroll-mt-24" id={id}>
    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Icon size={18} />
        </div>
        <div className="flex flex-col">
          {step && <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{step}</span>}
          <h3 className="text-xl font-serif italic text-zinc-100">{title}</h3>
        </div>
      </div>
    </div>
    <div className="pl-0 sm:pl-11 space-y-6">
      {children}
    </div>
  </div>
);
