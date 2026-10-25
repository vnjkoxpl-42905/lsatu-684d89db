import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalUnits, findConditionalUnit } from './content';
import { attemptSummary, emptyDraft, emptyProgress, newRun, type ConditionalAttempt, type ConditionalProgress } from './progress';
import { conditionalAssignmentAllowsAction, conditionalAssignmentUnitIds, protectedConditionalTarget } from './assignments';
import { getCurriculumDifficulty } from './curriculumPath';
import { conditionalProtectedGrantRoute, conditionalTargetKey, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { FULL_CONDITIONAL_EDITION as edition } from '@/lib/conditionalCourseEdition';
import { needsExpandedConditionalLessonReview, CONDITIONAL_OPENING_UNIT_IDS } from './openingRevision';
import { COURSE_STEP_REGISTRY } from './openingCoursePath';
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
const fullTarget = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: edition } as const;
function trustedTarget(id: string, target: ConditionalAssignmentTarget) {
  if (!target.courseEdition) return target;
  const parsed = protectedConditionalTarget({ id, source_table: 'bootcamps', source_id: conditionalProtectedGrantRoute(target, id), metadata_json: { bootcamp_id: 'conditionals', conditional_target: target, conditional_target_key: conditionalTargetKey(target) } });
  if (!parsed) throw new Error('Invalid protected assignment fixture');
  return parsed;
}
function assignment(id: string, unitIds: string[], mode: 'learn' | 'practice' = 'learn', difficulty?: 'beginner' | 'medium' | 'advanced'): ResolvedConditionalAssignment {
  const target = trustedTarget(id, { scope: 'skill', mode, unitId: unitIds[0], difficulty: difficulty ?? 'medium', ...(mode === 'learn' ? { curriculumVersion: 3, courseEdition: edition } : {}) });
  return { id, title: id, route: base, target, unitIds, mode, ...(difficulty ? { difficulty } : {}) };
}
const course: ResolvedConditionalAssignment = { id: 'course', title: 'Conditional Logic', route: base, target: trustedTarget('course', fullTarget), unitIds: conditionalUnits.map(unit => unit.id), mode: 'learn' };
const legacyCourse = { ...course, target: { scope: 'course', mode: 'learn', difficulty: 'beginner' } as const };
function mount(path: string, assignments: ResolvedConditionalAssignment[], isAdmin = false) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={`${base}/*`} element={<ConditionalBootcampRoutes userId="student" assignments={assignments} isAdmin={isAdmin}/>}/></Routes></MemoryRouter>);
}
const chapterTwo = () => screen.queryByRole('region', { name: 'Chapter 2' });
const cardTitles = (region: HTMLElement) => within(region).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent);
beforeEach(() => { state.progress = emptyProgress(); state.updateCalls = 0; });
afterEach(cleanup);

const LESSONS = ['AND vs OR', 'Where the group sits', 'Deny the whole group'];
const DRILLS = ['Check the whole group', 'Read the rule with a group in it', 'Say the opposite of the group', 'Diagram it and flip it'];

