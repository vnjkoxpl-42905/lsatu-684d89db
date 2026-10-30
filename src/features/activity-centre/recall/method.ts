import instructions from "../content/read-recall-colour-section.instructions.json";

/**
 * The four steps, from the one place they are authored.
 *
 * For a while the drill taught three different methods. The door said "Read
 * silently" and the walkthrough said "Read it, out loud in pieces". The door
 * said a colour is "a doubt, a joke" and the walkthrough told her to say "what
 * that piece is doing in the argument, evidence, conclusion", which is exactly
 * the pasteable label the judge marks as no reaction of her own. The card then
 * listed both as faults. She was coached into them by the product and marked
 * down for them by the product.
 *
 * So the step names and their one-line definitions live in the instructions
 * JSON, and every surface reads them from here. If a step is redefined, it is
 * redefined once. `method.test.ts` holds the vocabulary to CONTEXT.md.
 */
export interface MethodStep {
  /** What a student reads. "Read it.", "Tell it back.", "Colour it.", "The Recall." */
  label: string;
  /** The one-line definition, for surfaces too small for the authored body. */
  short: string;
}

/**
 * The step list, in order.
 *
 * The authored procedure is the one section of the briefing that carries
 * `steps`; there is exactly one, and it has been the four steps since the drill
 * shipped. If a second one is ever authored this throws rather than silently
 * teaching the first four of eight.
 */
export const METHOD_STEPS: readonly MethodStep[] = (() => {
  const withSteps = (instructions.briefing?.sections ?? []).filter((s) => s.steps?.length);
  if (withSteps.length !== 1) {
    throw new Error(
      `read-recall-colour instructions: expected one authored procedure, found ${withSteps.length}`,
    );
  }
  return (withSteps[0].steps ?? []).map((s) => {
    if (!s.short) throw new Error(`method step "${s.label}" has no one-line definition`);
    return { label: s.label, short: s.short };
  });
})();

/** The label without its authored full stop, for use inside a sentence. */
export function stepName(step: MethodStep): string {
  return step.label.replace(/\.$/, "");
}

/** Step 4. Named often enough, and mis-named often enough, to be worth a constant. */
export const THE_RECALL = METHOD_STEPS[3];
