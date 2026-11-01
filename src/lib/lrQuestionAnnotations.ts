import type { LrAddress } from "@/lib/lrQuestionAddress";

/**
 * Joshua's notes on a Logical Reasoning question, from a tutoring session. They sit
 * on top of the real question on /question/lr/:pt/:section/:qnum and are shown only
 * when the student turns them on. A question with no entry here is shown plain.
 */
export interface LrAnnotation {
  /** Stimulus sentences to mark, each with what it is doing. `text` is matched exactly. */
  sentences: { text: string; note: string }[];
  /** One line under the stimulus before the choices. */
  wrapUp: string;
  /** Answers worked through in the session. Others are left without a verdict. */
  verdicts: Record<string, { tag: string; text: string }>;
  /** What the session taught from this question. */
  lessons: string[];
}

const ANNOTATIONS: Record<string, LrAnnotation> = {
  "151-4-10": {
    sentences: [
      {
        text: "Researcher: Overhearing only one side of a cell-phone conversation diverts listeners’ attention from whatever they are doing.",
        note: "A causal claim. One side of a call diverts attention.",
      },
      {
        text: "Hearing only part of a conversation leaves listeners constantly trying to guess what the unheard talker has just said.",
        note: "A causal claim. Hearing part of it makes listeners guess.",
      },
      {
        text: "Listeners’ attention is also diverted because cell-phone talkers speak abnormally loudly.",
        note: "A causal claim. Loud talking diverts attention.",
      },
    ],
    wrapUp:
      "All three center on hearing one side of a conversation. The right answer will play inside that: listening in on calls can divert attention.",
    verdicts: {
      B: {
        tag: "Supported",
        text: "The wording is soft: a driver's performance gets a little worse. It doesn't have to be a crash, and a small dip is enough.",
      },
      D: {
        tag: "Too strong",
        text: "Inevitably means every time, and diverting attention is not the same as losing track of your thoughts.",
      },
    },
    lessons: ["Name each claim", "Check the verb", "The answer doesn't have to be perfect"],
  },
  "151-4-16": {
    sentences: [
      {
        text: "Tenants who do not have to pay their own electricity bills do not have a financial incentive to conserve electricity.",
        note: "The reason the author gives. No bill, no incentive.",
      },
      {
        text: "Thus, if more landlords install individual electricity meters on tenant dwellings so that tenants can be billed for their own use, energy will be conserved as a result.",
        note: "A prediction about a new world. Add meters, and energy is conserved.",
      },
    ],
    wrapUp: "The author assumes tenant habits are the only thing that changes, and ignores the landlord's side.",
    verdicts: {
      C: {
        tag: "Fewest problems",
        text: "Once tenants pay the bills, landlords lose the reason to buy efficient appliances. As appliances wear out and get replaced, the cheaper, power-hungry ones come in.",
      },
      E: {
        tag: "Too light",
        text: "Some people conserving for other reasons is one group, and it doesn't stop them conserving more when they are billed.",
      },
      A: {
        tag: "The world as it is",
        text: "It describes tenants who don't pay, and says nothing about the new world.",
      },
    },
    lessons: ["Stay inside the author's world", "Land the heaviest blow", "The fewest problems wins"],
  },
};

/**
 * The stimulus exactly as the question pane will lay it out, so marked sentences are
 * found at the offsets the pane draws them at. Same clean-up the pane applies; running
 * it twice changes nothing.
 */
export function annotationStimulus(text: string): string {
  return text
    .replace(/\s*\{#\d+\}\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export function lrAnnotationFor(address: LrAddress): LrAnnotation | null {
  return ANNOTATIONS[`${address.pt}-${address.section}-${address.qnum}`] ?? null;
}
