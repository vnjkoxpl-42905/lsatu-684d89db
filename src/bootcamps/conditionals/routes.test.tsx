import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from './content';
import { emptyDraft, emptyProgress, newRun, parseConditionalProgress, type ConditionalAttempt, type ConditionalProgress } from './progress';
import { conditionalOpeningEditionKey } from './openingRevision';
import type { ResolvedConditionalAssignment } from './assignments';

const state = vi.hoisted(() => ({ progress: null as ConditionalProgress | null, saved: null as ConditionalProgress | null, status: 'saved', updateCalls: 0 }));
vi.mock('./useConditionalProgress', async () => {
  const { useCallback, useReducer } = await import('react');
  return { useConditionalProgress: () => {
    const [, refresh] = useReducer((count: number) => count + 1, 0);
    const update = useCallback((transform: (previous: ConditionalProgress) => ConditionalProgress) => {
      state.updateCalls++;
      state.progress = transform(state.progress!);
      if (state.status === 'saved') state.saved = state.progress;
      refresh();
    }, []);
    return { progress: state.progress, savedProgress: state.saved, status: state.status, error: '', retry: vi.fn(), update };
  } };
});
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
beforeEach(() => { state.progress = emptyProgress(); state.saved = state.progress; state.status = 'saved'; state.updateCalls = 0; });
afterEach(cleanup);

it('lands on one current lesson without a curriculum map or teaching rail', () => {
  mount(base);
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('/lessons?');
  expect(screen.queryByText('Teaching sequence')).toBeNull();
  expect(document.querySelector('.cb-curriculum-rail')).toBeNull();
  expect(document.querySelector('.cb-sequence')).toBeNull();
  expect(screen.queryAllByRole('combobox')).toHaveLength(0);
});
it('shows only actual assignments and ignores forged broader query targets', () => {
  mount(`${base}?start=orientation&path=course&level=beginner`, [skill()]);
  expect(screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')).toContain('/lessons?');
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
  expect(screen.getByRole('link', { name: /^Continue:/ }).getAttribute('href')).toContain('/lessons/sufficient-necessary');
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
  const href = screen.getByRole('link', { name: /Next action: skill drill/ }).getAttribute('href')!;
  expect(href).toContain('unit=group-2'); expect(href).toContain('level=advanced'); expect(href).toContain('assignment=skill');
  expect(screen.getByRole('link', { name: '3. Skill drill' }).getAttribute('href')).toContain('level=advanced');
  expect(screen.queryByText(/Level [123]/)).toBeNull();
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

function observeRepairScrolling(run: (scrolled: HTMLElement[]) => void) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  const scrolled: HTMLElement[] = [];
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn(function (this: HTMLElement) { scrolled.push(this); }) });
  try { run(scrolled); }
  finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', original);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
}

it.each(['orientation', 'sufficient-necessary', 'group-1', 'group-2', 'rules-facts'])('scrolls to the mounted %s repair section through the actual Review the move link', unitId => {
  observeRepairScrolling(scrolled => {
    mount(`${base}/activities/${unitId}`, [assignedSkill(unitId, 'beginner')]);
    expect(scrolled).toHaveLength(0);
    const updatesBeforeNavigation = state.updateCalls;
    fireEvent.click(screen.getByRole('link', { name: '4. Review the move' }));
    const repair = document.getElementById('repair');
    expect(repair?.tagName).toBe('SECTION');
    expect(scrolled).toEqual([repair]);
    expect(state.updateCalls).toBe(updatesBeforeNavigation);
    expect(state.progress!.lessons).toEqual({});
  });
});

