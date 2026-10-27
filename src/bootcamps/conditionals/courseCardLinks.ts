import type { OpeningCourseStep } from './openingCoursePath';
import type { OpeningCourseUrl } from './components/OpeningCourse';
import { flashcardUrl } from './flashcardNavigation';
import { allowedSkillGroups, skillPracticeUrl } from './skillPractice';
import type { GroupId } from '@/features/conditional-refresher/content';

export interface CourseCardLink { id: string; label: string; href: string; kind: 'deck' | 'sentence'; deck?: string; groups?: GroupId[] }

/** Relevance is intersected with authorized course content; it never supplies access. */
export function relevantCourseCardLinks(relevant: OpeningCourseStep[], authorized: OpeningCourseStep[], url: OpeningCourseUrl, from?: string): CourseCardLink[] {
  const allowedIds = new Set(authorized.map(step => step.id));
  const actual = relevant.filter(step => allowedIds.has(step.id));
  const returnTo = from && actual.some(step => step.type === 'note' && step.id === from) ? from : undefined;
  const permittedGroups = allowedSkillGroups(authorized);
  const groups = allowedSkillGroups(actual).filter(group => permittedGroups.includes(group));
  const links: CourseCardLink[] = [];
  const foundation = (steps: OpeningCourseStep[]) => steps.some(step => ['orientation', 'sufficient-necessary'].includes(step.unitId));
  const addDeck = (deck: string, label: string) => links.push({ id: deck, label, kind: 'deck', deck, href: flashcardUrl(url, deck, undefined, returnTo) });
  if (foundation(actual) && foundation(authorized)) addDeck('foundation', 'Sufficient and necessary');
  if (groups.includes('g1')) addDeck('group-1', 'Group 1 words');
  if (groups.includes('g2')) addDeck('group-2', 'Group 2 words');
  if (groups.includes('g1') && groups.includes('g2')) addDeck('indicators', 'Indicator words');
  for (const group of groups) links.push({ id: `sentence-${group}`, label: `Group ${group.slice(1)} sentence flashcards`, kind: 'sentence', groups: [group],
    href: skillPracticeUrl(url, { kind: 'translate-cards', groups: [group], stage: 'translate', review: 'all', from: returnTo }) });
  if (groups.length > 1) links.push({ id: 'sentence-mixed', label: 'Mixed sentence flashcards', kind: 'sentence', groups: [...groups],
    href: skillPracticeUrl(url, { kind: 'translate-cards', groups, stage: 'translate', review: 'all', from: returnTo }) });
  return links;
}
