import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SourceWorksheetDrill } from './SourceWorksheetDrill';
import { gradeConditionalRewrite } from '@/lib/conditionalRewriteGrader';
vi.mock('@/lib/conditionalRewriteGrader', () => ({ gradeConditionalRewrite: vi.fn() }));
import { sourceWorksheetDrills } from '../content/sourceWorksheetDrills';

beforeEach(() => { localStorage.clear(); vi.mocked(gradeConditionalRewrite).mockReset(); vi.mocked(gradeConditionalRewrite).mockResolvedValue({ correct: true, feedback: 'Unused provider prose.' }); });
afterEach(cleanup);
// A saved-position fixture exercises resumed questions without restoring a jump UI.
const run = (setId: string, current?: number) => {
  if (current !== undefined) {
    const key = `conditional-worksheet-v1:${setId}`;
    const saved = JSON.parse(localStorage.getItem(key) ?? '{"answers":{}}');
    localStorage.setItem(key, JSON.stringify({ ...saved, current }));
  }
  return render(<SourceWorksheetDrill setId={setId} run/>);
};
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
  click('Next step');
  expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByRole('group', { name: /first and last word/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('progressbar').querySelector('[data-current="true"]')).toHaveAttribute('data-complete', 'true');
  expect(screen.queryByText(/reviewed · .*remaining/)).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  click('Next question');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
});

it('requires the whole indicator phrase and correct group before advancing, with a hint instead of the key', () => {
  // The former indicator drill now continues Drill 2 from sentence 16.
  run('source-intro-identify', 15);
  click('Only');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.getByText('“Only” is only part of an indicator. Select every word of the phrase.')).toBeVisible();
  expect(screen.queryByText(/Indicators:/)).toBeNull();
  expect(screen.queryByText(/training requirement comes first/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull();
  click('if');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByText(/Indicators:/)).toBeVisible();
  click('Next step');
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
});

it('carries checked indicator work into the current recognition flow while preserving its old record', () => {
  const folded = sourceWorksheetDrills.find(s => s.id === 'source-intro-identify')!.items.find(i => i.id === 'source-indicators-01')!;
  const fingerprint = JSON.stringify([folded.statement, folded.sufficient, folded.necessary, folded.indicators, folded.contrapositiveWords]);
  localStorage.setItem('conditional-worksheet-v1:source-indicators', JSON.stringify({ current: 0, answers: { 'source-indicators-01': {
    groups: { '0-1': '2' }, fingerprint, words: [0, 1], left: '', right: '', contraLeft: '', contraRight: '', writing: '',
    stage: 1, passed: ['indicators'], revealed: true, review: 'matched',
  } } }));
  run('source-intro-identify', 15);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
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

it('keeps resumed source questions reachable with only previous and next navigation, without counting a visit as completion', () => {
  for (const set of sourceWorksheetDrills) {
    const view = run(set.id, set.items.length - 1);
    expect(screen.queryByRole('group', { name: 'Go to question' })).toBeNull();
    expect(document.querySelector('.sw-question-picker')).toBeNull();
    expect(screen.getByText(`Question ${set.items.length} of ${set.items.length}`)).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: 'Previous question' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'See results' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bring it together' })).toBeDisabled();
    if (set.taskKind !== 'contrapositive') expect(screen.queryByRole('button', { name: 'Reverse and negate' })).toBeNull();
    click('Previous question');
    expect(screen.getByText(`Question ${set.items.length - 1} of ${set.items.length}`)).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    view.unmount();
  }
});

it('checks shortened phrases, diagram direction and both written readbacks without self-rating', async () => {
  run('source-full-translation');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByText('that intern is offered a full-time position', { exact: true })).toBeNull();
  click('All');
  fireEvent.click(screen.getByRole('radio', { name: /Group 2/ }));
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull();
  click('Revise this step');
  fireEvent.click(screen.getByRole('radio', { name: /Group 1/ }));
  click('Check this step');
  click('Next step');
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
  expect(screen.queryByRole('group', { name: /first and last word/ })).toBeNull();
  write('First condition’s short version', 'Intern offered full-time position');
  write('Second condition’s short version', 'Intern completes program');
  click('Next step');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Build the diagram' })).toBeVisible());
  const ours = sourceWorksheetDrills.find(s => s.id === 'source-full-translation')!.items[0];
  const left = () => screen.getByRole('group', { name: 'Left: sufficient condition' });
  const right = () => screen.getByRole('group', { name: 'Right: necessary condition' });
  fireEvent.click(within(left()).getByRole('button', { name: 'Intern offered full-time position' }));
  fireEvent.click(within(right()).getByRole('button', { name: 'Intern completes program' }));
  click('Check this step');
  expect(screen.getByText('Which condition is enough to prove the other? That one goes on the left.')).toBeVisible();
  expect(screen.queryByText(ours.diagram)).toBeNull();
  fireEvent.click(within(left()).getByRole('button', { name: 'Intern completes program' }));
  fireEvent.click(within(right()).getByRole('button', { name: 'Intern offered full-time position' }));
  click('Check this step');
  expect(screen.getByText(ours.diagram)).toBeVisible();
  click('Next step');
  const contraLeft = () => screen.getByRole('group', { name: 'Left side' });
  const contraRight = () => screen.getByRole('group', { name: 'Right side' });
  fireEvent.click(within(contraLeft()).getByRole('button', { name: 'Intern completes program' }));
  fireEvent.click(within(contraRight()).getByRole('button', { name: 'Intern offered full-time position' }));
  fireEvent.click(screen.getByLabelText('NOT on the left side'));
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText('Start with the right side of your original diagram. It becomes the new left side.')).toBeVisible();
  expect(screen.queryByText(ours.contrapositive)).toBeNull();
  fireEvent.click(within(contraLeft()).getByRole('button', { name: 'NOT Intern offered full-time position' }));
  fireEvent.click(within(contraRight()).getByRole('button', { name: 'NOT Intern completes program' }));
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText('The order is right. Now negate each whole side once.')).toBeVisible();
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText(ours.contrapositive)).toBeVisible();
  expect(screen.queryByText(ours.contrapositiveWords)).toBeNull();
  click('Next step');
  write('Write this rule as an if/then sentence.', 'If an intern completes the program, then they are offered a full-time position.');
  click('Next step');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Read the contrapositive' })).toBeVisible());
  write('Write the contrapositive in ordinary language.', 'If that intern is not offered the position, then they did not complete the program.');
  click('Next step');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Checks passed.' })).toBeVisible());
  expect(screen.getByText('Intern completes program → Intern offered full-time position', { exact: true })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'My reasoning matched' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'I compared my wording' })).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

