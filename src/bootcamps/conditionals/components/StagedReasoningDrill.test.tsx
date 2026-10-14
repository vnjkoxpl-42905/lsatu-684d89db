import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StagedReasoningDrill, sufficientStagedItems, contrapositiveStagedItems } from './StagedReasoningDrill';
import { diagramExamples, flashcardExamples, translationExamples } from './ConditionalOpeningLesson';
import { referencePracticeItems } from './ConditionalReferenceSequence';
import { CourseProgressProvider, type CourseProgressStore } from '../courseProgress';
afterEach(cleanup);
/** Display position of a stage's correct option. */
const slot = (stage: { options?: string[]; correct?: number; order?: number[] }) => (stage.order ?? stage.options!.map((_, i) => i)).indexOf(stage.correct!);
const optionButtons = () => within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button');
const signatureOf = (item: { sentence: string; stages: { options?: string[]; correct?: number }[] }, sentence = item.sentence) => `${sentence}|${item.stages.map(stage => stage.options ? `${stage.options.length}:${stage.correct}` : 'w').join(',')}`;
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
  expect(screen.getByText(/“Raining” is part of the condition itself/)).toBeVisible();
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
  for (const stage of contrapositiveStagedItems[1].stages.slice(0, 2)) {
    fireEvent.click(optionButtons()[slot(stage)]);
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

it('skips the English step when the rule is already an if/then sentence', () => {
  mount('contrapositive');
  for (const stage of contrapositiveStagedItems[0].stages.slice(0, 2)) {
    fireEvent.click(optionButtons()[slot(stage)]);
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

it('offers only words from the sentence as indicator choices and keeps each step to its own explanation', () => {
  for (const item of sufficientStagedItems.slice(0, 10)) {
    const [indicator, condition, diagram] = item.stages;
    for (const option of indicator.options!) expect(item.sentence.toLowerCase()).toContain(option.toLowerCase());
    expect(indicator.explanation).toMatch(/is the indicator\. Next, find the complete condition it points to\.$/);
    expect(condition.explanation).not.toBe(diagram.explanation);
    expect(diagram.explanation).not.toContain(condition.explanation);
    expect(diagram.explanation).toMatch(/goes on the left/);
  }
  const copy = JSON.stringify(sufficientStagedItems) + JSON.stringify(contrapositiveStagedItems.map(item => item.stages.map(stage => [stage.name, stage.prompt, stage.explanation, stage.hints])));
  expect(copy).not.toMatch(/[—–]|revers|promise|depends on|trigger/i);
});

it('moves the contrapositive answers between slots and grades the choice, not the slot', () => {
  const slots = contrapositiveStagedItems.flatMap(item => item.stages.slice(0, 2).map(slot));
  expect(new Set(slots)).toEqual(new Set([0, 1, 2]));
  contrapositiveStagedItems.forEach(item => expect(slot(item.stages[0])).not.toBe(slot(item.stages[1])));
  mount('contrapositive');
  const first = contrapositiveStagedItems[0].stages[0];
  fireEvent.click(optionButtons()[slot(first)]);
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByRole('heading', { name: 'Right rule.' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  const flip = contrapositiveStagedItems[0].stages[1];
  expect(slot(flip)).toBe(2);
  fireEvent.click(optionButtons()[slot(flip)]);
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByRole('heading', { name: 'Right contrapositive.' })).toBeVisible();
  expect(screen.getByText(/logically equivalent to the rule/)).toBeVisible();
  const stored = JSON.parse(localStorage.getItem('conditional-staged-v1:contrapositive')!);
  expect(stored.answers['0:1'].choice).toBe(flip.correct);
});

it('explains the contrapositive itself when the student writes it', () => {
  referencePracticeItems.forEach((item, i) => {
    const stages = contrapositiveStagedItems[i].stages;
    expect(stages[stages.length - 1].explanation).toBe(item.contraWhy);
    expect(stages[1].explanation).toMatch(/^The contrapositive is logically equivalent to the rule\./);
  });
});

it('keeps answers saved under the earlier whole-content fingerprint when the questions are unchanged', () => {
  const answers = { '0:0': { choice: 0, writing: '', checked: true, accepted: true }, '1:0': { choice: 1, writing: '', checked: true, accepted: true } };
  localStorage.setItem('conditional-staged-v1:sufficient', JSON.stringify({ index: 1, step: 1, answers, fingerprint: 'v2:22920:a6gqce' }));
  mount('sufficient');
  expect(screen.getByRole('heading', { name: /What complete condition does “when” identify/ })).toBeVisible();
  const stored = JSON.parse(localStorage.getItem('conditional-staged-v1:sufficient')!);
  expect(stored.answers).toEqual(answers);
  expect(stored.archived).toBeUndefined();
});

it('drops only the answers for a question whose sentence changed, and keeps them in the record', () => {
  const answers = { '0:0': { choice: 0, writing: '', checked: true, accepted: true }, '1:0': { choice: 1, writing: '', checked: true, accepted: true } };
  const saved = sufficientStagedItems.map((item, i) => signatureOf(item, i === 1 ? 'An older sentence.' : item.sentence));
  localStorage.setItem('conditional-staged-v1:sufficient', JSON.stringify({ index: 0, step: 1, answers, signatures: saved }));
  mount('sufficient');
  const stored = JSON.parse(localStorage.getItem('conditional-staged-v1:sufficient')!);
  expect(stored.answers).toEqual({ '0:0': answers['0:0'] });
  expect(stored.archived[0].answers).toEqual(answers);
});

it('takes the account copy when it finishes loading after the drill opens, before the student acts', () => {
  const save: CourseProgressStore['save'] = () => undefined; // the account ignores writes while it loads
  const view = render(<MemoryRouter><CourseProgressProvider store={{ steps: {}, save }}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Which indicator introduces the sufficient condition?' })).toBeVisible();
  const answers = { '0:0': { choice: 0, writing: '', checked: true, accepted: true } };
  const steps: CourseProgressStore['steps'] = { 'sufficient-practice': { status: 'started', updatedAt: 'now', state: { index: 0, step: 1, answers, signatures: sufficientStagedItems.map(item => signatureOf(item)) } } };
  view.rerender(<MemoryRouter><CourseProgressProvider store={{ steps, save }}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /What complete condition does “if” identify/ })).toBeVisible();
});

it('keeps the student\'s own work when the account copy arrives after they have started', () => {
  const save: CourseProgressStore['save'] = () => undefined;
  const view = render(<MemoryRouter><CourseProgressProvider store={{ steps: {}, save }}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider></MemoryRouter>);
  fireEvent.click(optionButtons()[1]);
  const steps: CourseProgressStore['steps'] = { 'sufficient-practice': { status: 'started', updatedAt: 'now', state: { index: 2, step: 0, answers: {}, signatures: sufficientStagedItems.map(item => signatureOf(item)) } } };
  view.rerender(<MemoryRouter><CourseProgressProvider store={{ steps, save }}><StagedReasoningDrill mode="sufficient"/></CourseProgressProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Which indicator introduces the sufficient condition?' })).toBeVisible();
  expect(optionButtons()[1]).toHaveAttribute('aria-pressed', 'true');
});
