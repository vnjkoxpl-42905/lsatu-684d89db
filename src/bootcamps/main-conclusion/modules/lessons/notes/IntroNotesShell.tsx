import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { IntegratedPathRail } from '@/bootcamps/main-conclusion/components/IntegratedPathRail';
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { getNextAction, ActionType } from "@/bootcamps/main-conclusion/content/introToLrPath";

interface IntroNotesShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const getActionLabel = (type: ActionType) => {
  switch (type) {
    case 'note': return 'Next Lesson';
    case 'tool': return 'Next Tool';
    case 'reference': return 'Next Reference';
    case 'checkpoint': return 'Next Checkpoint';
    case 'drill': return 'Next Drill';
    case 'practice': return 'Next Practice';
    case 'capstone': return 'Next Capstone';
    default: return 'Continue';
  }
};

export function IntroNotesShell({ eyebrow, title, subtitle, children }: IntroNotesShellProps) {
  const { pathname } = useLocation();
  const nextAction = getNextAction(pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans">
      <DynamicIslandTOC />
      <div className="flex h-full flex-col gap-4 px-4 py-4 desktop:flex-row desktop:gap-0 desktop:px-0 desktop:py-0">
        <IntegratedPathRail />
        <main className="flex-1 max-w-[1180px] mx-auto px-6 md:px-12">
          {/* Launch / Hero Screen */}
          <section className="launch-screen min-h-screen flex flex-col justify-center grid grid-cols-1 md:grid-cols-[1fr_minmax(330px,390px)] gap-16 items-center py-20">
            <div className="hero-copy">
              <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">{eyebrow}</p>
              <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">{title}</h1>
              <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">{subtitle}</p>
            </div>

            <aside className="summary-card rounded-[20px] border border-[rgba(26,26,26,0.1)] bg-white p-1 shadow-[0_26px_76px_rgba(26,26,26,0.12)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-[2px] hover:border-[rgba(26,26,26,0.18)] hover:shadow-[0_34px_90px_rgba(26,26,26,0.16)] focus-within:-translate-y-[2px] focus-within:border-[rgba(26,26,26,0.18)] focus-within:shadow-[0_34px_90px_rgba(26,26,26,0.16)]">
              <button 
                onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full rounded-[18px] bg-[#1a1a1a] text-[#F5F2ED] p-8 min-h-[350px] flex flex-col items-center justify-center gap-6 text-center transition-all duration-200 ease-out hover:bg-[rgba(26,26,26,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
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

                {/* Integrated Navigation */}
                {nextAction && (
                  <div className="note-navigation bg-[#FAF7EF] border-t border-[rgba(26,26,26,0.1)] p-10 md:p-12">
                    <div className="flex justify-end">
                      <Link 
                        to={nextAction.route} 
                        className="group flex items-center justify-between rounded-[16px] p-8 bg-white border border-[rgba(26,26,26,0.1)] shadow-[0_10px_24px_rgba(26,26,26,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-[2px] hover:border-[rgba(26,26,26,0.22)] hover:shadow-[0_20px_40px_rgba(26,26,26,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.18)] focus-visible:ring-offset-2"
                      >
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.5)] mb-2 capitalize">
                            {getActionLabel(nextAction.type)}
                          </div>
                          <div className="text-2xl font-serif italic mb-1">{nextAction.title}</div>
                          <div className="text-sm text-[rgba(26,26,26,0.6)]">{nextAction.description}</div>
                        </div>
                        <div className="rounded-full bg-[#1a1a1a] text-[#F5F2ED] px-6 py-4 flex items-center gap-3 transition-colors duration-200 group-hover:bg-[rgba(26,26,26,0.88)] ml-4">
                          <span className="text-[12px] uppercase tracking-[0.18em] font-bold">Continue</span>
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
