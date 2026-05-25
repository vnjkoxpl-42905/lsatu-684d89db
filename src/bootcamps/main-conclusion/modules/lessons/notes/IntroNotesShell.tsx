import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
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

      <main className="max-w-[1180px] mx-auto px-6 md:px-12">
        {/* ... (Hero section same) */}

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
                      className="group flex items-center justify-between p-8 bg-white border border-[rgba(26,26,26,0.1)] hover:border-[rgba(26,26,26,0.3)] transition-all"
                    >
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.5)] mb-2">
                          {getActionLabel(nextAction.type)}
                        </div>
                        <div className="text-2xl font-serif italic mb-1">{nextAction.title}</div>
                        <div className="text-sm text-[rgba(26,26,26,0.6)]">{nextAction.description}</div>
                      </div>
                      <div className="bg-[#1a1a1a] text-[#F5F2ED] px-6 py-4 flex items-center gap-3 group-hover:bg-[rgba(26,26,26,0.88)] ml-4">
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
  );
}
