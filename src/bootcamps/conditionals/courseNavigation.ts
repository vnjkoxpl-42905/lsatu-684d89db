import type { OpeningCourseStep } from './openingCoursePath';
import type { CourseStepProgress } from './progress';
import type { OpeningCourseUrl } from './components/OpeningCourse';

export const COURSE_LIST_QUERY_KEYS = ['courseChapter', 'courseContent', 'courseStatus'] as const;
export type CourseSavedStatus = 'not-started' | 'in-progress' | 'completed';
export interface CourseListFilters {
  chapter?: number;
  content: 'all' | 'lessons' | 'drills';
  status: 'all' | CourseSavedStatus;
}
export type CourseSavedSteps = Readonly<Record<string, Pick<CourseStepProgress, 'status'> | undefined>>;
export const DEFAULT_COURSE_LIST_FILTERS: CourseListFilters = { content: 'all', status: 'all' };

/** These helpers receive edition-adjusted, authorized steps, never a grant registry. */
export function parseCourseListFilters(params: URLSearchParams, steps: OpeningCourseStep[]): CourseListFilters {
  const rawChapter = params.get('courseChapter');
  const chapter = rawChapter && /^\d+$/.test(rawChapter) ? Number(rawChapter) : undefined;
  const content = params.get('courseContent');
  const status = params.get('courseStatus');
  return {
    ...(chapter !== undefined && steps.some(step => (step.part ?? 1) === chapter) ? { chapter } : {}),
    content: content === 'lessons' || content === 'drills' ? content : 'all',
    status: status === 'not-started' || status === 'in-progress' || status === 'completed' ? status : 'all',
  };
}

export function courseStepStatus(saved?: { status?: string }): CourseSavedStatus {
  return saved?.status === 'done' ? 'completed' : saved?.status === 'started' ? 'in-progress' : 'not-started';
}

export function filterCourseSteps(steps: OpeningCourseStep[], saved: CourseSavedSteps, filters: CourseListFilters) {
  return steps.filter(step => (filters.chapter === undefined || (step.part ?? 1) === filters.chapter)
    && (filters.content === 'all' || step.type === (filters.content === 'lessons' ? 'note' : 'drill'))
    && (filters.status === 'all' || courseStepStatus(saved[step.id]) === filters.status));
}

export function courseChapterProgress(steps: OpeningCourseStep[], saved: CourseSavedSteps) {
  const required = steps.filter(step => step.requiredForEditionCompletion !== false);
  const lessons = required.filter(step => step.type === 'note');
  const drills = required.filter(step => step.type === 'drill');
  const done = (entries: OpeningCourseStep[]) => entries.filter(step => saved[step.id]?.status === 'done').length;
  const requiredDone = done(required);
  const completed = required.length > 0 && requiredDone === required.length;
  const touched = (required.length ? required : steps).some(step => ['started', 'done'].includes(saved[step.id]?.status ?? ''));
  const status: CourseSavedStatus = completed ? 'completed' : touched ? 'in-progress' : 'not-started';
  return { requiredTotal: required.length, requiredDone, lessonTotal: lessons.length, lessonsDone: done(lessons),
    drillTotal: drills.length, drillsDone: done(drills), optionalTotal: steps.length - required.length, status,
    percent: required.length ? Math.min(completed ? 100 : 99, Math.round(requiredDone / required.length * 100)) : 0 };
}

/** Construct the intended list explicitly instead of inheriting another list's filters. */
export function courseListUrl(url: OpeningCourseUrl, destination: string, filters: Partial<CourseListFilters> = {}) {
  const [path, query = ''] = url(destination).split('?');
  const params = new URLSearchParams(query);
  COURSE_LIST_QUERY_KEYS.forEach(key => params.delete(key));
  if (Number.isInteger(filters.chapter) && filters.chapter! > 0) params.set('courseChapter', String(filters.chapter));
  if (filters.content === 'lessons' || filters.content === 'drills' || (filters.content === 'all' && destination.startsWith('chapter-'))) params.set('courseContent', filters.content);
  if (['not-started', 'in-progress', 'completed'].includes(filters.status ?? '')) params.set('courseStatus', filters.status!);
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}`;
}

export function courseStepLink(step: OpeningCourseStep, saved: { status?: string } | undefined, url: OpeningCourseUrl) {
  const action = saved?.status === 'done' ? 'Review' : saved?.status === 'started' ? 'Continue' : 'Start';
  return { href: url(step.id, step.type === 'drill' && saved?.status === 'started'),
    label: `${action} ${step.type === 'drill' ? 'drill' : `lesson ${step.lessonNumber}`}` };
}
