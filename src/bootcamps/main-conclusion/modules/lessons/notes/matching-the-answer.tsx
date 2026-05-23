import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function MatchingTheAnswerNotes() {
  return (
    <div className="mc-bootcamp bg-[#FAF7F2] min-h-screen text-[#1a1a1a]">
      <DynamicIslandTOC />
      <article className="prose prose-zinc lg:prose-lg mx-auto py-24 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Matching the Answer</h1>
        
        <section data-toc data-toc-title="Say the conclusion back" data-toc-depth="2">
          <h2>Say the conclusion back</h2>
          <p>Once you've identified the conclusion, say it in your own words. This helps you identify if you really understand the argument.</p>
        </section>

        <section data-toc data-toc-title="Replace pronouns" data-toc-depth="2">
          <h2>Replace pronouns</h2>
          <p>Always replace vague pointers ("this," "they," "such") with their actual referents before you commit to an answer. This prevents falling for partial-list traps.</p>
        </section>

        <section data-toc data-toc-title="Preserve conclusion type" data-toc-depth="2">
          <h2>Preserve conclusion type</h2>
          <p>Conclusions come in flavors: prediction, judgment, recommendation, causal, comparison. Make sure the answer choice matches the flavor of the original.</p>
        </section>

        <section data-toc data-toc-title="Preserve force" data-toc-depth="2">
          <h2>Preserve force</h2>
          <p>If the conclusion is absolute (e.g., "will not"), the right answer must be absolute. If it's hedged (e.g., "may"), the right answer must be hedged.</p>
        </section>

        <section data-toc data-toc-title="Preserve scope, tense, and direction" data-toc-depth="2">
          <h2>Preserve scope, tense, and direction</h2>
          <p>Pay attention to the tense and scope. If the conclusion is future-oriented, don't pick a past-tense answer choice.</p>
        </section>

        <section data-toc data-toc-title="Trap answer patterns" data-toc-depth="2">
          <h2>Trap answer patterns</h2>
          <p>Be aware of patterns like Too Strong, Reverse, Tense Shift, and Partial-List. These are standard ways the LSAT creates wrong answer choices.</p>
        </section>
      </article>
    </div>
  );
}