it('waits for loaded progress before scrolling a repair deep link', () => {
  observeRepairScrolling(scrolled => {
    state.progress = null;
    state.saved = null;
    state.status = 'loading';
    const path = `${base}/lessons/group-1?assignment=selected-skill#repair`;
    const assignment = assignedSkill('group-1', 'beginner');
    const view = mount(path, [assignment]);
    expect(screen.getByText('Loading your work...')).toBeTruthy();
    expect(document.getElementById('repair')).toBeNull();
    expect(scrolled).toHaveLength(0);
    state.progress = emptyProgress();
    state.saved = state.progress;
    state.status = 'saved';
    view.rerender(<MemoryRouter initialEntries={[path]}><Routes><Route path={`${base}/*`} element={<ConditionalBootcampRoutes userId="student" assignments={[assignment]} />} /></Routes></MemoryRouter>);
    expect(scrolled).toEqual([document.getElementById('repair')]);
    expect(state.updateCalls).toBe(0);
  });
});

it('does not mount or scroll an unassigned lesson repair deep link', () => {
  observeRepairScrolling(scrolled => {
    mount(`${base}/lessons/group-1#repair`, [skill()]);
    expect(screen.getByRole('heading', { name: 'This activity is not available here.' })).toBeTruthy();
    expect(document.getElementById('repair')).toBeNull();
    expect(scrolled).toHaveLength(0);
    expect(state.updateCalls).toBe(0);
  });
});

function assignedSkill(unitId: string, difficulty: ConditionalAttempt['difficulty'], mode: 'learn' | 'practice' = 'learn'): ResolvedConditionalAssignment {
  return { id: 'selected-skill', title: unitId, route: base, target: { scope: 'skill', mode, unitId, difficulty }, unitIds: [unitId], mode, difficulty };
}
function savedOpeningRun(unitId: string, difficulty: ConditionalAttempt['difficulty'], ids: string[], index: number, finished = false) {
  const run = { ...newRun(ids), index, finished, elapsed: 41, timerEnabled: difficulty !== 'beginner' };
  for (const id of ids) {
    run.drafts[id] = { ...emptyDraft(), working: `Saved working for ${id}`, choice: 0, checked: true, revealed: true };
    state.progress!.attempts.push({ ...check(id, unitId, difficulty), id: `${run.id}:${id}` });
  }
  state.progress!.runs[`practice:${difficulty}:${unitId}`] = run;
  return run;
}

