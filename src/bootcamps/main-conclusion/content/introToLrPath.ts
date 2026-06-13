/**
 * Intro to LR Path - Granular Action Sequence
 * Sequence for Intro to LR bootcamp.
 */

import {
  MAIN_CONCLUSION_PRACTICE_CARDS,
  buildPracticeDrillHref,
  buildPracticeDrillLinkState,
} from '@/bootcamps/main-conclusion/data/practiceDrillCards';

export type ActionType = 'note' | 'tool' | 'reference' | 'checkpoint' | 'drill' | 'practice' | 'capstone';

export interface PathAction {
  id: string;
  type: ActionType;
  title: string;
  route: string;
  description: string;
  phase?: string;
  buttonLabel?: string;
  linkState?: unknown;
  metadata?: Array<{ label: string; value: string }>;
  constraint?: string;
}

const [FIRST_SENTENCE_MAIN_CONCLUSION_CARD, REBUTTAL_MAIN_CONCLUSION_CARD] = MAIN_CONCLUSION_PRACTICE_CARDS;

export const INTEGRATED_PATH: PathAction[] = [
  {
    id: 'three-parts-lr-question',
    type: 'note',
    title: 'The Three Parts of an LR Question',
    route: '/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question',
    description: 'See the stimulus, stem, and answer choices in the right order.',
  },
  {
    id: 'so-an-argument',
    type: 'note',
    title: 'So, An Argument',
    route: '/bootcamp/intro-to-lr/lessons/notes/so-an-argument',
    description: 'Lock in the basic picture: premises support conclusions.',
  },
  {
    id: 'premises',
    type: 'note',
    title: 'Premises',
    route: '/bootcamp/intro-to-lr/lessons/notes/premises',
    description: 'Learn what counts as evidence and how to treat it on the LSAT.',
  },
  {
    id: 'conclusions',
    type: 'note',
    title: 'Conclusions',
    route: '/bootcamp/intro-to-lr/lessons/notes/conclusions',
    description: 'Focus on the claim the author is trying to prove.',
  },
  {
    id: 'five-types-of-conclusions',
    type: 'note',
    title: 'Five Types of Conclusions',
    route: '/bootcamp/intro-to-lr/lessons/notes/five-types-of-conclusions',
    description: 'Name the type of claim so you can predict the weakness.',
  },
  {
    id: 'conclusion-type-lab',
    type: 'drill',
    title: 'Conclusion Type Lab',
    route: '/bootcamp/intro-to-lr/drills/conclusion-type-lab',
    description: 'Classify each conclusion: recommendation, causal, prediction, judgment, or rebuttal.',
    phase: 'Drills',
  },
  {
    id: 'beyond-premises-and-conclusions',
    type: 'note',
    title: 'Beyond Premises and Conclusions',
    route: '/bootcamp/intro-to-lr/lessons/notes/beyond-premises-and-conclusions',
    description: 'Separate context, opposition, concessions, and pivots from the real argument.',
  },
  {
    id: 'two-part-conclusion-check',
    type: 'note',
    title: 'The 2-Part Conclusion Check',
    route: '/bootcamp/intro-to-lr/lessons/notes/two-part-conclusion-check',
    description: 'Run the two-question filter on every conclusion candidate.',
  },
  {
    id: 'main-conclusion-lab',
    type: 'drill',
    title: 'Main Conclusion Lab',
    route: '/bootcamp/intro-to-lr/drills/main-conclusion-lab',
    description: 'Use the direct replica format to find the main conclusion in full stimuli.',
    phase: 'Drills',
  },
  {
    id: 'first-sentence-vs-rebuttal-structures',
    type: 'note',
    title: 'First-Sentence vs Rebuttal Structures',
    route: '/bootcamp/intro-to-lr/lessons/notes/first-sentence-vs-rebuttal-structures',
    description: 'Learn the two dominant conclusion placements before you enter the drill labs.',
  },
  {
    id: 'first-sentence-vs-rebuttal-lab',
    type: 'drill',
    title: 'First-Sentence vs Rebuttal Lab',
    route: '/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab',
    description: 'Run fast comparison reps on the two main conclusion structures.',
    phase: 'Drills',
  },
  {
    id: 'first-sentence-main-conclusion',
    type: 'drill',
    title: FIRST_SENTENCE_MAIN_CONCLUSION_CARD.pool.title,
    route: buildPracticeDrillHref(FIRST_SENTENCE_MAIN_CONCLUSION_CARD.pool),
    description: FIRST_SENTENCE_MAIN_CONCLUSION_CARD.description,
    phase: 'Drills',
    buttonLabel: 'View Instructions',
    linkState: buildPracticeDrillLinkState(FIRST_SENTENCE_MAIN_CONCLUSION_CARD.pool),
    metadata: [
      { label: 'Question Type', value: FIRST_SENTENCE_MAIN_CONCLUSION_CARD.questionTypeLabel },
      { label: 'Question Feature', value: FIRST_SENTENCE_MAIN_CONCLUSION_CARD.pool.qfeatures.join(', ') },
      { label: 'Count', value: `${FIRST_SENTENCE_MAIN_CONCLUSION_CARD.pool.count} questions` },
    ],
    constraint: FIRST_SENTENCE_MAIN_CONCLUSION_CARD.constraint,
  },
  {
    id: 'rebuttal-main-conclusion',
    type: 'drill',
    title: REBUTTAL_MAIN_CONCLUSION_CARD.pool.title,
    route: buildPracticeDrillHref(REBUTTAL_MAIN_CONCLUSION_CARD.pool),
    description: REBUTTAL_MAIN_CONCLUSION_CARD.description,
    phase: 'Drills',
    buttonLabel: 'View Instructions',
    linkState: buildPracticeDrillLinkState(REBUTTAL_MAIN_CONCLUSION_CARD.pool),
    metadata: [
      { label: 'Question Type', value: REBUTTAL_MAIN_CONCLUSION_CARD.questionTypeLabel },
      { label: 'Question Feature', value: REBUTTAL_MAIN_CONCLUSION_CARD.pool.qfeatures.join(', ') },
      { label: 'Count', value: `${REBUTTAL_MAIN_CONCLUSION_CARD.pool.count} questions` },
    ],
    constraint: REBUTTAL_MAIN_CONCLUSION_CARD.constraint,
  },
];

