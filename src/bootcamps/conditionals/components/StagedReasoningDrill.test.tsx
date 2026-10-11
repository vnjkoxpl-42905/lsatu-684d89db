import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StagedReasoningDrill, sufficientStagedItems, contrapositiveStagedItems } from './StagedReasoningDrill';
import { diagramExamples, flashcardExamples, translationExamples } from './ConditionalOpeningLesson';
import { referencePracticeItems } from './ConditionalReferenceSequence';
afterEach(cleanup);
beforeEach(() => localStorage.clear());
const mount = (mode: 'sufficient' | 'contrapositive') => render(<MemoryRouter><StagedReasoningDrill mode={mode}/></MemoryRouter>);

it('uses one fresh sentence per Group 1 indicator, none copied from a lesson, plus three practice items', () => {
  const lessons = [...translationExamples['group-1'], ...diagramExamples['group-1'], ...flashcardExamples['group-1']].map(item => item.sentence);
  expect(sufficientStagedItems).toHaveLength(13);
  sufficientStagedItems.forEach(item => expect(lessons).not.toContain(item.sentence));
  expect(sufficientStagedItems.map(item => item.sentence)).not.toContain('A report is reviewed if it is submitted before noon.');
  expect(sufficientStagedItems.map(item => item.sentence)).not.toContain('The only notebooks kept on this shelf are hardback.');
  const indicatorItems = sufficientStagedItems.slice(0, 10);
  expect(indicatorItems.map(item => item.stages[0].options![item.stages[0].correct!])).toEqual(['if', 'when', 'whenever', 'where', 'all', 'every', 'each', 'any', 'the only', 'people who']);
  // Distractors vary from item to item instead of always offering only if and requires.
  const distractors = indicatorItems.map(item => item.stages[0].options!.filter((_, i) => i !== item.stages[0].correct).join('|'));
  expect(new Set(distractors).size).toBe(indicatorItems.length);
  expect(new Set(indicatorItems.map(item => item.stages[0].correct)).size).toBe(3);
  for (const item of indicatorItems) {
    const [indicator, , , write] = item.stages;
    indicator.options!.forEach((_, i) => { if (i !== indicator.correct) expect(indicator.hints![i]).toBeTruthy(); });
    expect(write).toMatchObject({ name: 'Write it in English', prompt: 'Write your diagram as an if/then sentence.', label: 'Your if/then sentence' });
    expect(write.model).toMatch(/^If .*, then /);
  }
  expect(contrapositiveStagedItems).toHaveLength(9);
  referencePracticeItems.forEach((item, i) => {
    const stages = contrapositiveStagedItems[i].stages;
    expect(stages[stages.length - 1].model).toBe(item.contraReadback);
    // A sentence already written as if/then is not copied back word for word.
    expect(stages.some(stage => stage.name === 'Write it in English')).toBe(item.readback !== item.sentence);
  });
  expect(contrapositiveStagedItems[0].stages).toHaveLength(3);
  expect(contrapositiveStagedItems[1].stages).toHaveLength(4);
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
  localStorage.setItem('conditional-staged-v1:contrapositive', JSON.stringify({ index: 1, step: 0, answers: {}, fingerprint: JSON.stringify(contrapositiveStagedItems) }));
  mount('contrapositive');
  for (const correct of [1, 0]) {
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[correct]);
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  }
  expect(screen.getByRole('heading', { name: 'Write your diagram as an if/then sentence.' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Your if/then sentence' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Compare my sentence' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My reading.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare my sentence' }));
  expect(screen.getByText('Our version:')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'I compared the direction and complete conditions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByRole('heading', { name: 'Now write the contrapositive in ordinary English.' })).toBeVisible();
});

it('skips the English step when the sentence is already an if/then sentence', () => {
  mount('contrapositive');
  for (const correct of [0, 1]) {
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[correct]);
    fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  }
  expect(screen.getByRole('heading', { name: 'Now write the contrapositive in ordinary English.' })).toBeVisible();
});

it('keeps answers saved against an older item set in the record instead of reading them against new sentences', () => {
  const answers = { '0:0': { choice: 2, writing: '', checked: true, accepted: true }, '0:3': { choice: null, writing: 'Old readback.', checked: true, accepted: true } };
  localStorage.setItem('conditional-staged-v1:sufficient', JSON.stringify({ index: 0, step: 3, answers, fingerprint: 'v2:old' }));
  mount('sufficient');
  expect(screen.getByRole('heading', { name: 'Which indicator introduces the sufficient condition?' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Check this step' })).toBeDisabled();
  const stored = JSON.parse(localStorage.getItem('conditional-staged-v1:sufficient')!);
  expect(stored.answers).toEqual({});
  expect(stored.archived).toEqual([{ fingerprint: 'v2:old', index: 0, step: 3, answers }]);
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
