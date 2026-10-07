import React from 'react';
import { ArrowRight, Calendar, Download, Film, ListChecks } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { Button } from './ui/button';
import { moduleOverviewSections, moduleConfig } from '../content/module-overview';
import { downloadModuleOverview, downloadSchedule, downloadQuestionList } from '../lib/downloads';

const PHASES = [
  { label: 'Read', desc: 'Study the notes', color: 'var(--pf-role-read)', time: '~40 min' },
  { label: 'Do', desc: 'Homework drills', color: 'var(--pf-role-do)', time: '~35 min' },
  { label: 'Review', desc: 'Log mistakes', color: 'var(--pf-role-review)', time: '~15 min' },
  { label: 'Bring', desc: 'Prep for session', color: 'var(--pf-role-bring)', time: '~5 min' },
];

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

export default function Overview({ userName, onStart }: { userName: string; onStart: () => void }) {
  return (
    <div className="space-y-20 pb-20">

      {/* ── Hero — asymmetric split ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-10 md:gap-16 items-start pt-2 md:pt-6">

        {/* Left: identity + CTA */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={item} className="space-y-4">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.3em] text-zinc-600">
              Student Plan
            </span>
            <h1 className="text-[clamp(2.2rem,4.5vw,3.6rem)] font-serif italic text-zinc-100 tracking-tight leading-[1.05]">
              {userName}&rsquo;s<br />
              <span className="text-zinc-500">Two-Week Plan</span>
            </h1>
          </motion.div>

          <motion.p variants={item} className="text-sm text-zinc-400 font-light leading-relaxed max-w-xs">
            Two LR families. Fourteen days. The method that holds for both, drilled until it&rsquo;s automatic.
          </motion.p>

          <motion.div variants={item}>
            <Button
              size="lg"
              onClick={onStart}
              className="h-12 px-6 text-xs font-bold uppercase tracking-[0.2em] rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-50 transition-colors active:scale-[0.97] transition-transform duration-100 group"
            >
              Start Today
              <ArrowRight size={14} className="ml-2.5 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Right: phase stack */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="space-y-2 pt-1 md:pt-10"
        >
          {PHASES.map((phase) => (
            <motion.div
              key={phase.label}
              variants={item}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.04] bg-zinc-900/30"
            >
              <div
                className="w-0.5 h-6 rounded-full flex-shrink-0"
                style={{ background: phase.color }}
              />
              <span className="text-sm font-serif italic" style={{ color: phase.color }}>
                {phase.label}
              </span>
              <span className="text-xs text-zinc-600 flex-1 truncate">{phase.desc}</span>
              <span className="text-[10.5px] font-mono text-zinc-700 flex-shrink-0">{phase.time}</span>
            </motion.div>
          ))}
          <div className="px-4 pt-2">
            <span className="text-[10.5px] text-zinc-700 uppercase tracking-widest">
              Four phases &middot; every day &middot; 14 days
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Subject briefs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/20 p-6 rounded-2xl border border-white/[0.03]">
          <strong className="text-zinc-100 block mb-2 font-serif italic">Flaw</strong>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            Why the evidence isn&rsquo;t enough to prove the conclusion.
          </p>
        </div>
        <div className="bg-zinc-900/20 p-6 rounded-2xl border border-white/[0.03]">
          <strong className="text-zinc-100 block mb-2 font-serif italic">Principle</strong>
          <p className="text-xs text-zinc-400 font-light leading-relaxed">
            The abstract rule that bridges the gap or governs the case.
          </p>
        </div>
      </div>

      {/* ── Module overview video ─────────────────────────────────────────── */}
      {moduleConfig.moduleOverviewVideoUrl && (
        <section className="space-y-5">
          <div className="flex items-center gap-3 text-zinc-500">
            <Film size={16} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Module Overview</h3>
          </div>
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.05] bg-zinc-950">
            <video
              src={moduleConfig.moduleOverviewVideoUrl}
              controls
              preload="metadata"
              className="w-full h-full"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {moduleOverviewSections.map((s, i) => (
              <div key={i} className="bg-zinc-900/20 p-6 rounded-xl border border-white/[0.03]">
                <h4 className="text-base font-serif italic text-zinc-100 mb-4">{s.heading}</h4>
                <div className="space-y-3">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-[13px] text-zinc-300 font-light leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick downloads ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-zinc-500">
          <Download size={16} />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">Quick downloads</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={downloadSchedule}
            variant="outline"
            className="rounded-xl border-zinc-800 text-zinc-300"
          >
            <Calendar size={13} className="mr-2" /> Schedule
          </Button>
          <Button
            onClick={downloadQuestionList}
            variant="outline"
            className="rounded-xl border-zinc-800 text-zinc-300"
          >
            <ListChecks size={13} className="mr-2" /> Question List
          </Button>
          <Button
            onClick={downloadModuleOverview}
            variant="outline"
            className="rounded-xl border-zinc-800 text-zinc-300"
          >
            <Film size={13} className="mr-2" /> Module Overview
          </Button>
        </div>
      </section>

    </div>
  );
}
