import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SourceWorksheetDrill } from './SourceWorksheetDrill';
import { sourceWorksheetDrills } from '../content/sourceWorksheetDrills';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const run = (setId: string) => render(<SourceWorksheetDrill setId={setId} run/>);
const write = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const compare = () => click('Compare this step');
const confirm = () => click('I compared the meaning');
it('checks indicators and reviews directly without a condition-highlighting step', () => {
  run('source-intro-identify');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByRole('textbox')).toBeNull();
  click('if');
  fireEvent.click(screen.getByRole('radio', { name: /Group 1/ }));
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'That step works.' })).toHaveFocus();
  click('Continue');
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('group', { name: /first and last word/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('My reasoning matched');
  expect(screen.getByRole('button', { name: 'Question 1, completed, current' })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('1 reviewed · 27 remaining')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  click('Next');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
});

it('requires the whole indicator phrase and correct group before advancing, with a hint instead of the key', () => {
  // The former indicator drill now continues Drill 2 from sentence 16.
  run('source-intro-identify');
  fireEvent.click(screen.getByRole('button', { name: /^Question 16,/ }));
  click('Only');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.getByText('“Only” is only part of an indicator. Select every word of the phrase.')).toBeVisible();
  expect(screen.queryByText(/Indicators:/)).toBeNull();
  expect(screen.queryByText(/training requirement comes first/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('if');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByText(/Indicators:/)).toBeVisible();
  click('Continue');
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
});

it('carries indicator work from the folded drill into Drill 2 without marking the rule reviewed', () => {
  const folded = sourceWorksheetDrills.find(s => s.id === 'source-intro-identify')!.items.find(i => i.id === 'source-indicators-01')!;
  const fingerprint = JSON.stringify([folded.statement, folded.sufficient, folded.necessary, folded.indicators, folded.contrapositiveWords]);
  localStorage.setItem('conditional-worksheet-v1:source-indicators', JSON.stringify({ current: 0, answers: { 'source-indicators-01': {
    groups: { '0-1': '2' }, fingerprint, words: [0, 1], left: '', right: '', contraLeft: '', contraRight: '', writing: '',
    stage: 1, passed: ['indicators'], revealed: true, review: 'matched',
  } } }));
  run('source-intro-identify');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  fireEvent.click(screen.getByRole('button', { name: /^Question 16,/ }));
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
  expect(JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-indicators')!).answers['source-indicators-01'].review).toBe('matched');
});

it('gives a placement hint without showing the diagram until the placement is right', () => {
  run('source-roles');
  const left = screen.getByRole('group', { name: 'Left: sufficient condition' });
  const right = screen.getByRole('group', { name: 'Right: necessary condition' });
  fireEvent.click(within(left).getByRole('button', { name: 'those employees complete training' }));
  fireEvent.click(within(right).getByRole('button', { name: 'employees qualify for promotion' }));
  click('Check this step');
  expect(screen.getByText('Which condition is enough to prove the other? That one goes on the left.')).toBeVisible();
  expect(screen.queryByText('employees qualify for promotion → those employees complete training')).toBeNull();
  fireEvent.click(within(left).getByRole('button', { name: 'employees qualify for promotion' }));
  fireEvent.click(within(right).getByRole('button', { name: 'those employees complete training' }));
  click('Check this step');
  expect(screen.getByText('employees qualify for promotion → those employees complete training')).toBeVisible();
});

it('keeps every source task reachable and future operations gated', () => {
  for (const set of sourceWorksheetDrills) {
    const view = run(set.id);
    const navigator = screen.getByRole('group', { name: 'Go to question' });
    expect(within(navigator).getAllByRole('button')).toHaveLength(set.items.length);
    fireEvent.click(within(navigator).getByRole('button', { name: new RegExp(`^Question ${set.items.length},`) }));
    expect(screen.getByText(`Question ${set.items.length} of ${set.items.length}`)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bring it together' })).toBeDisabled();
    if (set.taskKind !== 'contrapositive') expect(screen.queryByRole('button', { name: 'Reverse and negate' })).toBeNull();
    view.unmount();
  }
});

it('compares the diagram and checks the contrapositive as each is built, and holds the written readbacks to the end', () => {
  run('source-full-translation');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByText('that intern is offered a full-time position', { exact: true })).toBeNull();
  click('All');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('Revise this step');
  fireEvent.click(screen.getByRole('radio', { name: /Group 1/ }));
  click('Check this step');
  click('Continue');
  expect(screen.getByRole('heading', { name: 'Define your symbols' })).toBeVisible();
  expect(screen.queryByRole('group', { name: /first and last word/ })).toBeNull();
  write('First condition’s symbol', 'I');
  write('Second condition’s symbol', 'I');
  expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  write('First condition’s symbol', 'O');
  click('Save and continue');
  const ours = sourceWorksheetDrills.find(s => s.id === 'source-full-translation')!.items[0];
  const left = () => screen.getByRole('group', { name: 'Left: sufficient condition' });
  const right = () => screen.getByRole('group', { name: 'Right: necessary condition' });
  fireEvent.click(within(left()).getByRole('button', { name: 'O' }));
  fireEvent.click(within(right()).getByRole('button', { name: 'I' }));
  click('Check this step');
  expect(screen.getByText('Which condition is enough to prove the other? That one goes on the left.')).toBeVisible();
  expect(screen.queryByText(ours.diagram)).toBeNull();
  fireEvent.click(within(left()).getByRole('button', { name: 'I' }));
  fireEvent.click(within(right()).getByRole('button', { name: 'O' }));
  click('Check this step');
  expect(screen.getByText(ours.diagram)).toBeVisible();
  click('Continue');
  const contraLeft = () => screen.getByRole('group', { name: 'Left side' });
  const contraRight = () => screen.getByRole('group', { name: 'Right side' });
  fireEvent.click(within(contraLeft()).getByRole('button', { name: 'I' }));
  fireEvent.click(within(contraRight()).getByRole('button', { name: 'O' }));
  fireEvent.click(screen.getByLabelText('NOT on the left side'));
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText('Start with the right side of your original diagram. It becomes the new left side.')).toBeVisible();
  expect(screen.queryByText(ours.contrapositive)).toBeNull();
  fireEvent.click(within(contraLeft()).getByRole('button', { name: 'NOT O' }));
  fireEvent.click(within(contraRight()).getByRole('button', { name: 'NOT I' }));
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText('The order is right. Now negate each whole side once.')).toBeVisible();
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText(ours.contrapositive)).toBeVisible();
  expect(screen.queryByText(ours.contrapositiveWords)).toBeNull();
  click('Continue');
  write('Write this rule as an if/then sentence.', 'If an intern completes the program, then they are offered a full-time position.');
  click('Save and continue');
  write('Write the contrapositive in ordinary language.', 'If that intern is not offered the position, then they did not complete the program.');
  expect(screen.queryByText('Compare with our version')).toBeNull();
  click('Save and continue');
  expect(screen.getByText('Compare with our version')).toBeVisible();
  expect(screen.getByText('I → O', { exact: true })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('Needs another look');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

it('begins rephrasing with writing before any supplied diagram or condition choices', () => {
  run('source-rephrase');
  expect(screen.getByRole('heading', { name: 'Rewrite the rule' })).toBeVisible();
  expect(screen.queryByText('a person is a runner in a marathon', { exact: true })).toBeNull();
  write('Write this rule as an if/then sentence.', 'If a person runs the marathon, they must hydrate beforehand.');
  expect(screen.getByText('Our version stays hidden until you have completed the whole translation.')).toBeVisible();
  click('Save and continue');
  expect(screen.queryByText(/If a person is a runner in a marathon/)).toBeNull();
  expect(screen.getByRole('heading', { name: 'Find the indicators' })).toBeVisible();
});

it('restores a partially written stage and invalidates stale source checks without discarding drafts', () => {
  const view = run('source-rephrase');
  write('Write this rule as an if/then sentence.', 'My earlier wording.');
  view.unmount();
  run('source-rephrase');
  expect(screen.getByRole('textbox')).toHaveValue('My earlier wording.');
  cleanup();
  const key = 'conditional-worksheet-v1:source-rephrase';
  const data = JSON.parse(localStorage.getItem(key)!);
  const item = sourceWorksheetDrills.find(s => s.id === 'source-rephrase')!.items[0];
  data.answers[item.id].conditionOne = null;
  data.answers[item.id].contraDraft = null;
  data.answers[item.id].fingerprint = 'old content';
  data.answers[item.id].review = 'matched';
  localStorage.setItem(key, JSON.stringify(data));
  run('source-rephrase');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('textbox')).toHaveValue('My earlier wording.');
});

it('recovers malformed saved state and links the landing to its run route', () => {
  localStorage.setItem('conditional-worksheet-v1:source-rephrase', '{broken');
  render(<MemoryRouter><SourceWorksheetDrill setId="source-rephrase" title="Drill 6" startUrl="?page=source-rephrase&run=1"/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Drill 6' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/?page=source-rephrase&run=1');
});


it('uses native grouped radios and restores their choice through numbered question navigation', () => {
  const view = run('source-intro-identify');
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByText('Intro training')).toBeNull();
  expect(screen.queryByText('Ready to begin')).toBeNull();
  click('if');
  const first = screen.getByRole('radio', { name: 'Group 1: sufficient-condition indicator' });
  const second = screen.getByRole('radio', { name: 'Group 2: necessary-condition indicator' });
  expect(first).toHaveAttribute('type', 'radio');
  expect(first.getAttribute('name')).toBe(second.getAttribute('name'));
  first.focus();
  expect(first).toHaveFocus();
  fireEvent.click(first);
  expect(first).toBeChecked();
  expect(second).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: /^Question 2,/ }));
  expect(screen.getByRole('button', { name: 'Question 2, not started, current' })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: 'Question 1, in progress' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Question 1,/ }));
  expect(screen.getByRole('radio', { name: 'Group 1: sufficient-condition indicator' })).toBeChecked();
  view.unmount();
  run('source-intro-identify');
  expect(screen.getByRole('radio', { name: 'Group 1: sufficient-condition indicator' })).toBeChecked();
});


