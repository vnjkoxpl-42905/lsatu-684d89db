import { IntroNotesShell } from "./IntroNotesShell";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Kicker = ({ children }: { children: string }) => (
  <div className="text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4">{children}</div>
);

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Argument Basics."
      subtitle="Learn how to see claim plus support before answering LR questions."
    >
      <section className="p-12 border-b border-[rgba(26,26,26,0.1)]">
        <p className="italic font-serif text-[48px] leading-[1.1] mb-8 text-[#1a1a1a]">An argument is the author taking a position and giving you reasons to believe it.</p>
        <div className="bg-[#FAF7EF] border border-[rgba(26,26,26,0.05)] px-8 py-6 text-[20px] font-serif italic text-[#1a1a1a] mb-8">
          Argument = claim + support
        </div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">It's a two-part structure: a <strong>claim</strong> (the conclusion) plus <strong>support</strong> (the premises).</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 border-b border-[rgba(26,26,26,0.1)] divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)]">
        <div className="p-10">
          <Kicker>Premises</Kicker>
          <ul className="text-[18px] leading-[1.6] text-[rgba(26,26,26,0.8)] space-y-3 list-disc pl-5">
            <li>Give reasons</li>
            <li>Support the claim</li>
            <li>Accept as given</li>
          </ul>
        </div>
        <div className="p-10">
          <Kicker>Conclusions</Kicker>
          <ul className="text-[18px] leading-[1.6] text-[rgba(26,26,26,0.8)] space-y-3 list-disc pl-5">
            <li>Take a position</li>
            <li>What the author wants proven</li>
            <li>Question carefully</li>
          </ul>
        </div>
      </section>

      <section className="p-10 border-b border-[rgba(26,26,26,0.1)] text-center">
        <div className="text-[18px] font-bold uppercase tracking-[0.1em] text-[rgba(26,26,26,0.5)] mb-4">Accept premises. Question conclusions.</div>
        <div className="text-[22px] font-serif italic text-[#1a1a1a] border-t border-[rgba(26,26,26,0.05)] pt-8">
          What is the author trying to prove?
        </div>
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
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">Before moving on, test the structure:</p>
        <ul className="space-y-4 mt-4 text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] list-decimal pl-5">
          <li>What is the author trying to prove?</li>
          <li>Which sentence gives the reason?</li>
        </ul>
      </section>

      <section data-toc data-toc-title="Checkpoint" className="note-section p-10">
        <Kicker>Checkpoint</Kicker>
        <div className="bg-[#1a1a1a] text-[#F5F2ED] p-8 mb-12">
          <p className="text-[20px] leading-[1.68]">Remember: You do not judge whether the premises are true in real life. You judge how they support the conclusion.</p>
        </div>
      </section>

      <section className="p-10 bg-[#FAF7EF] border-t border-[rgba(26,26,26,0.1)]">
        <Link to="/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide" className="group flex items-center justify-between p-8 bg-white border border-[rgba(26,26,26,0.1)] hover:border-[rgba(26,26,26,0.3)] transition-all">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[rgba(26,26,26,0.5)] mb-2">Next</div>
            <div className="text-2xl font-serif italic mb-1">Where Conclusions Hide</div>
            <div className="text-sm text-[rgba(26,26,26,0.6)]">Learn where authors usually hide the main conclusion.</div>
          </div>
          <div className="bg-[#1a1a1a] text-[#F5F2ED] px-6 py-4 flex items-center gap-3 group-hover:bg-[rgba(26,26,26,0.88)]">
            <span className="text-[12px] uppercase tracking-[0.18em] font-bold">Continue</span>
            <ArrowRight className="h-5 w-5" />
          </div>
        </Link>
      </section>
    </IntroNotesShell>
  );
}
