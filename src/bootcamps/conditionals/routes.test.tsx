import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

it('starts at the teacher assigned stage and preserves that stage through actions', () => {
  mount(`${base}?start=group-3`);
  expect(forwardUrl().pathname).toBe(`${base}/lessons/group-3`);
  expect(forwardUrl().searchParams.get('start')).toBe('group-3');
  expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  const guided = screen.getAllByRole('link', { name: '2. Guided activity' })[0];
  expect(guided.getAttribute('href')).toContain('start=group-3');
});

it('keeps an assigned Level 3 skill scoped through the guided activity', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-3')!;
  state.progress!.runs['guided:group-3'] = newRun([unit.guidedExample.id]);
  mount(`${base}/activities/group-3?unit=group-3&level=advanced&path=skill`);
  const drill = screen.getByRole('link', { name: /Next action: Level 3 skill drill/ });
  const url = new URL(drill.getAttribute('href')!, 'https://example.test');
  expect(url.searchParams.get('unit')).toBe('group-3');
  expect(url.searchParams.get('level')).toBe('advanced');
  expect(url.searchParams.get('path')).toBe('skill');
  expect(screen.getByRole('heading', { name: 'Build your response in these steps' })).toBeTruthy();
  expect(screen.queryAllByRole('combobox')).toHaveLength(0);
});

it('uses the curriculum activity demand despite a legacy global Beginner course link', () => {
  reviewed('sufficient-assumption');
  mount(`${base}/lessons/sufficient-assumption?path=course&start=sufficient-assumption&level=beginner`);
  expect(forwardUrl().pathname).toBe(`${base}/practice`);
  expect(forwardUrl().searchParams.get('level')).toBeNull();
  expect(screen.getAllByRole('link', { name: /3. Skill drill · Level 3/ }).length).toBeGreaterThan(0);
});

it('keeps the stage when opening review from the persistent navigation', () => {
  mount(`${base}/lessons/group-3?start=group-3&path=course`);
  expect(screen.getByRole('link', { name: 'Review attempts' }).getAttribute('href')).toContain('start=group-3');
});

it('opens the current skill reference with an accessible dialog', () => {
  mount(`${base}/lessons/group-3?start=group-3&path=course`);
  fireEvent.click(screen.getByRole('button', { name: 'Open reference' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Complete reference' }).getAttribute('href')).toContain('start=group-3');
});


it('presents all four indicator stages with their own lesson, guided activity, and drill', () => {
  mount(base);
  const titles = [
    'Group 1: Sufficient-condition indicators',
    'Group 2: Necessary-condition indicators',
    'Group 3: Negate the sufficient condition',
    'Group 4: Negate the necessary condition',
  ];
  titles.forEach((title, index) => {
    const stage = screen.getByRole('region', { name: title });
    const links = within(stage).getAllByRole('link');
    expect(links.find(link => link.textContent === '1. Learn')?.getAttribute('href')).toContain(`/lessons/group-${index + 1}`);
    expect(links.find(link => link.textContent === '2. Guided activity')?.getAttribute('href')).toContain(`/activities/group-${index + 1}`);
    expect(links.find(link => link.textContent?.startsWith('3. Skill drill'))?.getAttribute('href')).toContain(`unit=group-${index + 1}`);
    expect(screen.getAllByRole('heading', { name: title })).toHaveLength(2);
  });
});

it('keeps the authored unit order in both curriculum cards and the teaching rail', () => {
  mount(base);
  const main = document.getElementById('conditional-main')!;
  const lessonLinks = within(main).getAllByRole('link', { name: '1. Learn' });
  expect(lessonLinks.map(link => new URL(link.getAttribute('href')!, 'https://example.test').pathname.split('/').pop())).toEqual(conditionalUnits.map(unit => unit.id));
  const rail = document.querySelector('.cb-curriculum-rail')!;
  const railLessons = within(rail as HTMLElement).getAllByRole('link').filter(link => link.getAttribute('href')?.includes('/lessons/'));
  expect(railLessons.map(link => new URL(link.getAttribute('href')!, 'https://example.test').pathname.split('/').pop())).toEqual(conditionalUnits.map(unit => unit.id));
});


it('names the exact indicator stage when its lesson is assigned directly', () => {
  mount(`${base}/lessons/group-2?unit=group-2&path=skill`);
  expect(screen.getByText(/Group 2: Necessary-condition indicators.*Lesson 8/)).toBeTruthy();
});
