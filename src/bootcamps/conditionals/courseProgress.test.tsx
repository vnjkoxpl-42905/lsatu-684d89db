import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CourseProgressProvider, type CourseProgressStore } from './courseProgress';
import { emptyProgress, nextCourseStep, parseConditionalProgress, recordCourseStep } from './progress';
import { StagedReasoningDrill } from './components/StagedReasoningDrill';

describe('opening course progress', () => {
  it('keeps the first earned completion date while navigation updates the last-edit date', () => {
    let progress = recordCourseStep(emptyProgress(), 'quiz', { status: 'started' }, '2026-10-20T10:00:00Z');
    expect(progress.course!.quiz.completedAt).toBeUndefined();
    progress = recordCourseStep(progress, 'quiz', { status: 'done' }, '2026-10-20T11:00:00Z');
    progress = recordCourseStep(progress, 'quiz', { state: { index: 2 }, completedAt: 'incorrect-overwrite' }, '2026-10-27T12:00:00Z');
    expect(progress.course!.quiz).toMatchObject({ status: 'done', completedAt: '2026-10-20T11:00:00Z', updatedAt: '2026-10-27T12:00:00Z' });
    expect(parseConditionalProgress(JSON.parse(JSON.stringify(progress))).course!.quiz.completedAt).toBe('2026-10-20T11:00:00Z');
  });
  it('lazily preserves a legacy completion date on an actual save and clears it only for a fresh attempt', () => {
    const original = { status: 'done' as const, updatedAt: '2026-10-20', state: { answer: 'old' } };
    const migrated = nextCourseStep(original, { state: { answer: 'old', index: 1 } }, '2026-10-27');
    expect(original).not.toHaveProperty('completedAt');
    expect(migrated).toMatchObject({ completedAt: '2026-10-20', updatedAt: '2026-10-27' });
    const reopened = nextCourseStep(migrated, { reopen: true, status: 'started' }, '2026-10-28');
    expect(reopened.completedAt).toBeUndefined();
    expect(nextCourseStep(reopened, { status: 'done' }, '2026-10-29').completedAt).toBe('2026-10-29');
  });
  it('keeps a finished step finished when it is revisited', () => {
    let progress = recordCourseStep(emptyProgress(), 'sufficient-practice', { status: 'done', done: 24, total: 24 });
    progress = recordCourseStep(progress, 'sufficient-practice', { done: 3 });
    expect(progress.course?.['sufficient-practice']).toMatchObject({ status: 'done', done: 3, total: 24 });
  });

  it('accepts records saved before course progress existed and drops malformed steps', () => {
    const legacy = emptyProgress();
    expect(parseConditionalProgress(legacy).course).toBeUndefined();
    const mixed = { ...legacy, course: { good: { status: 'done', updatedAt: legacy.updated_at }, bad: { status: 'maybe' } } };
    expect(Object.keys(parseConditionalProgress(mixed).course!)).toEqual(['good']);
  });

  it('resumes a staged drill from the account where the student left off', () => {
    let steps: CourseProgressStore['steps'] = {};
    const store = (): CourseProgressStore => ({ steps, save: (id, patch) => { steps = recordCourseStep({ ...emptyProgress(), course: steps }, id, patch).course!; } });
    const first = render(<CourseProgressProvider store={store()}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider>);
    const options = within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
    fireEvent.click(options[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(steps['sufficient-practice']).toMatchObject({ status: 'started', total: 13 });
    first.unmount();
    localStorage.clear();
    render(<CourseProgressProvider store={store()}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider>);
    expect(screen.getByRole('heading', { name: /What complete condition/ })).toBeVisible();
  });
});
