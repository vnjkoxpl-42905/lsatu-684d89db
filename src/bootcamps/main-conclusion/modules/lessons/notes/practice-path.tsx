import { IntroNotesShell } from "./IntroNotesShell";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4", className)}>
    {children}
  </div>
);

const DrillCard = ({ 
  id, 
  name, 
  purpose, 
  to 
}: { 
  id: string; 
  name: string; 
  purpose: string; 
  to: string 
}) => (
  <div className="group bg-white border border-[rgba(26,26,26,0.1)] p-8 transition-all hover:border-[rgba(26,26,26,0.3)]">
    <div className="font-mc-mono text-[10px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-3">
      Drill {id}
    </div>
    <h3 className="font-mc-serif text-xl italic mb-3 text-[#1a1a1a]">
      {name}
    </h3>
    <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)] mb-8">
      {purpose}
    </p>
    <Link 
      to={to} 
      className="inline-flex h-12 items-center gap-3 bg-[#1a1a1a] px-6 text-[#F5F2ED] transition-colors hover:bg-[rgba(26,26,26,0.88)]"
    >
      <span className="font-bold uppercase tracking-[0.16em] text-[11px]">Start drill</span>
      <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
    </Link>
  </div>
);

const PhaseHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle: string }) => (
  <div className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/30">
    <div className="flex items-start gap-6">
      <div className="h-10 w-10 rounded-full border border-[#1a1a1a] flex items-center justify-center font-mc-mono text-[14px] shrink-0">
        {number}
      </div>
      <div>
        <h2 className="font-mc-serif text-3xl italic mb-2 text-[#1a1a1a]">{title}</h2>
        <p className="font-mc-sans text-[16px] text-[rgba(26,26,26,0.6)]">{subtitle}</p>
      </div>
    </div>
  </div>
);

export default function PracticePathNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 5"
      title="Practice Path."
      subtitle="Master LR with our guided practice drills."
    >
      {/* 1. Opening Section */}
      <section 
        data-toc 
        data-toc-title="The launchpad" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <p className="font-mc-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] text-[#1a1a1a] tracking-[-0.03em] mb-10 max-w-[18ch]">
          Now turn recognition into reps.
        </p>
        <div className="max-w-[42rem]">
          <p className="font-mc-sans text-[20px] leading-[1.6] text-[rgba(26,26,26,0.86)]">
            You have the method. The drills teach your eye to find the conclusion under pressure. Work through the phases to build your speed and precision.
          </p>
        </div>
      </section>

      {/* Phase 1: Notice the signals */}
      <section data-toc data-toc-title="Phase 1: Signals">
        <PhaseHeader 
          number="01" 
          title="Notice the signals" 
          subtitle="Train your eye to spot the indicators and structures that reveal the conclusion's hiding spots." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)]">
          <DrillCard 
            id="3.1" 
            name="Indicator Word ID" 
            purpose="Practice identifying indicator words for conclusion, premise, pivot, and concession." 
            to="/bootcamp/intro-to-lr/drills/3.1" 
          />
          <DrillCard 
            id="3.3" 
            name="First-Sentence Reading" 
            purpose="Focus on identifying potential conclusion candidates in the first sentence." 
            to="/bootcamp/intro-to-lr/drills/3.3" 
          />
          <DrillCard 
            id="3.4" 
            name="Rebuttal vs First-Sentence" 
            purpose="Practice differentiating between structures where the author pivots from an opening view." 
            to="/bootcamp/intro-to-lr/drills/3.4" 
          />
        </div>
      </section>

      {/* Phase 2: Map the structure */}
      <section data-toc data-toc-title="Phase 2: Structure">
        <PhaseHeader 
          number="02" 
          title="Map the structure" 
          subtitle="Break down layered arguments and bridge the gap between evidence and the final goal." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)]">
          <DrillCard 
            id="3.2" 
            name="Sentence Role Drill" 
            purpose="Practice labeling sentences as premise, conclusion, or background." 
            to="/bootcamp/intro-to-lr/drills/3.2" 
          />
          <DrillCard 
            id="3.5" 
            name="Chain Mapping" 
            purpose="Map the relationship between intermediate and main conclusions." 
            to="/bootcamp/intro-to-lr/drills/3.5" 
          />
          <DrillCard 
            id="3.9" 
            name="Nested Claims" 
            purpose="Analyze arguments with layered premises and nested conclusions." 
            to="/bootcamp/intro-to-lr/drills/3.9" 
          />
        </div>
      </section>

      {/* Phase 3: Match the meaning */}
      <section data-toc data-toc-title="Phase 3: Meaning">
        <PhaseHeader 
          number="03" 
          title="Match the meaning" 
          subtitle="Translate the author's exact claim into plain English and match it to the correct answer choice." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)]">
          <DrillCard 
            id="3.7" 
            name="Vague Word Replacement" 
            purpose="Practice replacing vague words with the actual thing being discussed." 
            to="/bootcamp/intro-to-lr/drills/3.7" 
          />
          <DrillCard 
            id="3.8" 
            name="Read and Restate" 
            purpose="Practice saying conclusions back in your own words before looking at the choices." 
            to="/bootcamp/intro-to-lr/drills/3.8" 
          />
          <div className="hidden lg:block bg-[#FAF7EF]/10 p-8 border-l border-[rgba(26,26,26,0.1)]" />
        </div>
      </section>

      {/* Final Check card */}
      <section 
        data-toc 
        data-toc-title="Training Mindset" 
        className="p-12 desktop:p-24 bg-[#FAF7EF]/20"
      >
        <div className="max-w-[54rem] mx-auto">
          <div className="relative p-12 desktop:p-16 bg-[#1a1a1a] text-[#F5F2ED] rounded-[2px] shadow-[var(--shadow-3)] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
            
            <Kicker className="text-white/40">Training Mindset</Kicker>
            <h2 className="font-mc-serif text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] mb-10">
              Do not rush the reps.
            </h2>
            
            <div className="space-y-6 font-mc-sans text-[18px] leading-relaxed text-white/80 border-t border-white/10 pt-10">
              <p>
                Each drill is training one move. Get the move clean before you try to get it fast.
              </p>
              <div className="font-mc-mono text-[11px] uppercase tracking-[0.2em] text-white/40 pt-4">
                Precision first. Speed later.
              </div>
            </div>
          </div>
        </div>
      </section>
    </IntroNotesShell>
  );
}