it('resumes a finished old run at the new work without losing its drafts, attempts, or timing', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  state.progress!.lessons[unit.id] = '2026-10-01T12:00:00.000Z';
  state.progress!.attempts.push(check(unit.guidedExample.id, unit.id));
  const old = savedOpeningRun(unit.id, 'beginner', ['group-1-b1', 'group-1-b2', 'group-1-b3'], 3, true);
  const attempts = state.progress!.attempts;
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner')]);
  expect(screen.getByRole('heading', { name: unit.drills.beginner[3].prompt })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'You finished this set.' })).toBeNull();
  const resumed = state.progress!.runs['practice:beginner:group-1'];
  expect(resumed).toMatchObject({ id: old.id, index: 3, finished: false, elapsed: 41 });
  expect(resumed.drafts).toBe(old.drafts);
  expect(state.progress!.attempts).toBe(attempts);
  expect(state.updateCalls).toBe(1);
  for (const question of unit.drills.beginner.slice(3)) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: `New working for ${question.id}` } });
    fireEvent.click(screen.getByRole('button', { name: `${String.fromCharCode(65 + question.answerIndex)}. ${question.options[question.answerIndex]}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: question.id === unit.drills.beginner[unit.drills.beginner.length - 1].id ? 'Finish set' : 'Next question' }));
  }
  expect(screen.getByRole('heading', { name: 'You finished this set.' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: /^Continue:/ })).toBeNull();
  expect(state.progress!.attempts.slice(0, attempts.length)).toEqual(attempts);
  expect(state.progress!.runs['practice:beginner:group-1'].id).toBe(old.id);
});

it('keeps an unfinished current draft in place when the opening set expands', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  const old = savedOpeningRun(unit.id, 'beginner', ['group-1-b1', 'group-1-b2', 'group-1-b3'], 1);
  old.drafts['group-1-b2'] = { ...emptyDraft(), working: 'My unfinished diagram', hint: true, choice: 2 };
  state.progress!.attempts = state.progress!.attempts.filter(attempt => attempt.questionId !== 'group-1-b2');
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner')]);
  expect(screen.getByRole('heading', { name: unit.drills.beginner[1].prompt })).toBeTruthy();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('My unfinished diagram');
  expect(state.progress!.runs['practice:beginner:group-1'].drafts['group-1-b2']).toBe(old.drafts['group-1-b2']);
  expect(state.progress!.runs['practice:beginner:group-1'].index).toBe(1);
});

it('retains saved checked feedback until Next, then goes to unanswered additions', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  const old = savedOpeningRun(unit.id, 'beginner', ['group-1-b1', 'group-1-b2', 'group-1-b3'], 1);
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner')]);
  expect(screen.getByRole('heading', { name: unit.drills.beginner[1].prompt })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Answer checked' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Your choice is correct.' })).toBeTruthy();
  expect(screen.queryByText(unit.drills.beginner[1].explanation)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: unit.drills.beginner[3].prompt })).toBeTruthy();
  expect(state.progress!.runs['practice:beginner:group-1'].id).toBe(old.id);
  expect(state.progress!.attempts).toHaveLength(3);
});

it('retires a changed current question without dropping its historical draft or attempt', () => {
  const old = savedOpeningRun('group-1', 'advanced', ['group-1-a1', 'group-1-a2', 'group-1-a3'], 2);
  const oldDraft = old.drafts['group-1-a3'];
  const attempts = state.progress!.attempts;
  const replacement = conditionalUnits.find(item => item.id === 'group-1')!.drills.advanced.find(question => question.id === 'group-1-a3-v2')!;
  mount(`${base}/practice?unit=group-1&level=advanced`, [assignedSkill('group-1', 'advanced')]);
  expect(screen.getByRole('heading', { name: replacement.prompt })).toBeTruthy();
  const current = state.progress!.runs['practice:advanced:group-1'];
  expect(current.questionIds).not.toContain('group-1-a3');
  expect(current.drafts['group-1-a3']).toBe(oldDraft);
  expect(state.progress!.attempts).toBe(attempts);
  expect(parseConditionalProgress(state.progress)).toBe(state.progress);
});

it.each([
  ['area practice', '/practice?area=translation', 'practice:beginner:translation', 'area'],
  ['phase practice', '/practice?phase=conditional', 'practice:beginner:conditional', 'general'],
  ['area flashcards', '/flashcards?area=translation', 'flashcards:translation:beginner', 'area'],
] as const)('does not reshape an unchanged shared run when %s assignments switch', (_name, route, runKey, scope) => {
  const units = conditionalUnits.filter(unit => ['group-1', 'group-2'].includes(unit.id));
  const run = { ...newRun(units.flatMap(unit => unit.drills.beginner.map(question => question.id))), index: 1 };
  run.drafts[run.questionIds[1]] = { ...emptyDraft(), working: 'Keep this current question', choice: 1 };
  state.progress!.runs[runKey] = run;
  const target = { scope, mode: 'practice' as const, difficulty: 'beginner' as const, ...(scope === 'area' ? { area: 'translation' as const } : {}) };
  const a: ResolvedConditionalAssignment = { id: 'A', title: 'First work', route: base, target, unitIds: ['group-1'], mode: 'practice', difficulty: 'beginner' };
  const b = { ...a, id: 'B', title: 'Other work', unitIds: ['group-1', 'group-2', 'group-3'] };
  const first = mount(`${base}${route}&assignment=A`, [a, b]);
  expect(state.progress!.runs[runKey]).toBe(run);
  first.unmount();
  const second = mount(`${base}${route}&assignment=B`, [a, b]);
  expect(state.progress!.runs[runKey]).toBe(run);
  second.unmount();
  mount(`${base}${route}&assignment=A`, [a, b]);
  expect(state.progress!.runs[runKey]).toBe(run);
  expect(state.updateCalls).toBe(0);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Keep this current question');
});

it.each([
  ['area practice', '/practice?area=translation', 'practice:beginner:translation', 'area'],
  ['phase practice', '/practice?phase=conditional', 'practice:beginner:conditional', 'general'],
  ['area flashcards', '/flashcards?area=translation', 'flashcards:translation:beginner', 'area'],
] as const)('completes the available subset of a shared %s run and preserves its other work', (_name, route, runKey, scope) => {
  const group1 = conditionalUnits.find(unit => unit.id === 'group-1')!;
  const group2 = conditionalUnits.find(unit => unit.id === 'group-2')!;
  const run = { ...newRun([group1.drills.beginner[0], group2.drills.beginner[0], group1.drills.beginner[1], ...group2.drills.beginner.slice(1), ...group1.drills.beginner.slice(2)].map(question => question.id)), elapsed: 41 };
  const untouchedDraft = { ...emptyDraft(), working: 'Keep this Group 1 diagram', choice: 1 };
  run.drafts[group1.drills.beginner[0].id] = untouchedDraft;
  const historicalAttempt = { ...check('group-1-a3', 'group-1', 'advanced'), id: `${run.id}:group-1-a3` };
  state.progress!.attempts.push(historicalAttempt);
  state.progress!.runs[runKey] = run;
  const target = { scope, mode: 'practice' as const, difficulty: 'beginner' as const, ...(scope === 'area' ? { area: 'translation' as const } : {}) };
  const assignment: ResolvedConditionalAssignment = { id: 'B', title: 'Group 2 work', route: base, target, unitIds: ['group-2'], mode: 'practice', difficulty: 'beginner' };
  const first = mount(`${base}${route}&assignment=B`, [assignment]);
  expect(screen.getByRole('heading', { name: group2.drills.beginner[0].prompt })).toBeTruthy();
  expect(screen.getByText(`1 / ${group2.drills.beginner.length} · Skill drill`)).toBeTruthy();
  expect(state.progress!.runs[runKey]).toBe(run);
  expect(state.updateCalls).toBe(0);
  for (const [index, question] of group2.drills.beginner.entries()) {
    expect(screen.getByText(`${index + 1} / ${group2.drills.beginner.length} · Skill drill`)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: `My work for ${question.id}` } });
    fireEvent.click(screen.getByRole('button', { name: `${String.fromCharCode(65 + question.answerIndex)}. ${question.options[question.answerIndex]}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: index === group2.drills.beginner.length - 1 ? 'Finish set' : 'Next question' }));
  }
  expect(screen.getByRole('heading', { name: 'You finished this set.' })).toBeTruthy();
  expect(screen.getByText(`${group2.drills.beginner.length} correct out of ${group2.drills.beginner.length} checked answers. 0 used a hint or explanation before checking.`)).toBeTruthy();
  const sharedAfter = state.progress!.runs[runKey];
  const attemptsAfter = state.progress!.attempts;
  expect(sharedAfter).toMatchObject({ id: run.id, questionIds: run.questionIds, elapsed: 41, finished: false });
  expect(sharedAfter.drafts[group1.drills.beginner[0].id]).toBe(untouchedDraft);
  expect(state.progress!.attempts[0]).toBe(historicalAttempt);

  fireEvent.click(screen.getByRole('button', { name: "Start this assignment's set" }));
  const scopedKey = `${runKey}:assignment:B`;
  const scopedRun = state.progress!.runs[scopedKey];
  expect(scopedRun.id).not.toBe(run.id);
  expect(scopedRun.questionIds).toEqual(group2.drills.beginner.map(question => question.id));
  expect(state.progress!.runs[runKey]).toBe(sharedAfter);
  expect(state.progress!.attempts).toBe(attemptsAfter);
  expect(screen.getByRole('heading', { name: group2.drills.beginner[0].prompt })).toBeTruthy();
  first.unmount();
  state.progress = parseConditionalProgress(JSON.parse(JSON.stringify(state.saved)));
  const restored = mount(`${base}${route}&assignment=B`, [assignment]);
  expect(state.progress!.runs[scopedKey].id).toBe(scopedRun.id);
  expect(screen.getByRole('heading', { name: group2.drills.beginner[0].prompt })).toBeTruthy();
  restored.unmount();
  mount(`${base}${route}&assignment=A`, [{ ...assignment, id: 'A', unitIds: ['group-1', 'group-2'] }, assignment]);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(untouchedDraft.working);
  expect(state.progress!.runs[scopedKey].id).toBe(scopedRun.id);
});

