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
    id: 'argument-basics',
    type: 'note',
    title: 'Argument Anatomy',
    route: '/bootcamp/intro-to-lr/lessons/notes/argument-basics',
    description: 'Claim, support, and structure',
    phase: 'Argument Basics',
  },
  {
    id: 'core-indicators',
    type: 'reference',
    title: 'Core Indicator Words',
    route: '/bootcamp/intro-to-lr/reference/indicators-core',
    description: 'Conclusion and FABS (Premise) indicators only.',
    phase: 'Indicator Recognition',
  },
  {
    id: 'two-part-check',
    type: 'reference',
    title: '2-Part Conclusion Check',
    route: '/bootcamp/intro-to-lr/reference/2-part-check',
    description: 'Verify every conclusion candidate',
    phase: '2-Part Conclusion Check',
  },
  {
    id: 'indicator-recognition',
    type: 'drill',
    title: 'Indicator Recognition',
    route: '/bootcamp/intro-to-lr/drills/3.1',
    description: 'Signal words',
    phase: 'Indicator Recognition',
  },
  {
    id: 'structure-check',
    type: 'tool',
    title: 'Structure Check',
    route: '/bootcamp/intro-to-lr/reference/named-tools/NT-Stegosaurus-Interrogation',
    description: 'Quick role diagnostic',
    phase: 'Structure Check',
  },
  {
    id: 'structure-reading',
    type: 'drill',
    title: 'Structure Reading',
    route: '/bootcamp/intro-to-lr/drills/3.2',
    description: 'Sentence roles',
    phase: 'Structure Reading',
  },
  {
    id: 'where-conclusions-hide',
    type: 'note',
    title: 'Where Conclusions Hide',
    route: '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide',
    description: 'Conclusion placement',
    phase: 'Conclusion Placement',
  },
  {
    id: 'pivot-words',
    type: 'reference',
    title: 'Pivot Words',
    route: '/bootcamp/intro-to-lr/reference/pivots',
    description: 'Conclusion placement via pivots',
    phase: 'Conclusion Placement',
  },
  {
    id: 'upside-down-argument',
    type: 'tool',
    title: 'Upside-Down Argument',
    route: '/bootcamp/intro-to-lr/reference/named-tools/NT-Upside-Down-Argument',
    description: 'Conclusion before support',
    phase: 'Conclusion Placement',
  },
  {
    id: 'first-sentence-conclusions',
    type: 'drill',
    title: 'First-Sentence Conclusions',
    route: '/bootcamp/intro-to-lr/drills/3.3',
    description: 'First-sentence patterns',
    phase: 'Conclusion Placement',
  },
  {
    id: 'rebuttal-trojan-horse',
    type: 'reference',
    title: 'Rebuttal / Trojan Horse',
    route: '/bootcamp/intro-to-lr/reference/rebuttal-structure',
    description: 'Structure of disagreement',
    phase: 'Rebuttal Recognition',
  },
  {
    id: 'opposing-concession-words',
    type: 'reference',
    title: 'Opposing & Concession Words',
    route: '/bootcamp/intro-to-lr/reference/opposing-concession',
    description: 'Signals for the Trojan Horse',
    phase: 'Rebuttal Recognition',
  },
  {
    id: 'rebuttal-conclusions',
    type: 'drill',
    title: 'Rebuttal Conclusions',
    route: '/bootcamp/intro-to-lr/drills/3.4',
    description: 'Opposing view structure',
    phase: 'Rebuttal Recognition',
  },
  {
    id: 'rebuttal-practice',
    type: 'practice',
    title: 'Rebuttal Main Conclusion Practice',
    route: '/bootcamp/intro-to-lr/practice-drills/rebuttal-conclusions',
    description: 'Applied practice set',
    phase: 'Rebuttal Recognition',
  },
  {
    id: 'layered-arguments',
    type: 'note',
    title: 'Layered Arguments',
    route: '/bootcamp/intro-to-lr/lessons/notes/layered-arguments',
    description: 'Premise stacks',
    phase: 'Layered Arguments',
  },
  {
    id: 'matching-the-answer',
    type: 'note',
    title: 'Matching the Answer',
    route: '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer',
    description: 'Matching strategy',
    phase: 'Matching the Answer',
  },
  {
    id: 'pronoun-library',
    type: 'reference',
    title: 'Pronoun Library',
    route: '/bootcamp/intro-to-lr/reference/pronoun-library',
    description: 'Replace vague references',
    phase: 'Matching the Answer',
  },
  {
    id: 'pronoun-replacement-drill',
    type: 'drill',
    title: 'Pronoun Replacement Drill',
    route: '/bootcamp/intro-to-lr/drills/3.7',
    description: 'Vague reference drill',
    phase: 'Matching the Answer',
  },
  {
    id: 'simulator-bank',
    type: 'capstone',
    title: 'Question Bank',
    route: '/bootcamp/intro-to-lr/simulator/bank',
    description: 'Apply the full framework',
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
