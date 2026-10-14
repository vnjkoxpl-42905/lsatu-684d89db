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
// Highlights a condition by the position of its first and last word in the rule.
const mark = (from: number, to: number) => {
  const words = within(screen.getByRole('group', { name: /Click the first and last word/ })).getAllByRole('button');
  fireEvent.click(words[from]);
  fireEvent.click(words[to]);
};

it('keeps intro identification faithful: indicators first, then the learner highlights both conditions', () => {
  run('source-intro-identify');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByRole('textbox')).toBeNull();
  click('if');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveFocus();
  click('Continue');
  expect(screen.queryByLabelText(/Which group/)).toBeNull();
  expect(screen.queryByText('the product is registered within 30 days', { exact: true })).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  mark(5, 11);
  mark(0, 3);
  click('Check this step');
  expect(screen.getByText('the product is registered within 30 days', { selector: 'li' })).toBeVisible();
  click('Continue');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('My reasoning matched');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  click('Next');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
});

it('requires the whole indicator phrase and correct group before advancing, with a hint instead of the key', () => {
  // The former indicator drill now continues Drill 2 from sentence 16.
  run('source-intro-identify');
  fireEvent.change(screen.getByLabelText('Go to question'), { target: { value: 15 } });
  click('Only');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.getByText('“Only” is only part of an indicator. Select every word of the phrase.')).toBeVisible();
  expect(screen.queryByText(/Indicators:/)).toBeNull();
  expect(screen.queryByText(/training requirement comes first/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('if');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByText(/Indicators:/)).toBeVisible();
  click('Continue');
  expect(screen.getByRole('heading', { name: 'Highlight both conditions' })).toBeVisible();
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
  fireEvent.change(screen.getByLabelText('Go to question'), { target: { value: 15 } });
  expect(screen.getByRole('heading', { name: 'Highlight both conditions' })).toBeVisible();
  expect(JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-indicators')!).answers['source-indicators-01'].review).toBe('matched');
});

it('gives a placement hint without showing the diagram until the placement is right', () => {
  run('source-roles');
  mark(2, 4);
  mark(6, 9);
  click('Check this step');
  click('Continue');
  const left = screen.getByRole('group', { name: 'Left: sufficient condition' });
  const right = screen.getByRole('group', { name: 'Right: necessary condition' });
  // The explanation names the sides, so it waits until the diagram step.
  expect(screen.queryByText(/qualification goes on the left/)).toBeNull();
  fireEvent.click(within(left).getByRole('button', { name: 'employees complete training' }));
  fireEvent.click(within(right).getByRole('button', { name: 'employees qualify for promotion' }));
  click('Check this step');
  expect(screen.getByText('Which condition is enough to prove the other? That one goes on the left.')).toBeVisible();
  expect(screen.queryByText('employees qualify for promotion → employees complete training')).toBeNull();
  fireEvent.click(within(left).getByRole('button', { name: 'employees qualify for promotion' }));
  fireEvent.click(within(right).getByRole('button', { name: 'employees complete training' }));
  click('Check this step');
  expect(screen.getByText('employees qualify for promotion → employees complete training')).toBeVisible();
  expect(screen.getByText(/qualification goes on the left/)).toBeVisible();
});

it('keeps every source task reachable and future operations gated', () => {
  for (const set of sourceWorksheetDrills) {
    const view = run(set.id);
    const navigator = screen.getByLabelText('Go to question');
    expect(navigator.querySelectorAll('option')).toHaveLength(set.items.length);
    fireEvent.change(navigator, { target: { value: set.items.length - 1 } });
    expect(screen.getByText(`Question ${set.items.length} of ${set.items.length}`)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bring it together' })).toBeDisabled();
    if (set.taskKind !== 'contrapositive') expect(screen.queryByRole('button', { name: 'Flip and negate' })).toBeNull();
    view.unmount();
  }
});

it('compares the diagram and checks the contrapositive as each is built, and holds the written readbacks to the end', () => {
  run('source-full-translation');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByText('the person is offered a full-time position', { exact: true })).toBeNull();
  click('All');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('Revise this step');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  click('Check this step');
  click('Continue');
  // The conditions step is checked: an indicator inside the highlight, or the same condition twice, is not accepted.
  mark(0, 5);
  mark(7, 9);
  click('Check this step');
  expect(screen.getByText(/not a complete condition/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('Revise this step');
  // Clicking inside a highlight removes it.
  fireEvent.click(within(screen.getByRole('group', { name: /Click the first and last word/ })).getAllByRole('button')[0]);
  mark(1, 5);
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  click('Continue');
  write('First condition’s symbol', 'I');
  write('Second condition’s symbol', 'I');
  expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  write('Second condition’s symbol', 'O');
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
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  // Our wording waits until the learner has written their own readbacks.
  expect(screen.queryByText(ours.diagram)).toBeNull();
  expect(screen.queryByText(ours.explanation)).toBeNull();
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
  expect(screen.getByText('The order is correct. Now negate each whole side once.')).toBeVisible();
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  expect(screen.getByText('Both sides flipped, and both were negated.')).toBeVisible();
  expect(screen.queryByText(ours.contrapositive)).toBeNull();
  expect(screen.queryByText(ours.contrapositiveWords)).toBeNull();
  click('Continue');
  write('Write this rule as an if/then sentence.', 'If an intern completes the program, then they are offered a full-time position.');
  click('Save and continue');
  write('Write the contrapositive in ordinary language.', 'If that intern is not offered the position, then they did not complete the program.');
  expect(screen.queryByText('Compare with our version')).toBeNull();
  click('Save and continue');
  expect(screen.getByText('Compare with our version')).toBeVisible();
  expect(screen.getByText('I → O', { exact: true })).toBeVisible();
  expect(screen.getByText(ours.diagram)).toBeVisible();
  expect(screen.getByText(ours.contrapositive)).toBeVisible();
  expect(screen.getByText(ours.contrapositiveWords)).toBeVisible();
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
  // An unreadable fingerprint cannot prove the graded wording is unchanged, so the whole attempt is archived first.
  const archived = JSON.parse(localStorage.getItem(key)!).answers[item.id].previous;
  expect(archived).toHaveLength(1);
  expect(archived[0]).toMatchObject({ fingerprint: 'old content', review: 'matched', writing: 'My earlier wording.' });
});

it('recovers malformed saved state and links the landing to its run route', () => {
  localStorage.setItem('conditional-worksheet-v1:source-rephrase', '{broken');
  render(<MemoryRouter><SourceWorksheetDrill setId="source-rephrase" title="Drill 6" startUrl="?page=source-rephrase&run=1"/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Drill 6' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/?page=source-rephrase&run=1');
});


it('starts the clicked words and highlights over when a rule is reworded, and keeps written drafts', () => {
  const set = sourceWorksheetDrills.find(s => s.id === 'source-independent')!;
  const item = set.items.find(i => i.id === 'source-independent-06')!;
  const oldPrint = JSON.stringify(["Where there's beer, there's fun.", 'there is beer at a place', 'there is fun at that place', item.indicators, 'old']);
  localStorage.setItem('conditional-worksheet-v1:source-independent', JSON.stringify({ current: 5, answers: { [item.id]: {
    groups: { '0': '1' }, fingerprint: oldPrint, words: [0, 9], spans: [[1, 2], [3, 40]], left: '1', right: '2', contraLeft: '2', contraRight: '1',
    negateLeft: true, negateRight: true, writing: 'My old readback.', contraWriting: '', stage: 7,
    passed: ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback'], revealed: true, review: 'matched',
  } } }));
  run('source-independent');
  expect(screen.getByText("Where there's smoke, there's fire.", { selector: 'blockquote' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Find the indicators' })).toBeVisible();
  const words = within(screen.getByRole('group', { name: /Click the indicator/ })).getAllByRole('button');
  expect(words.filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  const saved = JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-independent')!).answers[item.id];
  expect(saved.writing).toBe('My old readback.');
  expect(saved.spans).toEqual([]);
  expect(saved.words).toEqual([]);
  // The completed attempt is archived whole before anything is reset.
  expect(saved.previous).toHaveLength(1);
  expect(saved.previous[0]).toMatchObject({ fingerprint: oldPrint, review: 'matched', spans: [[1, 2], [3, 40]], words: [0, 9], left: '1', right: '2' });
  expect(saved.previous[0].passed).toHaveLength(7);
});

const fullPass = { left: '1', right: '2', contraLeft: '2', contraRight: '1', negateLeft: true, negateRight: true, writing: 'Mine.', contraWriting: 'Mine too.',
  conditionOne: 'x', conditionTwo: 'y', symbolOne: 'A', symbolTwo: 'B', stage: 7, passed: ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback'], revealed: true, review: 'matched' };

it('keeps every passed step when only explanatory copy changed under a legacy fingerprint', () => {
  const item = sourceWorksheetDrills.find(s => s.id === 'source-independent')!.items[0];
  // Old format: [statement, sufficient, necessary, indicators, contrapositiveWords]. Only the copy differs from today.
  const legacy = JSON.stringify([item.statement, 'older sufficient label', 'older necessary label', item.indicators, 'If you do not see it, it did not happen.']);
  localStorage.setItem('conditional-worksheet-v1:source-independent', JSON.stringify({ current: 0, answers: { [item.id]: { ...fullPass, groups: { '0': '1' }, fingerprint: legacy, words: [0], spans: [[1, 2], [3, 4]] } } }));
  run('source-independent');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('heading', { name: 'Bring it together' })).toBeVisible();
  const saved = JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-independent')!).answers[item.id];
  expect(saved.passed).toHaveLength(7);
  expect(saved.review).toBe('matched');
  expect(saved.spans).toEqual([[1, 2], [3, 4]]);
  expect(saved.fingerprint.startsWith('v2:')).toBe(true);
  expect(saved.previous).toBeUndefined();
});

it('archives and resets when the keyed indicators change, keeping the clicked words on the same rule', () => {
  const item = sourceWorksheetDrills.find(s => s.id === 'source-independent')!.items[0];
  const print = `v2:${JSON.stringify([item.statement, [{ text: 'whenever', group: 1 }]])}`;
  localStorage.setItem('conditional-worksheet-v1:source-independent', JSON.stringify({ current: 0, answers: { [item.id]: { ...fullPass, groups: { '0': '1' }, fingerprint: print, words: [0], spans: [[1, 2], [3, 4]] } } }));
  run('source-independent');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('heading', { name: 'Find the indicators' })).toBeVisible();
  const saved = JSON.parse(localStorage.getItem('conditional-worksheet-v1:source-independent')!).answers[item.id];
  expect(saved.passed).toEqual([]);
  expect(saved.words).toEqual([0]);
  expect(saved.writing).toBe('Mine.');
  expect(saved.previous).toHaveLength(1);
  expect(saved.previous[0]).toMatchObject({ fingerprint: print, review: 'matched' });
  expect(saved.previous[0].passed).toHaveLength(7);
});

it('defines each letter by the complete condition, modality included, and carries it into the contrapositive', () => {
  run('source-rephrase-contrapositive');
  fireEvent.change(screen.getByLabelText('Go to question'), { target: { value: 5 } });
  expect(screen.getByText('Any artist who uses oil paints must clean their brushes thoroughly.', { selector: 'blockquote' })).toBeVisible();
  click('Any');
  click('must');
  const [any, must] = screen.getAllByLabelText(/Which group/);
  fireEvent.change(any, { target: { value: '1' } });
  fireEvent.change(must, { target: { value: '2' } });
  click('Check this step');
  click('Continue');
  mark(1, 5);
  mark(7, 10);
  click('Check this step');
  click('Continue');
  // The highlight leaves out "must", but the letter stands for the duty, not the act of cleaning.
  expect(screen.getByText('the person is required to clean their brushes thoroughly', { selector: 'strong' })).toBeVisible();
  expect(screen.getByText('You highlighted: “clean their brushes thoroughly”')).toBeVisible();
  write('First condition’s symbol', 'A');
  write('Second condition’s symbol', 'C');
  click('Save and continue');
  expect(screen.getByText('= the person is required to clean their brushes thoroughly', { exact: false })).toBeVisible();
  fireEvent.click(within(screen.getByRole('group', { name: 'Left: sufficient condition' })).getByRole('button', { name: 'A' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Right: necessary condition' })).getByRole('button', { name: 'C' }));
  click('Check this step');
  click('Continue');
  expect(screen.getByText(/NOT denies the whole condition/)).toBeVisible();
  fireEvent.click(within(screen.getByRole('group', { name: 'Left side' })).getByRole('button', { name: 'C' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Right side' })).getByRole('button', { name: 'A' }));
  fireEvent.click(screen.getByLabelText('NOT on the left side'));
  fireEvent.click(screen.getByLabelText('NOT on the right side'));
  click('Check this step');
  click('Continue');
  write('Write this rule as an if/then sentence.', 'If someone is an oil painter, they are required to clean their brushes.');
  click('Save and continue');
  expect(screen.getByText('NOT C → NOT A')).toBeVisible();
  expect(screen.getByText('= NOT (the person is required to clean their brushes thoroughly)', { exact: false })).toBeVisible();
  expect(screen.getByText('= NOT (the person is an artist who uses oil paints)', { exact: false })).toBeVisible();
});

it('accepts an optional conditional word without requiring it, and never lists it as a keyed indicator', () => {
  run('source-rephrase');
  fireEvent.change(screen.getByLabelText('Go to question'), { target: { value: 10 } });
  write('Write this rule as an if/then sentence.', 'If an agreement is legally binding, then it is in writing.');
  click('Save and continue');
  click('Every');
  click('must');
  const [every, must] = screen.getAllByLabelText(/Which group/);
  fireEvent.change(every, { target: { value: '1' } });
  fireEvent.change(must, { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  expect(screen.getByText('must (Group 2).', { exact: false })).toBeVisible();
  expect(screen.queryByText(/Every \(Group 1\)/)).toBeNull();
});

it('waits for the student to start the walkthrough, then plays one step per click', () => {
  render(<SourceWorksheetDrill setId="source-intro-identify"/>);
  const demo = screen.getByRole('region', { name: 'How this drill works' });
  expect(within(demo).queryByText(/Click each word of the indicator/)).toBeNull();
  fireEvent.click(within(demo).getByRole('button', { name: 'Step 1. Click here to find the indicators.' }));
  expect(within(demo).getByText(/Click each word of the indicator/)).toBeVisible();
  fireEvent.click(within(demo).getByRole('button', { name: 'Step 2. Click here to highlight both conditions.' }));
  expect(within(demo).getByText('Both conditions marked')).toBeVisible();
  expect(within(demo).getByRole('button', { name: 'Start again from Step 1' })).toBeVisible();
});