it('starts a disjoint assignment set without replacing a saved run or its attempts', () => {
  const group1 = conditionalUnits.find(unit => unit.id === 'group-1')!;
  const group2 = conditionalUnits.find(unit => unit.id === 'group-2')!;
  const run = newRun(group1.drills.beginner.map(question => question.id));
  run.drafts[group1.drills.beginner[0].id] = { ...emptyDraft(), working: 'My saved work' };
  state.progress!.runs['practice:beginner:translation'] = run;
  const attempts = state.progress!.attempts;
  const assignment: ResolvedConditionalAssignment = { id: 'B', title: 'Group 2 work', route: base, target: { scope: 'area', area: 'translation', mode: 'practice', difficulty: 'beginner' }, unitIds: ['group-2'], mode: 'practice', difficulty: 'beginner' };
  mount(`${base}/practice?area=translation&assignment=B`, [assignment]);
  expect(screen.getByRole('heading', { name: 'This assignment has a different practice set.' })).toBeTruthy();
  expect(state.progress!.runs['practice:beginner:translation']).toBe(run);
  expect(state.updateCalls).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: "Start this assignment's set" }));
  expect(screen.getByRole('heading', { name: group2.drills.beginner[0].prompt })).toBeTruthy();
  expect(state.progress!.runs['practice:beginner:translation']).toBe(run);
  expect(state.progress!.attempts).toBe(attempts);
});

