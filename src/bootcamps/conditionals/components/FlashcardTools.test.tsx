import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OPENING_COURSE_PATH, courseStepsForEdition } from '../openingCoursePath';
import { OpeningCourseScreen } from './OpeningCourse';
import { FlashcardTools, flashcardUrl } from './FlashcardTools';
import { advance, cardById, newRound, pick } from '../indicatorWordDeck';
import { displayWord, indicatorWordCards } from '../content/indicatorWordCards';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
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
  expect(screen.getByRole('heading', { name: 'Indicator words', level: 3 })).toBeVisible();
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
  expect(screen.getByText('No flashcards are available in this work.')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Indicator words' })).toBeNull();
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

it.each([undefined, 1, 2] as const)('resumes the existing legacy device fallback for group %s through tools given a raw actor scope', group => {
 const cards = indicatorWordCards.filter(card => !group || card.group === group);
 let state = newRound(undefined, () => 0.5, cards);
 state = advance(pick(state, cardById(state.queue[0].id)!.group));
 state = pick(state, cardById(state.queue[state.index].id)!.group);
 const key = `conditional-indicator-words-v1${group ? `-group-${group}` : ''}`;
 const deck = group ? `group-${group}` : 'indicators';
 localStorage.setItem(key, JSON.stringify(state));
 const mount = () => render(<MemoryRouter initialEntries={[`${url('tools')}&deck=${deck}`]}><FlashcardTools url={url} allowed={['foundation', 'group-1', 'group-2']} storageScope="legacy-student-actor"/></MemoryRouter>);
 const first = mount();
 expect(screen.getByText(`Card 2 of ${cards.length}`)).toBeVisible();
 expect(document.querySelector('.iw-front .iw-word')).toHaveTextContent(displayWord(cardById(state.queue[state.index].id)!.word));
 expect(document.querySelector('.iw-stage')).toHaveAttribute('data-result', 'right');
 fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
 expect(JSON.parse(localStorage.getItem(key)!).index).toBe(2);
 expect(localStorage.getItem(`${key}:legacy-student-actor`)).toBeNull();
 first.unmount(); mount();
 expect(screen.getByText(`Card 3 of ${cards.length}`)).toBeVisible();
});

it('keeps expanded-edition indicator storage scoped without importing the legacy fallback', () => {
 const state = pick(newRound(undefined, () => 0.5), 1);
 const legacy = JSON.stringify(state);
 localStorage.setItem('conditional-indicator-words-v1', legacy);
 render(<MemoryRouter initialEntries={[`${url('tools')}&deck=indicators`]}><FlashcardTools url={url} allowed={['group-1', 'group-2']} storageScope={`expanded-student:${FULL_CONDITIONAL_EDITION}`}/></MemoryRouter>);
 expect(document.querySelector('.iw-stage')).not.toHaveAttribute('data-result');
 expect(localStorage.getItem('conditional-indicator-words-v1')).toBe(legacy);
 expect(localStorage.getItem(`conditional-indicator-words-v1:expanded-student:${FULL_CONDITIONAL_EDITION}`)).not.toBeNull();
});

it('filters only available decks without mounting a player or writing progress', () => {
  const save = vi.spyOn(Storage.prototype, 'setItem');
  render(<MemoryRouter><FlashcardTools url={url} allowed={['group-1']}/></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: 'Filters' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  const select = screen.getByRole('combobox', { name: 'Flashcard set' });
  expect(within(select).queryByRole('option', { name: 'Group 2 words' })).toBeNull();
  fireEvent.change(select, { target: { value: 'group-1' } });
  fireEvent.click(toggle);
  expect(select).toBeInTheDocument();
  expect(select).not.toBeVisible();
  fireEvent.click(toggle);
  expect(select).toHaveValue('group-1');
  expect(screen.getByRole('heading', { name: 'Group 1 words' })).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  save.mockRestore();
});

it('returns from foundation cards only to an authorized note', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation&from=meaning`]}><FlashcardTools url={url} allowed={['foundation']} authorizedSteps={OPENING_COURSE_PATH}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Back to/ })).toHaveAttribute('href', url('meaning'));
  cleanup();
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation&from=meaning`]}><FlashcardTools url={url} allowed={['foundation']} authorizedSteps={[]}/></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /Back to/ })).toBeNull();
});