it.each(sourceWorksheetDrills.map(set => [set.id]))('never presents condition highlighting in %s entry or active steps', (setId) => {
  const view = render(<SourceWorksheetDrill setId={setId}/>);
  expect(document.body.textContent).not.toMatch(/highlight|first and last word/i);
  click('Start practice');
  expect(screen.queryByRole('button', { name: 'Keep the complete ideas' })).toBeNull();
  expect(screen.queryByRole('group', { name: /first and last word/ })).toBeNull();
  view.unmount();
});

it('resumes an old removed condition stage at review and keeps earlier work stored', () => {
  const set = sourceWorksheetDrills.find(set => set.id === 'source-intro-identify')!;
  const item = set.items[0];
  const fingerprint = JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
  const key = `conditional-worksheet-v1:${set.id}`;
  localStorage.setItem(key, JSON.stringify({ current: 0, answers: { [item.id]: {
    groups: { '4': '1' }, fingerprint, words: [4], left: '', right: '', contraLeft: '', contraRight: '', writing: 'Earlier draft',
    stage: 1, passed: ['indicators'], spans: [[0, 3]], conditionOne: 'A warranty is valid', conditionTwo: '', review: null,
  } } }));
  run(set.id);
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  const saved = JSON.parse(localStorage.getItem(key)!).answers[item.id];
  expect(saved.spans).toEqual([[0, 3]]);
  expect(saved.writing).toBe('Earlier draft');
  expect(saved.flowVersion).toBe(2);
});