it('archives an earlier assignment set when repeating so its drafts and attempts survive reload', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  const shared = savedOpeningRun(unit.id, 'beginner', unit.drills.beginner.map(question => question.id), unit.drills.beginner.length, true);
  const scopedKey = 'practice:beginner:group-1:assignment:selected-skill';
  const scoped = { ...newRun(shared.questionIds), index: shared.questionIds.length, finished: true, drafts: { [shared.questionIds[0]]: { ...emptyDraft(), checked: true, working: 'First repeat reasoning', choice: 1 } } };
  state.progress!.runs[scopedKey] = scoped;
  state.progress!.attempts.push({ ...check(shared.questionIds[0], unit.id), id: `${scoped.id}:${shared.questionIds[0]}` });
  const attempts = state.progress!.attempts;
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner')]);
  fireEvent.click(screen.getByRole('button', { name: "Start this assignment's set" }));
  expect(state.progress!.runs['practice:beginner:group-1']).toBe(shared);
  expect(state.progress!.runs[`${scopedKey}:history:${scoped.id}`]).toBe(scoped);
  expect(state.progress!.attempts).toBe(attempts);
  const restored = parseConditionalProgress(JSON.parse(JSON.stringify(state.saved)));
  expect(restored.runs[`${scopedKey}:history:${scoped.id}`]).toEqual(scoped);
  expect(restored.attempts).toEqual(attempts);
  expect(restored.runs[scopedKey].id).not.toBe(scoped.id);
});

it('counts finished-set answers only for active IDs while retaining retired attempts', () => {
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  const ids = unit.drills.advanced.map(question => question.id);
  const run = savedOpeningRun(unit.id, 'advanced', ids, ids.length, true);
  state.progress!.attempts = state.progress!.attempts.map(attempt => ({ ...attempt, correct: true, hint: false }));
  state.progress!.attempts.push({ ...check('group-1-a3', unit.id, 'advanced'), id: `${run.id}:group-1-a3` });
  mount(`${base}/practice?unit=group-1&level=advanced`, [assignedSkill('group-1', 'advanced')]);
  expect(screen.getByText(`${ids.length} correct out of ${ids.length} checked answers. 0 used a hint or explanation before checking.`)).toBeTruthy();
  expect(state.progress!.attempts).toHaveLength(ids.length + 1);
  expect(state.updateCalls).toBe(0);
});

