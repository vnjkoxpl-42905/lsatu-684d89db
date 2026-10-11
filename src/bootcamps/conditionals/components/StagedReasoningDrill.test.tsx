import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StagedReasoningDrill, sufficientStagedItems, contrapositiveStagedItems } from './StagedReasoningDrill';
import { diagramExamples, flashcardExamples, translationExamples } from './ConditionalOpeningLesson';
import { referencePracticeItems } from './ConditionalReferenceSequence';
afterEach(cleanup);
beforeEach(() => localStorage.clear());
const mount = (mode: 'sufficient' | 'contrapositive') => render(<MemoryRouter><StagedReasoningDrill mode={mode}/></MemoryRouter>);

it('keeps all existing sufficient examples and nine contrapositive cases', () => {
  const source = [...translationExamples['group-1'], ...diagramExamples['group-1'], ...flashcardExamples['group-1']];
  expect(sufficientStagedItems).toHaveLength(source.length + 3);
  source.forEach(item => expect(sufficientStagedItems.some(q => q.sentence === item.sentence)).toBe(true));
  expect(contrapositiveStagedItems).toHaveLength(9);
  referencePracticeItems.forEach((item, i) => expect(contrapositiveStagedItems[i].stages[3].model).toBe(item.contraReadback));
});

it('shows one stage at a time and requires a correct checked choice', () => {
  mount('sufficient');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  expect(screen.queryByRole('textbox')).toBeNull();
  const options = within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
  fireEvent.click(options[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByRole('heading', { name: 'Not quite. Try again.' })).toHaveFocus();
  expect(screen.getByText(/“only if” introduces what is required, not what is enough/)).toBeVisible();
  expect(screen.queryByText(/with the complete condition it refers to/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(options[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('heading', { name: /What complete condition/ })).toHaveFocus();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

it('requires an attempted written readback and explicit self-comparison', () => {
  mount('contrapositive');
  for (const correct of [0, 1]) {
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[correct]);
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  }
  expect(screen.getByRole('button', { name: 'Compare my explanation' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reading.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare my explanation' }));
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'I compared the direction and complete conditions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('heading', { name: 'Now write the contrapositive in ordinary English.' })).toBeVisible();
});

it('restores drafts and invalidates later checks when an earlier step is revised', () => {
  const answers = { '0:0': { choice: 0, writing: '', checked: true, accepted: true }, '0:1': { choice: 1, writing: '', checked: true, accepted: true }, '0:2': { choice: null, writing: 'My saved reasoning.', checked: true, accepted: true } };
  localStorage.setItem('conditional-staged-v1:contrapositive', JSON.stringify({ index: 0, step: 0, answers, fingerprint: JSON.stringify(contrapositiveStagedItems) }));
  mount('contrapositive');
  expect(screen.getByRole('heading', { name: 'Right rule.' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Revise my answer' }));
  const stored = JSON.parse(localStorage.getItem('conditional-staged-v1:contrapositive')!);
  expect(stored.answers['0:1'].accepted).toBe(false);
  expect(stored.answers['0:2'].checked).toBe(false);
  expect(stored.answers['0:2'].writing).toBe('My saved reasoning.');
});
