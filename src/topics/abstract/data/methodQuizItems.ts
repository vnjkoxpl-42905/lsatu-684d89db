// 10 "Spot the Method" quiz items for Module 5.
//
// Each item shows a verbatim example.stimulus from data/methodPatterns.ts and
// asks the student to pick the matching plainEnglish method name. Three
// distractor names are pulled from sibling METHOD_PATTERNS entries. No new
// LSAT content authored: every stimulus and every option is a verbatim
// METHOD_PATTERNS field.

import { METHOD_PATTERNS } from "./methodPatterns";

export interface MethodQuizItem {
  id: string;
  stimulus: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

// Select 10 patterns that have a concrete example stimulus (not narrative
// placeholder). The order below picks a spread across causal, conditional,
// role, and flaw families.
const SELECTED_PATTERN_IDS = [
  "mp_1",
  "mp_2",
  "mp_3",
  "mp_4",
  "mp_5",
  "mp_6",
  "mp_7",
  "mp_8",
  "mp_9",
  "mp_10",
];

function buildItem(patternId: string, index: number): MethodQuizItem {
  const pattern = METHOD_PATTERNS.find((p) => p.id === patternId);
  if (!pattern) throw new Error(`Unknown method pattern: ${patternId}`);

  const distractors = METHOD_PATTERNS.filter((p) => p.id !== patternId)
    .slice((index * 3) % (METHOD_PATTERNS.length - 1), ((index * 3) % (METHOD_PATTERNS.length - 1)) + 3)
    .map((p) => p.plainEnglish);

  // Ensure 3 unique distractors. Fall back to top siblings if slice underran.
  while (distractors.length < 3) {
    const candidate = METHOD_PATTERNS.find(
      (p) => p.id !== patternId && !distractors.includes(p.plainEnglish),
    );
    if (!candidate) break;
    distractors.push(candidate.plainEnglish);
  }

  const options = [pattern.plainEnglish, ...distractors];
  // Deterministic shuffle by index so correctOption is reproducible
  const correctIndex = index % options.length;
  const reordered = [...options];
  const tmp = reordered[0];
  reordered[0] = reordered[correctIndex];
  reordered[correctIndex] = tmp;

  return {
    id: `mq_${patternId}`,
    stimulus: pattern.example.stimulus,
    prompt: "Which method of reasoning does this stimulus use?",
    options: reordered,
    correctOption: correctIndex,
    explanation: pattern.example.explanation,
  };
}

export const METHOD_QUIZ_ITEMS: MethodQuizItem[] = SELECTED_PATTERN_IDS.map((id, i) =>
  buildItem(id, i),
);
