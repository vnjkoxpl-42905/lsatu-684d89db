/**
 * Intro to LR Path - Granular Action Sequence
 * Sequence for Intro to LR bootcamp.
 */

export type ActionType = 'note' | 'tool' | 'reference' | 'checkpoint' | 'drill' | 'practice' | 'capstone';

export interface PathAction {
  id: string;
  type: ActionType;
  title: string;
  route: string;
  description: string;
  phase?: string;
}

export const INTEGRATED_PATH: PathAction[] = [
  {
    id: 'how-to-read-lr-stimulus',
    type: 'note',
    title: 'How to Read an LR Stimulus',
    route: '/bootcamp/intro-to-lr/lessons/notes/how-to-read-lr-stimulus',
    description: 'Start with active reading and the right student mindset.',
  },
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
    id: 'structure-reading',
    type: 'drill',
    title: 'Structure Reading',
    route: '/bootcamp/intro-to-lr/drills/3.2',
    description: 'Label sentence roles once the note sequence is in place.',
    phase: 'Drills',
  },
  {
    id: 'indicator-recognition',
    type: 'drill',
    title: 'Indicator Recognition',
    route: '/bootcamp/intro-to-lr/drills/3.1',
    description: 'Spot conclusion and premise signals.',
    phase: 'Drills',
  },
  {
    id: 'first-sentence-conclusions',
    type: 'drill',
    title: 'First-Sentence Conclusions',
    route: '/bootcamp/intro-to-lr/drills/3.3',
    description: 'Practice first-sentence conclusion patterns.',
    phase: 'Drills',
  },
  {
    id: 'rebuttal-conclusions',
    type: 'drill',
    title: 'Rebuttal Conclusions',
    route: '/bootcamp/intro-to-lr/drills/3.4',
    description: 'Practice author-view turns.',
    phase: 'Drills',
  },
  {
    id: 'practice-path',
    type: 'practice',
    title: 'Practice Path',
    route: '/bootcamp/intro-to-lr/practice-drills',
    description: 'Move from the note sequence into focused live reps.',
    phase: 'Practice',
  },
  {
    id: 'simulator-bank',
    type: 'capstone',
    title: 'Question Bank',
    route: '/bootcamp/intro-to-lr/simulator/bank',
    description: 'Apply the full framework to mixed sets',
    phase: 'Final Application',
  },
  {
    id: 'trap-master',
    type: 'capstone',
    title: 'Trap Master',
    route: '/bootcamp/intro-to-lr/simulator/trap-master',
    description: 'Diagnose recurring traps',
    phase: 'Final Application',
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
  '/bootcamp/intro-to-lr/lessons/notes/argument-basics': '/bootcamp/intro-to-lr/lessons/notes/how-to-read-lr-stimulus',
  '/bootcamp/intro-to-lr/lessons/notes/argument-anatomy': '/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question',
  '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide': '/bootcamp/intro-to-lr/lessons/notes/conclusions',
  '/bootcamp/intro-to-lr/lessons/notes/layered-arguments': '/bootcamp/intro-to-lr/lessons/notes/beyond-premises-and-conclusions',
  '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer': '/bootcamp/intro-to-lr/lessons/notes/two-part-conclusion-check',
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