it('opening deck filters preserves the current card and its saved state', () => {
  render(<MemoryRouter initialEntries={[`${url('tools')}&deck=foundation`]}><FlashcardTools url={url} allowed={['foundation']} storageScope="filter-proof"/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  const saved = localStorage.getItem('conditional-term-cards-v2:filter-proof');
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  expect(screen.getByText('Card 2 of 4')).toBeVisible();
  expect(localStorage.getItem('conditional-term-cards-v2:filter-proof')).toBe(saved);
});

it('unifies core and sentence collections under one filter without writing card progress', () => {
  const save = vi.spyOn(Storage.prototype, 'setItem');
  render(<MemoryRouter><FlashcardTools url={url} allowed={['foundation', 'group-1', 'group-2']} authorizedSteps={courseStepsForEdition(FULL_CONDITIONAL_EDITION)}/></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Concepts' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Sentence translations' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open Mixed sentence flashcards' })).toHaveAttribute('href', expect.stringContaining('groups=g1%2Cg2%2Cg3%2Cg4'));
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Flashcard set' }), { target: { value: 'sentences' } });
  expect(screen.getAllByRole('link', { name: /^Open Group [1-4] sentence flashcards$/ })).toHaveLength(4);
  expect(screen.queryByRole('link', { name: 'Open Sufficient and necessary' })).toBeNull();
  expect(save).not.toHaveBeenCalled();
  save.mockRestore();
});

it('uses authored chapter relevance for Chapter 3 and keeps Chapter 4 honestly empty', () => {
  const props = { url, allowed: ['foundation', 'group-1', 'group-2'], authorizedSteps: courseStepsForEdition(FULL_CONDITIONAL_EDITION) };
  render(<MemoryRouter initialEntries={[`${url('tools')}&courseChapter=3`]}><FlashcardTools {...props}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Open Group 3 sentence flashcards' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open Group 4 sentence flashcards' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Open Sufficient and necessary' })).toBeNull();
  cleanup();
  render(<MemoryRouter initialEntries={[`${url('tools')}&courseChapter=4`]}><FlashcardTools {...props}/></MemoryRouter>);
  expect(screen.getByText('No flashcards are available for this chapter.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Lessons' })).toHaveAttribute('href', expect.stringContaining('courseChapter=4'));
  expect(screen.getByRole('link', { name: 'Drills' })).toHaveAttribute('href', expect.stringContaining('courseChapter=4'));
});

it('keeps validated chapter and lesson context across chooser, deck choices and return', () => {
  const steps = courseStepsForEdition(FULL_CONDITIONAL_EDITION);
  const props = { url, allowed: ['foundation', 'group-1', 'group-2'], authorizedSteps: steps };
  render(<MemoryRouter initialEntries={[`${url('tools')}&courseChapter=1&from=sufficient`]}><FlashcardTools {...props}/></MemoryRouter>);
  const href = screen.getByRole('link', { name: 'Open Group 1 words' }).getAttribute('href')!;
  expect(href).toContain('courseChapter=1'); expect(href).toContain('from=sufficient');
  cleanup();
  render(<MemoryRouter initialEntries={[href]}><FlashcardTools {...props}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'All flashcard sets' })).toHaveAttribute('href', expect.stringContaining('courseChapter=1'));
  expect(screen.getByRole('link', { name: 'All flashcard sets' })).toHaveAttribute('href', expect.stringContaining('from=sufficient'));
  expect(screen.getByRole('link', { name: 'Back to The Sufficient Condition' })).toHaveAttribute('href', url('sufficient'));
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  const choice = screen.getByRole('link', { name: 'Group 2 words' }).getAttribute('href')!;
  expect(choice).toContain('courseChapter=1'); expect(choice).toContain('from=sufficient');
});
