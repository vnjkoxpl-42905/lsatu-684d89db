import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function ArgumentBasicsNotes() {
  return (
    <div className="mc-bootcamp bg-[#FAF7F2] min-h-screen text-[#1a1a1a]">
      <DynamicIslandTOC />
      <article className="prose prose-zinc lg:prose-lg mx-auto py-24 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Argument Basics</h1>
        
        <section data-toc data-toc-title="Claim plus support" data-toc-depth="2">
          <h2>Claim plus support</h2>
          <p>An argument is the author taking a position and giving you reasons to believe it. It's a simple, two-part structure: a claim (the conclusion) plus support (the premises).</p>
        </section>

        <section data-toc data-toc-title="Premises" data-toc-depth="2">
          <h2>Premises</h2>
          <p>Premises are the reasons the author provides. On the LSAT, you accept premises as given. Do not argue with them, even if they sound strange.</p>
        </section>

        <section data-toc data-toc-title="Conclusions" data-toc-depth="2">
          <h2>Conclusions</h2>
          <p>The conclusion is the claim the author wants you to believe. This is what the premises are built to support. Question this claim—this is where the argument's validity lives.</p>
        </section>

        <section data-toc data-toc-title="2-Part Conclusion Check" data-toc-depth="2">
          <h2>2-Part Conclusion Check</h2>
          <p>Run these two checks on every candidate:</p>
          <ol>
            <li><strong>Is it an opinion?</strong> Does it sound like a judgment, recommendation, or prediction?</li>
            <li><strong>Is it supported?</strong> Is there at least one other claim in the stimulus aimed at proving it?</li>
          </ol>
          <p>If the answer to both is "yes," it's your main conclusion.</p>
        </section>

        <section data-toc data-toc-title="Monica example" data-toc-depth="2">
          <h2>Monica example</h2>
          <p>Consider the Monica example: "Monica claimed she caused the dinosaur extinction; everything Monica claims is true; therefore, Monica caused the dinosaur extinction." The premises are silly, but the structure is perfectly valid.</p>
        </section>
      </article>
    </div>
  );
}
