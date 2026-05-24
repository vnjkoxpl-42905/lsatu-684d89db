import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface IntroNotesShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const LESSON_FLOW = [
  { 
    id: 'argument-basics', 
    title: 'Argument Basics', 
    path: '/bootcamp/intro-to-lr/lessons/notes/argument-basics', 
    description: 'Learn how to see claim plus support before answering LR questions.' 
  },
  { 
    id: 'where-conclusions-hide', 
    title: 'Where Conclusions Hide', 
    path: '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide', 
    description: 'Learn where authors usually hide the main conclusion.' 
  },
  { 
    id: 'layered-arguments', 
    title: 'Layered Arguments', 
    path: '/bootcamp/intro-to-lr/lessons/notes/layered-arguments', 
    description: 'Master the complexity of multi-layered arguments.' 
  },
  { 
    id: 'matching-the-answer', 
    title: 'Matching the Answer', 
    path: '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer', 
    description: 'Learn how to translate your conclusion to the right answer choice.' 
  },
  { 
    id: 'practice-path', 
    title: 'Practice Path', 
    path: '/bootcamp/intro-to-lr/lessons/notes/practice-path', 
    description: 'Start your active reps with guided practice drills.' 
  },
];

export function IntroNotesShell({ eyebrow, title, subtitle, children }: IntroNotesShellProps) {
  const { pathname } = useLocation();
  
  const currentIndex = LESSON_FLOW.findIndex(l => pathname === l.path);
  const prevLesson = currentIndex > 0 ? LESSON_FLOW[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < LESSON_FLOW.length - 1 ? LESSON_FLOW[currentIndex + 1] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans">
      <DynamicIslandTOC />

      <main className="max-w-[1180px] mx-auto px-6 md:px-12">
        {/* Launch / Hero Screen */}
        <section className="launch-screen min-h-screen flex flex-col justify-center grid grid-cols-1 md:grid-cols-[1fr_minmax(330px,390px)] gap-16 items-center py-20">
          <div className="hero-copy">
            <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">{eyebrow}</p>
            <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">{title}</h1>
            <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">{subtitle}</p>
          </div>

          <aside className="summary-card bg-white border border-[rgba(26,26,26,0.1)] p-1 shadow-[0_26px_76px_rgba(26,26,26,0.12)]">
            <button 
              onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full bg-[#1a1a1a] text-[#F5F2ED] p-8 min-h-[350px] flex flex-col items-center justify-center gap-6 text-center hover:bg-[rgba(26,26,26,0.9)] transition-all"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[rgba(245,242,237,0.46)]">BEGIN</div>
              <div className="text-4xl font-serif italic">Start reading</div>
              <div className="text-sm text-[rgba(245,242,237,0.6)]">The notes begin below.</div>
              <div className="mt-4 border border-[rgba(245,242,237,0.2)] rounded-full p-3">
                <ArrowDown className="h-6 w-6" />
              </div>
            </button>
          </aside>
        </section>

        {/* Notes Drawer */}
        <section className="notes-drawer pb-32" id="notesDrawer">
          <div className="drawer-shell max-w-[920px] mx-auto">
            <article className="note-card bg-white border border-[rgba(26,26,26,0.1)] shadow-[0_14px_34px_rgba(26,26,26,0.075)] overflow-hidden">
              <div className="note-content">
                {children}
              </div>

              {/* Shared Navigation */}
              {(prevLesson || nextLesson) && (
                <div className="note-navigation bg-[#FAF7EF] border-t border-[rgba(26,26,26,0.1)] p-10 md:p-12">
                  <div className={nextLesson && prevLesson ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "flex justify-end"}>
                    {prevLesson && (
                      <Link 
                        to={prevLesson.path} 
                        className="group flex items-center justify-between p-8 bg-white border border-[rgba(26,26,26,0.08)] hover:border-[rgba(26,26,26,0.2)] transition-all"
                      >
                        <div className="flex items-center gap-6">
                          <ArrowLeft className="h-5 w-5 text-[rgba(26,26,26,0.3)] group-hover:text-[#1a1a1a] transition-colors" />
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.4)] mb-1">Previous</div>
                            <div className="text-xl font-serif italic">{prevLesson.title}</div>
                          </div>
                        </div>
                      </Link>
                    )}

                    {nextLesson && (
                      <Link 
                        to={nextLesson.path} 
                        className="group flex items-center justify-between p-8 bg-white border border-[rgba(26,26,26,0.1)] hover:border-[rgba(26,26,26,0.3)] transition-all"
                      >
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.5)] mb-2">Next</div>
                          <div className="text-2xl font-serif italic mb-1">{nextLesson.title}</div>
                          <div className="text-sm text-[rgba(26,26,26,0.6)]">{nextLesson.description}</div>
                        </div>
                        <div className="bg-[#1a1a1a] text-[#F5F2ED] px-6 py-4 flex items-center gap-3 group-hover:bg-[rgba(26,26,26,0.88)] ml-4">
                          <span className="text-[12px] uppercase tracking-[0.18em] font-bold">Continue</span>
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
