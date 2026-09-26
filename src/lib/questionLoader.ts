// Question loader - ingests JSON files and builds index

import { looksLikeSpeakerLabel } from './dialogue';

export interface LRQuestion {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  reasoningType?: string[]; // multi-valued: any of "Causation", "Conditional Reasoning", "Comparative Reasoning"
  questionFeatures?: string[]; // e.g., ["Conditional Diagramming"] — orthogonal to qtype/reasoningType
  difficulty: number;
  stimulus?: string;
  questionStem: string;
  answerChoices: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  breakdown?: {
    conclusion: string;
    conclusionSimple: string;
    evidence: string[]; // 2-4 items
    justification: string; // ≤80 words
    objection: string; // ≤40 words
    prediction: string; // ≤60 words
    crucialInsight: string; // ≤30 words
  };
  answerChoiceExplanations?: {
    A: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    B: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    C: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    D: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
    E: { verdict: 'correct' | 'incorrect'; whyCorrect?: string; whyIncorrect?: string };
  };
  /**
   * Raw LSAT Lab explanation payload (per-question review content) ingested
   * from `public/data/explanations/PT<n>-explanations.json`. Optional — only
   * populated for preptests we have authored explanations for.
   */
  explanations?: LRExplanation;
}

export interface LRExplanationChoice {
  text: string | null;
  tag: string | null;
  pct: number | null;
  explanation: string;
}

export interface LRExplanationStyle {
  breakdownMd: string;
  choices: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E', LRExplanationChoice>>;
}

export interface LRExplanation {
  pt: string;
  section: number;
  qnum: number;
  qtypeLabel?: string;
  correctChoice: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  styles: {
    standard?: LRExplanationStyle;
    brief?: LRExplanationStyle;
    anotherWay?: LRExplanationStyle;
  };
}

type RenderableLRQuestionInput = {
  stimulus?: unknown;
  questionStem?: unknown;
  answerChoices?: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E', unknown>>;
};

const sharedPassageMetadataPrefixPattern =
  /^\s*(?:The following passage is used for Section\s+\d+,\s+questions\s+\d+\s+through\s+\d+\.|Questions?\s+\d+\s+(?:through|and|[-–])\s+\d+\s+refer to the following passage\.)\s*/i;
const sharedPassageRangePattern =
  /^\s*(?:The following passage is used for Section\s+\d+,\s+questions\s+(\d+)\s+through\s+(\d+)\.|Questions?\s+(\d+)\s+(?:through|and|[-–])\s+(\d+)\s+refer to the following passage\.)\s*/i;

function stripSharedPassageMetadataPrefix(text: string): string {
  return text.replace(sharedPassageMetadataPrefixPattern, '').trim();
}

