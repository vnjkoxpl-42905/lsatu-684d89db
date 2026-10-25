/**
 * Module 5: Hard Sentences. Letterpress hub with truthful per-entry progress.
 * Section bodies live in modules/hard-sentences/sections/.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import {
  HARD_ENTRIES,
  firstIncomplete,
  isEntryComplete,
  type HardCompletionSnapshot,
  type HardEntry,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';

const KIND_LABEL: Record<HardEntry['kind'], string> = {
  note: 'Notes',
  lab: 'Guided lab',
  drill: 'Graded drill',
  capstone: 'Capstone',
};

export function HardSentencesIndex() {
  const user = useUser();
  const { progress } = useModuleProgress(user?.id);
  const snap: HardCompletionSnapshot = {
    hardSections: progress?.completed_hard_sections ?? [],
    drills: progress?.completed_drills ?? [],
    capstones: progress?.completed_capstones ?? [],
  };
  const resume = firstIncomplete(snap);
  const doneCount = HARD_ENTRIES.filter((e) => isEntryComplete(e, snap)).length;
  const anyDone = doneCount > 0;

  return (
    <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)] font-sans selection:bg-[oklch(0.2_0.01_60/0.08)]">
      <main className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
        <div className="mx-auto w-full max-w-[980px]">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="relative grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[36px] border border-[oklch(0.2_0.01_60/0.06)] bg-[linear-gradient(180deg,oklch(0.985_0.006_60)_0%,oklch(0.972_0.01_62)_100%)] px-8 py-12 shadow-[0_30px_80px_-36px_oklch(0.2_0.01_60/0.2)] md:grid-cols-[minmax(0,1fr)_320px] md:gap-12 md:px-12 md:py-14"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,oklch(0.9_0.03_78/0.34),transparent_58%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-10 h-px bg-[linear-gradient(90deg,transparent,oklch(0.74_0.04_76/0.42),transparent)]" />

            <div className="relative z-10 max-w-[40rem]">
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
                Module 5 · Hard Sentences
              </p>
              <h1 className="max-w-[9ch] text-[clamp(54px,7.5vw,96px)] font-serif italic font-medium leading-[0.92] tracking-[-0.05em] text-[oklch(0.15_0.01_60)]">
                Hard Sentences.
              </h1>
              <p className="mt-8 max-w-[32rem] text-[20px] leading-[1.42] text-[oklch(0.2_0.01_60/0.74)] md:text-[22px]">
                Some LSAT sentences bury their point under layers of qualifiers. The point is always
                still in there. Let&apos;s learn how to lift the layers off, one at a time.
              </p>
            </div>

            <aside className="relative z-10 w-full md:max-w-[320px]">
              <div className="relative rounded-[28px] border border-[oklch(0.2_0.01_60/0.08)] bg-white/88 p-2 shadow-[0_28px_72px_-24px_oklch(0.2_0.01_60/0.18)]">
                <Link
                  to={resume.route}
                  className="relative flex min-h-[280px] w-full flex-col items-start justify-between overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,oklch(0.16_0.01_60)_0%,oklch(0.11_0.01_60)_100%)] p-8 text-left text-[oklch(0.96_0.01_60)] transition-all duration-300 ease-eased hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
                >
                  <div className="space-y-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[oklch(0.96_0.01_60/0.48)]">
                      {anyDone ? 'Resume' : 'Begin'}
                    </div>
                    <div className="space-y-3">
                      <div className="font-serif text-[38px] italic leading-[0.98] tracking-[-0.04em]">
                        {resume.title}
                      </div>
                      <div className="max-w-[19rem] text-[15px] leading-relaxed text-[oklch(0.96_0.01_60/0.68)]">
                        {resume.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-[18px] border border-[oklch(0.96_0.01_60/0.12)] bg-[oklch(0.96_0.01_60/0.04)] px-5 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[oklch(0.96_0.01_60/0.56)]">
                      {doneCount} of {HARD_ENTRIES.length} complete
                    </div>
                    <div className="rounded-full border border-[oklch(0.96_0.01_60/0.14)] p-3">
                      <ArrowRight className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                  </div>
                </Link>
              </div>
            </aside>
          </motion.section>

          {/* Roster */}
          <section className="mt-10 pb-24">
            <div className="mb-6 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
              All sections
            </div>
            <ul className="grid gap-4">
              {HARD_ENTRIES.map((entry, i) => {
                const done = isEntryComplete(entry, snap);
                return (
                  <li key={entry.id}>
                    <Link
                      to={entry.route}
                      className="group block rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
                    >
                      <div className="flex items-center gap-5 rounded-[16px] border border-[rgba(26,26,26,0.10)] bg-white p-6 transition-all duration-300 ease-eased group-hover:-translate-y-0.5 group-hover:border-[rgba(26,26,26,0.18)] group-hover:shadow-[0_18px_40px_-18px_rgba(26,26,26,0.18)] md:p-7">
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-serif text-[20px] italic',
                            done
                              ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
                              : 'border-[rgba(26,26,26,0.12)] bg-[#FBF8F1] text-[#1a1a1a]',
                          )}
                        >
                          {done ? <Check className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" /> : i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-serif text-[24px] italic leading-tight text-[#1a1a1a]">
                              {entry.title}
                            </h3>
                            <span className="rounded-full border border-[rgba(26,26,26,0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
                              {KIND_LABEL[entry.kind]}
                            </span>
                            {done ? (
                              <span className="rounded-full border border-emerald-600/25 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                Done
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">
                            {entry.description}
                          </p>
                        </div>
                        <ArrowRight
                          className="h-5 w-5 shrink-0 text-[rgba(26,26,26,0.35)] transition-all duration-300 ease-eased group-hover:translate-x-0.5 group-hover:text-[#1a1a1a]"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
