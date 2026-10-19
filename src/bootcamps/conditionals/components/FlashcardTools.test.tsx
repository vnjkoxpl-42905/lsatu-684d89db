import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { OpeningCourseScreen } from './OpeningCourse';
import { flashcardUrl } from './FlashcardTools';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const url = (id: string) => `/dev/conditional-opening-preview?page=${id}`;
function Harness() {
  const location = useLocation();
  return <OpeningCourseScreen view={new URLSearchParams(location.search).get('page') || 'lessons'} url={url}/>;
}
it('links the matching indicator deck from each definition lesson', () => {
  render(<MemoryRouter initialEntries={[url('sufficient')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Go to flashcards' })).toHaveAttribute('href', flashcardUrl(url, 'group-1', undefined, 'sufficient'));
  cleanup();
  render(<MemoryRouter initialEntries={[url('necessary')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Go to flashcards' })).toHaveAttribute('href', flashcardUrl(url, 'group-2', undefined, 'necessary'));
});
it('lists the mixed deck and distinct group decks beside the concept cards', () => {
  render(<MemoryRouter initialEntries={[url('tools')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Sufficient and necessary' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Indicator words' })).toBeVisible();
  expect(screen.getAllByRole('heading', { name: /Group [12] words/ })).toHaveLength(2);
  cleanup();
  for (const deck of ['indicators', 'group-1', 'group-2']) {
    render(<MemoryRouter initialEntries={[`${url('tools')}&deck=${deck}`]}><Harness/></MemoryRouter>);
    expect(screen.getByText('Which group?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Group 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Group 2' })).toBeVisible();
    cleanup();
  }
});
it('does not expose a concept set the work does not include', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation`]}><OpeningCourseScreen view="tools" steps={[]} url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Indicator words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Sufficient and necessary' })).toBeNull();
});
it('turns a key-term card with one tap and moves on', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation`]}><Harness/></MemoryRouter>);
  expect(screen.getByText('Card 1 of 4')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /enough, by itself, to guarantee/ }));
  expect(screen.getByRole('button', { name: /Sufficient condition It goes on the left of the arrow/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
});

it.each([1, 2])('keeps Group %s cards and saved progress separate from the mixed deck', group => {
 const mixed = JSON.stringify({ untouched: true });
 localStorage.setItem('conditional-indicator-words-v1', mixed);
 render(<MemoryRouter initialEntries={[`${url('tools')}&deck=group-${group}`]}><Harness/></MemoryRouter>);
 const saved = JSON.parse(localStorage.getItem(`conditional-indicator-words-v1-group-${group}`)!);
 expect(saved.queue.length).toBeGreaterThan(0);
 expect(saved.queue.every((entry: { id: string }) => entry.id.startsWith(`g${group}-`))).toBe(true);
 expect(localStorage.getItem('conditional-indicator-words-v1')).toBe(mixed);
});
