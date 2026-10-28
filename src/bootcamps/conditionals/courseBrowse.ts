import type { OpeningCourseUrl } from './components/OpeningCourse';
import type { OpeningCourseStep } from './openingCoursePath';
import { COURSE_LIST_QUERY_KEYS, courseListUrl } from './courseNavigation';

export type CourseBrowseKind = 'lessons' | 'drills' | 'flashcards';
export interface CourseBrowseContext { chapter?: number; from?: string }
export const COURSE_CHAPTER_TITLES: Readonly<Record<number, string>> = {
  1: 'Read a conditional', 2: 'AND, OR and the contrapositive', 3: 'Group 3 and Group 4',
  4: 'Two-way rules and denying a rule', 5: 'Use facts and connect rules',
  6: 'Some, most and all', 7: 'Reason through an argument',
};

/** Browsing context is not access: callers supply their already-authorized steps. */
export function readCourseBrowseContext(params: URLSearchParams, steps: OpeningCourseStep[]): CourseBrowseContext {
  const raw = params.get('courseChapter');
  const chapter = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
  const from = params.get('from');
  return {
    ...(chapter !== undefined && steps.some(step => (step.part ?? 1) === chapter) ? { chapter } : {}),
    ...(from && steps.some(step => step.type === 'note' && step.id === from) ? { from } : {}),
  };
}

/** Re-add only deliberate, previously validated context after ordinary URL builders clear it. */
export function withCourseBrowseContext(href: string, context: CourseBrowseContext) {
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const target = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const [path, query = ''] = target.split('?');
  const params = new URLSearchParams(query);
  COURSE_LIST_QUERY_KEYS.forEach(key => params.delete(key));
  params.delete('from');
  if (Number.isInteger(context.chapter) && context.chapter! > 0) params.set('courseChapter', String(context.chapter));
  if (context.from) params.set('from', context.from);
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}${hash}`;
}

export function courseBrowseUrl(url: OpeningCourseUrl, active: CourseBrowseKind, chapter?: number, from?: string) {
  const scopedChapter = Number.isInteger(chapter) && chapter! > 0 ? chapter : undefined;
  if (active === 'flashcards') return withCourseBrowseContext(url('tools'), { chapter: scopedChapter, from });
  const destination = scopedChapter ? `chapter-${scopedChapter}` : active === 'lessons' ? 'lessons' : 'practice';
  return courseListUrl(url, destination, scopedChapter ? { chapter: scopedChapter, content: active } : {});
}
