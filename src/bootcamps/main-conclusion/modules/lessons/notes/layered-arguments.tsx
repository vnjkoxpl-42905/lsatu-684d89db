import { IntroNotesShell } from "./IntroNotesShell";

export default function LayeredArgumentsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 3"
      title="Layered Arguments."
      subtitle="Master the complexity of multi-layered arguments and hidden claims."
    >
      <section data-toc data-toc-title="Main vs intermediate conclusion" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">Intermediate Conclusions</div>
        <p className="lead-line italic font-serif text-[48px] leading-[1.04] mb-8">An intermediate conclusion is a bridge in the argument chain.</p>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">It is supported by premises and supports the main conclusion. Identifying these bridges is essential to mapping complex arguments.</p>
      </section>

      <section data-toc data-toc-title="Supported and supporting" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">The Bridge Test</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Ask yourself: "Does anything else in the stimulus depend on this sentence?" If yes, it's likely an intermediate conclusion.</p>
      </section>

      <section data-toc data-toc-title="Opposing views" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Opposing Views</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">The author often opens by citing another view, only to push back on it. Do not mistake the opening view for the author's own claim.</p>
      </section>

      <section data-toc data-toc-title="Concessions" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Concessions</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Concession words (granted, although) signal that the author is briefly acknowledging a point before moving to their main argument.</p>
      </section>

      <section data-toc data-toc-title="Trojan Horse structure" className="note-section p-10">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Trojan Horse</div>
        <div className="question-box relative bg-[#FAF7EF] p-8 border border-[rgba(26,26,26,0.1)]">
          <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">The Trojan Horse, a seemingly agreeable opening followed by a pivot, is the classic way the LSAT tests if you can separate the wind-up from the swing.</p>
        </div>
      </section>
    </IntroNotesShell>
  );
}
