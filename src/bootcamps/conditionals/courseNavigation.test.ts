import { describe, expect, it } from 'vitest';
import { COURSE_STEP_REGISTRY, LEGACY_OPENING_COURSE_PATH, type OpeningCourseStep } from './openingCoursePath';
import { applyConditionalRequirements, PRE_SPLIT_REQUIRED_STEP_IDS } from './courseRequirements';
import { createEditionCourseStore } from './courseProgress';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { courseChapterProgress, courseListUrl, courseStepLink, courseStepStatus, filterCourseSteps, parseCourseListFilters } from './courseNavigation';

const adjusted = applyConditionalRequirements(COURSE_STEP_REGISTRY, { source: 'pre-split-default', revision: 'pre-split-default', requiredStepIds: [...PRE_SPLIT_REQUIRED_STEP_IDS] });
const url = (id: string, run = false) => `/opening/${id}?assignment=owned&edition=${FULL_CONDITIONAL_EDITION}${run ? '&run=1' : ''}&courseStatus=completed`;
const stamp = { updatedAt: '2026-10-27T00:00:00Z' };

describe('course list filters', () => {
  it('normalises invalid and unavailable values without changing authorized steps', () => {
    expect(parseCourseListFilters(new URLSearchParams('courseChapter=999&courseContent=oops&courseStatus=done'), adjusted)).toEqual({ content: 'all', status: 'all' });
    expect(parseCourseListFilters(new URLSearchParams('courseChapter=3&courseContent=drills&courseStatus=in-progress'), adjusted)).toEqual({ chapter: 3, content: 'drills', status: 'in-progress' });
    expect(parseCourseListFilters(new URLSearchParams('courseChapter=3'), LEGACY_OPENING_COURSE_PATH).chapter).toBeUndefined();
  });
  it('matches only existing content and saved statuses', () => {
    const steps = adjusted.filter(step => step.part === 3);
    const first = steps.find(step => step.type === 'note')!;
    const saved = { [first.id]: { status: 'started' as const } };
    expect(filterCourseSteps(adjusted, saved, { chapter: 3, content: 'lessons', status: 'in-progress' })).toEqual([first]);
    expect(filterCourseSteps(adjusted, saved, { chapter: 3, content: 'drills', status: 'completed' })).toEqual([]);
    expect(courseStepStatus({ status: 'new' })).toBe('not-started');
    expect(courseStepStatus()).toBe('not-started');
    expect(courseStepStatus({ status: 'done' })).toBe('completed');
  });
  it('decorates only the intended list, retaining assignment and edition', () => {
    const result = new URL(courseListUrl(url, 'chapter-3', { chapter: 3, content: 'lessons' }), 'https://example.test');
    expect(result.pathname).toBe('/opening/chapter-3');
    expect(result.searchParams.get('assignment')).toBe('owned');
    expect(result.searchParams.get('edition')).toBe(FULL_CONDITIONAL_EDITION);
    expect(result.searchParams.get('courseStatus')).toBeNull();
    expect(result.searchParams.get('courseContent')).toBe('lessons');
    expect(courseListUrl(() => '/lessons', 'lessons')).toBe('/lessons');
  });
});

describe('course progress and direct destinations', () => {
  it('uses required flags after the assignment requirements transform', () => {
    const chapter = adjusted.filter(step => step.part === 2);
    const saved = Object.fromEntries(chapter.map(step => [step.id, { status: 'done' as const }]));
    const progress = courseChapterProgress(chapter, saved);
    expect(progress.requiredTotal).toBe(chapter.filter(step => step.requiredForEditionCompletion !== false).length);
    expect(progress.optionalTotal).toBe(chapter.filter(step => step.requiredForEditionCompletion === false).length);
    expect(progress.requiredDone).toBe(progress.requiredTotal);
    expect(progress.lessonTotal + progress.drillTotal).toBe(progress.requiredTotal);
    expect(progress.status).toBe('completed');
    expect(progress.percent).toBe(100);
  });
  it('never calls a zero-required chapter complete', () => {
    const optional = [{ ...adjusted[0], requiredForEditionCompletion: false }];
    expect(courseChapterProgress(optional, {}).status).toBe('not-started');
    expect(courseChapterProgress(optional, { [optional[0].id]: { status: 'done' } })).toMatchObject({ status: 'in-progress', percent: 0, requiredTotal: 0, optionalTotal: 1 });
    expect(courseChapterProgress([], {})).toMatchObject({ status: 'not-started', percent: 0 });
  });
  it('filters never mutate progress or recompute the source denominator', () => {
    const saved = { [adjusted[0].id]: { status: 'done' as const } };
    const before = JSON.stringify(saved);
    const total = courseChapterProgress(adjusted, saved);
    filterCourseSteps(adjusted, saved, { chapter: 7, content: 'drills', status: 'completed' });
    expect(courseChapterProgress(adjusted, saved)).toEqual(total);
    expect(JSON.stringify(saved)).toBe(before);
  });
  it('reads projected historical completion without writing or resuming it', () => {
    let writes = 0;
    const step = LEGACY_OPENING_COURSE_PATH[0];
    const store = createEditionCourseStore({ [step.id]: { ...stamp, status: 'done' } }, () => { writes++; }, adjusted, FULL_CONDITIONAL_EDITION);
    expect(courseChapterProgress([step], store.steps).status).toBe('completed');
    courseStepLink(step, store.steps[step.id], url);
    expect(writes).toBe(0);
  });
  it('keeps every actual chapter destination on its original authorized step ID', () => {
    for (const list of [LEGACY_OPENING_COURSE_PATH, adjusted]) for (const step of list) {
      const initial = courseStepLink(step, undefined, url);
      const ongoing = courseStepLink(step, { status: 'started' }, url);
      const complete = courseStepLink(step, { status: 'done' }, url);
      expect(new URL(initial.href, 'https://example.test').pathname).toBe(`/opening/${step.id}`);
      expect(new URL(initial.href, 'https://example.test').searchParams.has('run')).toBe(false);
      expect(new URL(ongoing.href, 'https://example.test').searchParams.has('run')).toBe(step.type === 'drill');
      expect(new URL(complete.href, 'https://example.test').searchParams.has('run')).toBe(false);
      expect(initial.label).toMatch(/^Start /);
      expect(ongoing.label).toMatch(/^Continue /);
      expect(complete.label).toMatch(/^Review /);
    }
  });
});
