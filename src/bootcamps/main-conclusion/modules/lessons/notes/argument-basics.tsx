import { IntroNotesShell } from "./IntroNotesShell";

const Kicker = ({ children }: { children: string }) => (
  <div className="text-[10px] uppercase tracking-[0.26em] font-bold text-[rgba(26,26,26,0.48)] mb-4">{children}</div>
);

export default function ArgumentBasicsNotes() {
  return (
    <IntroNotesShell
      eyebrow="Lesson 1"
      title="Argument Anatomy."
      subtitle="Learn the structure underneath every LR argument before you start hunting conclusions."
    >
      <section className="p-12 border-b border-[rgba(26,26,26,0.1)]">
        <p className="italic font-serif text-[48px] leading-[1.1] mb-8 text-[#1a1a1a]">An argument is the author making a claim and giving you reasons to accept it.</p>
        <div className="bg-[#FAF7EF] border border-[rgba(26,26,26,0.05)] px-8 py-6 text-[20px] font-serif italic text-[#1a1a1a] mb-8">
          Argument = claim + support
        </div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">
          Before you can run any conclusion test, you need to know the parts. Logical Reasoning is not asking you to react to the topic first. It is asking you to see the structure underneath the topic.
        </p>
      </section>

      <section data-toc data-toc-title="Conclusion and premise" className="grid grid-cols-1 md:grid-cols-2 border-b border-[rgba(26,26,26,0.1)] divide-y md:divide-y-0 md:divide-x divide-[rgba(26,26,26,0.1)]">
        <div className="p-10">
          <Kicker>Conclusion</Kicker>
          <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
            The <strong>conclusion</strong> is what the author wants to prove. It is the point the rest of the argument is trying to establish.
          </p>
          <ul className="text-[18px] leading-[1.6] text-[rgba(26,26,26,0.8)] space-y-3 list-disc pl-5 mt-5">
            <li>It takes a position.</li>
            <li>It is the claim being argued for.</li>
            <li>Other sentences are there to support it.</li>
          </ul>
        </div>
        <div className="p-10">
          <Kicker>Premise</Kicker>
          <p className="text-[18px] leading-[1.68] text-[rgba(26,26,26,0.82)]">
            A <strong>premise</strong> is the reason or evidence the author uses to prove the conclusion.
          </p>
          <ul className="text-[18px] leading-[1.6] text-[rgba(26,26,26,0.8)] space-y-3 list-disc pl-5 mt-5">
            <li>It gives support.</li>
            <li>It explains why the conclusion should be accepted.</li>
            <li>It is doing the proving rather than being proved.</li>
          </ul>
        </div>
      </section>

      <section data-toc data-toc-title="How support works" className="p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>How support works</Kicker>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mb-6">
          Premises support conclusions. That means they are trying to push you toward accepting some other sentence. The conclusion is not just a strong sentence. It is the sentence being carried by the support.
        </p>
        <div className="bg-[#FAF7EF] border border-[rgba(26,26,26,0.08)] p-8">
          <div className="text-[18px] font-bold uppercase tracking-[0.1em] text-[rgba(26,26,26,0.5)] mb-4">Core question</div>
          <div className="text-[26px] font-serif italic text-[#1a1a1a] leading-[1.4]">
            Is this sentence proving something, or is something proving this sentence?
          </div>
        </div>
      </section>

      <section data-toc data-toc-title="Mini breakdown" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>Mini premise / conclusion breakdown</Kicker>
        <div className="bg-white border border-[rgba(26,26,26,0.1)] p-6 my-6 space-y-4">
          <p className="text-[18px] italic text-[#1a1a1a]">
            "The public library should get more city funding. It stays full every afternoon. Students rely on it for tutoring, internet access, and after-school study."
          </p>
          <div className="text-[16px] space-y-3 border-t pt-4">
            <div><span className="font-bold">Conclusion:</span> The public library should get more city funding.</div>
            <div><span className="font-bold">Premise:</span> It stays full every afternoon.</div>
            <div><span className="font-bold">Premise:</span> Students rely on it for tutoring, internet access, and after-school study.</div>
          </div>
        </div>
        <p className="text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)] mt-8">
          The first sentence is the conclusion because the other two sentences are there to prove it. That is the whole game: find the sentence the rest of the stimulus is working on.
        </p>
      </section>

      <section data-toc data-toc-title="What to ask" className="note-section p-10 border-b border-[rgba(26,26,26,0.1)]">
        <Kicker>What to ask</Kicker>
        <div className="space-y-4 text-[20px] leading-[1.68] text-[rgba(26,26,26,0.86)]">
          <p>When you read a stimulus, do not start by asking whether you agree with it.</p>
          <p>Start by asking:</p>
          <ul className="space-y-4 mt-4 list-decimal pl-5">
            <li>What sentence is the author trying to prove?</li>
            <li>What sentence gives the reason or evidence?</li>
            <li>How do those reasons support that claim?</li>
          </ul>
        </div>
      </section>

      <section data-toc data-toc-title="Checkpoint" className="note-section p-10">
        <Kicker>Checkpoint</Kicker>
        <div className="bg-[#1a1a1a] text-[#F5F2ED] p-8 mb-12">
          <p className="text-[20px] leading-[1.68]">
            First learn the anatomy. Then learn the clues. Then verify the conclusion. You are building the structure in the right order now.
          </p>
        </div>
      </section>
    </IntroNotesShell>
  );
}
