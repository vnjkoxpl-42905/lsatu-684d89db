import { DynamicIslandTOC } from "@/components/ui/dynamic-island-toc";

export default function LayeredArgumentsNotes() {
  return (
    <div className="mc-bootcamp bg-[#FAF7F2] min-h-screen text-[#1a1a1a]">
      <DynamicIslandTOC />
      <article className="prose prose-zinc lg:prose-lg mx-auto py-24 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Layered Arguments</h1>
        
        <section data-toc data-toc-title="Main vs intermediate conclusion" data-toc-depth="2">
          <h2>Main vs intermediate conclusion</h2>
          <p>An intermediate conclusion is supported by premises and supports the main conclusion. It is a bridge in the argument chain.</p>
        </section>

        <section data-toc data-toc-title="Supported and supporting" data-toc-depth="2">
          <h2>Supported and supporting</h2>
          <p>To distinguish between them, ask: "Does anything else in the stimulus depend on this sentence?" If yes, it's likely an intermediate conclusion.</p>
        </section>

        <section data-toc data-toc-title="Opposing views" data-toc-depth="2">
          <h2>Opposing views</h2>
          <p>The author often opens by citing another view, only to push back on it. Do not mistake the opening view for the author's own claim.</p>
        </section>

        <section data-toc data-toc-title="Concessions" data-toc-depth="2">
          <h2>Concessions</h2>
          <p>Concession words (granted, although) signal that the author is briefly acknowledging a point before moving to their main argument.</p>
        </section>

        <section data-toc data-toc-title="Trojan Horse structure" data-toc-depth="2">
          <h2>Trojan Horse structure</h2>
          <p>The Trojan Horse structure—a seemingly agreeable opening (the wind-up) followed by a pivot (the swing)—is a classic way the LSAT tests your ability to find the real conclusion.</p>
        </section>
      </article>
    </div>
  );
}
