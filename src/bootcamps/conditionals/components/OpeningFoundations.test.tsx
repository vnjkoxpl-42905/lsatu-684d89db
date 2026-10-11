import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';

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
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells me what follows if I win.' }));
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

it('retains the sufficient-side practice destinations and the original ticket counterexample', () => {
  const { container } = render(<OpeningCourseContent id="sufficient-practice"/>);
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(5);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Outside Drawer R' })).toBeNull();
  for (let question = 0; question < 4; question++) fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  const region = screen.getByRole('region', { name: 'Build a case that proves the limit' });
  expect(within(region).getByText('Every ticket in Drawer R has a blue border.')).toBeVisible();
  fireEvent.click(within(region).getByRole('button', { name: 'Outside Drawer R' }));
  fireEvent.click(within(region).getByRole('button', { name: /^Blue border$/ }));
  fireEvent.click(within(region).getByRole('button', { name: 'Test this ticket' }));
  expect(within(region).getByText('This fits the rule and disproves the reverse.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Previous task' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  expect(within(screen.getByRole('region')).getByText('This fits the rule and disproves the reverse.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next task' })).toBeDisabled();
});
