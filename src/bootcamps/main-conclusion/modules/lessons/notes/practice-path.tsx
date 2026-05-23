import { IntroNotesShell } from "./IntroNotesShell";
import { Link } from "react-router-dom";

export default function PracticePathNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 5"
      title="Practice Path."
      subtitle="Master LR with our guided practice drills."
    >
      <section data-toc data-toc-title="Indicator Word ID" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">Indicator Word ID</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Practice identifying indicator words for conclusion, premise, pivot, and concession.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.1" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.1</Link>
      </section>

      <section data-toc data-toc-title="X-Ray Drill" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">X-Ray Drill</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Practice labeling sentences as premise, conclusion, or background.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.2" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.2</Link>
      </section>

      <section data-toc data-toc-title="First-Sentence Reading" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">First-Sentence</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Focus on identifying potential conclusion candidates in the first sentence.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.3" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.3</Link>
      </section>

      <section data-toc data-toc-title="Rebuttal vs First-Sentence" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Rebuttal vs First-Sentence</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Practice differentiating between Stash 1 (first sentence) and Stash 2 (after the pivot) structures.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.4" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.4</Link>
      </section>

      <section data-toc data-toc-title="Chain Mapping" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Chain Mapping</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Map the relationship between intermediate and main conclusions.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.5" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.5</Link>
      </section>

      <section data-toc data-toc-title="Pronoun Replacement" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Pronoun Replacement</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Practice replacing pronouns to reveal the true antecedent.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.7" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.7</Link>
      </section>

      <section data-toc data-toc-title="Read and Restate" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Read and Restate</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Practice saying conclusions back in your own words.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.8" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.8</Link>
      </section>

      <section data-toc data-toc-title="Nested Claims" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <div className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-4">Nested Claims</div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">Analyze arguments with layered premises and nested conclusions.</p>
        <Link to="/bootcamp/intro-to-lr/drills/3.9" className="inline-block bg-[#1a1a1a] text-[#F5F2ED] px-6 py-3 rounded-sm text-sm uppercase tracking-[0.20em] font-bold">Start Drill 3.9</Link>
      </section>
    </IntroNotesShell>
  );
}
