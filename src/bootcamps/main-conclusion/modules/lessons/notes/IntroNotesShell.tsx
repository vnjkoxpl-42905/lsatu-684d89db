import { ReactNode } from "react";
import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";
import { ArrowRight } from "lucide-react";

interface IntroNotesShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function IntroNotesShell({ eyebrow, title, subtitle, children }: IntroNotesShellProps) {
  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans">
      <DynamicIslandTOC />

      <main className="max-w-[1180px] mx-auto px-6 md:px-12 py-16">
        {/* Launch / Hero Screen */}
        <section className="launch-screen min-h-[calc(100vh-178px)] grid grid-cols-1 md:grid-cols-[1fr_minmax(330px,390px)] gap-16 items-center pb-32">
          <div className="hero-copy">
            <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">{eyebrow}</p>
            <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">{title}</h1>
            <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">{subtitle}</p>
          </div>

          <aside className="summary-card bg-white border border-[rgba(26,26,26,0.1)] p-1 shadow-[0_26px_76px_rgba(26,26,26,0.12)]">
            <div className="summary-inner bg-[#1a1a1a] text-[#F5F2ED] p-8 min-h-[350px] flex flex-col justify-between">
              <div>
                <button 
                  onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full bg-[#1a1a1a] border border-[rgba(245,242,237,0.1)] text-[#F5F2ED] p-8 text-left hover:bg-[rgba(245,242,237,0.08)] transition-all"
                >
                  <div className="text-3xl font-serif italic mb-6">START HERE</div>
                  <div className="flex justify-end"><ArrowRight className="h-8 w-8" /></div>
                </button>
              </div>
              <div className="scroll-hint border-t border-[rgba(245,242,237,0.12)] pt-6 mt-8 text-[10px] uppercase tracking-[0.22em] text-[rgba(245,242,237,0.46)] font-bold">
                Scroll down for notes ↓
              </div>
            </div>
          </aside>
        </section>

        {/* Notes Drawer */}
        <section className="notes-drawer pb-32" id="notesDrawer">
          <div className="drawer-shell max-w-[920px] mx-auto">
            <article className="note-card bg-white border border-[rgba(26,26,26,0.1)] shadow-[0_14px_34px_rgba(26,26,26,0.075)]">
              {children}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
