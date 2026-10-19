/**
 * RC Training preserves the source's paragraph recall/check procedure, with
 * Joshua's recorded recall and end-of-practice feedback added explicitly.
 */

/** Why the method works, before how to do it. */
export const PURPOSE = "A paragraph can feel familiar while you are looking at it. Hiding it shows what you can explain from memory. Checking afterward shows which details or connections you lost.";

export const SECTION_PICKER_NOTE = "Choose one passage or a full RC section. A full section includes all four passages in order.";

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
  "Choose Start exercise and allow microphone access. Your microphone stays on while you read, recall and check.",
  "Read one whole paragraph. Put each idea into your own words and add a brief reaction.",
  "Press Space or Hide paragraph. Explain the whole paragraph aloud from memory, keeping its details, qualifications and connections.",
  "Press Space or Check recall. Compare your explanation with all the text read so far. Recording continues.",
  "Choose Next paragraph and repeat, or Finish passage after its last paragraph. Recall only the new paragraph. A whole-passage recall at the end is optional.",
  "Complete practice and save your result, then choose Get feedback on my recall. Only hidden recall speech is graded. Silent recalls and unusable recordings are not graded.",
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
  "Choose Start exercise before reading. Your microphone stays on while you read, recall and check. " +
  "Press Space to hide the paragraph, then Space again to check your recall. Only hidden recall speech is graded. " +
  "Complete practice and save your result, then choose Get feedback on my recall. If your microphone cannot start, retry or continue without recording and automatic feedback.";

export const TIMING_NOTE = "Choose No clock to practise without a clock, or Show elapsed time to see how long each passage takes. There is no time limit. Keep the details and connections before trying to go faster.";

export const TIMING = {
  rc_recall: { perPassage: "6 minutes", section: "24+ minutes" },
  cumulative_recall: { perPassage: "12 minutes out loud, 8 minutes silent", section: "32+ minutes" },
} as const;
