const steps = {
  general: [
    "Read the statement and diagram it on paper.",
    "Open the choices and select the matching diagram.",
    "Check your answer, then read the explanation.",
  ],
  linking: [
    "Diagram the premises and the conclusion on paper.",
    "Choose the conditional that connects the premises to the conclusion.",
    "Check your answer to see the completed chain.",
  ],
  "missing-link": [
    "Read the premises and the conclusion.",
    "Choose the missing conditional that makes the conclusion follow.",
    "Check your answer to see how the link completes the chain.",
  ],
  "must-be-true": [
    "Diagram the given statements on paper.",
    "Choose the answer that must be true if those statements are true.",
    "Check your answer, then read the explanation.",
  ],
};

export function DrillInstructions({ mode }: { mode: keyof typeof steps }) {
  return <section aria-label="Instructions" className="my-6">
    <h2 className="mb-3 text-lg font-semibold">Instructions</h2>
    <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
      {steps[mode].map(step => <li key={step}>{step}</li>)}
    </ol>
    <p className="mt-4 text-sm text-muted-foreground">Choose one answer. You can try again once before reviewing the explanation.</p>
  </section>;
}