it('keeps saved symbol meanings and diagram stage when migrating an older highlighted run', () => {
  const set = sourceWorksheetDrills.find(set => set.id === 'source-intro-diagrams')!;
  const item = set.items[0];
  const fingerprint = JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
  const key = `conditional-worksheet-v1:${set.id}`;
  localStorage.setItem(key, JSON.stringify({ current: 0, answers: { [item.id]: {
    groups: {}, fingerprint, words: [], left: '2', right: '1', contraLeft: '', contraRight: '', writing: '',
    conditionOne: 'A warranty is valid', conditionTwo: 'the product is registered within 30 days.', symbolOne: 'W', symbolTwo: 'R',
    stage: 2, passed: ['conditions', 'symbols'], spans: [[0, 3], [5, 11]], review: null,
  } } }));
  const view = run(set.id);
  expect(screen.getByRole('heading', { name: 'Build the diagram' })).toBeVisible();
  expect(screen.getByText('A warranty is valid', { exact: false, selector: '.sw-learner-legend p' })).toHaveTextContent('W = A warranty is valid');
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'That step works.' })).toBeVisible();
  view.unmount();
  run(set.id);
  expect(screen.getByRole('heading', { name: 'Build the diagram' })).toBeVisible();
  expect(JSON.parse(localStorage.getItem(key)!).answers[item.id].spans).toEqual([[0, 3], [5, 11]]);
});