it('shows the whole Chapter 2 to a teacher preview and to a full course assignment, after all of Chapter 1', () => {
  for (const [assignments, isAdmin] of [[[course], false], [[], true]] as const) {
    mount(`${base}/lessons${isAdmin ? `?edition=${edition}` : ''}`, [...assignments], isAdmin);
    const region = chapterTwo()!;
    expect(region).toBeVisible();
    expect(cardTitles(region)).toEqual([LESSONS[0], DRILLS[0], LESSONS[1], DRILLS[1], LESSONS[2], DRILLS[2], DRILLS[3]]);
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

it('retains the frozen old course and refuses a new chapter even when an old row grants all topics', () => {
  mount(`${base}/lessons?assignment=course`, [legacyCourse]);
  expect(chapterTwo()).toBeNull();
  expect(screen.getByRole('progressbar', { name: 'Course completion' })).toHaveAttribute('aria-valuetext', '0% complete, 0 of 16 steps done');
  cleanup();
  mount(`${base}/opening/and-or-both-or-either?assignment=course`, [legacyCourse]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
});

it('scopes And/Or and De Morgan selections to their own steps and refuses the other topic’s steps by URL', () => {
  const andOr = assignment('andor', ['and-or']);
  mount(`${base}/lessons?assignment=andor`, [andOr]);
  expect(cardTitles(chapterTwo()!)).toEqual([LESSONS[0], DRILLS[0], LESSONS[1], DRILLS[1]]);
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
  expect(screen.getByRole('heading', { level: 1, name: 'AND vs OR' })).toBeVisible();
  expect(state.progress!.course?.[`${edition}:and-or-both-or-either`]?.status).toBe('started');
  expect(state.progress!.lessons).toEqual({ 'and-or': '2026-09-01T12:00:00.000Z' });
  expect(Object.keys(state.progress!.course ?? {})).toEqual([`${edition}:and-or-both-or-either`]);
});

it('moves across the chapter boundary in both directions', () => {
  mount(`${base}/opening/and-or-both-or-either?assignment=course`, [course]);
  const nav = screen.getByRole('navigation', { name: 'Course navigation' });
  expect(within(nav).getByRole('link', { name: /Previous drill.*Put it into practice/ })).toBeVisible();
  expect(within(nav).getByRole('link', { name: /Next drill.*Check the whole group/ })).toBeVisible();
  cleanup();
  mount(`${base}/opening/source-independent?assignment=course&run=1`, [course]);
  expect(within(screen.getByRole('navigation', { name: 'Course navigation' })).getByRole('link', { name: /Next lesson.*AND vs OR/ })).toBeVisible();
});

it('counts every Chapter 2 step in the course completion denominator', () => {
  mount(`${base}/lessons`, [course]);
  expect(screen.getByRole('progressbar', { name: 'Course completion' }).getAttribute('aria-valuetext')).toContain(`of ${COURSE_STEP_REGISTRY.filter(step => step.requiredForEditionCompletion !== false).length} steps done`);
  cleanup();
  mount(`${base}/lessons?assignment=andor`, [assignment('andor', ['and-or'])]);
  expect(screen.getByRole('progressbar', { name: 'Course completion' }).getAttribute('aria-valuetext')).toContain('of 4 steps done');
});

// ---- Access matrix, built from the real assignment contract ---------------------------------------

const andOrArea = findConditionalUnit('and-or')!.area;
const targets: { name: string; target: ConditionalAssignmentTarget }[] = [
  { name: 'v2-stage from the first unit', target: { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: conditionalUnits[0].id, curriculumVersion: 2 } },
  { name: 'v2-stage starting at And/Or', target: { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'and-or', curriculumVersion: 2 } },
  { name: 'legacy-stage starting at And/Or', target: { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'and-or' } },
  { name: 'legacy-stage starting at group-2', target: { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'group-2' } },
  { name: 'area', target: { scope: 'area', mode: 'learn', difficulty: 'medium', area: andOrArea } },
  { name: 'general practice', target: { scope: 'general', mode: 'practice', difficulty: 'medium' } },
  { name: 'skill And/Or', target: { scope: 'skill', mode: 'learn', difficulty: 'beginner', unitId: 'and-or' } },
  { name: 'skill De Morgan', target: { scope: 'skill', mode: 'learn', difficulty: 'advanced', unitId: 'de-morgan' } },
  { name: 'expanded course', target: fullTarget },
  { name: 'expanded area', target: { scope: 'area', mode: 'learn', difficulty: 'medium', area: andOrArea, curriculumVersion: 3, courseEdition: edition } },
  { name: 'expanded And/Or', target: { scope: 'skill', mode: 'learn', difficulty: 'beginner', unitId: 'and-or', curriculumVersion: 3, courseEdition: edition } },
  { name: 'expanded De Morgan', target: { scope: 'skill', mode: 'learn', difficulty: 'advanced', unitId: 'de-morgan', curriculumVersion: 3, courseEdition: edition } },
];
const fromTarget = (target: ConditionalAssignmentTarget, id = 'matrix'): ResolvedConditionalAssignment => ({
  id, title: id, route: base, target: trustedTarget(id, target), unitIds: conditionalAssignmentUnitIds(target), mode: target.mode,
  ...(target.scope !== 'course' && target.scope !== 'stage' ? { difficulty: target.difficulty } : {}),
});
const expectedTitles = (unitIds: string[]) => [
  ...(unitIds.includes('and-or') ? [LESSONS[0], DRILLS[0], LESSONS[1], DRILLS[1]] : []),
  ...(unitIds.includes('de-morgan') ? [LESSONS[2], DRILLS[2], DRILLS[3]] : []),
];

it('shows each Chapter 2 step to exactly the assignment targets whose real unit membership reaches its topic', () => {
  for (const { name, target } of targets) {
    const assignment = fromTarget(target);
    mount(`${base}/lessons?assignment=matrix`, [assignment]);
    const expected = target.courseEdition ? expectedTitles(assignment.unitIds) : [];
    if (!expected.length) expect(chapterTwo(), name).toBeNull();
    else expect(cardTitles(chapterTwo()!), name).toEqual(expected);
    cleanup();
  }
  // Sanity on the contract itself: a legacy stage keeps its original membership, a skill grant is one unit.
  expect(conditionalAssignmentUnitIds(targets[2].target)).toContain('de-morgan');
  expect(conditionalAssignmentUnitIds(targets[6].target)).toEqual(['and-or']);
  expect(conditionalAssignmentUnitIds(targets[3].target)).not.toContain('orientation');
});

it('lets only learn-mode assignments reach a new lesson, and refuses a unit outside the grant', () => {
  for (const { name, target } of targets) {
    const learn = fromTarget(target);
    // v3 practice targets are unsupported; legacy practice remains separately assignable.
    const practice = fromTarget({ ...target, courseEdition: undefined, curriculumVersion: undefined, mode: 'practice' } as ConditionalAssignmentTarget);
    for (const unitId of ['and-or', 'de-morgan']) {
      expect(conditionalAssignmentAllowsAction(learn, { unitId, action: 'lesson' }), `${name} ${unitId} lesson`).toBe(learn.mode === 'learn' && learn.unitIds.includes(unitId));
      expect(conditionalAssignmentAllowsAction(practice, { unitId, action: 'lesson' }), `${name} ${unitId} practice-only lesson`).toBe(false);
    }
  }
  mount(`${base}/opening/and-or-both-or-either?assignment=matrix`, [fromTarget(targets[7].target)]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
});

it('applies an explicit beginner, medium or advanced level to And/Or practice and ignores the level in the URL', () => {
  for (const level of ['beginner', 'medium', 'advanced'] as const) {
    const assignment = fromTarget({ scope: 'skill', mode: 'practice', difficulty: level, unitId: 'and-or' });
    for (const asked of ['beginner', 'medium', 'advanced'] as const) {
      expect(conditionalAssignmentAllowsAction(assignment, { unitId: 'and-or', action: 'practice', difficulty: asked }), `${level} grant, ${asked} request`).toBe(asked === level);
    }
    expect(conditionalAssignmentAllowsAction(assignment, { unitId: 'de-morgan', action: 'practice', difficulty: level })).toBe(false);
    expect(conditionalAssignmentAllowsAction(assignment, { unitId: 'and-or', action: 'guided' })).toBe(false);
  }
  // Stage and course grants carry no level; the curriculum level for the unit governs.
  const stage = fromTarget(targets[1].target);
  expect(stage.difficulty).toBeUndefined();
  expect(conditionalAssignmentAllowsAction(stage, { unitId: 'and-or', action: 'practice', difficulty: getCurriculumDifficulty('and-or') })).toBe(true);
});

it('leaves legacy runs, earned attempts and their grade untouched while the new chapter is opened', () => {
  const question = findConditionalUnit('and-or')!.drills.beginner[0];
  const run = { ...newRun([question.id]), id: 'legacy-run', index: 1, finished: true, drafts: { [question.id]: { ...emptyDraft(), checked: true, choice: 0, working: 'my work' } } };
  const attempt: ConditionalAttempt = { id: 'legacy-run:1', questionId: question.id, unitId: 'and-or', difficulty: 'beginner', choice: 0, correct: true, hint: false, explanationBeforeCheck: false, working: 'my work', checkedAt: '2026-09-02T12:00:00.000Z' };
  state.progress!.runs = { 'legacy-run': run };
  state.progress!.attempts = [attempt];
  const before = structuredClone({ runs: state.progress!.runs, attempts: state.progress!.attempts, summary: attemptSummary(state.progress!.attempts) });
  mount(`${base}/opening/and-or-both-or-either?assignment=course`, [course]);
  cleanup();
  mount(`${base}/lessons?assignment=course`, [course]);
  cleanup();
  mount(`${base}/lessons/and-or?assignment=course`, [course]);
  expect({ runs: state.progress!.runs, attempts: state.progress!.attempts, summary: attemptSummary(state.progress!.attempts) }).toEqual(before);
  expect(before.summary).toEqual({ total: 1, correct: 1, assisted: 0 });
  expect(Object.keys(state.progress!.course ?? {})).not.toContain(question.id);
});

it('lists the recorded legacy practice for And/Or alongside the numbered chapter without joining the opening edition', () => {
  mount(`${base}/opening-practice`, [course]);
  expect(screen.getByRole('link', { name: new RegExp(findConditionalUnit('and-or')!.title) })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: new RegExp(findConditionalUnit('and-or')!.title) }));
});
