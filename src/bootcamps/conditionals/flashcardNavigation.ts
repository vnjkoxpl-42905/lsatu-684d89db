import type { OpeningCourseUrl } from './components/OpeningCourse';
import { clearSkillQuery } from './skillPractice';

/** Precise existing deck/card links retain their historical query contract. */
export function flashcardUrl(url: OpeningCourseUrl, group: string, card?: string, from?: string) {
  const target = url('tools');
  const [path, query = ''] = target.split('?');
  const params = clearSkillQuery(new URLSearchParams(query));
  params.set('deck', group);
  if (card) params.set('card', card);
  if (from) params.set('from', from);
  return `${path}?${params}`;
}
