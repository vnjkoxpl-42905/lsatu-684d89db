import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { NecessaryConditionExperience } from './NecessaryConditionExperience';

afterEach(cleanup);

it('rules out enrollment only when the required student condition is missing', () => {
  render(<NecessaryConditionExperience/>);
  const reading = screen.getByRole('status');
  expect(reading).toHaveTextContent("Being a student doesn't tell us whether you are enrolled");
  expect(screen.getByText('Possible')).toBeVisible();
  const absent = screen.getByRole('button', { name: 'Not a student' });
  absent.focus();
  fireEvent.click(absent);
  expect(absent).toHaveFocus();
  expect(absent).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status')).toBe(reading);
  expect(reading).toHaveAttribute('aria-atomic', 'true');
  expect(reading).toHaveTextContent("Without being a student, you can't be enrolled");
  expect(screen.getByText('Ruled out')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'A student' }));
  expect(reading).toHaveTextContent("Meeting this requirement alone doesn't establish enrollment");
  expect(screen.getByText('Possible')).toBeVisible();
  expect(screen.queryByText('Ruled out')).toBeNull();
});
