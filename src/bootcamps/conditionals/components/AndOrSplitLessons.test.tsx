import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AndOrLesson } from './AndOrLessons';
import { OpeningCourseContent } from './OpeningCourseContent';
import { andOrQuizzes, andOrDrills } from '../content/andOrItems';
import { COURSE_STEP_REGISTRY, AND_OR_NEGATION_REVISION, AND_OR_CONTRAPOSITIVE_REVISION } from '../openingCoursePath';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const show = (id: string) => render(<MemoryRouter><AndOrLesson id={id}/></MemoryRouter>);

it('orders each drill after the operation it practices and retains the existing destination identity', () => {
  expect(COURSE_STEP_REGISTRY.filter(step => step.part === 2).map(step => step.id)).toEqual([
    'and-or-both-or-either', 'and-or-either-condition', 'and-or-meaning-practice',
    'and-or-either-side', 'and-or-placement-practice', 'and-or-negate-conditions',
    'and-or-whole-group-practice', 'and-or-negate-group', 'and-or-transfer-practice',
  ]);
  expect(COURSE_STEP_REGISTRY.find(step => step.id === 'and-or-negate-conditions')).toMatchObject({ lessonNumber: '2.4', contentRevision: AND_OR_NEGATION_REVISION, unitId: 'de-morgan' });
  expect(COURSE_STEP_REGISTRY.find(step => step.id === 'and-or-negate-group')).toMatchObject({ lessonNumber: '2.5', contentRevision: AND_OR_CONTRAPOSITIVE_REVISION, unitId: 'de-morgan' });
});

it('dispatches new 2.4 and keeps negation and contrapositive quiz identities distinct', () => {
  render(<MemoryRouter><OpeningCourseContent id="and-or-negate-conditions"/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Start with when the statement fails' })).toBeVisible();
  expect(andOrQuizzes['and-or-negate-conditions'].map(item => item.id)).toEqual(['ao-quiz-3-1', 'ao-quiz-3-2']);
  expect(andOrQuizzes['and-or-negate-conditions'].every(item => item.task.kind === 'negate')).toBe(true);
  expect(andOrQuizzes['and-or-negate-group'].map(item => item.id)).toEqual(['ao-quiz-3-3', 'ao-quiz-3-4']);
  expect(andOrQuizzes['and-or-negate-group'].every(item => item.task.kind === 'contrapositive')).toBe(true);
});

it.each(['and-or-negate-conditions', 'and-or-negate-group'])('defers the mixed-scope film in %s without a fake media control', id => {
  const { container } = show(id);
  expect(container.querySelector('video')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Watch the lesson' })).toBeNull();
});

it.each(['and-or-both-or-either', 'and-or-either-condition', 'and-or-either-side', 'and-or-negate-conditions', 'and-or-negate-group'])('bounds core checks and avoids rejected language in %s', id => {
  const { container } = show(id);
  expect(container.querySelectorAll('.co-check').length).toBeLessThanOrEqual(3);
  expect(container.textContent).not.toMatch(/(?:whole|full|complete) group|\bconnector\b/i);
});

it('offers a targeted hint and explicit reveal while preserving a fresh negation attempt', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem');
  show('and-or-negate-conditions');
  const check = screen.getByRole('heading', { name: 'The screen works AND the speaker works. Which statement is its negation?' }).closest('.ao-lesson-check') as HTMLElement;
  const buttons = within(check).getAllByRole('button');
  expect(check.querySelector('.cr-feedback')).toBeNull();
  fireEvent.click(buttons[0]);
  expect(within(check).getByRole('status')).toHaveTextContent('Would the original statement already fail if just the screen stopped working?');
  expect(within(check).queryByText(/At least one failure makes the original AND statement false/)).toBeNull();
  expect(within(check).queryByRole('button', { name: 'Show me the answer' })).toBeNull();
  fireEvent.click(buttons[2]);
  fireEvent.click(within(check).getByRole('button', { name: 'Show me the answer' }));
  expect(within(check).getByRole('status')).toHaveTextContent('does not count as an independent success');
  fireEvent.click(within(check).getByRole('button', { name: 'Try again' }));
  expect(check.querySelector('.cr-feedback')).toBeNull();
  expect(buttons[0]).toHaveFocus();
  fireEvent.click(buttons[1]);
  expect(within(check).getByRole('status')).toHaveTextContent('That works.');
  expect(within(check).getByRole('status')).toHaveTextContent('Both failures are allowed too.');
  expect(write).not.toHaveBeenCalled();
});

it('explains why an unactivated OR does not establish its other condition', () => {
  show('and-or-either-condition');
  const check = screen.getByRole('heading', { name: /A parcel gets a red label/ }).closest('.ao-lesson-check') as HTMLElement;
  fireEvent.click(within(check).getByRole('button', { name: 'Yes, one OR condition must always hold' }));
  expect(within(check).getByRole('status')).toHaveTextContent('asserted as a fact');
  fireEvent.click(within(check).getByRole('button', { name: 'No; whether it is heavy is still open' }));
  expect(within(check).getByRole('status')).toHaveTextContent('It never says that every parcel meets one of them.');
  expect(screen.getByText(/Neither document may have been shown/)).toBeVisible();
});

it('completes the existing permission feedback without changing its grading structure', () => {
  const item = andOrDrills.find(set => set.id === 'and-or-transfer-practice')!.items.find(item => item.id === 'ao-transfer-2')!;
  expect(item.why).toContain('If the visitor has no late pass and is a minor, then the visitor is not allowed to stay late.');
  expect(item.task).toEqual({ kind: 'contrapositive' });
  expect(item.answerAt).toBe(0);
});
