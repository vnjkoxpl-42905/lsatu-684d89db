import {
  FIRST_SENTENCE_QUESTIONS,
  MAIN_CONCLUSION_QUESTIONS,
  REBUTTAL_QUESTIONS,
  STRUCTURE_QUESTIONS,
  XRAY_ITEMS,
  type MainConclusionItem,
  type StructureItem,
  type XRayItem,
} from '@/bootcamps/main-conclusion/content/newDrills.source';
import type {
  CanonicalRoleLabel,
  CanonicalStructureQuestion,
  CanonicalStructureType,
  ReferenceTemplateFamily,
} from './types';

function stripIndicatorMarkup(text: string): string {
  return text.replace(/<i-w t="[^"]+">([^<]+)<\/i-w>/g, '$1');
}

export function normalizeReferenceStimulus(stimulus: string): string {
  return stripIndicatorMarkup(stimulus)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildStimulus(chunks: string[]): string {
  return chunks.map(stripIndicatorMarkup).join(' ').replace(/\s+/g, ' ').trim();
}

function deriveStructureType(item: StructureItem): CanonicalStructureType {
  return item.type === 'first' ? 'first-sentence' : 'rebuttal';
}

function structureRoleLabels(item: StructureItem): CanonicalRoleLabel[] {
  return item.parts.map((part) => {
    if (part.isC) return 'main-conclusion';
    if (part.isO) return 'opposing-view';
    if (part.isN) return 'neutral';
    return 'support';
  });
}

function stageTagsForStructure(item: StructureItem): string[] {
  if (item.type === 'first') {
    if (item.id <= 5) return ['rvf-stage-1'];
    if (item.id <= 7) return ['rvf-stage-3'];
    return ['rvf-stage-4'];
  }
  if (item.id <= 12) return ['rvf-stage-2'];
  return ['rvf-stage-4'];
}

function buildMainConclusionQuestion(item: MainConclusionItem, index: number): CanonicalStructureQuestion {
  const chunks = item.sentences.map(stripIndicatorMarkup);
  const stimulus = buildStimulus(chunks);
  const duplicateKey = normalizeReferenceStimulus(stimulus);
  return {
    id: `CANON-MC-${String(index + 1).padStart(2, '0')}`,
    stimulus,
    chunks,
    correctMainConclusionIndex: item.ans,
    supportIndexes: item.roles.flatMap((role, roleIndex) => (role === 'premise' ? [roleIndex] : [])),
    opposingViewIndexes: item.roles.flatMap((role, roleIndex) => (role === 'opposing' ? [roleIndex] : [])),
    concessionOrPivotIndexes: item.roles.flatMap((role, roleIndex) => (role === 'opposing' ? [roleIndex] : [])),
    structureType: item.roles.includes('opposing') ? 'rebuttal' : 'standard',
    sourceBootcamps: ['mainconclusion'],
    compatibleTemplates: ['main-conclusion-replica'],
    hint: item.hint,
    revealExplanation: stripIndicatorMarkup(item.breakdown),
    roleLabels: item.roles.map((role) => (role === 'conclusion' ? 'main-conclusion' : role === 'opposing' ? 'opposing-view' : 'support')),
    duplicateKey,
    compatibility: [
      {
        template: 'main-conclusion-replica',
        sourceBootcamp: 'mainconclusion',
      },
    ],
  };
}

const LIVE_MAINCONCLUSION_ARGUMENTS_DUPLICATES: MainConclusionItem[] = [
  {
    sentences: [
      'The government argues that reducing educational spending will help address budget deficits.',
      "But it is clear that the government's decision to cut funding for public education is misguided.",
      'Cutting funding for education can lead to a decline in the quality of public schools and hinder future economic development.',
    ],
    ans: 1,
    roles: ['opposing', 'conclusion', 'premise'],
    breakdown:
      "Correct. 'But' pivots to the author's real point, and the final sentence supports that criticism directly.",
    hint: "'But' pivots the argument. 'It is clear that' marks the author's opinion.",
  },
  {
    sentences: [
      'Several companies have started offering remote work options to their employees.',
      'This trend of remote work is likely to become even more prevalent in the coming years.',
      'After all, this change is in response to the growing demand for a better work-life balance.',
    ],
    ans: 1,
    roles: ['premise', 'conclusion', 'premise'],
    breakdown:
      "Correct. The prediction about remote work is the conclusion; the opening sentence is background context and the 'After all' clause supplies support.",
    hint: "'Likely' marks the prediction. 'After all' marks evidence.",
  },
];

function buildStructureQuestion(item: StructureItem): CanonicalStructureQuestion {
  const chunks = item.parts.map((part) => stripIndicatorMarkup(part.text));
  const stimulus = buildStimulus(chunks);
  const duplicateKey = normalizeReferenceStimulus(stimulus);
  const supportIndexes = item.parts.flatMap((part, index) => (part.isS ? [index] : []));
  const opposingIndexes = item.parts.flatMap((part, index) => (part.isO ? [index] : []));
  const concessionIndexes = item.parts.flatMap((part, index) => {
    const text = part.text.toLowerCase();
    return /although|even though|granted|contrary/.test(text) ? [index] : [];
  });

  return {
    id: `CANON-STR-${String(item.id).padStart(2, '0')}`,
    stimulus,
    chunks,
    correctMainConclusionIndex: item.parts.findIndex((part) => part.isC),
    supportIndexes,
    opposingViewIndexes: opposingIndexes,
    concessionOrPivotIndexes: concessionIndexes,
    structureType: deriveStructureType(item),
    sourceBootcamps: ['structuredrill', 'mainconclusionrebuttalvsfirst'],
    compatibleTemplates: ['structured-dissection-replica', 'rebuttal-vs-first-replica'],
    hint: 'Separate the author’s claim from the setup around it. First-sentence items open with the point; rebuttal items pivot into it.',
    revealExplanation: item.feedback,
    roleLabels: structureRoleLabels(item),
    duplicateKey,
    compatibility: [
      {
        template: 'structured-dissection-replica',
        sourceBootcamp: 'structuredrill',
      },
      {
        template: 'rebuttal-vs-first-replica',
        sourceBootcamp: 'mainconclusionrebuttalvsfirst',
        stageTags: stageTagsForStructure(item),
      },
    ],
  };
}

const ARGUMENTS_FOUNDATIONS_DUPLICATE_SEEDS = [
  normalizeReferenceStimulus(
    "The government argues that reducing educational spending will help address budget deficits. But it is clear that the government's decision to cut funding for public education is misguided. Cutting funding for education can lead to a decline in the quality of public schools and hinder future economic development.",
  ),
  normalizeReferenceStimulus(
    'Several companies have started offering remote work options to their employees. This trend of remote work is likely to become even more prevalent in the coming years. After all, this change is in response to the growing demand for a better work-life balance.',
  ),
];

export const CANONICAL_STRUCTURE_QUESTIONS: CanonicalStructureQuestion[] = (() => {
  const canonical = [
    ...MAIN_CONCLUSION_QUESTIONS.map(buildMainConclusionQuestion),
    ...LIVE_MAINCONCLUSION_ARGUMENTS_DUPLICATES.map((item, index) =>
      buildMainConclusionQuestion(item, MAIN_CONCLUSION_QUESTIONS.length + index),
    ),
    ...STRUCTURE_QUESTIONS.map(buildStructureQuestion),
  ];

  return canonical.map((question) => {
    if (!ARGUMENTS_FOUNDATIONS_DUPLICATE_SEEDS.includes(question.duplicateKey)) {
      return question;
    }

    return {
      ...question,
      sourceBootcamps: [...question.sourceBootcamps, 'arguments-foundations'],
      compatibleTemplates: Array.from(
        new Set<ReferenceTemplateFamily>([...question.compatibleTemplates, 'arguments-foundations-mini']),
      ),
      compatibility: [
        ...question.compatibility,
        {
          template: 'arguments-foundations-mini',
          sourceBootcamp: 'arguments-foundations',
        },
      ],
    };
  });
})();

export const CANONICAL_MAIN_CONCLUSION_QUESTIONS = CANONICAL_STRUCTURE_QUESTIONS.filter((question) =>
  question.compatibleTemplates.includes('main-conclusion-replica'),
);

export const CANONICAL_STRUCTURED_DRILL_QUESTIONS = CANONICAL_STRUCTURE_QUESTIONS.filter((question) =>
  question.compatibleTemplates.includes('structured-dissection-replica'),
);

const RVF_REPLICA_POOL = CANONICAL_STRUCTURED_DRILL_QUESTIONS;

export const CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS = [
  {
    id: 'stage-1',
    title: 'Stage 1',
    description: 'Find the obvious first-sentence conclusions fast.',
    questions: RVF_REPLICA_POOL.filter((question) => question.structureType === 'first-sentence').slice(0, 5),
  },
  {
    id: 'stage-2',
    title: 'Stage 2',
    description: 'Spot the rebuttal pivots and rejected viewpoints.',
    questions: RVF_REPLICA_POOL.filter((question) => question.structureType === 'rebuttal').slice(0, 5),
  },
  {
    id: 'stage-3',
    title: 'Stage 3',
    description: 'Mixed reads with deceptive openers.',
    questions: [
      ...RVF_REPLICA_POOL.filter((question) => question.structureType === 'first-sentence').slice(5, 8),
      ...RVF_REPLICA_POOL.filter((question) => question.structureType === 'rebuttal').slice(5, 7),
    ],
  },
  {
    id: 'stage-4',
    title: 'Stage 4',
    description: 'Final quick-hit comparison reps.',
    questions: [
      ...RVF_REPLICA_POOL.filter((question) => question.structureType === 'first-sentence').slice(8, 9),
      ...RVF_REPLICA_POOL.filter((question) => question.structureType === 'rebuttal').slice(7, 11),
    ],
  },
];

export const FOUNDATIONAL_REVEAL_DEMOS: XRayItem[] = XRAY_ITEMS;

export const FIRST_SENTENCE_REFERENCE_BANK = FIRST_SENTENCE_QUESTIONS;
export const REBUTTAL_REFERENCE_BANK = REBUTTAL_QUESTIONS;
