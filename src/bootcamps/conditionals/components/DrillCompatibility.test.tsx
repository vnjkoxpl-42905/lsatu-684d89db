import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CourseProgressProvider } from '../courseProgress';
import { fullCourseLessons, fullCourseDrillSets } from '../content/fullCourseContent';
import baseline from '../content/fullCourseGradingBaseline.json';
import { gradingSignature, knownLocalSignature, DRILL_GRADING_REVISION } from '../content/drillCompatibility';
import type { FullCourseDrillSet } from '../content/fullCourseTypes';
import { FullCourseDrill } from './FullCourseDrill';
afterEach(cleanup);
const lesson = fullCourseLessons.find(l => l.id === 'exception-language')!;
const old = baseline.sets['exception-language'];
const items = structuredClone(lesson.quiz);
items[0].explanation = 'The complete reasoning starts here. Its consequence and limit remain visible.';
const drill: FullCourseDrillSet = { id: lesson.id, title: 'Pop quiz', unitId: lesson.unitId, part: 3, afterLessonId: lesson.id, instructions: [], items };
const answers = Object.fromEntries(old.map((q, i) => [q.id, { response: { kind: 'choice', optionId: q.correctOptionId }, misses: i === 0 ? 2 : 0, correct: i !== 1, resolved: true, revealed: i === 1 }]));
function saved(state: unknown, status: 'done' | 'started' = 'done') { return { [lesson.id]: { status, state, updatedAt: '2026-10-20T12:00:00Z' } }; }
describe('local known grading compatibility', () => {
  it('keeps a completed historical set done and dated when appended practice is explicitly started and reloaded', () => {
    const practice = fullCourseDrillSets.find(set => set.id === 'exception-language-practice')!;
    const previous = baseline.sets['exception-language-practice'];
    const priorAnswers = Object.fromEntries(previous.map(q => [q.id, { misses: 0, correct: true, resolved: true, revealed: false }]));
    const state = { version: 1, signature: JSON.stringify(previous), index: previous.length - 1, started: true, answers: priorAnswers };
    const save = vi.fn();
    const steps = { [practice.id]: { status: 'done' as const, state, done: previous.length, total: previous.length, updatedAt: '2026-10-20T12:00:00Z', completedAt: '2026-10-19T12:00:00Z' } };
    const view = render(<CourseProgressProvider store={{ steps, save }}><FullCourseDrill drill={practice}/></CourseProgressProvider>);
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start revised practice' }));
    const patch = save.mock.calls.at(-1)![1];
    expect(patch).toMatchObject({ status: 'done', completedAt: '2026-10-19T12:00:00Z', done: previous.length, total: previous.length });
    expect(patch).not.toHaveProperty('reopen');
    expect(patch.state.answers).toEqual(priorAnswers);
    expect(patch.state.index).toBe(previous.length);
    expect(patch.state.requiredItemIds).toHaveLength(practice.items.length);
    expect(patch.state.history[0].state).toEqual(state);
    view.unmount(); save.mockClear();
    render(<CourseProgressProvider store={{ steps: { [practice.id]: { ...steps[practice.id], ...patch } }, save }}><FullCourseDrill drill={practice}/></CourseProgressProvider>);
    expect(screen.queryByText('This practice has changed')).toBeNull();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(save.mock.calls.at(-1)![1]).toMatchObject({ status: 'done', completedAt: '2026-10-19T12:00:00Z', done: previous.length, total: previous.length });
  });
  it('recognizes exact frozen local bytes, never an invented released alias', () => {
    expect(knownLocalSignature(lesson.id, JSON.stringify(old), items)).toBe(true);
    expect(knownLocalSignature(lesson.id, 'unknown previous signature', items)).toBe(false);
    const changed = structuredClone(items); changed[0].prompt += ' with another restriction';
    expect(knownLocalSignature(lesson.id, JSON.stringify(old), changed)).toBe(false);
    expect(gradingSignature(items)).not.toEqual(gradingSignature([...items, items[0]]));
  });
  it('preserves earned, missed and revealed outcomes across explanation-only edits without mount writes', () => {
    const save = vi.fn();
    render(<CourseProgressProvider store={{ steps: saved({ version: 1, signature: JSON.stringify(old), index: 0, started: true, answers }), save }}><FullCourseDrill drill={drill} embedded embeddedSuccessExplanation="full"/></CourseProgressProvider>);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(items[0].explanation)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
    const next = save.mock.calls.at(-1)![1];
    expect(next.state.answers).toEqual(answers);
    expect(next.state).toMatchObject({ version: 2, gradingRevision: DRILL_GRADING_REVISION, requiredItemIds: items.map(i => i.id) });
    expect(next).not.toHaveProperty('reopen');
    expect(screen.getByText('You reviewed the answer to this question.')).toBeVisible();
  });
  it('retains the default short embedded feedback and full nonembedded feedback', () => {
    const state = { version: 1, signature: JSON.stringify(drill.items), index: 0, started: true, answers };
    const view = render(<CourseProgressProvider store={{ steps: saved(state), save: vi.fn() }}><FullCourseDrill drill={drill} embedded/></CourseProgressProvider>);
    expect(screen.getByText('The complete reasoning starts here.')).toBeVisible();
    expect(screen.queryByText(items[0].explanation)).toBeNull();
    view.unmount();
    render(<CourseProgressProvider store={{ steps: saved(state), save: vi.fn() }}><FullCourseDrill drill={drill}/></CourseProgressProvider>);
    expect(screen.getByText(items[0].explanation)).toBeVisible();
  });
  it('retains partial responses on a known copy-only generation', () => {
    const partial = { [items[0].id]: { ...answers[items[0].id], resolved: false, correct: false, revealed: false } };
    const save = vi.fn();
    render(<CourseProgressProvider store={{ steps: saved({ version: 1, signature: JSON.stringify(old), index: 0, started: true, answers: partial }, 'started'), save }}><FullCourseDrill drill={drill}/></CourseProgressProvider>);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Show answer' })).toBeVisible();
  });
  it.each(['unknown', 'membership'])('preserves the prior attempt until explicit restart for %s changes', kind => {
    const save = vi.fn();
    const state = { version: 1, signature: kind === 'unknown' ? 'unrecognized' : JSON.stringify(old.slice(0, -1)), index: 0, started: true, answers };
    render(<CourseProgressProvider store={{ steps: saved(state), save }}><FullCourseDrill drill={drill}/></CourseProgressProvider>);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Download the saved attempt' }).getAttribute('href')).toContain(encodeURIComponent('2026-10-20T12:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Start revised practice' }));
    const patch = save.mock.calls.at(-1)![1];
    expect(patch).toMatchObject({ reopen: true, status: 'started' });
    expect(patch.state.history[0]).toEqual({ state, completedAt: '2026-10-20T12:00:00Z', status: 'done' });
    expect(patch.state.answers).toEqual({});
  });
});
