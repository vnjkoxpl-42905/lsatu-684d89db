import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function PracticePathNotes() {
  return (
    <div className="mc-bootcamp bg-[#FAF7F2] min-h-screen text-[#1a1a1a]">
      <DynamicIslandTOC />
      <article className="prose prose-zinc lg:prose-lg mx-auto py-24 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Practice Path</h1>
        
        <section data-toc data-toc-title="Indicator Word ID" data-toc-depth="2">
          <h2>Indicator Word ID</h2>
          <p>Practice identifying indicator words for conclusion, premise, pivot, and concession.</p>
        </section>

        <section data-toc data-toc-title="X-Ray Drill" data-toc-depth="2">
          <h2>X-Ray Drill</h2>
          <p>Practice labeling sentences as premise, conclusion, or background.</p>
        </section>

        <section data-toc data-toc-title="First-Sentence Reading" data-toc-depth="2">
          <h2>First-Sentence Reading</h2>
          <p>Focus on identifying potential conclusion candidates in the first sentence.</p>
        </section>

        <section data-toc data-toc-title="Rebuttal vs First-Sentence" data-toc-depth="2">
          <h2>Rebuttal vs First-Sentence</h2>
          <p>Practice differentiating between Stash 1 (first sentence) and Stash 2 (after the pivot) structures.</p>
        </section>

        <section data-toc data-toc-title="Chain Mapping" data-toc-depth="2">
          <h2>Chain Mapping</h2>
          <p>Map the relationship between intermediate and main conclusions.</p>
        </section>

        <section data-toc data-toc-title="Pronoun Replacement" data-toc-depth="2">
          <h2>Pronoun Replacement</h2>
          <p>Practice replacing pronouns to reveal the true antecedent.</p>
        </section>

        <section data-toc data-toc-title="Read and Restate" data-toc-depth="2">
          <h2>Read and Restate</h2>
          <p>Practice saying conclusions back in your own words.</p>
        </section>

        <section data-toc data-toc-title="Nested Claims" data-toc-depth="2">
          <h2>Nested Claims</h2>
          <p>Analyze arguments with layered premises and nested conclusions.</p>
        </section>

        <section data-toc data-toc-title="Simulator unlock" data-toc-depth="2">
          <h2>Simulator unlock</h2>
          <p>Once you complete these drills, you'll unlock the Question Simulator.</p>
        </section>
      </article>
    </div>
  );
}
