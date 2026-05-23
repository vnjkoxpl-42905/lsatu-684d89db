import { IntroNotesShell } from "./IntroNotesShell";

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Argument Basics."
      subtitle="Learn how to see claim plus support before answering LR questions."
    >
      <section data-toc data-toc-title="Claim plus support" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">Claim plus support</div>
        <p className="lead-line italic font-serif text-[48px] leading-[1.04] mb-8">An argument is the author taking a position and giving you reasons to believe it.</p>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">It's a simple, two-part structure: a <strong>claim</strong> (the conclusion) plus <strong>support</strong> (the premises).</p>
      </section>

      <section data-toc data-toc-title="Premises" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Premises</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Premises are the reasons the author provides. On the LSAT, you accept premises as given. Do not argue with them, even if they sound strange. They are just the building blocks.</p>
      </section>

      <section data-toc data-toc-title="Conclusions" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Conclusions</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">The conclusion is the claim the author wants you to believe. This is what the premises are built to support. Question this claim. This is where the argument's validity lives.</p>
      </section>

      <section data-toc data-toc-title="2-Part Conclusion Check" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">2-Part Conclusion Check</div>
        <div className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">
          <p>Run these two checks on every candidate:</p>
          <ul className="space-y-4 mt-4 list-decimal pl-5">
            <li><strong>Is it an opinion?</strong> Does it sound like a judgment, recommendation, or prediction?</li>
            <li><strong>Is it supported?</strong> Is there at least one other claim in the stimulus aimed at proving it?</li>
          </ul>
          <p className="mt-4">If the answer to both is "yes," it's your main conclusion.</p>
        </div>
      </section>

      <section data-toc data-toc-title="Monica example" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Monica example</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">"Monica claimed she caused the dinosaur extinction; everything Monica claims is true; therefore, Monica caused the dinosaur extinction."</p>
        <div className="mt-6 text-[18px] text-[rgba(26,26,26,0.7)] italic">The premises are silly, but the structure is perfectly valid.</div>
      </section>

      <section data-toc data-toc-title="Your turn" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Your turn</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">You will practice this in the X-Ray Drill during the Practice Path. For now, make sure you can explain which sentence is the conclusion and which sentences support it.</p>
      </section>

      <section data-toc data-toc-title="Checkpoint" className="note-section p-10">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Checkpoint</div>
        <div className="question-box relative bg-[#FAF7EF] p-8 border border-[rgba(26,26,26,0.1)]">
          <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Remember: Premise truth is given. The whole argumentative game is about how the premises fit together—not whether they are world-true.</p>
        </div>
      </section>
    </IntroNotesShell>
  );
}
