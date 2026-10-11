import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

it('keeps intro identification faithful: indicators first, then learner-written complete ideas', () => {
  run('source-intro-identify');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByRole('textbox')).toBeNull();
  click('if');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'That step works.' })).toHaveFocus();
  click('Continue');
  expect(screen.queryByRole('button', { name: 'if' })).toBeNull();
  expect(screen.queryByText('the product is registered within 30 days', { exact: true })).toBeNull();
  write('First complete condition', 'registered within 30 days');
  write('Second complete condition', 'warranty valid');
  compare();
  expect(screen.getByText('the product is registered within 30 days', { exact: true })).toBeVisible();
  confirm();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  click('My reasoning matched');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  click('Next');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
});

it('requires the whole indicator phrase and correct group before advancing', () => {
  run('source-indicators');
  click('Only');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('if');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  click('Continue');
  expect(screen.getByRole('button', { name: 'My reasoning matched' })).toBeVisible();
});

it('keeps every source task reachable and future operations gated', () => {
  for (const set of sourceWorksheetDrills) {
    const view = run(set.id);
    const navigator = screen.getByLabelText('Go to sentence');
    expect(navigator.querySelectorAll('option')).toHaveLength(set.items.length);
    fireEvent.change(navigator, { target: { value: set.items.length - 1 } });
    expect(screen.getByText(`Sentence ${set.items.length} of ${set.items.length}`)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bring it together' })).toBeDisabled();
    if (set.taskKind !== 'contrapositive') expect(screen.queryByRole('button', { name: 'Reverse and negate' })).toBeNull();
    view.unmount();
  }
});

it('requires a blank production attempt across all six operations before revealing the final model', () => {
  run('source-full-translation');
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  expect(screen.queryByText('that intern is offered a full-time position', { exact: true })).toBeNull();
  click('All');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '2' } });
  click('Check this step');
  expect(screen.getByRole('heading', { name: 'Make one adjustment.' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  click('Revise this step');
  fireEvent.change(screen.getByLabelText(/Which group/), { target: { value: '1' } });
  click('Check this step');
  click('Continue');
  write('First complete condition', 'intern completes program');
  write('Second complete condition', 'offered full-time position');
  click('Save and continue');
  write('First condition’s symbol', 'I');
  write('Second condition’s symbol', 'I');
  expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  write('Second condition’s symbol', 'O');
  click('Save and continue');
  expect(screen.queryByRole('button', { name: 'Check this step' })).toBeNull();
  write('Your original diagram', 'I → O');
  click('Save and continue');
  write('Your contrapositive diagram', 'NOT O → NOT I');
  click('Save and continue');
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

