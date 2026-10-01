import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from './content';
import { emptyProgress, newRun, type ConditionalAttempt, type ConditionalProgress } from './progress';

const state = vi.hoisted(() => ({ progress: null as ConditionalProgress | null, saved: null as ConditionalProgress | null, status: 'saved' }));
vi.mock('./useConditionalProgress', () => ({ useConditionalProgress: () => ({
  progress: state.progress, savedProgress: state.saved, status: state.status, error: '', retry: vi.fn(), update: vi.fn(),
}) }));
import { ConditionalBootcampRoutes } from './routes';

const base = '/bootcamp/conditionals';
function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={`${base}/*`} element={<ConditionalBootcampRoutes userId="student" />} /></Routes></MemoryRouter>);
}
function check(questionId: string, unitId: string, difficulty: ConditionalAttempt['difficulty'] = 'beginner'): ConditionalAttempt {
  return { id: `run:${questionId}`, questionId, unitId, difficulty, choice: 0, correct: false, hint: true, explanationBeforeCheck: false, working: 'My reasoning', checkedAt: '2026-10-01T12:00:00.000Z' };
}
function reviewed(unitId: string) {
  const unit = conditionalUnits.find(item => item.id === unitId)!;
  state.progress!.lessons[unit.id] = '2026-10-01T12:00:00.000Z';
  state.progress!.attempts.push(check(unit.guidedExample.id, unit.id));
  return unit;
}
function finishPractice(unitId: string, difficulty: ConditionalAttempt['difficulty']) {
  const unit = conditionalUnits.find(item => item.id === unitId)!;
  state.progress!.attempts.push(...unit.drills[difficulty].map(question => check(question.id, unit.id, difficulty)));
  const run = newRun(unit.drills[difficulty].map(question => question.id));
  state.progress!.runs[`practice:${difficulty}:${unit.id}`] = { ...run, index: run.questionIds.length, finished: true };
}
function forwardUrl() {
  const link = screen.getAllByRole('link', { name: /^Continue:/ })[0];
  return new URL(link.getAttribute('href')!, 'https://example.test');
}
beforeEach(() => { state.progress = emptyProgress(); state.saved = state.progress; state.status = 'saved'; });
afterEach(cleanup);

it('keeps the first recommendation inside an Advanced quantifier area assignment', () => {
  mount(`${base}?area=quantifiers&level=advanced`);
  const url = forwardUrl();
  expect(url.pathname).toBe(`${base}/lessons/quantifier-meaning`);
  expect(url.searchParams.get('level')).toBe('advanced');
  expect(url.searchParams.get('area')).toBe('quantifiers');
  expect(url.searchParams.get('path')).toBe('area');
});

it('recommends selected Advanced practice without requiring Beginner practice in a targeted area', () => {
  reviewed('quantifier-meaning');
  mount(`${base}?area=quantifiers&level=advanced`);
  const url = forwardUrl();
  expect(url.pathname).toBe(`${base}/practice`);
  expect(url.searchParams.get('unit')).toBe('quantifier-meaning');
  expect(url.searchParams.get('level')).toBe('advanced');
});

it('recommends the current lesson\'s Beginner practice before the next course lesson', () => {
  reviewed('orientation');
  mount(`${base}/lessons/orientation?path=course&level=beginner`);
  const url = forwardUrl();
  expect(url.pathname).toBe(`${base}/practice`);
  expect(url.searchParams.get('unit')).toBe('orientation');
  expect(url.searchParams.get('path')).toBe('course');
  expect(screen.queryByRole('link', { name: /^Next lesson:/ })).toBeNull();
});

it('offers the next authored lesson after saved Beginner practice finishes', () => {
  reviewed('orientation');
  finishPractice('orientation', 'beginner');
  mount(`${base}/practice?unit=orientation&level=beginner&path=course`);
  expect(screen.getByRole('heading', { name: 'You finished this set.' })).toBeTruthy();
  expect(forwardUrl().pathname).toBe(`${base}/lessons/rules-facts`);
});

it('continues to the next unit in the assigned area after a targeted Advanced set', () => {
  reviewed('quantifier-meaning');
  finishPractice('quantifier-meaning', 'advanced');
  mount(`${base}/practice?unit=quantifier-meaning&area=quantifiers&level=advanced&path=area&pathLevel=advanced`);
  const url = forwardUrl();
  expect(url.pathname).toBe(`${base}/lessons/quantifier-negation`);
  expect(url.searchParams.get('area')).toBe('quantifiers');
  expect(url.searchParams.get('level')).toBe('advanced');
});

it('does not advance recommendations using completion that is still waiting to save', () => {
  reviewed('orientation');
  state.saved = structuredClone(state.progress);
  finishPractice('orientation', 'beginner');
  state.status = 'unsaved';
  mount(`${base}/practice?unit=orientation&level=beginner&path=course`);
  const url = forwardUrl();
  expect(url.pathname).toBe(`${base}/practice`);
  expect(url.searchParams.get('unit')).toBe('orientation');
  expect(screen.getByText('Your recommendation updates after your latest work is saved.')).toBeTruthy();
});
