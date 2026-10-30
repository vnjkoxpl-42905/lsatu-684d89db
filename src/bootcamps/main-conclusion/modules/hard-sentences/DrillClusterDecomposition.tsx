/**
 * 5.7 Cluster Drill: six graded decompositions.
 * One submit per sentence; every submit is logged to intro_lr_attempts and the
 * drill completes into module progress as MC-DRL-HS-CLUSTER.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import {
  ClusterDecomposerV2,
  type ClusterGradeResult,
} from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposerV2';
import { HS_DRILL_ITEMS, HS_DRILL_ID } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { logIntroLrAttempt } from '@/bootcamps/main-conclusion/lib/attemptLogger';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import {
  HARD_SENTENCES_HUB_ROUTE,
  entryById,
  prevOf,
} from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';

type Phase = 'intro' | 'run' | 'done';

export default function DrillClusterDecomposition() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ClusterGradeResult[]>([]);
  const [currentGraded, setCurrentGraded] = useState(false);

  const item = HS_DRILL_ITEMS[index]!;
  const isLast = index + 1 >= HS_DRILL_ITEMS.length;
  const correctCount = results.filter((r) => r.correct).length;
  const capstone = entryById('capstone');
  const lab = prevOf('5.7');

  function handleGraded(result: ClusterGradeResult) {
    setResults((rs) => [...rs, result]);
    setCurrentGraded(true);
    logIntroLrAttempt({
      drillId: HS_DRILL_ID,
      questionId: result.itemId,
      mode: 'cluster_decomposition',
      correct: result.correct,
      selectedAnswer: result.liftedIds.join(','),
      timeMs: result.timeMs,
    });
  }

  function handleNext() {
    if (isLast) {
      void markDrillComplete(HS_DRILL_ID);
      setPhase('done');
      window.scrollTo(0, 0);
      return;
    }
    setIndex((i) => i + 1);
    setCurrentGraded(false);
    window.scrollTo(0, 0);
  }

  return (
    <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)] font-sans selection:bg-[oklch(0.2_0.01_60/0.08)]">
      <main className="mx-auto w-full max-w-[860px] px-6 py-10 md:px-10 md:py-14">
        {phase === 'intro' ? (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-8"
          >
            <div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
                Hard Sentences · 5.7 · Graded drill
              </p>
              <h1 className="font-serif text-[clamp(44px,6vw,72px)] italic font-medium leading-[0.95] tracking-[-0.04em] text-[oklch(0.15_0.01_60)]">
                Cluster drill.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[20px] leading-[1.5] text-[oklch(0.2_0.01_60/0.74)]">
                Six fresh sentences, one submit each. Everything you practiced in the lab, now for
                the record.
              </p>
            </div>

            <div className="overflow-hidden rounded-[16px] border border-[rgba(26,26,26,0.12)] bg-white">
              <div className="grid grid-cols-1 divide-y divide-[rgba(26,26,26,0.08)]">
                {[
                  { label: 'Goal', body: 'Strip each sentence to the claim it actually makes.' },
                  { label: 'Interaction', body: 'Tap specifiers to lift them. Keep anything load-bearing, then submit.' },
                  { label: 'After submit', body: 'Per-specifier verdicts, the target core, and a coach note. Then the next sentence.' },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
                    <div className="p-5 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] md:p-6">
                      {row.label}
                    </div>
                    <div className="px-5 pb-5 text-[17px] leading-[1.6] text-[rgba(26,26,26,0.82)] md:p-6">
                      {row.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setPhase('run')}
                className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)] focus-visible:ring-offset-2"
              >
                Start the drill
                <ArrowRight className="h-4 w-4" />
              </button>
              {lab ? (
                <Link
                  to={lab.route}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Warm up in the lab first
                </Link>
              ) : null}
            </div>
          </motion.section>
        ) : null}

        {phase === 'run' ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
                Cluster drill
              </p>
              <p className="text-[13px] font-medium text-[rgba(26,26,26,0.55)]">
                Sentence {index + 1} of {HS_DRILL_ITEMS.length}
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(26,26,26,0.08)]">
              <div
                className="h-full rounded-full bg-[#C5A059] transition-all duration-300 ease-eased"
                style={{ width: `${(index + (currentGraded ? 1 : 0)) * (100 / HS_DRILL_ITEMS.length)}%` }}
              />
            </div>

            <ClusterDecomposerV2 key={item.id} item={item} mode="graded" onGraded={handleGraded} />

            {currentGraded ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)] focus-visible:ring-offset-2"
                >
                  {isLast ? 'Finish drill' : 'Next sentence'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {phase === 'done' ? (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-8"
          >
            <div>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]">
                Cluster drill · Complete
              </p>
              <h1 className="font-serif text-[clamp(44px,6vw,72px)] italic font-medium leading-[0.95] tracking-[-0.04em] text-[oklch(0.15_0.01_60)]">
                {correctCount} of {HS_DRILL_ITEMS.length} clean lifts.
              </h1>
              <p className="mt-6 max-w-[34rem] text-[20px] leading-[1.5] text-[oklch(0.2_0.01_60/0.74)]">
                {correctCount === HS_DRILL_ITEMS.length
                  ? 'Every decoration lifted, every load-bearing specifier kept. That is exactly the read the test rewards.'
                  : 'Every miss below links back to the idea it leans on. A quick revisit now is worth more than a re-run later.'}
              </p>
            </div>

            <ul className="space-y-3">
              {HS_DRILL_ITEMS.map((d, i) => {
                const r = results[i];
                const ok = r?.correct ?? false;
                return (
                  <li
                    key={d.id}
                    className="flex items-start gap-4 rounded-[12px] border border-[rgba(26,26,26,0.10)] bg-white p-5"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                        ok
                          ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
                          : 'border-amber-600/30 bg-amber-50 text-amber-800',
                      )}
                    >
                      {ok ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <X className="h-4 w-4" strokeWidth={2.4} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] italic leading-relaxed text-[#1a1a1a]">{d.core}</p>
                      {!ok ? (
                        <p className="mt-1 text-[14px] leading-relaxed text-[rgba(26,26,26,0.55)]">
                          {d.specifiers.some((s) => s.loadBearing) ? (
                            <>
                              This one had a load-bearing specifier.{' '}
                              <Link to={entryById('5.5')?.route ?? HARD_SENTENCES_HUB_ROUTE} className="underline underline-offset-2 hover:text-[#1a1a1a]">
                                Revisit Optional vs Core
                              </Link>
                              .
                            </>
                          ) : (
                            <>
                              Some decoration stayed on.{' '}
                              <Link to={entryById('5.3')?.route ?? HARD_SENTENCES_HUB_ROUTE} className="underline underline-offset-2 hover:text-[#1a1a1a]">
                                Revisit The Six Specifiers
                              </Link>
                              .
                            </>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-4">
              {capstone ? (
                <Link
                  to={capstone.route}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5F2ED] transition-all duration-300 hover:bg-black"
                >
                  Continue to the capstone
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              <Link
                to={HARD_SENTENCES_HUB_ROUTE}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a]"
              >
                Back to the hub
              </Link>
            </div>
          </motion.section>
        ) : null}
      </main>
    </div>
  );
}
