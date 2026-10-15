import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { IndicatorWordDeck } from './IndicatorWordDeck';
import { CourseProgressProvider, useDeviceCourseProgress } from '../courseProgress';
import { displayWord, indicatorWordCards } from '../content/indicatorWordCards';
import { vi } from 'vitest';
import { newRound, readDeckState } from '../indicatorWordDeck';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const shownCard = () => indicatorWordCards.find(card => displayWord(card.word) === document.querySelector('.iw-front .iw-word')!.textContent)!;
const answer = (correct: boolean) => { const card = shownCard(); click(`Group ${correct ? card.group : card.group === 1 ? 2 : 1}`); return card; };

it('keeps arrival focus, then focuses the next named card prompt and the restarted round', () => {
  const arrival = document.createElement('button');
  document.body.append(arrival);
  arrival.focus();
  render(<IndicatorWordDeck group={2}/>);
  expect(arrival).toHaveFocus();
  for (let index = 0; index < 7; index += 1) {
    answer(true);
    expect(screen.getByRole('button', { name: index === 6 ? 'See my results' : 'Next card' })).toHaveFocus();
    click(index === 6 ? 'See my results' : 'Next card');
    if (index !== 6) expect(screen.getByRole('group', { name: `Which group is ${shownCard().word}?` })).toHaveFocus();
  }
  expect(screen.getByRole('heading', { name: '7 right first time.' })).toHaveFocus();
  const restart = screen.getByRole('button', { name: 'Go again' });
  restart.focus();
  fireEvent.click(restart);
  expect(screen.getByRole('group', { name: `Which group is ${shownCard().word}?` })).toHaveFocus();
  expect(screen.getByText('Card 1 of 7')).toBeVisible();
  arrival.remove();
});

it.each([1, 2] as const)('contains only Group %s cards through completion, retry and restart', group => {
  render(<IndicatorWordDeck group={group}/>);
  const count = group === 1 ? 13 : 7;
  const seen = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    expect(shownCard().group).toBe(group);
    seen.add(shownCard().id);
    answer(index !== 0);
    click('Next card');
  }
  expect(seen.size).toBe(count);
  expect(screen.getByText('Second look 1 of 1')).toBeVisible();
  expect(shownCard().group).toBe(group);
  answer(true); click('See my results'); click('Go again');
  expect(screen.getByText(`Card 1 of ${count}`)).toBeVisible();
  expect(shownCard().group).toBe(group);
});

it('remounts rounds on mode changes and restores independent course progress', () => {
  let store: ReturnType<typeof useDeviceCourseProgress>;
  function Provider({ group }: { group?: 1 | 2 }) { store = useDeviceCourseProgress('mode-test'); return <CourseProgressProvider store={store}><IndicatorWordDeck group={group}/></CourseProgressProvider>; }
  const view = render(<Provider group={1}/>);
  answer(true); click('Next card'); answer(true);
  const word = shownCard().word;
  view.rerender(<Provider group={2}/>);
  expect(screen.getByText('Card 1 of 7')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  answer(true);
  view.rerender(<Provider/>);
  expect(screen.getByText('Card 1 of 20')).toBeVisible();
  answer(true);
  view.rerender(<Provider group={1}/>);
  expect(screen.getByText('Card 2 of 13')).toBeVisible();
  expect(shownCard().word).toBe(word);
  expect(screen.getByRole('button', { name: 'Next card' })).toBeVisible();
  expect(store!.steps['flashcards-group-1'].total).toBe(13);
  expect(store!.steps['flashcards-group-2'].total).toBe(7);
  expect(store!.steps['flashcards-indicators'].total).toBe(20);
});

it('rejects another mode queue or results while preserving legacy mixed state', () => {
  const one = newRound(undefined, Math.random, 1);
  const two = newRound(undefined, Math.random, 2);
  const mixed = newRound();
  expect(readDeckState(one, 1)).toEqual(one);
  expect(readDeckState(two, 2)).toEqual(two);
  expect(readDeckState(mixed)).toEqual(mixed);
  expect(readDeckState(mixed, 1)).toBeNull();
  expect(readDeckState(one, 2)).toBeNull();
  expect(readDeckState({ ...one, results: { [two.queue[0].id]: { first: 'right' } } }, 1)).toBeNull();
});

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

it('does not copy an anonymous device round into a fresh account', () => {
  const anonymous = render(<IndicatorWordDeck/>);
  answer(true); click('Next card'); answer(false);
  const deviceRound = localStorage.getItem('conditional-indicator-words-v1');
  anonymous.unmount();
  const save = vi.fn();
  render(<CourseProgressProvider store={{ steps: {}, save }}><IndicatorWordDeck/></CourseProgressProvider>);
  expect(screen.getByText('Card 1 of 20')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  expect(save).not.toHaveBeenCalled();
  answer(true);
  expect(save).toHaveBeenCalled();
  expect(localStorage.getItem('conditional-indicator-words-v1')).toBe(deviceRound);
});
