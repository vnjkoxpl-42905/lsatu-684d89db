import { IntroNotesShell } from "./IntroNotesShell";

const Kicker = ({ children }: { children: string }) => (
  <div className="text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4">{children}</div>
);

const RuleCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#FAF7EF] border-l-4 border-[#1a1a1a] px-6 py-4 my-6 text-[22px] font-serif italic">
    {children}
  </div>
);

const HoldThis = ({ children }: { children: string }) => (
  <div className="bg-[#1a1a1a] text-[#FAF7EF] px-6 py-4 my-8 font-bold text-[14px] uppercase tracking-[0.1em]">
    HOLD THIS: {children}
  </div>
);

const MiniPrompt = ({ children }: { children: string }) => (
  <div className="text-[18px] text-[rgba(26,26,26,0.7)] border-t border-[rgba(26,26,26,0.1)] pt-6 mt-6 italic">
    {children}
  </div>
);

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Argument Basics."
      subtitle="Learn how to see claim plus support before answering LR questions."
    >
      <section data-toc data-toc-title="Claim plus support" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Claim plus support</Kicker>
        <p className="italic font-serif text-[48px] leading-[1.1] mb-8 text-[#1a1a1a]">An argument is the author taking a position and giving you reasons to believe it.</p>
        <RuleCard>Argument = claim + support</RuleCard>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">It's a simple, two-part structure: a <strong>claim</strong> (the conclusion) plus <strong>support</strong> (the premises).</p>
      </section>

      <section data-toc data-toc-title="Premises" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Premises</Kicker>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Premises are the reasons the author provides. They are just the building blocks.</p>
        <HoldThis>ACCEPT PREMISES. QUESTION CONCLUSIONS.</HoldThis>
      </section>

      <section data-toc data-toc-title="Conclusions" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Conclusions</Kicker>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">The conclusion is the claim the author wants you to believe. This is what the premises are built to support.</p>
        <MiniPrompt>What is the author trying to prove?</MiniPrompt>
      </section>

      <section data-toc data-toc-title="2-Part Conclusion Check" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>2-Part Conclusion Check</Kicker>
        <div className="bg-[#FAF7EF] border border-[rgba(26,26,26,0.1)] p-8">
          <p className="text-[20px] font-bold mb-6">Run these two checks on every candidate:</p>
          <ul className="space-y-4 text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] list-decimal pl-5">
            <li><strong>Is it an opinion?</strong> Does it sound like a judgment, recommendation, or prediction?</li>
            <li><strong>Is it supported?</strong> Is there at least one other claim in the stimulus aimed at proving it?</li>
          </ul>
        </div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mt-8">If both are yes, you have your main conclusion.</p>
      </section>

      <section data-toc data-toc-title="Monica example" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Monica example</Kicker>
        <div className="bg-white border border-[rgba(26,26,26,0.1)] p-6 my-6">
          <p className="text-[18px] italic mb-6">"Monica claimed she caused the dinosaur extinction; everything Monica claims is true; therefore, Monica caused the dinosaur extinction."</p>
          <div className="text-[16px] space-y-2 border-t pt-4">
            <div><span className="font-bold">Premise:</span> everything Monica claims is true</div>
            <div><span className="font-bold">Conclusion:</span> Monica caused the dinosaur extinction</div>
          </div>
        </div>
        <p className="text-[18px] text-[rgba(26,26,26,0.7)] italic">Silly premises can still create valid structure.</p>
      </section>

      <section data-toc data-toc-title="Your turn" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Your turn</Kicker>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">You will practice this in the X-Ray Drill during the Practice Path. For now, make sure you can explain which sentence is the conclusion and which sentences support it.</p>
      </section>

      <section data-toc data-toc-title="Checkpoint" className="note-section p-10">
        <Kicker>Checkpoint</Kicker>
        <div className="bg-[#1a1a1a] text-[#F5F2ED] p-8">
          <p className="text-[20px] leading-[1.68]">Remember: Premise truth is given. The whole argumentative game is about how the premises fit together, not whether they are world-true.</p>
        </div>
      </section>
    </IntroNotesShell>
  );
}