it.each([
  ['group-2-a1', 'group-2', 'advanced', 0, 'Only reviewers appointed for the emergency panel may inspect these records. Nia is a reviewer appointed to another panel. Which follows?', 'Nia may inspect these records.', "This rule excludes Nia's permission unless she also has the emergency appointment."],
  ['group-1-a3', 'group-1', 'advanced', 1, 'If a component is not certified for heat exposure, it is stored indoors. Component E is not stored indoors. What follows?', 'E is certified for every use.', 'E is certified for heat exposure.'],
  ['group-2-m2', 'group-2', 'medium', 2, 'The camera records only when motion is detected. No motion is detected. What follows?', 'The camera is broken.', 'The camera does not record.'],
  ['group-2-a3', 'group-2', 'advanced', 0, 'A claim is eligible only if it was not filed after the deadline. Claim Q was filed after the deadline. What follows?', 'Q is eligible.', 'Q is not eligible.'],
] as const)('reviews the exact historical prompt and saved choice for %s', (id, unitId, difficulty, choice, prompt, selected, answer) => {
  state.progress!.attempts.push({ ...check(id, unitId, difficulty), choice });
  mount(`${base}/review`, [course]);
  const article = screen.getByText(prompt).closest('article')!;
  expect(within(article).getByText((_text, node) => node?.tagName === 'P' && node.textContent === `Your answer: ${selected}`)).toBeTruthy();
  expect(within(article).getByText((_text, node) => node?.tagName === 'DIV' && node.className === 'cb-result' && node.textContent?.startsWith(`Answer: ${answer}`))).toBeTruthy();
  expect(screen.queryByText('The authored question is unavailable. Your attempt remains recorded.')).toBeNull();
});

it('keeps retired IDs out of new practice runs', () => {
  mount(`${base}/practice?unit=group-1&level=advanced`, [assignedSkill('group-1', 'advanced')]);
  expect(state.progress!.runs['practice:advanced:group-1'].questionIds).toContain('group-1-a3-v2');
  expect(state.progress!.runs['practice:advanced:group-1'].questionIds).not.toContain('group-1-a3');
});

it('resumes advanced Group 2 at its direct replacement and preserves both original attempts', () => {
  const run = savedOpeningRun('group-2', 'advanced', ['group-2-a1', 'group-2-a2', 'group-2-a3'], 3, true);
  const historicalAttempts = state.progress!.attempts;
  const unit = conditionalUnits.find(item => item.id === 'group-2')!;
  const replacement = unit.drills.advanced.find(question => question.id === 'group-2-a1-v2')!;
  mount(`${base}/practice?unit=group-2&level=advanced`, [assignedSkill('group-2', 'advanced')]);
  expect(screen.getByRole('heading', { name: replacement.prompt })).toBeTruthy();
  const resumed = state.progress!.runs['practice:advanced:group-2'];
  expect(resumed.questionIds).not.toContain('group-2-a1');
  expect(resumed.questionIds).not.toContain('group-2-a3');
  expect(resumed.drafts).toBe(run.drafts);
  expect(state.progress!.attempts).toBe(historicalAttempts);
  expect(resumed.id).toBe(run.id);
  expect(resumed.index).toBe(1);
  expect(state.updateCalls).toBe(1);
});

it.each([
  ['old read date', '2026-10-01T12:00:00.000Z', false, 'learn', true],
  ['old read after local authoring', '2026-12-01T12:00:00.000Z', false, 'learn', true],
  ['marked revised edition', '2026-12-02T12:00:00.000Z', true, 'learn', false],
  ['practice-only grant', '2026-12-01T12:00:00.000Z', false, 'practice', false],
] as const)('gates the expanded-lesson link for an %s', (_name, date, editionRead, mode, expected) => {
  state.progress!.lessons['group-1'] = date;
  if (editionRead) state.progress!.lessons[conditionalOpeningEditionKey('group-1')!] = date;
  const before = structuredClone(state.progress!.lessons);
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  state.progress!.runs['practice:beginner:group-1'] = newRun(unit.drills.beginner.map(question => question.id));
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner', mode)]);
  expect(!!screen.queryByRole('link', { name: /^Review expanded lesson:/ })).toBe(expected);
  expect(state.progress!.lessons).toEqual(before);
  expect(state.updateCalls).toBe(0);
});

