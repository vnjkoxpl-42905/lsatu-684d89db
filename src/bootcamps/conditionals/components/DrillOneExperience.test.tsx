import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpeningCourseContent } from './OpeningCourseContent';
import { DrillOneEntry } from './DrillOneExperience';
import { CourseProgressProvider, type CourseProgressStore } from '../courseProgress';

afterEach(cleanup);

// Rule-vs-fact questions first, then the concept checks, then indicators.
const correctAnswers = [1, 2, 0, 0, 2, 0, 1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 1, 0, 2, 1, 2];
const answerOptions = () => within(screen.getByRole('group')).getAllByRole('button');
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

it('checks deliberately, preserves the rule panel, and shows question progress above the task', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  const rulePanel = document.querySelector('.d1-rule-panel')!.innerHTML;
  expect(screen.getByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toBeVisible();
  expect(screen.queryByText('Select one answer.')).toBeNull();
  expect(screen.getByText('Question 1 of 24').closest('header')).toHaveClass('cd-progress');
  expect(document.querySelectorAll('.cd-progress-track>span')).toHaveLength(24);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  fireEvent.click(answerOptions()[1]);
  expect(screen.queryByText('Correct.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  check();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveAccessibleDescription(/The rule tells you what follows from winning/);
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(document.querySelector('.d1-rule-panel')!.innerHTML).toBe(rulePanel);
  expect(document.querySelectorAll('.cd-progress-track>span[data-complete=true]')).toHaveLength(1);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
});

it('gives a hint for a wrong answer without marking or naming the correct option', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  fireEvent.click(answerOptions()[0]);
  check();
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  expect(screen.getByText(/Does it also report that the win actually happened/)).toBeVisible();
  expect(screen.queryByText(/The correct answer is marked above/)).toBeNull();
  expect(screen.queryByText('Correct answer')).toBeNull();
  expect(answerOptions().filter(option => option.getAttribute('data-correct') === 'true')).toHaveLength(0);
  expect(answerOptions()[0]).toHaveAttribute('data-incorrect', 'true');
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
});

it('retains the first answer through repair and restores focus to an enabled choice', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  fireEvent.click(answerOptions()[0]);
  check();
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(answerOptions()[0]).toHaveFocus();
  expect(answerOptions()[0]).toBeEnabled();
  expect(screen.queryByText('Not quite.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(answerOptions()[1]);
  check();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: /It's Friday/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  for (let index = 1; index < correctAnswers.length; index++) {
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(answerOptions()[correctAnswers[index]]);
    check();
  }
  expect(screen.queryByRole('button', { name: 'Back to results' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(screen.getByRole('heading', { name: 'Spot the condition complete.' })).toHaveFocus();
  expect(screen.getByText(/of 24 correct on your first attempt/)).toHaveTextContent('23 of 24');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24');
  fireEvent.click(screen.getByRole('button', { name: 'Question 1 Review reasoning' }));
  expect(screen.getByRole('heading', { name: /actually win the raffle/ })).toHaveFocus();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Back to results' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.getByRole('heading', { name: 'Spot the condition complete.' })).toHaveFocus();
  expect(screen.getByText(/of 24 correct on your first attempt/)).toHaveTextContent('23 of 24');
});

it('checks every option across all 24 questions in the rule, concept, indicator order', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  for (let index = 0; index < correctAnswers.length; index++) {
    expect(screen.getByText(`Question ${index + 1} of 24`)).toBeVisible();
    const choices = answerOptions();
    const explanations = new Set<string>();
    choices.forEach((choice, option) => {
      if (option === correctAnswers[index]) return;
      fireEvent.click(choice);
      check();
      expect(screen.getByRole('heading', { name: 'Not quite.' })).toBeVisible();
      explanations.add(document.querySelector('.d1-feedback p')?.textContent || '');
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    fireEvent.click(choices[correctAnswers[index]]);
    check();
    expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
    explanations.add(document.querySelector('.d1-feedback p')?.textContent || '');
    expect(explanations.size).toBe(choices.length);
    if (index === 5) expect(screen.getByRole('heading', { name: 'What is sufficient here?' })).toBeVisible();
    if (index === 6) expect(screen.getByText('If you win the raffle, you get a bicycle.')).toBeVisible();
    if (index === 7) expect(screen.getByRole('heading', { name: 'What is a necessary condition?' })).toBeVisible();
    if (index < 23) fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
  expect(screen.getByText('Every completed registration requires a paid deposit.')).toBeVisible();
});

it('keeps every saved answer with its question when the question order changed', () => {
  // Order 1 (no version): 17 concept and indicator questions, then the 7 rule-vs-fact questions.
  const legacy = Array.from({ length: 24 }, () => ({ selected: null as number | null, checked: false, first: null as number | null }));
  legacy[0] = { selected: 1, checked: true, first: 1 }; // "What is a necessary condition?": a wrong answer
  legacy[17] = { selected: 1, checked: true, first: 1 }; // the raffle question: the right answer
  let steps: CourseProgressStore['steps'] = { 'foundation-practice': { status: 'started', updatedAt: '2026-10-10T00:00:00.000Z', state: { current: 17, answers: legacy, finished: false, seenResults: false } } };
  const store: CourseProgressStore = { steps, save: (id, patch) => { steps = { ...steps, [id]: { ...steps[id], ...patch, status: steps[id]?.status === 'done' ? 'done' : patch.status ?? steps[id]?.status ?? 'started', updatedAt: 'now' } }; } };
  render(<CourseProgressProvider store={store}><OpeningCourseContent id="foundation-practice"/></CourseProgressProvider>);
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  const saved = steps['foundation-practice'].state as { order: number; current: number; answers: typeof legacy };
  expect(saved.order).toBe(2);
  expect(saved.current).toBe(0);
  expect(saved.answers[0]).toEqual(legacy[17]);
  expect(saved.answers[7]).toEqual(legacy[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  for (let index = 1; index < 7; index++) {
    fireEvent.click(answerOptions()[correctAnswers[index]]);
    check();
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
  expect(screen.getByRole('heading', { name: 'What is a necessary condition?' })).toBeVisible();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toBeVisible();
});

it('titles the entry page Spot the condition', () => {
  render(<MemoryRouter><DrillOneEntry startUrl="/start" lessonsUrl="/lessons"/></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'Spot the condition' })).toBeVisible();
  expect(screen.queryByText(/Drill/)).toBeNull();
  expect(document.body.textContent).not.toMatch(/trigger|required outcome/i);
});
