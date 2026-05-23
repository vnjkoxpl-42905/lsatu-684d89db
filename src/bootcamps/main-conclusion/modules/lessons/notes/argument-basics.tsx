import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function ArgumentBasicsNotes() {
  return (
    <div className="mc-bootcamp min-h-screen bg-[#F5F2ED] text-[#1a1a1a] font-sans">
      <DynamicIslandTOC />
      
      <main className="max-w-[920px] mx-auto py-24 px-6 md:px-12">
        <article className="intro-notes-article">
          <header className="intro-notes-hero mb-24">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)] mb-6">LESSON 1</p>
            <h1 className="text-[clamp(48px,8vw,96px)] font-serif italic font-medium leading-[0.85] tracking-[-0.05em] mb-6">Argument Basics.</h1>
            <p className="text-xl md:text-2xl text-[rgba(26,26,26,0.6)] leading-relaxed max-w-2xl">Learn how to see claim plus support before answering LR questions.</p>
          </header>

          <section data-toc data-toc-title="Claim plus support" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">Claim plus support</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">An argument is the author taking a position and giving you reasons to believe it. It's a simple, two-part structure: a claim (the conclusion) plus support (the premises).</p>
          </section>

          <section data-toc data-toc-title="Premises" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">Premises</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">Premises are the reasons the author provides. On the LSAT, you accept premises as given. Do not argue with them, even if they sound strange.</p>
          </section>

          <section data-toc data-toc-title="Conclusions" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">Conclusions</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">The conclusion is the claim the author wants you to believe. This is what the premises are built to support. Question this claim—this is where the argument's validity lives.</p>
          </section>

          <section data-toc data-toc-title="2-Part Conclusion Check" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">2-Part Conclusion Check</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)] mb-6">Run these two checks on every candidate:</p>
            <ol className="list-decimal pl-6 space-y-4 text-lg md:text-xl text-[rgba(26,26,26,0.86)]">
              <li><strong>Is it an opinion?</strong> Does it sound like a judgment, recommendation, or prediction?</li>
              <li><strong>Is it supported?</strong> Is there at least one other claim in the stimulus aimed at proving it?</li>
            </ol>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)] mt-6">If the answer to both is "yes," it's your main conclusion.</p>
          </section>

          <section data-toc data-toc-title="Monica example" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">Monica example</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">Consider the Monica example: "Monica claimed she caused the dinosaur extinction; everything Monica claims is true; therefore, Monica caused the dinosaur extinction." The premises are silly, but the structure is perfectly valid.</p>
          </section>

          <section data-toc data-toc-title="Your turn" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)]">
            <h2 className="text-3xl font-serif italic mb-6">Your turn</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">Practice identifying roles in the drill below.</p>
          </section>

          <section data-toc data-toc-title="Checkpoint" data-toc-depth="2" className="py-12 border-t border-[rgba(26,26,26,0.1)] mb-24">
            <h2 className="text-3xl font-serif italic mb-6">Checkpoint</h2>
            <p className="text-lg md:text-xl leading-relaxed text-[rgba(26,26,26,0.86)]">Remember: Premise truth is given. The whole argumentative game is about how the premises fit together—not whether they are world-true.</p>
          </section>
        </article>
      </main>
    </div>
  );
}