it('stamps the opening edition only when Mark lesson as read is clicked and keeps it after reloading practice', () => {
  const oldReadAt = '2026-12-01T12:00:00.000Z';
  state.progress!.lessons['group-1'] = oldReadAt;
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  const run = newRun(unit.drills.beginner.map(question => question.id));
  state.progress!.runs['practice:beginner:group-1'] = run;
  state.progress!.attempts.push(check('group-1-b1', 'group-1'));
  const attempts = state.progress!.attempts;
  const lesson = mount(`${base}/lessons/group-1`, [assignedSkill('group-1', 'beginner')]);
  expect(screen.queryByRole('button', { name: 'Mark lesson as read' })).toBeNull();
  if (screen.queryByRole('button', { name: /Lesson pages/ })) fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  const readingPages = within(screen.getByRole('navigation', { name: 'Lesson pages' })).getAllByRole('button');
  fireEvent.click(readingPages[readingPages.length - 1]);

  expect(state.progress!.lessons).toEqual({ 'group-1': oldReadAt });
  expect(state.updateCalls).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  const editionKey = conditionalOpeningEditionKey('group-1')!;
  expect(state.progress!.lessons[editionKey]).toBe(state.progress!.lessons['group-1']);
  expect(Number.isFinite(Date.parse(state.progress!.lessons[editionKey]))).toBe(true);
  expect(state.progress!.lessons['group-1']).not.toBe(oldReadAt);
  expect(state.progress!.attempts).toBe(attempts);
  expect(state.progress!.runs['practice:beginner:group-1']).toBe(run);
  expect(state.saved!.lessons[editionKey]).toBe(state.progress!.lessons[editionKey]);
  expect(state.updateCalls).toBe(1);
  expect(screen.getByRole('button', { name: 'Lesson read' })).toBeTruthy();
  lesson.unmount();
  state.progress = parseConditionalProgress(JSON.parse(JSON.stringify(state.saved)));
  state.saved = state.progress;
  const beforeReload = structuredClone(state.progress);
  mount(`${base}/practice?unit=group-1`, [assignedSkill('group-1', 'beginner')]);
  expect(screen.queryByRole('link', { name: /^Review expanded lesson:/ })).toBeNull();
  expect(state.progress).toEqual(beforeReload);
  expect(state.updateCalls).toBe(1);
});

it('marks a non-opening lesson through its original date without adding an edition key', () => {
  const lesson = mount(`${base}/lessons/rules-facts`, [assignedSkill('rules-facts', 'beginner')]);
  expect(state.progress!.lessons).toEqual({});
  expect(state.updateCalls).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  expect(Object.keys(state.saved!.lessons)).toEqual(['rules-facts']);
  expect(state.updateCalls).toBe(1);
  lesson.unmount();
  mount(`${base}/lessons/rules-facts`, [assignedSkill('rules-facts', 'beginner')]);
  expect(screen.getByRole('button', { name: 'Lesson read' })).toBeTruthy();
  expect(state.updateCalls).toBe(1);
});

it.each([false, true])('excludes edition metadata from acknowledged lesson totals with admin=%s', isAdmin => {
  state.progress!.lessons = { 'group-1': '2026-12-02T12:00:00.000Z', [conditionalOpeningEditionKey('group-1')!]: '2026-12-02T12:00:00.000Z' };
  state.saved = structuredClone(state.progress);
  state.status = 'unsaved';
  state.progress!.lessons['group-2'] = '2026-12-03T12:00:00.000Z';
  mount(`${base}/diagnostics`, [course], isAdmin);
  const total = screen.getByText('Lessons reviewed').querySelector('strong');
  expect(total?.textContent).toBe('1');
  expect(state.updateCalls).toBe(0);
});


