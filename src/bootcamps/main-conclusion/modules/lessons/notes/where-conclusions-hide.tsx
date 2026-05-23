import { IntroNotesShell } from "./IntroNotesShell";

export default function WhereConclusionsHideNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 2"
      title="Where Conclusions Hide."
      subtitle="The conclusion is not always last. Learn to spot it in its favorite hiding places."
    >
      <section data-toc data-toc-title="Conclusion placement" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">Conclusion placement</div>
        <p className="lead-line italic font-serif text-[48px] leading-[1.04] mb-8">School taught you the conclusion comes last. The LSAT knows that.</p>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">On Main Conclusion questions, the conclusion is almost never last. Train your eye to scan for it elsewhere.</p>
      </section>

      <section data-toc data-toc-title="Hiding spot: first sentence" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">First sentence</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">The opening verdict. If the first sentence sounds like an author's opinion or goal, treat it as a candidate conclusion and verify with the support test.</p>
      </section>

      <section data-toc data-toc-title="Hiding spot: after the pivot" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">After the pivot</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Arguments often open with someone else's view. Watch for pivot words (but, however, yet). The author's conclusion lives on the far side of that turn.</p>
      </section>

      <section data-toc data-toc-title="Indicators as clues" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Indicators</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Use indicator words as signposts. Conclusion indicators point to candidates. Premise indicators (FABS: For, After all, Because, Since) identify support. Pivot and concession indicators warn of coming turns in the argument.</p>
      </section>

      <section data-toc data-toc-title="Run the 2-Part Check" className="note-section p-10">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">2-Part Check</div>
        <div className="question-box relative bg-[#FAF7EF] p-8 border border-[rgba(26,26,26,0.1)]">
          <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">No matter where you think the conclusion is, run the 2-Part Conclusion Check (opinion + support) to confirm it.</p>
        </div>
      </section>
    </IntroNotesShell>
  );
}
