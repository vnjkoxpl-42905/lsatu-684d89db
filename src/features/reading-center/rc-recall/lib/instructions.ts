/**
 * Full instructions for both modes, kept to the source workouts' procedure.
 * "Decaf" and "Cappuccino" are the source's names; the app names lead.
 * The LawHub footnote is replaced by the in-app section picker.
 */

export const SECTION_PICKER_NOTE = "Choose a full RC section below. You work all four of its passages, in order, inside the app.";

export const RECAP_STANDARD = [
  "The recap is not a summary, gist, or main point.",
  "It should not omit names, dates, and lists.",
  "It should not be a shopping list of information. It should be a story in your own words.",
  "It is encouraged to mix up the order of the sentences and ideas.",
  "This standard applies to every paragraph (or collection of paragraphs) you ever recap on RC.",
];

export const READ_STANDARD = [
  "All the details are included, just like they would be on LR.",
  "Quip after every translation.",
  "This standard applies to every paragraph you ever translate on RC.",
];

export const RC_RECALL_STEPS = [
  "Read, translate, and quip paragraph 1. Do it just like LR.",
  "Look away from paragraph 1 and recap the full translation of paragraph 1 silently.",
  "Take a few seconds to confirm your translation with the paragraph you just read. You are not rereading from scratch. You are confirming the translation you already have is right.",
  "Read, translate, and quip paragraph 2. Do it just like LR.",
  "Look away from paragraph 2 and recap the full translation of paragraph 2 silently.",
  "Take a few seconds to confirm your translation with all the text you have read of the passage so far. This confirmation includes every paragraph you have read so far.",
  "Repeat this pattern for all remaining paragraphs.",
  "Optional: look away and recap the full translation of the passage, aloud or silently. Try it when you start, then again every so often to check your recall.",
  "Complete this same process on all remaining passages in the section.",
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
  "In a comparative passage, the source note and the Passage A / Passage B headings are labels, not paragraphs to recall. " +
  "In RC Flow, choose before you start whether each check covers all the text read so far or only the current passage (A or B in a passage pair). " +
  "In RC Recall, once you begin Passage B, retell Passage A and Passage B together with the text hidden.";

export const VOICE_NOTE =
  "Do your recaps out loud in the beginning to keep yourself honest about the quality and completeness of the recaps. " +
  "Move to silent recaps when you feel ready. Paragraph recaps and checks are silent in RC Flow; the optional passage recap can be spoken or silent. " +
  "Only spoken recaps are recorded.";

export const TIMING = {
  rc_recall: { perPassage: "6 minutes", section: "24+ minutes" },
  cumulative_recall: { perPassage: "12 minutes out loud, 8 minutes silent", section: "32+ minutes" },
} as const;