function normalizeProseHardWraps(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function getSharedPassageRange(text: string): { start: number; end: number } | null {
  const match = text.match(sharedPassageRangePattern);
  if (!match) return null;

  const start = Number(match[1] ?? match[3]);
  const end = Number(match[2] ?? match[4]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null;

  return { start, end };
}

const dialogueIntroPattern = /^[A-Z][A-Za-z’' -]{1,80}:\s+/;
const dialogueTransitionPattern = /[.!?]["”')\]]?\s+[A-Z][A-Za-z’' -]{1,80}:\s+/;
// Captures: 1) sentence-ending punctuation, 2) the candidate speaker label
// (without its trailing colon/space), 3) the colon + whitespace that follows.
const dialogueTurnBreakPattern =
  /([.!?]["”')\]]?)\s+([A-Z][A-Za-z’' -]{1,80})(:\s+)/g;

function normalizeDialogueSpeakerBreaks(text: string): string {
  if (!dialogueIntroPattern.test(text) || !dialogueTransitionPattern.test(text)) return text;

  return text.replace(dialogueTurnBreakPattern, (match, punct, label, colon) =>
    looksLikeSpeakerLabel(label) ? `${punct}\n\n${label}${colon}` : match,
  );
}

export function normalizeStimulusText(text: string): string {
  const sharedRange = getSharedPassageRange(text);
  let normalized = stripSharedPassageMetadataPrefix(text);

  if (sharedRange) {
    normalized = normalized
      .replace(new RegExp(`\\s+${sharedRange.start}\\.$`), '')
      .trim();
  }

  normalized = normalizeProseHardWraps(normalized);

  return normalizeDialogueSpeakerBreaks(normalized);
}

export function isRenderableLRQuestion(q: RenderableLRQuestionInput): boolean {
  return (
    typeof q.stimulus === 'string' &&
    q.stimulus.trim().length > 0 &&
    typeof q.questionStem === 'string' &&
    q.questionStem.trim().length > 0 &&
    ['A', 'B', 'C', 'D', 'E'].every((key) => {
      const answer = q.answerChoices?.[key as 'A' | 'B' | 'C' | 'D' | 'E'];
      return typeof answer === 'string' && answer.trim().length > 0;
    })
  );
}

function normalizeQuestionTextFields<T extends {
  questionNumber?: number;
  stimulus?: string;
  questionStem?: string;
  answerChoices?: Record<string, string>;
}>(raw: T[]): T[] {
  const normalized = raw.map((item) => ({
    ...item,
    answerChoices: item.answerChoices ? { ...item.answerChoices } : item.answerChoices,
  }));

  const byQuestionNumber = new Map<number, T>();
  for (const item of normalized) {
    if (typeof item.questionNumber === 'number') {
      byQuestionNumber.set(item.questionNumber, item);
    }
  }

  // Some imports placed shared two-question passages at the end of the
  // previous answer choice. Move that local text back into the affected
  // question stimulus fields and clean the contaminated answer choice.
  const sharedPassagePattern =
    /\s*The following passage is used for Section\s+\d+,\s+questions\s+(\d+)\s+through\s+(\d+)\.\s*/i;

  for (const item of normalized) {
    if (!item.answerChoices) continue;

    for (const key of Object.keys(item.answerChoices)) {
      const text = item.answerChoices[key];
      if (typeof text !== 'string') continue;
      const match = text.match(sharedPassagePattern);
      if (!match || match.index === undefined) continue;

      const start = Number(match[1]);
      const end = Number(match[2]);
      const passage = text.slice(match.index + match[0].length).trim();
      if (!Number.isFinite(start) || !Number.isFinite(end) || !passage) continue;

      item.answerChoices[key] = text.slice(0, match.index).trim();
      for (let qnum = start; qnum <= end; qnum++) {
        const target = byQuestionNumber.get(qnum);
        if (target && !target.stimulus?.trim()) {
          target.stimulus = passage;
        }
      }
    }
  }

  // Some section files only include a shared passage on the first question in
  // the set and leave later questions blank. Carry that passage forward only
  // across the declared question range.
  let activeSharedPassage:
    | { start: number; end: number; stimulus: string }
    | null = null;

  for (const item of normalized) {
    const qnum = item.questionNumber;
    if (
      activeSharedPassage &&
      (typeof qnum !== 'number' || qnum < activeSharedPassage.start || qnum > activeSharedPassage.end)
    ) {
      activeSharedPassage = null;
    }

    const stimulus = item.stimulus?.trim() ?? '';
    if (stimulus) {
      const sharedRange = getSharedPassageRange(stimulus);
      if (sharedRange) {
        activeSharedPassage = {
          ...sharedRange,
          stimulus,
        };
      } else {
        activeSharedPassage = null;
      }
      continue;
    }

    if (
      activeSharedPassage &&
      typeof qnum === 'number' &&
      qnum >= activeSharedPassage.start &&
      qnum <= activeSharedPassage.end
    ) {
      item.stimulus = activeSharedPassage.stimulus;
    }
  }

  // Shared-passage imports may include a routing/instruction line at the
  // beginning of the stimulus. Keep the passage itself, remove only that
  // narrow metadata prefix.
  for (const item of normalized) {
    if (typeof item.stimulus === 'string') {
      item.stimulus = normalizeStimulusText(item.stimulus);
    }
    if (typeof item.questionStem === 'string') {
      item.questionStem = normalizeProseHardWraps(item.questionStem);
    }
    if (item.answerChoices) {
      for (const key of Object.keys(item.answerChoices)) {
        const text = item.answerChoices[key];
        if (typeof text === 'string') {
          item.answerChoices[key] = normalizeProseHardWraps(text);
        }
      }
    }
  }

  // A small number of records have the first words of the question prompt
  // attached to the end of the stimulus. Move only obvious prompt tails.
  const promptTailPattern =
    /(?:^|\s)((?:[A-Z][A-Za-z’' -]+ and [A-Z][A-Za-z’' -]+ disagree over the truth of which)|(?:The [A-Z][A-Za-z’' -]+’s statements, if true, most support which)|(?:Which)|(?:If all of)|(?:Aisha’s conclusion follows logically if which))$/;

  for (const item of normalized) {
    const stimulus = item.stimulus?.trim() ?? '';
    const questionStem = item.questionStem?.trim() ?? '';
    if (!stimulus || !questionStem || !/^[a-z]/.test(questionStem)) continue;

    const match = stimulus.match(promptTailPattern);
    if (!match || match.index === undefined) continue;

    const promptStart = stimulus.slice(match.index).trim();
    const cleanStimulus = stimulus.slice(0, match.index).trim();
    if (!cleanStimulus || !promptStart) continue;

    item.stimulus = cleanStimulus;
    item.questionStem = `${promptStart} ${questionStem}`.replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

export interface QuestionManifest {
  totalQuestions: number;
  byPT: Record<string, number>;
  byQType: Record<string, number>;
  byFeature: Record<string, number>;
  byReasoningType: Record<string, number>;
  bySection: Record<number, number>;
  byDifficulty: Record<number, number>;
  sections: Array<{
    pt: number;
    section: number;
    count: number;
    filename: string;
    removedPositions?: number[];
  }>;
}

const JSON_FILES = [
  // Original 10 files (PT101-PT106)
  '/data/PT106-S3-LR.json',
  '/data/PT105-S1-LR.json',
  '/data/PT104-S1-LR.json',
  '/data/PT101-S3-LR.json',
  '/data/PT103-S1-LR.json',
  '/data/PT104-S4-LR.json',
  '/data/PT101-S2-LR.json',
  '/data/PT105-S2-LR.json',
  '/data/PT106-S1-LR.json',
  '/data/PT103-S2-LR.json',
  // PT102-S4, PT103-S3, PT105-S4 — added from validated markdown uploads
  '/data/PT102-S4-LR.json',
  '/data/PT103-S3-LR.json',
  '/data/PT105-S4-LR.json',
  // PT106-S2, PT107-S3, PT109-S3, PT110-S3 — added from validated markdown uploads
  '/data/PT106-S2-LR.json',
  '/data/PT107-S3-LR.json',
  '/data/PT109-S3-LR.json',
  '/data/PT110-S3-LR.json',
  // Second batch (PT107-PT120)
  '/data/PT107-S1-LR.json',
  '/data/PT107-S4-LR.json',
  '/data/PT108-S2-LR.json',
  '/data/PT108-S3-LR.json',
  '/data/PT109-S1-LR.json',
  '/data/PT109-S4-LR.json',
  '/data/PT110-S2-LR.json',
  '/data/PT111-S1-LR.json',
  '/data/PT120-S1-LR.json',
  '/data/PT120-S3-LR.json',
  // Third batch - expanding to mega database
  '/data/PT127-S1-LR.json',
  '/data/PT150-S2-LR.json',
  '/data/PT152-S1-LR.json',
  '/data/PT152-S2-LR.json',
  '/data/PT152-S4-LR.json',
  // Fourth batch - PT114-PT118
  '/data/PT114-S1-LR.json',
  '/data/PT114-S2-LR.json',
  '/data/PT115-S2-LR.json',
  '/data/PT115-S4-LR.json',
  '/data/PT116-S2-LR.json',
  '/data/PT116-S3-LR.json',
  '/data/PT117-S2-LR.json',
  '/data/PT117-S3-LR.json',
  '/data/PT118-S1-LR.json',
  '/data/PT118-S4-LR.json',
  // Sections added from PT111/114/117/118/120 markdown uploads
  '/data/PT111-S3-LR.json',
  '/data/PT111-S4-LR.json',
  '/data/PT114-S4-LR.json',
  '/data/PT117-S4-LR.json',
  '/data/PT118-S3-LR.json',
  '/data/PT120-S4-LR.json',
  // Fifth batch - PT102
  '/data/PT102-S2-LR.json',
  '/data/PT102-S3-LR.json',
  // Sixth batch - PT112
  '/data/PT112-S1-LR.json',
  '/data/PT112-S3-LR.json',
  '/data/PT112-S4-LR.json',
  // Seventh batch - PT113
  '/data/PT113-S2-LR.json',
  '/data/PT113-S3-LR.json',
  '/data/PT113-S4-LR.json',
  // Eighth batch - PT119
  '/data/PT119-S2-LR.json',
  '/data/PT119-S3-LR.json',
  '/data/PT119-S4-LR.json',
  // Ninth batch - PT121
  '/data/PT121-S1-LR.json',
  '/data/PT121-S4-LR.json',
  // Tenth batch - PT122
  '/data/PT122-S1-LR.json',
  '/data/PT122-S2-LR.json',
  '/data/PT122-S4-LR.json',
  // Eleventh batch - PT123
  '/data/PT123-S2-LR.json',
  '/data/PT123-S3-LR.json',
  // Twelfth batch - PT124
  '/data/PT124-S1-LR.json',
  '/data/PT124-S2-LR.json',
  '/data/PT124-S3-LR.json',
  // Thirteenth batch - PT125
  '/data/PT125-S2-LR.json',
  '/data/PT125-S4-LR.json',
  // Fourteenth batch - PT126
  '/data/PT126-S1-LR.json',
  '/data/PT126-S3-LR.json',
  '/data/PT126-S4-LR.json',
  // Fifteenth batch - PT128
  '/data/PT128-S2-LR.json',
  '/data/PT128-S3-LR.json',
  // Sixteenth batch - PT129
  '/data/PT129-S1-LR.json',
  '/data/PT129-S2-LR.json',
  '/data/PT129-S3-LR.json',
  // Seventeenth batch - PT130
  '/data/PT130-S1-LR.json',
  '/data/PT130-S3-LR.json',
  // Eighteenth batch - PT131
  '/data/PT131-S1-LR.json',
  '/data/PT131-S2-LR.json',
  '/data/PT131-S3-LR.json',
  // Nineteenth batch - PT132
  '/data/PT132-S2-LR.json',
  '/data/PT132-S4-LR.json',
  // Twentieth batch - PT133
  '/data/PT133-S1-LR.json',
  '/data/PT133-S2-LR.json',
  '/data/PT133-S3-LR.json',
  // Twenty-first batch - PT134
  '/data/PT134-S1-LR.json',
  // Twenty-second batch - PT136, PT137, PT138, PT139
  '/data/PT136-S2-LR.json',
  '/data/PT136-S4-LR.json',
  '/data/PT137-S2-LR.json',
  '/data/PT137-S3-LR.json',
  '/data/PT137-S4-LR.json',
  '/data/PT138-S2-LR.json',
  '/data/PT139-S1-LR.json',
  '/data/PT139-S4-LR.json',
  // Twenty-third batch - PT154, PT155
  '/data/PT154-S1-LR.json',
  '/data/PT154-S2-LR.json',
  '/data/PT154-S4-LR.json',
  '/data/PT155-S1-LR.json',
  '/data/PT155-S2-LR.json',
  '/data/PT155-S4-LR.json',
  // Twenty-fourth batch - PT146, PT147, PT148, PT149, PT153
  '/data/PT146-S1-LR.json',
  '/data/PT146-S2-LR.json',
  '/data/PT146-S3-LR.json',
  '/data/PT147-S1-LR.json',
  '/data/PT147-S4-LR.json',
  '/data/PT148-S1-LR.json',
  '/data/PT148-S3-LR.json',
  '/data/PT148-S4-LR.json',
  '/data/PT149-S1-LR.json',
  '/data/PT149-S3-LR.json',
  '/data/PT149-S4-LR.json',
  '/data/PT153-S2-LR.json',
  '/data/PT153-S3-LR.json',
  // Twenty-fifth batch - PT127, PT130, PT134, PT135, PT138, PT140 (markdown ingest)
  '/data/PT127-S2-LR.json',
  '/data/PT127-S3-LR.json',
  '/data/PT130-S4-LR.json',
  '/data/PT134-S2-LR.json',
  '/data/PT134-S3-LR.json',
  '/data/PT135-S1-LR.json',
  '/data/PT135-S2-LR.json',
  '/data/PT135-S4-LR.json',
  '/data/PT138-S3-LR.json',
  '/data/PT138-S4-LR.json',
  '/data/PT140-S1-LR.json',
  '/data/PT140-S2-LR.json',
  '/data/PT140-S3-LR.json',
  // Twenty-sixth batch - PT141, PT144, PT145 (markdown ingest)
  '/data/PT141-S2-LR.json',
  '/data/PT141-S4-LR.json',
  '/data/PT144-S2-LR.json',
  '/data/PT144-S3-LR.json',
  '/data/PT144-S4-LR.json',
  '/data/PT145-S2-LR.json',
  '/data/PT145-S4-LR.json',
  // Twenty-seventh batch - PT142, PT143, PT150, PT151, PT156, PT157, PT158 (markdown ingest)
  '/data/PT142-S1-LR.json',
  '/data/PT142-S2-LR.json',
  '/data/PT142-S4-LR.json',
  '/data/PT143-S1-LR.json',
  '/data/PT143-S3-LR.json',
  '/data/PT143-S4-LR.json',
  '/data/PT150-S3-LR.json',
  '/data/PT151-S2-LR.json',
  '/data/PT151-S3-LR.json',
  '/data/PT151-S4-LR.json',
  '/data/PT156-S2-LR.json',
  '/data/PT156-S4-LR.json',
  '/data/PT157-S2-LR.json',
  '/data/PT157-S3-LR.json',
  '/data/PT158-S2-LR.json',
  '/data/PT158-S3-LR.json',
  '/data/PT158-S4-LR.json',
  // PT159 (markdown ingest)
  '/data/PT159-S1-LR.json',
  '/data/PT159-S3-LR.json',
];

// Simple hash for qid generation
function hashQid(pt: number, section: number, qnum: number): string {
  return `PT${pt}-S${section}-Q${qnum}`;
}

// Canonical LR Question Type Taxonomy (grouped and ordered)
export const CANONICAL_QTYPES = {
  groups: [
    {
      name: 'ASSUMPTION / OBJECTION',
      types: [
        'Flaw',
        'Necessary Assumption',
        'Weaken',
        'Strengthen',
        'Sufficient Assumption',
        'Principle-Strengthen',
        'Evaluate'
      ]
    },
    {
      name: 'INFERENCE',
      types: [
        'Most Strongly Supported',
        'Must Be True',
        'Agree/Disagree',
        'Must Be False'
      ]
    },
    {
      name: 'MATCH',
      types: [
        'Method of Reasoning',
        'Main Conclusion',
        'Parallel Flaw',
        'Role',
        'Parallel Reasoning',
        'Principle-Conform'
      ]
    },
    {
      name: 'OTHER',
      types: ['Paradox']
    }
  ],
  // Flat list of all canonical types
  allTypes: [
    'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
    'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
    'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
    'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox'
  ]
};

// Comprehensive synonym mapping to canonical types
const TYPE_SYNONYMS: Record<string, string> = {
  // Flaw variants
  'Flaw': 'Flaw',
  'Flaw in Reasoning': 'Flaw',
  'Flawed Reasoning': 'Flaw',
  'Error in Reasoning': 'Flaw',
  
  // Assumption variants
  'Necessary Assumption': 'Necessary Assumption',
  'Assumption': 'Necessary Assumption',
  'Sufficient Assumption': 'Sufficient Assumption',
  
  // Strengthen/Weaken variants
  'Strengthen': 'Strengthen',
  'Weaken': 'Weaken',
  'Justify the Exception': 'Strengthen',
  
  // Principle variants
  'Principle-Strengthen': 'Principle-Strengthen',
  'Principle Strengthen': 'Principle-Strengthen',
  'Principle: Strengthen': 'Principle-Strengthen',
  'Principle: Justify': 'Principle-Strengthen',
  'Principle Justify': 'Principle-Strengthen',
  'Principle-Conform': 'Principle-Conform',
  'Principle Conform': 'Principle-Conform',
  'Principle: Conform': 'Principle-Conform',
  'Principle: Underlying': 'Principle-Conform',
  'Principle Application': 'Principle-Conform',
  'Principle': 'Principle-Conform',

  // Evaluation
  'Evaluate': 'Evaluate',
  'Evaluate the Argument': 'Evaluate',
  'Argument Evaluation': 'Evaluate',

  // Inference variants
  'Most Strongly Supported': 'Most Strongly Supported',
  'Most Supported': 'Most Strongly Supported',
  'Complete the Argument': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion',
  'Main Conclusion': 'Main Conclusion',
  'Identify The Conclusion': 'Main Conclusion',
  'Identify the Conclusion': 'Main Conclusion',
  'Must Be True': 'Must Be True',
  'Must be True': 'Must Be True',
  'Must Be False': 'Must Be False',

  // Agreement/Disagreement
  'Agree/Disagree': 'Agree/Disagree',
  'Point at Issue': 'Agree/Disagree',
  'Point of Agreement': 'Agree/Disagree',
  'Disagree': 'Agree/Disagree',
  'Agreement': 'Agree/Disagree',
  'Misinterpretation': 'Agree/Disagree',

  // Method and Role
  'Method of Reasoning': 'Method of Reasoning',
  'Method': 'Method of Reasoning',
  'Role': 'Role',
  'Role in the Argument': 'Role',
  'Role in Argument': 'Role',

  // Parallel
  'Parallel Reasoning': 'Parallel Reasoning',
  'Parallel': 'Parallel Reasoning',
  'Parallel Flaw': 'Parallel Flaw',
  'Flawed Parallel Reasoning': 'Parallel Flaw',
  
  // Paradox
  'Paradox': 'Paradox',
  'Resolve the Paradox': 'Paradox',
  'Explain the Discrepancy': 'Paradox',
  'Resolve Paradox': 'Paradox',
  'Resolve reconcile or explain': 'Paradox',
  'Resolve, reconcile, or explain': 'Paradox',
  'Resolve/Reconcile/Explain': 'Paradox',
  'Paradox Resolve / explain': 'Paradox',
  'Paradox Resolve / explain discrepancy': 'Paradox',

  // Longhand and hedged labels used by the older section files, where the
  // transcriber wrote the family out as prose instead of picking a tag.
  'Flaw or descriptive weakening': 'Flaw',
  'Flaw Fill-in': 'Flaw',
  'Method of reasoning or descriptive': 'Method of Reasoning',
  'Main conclusion or main point': 'Main Conclusion',
  'Parallel flawed method of reasoning': 'Parallel Flaw',
  'Parallel method of reasoning': 'Parallel Reasoning',
  'Parallel Reasoning: Questionable': 'Parallel Flaw',
  'Parallel Reasoning: Complete Argument': 'Parallel Reasoning',

  // Role — the bank calls this "argument part" about as often as "role".
  'Argument Part': 'Role',
  'Role of Statement': 'Role',

  // Weaken family. "Counter" and "objection" phrasings all describe the same
  // task: find the answer that damages the argument.
  'Weaken/Counter': 'Weaken',
  'Weaken Counter objection': 'Weaken',
  'Logical Counter': 'Weaken',

  // Strengthen/Explain leads with Strengthen, so it resolves there rather than
  // to Paradox.
  'Strengthen/Explain': 'Strengthen',

  // Fill-in-the-blank stems ask what the argument best supports, which is the
  // same task as Complete the Argument (already mapped to Most Strongly
  // Supported above).
  'Fill in the Blank': 'Most Strongly Supported',
  'Fill-in-the-blank': 'Most Strongly Supported',
  'Most Strongly Supported Fill-in': 'Most Strongly Supported',
  'Most Supported Least supported': 'Most Strongly Supported',
  'Most Supported Least supported / EXCEPT': 'Most Strongly Supported',

  'Inference': 'Must Be True',
  'Must Be True Fill in the blank': 'Must Be True',
  'Dispute': 'Agree/Disagree',

  // PSA is the 7Sage name for the principle-as-sufficient-assumption family,
  // which this taxonomy calls Principle-Strengthen.
  'Principle-PSA': 'Principle-Strengthen',
  'PSA - Find the rule': 'Principle-Strengthen',
  'PSA - Find or complete the application': 'Principle-Strengthen',

  'Principle-Identify': 'Principle-Conform',
  'Principle Illustrated': 'Principle-Conform',
  'Inconsistent with Principle': 'Principle-Conform',
  'Principle Conform Application': 'Principle-Conform',
  'Principle Application / analogous argument': 'Principle-Conform',
};

// Case-insensitive index over the canonical types and every synonym above.
// `questionType` is hand-entered across 158 section files and drifts constantly
// in case ("Must be true", "Necessary assumption", "Most strongly supported"),
// so an exact-string lookup dropped hundreds of perfectly good questions into
// the Unknown bucket. Folding case at lookup time is what stops that.
const SYNONYM_INDEX: Record<string, string> = (() => {
  const index: Record<string, string> = {};
  for (const type of CANONICAL_QTYPES.allTypes) {
    index[type.toLowerCase()] = type;
  }
  for (const [synonym, canonical] of Object.entries(TYPE_SYNONYMS)) {
    index[synonym.toLowerCase()] = canonical;
  }
  return index;
})();

// Strip a trailing parenthetical tag ("Flaw (Flaw)", "PSA - Find the rule
// (Principle)") and any trailing EXCEPT marker ("Weaken EXCEPT", "Strengthen
// (EXCEPT)", "Must be false EXCEPT") so the family underneath can be looked up.
//
// Note this files EXCEPT questions under their family: a "Weaken EXCEPT" lands
// in Weaken. That is right for drill filtering — it is a Weaken-family question
// and belongs in a Weaken set — but the credited answer is the one that does
// NOT weaken, so the answer mechanics are inverted relative to the rest of the
// bucket.
function stripQTypeDecorations(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[\s/-]*\bexcept\b\s*$/i, '')
    .trim();
}

// Infer question type from question stem using regex patterns
export function inferTypeFromStem(stem: string): string {
  const lower = stem.toLowerCase();
  
  // Paradox patterns. The bare "explain + discrepancy" pairing missed the two
  // commonest real phrasings — "contributes to an explanation of" and "helps to
  // resolve the apparent discrepancy" — so each is matched directly. These stay
  // narrow on purpose: "most helps to support the director's explanation" is a
  // Strengthen question and must not be caught here.
  if (lower.includes('explain') && (lower.includes('discrepancy') || lower.includes('paradox') ||
      lower.includes('apparent conflict') || lower.includes('seemingly contradictory'))) {
    return 'Paradox';
  }
  if (/to an explanation of|help(s)? to explain|account for the|reconcile/.test(lower) ||
      /resolve the (apparent|discrepancy|paradox|conflict)/.test(lower)) {
    return 'Paradox';
  }

  // Parallel, Principle and Agree/Disagree are tested first because each is a
  // NARROWER case of a broader type below: a Parallel Flaw stem always says
  // "flaw", a Principle-Strengthen stem always says "support" or "justify", and
  // a Point at Issue stem often says "supported". Leaving them below the broad
  // Flaw/Strengthen/Most Strongly Supported checks let those swallow roughly
  // 330 questions into the wrong bucket.
  if (lower.includes('parallel') && lower.includes('flaw')) {
    return 'Parallel Flaw';
  }
  if (lower.includes('parallel') || lower.includes('most similar') || lower.includes('same pattern')) {
    return 'Parallel Reasoning';
  }

  if (lower.includes('principle') && (lower.includes('conform') || lower.includes('illustrate') ||
      lower.includes('underlying'))) {
    return 'Principle-Conform';
  }
  if (lower.includes('principle') && (lower.includes('justify') || lower.includes('support'))) {
    return 'Principle-Strengthen';
  }
  // "best illustrates which one of the following propositions/generalizations"
  // is a Principle-Conform stem that never says the word "principle".
  if (/illustrat\w* which one of the following|generalizations? is most clearly illustrated/.test(lower)) {
    return 'Principle-Conform';
  }

  if (lower.includes('disagree') || /point.*issue/.test(lower) || lower.includes('dispute') ||
      /committed to (accepting|disagreeing)|agree that|at odds/.test(lower)) {
    return 'Agree/Disagree';
  }

  // Weaken patterns
  if (lower.includes('weaken') || lower.includes('undermines') || lower.includes('casts doubt') ||
      lower.includes('call into question') || lower.includes('calls into question')) {
    return 'Weaken';
  }

  // Must Be False is checked before Must Be True because its stem contains the
  // words "could be true".
  if (/could be true,? except/.test(lower)) {
    return 'Must Be False';
  }

  // Must Be True / Most Supported / Main Conclusion — checked BEFORE Strengthen
  // so a "most strongly supported" or "expresses the main conclusion" stem is
  // not swallowed by the Strengthen includes('supports') check below.
  if (lower.includes('must be true') || lower.includes('must also be true') ||
      lower.includes('properly inferred') || lower.includes('follows logically from')) {
    return 'Must Be True';
  }
  // Match both real MSS phrasings: "most strongly supported by" and "most
  // strongly supports/support which one of the following".
  if (/most (strongly )?support(ed|s)?/.test(lower) || lower.includes('most justifies') ||
      lower.includes('best supported by')) {
    return 'Most Strongly Supported';
  }
  if (/main (point|conclusion)/.test(lower) || /expresses the (main |overall )?conclusion/.test(lower)) {
    return 'Main Conclusion';
  }

  // Assumption patterns, checked before Strengthen. The Necessary Assumption
  // stem the LSAT actually writes is "an assumption REQUIRED by the argument",
  // so matching only "requires" left roughly fifteen of them unclassified.
  if (lower.includes('assumption') && /require|depends/.test(lower)) {
    return 'Necessary Assumption';
  }
  // Sufficient Assumption stems name the conclusion, not the word "assumption":
  // "the conclusion follows logically if which one of the following is assumed".
  if (/follows logically if|properly drawn if|can be properly drawn/.test(lower) ||
      (lower.includes('assumption') && lower.includes('if assumed'))) {
    return 'Sufficient Assumption';
  }
  if (lower.includes('assumption')) {
    return 'Necessary Assumption';
  }

  // Strengthen patterns
  if (lower.includes('strengthen') || lower.includes('supports') || lower.includes('justifies') ||
      /help(s)? to support|help(s)? to justify|argues most strongly for|would support/.test(lower)) {
    return 'Strengthen';
  }

  // Flaw patterns
  if (lower.includes('flaw') || lower.includes('error') ||
      /vulnerable to (the )?criticism/.test(lower) || /misleading in that/.test(lower)) {
    return 'Flaw';
  }

  // Method of Reasoning
  if (lower.includes('proceeds by') || lower.includes('method') || lower.includes('technique of argumentation') ||
      /(argument|reasoning) does which one of the following/.test(lower) ||
      /responds to .* by$/.test(lower) || /counter .*'?s? conclusion by$/.test(lower) ||
      /is utilized by the argument/.test(lower)) {
    return 'Method of Reasoning';
  }

  // Role
  if (lower.includes('role') || /claim.*figures/.test(lower) ||
      /figures in the argument/.test(lower) || /the function of .* is to$/.test(lower)) {
    return 'Role';
  }

  // Evaluate — "evaluat" so that "evaluating" matches, which "evaluate" did not.
  if (lower.includes('evaluat') || lower.includes('useful to know')) {
    return 'Evaluate';
  }

  // Fill-in-the-blank: the argument's last sentence is cut off and the answer
  // completes it, which is the Most Strongly Supported task.
  if (/completes the (passage|argument)/.test(lower)) {
    return 'Most Strongly Supported';
  }
  
  return 'Unknown';
}

// Robust normalization with synonym mapping and stem inference.
// Exported for questionLoader.qtypes.test.ts, which runs it over every
// `questionType` string in public/data and fails if the Unknown bucket grows.
export function normalizeQType(raw: string, questionStem?: string): string {
  if (!raw || raw.trim() === '') {
    if (questionStem) return inferTypeFromStem(questionStem);
    return 'Unknown';
  }
  
  const trimmed = raw.trim();

  // Canonical types and synonyms, matched without regard to case.
  const direct = SYNONYM_INDEX[trimmed.toLowerCase()];
  if (direct) {
    return direct;
  }

  // Retry with EXCEPT markers and trailing parenthetical tags removed.
  const stripped = stripQTypeDecorations(trimmed);
  if (stripped && stripped !== trimmed) {
    const undecorated = SYNONYM_INDEX[stripped.toLowerCase()];
    if (undecorated) {
      return undecorated;
    }
  }

  // Nothing in the taxonomy matched. The stem is a better signal than a label
  // the bank never agreed on — a bare "Except", a "Miscellaneous", or a
  // sentence fragment that leaked in from the passage.
  if (questionStem) {
    const inferred = inferTypeFromStem(questionStem);
    if (inferred !== 'Unknown') {
      return inferred;
    }
  }

  console.warn(`Unknown question type encountered: "${trimmed}"`);
  return 'Unknown';
}

export class QuestionBank {
  private questions: Map<string, LRQuestion> = new Map();
  private manifest: QuestionManifest = {
    totalQuestions: 0,
    byPT: {},
    byQType: {},
    byFeature: {},
    byReasoningType: {},
    bySection: {},
    byDifficulty: {},
    sections: [],
  };
  private loadPromise: Promise<void> | null = null;

  isReady(): boolean {
    return this.questions.size > 0;
  }

  async load(): Promise<void> {
    if (this.isReady()) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad().finally(() => {
      if (!this.isReady()) this.loadPromise = null;
    });
    return this.loadPromise;
  }

  // Fetch every section via a single merged bank file (built at `npm run build`
  // by scripts/build-question-bank.mjs) so boot makes ONE request instead of
  // ~156. Returns null if the merged file is absent or malformed so doLoad can
  // fall back to the per-file path — the merged file is a pure optimization and
  // can never be the sole source of the pool. COMPREHENSIVEAUDIT Phase 3.
  private async fetchMergedBank(): Promise<Array<{ filename: string; raw: any[] }> | null> {
    try {
      const response = await fetch('/data/_bank.generated.json');
      if (!response.ok) return null;
      const merged = await response.json();
      if (!Array.isArray(merged) || merged.length === 0) return null;
      const sections: Array<{ filename: string; raw: any[] }> = [];
      for (const entry of merged) {
        if (!entry || typeof entry.filename !== 'string' || !Array.isArray(entry.questions)) {
          console.error('Question bank: merged bank entry malformed; falling back to per-file load.');
          return null;
        }
        sections.push({ filename: entry.filename, raw: entry.questions });
      }
      return sections;
    } catch {
      // Missing file / parse error / offline: fall back to per-file fetches.
      return null;
    }
  }

  private async fetchSectionsPerFile(): Promise<Array<{ filename: string; raw: any[] } | null>> {
    // Fetch all section files in parallel — sequential awaits used to take
    // 30-60s with ~190 files; parallel completes in well under a second.
    return Promise.all(
      JSON_FILES.map(async (filename) => {
        try {
          const response = await fetch(filename);
          if (!response.ok) {
            console.error(`Question bank: ${filename} returned HTTP ${response.status}`);
            return null;
          }
          const raw = await response.json();
          if (!Array.isArray(raw)) {
            console.error(`Question bank: ${filename} is not an array`);
            return null;
          }
          return { filename, raw };
        } catch (err) {
          console.error(`Failed to load ${filename}:`, err);
          return null;
        }
      })
    );
  }

  /**
   * Which PTs have an authored sidecar, from the generated manifest.
   *
   * Returns null when the manifest is absent or unreadable, which means "ask
   * for all of them" — the pre-manifest behaviour. A missing manifest must not
   * be able to hide explanations that are actually there.
   */
  private async fetchExplanationManifest(): Promise<Set<number> | null> {
    try {
      const res = await fetch('/data/explanations/index.json');
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.pts)) return null;
      const pts = json.pts.filter((n: unknown): n is number => typeof n === 'number');
      return pts.length > 0 ? new Set<number>(pts) : null;
    } catch {
      return null;
    }
  }

  private async mergeExplanationSidecars(): Promise<void> {
    const pts = new Set<number>();
    for (const q of this.questions.values()) pts.add(q.pt);

    // Only 21 of the bank's 59 PTs have an authored sidecar. Without the
    // manifest this asked for all 59 and ate 38 x 404 on every cold load.
    const authored = await this.fetchExplanationManifest();
    const wanted = authored ? Array.from(pts).filter((pt) => authored.has(pt)) : Array.from(pts);

    const results = await Promise.all(
      wanted.map(async (pt) => {
        try {
          const res = await fetch(`/data/explanations/PT${pt}-explanations.json`);
          if (!res.ok) return null;
          const json = await res.json();
          return json && typeof json === 'object' ? (json as Record<string, LRExplanation>) : null;
        } catch {
          return null;
        }
      }),
    );
    let attached = 0;
    for (const sidecar of results) {
      if (!sidecar) continue;
      for (const [qid, expl] of Object.entries(sidecar)) {
        const q = this.questions.get(qid);
        if (!q) continue;
        q.explanations = expl;
        if (!q.answerChoiceExplanations) {
          q.answerChoiceExplanations = this.deriveTypedExplanations(expl, q.correctAnswer);
        }
        attached += 1;
      }
    }
    if (attached > 0) {
      console.log(`Question bank: attached LSAT Lab explanations to ${attached} question(s).`);
    }
  }

  private deriveTypedExplanations(
    expl: LRExplanation,
    correctAnswer: LRQuestion['correctAnswer'],
  ): LRQuestion['answerChoiceExplanations'] | undefined {
    const style = expl.styles?.standard ?? expl.styles?.brief ?? expl.styles?.anotherWay;
    if (!style) return undefined;
    const out: any = {};
    for (const L of ['A', 'B', 'C', 'D', 'E'] as const) {
      const c = style.choices?.[L];
      const isCorrect = L === (expl.correctChoice ?? correctAnswer);
      const text = (c?.explanation || c?.text || '').trim();
      out[L] = isCorrect
        ? { verdict: 'correct', whyCorrect: text }
        : { verdict: 'incorrect', whyIncorrect: text };
    }
    return out;
  }

  private async doLoad(): Promise<void> {
    const merged = await this.fetchMergedBank();
    const results = merged ?? (await this.fetchSectionsPerFile());

    // A silently-shrunk bank looks identical to a legitimately small one. Emit a
    // loud aggregate so a partial-load regression (bad deploy, 404s) is visible
    // rather than students just quietly getting fewer questions.
    const failedCount = results.filter((r) => r === null).length;
    if (failedCount > 0) {
      console.error(
        `Question bank: ${failedCount}/${JSON_FILES.length} section files failed to load; the question pool is incomplete.`,
      );
    }

    for (const result of results) {
      if (!result) continue;
      const { filename, raw } = result;
      const pt = parseInt(filename.match(/PT(\d+)/)?.[1] || '0');
      const section = parseInt(filename.match(/S(\d+)/)?.[1] || '0');
      let count = 0;
      const removedPositions: number[] = [];
      const normalizedRaw = normalizeQuestionTextFields(raw);

      for (const item of normalizedRaw) {
        const qnum = item.questionNumber || 0;
        const qid = hashQid(pt, section, qnum);

        // The published test can retain a numbered position that LSAC removed
        // from scoring. Keep its position in the manifest, never in the pool.
        if (item.status === 'removed') {
          removedPositions.push(qnum);
          continue;
        }

        if (!item.answerChoices || !item.correctAnswer || !item.questionStem) {
          console.warn(`Invalid question: ${qid}`);
          continue;
        }

        const difficulty = item.questionDifficulty || item.Question_Difficulty || 3;
        const qtype = normalizeQType(item.questionType || '', item.questionStem);

        this.questions.set(qid, {
          qid,
          pt,
          section,
          qnum,
          qtype,
          reasoningType: Array.isArray(item.reasoningType) ? item.reasoningType : (item.reasoningType ? [item.reasoningType] : []),
          questionFeatures: Array.isArray(item.questionFeatures) ? item.questionFeatures : undefined,
          difficulty,
          stimulus: item.stimulus,
          questionStem: item.questionStem,
          answerChoices: item.answerChoices,
          correctAnswer: item.correctAnswer,
          breakdown: item.breakdown,
          answerChoiceExplanations: item.answerChoiceExplanations,
        });

        count++;
      }

      if (count > 0) {
        this.manifest.sections.push({ pt, section, count, filename, removedPositions });
      }
    }

    // Merge per-question LSAT Lab explanations from
    // /data/explanations/PT<n>-explanations.json (one file per preptest).
    // index.json says which ones exist, so unauthored PTs are not requested;
    // a miss is still non-fatal if the manifest is stale.
    await this.mergeExplanationSidecars();

    // Build manifest
    this.manifest.totalQuestions = this.questions.size;
    
    for (const q of this.questions.values()) {
      this.manifest.byPT[`PT${q.pt}`] = (this.manifest.byPT[`PT${q.pt}`] || 0) + 1;
      this.manifest.byQType[q.qtype] = (this.manifest.byQType[q.qtype] || 0) + 1;
      this.manifest.byDifficulty[q.difficulty] = (this.manifest.byDifficulty[q.difficulty] || 0) + 1;
      this.manifest.bySection[q.section] = (this.manifest.bySection[q.section] || 0) + 1;
      for (const r of q.reasoningType || []) {
        this.manifest.byReasoningType[r] =
          (this.manifest.byReasoningType[r] || 0) + 1;
      }
      for (const f of q.questionFeatures || []) {
        this.manifest.byFeature[f] = (this.manifest.byFeature[f] || 0) + 1;
      }
    }

    // Log summary with unknown types
    const unknownCount = this.manifest.byQType['Unknown'] || 0;
    const uniqueTypes = Object.keys(this.manifest.byQType).length;
    console.log('Question bank loaded:', {
      total: this.manifest.totalQuestions,
      uniqueTypes,
      unknownCount,
      types: Object.keys(this.manifest.byQType).sort()
    });
    
    if (unknownCount > 0) {
      const unknownQuestions = Array.from(this.questions.values())
        .filter(q => q.qtype === 'Unknown')
        .slice(0, 5);
      console.warn(`Found ${unknownCount} questions with unknown types. Sample:`, 
        unknownQuestions.map(q => ({ qid: q.qid, stem: q.questionStem.substring(0, 80) })));
    }
  }

  getManifest(): QuestionManifest {
    return this.manifest;
  }

  getQuestion(qid: string): LRQuestion | undefined {
    return this.questions.get(qid);
  }

  getAllQuestions(): LRQuestion[] {
    return Array.from(this.questions.values());
  }

  getQuestionsByFilter(filters: {
    qtypes?: string[];
    difficulties?: number[];
    pts?: number[];
    sections?: number[];
    qfeatures?: string[];
    questionFeatures?: string[];
    reasoningTypes?: string[];
    searchQuery?: string;
    questionNumber?: number;
  }): LRQuestion[] {
    const featureFilters = filters.qfeatures ?? filters.questionFeatures ?? [];

    return this.getAllQuestions().filter((q) => {
      if (filters.qtypes && filters.qtypes.length > 0 && !filters.qtypes.includes(q.qtype)) {
        return false;
      }
      if (filters.difficulties && filters.difficulties.length > 0 && !filters.difficulties.includes(q.difficulty)) {
        return false;
      }
      if (filters.pts && filters.pts.length > 0 && !filters.pts.includes(q.pt)) {
        return false;
      }
      if (filters.sections && filters.sections.length > 0 && !filters.sections.includes(q.section)) {
        return false;
      }
      if (filters.questionNumber !== undefined && Number.isFinite(filters.questionNumber) && q.qnum !== filters.questionNumber) {
        return false;
      }
      if (
        featureFilters.length > 0 &&
        !(q.questionFeatures || []).some((feature) => featureFilters.includes(feature))
      ) {
        return false;
      }
      if (
        filters.reasoningTypes &&
        filters.reasoningTypes.length > 0 &&
        !(q.reasoningType || []).some((reasoningType) => filters.reasoningTypes!.includes(reasoningType))
      ) {
        return false;
      }
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.trim().toLowerCase();
        const searchable = [
          q.qid,
          q.stimulus ?? '',
          q.questionStem,
          ...Object.values(q.answerChoices),
          q.qtype,
          ...(q.reasoningType || []),
          ...(q.questionFeatures || []),
        ].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }

  getSection(pt: number, section: number): LRQuestion[] {
    return this.getAllQuestions()
      .filter(q => q.pt === pt && q.section === section)
      .sort((a, b) => a.qnum - b.qnum);
  }

  shuffleQuestions(questions: LRQuestion[]): LRQuestion[] {
    return shuffleArray(questions);
  }
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Singleton instance
export const questionBank = new QuestionBank();
