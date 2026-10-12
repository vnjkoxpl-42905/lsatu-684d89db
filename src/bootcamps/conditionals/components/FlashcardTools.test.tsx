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
it('keeps flashcards out of the lessons', () => {
  render(<MemoryRouter initialEntries={[url('sufficient')]}><Harness/></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Go to flashcards' })).toBeNull();
  cleanup();
  render(<MemoryRouter initialEntries={[url('necessary')]}><Harness/></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Go to flashcards' })).toBeNull();
});
it('lists each group deck and the mixed quiz deck beside the concept cards, and shows which side the idea goes on', () => {
  render(<MemoryRouter initialEntries={[url('tools')]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Terms and concepts' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Group 1 words' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Group 2 words' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Indicator words, both groups' })).toBeVisible();
  cleanup();
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=group-1`]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'Group 1 words' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Turn card' }));
  expect(document.querySelector('.iw-back')!.textContent).toMatch(/Group 1.*Sufficient condition indicator.*left side/);
  cleanup();
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=indicators`]}><Harness/></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Group 2' })).toBeVisible();
});
it('does not expose a disallowed set through the query', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=group-2`]}><OpeningCourseScreen view="tools" steps={[]} url={url}/></MemoryRouter>);
  expect(screen.getByText('No flashcards are available in this work.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Group 1' })).toBeNull();
});
