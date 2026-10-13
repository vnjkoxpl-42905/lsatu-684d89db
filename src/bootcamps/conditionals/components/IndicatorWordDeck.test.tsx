import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { IndicatorWordDeck } from './IndicatorWordDeck';
import { CourseProgressProvider, useDeviceCourseProgress } from '../courseProgress';
import { displayWord, indicatorWordCards } from '../content/indicatorWordCards';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const shownCard = () => indicatorWordCards.find(card => displayWord(card.word) === document.querySelector('.iw-front .iw-word')!.textContent)!;
const answer = (correct: boolean) => { const card = shownCard(); click(`Group ${correct ? card.group : card.group === 1 ? 2 : 1}`); return card; };

it('shows only the word, flips on a choice, and says the group in one line', () => {
  render(<IndicatorWordDeck/>);
  expect(screen.getByText('Card 1 of 20')).toBeVisible();
  expect(screen.queryByRole('textbox')).toBeNull();
  const card = answer(true);
  expect(document.querySelector('.iw-stage')).toHaveAttribute('data-result', 'right');
  expect(document.querySelector('.iw-back')!.textContent).toContain(`Group ${card.group}`);
  expect(screen.getByText('Correct')).toBeInTheDocument();
});

it('shakes and corrects on a wrong choice, then brings the card back once at the end of the round', () => {
  render(<IndicatorWordDeck/>);
  const missed = answer(false);
  expect(document.querySelector('.iw-stage')).toHaveAttribute('data-result', 'wrong');
  expect(screen.getByText('Not quite')).toBeInTheDocument();
  expect(document.querySelector('.iw-back')!.textContent).toContain(`Group ${missed.group}`);
  click('Next card');
  for (let i = 1; i < 20; i += 1) { answer(true); click(i === 19 ? 'Next card' : 'Next card'); }
  expect(screen.getByText('Second look 1 of 1')).toBeVisible();
  expect(displayWord(shownCard().word)).toBe(displayWord(missed.word));
  answer(true);
  click('See my results');
  expect(screen.getByRole('heading', { name: '19 right first time.' })).toBeVisible();
  expect(screen.getByText(/1 needed a second look/)).toBeVisible();
  click('Go again');
  expect(screen.getByText('Card 1 of 20')).toBeVisible();
});

it('resumes on the same card, mid-answer, after the page is reopened', () => {
  const view = render(<IndicatorWordDeck/>);
  answer(true); click('Next card');
  answer(false);
  const word = document.querySelector('.iw-front .iw-word')!.textContent;
  view.unmount();
  render(<IndicatorWordDeck/>);
  expect(screen.getByText('Card 2 of 20')).toBeVisible();
  expect(document.querySelector('.iw-front .iw-word')!.textContent).toBe(word);
  expect(screen.getByRole('button', { name: 'Next card' })).toBeVisible();
  expect(document.querySelector('.iw-stage')).toHaveAttribute('data-result', 'wrong');
});

it('saves every answer to the course record, and resumes from it when the device copy is gone', () => {
  let store: ReturnType<typeof useDeviceCourseProgress> | undefined;
  function Provider() { store = useDeviceCourseProgress('deck-test'); return <CourseProgressProvider store={store}><IndicatorWordDeck/></CourseProgressProvider>; }
  const view = render(<Provider/>);
  answer(true); click('Next card'); answer(true);
  const saved = store!.steps['flashcards-indicators'];
  expect(saved.state).toBeTruthy();
  expect(saved).toMatchObject({ status: 'started', done: 2, total: 20 });
  view.unmount();
  localStorage.removeItem('conditional-indicator-words-v1');
  render(<Provider/>);
  expect(screen.getByText('Card 2 of 20')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next card' })).toBeVisible();
});
