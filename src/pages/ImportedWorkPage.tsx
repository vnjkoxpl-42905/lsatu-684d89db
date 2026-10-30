import ImportedMetricsPanel from "@/components/analytics/ImportedMetricsPanel";
/** Gated by the shared hub for resolved analytics OR drill access. */
export default function ImportedWorkPage() {
  return (
    <section aria-label="Imported work">
      <h2 className="font-serif text-2xl text-foreground">Imported work</h2>
      <p className="mb-5 mt-2 max-w-prose text-sm text-muted-foreground">
        Your existing outside reports, with their own source and sample. They do
        not change first-answer accuracy.
      </p>
      <ImportedMetricsPanel showStates />
    </section>
  );
}
