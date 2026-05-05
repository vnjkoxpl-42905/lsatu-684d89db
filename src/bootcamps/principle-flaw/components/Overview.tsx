import React from 'react';
import { BookOpen, Calendar, CheckSquare, Target, HelpCircle, ArrowRight, Download, Film, ListChecks } from 'lucide-react';
import { Button } from './ui/button';
import { HeroGeometric } from './ui/shape-landing-hero';
import { moduleOverviewSections, moduleConfig } from '../content/module-overview';
import { downloadModuleOverview, downloadSchedule, downloadQuestionList } from '../lib/downloads';

export default function Overview({ userName, onStart }: { userName: string, onStart: () => void }) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <HeroGeometric 
        badge="STUDENT PLAN"
        title1={`${userName}'s`}
        title2="Two-Week LSAT Plan"
      />

      <div className="max-w-4xl mx-auto space-y-16 px-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-serif italic text-zinc-100 uppercase tracking-tight">Flaw + Principle Mastery</h1>
          <p className="text-zinc-400 font-light max-w-xl mx-auto">
            Everything you need to master LR's most common relationship-tracking questions in 14 days.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-500">
              <HelpCircle size={20} />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">How to use this app</h3>
            </div>
            <ul className="space-y-4">
              {[
                "Start with Today every morning",
                "Open the packet listed for that day",
                "Read the notes before starting homework",
                "Complete the assigned practice work",
                "Log every missed or confusing question",
                "Bring confusing questions to tutoring"
              ].map((step, i) => (
                <li key={i} className="flex gap-4 text-sm text-zinc-300 items-start group">
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-500 mt-0.5 flex-shrink-0 group-hover:border-emerald-500/50 group-hover:text-emerald-500 transition-colors">
                    {i+1}
                  </div>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 text-blue-500">
              <BookOpen size={20} />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">The two skills</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/[0.03] hover:border-white/10 transition-colors">
                <strong className="text-zinc-100 block mb-2 font-serif italic text-lg">Flaw</strong>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">What went wrong? You must identify exactly why the evidence provided is not enough to prove the conclusion.</p>
              </div>
              <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/[0.03] hover:border-white/10 transition-colors">
                <strong className="text-zinc-100 block mb-2 font-serif italic text-lg">Principle</strong>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">What rule applies? You must find the abstract relationship that bridges the gap or governs the situation.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-8 bg-zinc-900/20 p-8 md:p-10 rounded-3xl border border-white/[0.03] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <Target size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Your daily workflow</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Read", desc: "Study the notes", color: "text-emerald-500" },
              { label: "Do", desc: "Homework drills", color: "text-blue-500" },
              { label: "Review", desc: "Mistake analysis", color: "text-indigo-400" },
              { label: "Bring", desc: "Prep for tutoring", color: "text-rose-500" }
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className={`text-3xl font-serif italic ${item.color}`}>{item.label}</div>
                <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 pt-4">
          <div className="flex items-center gap-3 text-zinc-500">
            <Film size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Module Overview</h3>
          </div>
          {moduleConfig.moduleOverviewVideoUrl && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.05] bg-zinc-950">
              <video
                src={moduleConfig.moduleOverviewVideoUrl}
                controls
                preload="metadata"
                className="w-full h-full"
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {moduleOverviewSections.map((s, i) => (
              <div key={i} className="bg-zinc-900/30 p-6 rounded-2xl border border-white/[0.03]">
                <h4 className="text-sm font-serif italic text-zinc-100 mb-3">{s.heading}</h4>
                <div className="space-y-2">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-xs text-zinc-400 font-light leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-3 text-zinc-500">
            <Download size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Quick downloads</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadSchedule} variant="outline" className="rounded-xl border-zinc-800 text-zinc-300">
              <Calendar size={14} className="mr-2" /> Schedule
            </Button>
            <Button onClick={downloadQuestionList} variant="outline" className="rounded-xl border-zinc-800 text-zinc-300">
              <ListChecks size={14} className="mr-2" /> Question List
            </Button>
            <Button onClick={downloadModuleOverview} variant="outline" className="rounded-xl border-zinc-800 text-zinc-300">
              <Film size={14} className="mr-2" /> Module Overview
            </Button>
            <span className="text-[10px] text-zinc-600 italic self-center ml-2">More in Profile.</span>
          </div>
        </section>

        <div className="pt-8 flex justify-center">
          <Button size="lg" onClick={onStart} className="w-full max-w-sm h-16 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl bg-zinc-100 text-zinc-950 hover:bg-white transition-all shadow-[0_20px_50px_rgba(255,255,255,0.05)] group">
            Start Today
            <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