export const INTRO_LR_PATH = INTEGRATED_PATH;

const PRACTICE_ALIAS_MAP: Record<string, string> = {
  '/bootcamp/intro-to-lr/practice-drills/first-sentence': '/bootcamp/intro-to-lr/practice-drills/first-sentence-conclusions',
  '/bootcamp/intro-to-lr/practice-drills/rebuttal': '/bootcamp/intro-to-lr/practice-drills/rebuttal-conclusions',
  '/bootcamp/intro-to-lr/simulator/answer-key-views': '/bootcamp/intro-to-lr/simulator/bank',
  '/bootcamp/intro-to-lr/reference/fabs': '/bootcamp/intro-to-lr/reference/indicators',
  '/bootcamp/intro-to-lr/reference/concession-decoder': '/bootcamp/intro-to-lr/reference/rebuttal-structure',
  '/bootcamp/intro-to-lr/reference#opposing-view-filter': '/bootcamp/intro-to-lr/reference/rebuttal-structure',
  '/bootcamp/intro-to-lr/reference/opposing-view-filter': '/bootcamp/intro-to-lr/reference/rebuttal-structure',
  '/bootcamp/intro-to-lr/lessons/notes/argument-basics': '/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question',
  '/bootcamp/intro-to-lr/lessons/notes/argument-anatomy': '/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question',
  '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide': '/bootcamp/intro-to-lr/lessons/notes/conclusions',
  '/bootcamp/intro-to-lr/lessons/notes/layered-arguments': '/bootcamp/intro-to-lr/lessons/notes/beyond-premises-and-conclusions',
  '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer': '/bootcamp/intro-to-lr/lessons/notes/two-part-conclusion-check',
  '/bootcamp/intro-to-lr/drills/mixed-classification': '/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab',
};

function stripPathname(pathname: string): string {
  const [withoutQuery] = pathname.split(/[?]/, 1);
  if (!withoutQuery) return '';
  const [withoutHash] = withoutQuery.split(/[#]/, 1);
  if (withoutHash.length > 1 && withoutHash.endsWith('/')) {
    return withoutHash.slice(0, -1);
  }
  return withoutHash;
}

export function normalizePathnameForAction(pathname: string): string {
  const [withoutQuery] = pathname.split(/[?]/, 1);
  const normalizedWithHash = withoutQuery && withoutQuery.length > 1 && withoutQuery.endsWith('/')
    ? withoutQuery.slice(0, -1)
    : withoutQuery;

  for (const [alias, canonical] of Object.entries(PRACTICE_ALIAS_MAP)) {
    if (normalizedWithHash === alias || normalizedWithHash.startsWith(`${alias}/`)) {
      return normalizedWithHash.replace(alias, canonical);
    }
  }

  return stripPathname(pathname);
}

function matchesActionRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getCurrentActionIndex(pathname: string): number {
  const normalizedPath = normalizePathnameForAction(pathname);
  const indexedRoutes = INTEGRATED_PATH.map((action, index) => ({ action, index })).sort(
    (left, right) => right.action.route.length - left.action.route.length,
  );

  const matched = indexedRoutes.find(({ action }) => matchesActionRoute(normalizedPath, action.route));
  return matched ? matched.index : -1;
}

export function getCurrentAction(pathname: string): PathAction | null {
  const currentIndex = getCurrentActionIndex(pathname);
  return currentIndex >= 0 ? INTEGRATED_PATH[currentIndex] : null;
}

export function getNextAction(pathname: string): PathAction | null {
  const currentIndex = getCurrentActionIndex(pathname);
  if (currentIndex >= 0 && currentIndex < INTEGRATED_PATH.length - 1) {
    return INTEGRATED_PATH[currentIndex + 1];
  }
  return null;
}

export function getPreviousAction(pathname: string): PathAction | null {
  const currentIndex = getCurrentActionIndex(pathname);
  if (currentIndex > 0) {
    return INTEGRATED_PATH[currentIndex - 1];
  }
  return null;
}

export function getActionTypeLabel(type: ActionType): string {
  switch (type) {
    case 'note':
      return 'Lesson';
    case 'tool':
      return 'Tool';
    case 'reference':
      return 'Reference';
    case 'checkpoint':
      return 'Checkpoint';
    case 'drill':
      return 'Drill';
    case 'practice':
      return 'Practice';
    case 'capstone':
      return 'Capstone';
    default:
      return 'Action';
  }
}

export function getActionButtonLabel(type: ActionType): string {
  switch (type) {
    case 'note':
      return 'Read Lesson';
    case 'tool':
      return 'Open Tool';
    case 'reference':
      return 'Open Reference';
    case 'checkpoint':
      return 'Start Checkpoint';
    case 'drill':
      return 'Start Drill';
    case 'practice':
      return 'Start Practice';
    case 'capstone':
      return 'Open Capstone';
    default:
      return 'Continue';
  }
}