it('begins rephrasing with checked writing before any supplied diagram or condition choices', async () => {
  run('source-rephrase');
  expect(screen.getByRole('heading', { name: 'Rewrite the rule' })).toBeVisible();
  expect(screen.queryByText('a person is a runner in a marathon', { exact: true })).toBeNull();
  write('Write this rule as an if/then sentence.', 'If a person runs the marathon, they must hydrate beforehand.');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled();
  click('Next step');
  expect(screen.queryByText(/If a person is a runner in a marathon/)).toBeNull();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Find the indicators' })).toBeVisible());
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


it('uses native grouped radios and restores a learner draft through previous-question navigation', () => {
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
  view.unmount();
  const resumed = run('source-intro-identify', 1);
  expect(screen.getByText('Question 2 of 28')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('Previous question');
  expect(screen.getByRole('radio', { name: 'Group 1: sufficient-condition indicator' })).toBeChecked();
  resumed.unmount();
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
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  const saved = JSON.parse(localStorage.getItem(key)!).answers[item.id];
  expect(saved.spans).toEqual([[0, 3]]);
  expect(saved.writing).toBe('Earlier draft');
  expect(saved.flowVersion).toBe(4);
});

it('preserves old letter drafts but requires shortening anew before a saved diagram can count', () => {
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
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
  expect(screen.getByLabelText('First condition’s short version')).toHaveValue('W');
  expect(screen.getByLabelText('Second condition’s short version')).toHaveValue('R');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  view.unmount();
  run(set.id);
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
  const migrated = JSON.parse(localStorage.getItem(key)!).answers[item.id];
  expect(migrated.spans).toEqual([[0, 3], [5, 11]]);
  expect(migrated.symbolOne).toBe('W');
  expect(migrated.passed).not.toContain('symbols');
});


it('accepts exact full-condition identity locally but never accepts arbitrary letter codes', async () => {
  run('source-intro-diagrams');
  write('First condition’s short version', 'W');
  write('Second condition’s short version', 'R');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  const item = sourceWorksheetDrills.find(set => set.id === 'source-intro-diagrams')!.items[0];
  write('First condition’s short version', item.necessary);
  write('Second condition’s short version', item.sufficient);
  click('Next step');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Build the diagram' })).toBeVisible());
  expect(gradeConditionalRewrite).not.toHaveBeenCalled();
});

it('requires a semantic verdict for shortened phrases and blocks an omitted deadline', async () => {
  vi.mocked(gradeConditionalRewrite).mockResolvedValueOnce({ correct: true, feedback: 'provider diagnosis must not appear' }).mockResolvedValueOnce({ correct: false, feedback: 'provider diagnosis must not appear' });
  run('source-intro-diagrams');
  write('First condition’s short version', 'Warranty valid');
  write('Second condition’s short version', 'Product registered');
  click('Next step');
  await waitFor(() => expect(gradeConditionalRewrite).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByText(/Compare “Product registered”/)).toBeVisible());
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
  expect(screen.queryByText('provider diagnosis must not appear')).toBeNull();
  expect(gradeConditionalRewrite).toHaveBeenCalledWith(expect.objectContaining({ expected: expect.stringContaining('within 30 days'), studentResponse: 'Product registered', task: 'explanation' }));
});

it('does not partially pass or advance when a condition check fails to return', async () => {
  vi.mocked(gradeConditionalRewrite).mockResolvedValueOnce({ correct: true, feedback: 'ok' }).mockRejectedValueOnce(new Error('offline'));
  run('source-intro-diagrams');
  write('First condition’s short version', 'Warranty valid');
  write('Second condition’s short version', 'Product registered within 30 days');
  click('Next step');
  expect(await screen.findByRole('alert')).toHaveTextContent('have not been checked');
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
});

it('ignores a semantic verdict returned after navigating to another question', async () => {
  let resolve!: (value: { correct: boolean; feedback: string }) => void;
  vi.mocked(gradeConditionalRewrite).mockImplementation(() => new Promise(done => { resolve = done; }));
  run('source-intro-diagrams', 1);
  write('First condition’s short version', 'Warranty valid');
  const item = sourceWorksheetDrills.find(set => set.id === 'source-intro-diagrams')!.items[1];
  write('Second condition’s short version', item.necessary);
  click('Next step');
  click('Previous question');
  await act(async () => { resolve({ correct: true, feedback: 'late' }); });
  expect(screen.getByRole('heading', { name: 'Shorten the conditions' })).toBeVisible();
  const saved = JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-intro-diagrams')!);
  expect(saved.answers[item.id].condensation).toBeUndefined();
});


it('does not complete a written rewrite on an incorrect or failed semantic check', async () => {
  vi.mocked(gradeConditionalRewrite).mockResolvedValueOnce({ correct: false, feedback: 'The guarantee changed.' }).mockRejectedValueOnce(new Error('offline'));
  run('source-rephrase');
  write('Write this rule as an if/then sentence.', 'If runners hydrate, they must run a marathon.');
  click('Next step');
  expect(await screen.findByRole('status')).toHaveTextContent('The guarantee changed.');
  expect(screen.getByRole('heading', { name: 'Rewrite the rule' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('Next step');
  expect(await screen.findByRole('alert')).toHaveTextContent('has not been checked');
});


it('starts blank and preserves a learner’s unchecked short-version draft after reload without granting completion', () => {
  const view = run('source-intro-diagrams');
  expect(screen.getByLabelText('First condition’s short version')).toHaveValue('');
  expect(screen.getByLabelText('Second condition’s short version')).toHaveValue('');
  expect(screen.queryByRole('group', { name: 'Go to question' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Previous question' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  write('First condition’s short version', 'Warranty valid');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(gradeConditionalRewrite).not.toHaveBeenCalled();
  view.unmount();
  run('source-intro-diagrams');
  expect(screen.getByLabelText('First condition’s short version')).toHaveValue('Warranty valid');
  expect(screen.getByLabelText('Second condition’s short version')).toHaveValue('');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
});


it('keeps untouched saved choices but clears dependent diagram selections when a short condition changes', () => {
  const set = sourceWorksheetDrills.find(set => set.id === 'source-intro-diagrams')!;
  const item = set.items[0];
  const key = `conditional-worksheet-v1:${set.id}`;
  const fingerprint = JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
  localStorage.setItem(key, JSON.stringify({ current: 0, answers: { [item.id]: {
    flowVersion: 4, groups: {}, fingerprint, words: [], spans: [], stage: 1, passed: ['symbols'], review: null,
    symbolOne: 'Warranty valid', symbolTwo: 'Registered within 30 days', conditionOne: '', conditionTwo: '',
    left: '2', right: '1', contraLeft: '1', contraRight: '2', negateLeft: true, negateRight: true,
    writing: 'My original wording', contraWriting: 'My contrapositive wording',
    condensation: { first: 'Warranty valid', second: 'Registered within 30 days', correct: true, feedback: [] },
  } } }));
  const view = run(set.id);
  expect(within(screen.getByRole('group', { name: 'Left: sufficient condition' })).getByRole('button', { name: 'Registered within 30 days' })).toHaveAttribute('aria-pressed', 'true');
  view.unmount();
  run(set.id);
  expect(within(screen.getByRole('group', { name: 'Right: necessary condition' })).getByRole('button', { name: 'Warranty valid' })).toHaveAttribute('aria-pressed', 'true');
  click('Shorten the conditions');
  write('First condition’s short version', 'The warranty is valid');
  const saved = JSON.parse(localStorage.getItem(key)!).answers[item.id];
  expect([saved.left, saved.right, saved.contraLeft, saved.contraRight]).toEqual(['', '', '', '']);
  expect(saved.negateLeft).toBe(false);
  expect(saved.negateRight).toBe(false);
  expect(saved.writing).toBe('My original wording');
  expect(saved.contraWriting).toBe('My contrapositive wording');
  expect(saved.passed).not.toContain('symbols');
});
