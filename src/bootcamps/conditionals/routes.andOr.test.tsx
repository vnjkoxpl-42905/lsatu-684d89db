import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalUnits, findConditionalUnit } from './content';
import { emptyProgress, type ConditionalProgress } from './progress';
import { needsExpandedConditionalLessonReview, CONDITIONAL_OPENING_UNIT_IDS } from './openingRevision';
import { OPENING_COURSE_PATH } from './openingCoursePath';
import type { ResolvedConditionalAssignment } from './assignments';

const state = vi.hoisted(() => ({ progress: null as ConditionalProgress | null, updateCalls: 0 }));
vi.mock('./useConditionalProgress', async () => {
  const { useCallback, useReducer } = await import('react');
  return { useConditionalProgress: () => {
    const [, refresh] = useReducer((count: number) => count + 1, 0);
    const update = useCallback((transform: (previous: ConditionalProgress) => ConditionalProgress) => { state.updateCalls++; state.progress = transform(state.progress!); refresh(); }, []);
    return { progress: state.progress, savedProgress: state.progress, status: 'saved', error: '', retry: vi.fn(), update };
  } };
});
import { ConditionalBootcampRoutes } from './routes';

const base = '/bootcamp/conditionals';
function assignment(id: string, unitIds: string[], mode: 'learn' | 'practice' = 'learn', difficulty?: 'beginner' | 'medium' | 'advanced'): ResolvedConditionalAssignment {
  return { id, title: id, route: base, target: { scope: 'skill', mode, unitId: unitIds[0], difficulty: difficulty ?? 'medium' }, unitIds, mode, ...(difficulty ? { difficulty } : {}) };
}
const course: ResolvedConditionalAssignment = { id: 'course', title: 'Conditional Logic', route: base, target: { scope: 'course', mode: 'learn', difficulty: 'beginner' }, unitIds: conditionalUnits.map(unit => unit.id), mode: 'learn' };
function mount(path: string, assignments: ResolvedConditionalAssignment[], isAdmin = false) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={`${base}/*`} element={<ConditionalBootcampRoutes userId="student" assignments={assignments} isAdmin={isAdmin}/>}/></Routes></MemoryRouter>);
}
const chapterTwo = () => screen.queryByRole('region', { name: 'Chapter 2' });
const cardTitles = (region: HTMLElement) => within(region).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
beforeEach(() => { state.progress = emptyProgress(); state.updateCalls = 0; });
afterEach(cleanup);

const LESSONS = ['Both, or at least one', 'Where the group sits', 'Deny the whole group'];
const DRILLS = ['Check the whole group', 'Read the rule with a group in it', 'Say the opposite of the group', 'Diagram it and flip it'];

it('shows the whole Chapter 2 to a teacher preview and to a full course assignment, after all of Chapter 1', () => {
  for (const [assignments, isAdmin] of [[[course], false], [[], true]] as const) {
    mount(`${base}/lessons`, [...assignments], isAdmin);
    const region = chapterTwo()!;
    expect(region).toBeVisible();
    expect(cardTitles(region)).toEqual([...LESSONS, ...DRILLS]);
    expect(within(region).getAllByText(/^2\.[123]$/)).toHaveLength(3);
    expect(within(screen.getByRole('region', { name: 'Chapter 1' })).getAllByRole('link', { name: /Read lesson/ })).toHaveLength(5);
    cleanup();
  }
});

it('keeps Chapter 2 out of a Group 2 selection', () => {
  mount(`${base}/lessons`, [assignment('g2', ['group-2'], 'learn', 'advanced')]);
  expect(chapterTwo()).toBeNull();
  expect(screen.queryByText(LESSONS[0])).toBeNull();
});

