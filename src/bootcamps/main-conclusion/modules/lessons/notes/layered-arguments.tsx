import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { ArrowRight } from "lucide-react";

const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4", className)}>
    {children}
  </div>
);

export default function LayeredArgumentsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 3"
      title="Layered Arguments."
      subtitle="Master the complexity of multi-layered arguments and hidden claims."
    >
      {/* 1. Opening Section */}
      <section 
        data-toc 
        data-toc-title="Multi-conclusion arguments" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <p className="font-mc-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] text-[#1a1a1a] tracking-[-0.03em] mb-10 max-w-[18ch]">
          Some conclusions do double duty.
        </p>
        <div className="max-w-[42rem]">
          <p className="font-mc-sans text-[20px] leading-[1.6] text-[rgba(26,26,26,0.86)]">
            A sentence can be proven by one claim and then used to prove something bigger. On the LSAT, arguments often stack this way to create layers.
          </p>
        </div>
      </section>

      {/* 2. Argument Chain Section: Visual Flow */}
      <section 
        data-toc 
        data-toc-title="The argument chain" 
        className="border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/30"
      >
        <div className="p-12 desktop:p-16 pb-8 text-center">
          <Kicker>The argument chain</Kicker>
          <p className="font-mc-sans text-[16px] text-[rgba(26,26,26,0.6)] mb-12">
            Follow the flow of support to find the final point.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch border-t border-[rgba(26,26,26,0.1)]">
          <div className="flex-1 p-10 desktop:p-12 flex flex-col items-center text-center">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">Starting Point</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Premise</h3>
            <div className="h-10 w-px bg-[rgba(26,26,26,0.1)] mb-4 hidden md:block" />
            <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">
              Gives support. This is the evidence you accept as true.
            </p>
          </div>
          
          <div className="md:w-12 flex items-center justify-center py-4 md:py-0 bg-[#FAF7EF]/50">
            <ArrowRight className="h-5 w-5 text-[rgba(26,26,26,0.2)] rotate-90 md:rotate-0" />
          </div>

          <div className="flex-1 p-10 desktop:p-12 flex flex-col items-center text-center bg-white shadow-[0_0_40px_rgba(0,0,0,0.02)] relative z-10">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">The Bridge</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Intermediate Conclusion</h3>
            <div className="h-10 w-px bg-[#1a1a1a] mb-4 hidden md:block" />
            <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Receives support and gives support. It bridges the gap between evidence and the final goal.
            </p>
          </div>

          <div className="md:w-12 flex items-center justify-center py-4 md:py-0 bg-[#FAF7EF]/50">
            <ArrowRight className="h-5 w-5 text-[rgba(26,26,26,0.2)] rotate-90 md:rotate-0" />
          </div>

          <div className="flex-1 p-10 desktop:p-12 flex flex-col items-center text-center">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">Final Target</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Main Conclusion</h3>
            <div className="h-10 w-px bg-[rgba(26,26,26,0.1)] mb-4 hidden md:block" />
            <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">
              The final point. Everything in the stimulus is built to prove this claim.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Bridge Test Section */}
      <section 
        data-toc 
        data-toc-title="The Bridge Test" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <div className="max-w-[50rem] mx-auto">
          <div className="bg-[#FAF7EF] border border-[rgba(26,26,26,0.1)] p-10 desktop:p-12">
            <Kicker>The Bridge Test</Kicker>
            <h2 className="font-mc-serif text-3xl italic mb-8 text-[#1a1a1a]">
              If a claim is both supported and supporting, it is probably an intermediate conclusion.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-[rgba(26,26,26,0.1)]">
              <div className="space-y-2">
                <div className="font-mc-mono text-[11px] uppercase tracking-wider text-[rgba(26,26,26,0.4)]">Check 1</div>
                <p className="font-mc-sans text-[17px] text-[rgba(26,26,26,0.8)]">What supports this claim?</p>
              </div>
              <div className="space-y-2">
                <div className="font-mc-mono text-[11px] uppercase tracking-wider text-[rgba(26,26,26,0.4)]">Check 2</div>
                <p className="font-mc-sans text-[17px] text-[rgba(26,26,26,0.8)]">What does this claim support?</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Author's View Section */}
      <section 
        data-toc 
        data-toc-title="Author's position" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <Kicker>Distinguishing the view</Kicker>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="p-8 border border-[rgba(26,26,26,0.06)] hover:border-[rgba(26,26,26,0.12)] transition-colors">
            <h3 className="font-mc-serif text-xl italic mb-4">Opposing view</h3>
            <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">
              A position held by someone else that the author intends to disprove. Usually appears early.
            </p>
          </div>
          <div className="p-8 border border-[rgba(26,26,26,0.06)] hover:border-[rgba(26,26,26,0.12)] transition-colors">
            <h3 className="font-mc-serif text-xl italic mb-4">Concession</h3>
            <p className="font-mc-sans text-[15px] leading-relaxed text-[rgba(26,26,26,0.6)]">
              A point the author acknowledges as true but which does not override the main conclusion.
            </p>
          </div>
          <div className="p-8 bg-[#1a1a1a] text-[#F5F2ED] rounded-[1px]">
            <h3 className="font-mc-serif text-xl italic mb-4">Author's conclusion</h3>
            <p className="font-mc-sans text-[15px] leading-relaxed text-white/70">
              The position the author is actually building toward. This is your target on Main Conclusion questions.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Trojan Horse Section */}
      <section 
        data-toc 
        data-toc-title="Trojan Horse structure" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/20"
      >
        <div className="max-w-[42rem]">
          <Kicker>Common structures</Kicker>
          <h2 className="font-mc-serif text-3xl italic mb-6">The Trojan Horse Opening</h2>
          <p className="font-mc-sans text-[19px] leading-relaxed text-[rgba(26,26,26,0.8)]">
            A Trojan Horse opening sounds agreeable at first. Then the author pivots. The real conclusion usually lives after the turn.
          </p>
        </div>
      </section>

      {/* 6. Final Check card */}
      <section 
        data-toc 
        data-toc-title="Final Check" 
        className="p-12 desktop:p-24"
      >
        <div className="max-w-[54rem] mx-auto">
          <div className="relative p-12 desktop:p-16 bg-[#1a1a1a] text-[#F5F2ED] rounded-[2px] shadow-[var(--shadow-3)] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
            
            <Kicker className="text-white/40">Final Check</Kicker>
            <h2 className="font-mc-serif text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] mb-10">
              Layered arguments ask two questions: what supports this claim, and what does this claim support?
            </h2>
            
            <div className="font-mc-mono text-[12px] uppercase tracking-[0.2em] text-white/40 pt-10 border-t border-white/10">
              Map the chain to find the goal.
            </div>
          </div>
        </div>
      </section>
    </IntroNotesShell>
  );
}
