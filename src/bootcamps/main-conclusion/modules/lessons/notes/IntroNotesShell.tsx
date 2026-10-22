import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { ArrowDown, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentAction, getNextAction, getPreviousAction, ActionType } from "@/bootcamps/main-conclusion/content/introToLrPath";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { useModuleProgress } from "@/bootcamps/main-conclusion/hooks/useModuleProgress";

interface IntroNotesShellProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const getActionLabel = (type: ActionType, direction: 'next' | 'prev' = 'next') => {
  const prefix = direction === 'next' ? 'Next' : 'Previous';
  switch (type) {
    case 'note': return `${prefix} Lesson`;
    case 'tool': return `${prefix} Tool`;
    case 'reference': return `${prefix} Reference`;
    case 'checkpoint': return `${prefix} Checkpoint`;
    case 'drill': return `${prefix} Drill`;
    case 'practice': return `${prefix} Practice`;
    case 'capstone': return `${prefix} Capstone`;
    default: return 'Continue';
  }
};

export function IntroNotesShell({ eyebrow, title, subtitle, children }: IntroNotesShellProps) {
  const { pathname } = useLocation();
  const { markLessonComplete } = useModuleProgress();
  const currentAction = getCurrentAction(pathname);
  const nextAction = getNextAction(pathname);
  const prevAction = getPreviousAction(pathname);
  const isPremisesNote = pathname.endsWith("/lessons/notes/premises");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const recordCurrentNoteComplete = () => {
    if (currentAction?.type !== 'note' || !currentAction.completionId || !currentAction.routeId) return;
    void markLessonComplete(currentAction.completionId, currentAction.routeId).catch((error) => {
      console.error('[IntroNotesShell] note completion failed', {
        lessonId: currentAction.completionId,
        routeId: currentAction.routeId,
        error,
      });
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.23, 1, 0.32, 1] as [number, number, number, number], // easeOutQuint
      },
    },
  };


  return (
    <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)] font-sans selection:bg-[oklch(0.2_0.01_60/0.08)]">
      <DynamicIslandTOC />
      <main className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
        <div className="mx-auto w-full max-w-[980px]">
          {/* Launch / Hero Screen */}
          <motion.section 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="launch-screen relative grid min-h-[72vh] grid-cols-1 items-center gap-10 overflow-hidden rounded-[36px] border border-[oklch(0.2_0.01_60/0.06)] bg-[linear-gradient(180deg,oklch(0.985_0.006_60)_0%,oklch(0.972_0.01_62)_100%)] px-8 py-12 shadow-[0_30px_80px_-36px_oklch(0.2_0.01_60/0.2)] md:grid-cols-[minmax(0,1fr)_320px] md:gap-12 md:px-12 md:py-14"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_top,oklch(0.9_0.03_78/0.34),transparent_58%)]" />
            <div className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full bg-[oklch(0.88_0.04_80/0.3)] blur-3xl" />
            <motion.div
              aria-hidden
              animate={{ opacity: [0.22, 0.42, 0.22], scale: [1, 1.04, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-14 left-[12%] h-40 w-40 rounded-full bg-[oklch(0.82_0.055_82/0.22)] blur-3xl"
            />
            <div className="pointer-events-none absolute inset-x-8 top-10 h-px bg-[linear-gradient(90deg,transparent,oklch(0.74_0.04_76/0.42),transparent)]" />

            <div className="hero-copy relative z-10 max-w-[40rem]">
              {eyebrow ? (
                <motion.p 
                  variants={itemVariants}
                  className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[oklch(0.22_0.012_60/0.62)]"
                >
                  {eyebrow}
                </motion.p>
              ) : null}
              <motion.h1 
                variants={itemVariants}
                className="max-w-[8.5ch] text-[clamp(58px,8vw,108px)] font-serif italic font-medium leading-[0.9] tracking-[-0.05em] text-[oklch(0.15_0.01_60)] md:max-w-[7.4ch]"
              >
                {title}
              </motion.h1>

              <motion.div
                variants={itemVariants}
                className="mt-8 max-w-[32rem] space-y-4"
              >
                <p className="text-[20px] leading-[1.42] text-[oklch(0.2_0.01_60/0.74)] md:text-[22px]">
                  {subtitle}
                </p>
              </motion.div>
            </div>

            <motion.aside 
              variants={itemVariants}
              className="summary-card group relative z-10 w-full md:max-w-[320px]"
            >
              <div className="absolute inset-0 rounded-[28px] bg-[oklch(0.2_0.01_60/0.05)] blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
              <div className="relative rounded-[28px] border border-[oklch(0.2_0.01_60/0.08)] bg-white/88 p-2 shadow-[0_28px_72px_-24px_oklch(0.2_0.01_60/0.18)] transition-all duration-300 ease-eased group-hover:-translate-y-1.5 group-hover:shadow-[0_42px_96px_-28px_oklch(0.2_0.01_60/0.22)]">
                <button 
                  onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
                  className="relative w-full overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,oklch(0.16_0.01_60)_0%,oklch(0.11_0.01_60)_100%)] text-[oklch(0.96_0.01_60)] p-8 min-h-[320px] flex flex-col items-start justify-between text-left transition-all duration-300 ease-eased hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
                >
                  <motion.div
                    aria-hidden
                    animate={{ x: ["-120%", "160%"] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                    className="pointer-events-none absolute inset-y-0 w-20 bg-[linear-gradient(90deg,transparent,oklch(0.96_0.01_60/0.08),transparent)] blur-md"
                  />
                  <div className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[oklch(0.96_0.01_60/0.48)]">Begin</div>
                    <div className="space-y-3">
                      <div className="text-[46px] font-serif italic leading-[0.96] tracking-[-0.04em]">Start here</div>
                      <div className="max-w-[19rem] text-[15px] leading-relaxed text-[oklch(0.96_0.01_60/0.68)]">
                        First check whether the author states the point up front or turns into it later.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[oklch(0.96_0.01_60/0.5)]">
                      <span className="rounded-full border border-[oklch(0.96_0.01_60/0.1)] px-3 py-2">Conclusion first</span>
                      <span className="rounded-full border border-[oklch(0.96_0.01_60/0.1)] px-3 py-2">Turn later</span>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-[18px] border border-[oklch(0.96_0.01_60/0.12)] bg-[oklch(0.96_0.01_60/0.04)] px-5 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[oklch(0.96_0.01_60/0.56)]">Open notes</div>
                    <motion.div 
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-full border border-[oklch(0.96_0.01_60/0.14)] p-3 transition-colors duration-300 group-hover:bg-[oklch(0.96_0.01_60/0.06)]"
                    >
                      <ArrowDown className="h-5 w-5" strokeWidth={1.75} />
                    </motion.div>
                  </div>
                </button>
              </div>
            </motion.aside>
          </motion.section>

          {/* Notes Drawer */}
          <section className={cn("notes-drawer", isPremisesNote ? "pb-48 md:pb-56" : "pb-32")} id="notesDrawer">
            <article className="note-card bg-white border border-[oklch(0.2_0.01_60/0.08)] shadow-[0_16px_48px_-8px_oklch(0.2_0.01_60/0.06)] overflow-hidden rounded-[24px]">
              <div className="note-content">
                {children}
              </div>

              {/* Integrated Navigation */}
              {(prevAction || nextAction) && (
                <div className="note-navigation bg-[oklch(0.98_0.005_60)] border-t border-[oklch(0.2_0.01_60/0.06)] p-10 md:p-14">
                  <div className="flex flex-col md:flex-row gap-8 justify-between">
                    {/* Previous Action */}
                    {prevAction ? (
                      <Link 
                        to={prevAction.route} 
                        className="group flex-1 flex flex-col items-start gap-6 rounded-[24px] p-8 bg-white border border-[oklch(0.2_0.01_60/0.08)] shadow-[0_8px_24px_oklch(0.2_0.01_60/0.04)] transition-all duration-300 ease-eased hover:-translate-y-1 hover:border-[oklch(0.2_0.01_60/0.15)] hover:shadow-[0_24px_48px_-12px_oklch(0.2_0.01_60/0.08)]"
                      >
                        <div className="flex items-center gap-2 rounded-full bg-[oklch(0.2_0.01_60/0.04)] px-5 py-3 text-[oklch(0.2_0.01_60)] transition-colors duration-300 group-hover:bg-[oklch(0.2_0.01_60/0.08)]">
                          <ArrowLeft className="h-4 w-4" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back</span>
                        </div>
                        <div className="w-full">
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[oklch(0.2_0.01_60/0.4)] mb-2">
                            {getActionLabel(prevAction.type, 'prev')}
                          </div>
                          <div className="text-3xl font-serif italic mb-2 tracking-tight">{prevAction.title}</div>
                          <div className="text-sm text-[oklch(0.2_0.01_60/0.5)] line-clamp-2 leading-relaxed">{prevAction.description}</div>
                        </div>
                      </Link>
                    ) : <div className="flex-1 hidden md:block" />}

                    {/* Next Action */}
                    {nextAction ? (
                      <Link 
                        to={nextAction.route} 
                        onClick={recordCurrentNoteComplete}
                        className="group flex-1 flex flex-col items-end gap-6 rounded-[24px] p-8 bg-white border border-[oklch(0.2_0.01_60/0.08)] shadow-[0_8px_24px_oklch(0.2_0.01_60/0.04)] transition-all duration-300 ease-eased hover:-translate-y-1 hover:border-[oklch(0.2_0.01_60/0.15)] hover:shadow-[0_24px_48px_-12px_oklch(0.2_0.01_60/0.08)]"
                      >
                        <div className="flex items-center gap-2 rounded-full bg-[oklch(0.15_0.01_60)] px-6 py-3 text-[oklch(0.96_0.01_60)] transition-all duration-300 group-hover:bg-[oklch(0.1_0.01_60)]">
                          <Check className="h-4 w-4" />
                          <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Mark Complete &amp; Continue</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                        <div className="w-full text-right">
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[oklch(0.2_0.01_60/0.4)] mb-2">
                            {getActionLabel(nextAction.type, 'next')}
                          </div>
                          <div className="text-3xl font-serif italic mb-2 tracking-tight">{nextAction.title}</div>
                          <div className="text-sm text-[oklch(0.2_0.01_60/0.5)] line-clamp-2 leading-relaxed">{nextAction.description}</div>
                        </div>
                      </Link>
                    ) : <div className="flex-1 hidden md:block" />}
                  </div>
                </div>
              )}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