it('scopes And/Or and De Morgan selections to their own steps and refuses the other topic’s steps by URL', () => {
  const andOr = assignment('andor', ['and-or']);
  mount(`${base}/lessons?assignment=andor`, [andOr]);
  expect(cardTitles(chapterTwo()!)).toEqual([LESSONS[0], LESSONS[1], DRILLS[0], DRILLS[1]]);
  cleanup();
  mount(`${base}/opening/and-or-negate-group?assignment=andor`, [andOr]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  cleanup();

  const deMorgan = assignment('demorgan', ['de-morgan']);
  mount(`${base}/lessons?assignment=demorgan`, [deMorgan]);
  expect(cardTitles(chapterTwo()!)).toEqual([LESSONS[2], DRILLS[2], DRILLS[3]]);
  cleanup();
  mount(`${base}/opening/and-or-both-or-either?assignment=demorgan`, [deMorgan]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
});

it('does not reveal learn-mode Chapter 2 surfaces to practice-only work, and keeps legacy practice at its curriculum level', () => {
  const practiceOnly = assignment('practice', ['and-or'], 'practice');
  mount(`${base}/opening/and-or-meaning-practice?assignment=practice&run=1`, [practiceOnly]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  cleanup();
  mount(`${base}/practice?assignment=practice&unit=and-or`, [practiceOnly]);
  expect(screen.queryByRole('heading', { name: 'This activity is not available here.' })).toBeNull();
  cleanup();
  // An explicit assigned level governs; a forged level does not.
  const advanced = assignment('advanced', ['and-or'], 'learn', 'advanced');
  mount(`${base}/practice?assignment=advanced&unit=and-or&level=medium`, [advanced]);
  expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeVisible();
});

it('keeps the legacy And/Or lesson and guided routes reachable beside the new chapter', () => {
  mount(`${base}/lessons/and-or?assignment=course`, [course]);
  expect(screen.getByRole('heading', { name: findConditionalUnit('and-or')!.title })).toBeVisible();
  cleanup();
  mount(`${base}/activities/de-morgan?assignment=course`, [course]);
  expect(screen.queryByRole('heading', { name: 'This activity is not available here.' })).toBeNull();
});

it('keeps legacy read marks and the opening-edition membership separate from the new step IDs', () => {
  expect([...CONDITIONAL_OPENING_UNIT_IDS]).toEqual(['orientation', 'sufficient-necessary', 'group-1', 'group-2']);
  state.progress!.lessons['and-or'] = '2026-09-01T12:00:00.000Z';
  state.progress!.lessons['de-morgan'] = '2026-09-01T12:00:00.000Z';
  expect(needsExpandedConditionalLessonReview(state.progress!.lessons, 'and-or')).toBe(false);
  mount(`${base}/lessons`, [course]);
  const card = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!;
  for (const title of LESSONS) expect(within(card(title)).getByText('Not started')).toBeVisible();
  expect(state.updateCalls).toBe(0);
});

it('records a fresh new lesson under its own step ID and leaves the legacy record alone', () => {
  state.progress!.lessons['and-or'] = '2026-09-01T12:00:00.000Z';
  mount(`${base}/opening/and-or-both-or-either?assignment=course`, [course]);
  expect(screen.getByRole('heading', { level: 1, name: 'Both, or at least one' })).toBeVisible();
  expect(state.progress!.course?.['and-or-both-or-either']?.status).toBe('started');
  expect(state.progress!.lessons).toEqual({ 'and-or': '2026-09-01T12:00:00.000Z' });
  expect(Object.keys(state.progress!.course ?? {})).toEqual(['and-or-both-or-either']);
});

it('moves across the chapter boundary in both directions', () => {
  mount(`${base}/opening/and-or-both-or-either?assignment=course`, [course]);
  const nav = screen.getByRole('navigation', { name: 'Course navigation' });
  expect(within(nav).getByRole('link', { name: /Previous drill.*Put it into practice/ })).toBeVisible();
  expect(within(nav).getByRole('link', { name: /Next lesson.*Where the group sits/ })).toBeVisible();
  cleanup();
  mount(`${base}/opening/source-independent?assignment=course&run=1`, [course]);
  expect(within(screen.getByRole('navigation', { name: 'Course navigation' })).getByRole('link', { name: /Next lesson.*Both, or at least one/ })).toBeVisible();
});

it('counts every Chapter 2 step in the course completion denominator', () => {
  mount(`${base}/lessons`, [course]);
  expect(screen.getByRole('progressbar', { name: 'Course completion' }).getAttribute('aria-valuetext')).toContain(`of ${OPENING_COURSE_PATH.length} steps done`);
  cleanup();
  mount(`${base}/lessons?assignment=andor`, [assignment('andor', ['and-or'])]);
  expect(screen.getByRole('progressbar', { name: 'Course completion' }).getAttribute('aria-valuetext')).toContain('of 4 steps done');
});

it('lists the recorded legacy practice for And/Or alongside the numbered chapter without joining the opening edition', () => {
  mount(`${base}/opening-practice`, [course]);
  expect(screen.getByRole('link', { name: new RegExp(findConditionalUnit('and-or')!.title) })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: new RegExp(findConditionalUnit('and-or')!.title) }));
});
