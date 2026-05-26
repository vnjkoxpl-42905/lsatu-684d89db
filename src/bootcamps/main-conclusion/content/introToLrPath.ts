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
}

export const INTEGRATED_PATH: PathAction[] = [
  { id: 'argument-basics', type: 'note', title: 'Argument Basics', route: '/bootcamp/intro-to-lr/lessons/notes/argument-basics', description: 'Basic structure' },
  { id: 'build-conclusion', type: 'checkpoint', title: 'Build the Conclusion', route: '/bootcamp/intro-to-lr/drills/3.6', description: 'Checkpoint' },
  { id: 'indicator-recognition', type: 'drill', title: 'Indicator Recognition', route: '/bootcamp/intro-to-lr/drills/3.1', description: 'Signal words' },
  { id: 'structure-reading', type: 'drill', title: 'Structure Reading', route: '/bootcamp/intro-to-lr/drills/3.2', description: 'Sentence roles' },
  { id: 'where-conclusions-hide', type: 'note', title: 'Where Conclusions Hide', route: '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide', description: 'Conclusion placement' },
  { id: 'first-sentence-conclusions', type: 'drill', title: 'First-Sentence Conclusions', route: '/bootcamp/intro-to-lr/drills/3.3', description: 'First-sentence patterns' },
  { id: 'first-sentence-practice', type: 'practice', title: 'First-Sentence Main Conclusion', route: '/bootcamp/intro-to-lr/practice-drills/first-sentence-conclusions', description: 'Practice set' },
  { id: 'rebuttal-conclusions', type: 'drill', title: 'Rebuttal Conclusions', route: '/bootcamp/intro-to-lr/drills/3.4', description: 'Opposing view structure' },
  { id: 'rebuttal-practice', type: 'practice', title: 'Rebuttal Main Conclusion', route: '/bootcamp/intro-to-lr/practice-drills/rebuttal-conclusions', description: 'Practice set' },
  { id: 'layered-arguments', type: 'note', title: 'Layered Arguments', route: '/bootcamp/intro-to-lr/lessons/notes/layered-arguments', description: 'Premise stacks' },
  { id: 'chain-mapping', type: 'drill', title: 'Chain Mapping', route: '/bootcamp/intro-to-lr/drills/3.5', description: 'Logical chains' },
  { id: 'nested-claims', type: 'drill', title: 'Nested Claims', route: '/bootcamp/intro-to-lr/drills/3.9', description: 'Nested arguments' },
  { id: 'matching-the-answer', type: 'note', title: 'Matching the Answer', route: '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer', description: 'Matching strategy' },
  { id: 'pronoun-replacement', type: 'drill', title: 'Pronoun Replacement', route: '/bootcamp/intro-to-lr/drills/3.7', description: 'Vague reference' },
  { id: 'read-cover-restate', type: 'checkpoint', title: 'Read, Cover, Restate', route: '/bootcamp/intro-to-lr/drills/3.8', description: 'Plain English check' },
  { id: 'simulator-bank', type: 'capstone', title: 'Question Bank', route: '/bootcamp/intro-to-lr/simulator/bank', description: 'Review all questions' },
  { id: 'trap-master', type: 'capstone', title: 'Trap Master', route: '/bootcamp/intro-to-lr/simulator/trap-master', description: 'Review common mistakes' },
  { id: 'hard-mode', type: 'capstone', title: 'Hard Mode', route: '/bootcamp/intro-to-lr/simulator/hard-mode', description: 'Challenge yourself' },
];

export const INTRO_LR_PATH = INTEGRATED_PATH;

const PRACTICE_ALIAS_MAP: Record<string, string> = {
  '/bootcamp/intro-to-lr/practice-drills/first-sentence': '/bootcamp/intro-to-lr/practice-drills/first-sentence-conclusions',
  '/bootcamp/intro-to-lr/practice-drills/rebuttal': '/bootcamp/intro-to-lr/practice-drills/rebuttal-conclusions',
  '/bootcamp/intro-to-lr/simulator/answer-key-views': '/bootcamp/intro-to-lr/simulator/bank',
};

function stripPathname(pathname: string): string {
  const [withoutQuery] = pathname.split(/[?#]/, 1);
  if (!withoutQuery) return '';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

export function normalizePathnameForAction(pathname: string): string {
  const normalized = stripPathname(pathname);

  for (const [alias, canonical] of Object.entries(PRACTICE_ALIAS_MAP)) {
    if (normalized === alias || normalized.startsWith(`${alias}/`)) {
      return normalized.replace(alias, canonical);
    }
  }

  return normalized;
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
