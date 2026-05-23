import { IntroNotesShell } from "./IntroNotesShell";

export default function MatchingTheAnswerNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 4"
      title="Matching the Answer."
      subtitle="Master the techniques to match your pre-phrased conclusion to the right answer."
    >
      <section data-toc data-toc-title="Say the conclusion back" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">Restatement</div>
        <p className="lead-line italic font-serif text-[48px] leading-[1.04] mb-8">Once you've identified the conclusion, say it in your own words.</p>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">This helps confirm you understand the core argument before you even glance at the choices.</p>
      </section>

      <section data-toc data-toc-title="Replace pronouns" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Pronouns</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Always replace vague pointers ("this," "they," "such") with their actual referents before you commit to an answer. This is the best defense against partial-list traps.</p>
      </section>

      <section data-toc data-toc-title="Preserve conclusion type" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Conclusion Flavors</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Conclusions come in flavors: prediction, judgment, recommendation, causal, comparison. Make sure the answer choice matches the flavor of the original.</p>
      </section>

      <section data-toc data-toc-title="Preserve force" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Preserve Force</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">If the conclusion is absolute (e.g., "will not"), the right answer must be absolute. If it's hedged (e.g., "may"), the right answer must be hedged.</p>
      </section>

      <section data-toc data-toc-title="Preserve scope, tense, and direction" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Scope, Tense, and Direction</div>
        <ul className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] space-y-4">
          <li><strong>Scope:</strong> Do not turn "some" into "all," "many" into "most," or one group into another.</li>
          <li><strong>Tense:</strong> Do not turn past into future, or current into past.</li>
          <li><strong>Direction:</strong> Do not reverse who affects whom or what supports what.</li>
        </ul>
      </section>

      <section data-toc data-toc-title="Trap answer patterns" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Trap patterns</div>
        <div className="question-box relative bg-[#FAF7EF] p-8 border border-[rgba(26,26,26,0.1)]">
          <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Be aware of patterns like Too Strong, Reverse, Tense Shift, and Partial-List. These are standard ways the LSAT creates wrong answer choices.</p>
        </div>
      </section>

      <section data-toc data-toc-title="Checkpoint" className="note-section p-10">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Checkpoint</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Review these points before heading into the final Practice Path.</p>
      </section>
    </IntroNotesShell>
  );
}
