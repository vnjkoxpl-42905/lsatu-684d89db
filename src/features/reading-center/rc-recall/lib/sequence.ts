/**
 * The step order for both RC Recall modes.
 *
 * Source wording, per paragraph:
 *  - RC Recall:         read/translate/quip -> recall (text hidden) ->
 *                       confirm against the text (brief, silent) -> ...
 *                       and an optional full-passage recap at passage end.
 *  - Cumulative Recall: read/translate/quip -> recall (text hidden) ->
 *                       from paragraph 2 on, recall everything read so far
 *                       (text hidden, no look-back).
 * Every paragraph of every passage runs in order.
 */
import type { SegmentedPassage } from "./segment";

export type RecallMode = "rc_recall" | "cumulative_recall";
/** What an RC Recall confirmation shows. The written source default is `all_read`. */
export type ConfirmScope = "all_read" | "current_sub_passage";
export type Voice = "spoken" | "silent";

export type StepKind = "read" | "recall" | "confirm" | "cumulative" | "passage_recap";

export interface RecallStep {
  id: string;
  kind: StepKind;
  /** 0-based passage position in the section. */
  passage: number;
  /** 0-based paragraph the step belongs to. For `passage_recap`, the last one. */
  paragraph: number;
  /** Paragraph indices whose text is on screen. Empty means the text is hidden. */
  visible: number[];
  /** Paragraph indices the student is asked to recall or confirm. */
  covers: number[];
  /** Whether the student may choose spoken or silent for this step. */
  voiceChoice: boolean;
  /** Optional steps can be skipped without breaking the attempt. */
  optional: boolean;
  /** Stable key for a saved recap row; null for steps that are not recaps. */
  recapKey: string | null;
}

export const RECAP_KINDS: StepKind[] = ["recall", "cumulative", "passage_recap"];

export const MODE_LABEL: Record<RecallMode, string> = {
  rc_recall: "RC Flow",
  cumulative_recall: "RC Recall",
};

/** Per-passage guidance in minutes, from the source workouts. Guidance only. */
export function passageGuidanceMinutes(mode: RecallMode, passageVoice: Voice | "mixed" = "mixed"): string {
  if (mode === "rc_recall") return "6 minutes";
  return passageVoice === "silent" ? "8 minutes" : passageVoice === "spoken" ? "12 minutes" : "12 minutes spoken, 8 minutes silent";
}

export const SECTION_MINIMUM_GUIDANCE: Record<RecallMode, string> = {
  rc_recall: "24+ minutes",
  cumulative_recall: "32+ minutes",
};

const range = (from: number, to: number): number[] => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** Paragraph indices an RC Recall confirmation looks at after paragraph `i`. */
export function confirmationIndices(passage: SegmentedPassage, i: number, scope: ConfirmScope): number[] {
  if (i === 0) return [0];
  if (scope === "current_sub_passage" && passage.comparative) {
    const sub = passage.paragraphs[i].sub;
    let first = i;
    while (first > 0 && passage.paragraphs[first - 1].sub === sub) first -= 1;
    return range(first, i);
  }
  return range(0, i);
}

export function buildPassageSteps(
  mode: RecallMode,
  passage: SegmentedPassage,
  passagePosition: number,
  scope: ConfirmScope = "all_read",
): RecallStep[] {
  const steps: RecallStep[] = [];
  const base = (kind: StepKind, paragraph: number) => `p${passagePosition + 1}-para${paragraph + 1}-${kind}`;
  passage.paragraphs.forEach((_, i) => {
    steps.push({
      id: base("read", i), kind: "read", passage: passagePosition, paragraph: i,
      visible: [i], covers: [i], voiceChoice: false, optional: false, recapKey: null,
    });
    steps.push({
      id: base("recall", i), kind: "recall", passage: passagePosition, paragraph: i,
      visible: [], covers: [i], voiceChoice: mode === "cumulative_recall", optional: false, recapKey: base("recall", i),
    });
    if (mode === "rc_recall") {
      const covers = confirmationIndices(passage, i, scope);
      steps.push({
        id: base("confirm", i), kind: "confirm", passage: passagePosition, paragraph: i,
        visible: covers, covers, voiceChoice: false, optional: false, recapKey: null,
      });
    } else if (i >= 1) {
      steps.push({
        id: base("cumulative", i), kind: "cumulative", passage: passagePosition, paragraph: i,
        visible: [], covers: range(0, i), voiceChoice: true, optional: false, recapKey: base("cumulative", i),
      });
    }
  });
  if (mode === "rc_recall") {
    const last = passage.paragraphs.length - 1;
    steps.push({
      id: `p${passagePosition + 1}-passage-recap`, kind: "passage_recap", passage: passagePosition, paragraph: last,
      visible: [], covers: range(0, last), voiceChoice: true, optional: true, recapKey: `p${passagePosition + 1}-passage-recap`,
    });
  }
  return steps;
}

export function buildSectionSteps(
  mode: RecallMode,
  passages: SegmentedPassage[],
  scope: ConfirmScope = "all_read",
): RecallStep[] {
  return passages.flatMap((p, position) => buildPassageSteps(mode, p, position, scope));
}

export const STEP_TITLE: Record<StepKind, string> = {
  read: "Read the paragraph",
  recall: "Recall the paragraph",
  confirm: "Check your recall",
  cumulative: "Recall everything so far",
  passage_recap: "Recall the whole passage (optional)",
};

/** One plain-language instruction for the step; copy follows the source wording. */
export function stepInstruction(step: RecallStep, mode: RecallMode, scope: ConfirmScope = "all_read"): string {
  const n = step.paragraph + 1;
  switch (step.kind) {
    case "read":
      return `Read all of paragraph ${n}. Put each idea into your own words and add a brief reaction, such as why it matters. Keep the details. You will recall the whole paragraph next.`;
    case "recall":
      return `With the text hidden, ${mode === "rc_recall" ? "silently " : ""}tell back all of paragraph ${n} in your own words. Keep names, dates, lists and qualifications, and explain how the ideas connect.`;
    case "confirm":
      return step.paragraph === 0
        ? "Briefly check the paragraph against what you recalled. Look for details or connections you missed or changed. Check the meaning you remember instead of starting a fresh read."
        : scope === "current_sub_passage" && step.covers[0] > 0
          ? "Briefly check the paragraphs shown from Passage B against what you remember. Look for details or connections you missed or changed. Check your existing understanding instead of starting a fresh read."
          : "Briefly check all the paragraphs you have read so far against what you remember. Look for details or connections you missed or changed. Check your existing understanding instead of starting a fresh read.";
    case "cumulative":
      return step.paragraph === 1
        ? "With the text hidden, retell paragraphs 1 and 2 in order."
        : `With the text hidden, retell paragraphs 1 to ${n} in order.`;
    case "passage_recap":
      return "Optional: With the text hidden, tell back the whole passage aloud or silently. Keep its details and connections. Try this when you first learn the workout and occasionally afterward, or skip it and continue.";
  }
}
