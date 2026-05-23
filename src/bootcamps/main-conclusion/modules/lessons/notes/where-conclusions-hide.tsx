import { IntroNotesShell } from "./IntroNotesShell";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4", className)}>
    {children}
  </div>
);

export default function WhereConclusionsHideNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 2"
      title="Where Conclusions Hide."
      subtitle="The conclusion is not always last. Learn to spot it in its favorite hiding places."
    >
      {/* 1. Opening Section: Strong Teaching Line */}
      <section 
        data-toc 
        data-toc-title="Conclusion placement" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)]"
      >
        <p className="font-mc-serif italic text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] text-[#1a1a1a] tracking-[-0.03em] mb-10 max-w-[18ch]">
          The conclusion is not always where school trained you to look.
        </p>
        <div className="max-w-[42rem]">
          <p className="font-mc-sans text-[20px] leading-[1.6] text-[rgba(26,26,26,0.86)]">
            On the LSAT, authors are tactical. They know you expect the big finish, so they bury their point where you're most likely to skim past it.
          </p>
        </div>
      </section>

      {/* 2. Hiding Spots Section: Structured Grid */}
      <section 
        data-toc 
        data-toc-title="Common hiding spots" 
        className="border-b border-[rgba(26,26,26,0.1)]"
      >
        <div className="p-12 desktop:p-16 pb-8">
          <Kicker>Common hiding spots</Kicker>
          <p className="font-mc-sans text-[16px] text-[rgba(26,26,26,0.6)] mb-12">
            Common conclusion hiding spots.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)] border-t border-[rgba(26,26,26,0.1)]">
          <div className="p-10 desktop:p-12 hover:bg-[#FAF7EF]/30 transition-colors">
            <div className="h-8 w-8 rounded-full border border-[#1a1a1a] flex items-center justify-center font-mc-mono text-[12px] mb-6">01</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">First sentence</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              The opening verdict. If the first sentence sounds like a judgment, treat it as a candidate and look for support.
            </p>
          </div>
          <div className="p-10 desktop:p-12 hover:bg-[#FAF7EF]/30 transition-colors">
            <div className="h-8 w-8 rounded-full border border-[#1a1a1a] flex items-center justify-center font-mc-mono text-[12px] mb-6">02</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">After the pivot</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Watch for "but," "however," or "yet." Authors love to open with someone else's view, then pivot to their own point.
            </p>
          </div>
          <div className="p-10 desktop:p-12 hover:bg-[#FAF7EF]/30 transition-colors">
            <div className="h-8 w-8 rounded-full border border-[#1a1a1a] flex items-center justify-center font-mc-mono text-[12px] mb-6">03</div>
            <h3 className="font-mc-serif text-2xl italic mb-4">Between setup and evidence</h3>
            <p className="font-mc-sans text-[17px] leading-relaxed text-[rgba(26,26,26,0.8)]">
              Sometimes the author gives context first, then states the point, then gives support. The conclusion is the claim the rest of the argument is built around.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Indicators Section: Better Rhythm */}
      <section 
        data-toc 
        data-toc-title="Indicator words" 
        className="p-12 desktop:p-16 border-b border-[rgba(26,26,26,0.1)] bg-[#FAF7EF]/20"
      >
        <Kicker>Signposts</Kicker>
        <div className="flex flex-col lg:flex-row gap-12 lg:items-start">
          <div className="lg:w-1/3">
            <h2 className="font-mc-serif text-[40px] leading-tight italic mb-6">Indicators are clues, not proof.</h2>
            <p className="font-mc-sans text-[18px] text-[rgba(26,26,26,0.7)] leading-relaxed">
              Signposts like "therefore" or "because" point you in the right direction, but they can be used for intermediate points too.
            </p>
          </div>
          
          <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-8 bg-white border border-[rgba(26,26,26,0.1)] shadow-sm">
              <div className="font-mc-mono text-[11px] uppercase tracking-wider text-[rgba(26,26,26,0.4)] mb-4">Conclusion indicators</div>
              <p className="font-mc-sans font-bold text-[#1a1a1a] mb-2">Thus, So, Therefore, Hence</p>
              <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)]">These point to claims the author wants you to notice.</p>
            </div>
            <div className="p-8 bg-white border border-[rgba(26,26,26,0.1)] shadow-sm">
              <div className="font-mc-mono text-[11px] uppercase tracking-wider text-[rgba(26,26,26,0.4)] mb-4">Premise indicators</div>
              <p className="font-mc-sans font-bold text-[#1a1a1a] mb-2">Because, Since, For, After all</p>
              <p className="font-mc-sans text-[15px] text-[rgba(26,26,26,0.6)]">These mark the "why" that supports the conclusion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Rule Card: Final Memorability */}
      <section 
        data-toc 
        data-toc-title="Final Check" 
        className="p-12 desktop:p-24"
      >
        <div className="max-w-[54rem] mx-auto">
          <div className="relative p-12 desktop:p-16 bg-[#1a1a1a] text-[#F5F2ED] rounded-[2px] shadow-[var(--shadow-3)] overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
            
            <Kicker className="text-white/40">Final Check</Kicker>
            <h2 className="font-mc-serif text-[clamp(2rem,5vw,3.5rem)] italic leading-[1.1] mb-10">
              Location gives you a candidate. Support confirms the conclusion.
            </h2>
            
            <div className="space-y-6 font-mc-sans text-[18px] leading-relaxed text-white/80 border-t border-white/10 pt-10">
              <p>
                Indicators and pivots tell you where to look. Support tells you whether you found the conclusion.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
                <li>
                  <div className="font-mc-mono text-[10px] uppercase tracking-widest text-white/40 mb-2">Check 1</div>
                  <strong>Is it an opinion?</strong>
                  <div className="text-[15px] mt-1 text-white/60">Does it take a position?</div>
                </li>
                <li>
                  <div className="font-mc-mono text-[10px] uppercase tracking-widest text-white/40 mb-2">Check 2</div>
                  <strong>Is it supported?</strong>
                  <div className="text-[15px] mt-1 text-white/60">Does everything else point to it?</div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="font-mc-mono text-[12px] uppercase tracking-[0.2em] text-[rgba(26,26,26,0.4)]">
              Verify your candidate before committing to it.
            </p>
          </div>
        </div>
      </section>
    </IntroNotesShell>
  );
}
