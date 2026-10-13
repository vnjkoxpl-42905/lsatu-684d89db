import type { ReactNode } from "react";

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]", className)}>
    {children}
  </div>
);

const PhaseHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle: string }) => (
  <div className="border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/30 p-10 md:p-12">
    <div className="flex items-start gap-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a] font-mono text-[14px]">
        {number}
      </div>
      <div>
        <h2 className="mb-2 font-serif text-3xl italic text-[#1a1a1a]">{title}</h2>
        <p className="text-[16px] text-[rgba(26,26,26,0.6)]">{subtitle}</p>
      </div>
    </div>
  </div>
);

const DrillCard = ({
  label,
  name,
  purpose,
  to,
}: {
  label: string;
  name: string;
  purpose: string;
  to: string;
}) => (
  <div className="border border-[rgba(26,26,26,0.1)] bg-white p-8 transition-all hover:border-[rgba(26,26,26,0.28)]">
    <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[rgba(26,26,26,0.4)]">{label}</div>
    <h3 className="mb-3 font-serif text-xl italic text-[#1a1a1a]">{name}</h3>
    <p className="mb-8 text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">{purpose}</p>
    <Link
      to={to}
      className="inline-flex h-12 items-center gap-3 bg-[#1a1a1a] px-6 text-[#F5F2ED] transition-colors hover:bg-[rgba(26,26,26,0.88)]"
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Open</span>
      <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
    </Link>
  </div>
);

export default function PracticePathNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 5"
      title="Practice Path."
      subtitle="Use the live drills and sets in the order they reinforce the curriculum."
    >
      <section data-toc data-toc-title="Launchpad" className="border-b border-[rgba(26,26,26,0.1)] p-10 md:p-12">
        <p className="mb-10 max-w-[18ch] font-serif text-[clamp(2.5rem,6vw,4.5rem)] italic leading-[1.02] tracking-[-0.03em] text-[#1a1a1a]">
          Turn the sequence into reps.
        </p>
        <div className="max-w-[42rem]">
          <p className="text-[20px] leading-[1.6] text-[rgba(26,26,26,0.86)]">
            This page is a launchpad, not a second curriculum. Use the live work that matches the order you just learned.
          </p>
        </div>
      </section>

      <section data-toc data-toc-title="Stimulus and roles">
        <PhaseHeader number="01" title="Stimulus and sentence roles" subtitle="Start by reading the passage closely, then label what each sentence is doing." />
        <div className="grid grid-cols-1 divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)]">
          <DrillCard
            label="Reference"
            name="2-Part Conclusion Check"
            purpose="Revisit the verification rule before you move into hiding-spot work."
            to="/bootcamp/intro-to-lr/reference/2-part-check"
          />
        </div>
      </section>

      <section data-toc data-toc-title="Indicators and verification">
        <PhaseHeader number="02" title="Indicators, candidates, and verification" subtitle="Use indicator words as clues, pick the likely conclusion, and immediately verify the read." />
        <div className="grid grid-cols-1 divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)] md:grid-cols-2 md:divide-x">
          <DrillCard
            label="Drill Lab"
            name="Main Conclusion Lab"
            purpose="Use the replica drill to click the main conclusion directly in full stimuli."
            to="/bootcamp/intro-to-lr/drills/main-conclusion-lab"
          />
          <DrillCard
            label="Reference"
            name="2-Part Conclusion Check"
            purpose="Revisit the verification rule right after the main-conclusion reps so the read stays honest."
            to="/bootcamp/intro-to-lr/reference/2-part-check"
          />
        </div>
      </section>

      <section data-toc data-toc-title="Rebuttal and context">
        <PhaseHeader number="03" title="Rebuttal patterns and context" subtitle="After basic placement work, train the cases where someone else&apos;s view appears first." />
        <div className="grid grid-cols-1 divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)]">
          <DrillCard
            label="Practice Set"
            name="Rebuttal Main Conclusion Practice"
            purpose="Get extra reps on the rebuttal pattern once the structure is familiar."
            to="/guided-drills/rebuttal-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr"
          />
        </div>
      </section>

      <section data-toc data-toc-title="Matching and capstone" className="bg-[#FAF7EF]/20">
        <PhaseHeader number="04" title="Matching and capstone application" subtitle="Finish by translating conclusions cleanly and then applying the full framework under pressure." />
        <div className="grid grid-cols-1 divide-[rgba(26,26,26,0.1)] border-b border-[rgba(26,26,26,0.1)] md:grid-cols-2 md:divide-x">
          <DrillCard
            label="Capstone"
            name="Question Bank"
            purpose="Apply the whole sequence to mixed main-conclusion work."
            to="/bootcamp/intro-to-lr/simulator/bank"
          />
          <DrillCard
            label="Capstone"
            name="Trap Master"
            purpose="Diagnose the recurring traps that still catch you after the core method is in place."
            to="/bootcamp/intro-to-lr/simulator/trap-master"
          />
        </div>
      </section>
    </IntroNotesShell>
  );
}
