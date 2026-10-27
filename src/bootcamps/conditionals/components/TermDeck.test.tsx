import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TermDeck } from './TermDeck';
import { termCards } from '../content/termCards';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
it('rejects an invalid requested term before writing any device key', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem');
  render(<TermDeck storageScope="actor" initialCardId="invalid-card"/>);
  expect(screen.getByRole('alert')).toHaveTextContent('not available');
  expect(write).not.toHaveBeenCalled();
  write.mockRestore();
});
it('keeps one actor/deck place across requested-card and ordinary openings', () => {
  const first = render(<TermDeck storageScope="actor" initialCardId={termCards[1].id}/>);
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const saved = localStorage.getItem('conditional-term-cards-v2:actor');
  expect(localStorage.getItem(`conditional-term-cards-v2:actor:card:${termCards[1].id}`)).toBeNull();
  first.unmount();
  const second = render(<TermDeck storageScope="actor"/>);
  expect(screen.getByText('Card 3 of 4')).toBeVisible();
  second.unmount();
  render(<TermDeck storageScope="actor" initialCardId={termCards[0].id}/>);
  expect(screen.getByText('Card 3 of 4')).toBeVisible();
  expect(screen.getByText('Your saved place takes priority over the card in this link.')).toBeVisible();
  expect(localStorage.getItem('conditional-term-cards-v2:actor')).toBe(saved);
});
