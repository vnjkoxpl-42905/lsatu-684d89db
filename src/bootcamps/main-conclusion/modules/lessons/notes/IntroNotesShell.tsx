import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { ArrowDown, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getNextAction, getPreviousAction, ActionType } from "@/bootcamps/main-conclusion/content/introToLrPath";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

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
  const nextAction = getNextAction(pathname);
  const prevAction = getPreviousAction(pathname);
  const isPremisesNote = pathname.endsWith("/lessons/notes/premises");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
            className="launch-screen min-h-[90vh] flex flex-col justify-center grid grid-cols-1 md:grid-cols-[1fr_minmax(330px,390px)] gap-16 items-center py-20"
          >
            <div className="hero-copy">
              {eyebrow ? (
                <motion.p 
                  variants={itemVariants}
                  className="mb-8 text-[10px] font-bold uppercase tracking-[0.4em] text-[oklch(0.2_0.01_60/0.46)]"
                >
                  {eyebrow}
                </motion.p>
              ) : null}
              <motion.h1 
                variants={itemVariants}
                className="text-[clamp(64px,10vw,128px)] font-serif italic font-medium leading-[0.88] tracking-[-0.06em] mb-10 text-[oklch(0.15_0.01_60)]"
              >
                {title}
              </motion.h1>
              <motion.p 
                variants={itemVariants}
                className="text-xl md:text-2xl text-[oklch(0.2_0.01_60/0.64)] leading-relaxed max-w-2xl font-light"
              >
                {subtitle}
              </motion.p>
            </div>

            <motion.aside 
              variants={itemVariants}
              className="summary-card group relative"
            >
              <div className="absolute inset-0 rounded-[24px] bg-[oklch(0.2_0.01_60/0.04)] blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
              <div className="relative rounded-[24px] border border-[oklch(0.2_0.01_60/0.08)] bg-white p-1 shadow-[0_32px_80px_-20px_oklch(0.2_0.01_60/0.12)] transition-all duration-300 ease-eased group-hover:-translate-y-1 group-hover:shadow-[0_48px_96px_-24px_oklch(0.2_0.01_60/0.16)]">
                <button 
                  onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full rounded-[20px] bg-[oklch(0.15_0.01_60)] text-[oklch(0.96_0.01_60)] p-10 min-h-[380px] flex flex-col items-center justify-center gap-8 text-center transition-all duration-300 ease-eased hover:bg-[oklch(0.12_0.01_60)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
                >
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[oklch(0.96_0.01_60/0.4)]">BEGIN</div>
                  <div className="text-5xl font-serif italic tracking-tight">Start reading</div>
                  <div className="text-[15px] text-[oklch(0.96_0.01_60/0.6)] font-mc-sans leading-relaxed px-4">The notes begin below.</div>
                  <motion.div 
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="mt-6 border border-[oklch(0.96_0.01_60/0.15)] rounded-full p-4 group-hover:bg-[oklch(0.96_0.01_60/0.05)] transition-colors duration-300"
                  >
                    <ArrowDown className="h-6 w-6" strokeWidth={1.5} />
                  </motion.div>
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
                        className="group flex-1 flex flex-col items-end gap-6 rounded-[24px] p-8 bg-white border border-[oklch(0.2_0.01_60/0.08)] shadow-[0_8px_24px_oklch(0.2_0.01_60/0.04)] transition-all duration-300 ease-eased hover:-translate-y-1 hover:border-[oklch(0.2_0.01_60/0.15)] hover:shadow-[0_24px_48px_-12px_oklch(0.2_0.01_60/0.08)]"
                      >
                        <div className="flex items-center gap-2 rounded-full bg-[oklch(0.15_0.01_60)] px-6 py-3 text-[oklch(0.96_0.01_60)] transition-all duration-300 group-hover:bg-[oklch(0.1_0.01_60)]">
                          <span className="text-[11px] uppercase tracking-[0.2em] font-bold">Continue</span>
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
