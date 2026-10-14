import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TermDeck } from './TermDeck';
import { CourseProgressProvider, useDeviceCourseProgress } from '../courseProgress';

afterEach(cleanup);

it('resumes a revealed concept card and completes only after all cards are turned', () => {
  localStorage.removeItem('conditional-course-progress:term-deck-test');
  let store: ReturnType<typeof useDeviceCourseProgress> | undefined;
  function Provider() {
    store = useDeviceCourseProgress('term-deck-test');
    return <CourseProgressProvider store={store}><TermDeck/></CourseProgressProvider>;
  }
  const view = render(<Provider/>);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(document.querySelector('.iw-term-card')!);
  expect(store!.steps['flashcards-foundation']).toMatchObject({ status: 'started', done: 1, total: 4 });
  view.unmount();
  render(<Provider/>);
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
  expect(document.querySelector('.iw-term-card')).toHaveAttribute('data-flipped', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(document.querySelector('.iw-term-card')!);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(document.querySelector('.iw-term-card')!);
  expect(store!.steps['flashcards-foundation'].status).toBe('started');
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(document.querySelector('.iw-term-card')!);
  expect(store!.steps['flashcards-foundation']).toMatchObject({ status: 'done', done: 4, total: 4 });
});

it('starts clean for a different account with no concept-card record', () => {
  const save = vi.fn();
  render(<CourseProgressProvider store={{ steps: {}, save }}><TermDeck/></CourseProgressProvider>);
  expect(screen.getByText('Card 1 of 4')).toBeVisible();
  expect(document.querySelector('.iw-term-card')).toHaveAttribute('data-flipped', 'false');
  expect(save).not.toHaveBeenCalled();
});
