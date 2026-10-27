import { fireEvent, render, screen, cleanup, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CourseProgressProvider } from '../courseProgress';
import { atom, implies } from '../content/fullCourseLogic';
import type { FullCourseDrillSet } from '../content/fullCourseTypes';
import { FullCourseDrill, formulaText, quantityText } from './FullCourseDrill';
afterEach(cleanup);
const drill: FullCourseDrillSet = { id: 'fresh-rule', title: 'Build this rule', unitId: 'group-3', part: 3, afterLessonId: 'unless', instructions: ['Build the rule before seeing an answer.'], items: [{ kind: 'build-rule', id: 'one', prompt: 'If a parcel is express, it is tracked.', hint: 'Which fact is enough to establish tracking?', explanation: 'An express parcel has to be tracked. A tracked parcel may use another service.', atoms: [{ id: 'express', label: 'Parcel is express', subject: 'parcel', domain: 'parcels' }, { id: 'tracked', label: 'Parcel is tracked', subject: 'parcel', domain: 'parcels' }], target: { if: atom('express'), then: atom('tracked') } }] };
function choose(side: string, text: string) {
  fireEvent.click(screen.getByRole('button', { name: side }));
  fireEvent.click(within(screen.getByRole('group', { name: `${side} choices` })).getByRole('button', { name: text }));
}
describe('expanded drill learner workflow', () => {
  it('states quantity premises plainly without losing the reference group or negation', () => {
    const predicates = [{ id: 'people', label: 'person' }, { id: 'club', label: 'club member' }, { id: 'trained', label: 'trained' }];
    expect(quantityText({ quantifier: 'exactly', count: 4, subject: 'people', predicate: 'people' }, predicates)).toBe('Exactly 4 people exist.');
    expect(quantityText({ quantifier: 'some', subject: 'people', predicate: 'club' }, predicates)).toBe('Some people are club members.');
    expect(quantityText({ quantifier: 'most', subject: 'trained', predicate: 'club', predicateNegated: true }, predicates)).toBe('Most trained people are not club members.');
    expect(quantityText({ quantifier: 'not-all', subject: 'club', predicate: 'trained' }, predicates)).toBe('Not all club members are trained.');
  });
  it('distinguishes an inner conditional from a chain in the displayed formula', () => {
    expect(formulaText(implies(atom('a'), implies(atom('b'), atom('c'))))).toBe('a → (b → c)');
    expect(formulaText(implies(implies(atom('a'), atom('b')), atom('c')))).toBe('(a → b) → c');
  });
  it('starts productive sides blank, gives a hint before a model, and records the actual answer', () => {
    const save = vi.fn();
    render(<CourseProgressProvider store={{ steps: {}, save }}><FullCourseDrill drill={drill} autoStart/></CourseProgressProvider>);
    const left = screen.getByLabelText('Sufficient condition');
    const right = screen.getByLabelText('Necessary condition');
    expect(left.getAttribute('data-empty')).toBe('true');
    expect(right.getAttribute('data-empty')).toBe('true');
    choose('Sufficient condition', 'Parcel is tracked');
    choose('Necessary condition', 'Parcel is express');
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText('Which fact is enough to establish tracking?')).toBeTruthy();
    expect(screen.queryByText(drill.items[0].explanation)).toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    choose('Sufficient condition', 'Parcel is express');
    expect(screen.getByText('Which fact is enough to establish tracking?')).toBeTruthy();
    choose('Necessary condition', 'Parcel is tracked');
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText(drill.items[0].explanation)).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.queryByRole('button', { name: /revise/i })).toBeNull();
    const patch = save.mock.calls.at(-1)?.[1];
    expect(patch.state.answers.one.response.left).toEqual(atom('express'));
    expect(patch.status).toBe('done');
  });
  it('does not write on mount, resumes genuine work, and preserves a revealed boundary', () => {
    const save = vi.fn();
    const state = { version: 1, signature: JSON.stringify(drill.items), index: 0, started: true, answers: { one: { response: { kind: 'build-rule', left: atom('tracked'), right: atom('express') }, misses: 1, correct: false, resolved: false, revealed: false } } };
    render(<CourseProgressProvider store={{ steps: { 'fresh-rule': { status: 'started', state, updatedAt: '2026-10-25' } }, save }}><FullCourseDrill drill={drill}/></CourseProgressProvider>);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Sufficient condition').getAttribute('data-value')).toBe('tracked');
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText('You reviewed the answer to this question.')).toBeTruthy();
    expect(save.mock.calls.at(-1)?.[1].state.answers.one.correct).toBe(false);
  });
  it('keeps a fact/rule counterexample operation separate from answer selection', () => {
    const caseDrill: FullCourseDrillSet = { ...drill, items: [{ kind: 'case', id: 'counter', prompt: 'Show why the reverse does not follow.', hint: 'Could a tracked parcel use a different service?', explanation: 'A tracked parcel that is not express fits the original rule.', atoms: (drill.items[0] as any).atoms, premises: [implies(atom('express'), atom('tracked'))], target: implies(atom('tracked'), atom('express')), task: 'counterexample' }] };
    render(<FullCourseDrill drill={caseDrill} autoStart/>);
    fireEvent.click(screen.getAllByLabelText('False')[0]);
    fireEvent.click(screen.getAllByLabelText('True')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText('Correct.')).toBeTruthy();
  });
  it('lets the learner contrapose a supplied rule and use the resulting connection', () => {
    const chainDrill: FullCourseDrillSet = { ...drill, items: [{ kind: 'chain', id: 'hidden', prompt: 'Establish that the vial is not open.', hint: 'Can sealing rule out openness?', explanation: 'A marked vial is sealed, so it cannot be open under these rules.', atoms: [{ id: 'marked', label: 'Vial marked', subject: 'vial', domain: 'vials' }, { id: 'sealed', label: 'Vial sealed', subject: 'vial', domain: 'vials' }, { id: 'open', label: 'Vial open', subject: 'vial', domain: 'vials' }], start: atom('marked'), target: { not: atom('open') }, rules: [{ id: 'first', text: 'Marked vials are sealed.', rule: { if: atom('marked'), then: atom('sealed') } }, { id: 'second', text: 'Open vials are not sealed.', rule: { if: atom('open'), then: { not: atom('sealed') } } }] }] };
    render(<FullCourseDrill drill={chainDrill} autoStart/>);
    fireEvent.click(within(screen.getByRole('group', { name: 'Marked vials are sealed.' })).getByRole('button', { name: 'Use this rule' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Open vials are not sealed.' })).getByRole('button', { name: 'Use its contrapositive' }));
    expect(screen.getByText('Vial sealed → NOT Vial open')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText('Correct.')).toBeTruthy();
  });
});
it('preserves completed course credit while reviewing the same item revision', () => {
  const save = vi.fn();
  const state = { version: 1, signature: JSON.stringify(drill.items), index: 0, started: true, answers: {} };
  render(<CourseProgressProvider store={{ steps: { 'fresh-rule': { status: 'done', state, updatedAt: '2026-10-25' } }, save }}><FullCourseDrill drill={drill}/></CourseProgressProvider>);
  choose('Sufficient condition', 'Parcel is tracked');
  expect(save.mock.calls.at(-1)?.[1]).toMatchObject({ status: 'done', done: 0 });
  expect(save.mock.calls.at(-1)?.[1]).not.toHaveProperty('reopen');
});
it('reopens completed credit only when the actual item signature changes', () => {
  const save = vi.fn();
  const state = { version: 1, signature: 'old item revision', index: 0, started: true, answers: {} };
  render(<CourseProgressProvider store={{ steps: { 'fresh-rule': { status: 'done', state, updatedAt: '2026-10-25' } }, save }}><FullCourseDrill drill={drill} autoStart/></CourseProgressProvider>);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Download the saved attempt' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Start revised practice' }));
  expect(save.mock.calls.at(-1)?.[1]).toMatchObject({ status: 'started', reopen: true });
  choose('Sufficient condition', 'Parcel is express');
  choose('Necessary condition', 'Parcel is tracked');
  expect(save.mock.calls.at(-1)?.[1]).not.toHaveProperty('reopen');
});
