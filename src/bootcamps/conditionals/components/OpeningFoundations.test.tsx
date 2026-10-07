import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';

afterEach(cleanup);

it('separates the seven foundation questions and retains attempted feedback when returning', () => {
  const { container } = render(<OpeningCourseContent id="foundation-practice"/>);
  expect(container.querySelectorAll('[data-practice-task]')).toHaveLength(7);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'In the town hall.' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  const question = screen.getByRole('region');
  expect(within(question).getByRole('heading', { level: 3 })).toHaveTextContent("It's Friday.");
  fireEvent.click(within(question).getByRole('button', { name: 'In the town hall.' }));
  expect(within(question).getByText(/You treated the rule as a weather report/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  expect(screen.getByRole('region').textContent).toContain("Saturday arrives, and it's raining.");
  expect(screen.queryByText(/You treated the rule as a weather report/)).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Previous task' }));
  expect(within(screen.getByRole('region')).getByRole('button', { name: 'In the town hall.' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('region')).getByText(/You treated the rule as a weather report/)).toBeVisible();
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
