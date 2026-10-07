import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from '../content';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import { ConditionalOpeningLesson } from './ConditionalOpeningLesson';
import { CounterexampleLab } from './CounterexampleLab';
import { LessonPages } from './LessonPages';
import { StudyDeck } from './StudyDeck';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function jumpTo(title: string) {
  if (screen.queryByRole('button', { name: /Lesson pages/ })) fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  const contents = screen.getByRole('navigation', { name: 'Lesson pages' });
  const destination = within(contents).getAllByRole('button').find(button => button.textContent?.endsWith(title));
  expect(destination, `Contents should offer ${title}`).toBeDefined();
  fireEvent.click(destination!);
}

function turn(direction: 'Next' | 'Back') {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Reading navigation' }))
    .getByRole('button', { name: new RegExp(`^${direction}`) }));
}

function lesson(id: string, onComplete = vi.fn()) {
  const unit = conditionalUnits.find(item => item.id === id)!;
  return <MemoryRouter><ConditionalOpeningLesson unit={unit} onComplete={onComplete} reviewed={false} continueHref="/guided" /></MemoryRouter>;
}

it('exposes only the current page, focuses its heading, and retains a checked case when returning', async () => {
  render(<LessonPages pages={[
    { title: 'Try a ticket', content: <section><h2>Try a ticket</h2><CounterexampleLab /></section> },
    { title: 'Recall a rule', content: <section><h2>Recall a rule</h2><StudyDeck group="foundation" /></section> },
  ]}><button type="button">Mark lesson as read</button></LessonPages>);

  expect(screen.getByRole('heading', { name: 'Try a ticket' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Recall a rule' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Lesson pages' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Outside Drawer R' }));
  fireEvent.click(screen.getByRole('button', { name: 'Blue border' }));
  fireEvent.click(screen.getByRole('button', { name: 'Test this ticket' }));
  expect(screen.getByText('This fits the rule and disproves the reverse.')).toBeVisible();

  turn('Next');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Recall a rule' })).toHaveFocus());
  expect(screen.queryByRole('button', { name: 'Test this ticket' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Try a ticket' })).toBeNull();
  turn('Back');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Try a ticket' })).toHaveFocus());
  expect(screen.getByRole('button', { name: 'Outside Drawer R' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Blue border' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('This fits the rule and disproves the reverse.')).toBeVisible();
});

it('retains the actual lesson card and revealed side across page navigation without pre-exposing answers', () => {
  render(lesson('group-1'));
  const cards = indicatorFlashcards.filter(card => card.group === 'group-1');
  jumpTo('Recall the expressions');
  expect(screen.queryByText(cards[0].back)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  fireEvent.click(screen.getByRole('button', { name: /Turn to the explanation/ }));
  expect(screen.getByText(cards[1].back)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Revisit this card' }));
  turn('Next');
  expect(screen.queryByRole('button', { name: /Turn back to the question/ })).toBeNull();
  turn('Back');
  expect(screen.getByText('Recall card 2 of 10')).toBeVisible();
  expect(screen.getByText(cards[1].back)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Saved to revisit' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Turn back to the question/ }));
  expect(screen.queryByText(cards[1].back)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Turn to the explanation/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  expect(screen.getByText(cards[2].front)).toBeVisible();
  expect(screen.queryByText(cards[2].back)).toBeNull();
});

it('requires an explicit end-page action to record reading, including after a contents jump', async () => {
  const complete = vi.fn();
  render(lesson('group-1', complete));
  expect(screen.queryByRole('button', { name: 'Mark lesson as read' })).toBeNull();
  turn('Next');
  expect(complete).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Mark lesson as read' })).toBeNull();
  jumpTo('Keep the direction and the whole condition');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Keep the direction and the whole condition' })).toHaveFocus());
  expect(screen.getByRole('navigation', { name: 'Lesson pages' })).toBeVisible();
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  expect(complete).toHaveBeenCalledTimes(1);
  turn('Back');
  expect(screen.queryByRole('button', { name: 'Mark lesson as read' })).toBeNull();
  expect(complete).toHaveBeenCalledTimes(1);
});

it('starts a changed unit at its first page and resets card state when returning to the prior unit', () => {
  const { rerender } = render(lesson('group-1'));
  jumpTo('Recall the expressions');
  fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
  fireEvent.click(screen.getByRole('button', { name: /Turn to the explanation/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Revisit this card' }));

  rerender(lesson('group-2'));
  expect(screen.getByRole('heading', { name: 'Find what is required' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  jumpTo('Recall the expressions');
  expect(screen.getByText('Recall card 1 of 11')).toBeVisible();
  expect(screen.getByRole('button', { name: /Turn to the explanation/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: 'Saved to revisit' })).toBeNull();

  rerender(lesson('group-1'));
  expect(screen.getByRole('heading', { name: 'Find the sufficient idea' })).toBeVisible();
  jumpTo('Recall the expressions');
  expect(screen.getByText('Recall card 1 of 10')).toBeVisible();
  expect(screen.getByRole('button', { name: /Turn to the explanation/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: 'Saved to revisit' })).toBeNull();
});

it('separates a present negative requirement from its absence in the fresh two-room exercise', () => {
  render(lesson('orientation'));
  jumpTo('Two possible rooms, one limit');
  expect(screen.getByRole('button', { name: 'Check these possibilities' })).toBeDisabled();
  expect(screen.queryByText('Both film possibilities remain open.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'No, it could not.' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Film showing. Workshop underway.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check these possibilities' }));
  expect(screen.getByText('A workshop conflicts with the given fact.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'No, it could not.' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Film showing. Workshop underway.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Film showing. No workshop.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check these possibilities' }));
  expect(screen.getByText('There is another case that fits.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'No, it could not.' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'No film. No workshop.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check these possibilities' }));
  expect(screen.getByText('Both film possibilities remain open.')).toBeVisible();
  expect(screen.getByText(/~W establishes neither F nor ~F/)).toBeVisible();
  expect(screen.queryByText(/Negating ~W gives W/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, it could.' }));
  expect(screen.getByText(/That conflicts with our new fact that a workshop is underway/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'No, it could not.' }));
  expect(screen.getByText(/In symbols, W → ~F/)).toBeVisible();
  turn('Next');
  turn('Back');
  expect(screen.getByRole('button', { name: 'No, it could not.' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/In symbols, W → ~F/)).toBeVisible();
});


it('uses a compact drawer in a narrow reader and moves focus to the chosen page', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 500, height: 600, top: 0, left: 0, right: 500, bottom: 600, x: 0, y: 0, toJSON() {} });
  render(<LessonPages pages={[
    { title: 'First idea', content: <section><h2>First idea</h2><input aria-label="Your reasoning" /></section> },
    { title: 'Second idea', content: <section><h2>Second idea</h2></section> },
  ]}><button type="button">Mark lesson as read</button></LessonPages>);
  expect(screen.queryByRole('navigation', { name: 'Lesson pages' })).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Your reasoning' }), { target: { value: 'The rule goes one way.' } });
  fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  const drawer = screen.getByRole('dialog', { name: 'In this lesson' });
  expect(within(drawer).getByRole('button', { name: 'First idea' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(within(drawer).getByRole('button', { name: 'Second idea' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Second idea' })).toHaveFocus());
  turn('Back');
  expect(screen.getByRole('textbox', { name: 'Your reasoning' })).toHaveValue('The rule goes one way.');
  fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(screen.getByRole('button', { name: /Lesson pages/ })).toHaveFocus());
});
