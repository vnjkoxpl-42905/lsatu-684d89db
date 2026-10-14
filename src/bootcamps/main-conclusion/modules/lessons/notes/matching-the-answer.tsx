import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";
import { Check, AlertTriangle } from "lucide-react";

const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4", className)}>
    {children}
  </div>
);

export default function MatchingTheAnswerNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 4"
      title="Matching the Answer."
      subtitle="Master the techniques to match your plain version of the conclusion to the right answer."
    >
      {/* 1. Opening Section */}
      <section 
        data-toc 
        data-toc-title="The matching mindset" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <p className="font-mc-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] text-[#1a1a1a] tracking-[-0.03em] mb-10 max-w-[18ch]">
          The right answer says the same thing with different clothes.
        </p>
        <div className="max-w-[42rem]">
          <p className="font-mc-sans text-[20px] leading-[1.6] text-[rgba(26,26,26,0.86)]">
            Your job is not to find similar words. Your job is to preserve the author's exact claim. Wrong answers often sound familiar while changing the claim.
          </p>
        </div>
      </section>

      {/* 2. Translation Sequence */}
      <section 
        data-toc 
        data-toc-title="The translation process" 
        className="border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/30"
      >
        <div className="p-12 desktop:p-16 pb-8">
          <Kicker>The translation process</Kicker>
          <p className="font-mc-sans text-[16px] text-[rgba(26,26,26,0.6)] mb-12">
            Translate the conclusion into plain English before you look at the choices.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)] border-t border-[rgba(26,26,26,0.1)]">
          <div className="p-10 desktop:p-12 hover:bg-white transition-colors">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">Step 01</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Say it plainly</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Put the conclusion in your own words before looking at the choices. If you can't say it simply, you don't understand it yet.
            </p>
          </div>
          <div className="p-10 desktop:p-12 hover:bg-white transition-colors">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">Step 02</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Replace vague words</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Turn "this," "they," and "such" into the actual thing being discussed. Vague words often hide the exact referent.
            </p>
          </div>
          <div className="p-10 desktop:p-12 hover:bg-white transition-colors">
            <div className="font-mc-mono text-[11px] uppercase tracking-widest text-[rgba(26,26,26,0.4)] mb-4">Step 03</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Match the answer</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Pick the choice that preserves the same claim. Look for the choice that captures your plain version without adding or subtracting anything.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Preserve Section: Grid */}
      <section 
        data-toc 
        data-toc-title="What must stay the same" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <Kicker>The anchors</Kicker>
        <h2 className="font-mc-serif text-[40px] leading-tight italic mb-12">What must stay the same.</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-8 bg-[#FAF7EF]/40 border border-[rgba(26,26,26,0.08)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-mc-serif text-xl italic mb-2">Type</h3>
                <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)] leading-relaxed">
                  Prediction, judgment, recommendation, causal claim, or comparison. The flavor of the claim cannot change.
                </p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-[#FAF7EF]/40 border border-[rgba(26,26,26,0.08)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-mc-serif text-xl italic mb-2">Force</h3>
                <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)] leading-relaxed">
                  Absolute stays absolute. Hedged stays hedged. Do not turn "some" into "all" or "will" into "might."
                </p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-[#FAF7EF]/40 border border-[rgba(26,26,26,0.08)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-mc-serif text-xl italic mb-2">Scope</h3>
                <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)] leading-relaxed">
                  Do not change the group, amount, or category. If the author is talking about cats, the answer is not about all mammals.
                </p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-[#FAF7EF]/40 border border-[rgba(26,26,26,0.08)]">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-5 w-5 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-mc-serif text-xl italic mb-2">Direction</h3>
                <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)] leading-relaxed">
                  Do not reverse who affects whom or what supports what. Preserve the internal logic of the relationship.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trap Patterns Section */}
      <section 
        data-toc 
        data-toc-title="Trap patterns" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/20"
      >
        <Kicker>Trap Patterns</Kicker>
        <h2 className="font-mc-serif text-3xl italic mb-8">Common trap patterns</h2>
        
        <div className="space-y-3">
          {[
            { label: "Too strong", text: "The answer choice is more absolute than the author's actual claim." },
            { label: "Reverse", text: "The answer flips the premise and conclusion or a causal relationship." },
            { label: "Tense shift", text: "The answer moves from the past to the future or vice versa without reason." },
            { label: "Partial list", text: "The answer captures only one part of a multi-part conclusion." }
          ].map((trap) => (
            <div key={trap.label} className="flex items-center gap-6 p-6 bg-white border border-[rgba(26,26,26,0.1)] group">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-[rgba(26,26,26,0.3)] group-hover:text-[#1a1a1a] transition-colors" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span className="font-mc-mono text-[12px] uppercase tracking-wider font-bold w-32">{trap.label}</span>
                <span className="font-mc-sans text-[16px] text-[rgba(26,26,26,0.7)]">{trap.text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Final Check card */}
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
              The answer can change the words. It cannot change the claim.
            </h2>
            
            <div className="space-y-6 font-mc-sans text-[18px] leading-relaxed text-white/80 border-t border-white/10 pt-10">
              <p>
                Before choosing, ask: did the meaning, force, scope, or direction move?
              </p>
              <div className="font-mc-mono text-[11px] uppercase tracking-[0.2em] text-white/40 pt-4">
                Preserve the claim.
              </div>
            </div>
          </div>
        </div>
      </section>
    </IntroNotesShell>
  );
}
