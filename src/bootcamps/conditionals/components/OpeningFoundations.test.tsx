import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';
import { sufficientStagedItems } from './StagedReasoningDrill';

afterEach(cleanup);

it('shows one foundation question at a time and retains checked feedback when returning', () => {
  const { container } = render(<OpeningCourseContent id="foundation-practice"/>);
  // The original seven applied questions follow the seventeen foundation checks.
  for (const answer of [0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 1, 0, 2, 1, 2]) {
    fireEvent.click(within(screen.getByRole('group')).getAllByRole('button')[answer]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }

  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(1);
  expect(screen.getByText('Question 18 of 24')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'In the town hall.' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells you what follows if you win.' }));
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { level: 2, name: /It's Friday/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'In the town hall.' }));
  expect(screen.queryByText(/You treated the rule as a weather report/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(screen.getByText(/You treated the rule as a weather report/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { level: 2, name: /Saturday arrives/ })).toHaveFocus();
  expect(screen.queryByText(/You treated the rule as a weather report/)).toBeNull();
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByRole('button', { name: 'In the town hall.' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/You treated the rule as a weather report/)).toBeVisible();
});

it('runs sufficient-side practice as the staged drill and keeps the original ticket counterexample', () => {
  const { container } = render(<OpeningCourseContent id="sufficient-practice"/>);
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  const ticket = sufficientStagedItems.find(item => item.sentence === 'Every ticket in Drawer R has a blue border.');
  expect(ticket).toBeDefined();
  expect(ticket!.stages[0].prompt).toMatch(/Which ticket fits our rule but disproves that claim\?/);
});
