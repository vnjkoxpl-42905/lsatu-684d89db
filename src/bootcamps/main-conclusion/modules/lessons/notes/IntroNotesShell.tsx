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
        <section className="min-h-[calc(100vh-178px)] flex flex-col justify-center pb-24">
          <p className="text-[10px] uppercase tracking-[0.30em] text-[rgba(26,26,26,0.46)] mb-6">{eyebrow}</p>
          <h1 className="text-[clamp(72px,10vw,136px)] font-serif italic font-medium leading-[0.80] tracking-[-0.08em] mb-8">{title}</h1>
          <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl mb-12">{subtitle}</p>
          
          <button 
            onClick={() => document.getElementById('notesDrawer')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full md:w-auto bg-[#1a1a1a] text-[#F5F2ED] px-8 py-8 rounded-sm text-lg font-bold flex items-center justify-between gap-8 hover:bg-[rgba(26,26,26,0.9)] transition-all"
          >
            <span className="font-serif italic text-3xl">START HERE</span>
            <ArrowRight className="h-6 w-6" />
          </button>
          
          <div className="mt-8 text-[10px] uppercase tracking-[0.22em] text-[rgba(26,26,26,0.46)] font-bold">Scroll down for notes ↓</div>
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
