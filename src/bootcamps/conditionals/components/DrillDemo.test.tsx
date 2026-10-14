import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DrillDemo } from './DrillDemo';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('lets the learner advance the walkthrough and never advances on its own', () => {
  vi.useFakeTimers();
  render(<DrillDemo drillId="source-rephrase"/>);
  // Nothing plays until the learner starts it.
  expect(screen.getByRole('button', {name: /Rewrite the rule/})).not.toHaveAttribute('aria-current');
  vi.advanceTimersByTime(20000);
  expect(screen.getByRole('button', {name: /Rewrite the rule/})).not.toHaveAttribute('aria-current');
  fireEvent.click(screen.getByRole('button', {name: /Rewrite the rule/}));
  expect(screen.getByRole('button', {name: /Rewrite the rule/})).toHaveAttribute('aria-current', 'step');
  vi.advanceTimersByTime(20000);
  expect(screen.getByRole('button', {name: /Rewrite the rule/})).toHaveAttribute('aria-current', 'step');
  fireEvent.click(screen.getByRole('button', {name: /Find the indicators/}));
  expect(screen.getByRole('button', {name: /Find the indicators/})).toHaveAttribute('aria-current', 'step');
});
