import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DiagramDrills } from './ConditionalIndicatorsRefresher';
import { openingActivityItems } from '@/bootcamps/conditionals/content/openingActivityItems';

afterEach(cleanup);

it('retains an atomic feedback region and moves focus through check and retry', () => {
  const item = openingActivityItems[0];
  render(<DiagramDrills items={[item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false}/>);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(status).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: item.right }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose the right condition' }));
  fireEvent.click(screen.getByRole('button', { name: item.left }));
  const check = screen.getByRole('button', { name: 'Check answer' });
  check.focus();
  fireEvent.click(check);
  const retry = screen.getByRole('button', { name: 'Try again' });
  expect(retry).toHaveFocus();
  expect(screen.getByRole('status')).toBe(status);
  expect(status).toHaveTextContent('Conditional:');
  fireEvent.click(retry);
  expect(screen.getByRole('button', { name: 'Choose the left condition' })).toHaveFocus();
  expect(screen.getByRole('status')).toBe(status);
  expect(status).toBeEmptyDOMElement();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: item.left }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose the right condition' }));
  fireEvent.click(screen.getByRole('button', { name: item.right }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
  expect(screen.getByRole('status')).toBe(status);
});
