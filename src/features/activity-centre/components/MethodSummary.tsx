import { METHOD_STEPS } from "../recall/method";

/**
 * The four steps, compact, for the "Before you start" aside on the door.
 *
 * It exists because the same summary was written out twice by hand, on the
 * section page and on the library page, and both copies drifted: they told her
 * to "say it back", which is step 2's retired student label, and they named the
 * fourth step by describing it rather than by its name. A student who read the
 * aside and then the walkthrough met two different methods.
 *
 * Definitions come from `METHOD_STEPS`, which reads the authored instructions.
 * Nothing here is allowed to define a step.
 */
export function MethodSummary() {
  return (
    <ol className="sl-aside-steps">
      {METHOD_STEPS.map((step) => (
        <li key={step.label}>
          <strong>{step.label}</strong> {step.short}
        </li>
      ))}
    </ol>
  );
}
