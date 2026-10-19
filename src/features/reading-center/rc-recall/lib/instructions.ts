/**
 * Full instructions for both modes, kept to the source workouts' procedure.
 * "Decaf" and "Cappuccino" are the source's names; the app names lead.
 * The LawHub footnote is replaced by the in-app section picker.
 */

/** Why the method works, before how to do it. */
export const PURPOSE = "A paragraph can feel familiar while you are looking at it. Hiding it shows what you can explain from memory. Checking afterward shows which details or connections you lost.";

export const SECTION_PICKER_NOTE = "Choose a full RC section below. You work all four of its passages, in order, inside the app.";

export const RECAP_STANDARD = [
  "Tell back the whole paragraph in your own words, including its details and how the ideas connect.",
  "Keep names, dates, lists and qualifications. A main point alone leaves too much out.",
  "You can change the order of the ideas as long as you keep their meaning and connections.",
];

export const READ_STANDARD = [
  "As you read, put each idea into your own words without dropping details.",
  "Add a brief reaction to each idea, such as why it matters or what surprises you. This is a quip.",
  "Finish the whole paragraph before hiding the text to recall it.",
];

export const RC_RECALL_STEPS = [
  "Read one whole paragraph. Put its ideas into your own words as you go, and add a brief reaction to each idea.",
  "Hide the text. Silently retell that paragraph from memory, keeping its details, qualifications and connections.",
  "Show the text. Check your recall against all the paragraphs you have read so far. Look for anything you missed or changed instead of starting a fresh read.",
  "Continue with the next paragraph. Recall only that paragraph, then check all the text read so far again.",
  "At the end of a passage you can choose to recall the whole passage with the text hidden, silently or out loud. This is optional. Try it while you are learning the method and now and then afterward.",
  "Repeat for the remaining passages in the section.",
];

export const CUMULATIVE_STEPS = [
  "Read, translate, and quip paragraph 1. Do it just like LR.",
  "Look away from paragraph 1 and recap the full translation of paragraph 1.",
  "Read, translate, and quip paragraph 2. Do it just like LR.",
  "Look away from paragraph 2 and recap the full translation of paragraph 2.",
  "With the text hidden, retell paragraphs 1 and 2 in order.",
  "Read, translate, and quip paragraph 3. Do it just like LR.",
  "Look away from paragraph 3 and recap the full translation of paragraph 3.",
  "With the text hidden, retell paragraphs 1, 2, and 3 in order.",
  "Repeat this pattern for all remaining paragraphs.",
  "Complete this same process on all remaining passages in the section.",
];

export const COMPARATIVE_NOTE =
  "For a passage pair, recall one paragraph at a time in Passage A, then Passage B. Headings and source notes are not paragraphs to recall. " +
  "By default, checks include all the text read so far, including Passage A while you work through Passage B. " +
  "If you choose to check each passage separately, checks in Passage B include only the paragraphs of B you have read.";

export const VOICE_NOTE =
  "Recall each paragraph silently. At the end of the passage, the optional whole-passage recall can be spoken or silent. " +
  "Only an out loud recall is recorded.";

export const TIMING_NOTE = "Choose Untimed to practise without a clock, or Elapsed timer to see how long each passage takes. There is no time limit. Keep the details and connections before trying to go faster.";

export const TIMING = {
  rc_recall: { perPassage: "6 minutes", section: "24+ minutes" },
  cumulative_recall: { perPassage: "12 minutes out loud, 8 minutes silent", section: "32+ minutes" },
} as const;
