import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { OpeningCourseScreen } from './OpeningCourse';
import { flashcardUrl } from './FlashcardTools';
import { OPENING_COURSE_PATH } from '../openingCoursePath';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const url = (id: string) => `/dev/conditional-opening-preview?page=${id}`;
function Harness() {
  const location = useLocation();
  return <OpeningCourseScreen view={new URLSearchParams(location.search).get('page') || 'lessons'} url={url}/>;
}
it('links to flashcard practice without embedding a deck in either definition lesson', () => {
  render(<MemoryRouter initialEntries={[url('sufficient')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Go to flashcards' })).toHaveAttribute('href', `${url('tools')}&deck=group-1&from=sufficient`);
  expect(screen.queryByText('Which group?')).toBeNull();
  cleanup();
  render(<MemoryRouter initialEntries={[url('necessary')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Go to flashcards' })).toHaveAttribute('href', `${url('tools')}&deck=group-2&from=necessary`);
  expect(screen.queryByText('Which group?')).toBeNull();
});
it('lists one mixed word deck beside the concept cards, and old group links open it', () => {
  render(<MemoryRouter initialEntries={[url('tools')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Sufficient and necessary' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Indicator words' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: /Group [12] words/ })).toBeNull();
  cleanup();
  for (const deck of ['indicators', 'group-1', 'group-2']) {
    render(<MemoryRouter initialEntries={[`${url('tools')}&deck=${deck}`]}><Harness/></MemoryRouter>);
    expect(screen.getByText('Which group?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Group 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Group 2' })).toBeVisible();
    cleanup();
  }
});
it('does not expose flashcard sets when the work does not include their units', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation`]}><OpeningCourseScreen view="tools" steps={[]} url={url}/></MemoryRouter>);
  expect(screen.queryByRole('heading', { name: 'Indicator words' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Sufficient and necessary' })).toBeNull();
  expect(screen.getByText('No flashcards are available in this work.')).toBeVisible();
});
it('does not link an orientation-only learner to an unavailable indicator deck', () => {
  const steps = OPENING_COURSE_PATH.filter(step => step.unitId === 'orientation' || step.alsoAvailableIn?.includes('orientation'));
  render(<MemoryRouter><OpeningCourseScreen view="necessary" steps={steps} url={url}/></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'The Necessary Condition' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Go to flashcards' })).toBeNull();
});
it('turns a key-term card with one tap and moves on', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation`]}><Harness/></MemoryRouter>);
  expect(screen.getByText('Card 1 of 4')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /enough, by itself, to guarantee/ }));
  expect(screen.getByRole('button', { name: /Sufficient condition It goes on the left of the arrow/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
});
