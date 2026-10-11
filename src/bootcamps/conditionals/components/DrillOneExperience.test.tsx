import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';

afterEach(cleanup);

const correctAnswers = [0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 1, 0, 2, 1, 2, 1, 2, 0, 0, 2, 0, 1];
const answerOptions = () => within(screen.getByRole('group')).getAllByRole('button');
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

it('requires a deliberate check before feedback, diagrams, progress or forward navigation', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  fireEvent.click(answerOptions()[0]);
  expect(screen.queryByText('Correct.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  check();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveAccessibleDescription(/Necessary means required/);
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
});

it('retains the first answer through repair and restores focus to an enabled choice', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  fireEvent.click(answerOptions()[1]);
  check();
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  expect(screen.getByText(/That describes sufficiency/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(answerOptions()[0]).toHaveFocus();
  expect(answerOptions()[0]).toBeEnabled();
  expect(screen.queryByText('Not quite.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(answerOptions()[0]);
  check();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: /What is a sufficient condition/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(answerOptions()[0]).toHaveAttribute('aria-pressed', 'true');
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
  expect(screen.getByRole('heading', { name: /What is a necessary condition/ })).toHaveFocus();
  expect(answerOptions()[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Back to results' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.getByRole('heading', { name: 'Spot the condition complete.' })).toHaveFocus();
  expect(screen.getByText(/of 24 correct on your first attempt/)).toHaveTextContent('23 of 24');
});

it('checks every option across all 24 questions and keeps the final source rule', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  for (let index = 0; index < correctAnswers.length; index++) {
    expect(screen.getByText(`Question ${index + 1} of 24`)).toBeVisible();
    const choices = answerOptions();
    const explanations = new Set<string>();
    choices.forEach(choice => {
      fireEvent.click(choice);
      check();
      explanations.add(document.querySelector('.d1-feedback p')?.textContent || '');
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(explanations.size).toBe(choices.length);
    fireEvent.click(choices[correctAnswers[index]]);
    check();
    if (index === 22) expect(screen.getByRole('heading', { name: 'What is sufficient here?' })).toBeVisible();
    if (index === 23) expect(screen.getByText('If you win the raffle, you get a bicycle.')).toBeVisible();
    if (index < 23) fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
});
