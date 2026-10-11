import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { NecessaryConditionExperience } from './NecessaryConditionExperience';

afterEach(cleanup);

it('distinguishes the guarantee, a counterexample to reversal, and the missing requirement', () => {
  render(<NecessaryConditionExperience/>);
  const reading = screen.getByRole('status');
  expect(reading).toHaveTextContent('Enrollment guarantees being a student.');
  expect(screen.getByText('Must be a student')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'History student' }));
  expect(reading).toHaveTextContent('is a history student who is not enrolled in law school');
  expect(reading).toHaveTextContent('Being a student does not guarantee law-school enrollment.');
  expect(screen.getByText('Not enrolled')).toBeVisible();
  const absent = screen.getByRole('button', { name: 'Not a student' });
  absent.focus();
  fireEvent.click(absent);
  expect(absent).toHaveFocus();
  expect(absent).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('status')).toBe(reading);
  expect(reading).toHaveAttribute('aria-atomic', 'true');
  expect(reading).toHaveTextContent('Without being a student, this person cannot be enrolled');
  expect(screen.getByText('Ruled out')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Law student' }));
  expect(reading).toHaveTextContent('Enrollment guarantees being a student.');
  expect(screen.getByText('Enrolled')).toBeVisible();
  expect(screen.queryByText('Ruled out')).toBeNull();
});