it('filters the new course index by existing teacher authorization', () => {
  mount(`${base}/lessons?assignment=skill&level=advanced`, [skill()]);
  expect(screen.getAllByRole('link', { name: /Read lesson/ })).toHaveLength(2);
  expect(screen.getByRole('heading', { name: 'Necessary-condition words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'The sufficient condition' })).toBeNull();
  expect(state.updateCalls).toBe(0);
});

it('rejects an unassigned new note and does not widen practice-only assignments', () => {
  const first = mount(`${base}/opening/sufficient?assignment=skill`, [skill()]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  first.unmount();
  mount(`${base}/opening/necessary-words?assignment=skill`, [skill('practice')]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  expect(state.updateCalls).toBe(0);
});

it('preserves assignment context without recording legacy completion on new course navigation', () => {
  mount(`${base}/opening/necessary-words?assignment=skill&level=advanced&path=skill&start=group-2`, [skill()]);
  fireEvent.click(screen.getByRole('link', { name: /Next lesson Keep the whole meaning/ }));
  expect(screen.getByRole('heading', { level: 1, name: 'Keep the whole meaning' })).toBeVisible();
  const next = screen.getByRole('link', { name: /Next drill/ }).getAttribute('href')!;
  expect(next).toContain('assignment=skill');
  expect(next).toContain('level=advanced');
  expect(next).toContain('start=group-2');
  expect(state.updateCalls).toBe(0);
  expect(state.progress!.lessons).toEqual({});
});


it('keeps orientation-only contraposition material out of a sufficient-necessary skill assignment', () => {
  const assigned: ResolvedConditionalAssignment = { ...skill(), id: 'roles', title: 'Enough and required', target: { scope: 'skill', mode: 'learn', unitId: 'sufficient-necessary', difficulty: 'beginner' }, unitIds: ['sufficient-necessary'], difficulty: 'beginner' };
  mount(`${base}/opening/contrapositive?assignment=roles`, [assigned]);
  expect(screen.getByRole('heading', { name: 'This lesson is not available here.' })).toBeVisible();
  expect(state.updateCalls).toBe(0);
});


it('keeps root-entry query context when opening the revised Lessons index', () => {
  mount(`${base}?assignment=skill&level=advanced&path=skill&start=group-2&unit=group-2`, [skill()]);
  const entry = screen.getByRole('link', { name: 'Begin lesson' }).getAttribute('href')!;
  for (const field of ['assignment=skill', 'level=advanced', 'path=skill', 'start=group-2', 'unit=group-2']) expect(entry).toContain(field);
});

it.each(['/lessons', '/opening/mixed-practice?run=1', '/opening-practice', '/opening-labs', '/opening-tools'])('scopes account saving to assigned work on the local opening surface %s', path => {
  mount(`${base}${path}`);
  expect(screen.getByText('Assigned work saved to your account')).toBeVisible();
  expect(screen.queryByText('Saved to your account')).toBeNull();
  expect(state.updateCalls).toBe(0);
});

it('explains local mixed practice without recording it as assigned work', () => {
  mount(`${base}/opening/mixed-practice?run=1`);
  expect(screen.getByText("Practice answers aren't saved to your account. Reloading or leaving the course clears them.")).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Begin practice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Every swimmer training before dawn' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(state.updateCalls).toBe(0);
  expect(state.progress!.attempts).toEqual([]);
});

it.each(['/lessons/rules-facts', '/practice?unit=group-2'])('preserves account saving for recorded work on %s', path => {
  mount(`${base}${path}`);
  expect(screen.getByText('Saved to your account')).toBeVisible();
  expect(screen.queryByText('Assigned work saved to your account')).toBeNull();
});

it('keeps pending account changes visible on an opening surface', () => {
  state.status = 'unsaved';
  mount(`${base}/opening/mixed-practice`);
  expect(screen.getByText('Assigned work waiting to save')).toBeVisible();
  expect(screen.queryByText('Assigned work saved to your account')).toBeNull();
});
