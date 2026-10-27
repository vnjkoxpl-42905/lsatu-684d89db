import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';
import { sufficientStagedItems } from './StagedReasoningDrill';

afterEach(cleanup);

it('shows one foundation question at a time and retains checked feedback when returning', () => {
  const { container } = render(<OpeningCourseContent id="foundation-practice"/>);
  // The seven rule-vs-fact questions come first.
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(1);
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'In the town hall.' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells you what follows if you win.' }));
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { level: 2, name: /It's Friday/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'In the town hall.' }));
  expect(screen.queryByText(/A rule about rain is not a weather forecast/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(screen.getByText(/A rule about rain is not a weather forecast/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(screen.getByRole('button', { name: "The rule alone doesn't settle it." }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { level: 2, name: /Saturday arrives/ })).toHaveFocus();
  expect(screen.queryByText(/We have no weather fact for Saturday/)).toBeNull();
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByRole('button', { name: /^The rule alone doesn't settle it\. Correct answer$/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/We have no weather fact for Saturday/)).toBeVisible();
});

it('runs sufficient-side practice as the staged drill and keeps a fresh counterexample item', () => {
  const { container } = render(<OpeningCourseContent id="sufficient-practice"/>);
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  const keys = sufficientStagedItems.find(item => item.sentence === 'Every key on the red ring opens a classroom.');
  expect(keys).toBeDefined();
  expect(keys!.stages[0].prompt).toMatch(/Which key fits our rule but disproves that claim\?/);
});
