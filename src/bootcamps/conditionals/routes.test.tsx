import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from './content';
import { emptyProgress, newRun, type ConditionalAttempt, type ConditionalProgress } from './progress';
import type { ResolvedConditionalAssignment } from './assignments';

const state = vi.hoisted(() => ({ progress: null as ConditionalProgress | null, saved: null as ConditionalProgress | null, status: 'saved' }));
vi.mock('./useConditionalProgress', () => ({ useConditionalProgress: () => ({ progress: state.progress, savedProgress: state.saved, status: state.status, error: '', retry: vi.fn(), update: vi.fn() }) }));
import { ConditionalBootcampRoutes } from './routes';
const base = '/bootcamp/conditionals';
const course: ResolvedConditionalAssignment = { id: 'course', title: 'Conditional Logic', route: base, target: { scope: 'course', mode: 'learn', difficulty: 'beginner' }, unitIds: conditionalUnits.map(unit => unit.id), mode: 'learn' };
function skill(mode: 'learn' | 'practice' = 'learn'): ResolvedConditionalAssignment {
  return { id: 'skill', title: 'Group 2', route: base, target: { scope: 'skill', mode, unitId: 'group-2', difficulty: 'advanced' }, unitIds: ['group-2'], mode, difficulty: 'advanced' };
}
function mount(path: string, assignments: ResolvedConditionalAssignment[] = [course], isAdmin = false) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={`${base}/*`} element={<ConditionalBootcampRoutes userId="student" assignments={assignments} isAdmin={isAdmin} />} /></Routes></MemoryRouter>);
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
beforeEach(() => { state.progress = emptyProgress(); state.saved = state.progress; state.status = 'saved'; });
afterEach(cleanup);

it('lands on one current lesson without a curriculum map or teaching rail', () => {
  mount(base);
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('/lessons/orientation');
  expect(screen.queryByText('Teaching sequence')).toBeNull();
  expect(document.querySelector('.cb-curriculum-rail')).toBeNull();
  expect(document.querySelector('.cb-sequence')).toBeNull();
  expect(screen.queryAllByRole('combobox')).toHaveLength(0);
});
it('shows only actual assignments and ignores forged broader query targets', () => {
  mount(`${base}?start=orientation&path=course&level=beginner`, [skill()]);
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('/lessons/group-2');
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('assignment=skill');
});
it('rejects a directly requested unassigned lesson', () => {
  mount(`${base}/lessons/group-1?path=course`, [skill()]);
  expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeTruthy();
});
it('does not grant lessons to practice-only work', () => {
  mount(`${base}/lessons/group-2`, [skill('practice')]);
  expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeTruthy();
});
it('rejects a forged practice level', () => {
  mount(`${base}/practice?unit=group-2&level=beginner`, [skill()]);
  expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeTruthy();
});
it('ends targeted work after its own drill instead of offering an unassigned lesson', () => {
  reviewed('group-2'); finishPractice('group-2', 'advanced');
  mount(`${base}/practice?unit=group-2&level=advanced`, [skill()]);
  expect(screen.getByRole('heading', { name: 'You finished this set.' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /^Continue:/ })).toBeNull();
});
it('continues a full-course assignment after the saved skill drill', () => {
  reviewed('orientation'); finishPractice('orientation', 'beginner');
  mount(`${base}/practice?unit=orientation`);
  expect(screen.getByRole('link', { name: /^Continue:/ }).getAttribute('href')).toContain('/lessons/rules-facts');
});
it('uses acknowledged progress for next actions', () => {
  reviewed('orientation'); state.saved = structuredClone(state.progress); finishPractice('orientation', 'beginner'); state.status = 'unsaved';
  mount(`${base}/practice?unit=orientation`);
  expect(screen.getByRole('link', { name: /^Continue:/ }).getAttribute('href')).toContain('unit=orientation');
  expect(screen.getByText('Your next step updates after your latest work is saved.')).toBeTruthy();
});
it('keeps the skill and teacher activity level through guided work', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-2')!;
  state.progress!.runs['guided:group-2'] = newRun([unit.guidedExample.id]);
  mount(`${base}/activities/group-2`, [skill()]);
  const href = screen.getByRole('link', { name: /Next action: Level 3 skill drill/ }).getAttribute('href')!;
  expect(href).toContain('unit=group-2'); expect(href).toContain('level=advanced'); expect(href).toContain('assignment=skill');
});
it('scopes reference material to the current work', () => {
  mount(`${base}/reference`, [skill()]);
  expect(screen.queryByRole('heading', { name: conditionalUnits.find(unit => unit.id === 'group-1')!.title })).toBeNull();
  expect(screen.getByRole('heading', { name: conditionalUnits.find(unit => unit.id === 'group-2')!.title })).toBeTruthy();
});
it('offers only the other real assignment entries', () => {
  mount(base, [skill(), { ...skill('practice'), id: 'other', title: 'More Group 2 practice' }]);
  expect(screen.getByRole('link', { name: 'More Group 2 practice' }).getAttribute('href')).toBe(`${base}?assignment=other`);
});
it('fails closed when no assignments are available', () => {
  mount(base, []);
  expect(screen.getByRole('heading', { name: 'No conditional work is available yet.' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Begin lesson' })).toBeNull();
});
it('allows teacher preview but uses the same single-work entry', () => {
  mount(`${base}?unit=group-3&level=advanced`, [], true);
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('/lessons/group-3');
  expect(document.querySelector('.cb-sequence')).toBeNull();
});
it('opens an accessible reference drawer for the current skill', () => {
  mount(`${base}/activities/group-2`, [skill()]); fireEvent.click(screen.getByRole('button', { name: 'Open reference' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('resolves a legacy direct link to its matching real assignment', () => {
  const first = { ...skill(), id: 'first', unitIds: ['group-1'], target: { ...skill().target, unitId: 'group-1' } };
  mount(`${base}/practice?unit=group-2&level=advanced`, [first, skill()]);
  expect(screen.queryByRole('heading', { name: 'This activity is not available here.' })).toBeNull();
  expect(screen.getByRole('heading', { name: conditionalUnits.find(unit => unit.id === 'group-2')!.title })).toBeTruthy();
});
it('does not fall back to a different grant for an unknown assignment id', () => {
  mount(`${base}/lessons/group-2?assignment=unknown`, [skill()]);
  expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeTruthy();
});
