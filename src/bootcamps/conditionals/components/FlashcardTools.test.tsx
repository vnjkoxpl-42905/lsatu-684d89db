import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseScreen } from './OpeningCourse';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import { flashcardUrl, groupOneCardIds } from './FlashcardTools';
afterEach(cleanup);
const url = (id: string) => `/dev/conditional-opening-preview?page=${id}`;
function Harness() {
  const location = useLocation();
  return <OpeningCourseScreen view={new URLSearchParams(location.search).get('page') || 'lessons'} url={url}/>;
}
it('opens the matching indicator, hides its answer, changes indicator and returns to the lesson', () => {
  render(<MemoryRouter initialEntries={[url('sufficient')]}><Harness/></MemoryRouter>);
  const list = screen.getByRole('region', { name: 'Group 1 indicator words' });
  expect(within(list).getByRole('link', { name: 'Go to flashcards' })).toHaveAttribute('href', flashcardUrl(url, 'group-1', undefined, 'sufficient'));
  fireEvent.click(within(list).getByRole('link', { name: 'in order to' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Group 1: Conditional indicator words' })).toBeVisible();
  const card = indicatorFlashcards.find(item => item.id === 'g1-in-order-to')!;
  expect(screen.getByText(card.front)).toBeVisible();
  expect(screen.queryByText(card.back)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Show explanation/ }));
  expect(screen.getByText(card.back)).toBeVisible();
  fireEvent.change(screen.getByRole('combobox', { name: 'Choose an indicator' }), { target: { value: 'g1-whenever' } });
  expect(screen.queryByText(card.back)).toBeNull();
  expect(screen.getByText(indicatorFlashcards.find(item => item.id === 'g1-whenever')!.front)).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Back to sufficient condition' }));
  expect(screen.getByRole('heading', { level: 1, name: 'The Sufficient Condition' })).toBeVisible();
});
it('opens Group 2 directly from its lesson and keeps all three sets separate', () => {
  render(<MemoryRouter initialEntries={[url('necessary')]}><Harness/></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: 'Go to flashcards' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Group 2: Conditional indicator words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Terms and concepts' })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'All flashcard sets' }));
  expect(screen.getByRole('heading', { name: 'Terms and concepts' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Group 1: Conditional indicator words' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Group 2: Conditional indicator words' })).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Go to flashcards' })).toHaveLength(3);
});
it('has cards for every listed Group 1 family and each grouped variant', () => {
  for (const id of [...groupOneCardIds, 'g1-whenever', 'g1-anytime', 'g1-every-time']) {
    expect(indicatorFlashcards.find(card => card.id === id)?.group).toBe('group-1');
  }
});
it('does not expose a disallowed set through the query', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=group-2`]}><OpeningCourseScreen view="tools" steps={[]} url={url}/></MemoryRouter>);
  expect(screen.getByText('No flashcards are available in this work.')).toBeVisible();
  expect(screen.queryByRole('combobox')).toBeNull();
});
