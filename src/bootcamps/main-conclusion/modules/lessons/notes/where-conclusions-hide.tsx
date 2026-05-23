import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function WhereConclusionsHideNotes() {
  return (
    <div className="mc-bootcamp bg-[#FAF7F2] min-h-screen text-[#1a1a1a]">
      <DynamicIslandTOC />
      <article className="prose prose-zinc lg:prose-lg mx-auto py-24 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Where Conclusions Hide</h1>
        
        <section data-toc data-toc-title="The conclusion is not always last" data-toc-depth="2">
          <h2>The conclusion is not always last</h2>
          <p>School taught you to look for conclusions at the end. The LSAT writers know that and often hide the conclusion elsewhere.</p>
        </section>

        <section data-toc data-toc-title="Hiding spot 1: first sentence" data-toc-depth="2">
          <h2>Hiding spot 1: first sentence</h2>
          <p>Often, the author opens with their verdict. If the first sentence sounds like an opinion or a goal, treat it as a strong candidate for the main conclusion and verify it with the support test.</p>
        </section>

        <section data-toc data-toc-title="Hiding spot 2: after the pivot" data-toc-depth="2">
          <h2>Hiding spot 2: after the pivot</h2>
          <p>When an argument opens with someone else's view, look for a pivot word (but, however, yet). The author's conclusion usually lands on the far side of that pivot.</p>
        </section>

        <section data-toc data-toc-title="Indicators as clues" data-toc-depth="2">
          <h2>Indicators as clues</h2>
          <p>Use indicator words as signposts. Conclusion indicators point to candidates. Premise indicators (FABS: For, After all, Because, Since) identify support. Pivot and concession indicators warn of coming turns in the argument.</p>
        </section>

        <section data-toc data-toc-title="Run the 2-Part Check" data-toc-depth="2">
          <h2>Run the 2-Part Check</h2>
          <p>No matter where you think the conclusion is, run the 2-Part Conclusion Check (opinion + support) to confirm it.</p>
        </section>
      </article>
    </div>
  );
}
