import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SourceWorksheetDrill } from './SourceWorksheetDrill';
import { sourceWorksheetDrills } from '../content/sourceWorksheetDrills';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const run = (setId: string) => render(<SourceWorksheetDrill setId={setId} run/>);
const choose = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const compare = () => fireEvent.click(screen.getByRole('button', { name: 'Compare with explanation' }));

it('requires an attempt and deliberate comparison before counting an item reviewed', () => {
  run('source-intro-identify');
  expect(screen.getByRole('button', { name: 'Compare with explanation' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'if' }));
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  choose('Left: sufficient condition', 'sufficient');
  choose('Right: necessary condition', 'necessary');
  compare();
  expect(screen.getByRole('heading', { name: 'Compare your reasoning.' })).toHaveFocus();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'My reasoning matched' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('button', { name: 'Compare with explanation' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(screen.getByRole('button', { name: 'My reasoning matched' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Review my work' }));
  expect(screen.getByRole('heading', { name: 'Your practice so far.' })).toBeVisible();
});

it('keeps every source task reachable and hides contraposition in early sets', () => {
  for (const set of sourceWorksheetDrills) {
    const view = run(set.id);
    const navigator = screen.getByLabelText('Go to statement');
    expect(navigator.querySelectorAll('option')).toHaveLength(set.items.length);
    fireEvent.change(navigator, { target: { value: set.items.length - 1 } });
    expect(screen.getByText(`Statement ${set.items.length} of ${set.items.length}`)).toBeVisible();
    if (set.taskKind !== 'contrapositive') expect(screen.queryByText('Contrapositive', { exact: true })).toBeNull();
    view.unmount();
  }
});

it('checks reverse and negate separately and never calls self assessment a grade', () => {
  run('source-full-translation');
  choose('Left: sufficient condition', 'sufficient');
  choose('Right: necessary condition', 'necessary');
  choose('Contrapositive left', 'necessary');
  choose('Contrapositive right', 'sufficient');
  expect(screen.getByRole('button', { name: 'Compare with explanation' })).toBeDisabled();
  screen.getAllByRole('textbox').forEach(box => fireEvent.change(box, { target: { value: 'My reading of this diagram.' } }));
  compare();
  expect(screen.getByRole('heading', { name: 'Revise your diagram.' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'My reasoning matched' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Revise my attempt' }));
  screen.getAllByLabelText('Negate this condition').forEach(box => fireEvent.click(box));
  compare();
  expect(screen.getByRole('heading', { name: 'Compare your reasoning.' })).toBeVisible();
  expect(screen.queryByText('Correct.')).toBeNull();
});

it('restores written attempts and review marks after remount', () => {
  const view = run('source-rephrase');
  fireEvent.click(document.querySelector('.sw-tokens button')!);
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  choose('Left: sufficient condition', 'sufficient');
  choose('Right: necessary condition', 'necessary');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'If the condition holds, then the requirement holds.' } });
  compare();
  fireEvent.click(screen.getByRole('button', { name: 'Needs another look' }));
  view.unmount();
  run('source-rephrase');
  expect(screen.getByRole('textbox')).toHaveValue('If the condition holds, then the requirement holds.');
  expect(screen.getByRole('button', { name: 'Needs another look' })).toHaveAttribute('aria-pressed', 'true');
});

it('recovers safely from malformed saved state and links the landing to its run route', () => {
  localStorage.setItem('conditional-worksheet-v1:source-rephrase', '{broken');
  render(<MemoryRouter><SourceWorksheetDrill setId="source-rephrase" title="Drill 6" startUrl="?page=source-rephrase&run=1"/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Drill 6' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/?page=source-rephrase&run=1');
});

it('requires separate group classifications for multiple selected expressions', () => {
  run('source-indicators');
  const tokens = document.querySelectorAll('.sw-tokens button');
  fireEvent.click(tokens[0]);
  fireEvent.click(tokens[2]);
  const groups = screen.getAllByLabelText(/Which group/);
  expect(groups).toHaveLength(2);
  fireEvent.change(groups[0], { target: { value: '1' } });
  expect(screen.getByRole('button', { name: 'Compare with explanation' })).toBeDisabled();
  fireEvent.change(groups[1], { target: { value: '2' } });
  expect(screen.getByRole('button', { name: 'Compare with explanation' })).toBeEnabled();
});

it('invalidates review when source meaning changes while retaining the written attempt', () => {
  const item = sourceWorksheetDrills.find(set => set.id === 'source-rephrase')!.items[0];
  localStorage.setItem('conditional-worksheet-v1:source-rephrase', JSON.stringify({ current: 0, answers: { [item.id]: { words: [0], groups: { '0': '1' }, fingerprint: 'old content', left: 'sufficient', right: 'necessary', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false, writing: 'My earlier wording.', contraWriting: '', revealed: true, review: 'matched' } } }));
  run('source-rephrase');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('textbox')).toHaveValue('My earlier wording.');
  expect(screen.queryByRole('button', { name: 'My reasoning matched' })).toBeNull();
});




