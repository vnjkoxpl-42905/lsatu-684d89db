import { fireEvent, screen } from '@testing-library/react';
import { expect } from 'vitest';

// These browser APIs have no layout/pointer implementation in jsdom. Keep the
// stubs local to the RC suites instead of changing all test environments.
for (const [name, value] of Object.entries({
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
})) {
  if (!(name in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value });
}

export function chooseRcValue(trigger: HTMLElement, value: string) {
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const option = screen.getAllByRole('option').find(item => item.getAttribute('data-value') === value);
  if (!option) throw new Error(`Missing RC option: ${value}`);
  fireEvent.click(option);
}

export function expectRcValue(trigger: HTMLElement, value: string, expectedLabel?: string) {
  const labels: Record<string, string> = {
    standard: 'Standard pace · 8:45 per passage', untimed: 'Untimed', custom: 'Custom time',
    per_passage: 'After each passage', end_of_set: 'At the end', per_question: 'After each question',
    any: 'Any', fresh: 'Not attempted', strict_no_exposure: 'No recorded exposure',
    incorrect_before: 'Incorrect before', incorrect_last: 'Incorrect on last try',
    address: 'PrepTest order', difficulty: 'Difficulty', title: 'Title',
  };
  expect(trigger.textContent?.trim()).toBe(expectedLabel ?? labels[value] ?? value);
}
