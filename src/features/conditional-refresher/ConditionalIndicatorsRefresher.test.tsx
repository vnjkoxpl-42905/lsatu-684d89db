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
<<<<<<< HEAD
  // An embedded wrong answer never shows the answer diagram; the host supplies the hint.
||||||| 64792cc5
  expect(status).toHaveTextContent('Conditional:');
=======
  expect(status).toHaveTextContent('Not quite. Check the complete conditions and arrow direction.');
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  expect(status).not.toHaveTextContent('Conditional:');
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


it('keeps models and next hidden behind a correct answer or explicit help after two misses', () => {
  const item = openingActivityItems[0];
  render(<DiagramDrills items={[item]} persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={{ [item.id]: 'The full authored explanation.' }}/>);
  for (let attempt = 0; attempt < 2; attempt++) {
    fireEvent.click(screen.getByRole('button', { name: item.right }));
    fireEvent.click(screen.getByRole('button', { name: 'Building right' }));
    fireEvent.click(screen.getByRole('button', { name: item.left }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.queryByText('Conditional:')).toBeNull();
    expect(screen.queryByText('The full authored explanation.')).toBeNull();
    if (!attempt) {
      expect(screen.queryByRole('button', { name: 'Show me' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    }
  }
  fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
  expect(screen.getByText('Conditional:')).toBeVisible();
  expect(screen.getByText('The full authored explanation.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  expect(screen.getByText(/completed with help/)).toBeVisible();
});
