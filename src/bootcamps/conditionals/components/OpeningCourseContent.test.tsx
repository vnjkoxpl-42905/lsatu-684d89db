import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';
import { MixedFamilyPractice, mixedFamilyItems } from './MixedFamilyPractice';

afterEach(cleanup);

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement;

function attemptTranslation(item: HTMLElement, number: number) {
  fireEvent.change(within(item).getByLabelText(`Your diagram for sentence ${number}`), { target: { value: 'My complete conditions and arrow' } });
  fireEvent.change(within(item).getByLabelText(`Your English readback for sentence ${number}`), { target: { value: 'If my left condition holds, my right condition holds.' } });
  fireEvent.click(within(item).getByRole('button', { name: `Compare my translation for sentence ${number}` }));
}


it('alternates sufficient and necessary sentences in the mixed set', () => {
  expect(mixedFamilyItems.length).toBeGreaterThanOrEqual(6);
  mixedFamilyItems.forEach((item, index) => expect(item.family).toBe(index % 2 === 0 ? 'sufficient' : 'necessary'));
  expect(new Set(mixedFamilyItems.map(item => item.sentence)).size).toBe(mixedFamilyItems.length);
});

it('requires a checked target and arrow before revealing the family in mixed practice', () => {
  render(<section><h2>Independent conditional translation</h2><MixedFamilyPractice/></section>);
  const mixed = section('Independent conditional translation');
  const first = mixedFamilyItems[0];
  const item = within(mixed).getByText(first.sentence).closest('[data-mixed-item]') as HTMLElement;
  expect(within(mixed).queryByText(/points to what is/)).toBeNull();
  expect(mixed.textContent).not.toMatch(/Group 1|Group 2/);
  expect(within(item).queryByRole('button', { name: first.target })).toBeNull();
  attemptTranslation(item, 1);
  let check = within(item).getByRole('button', { name: 'Check sentence 1' });
  expect(check).toBeDisabled();
  expect(within(mixed).getByRole('button', { name: 'Next mixed sentence' })).toBeDisabled();

  // Incomplete target and reversed arrow each receive their own explanation.
  fireEvent.click(within(item).getByRole('button', { name: first.partial }));
  fireEvent.click(within(item).getByRole('button', { name: first.right }));
  expect(check).toBeEnabled();
  fireEvent.click(check);
  expect(within(item).getByText('Revise the part described below.')).toBeVisible();
  expect(within(item).getByText(first.partialFeedback)).toBeVisible();
  expect(within(item).getByText(first.reversed)).toBeVisible();
  expect(within(item).getByText(/points to what is enough, so its target goes on the left/)).toBeVisible();

  fireEvent.click(within(item).getByRole('button', { name: 'Try sentence 1 again' }));
  expect(within(item).queryByText(first.reversed)).toBeNull();
  attemptTranslation(item, 1);
  check = within(item).getByRole('button', { name: 'Check sentence 1' });
  fireEvent.click(within(item).getByRole('button', { name: first.target }));
  fireEvent.click(within(item).getByRole('button', { name: first.left }));
  fireEvent.click(check);
  expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);

  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed sentence' }));
  expect(within(mixed).getByText(mixedFamilyItems[1].sentence)).toBeVisible();
  expect(within(mixed).getByText(first.sentence)).not.toBeVisible();
  fireEvent.click(within(mixed).getByRole('button', { name: 'Previous mixed sentence' }));
  expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);

});

it('keeps the depot and the intake-time classification in every field of the corrected mixed items', () => {
  const bus = mixedFamilyItems[2];
  for (const text of [bus.sentence, bus.target, bus.left, bus.partialFeedback, bus.otherFeedback, bus.reversed, bus.why, bus.readback]) {
    expect(text).toMatch(/depot/);
  }
  const phone = mixedFamilyItems[4];
  const fields = [phone.sentence, phone.target, phone.other, phone.left, phone.right, phone.partialFeedback, phone.otherFeedback, phone.reversed, phone.why, phone.readback];
  for (const text of fields) expect(text).not.toMatch(/repaired on the same day|has a cracked screen|has cracked screen/i);
  for (const text of [phone.sentence, phone.target, phone.left, phone.partialFeedback, phone.otherFeedback, phone.reversed, phone.why, phone.readback]) {
    expect(text).toMatch(/same-day repair queue/);
  }
  for (const text of [phone.sentence, phone.other, phone.right, phone.otherFeedback, phone.reversed, phone.why, phone.readback]) {
    expect(text).toMatch(/arrived with a cracked screen|arrived with cracked screen|arrived cracked|Arriving with a cracked screen/i);
  }
});

it('checks the corrected bus and phone translations through the learner controls', () => {
  render(<section><h2>Independent conditional translation</h2><MixedFamilyPractice/></section>);
  const mixed = section('Independent conditional translation');
  const solve = (index: number) => {
    const entry = mixedFamilyItems[index];
    const item = within(mixed).getByText(entry.sentence).closest('[data-mixed-item]') as HTMLElement;
    attemptTranslation(item, index + 1);
    fireEvent.click(within(item).getByRole('button', { name: entry.target }));
    fireEvent.click(within(item).getByRole('button', { name: entry.left }));
    fireEvent.click(within(item).getByRole('button', { name: `Check sentence ${index + 1}` }));
    expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);
    return item;
  };
  solve(0);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed sentence' }));
  solve(1);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed sentence' }));

  const bus = mixedFamilyItems[2];
  const busItem = within(mixed).getByText(bus.sentence).closest('[data-mixed-item]') as HTMLElement;
  attemptTranslation(busItem, 3);
  fireEvent.click(within(busItem).getByRole('button', { name: bus.target }));
  fireEvent.click(within(busItem).getByRole('button', { name: 'Stops at hospital' }));
  expect(within(busItem).getByRole('img', { name: 'Your diagram: Stops at hospital implies Bus leaves depot after midnight' })).toBeVisible();
  fireEvent.click(within(busItem).getByRole('button', { name: 'Check sentence 3' }));
  expect(within(busItem).getByText(bus.reversed)).toBeVisible();
  fireEvent.click(within(busItem).getByRole('button', { name: 'Bus leaves depot after midnight' }));
  fireEvent.click(within(busItem).getByRole('button', { name: 'Check sentence 3' }));
  expect(busItem.querySelector('.co-correct strong')?.textContent).toContain(bus.readback);
  expect(within(busItem).getByText('Read it back: If a bus leaves the depot after midnight, it stops at the hospital.')).toBeVisible();
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed sentence' }));
  solve(3);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed sentence' }));

  const phone = mixedFamilyItems[4];
  const phoneItem = within(mixed).getByText(phone.sentence).closest('[data-mixed-item]') as HTMLElement;
  attemptTranslation(phoneItem, 5);
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'phones that arrived with a cracked screen' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Arrived with cracked screen' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Check sentence 5' }));
  expect(within(phoneItem).getByText(phone.otherFeedback)).toBeVisible();
  expect(within(phoneItem).getByText(phone.reversed)).toBeVisible();
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'phones placed in the same-day repair queue' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Phone in same-day repair queue' }));
  expect(within(phoneItem).getByRole('img', { name: 'Your diagram: Phone in same-day repair queue implies Arrived with cracked screen' })).toBeVisible();
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Check sentence 5' }));
  expect(phoneItem.querySelector('.co-correct strong')?.textContent).toContain(phone.readback);
  expect(within(phoneItem).getByText('Read it back: If a phone is placed in the same-day repair queue, it arrived with a cracked screen.')).toBeVisible();
});

it('walks the seven expressions with a next control while keeping manual selection', () => {
  render(<OpeningCourseContent id="sufficient-words"/>);
  expect(screen.getByText(/Work through all seven expressions/)).toBeVisible();
  expect(screen.getByText('Expression 1 of 7 · 1 of 7 opened')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Recall the expressions' })).toBeVisible();
  const ifPanel = screen.getByRole('heading', { level: 2, name: 'If: the starting condition can come last' });
  fireEvent.click(screen.getByRole('button', { name: 'Next expression: When' }));
  expect(screen.getByText('Expression 2 of 7 · 2 of 7 opened')).toBeVisible();
  expect(ifPanel).not.toBeVisible();
  const whenPanel = screen.getByRole('heading', { level: 2, name: 'When: an occasion can supply enough information' });
  expect(whenPanel).toBeVisible();
  expect(whenPanel.closest('[tabindex="-1"]')).toHaveFocus();

  fireEvent.click(screen.getByRole('button', { name: /^Any/ }));
  expect(screen.getByText('Expression 7 of 7 · 3 of 7 opened')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Next expression/ })).toBeNull();
  expect(screen.getByText(/That was the last of the seven expressions/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^If\W+opened$/ }));
  expect(ifPanel).toBeVisible();
  expect(screen.getByText('Expression 1 of 7 · 3 of 7 opened')).toBeVisible();
});

it('bridges with one raffle question, then tests fresh cases with reasoned feedback', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  expect(screen.getAllByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toHaveLength(1);
  for (const repeated of ["You don't win the raffle. Could you still get a bicycle?", 'You win the raffle. Do we need another fact to establish that you get a bicycle?', 'Under our rule, what has to follow if you win?']) {
    expect(screen.queryByRole('heading', { name: repeated })).toBeNull();
  }
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells me what follows if I win.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  for (let index = 0; index < 4; index++) {
    const fresh = document.querySelector<HTMLElement>(`[data-practice-task="${index + 2}"]`)!;
    expect(fresh).toBeVisible();
    expect(fresh.textContent).not.toContain('→');
    expect(fresh.textContent).not.toMatch(/raffle|bicycle/);
    const question = fresh.querySelector<HTMLElement>('.cr-question')!;
    const choices = within(within(question).getByRole('group')).getAllByRole('button');
    const explanations = new Set<string>();
    for (const choice of choices) {
      fireEvent.click(choice);
      explanations.add(within(question).getByRole('status').textContent || '');
      fireEvent.click(within(question).getByRole('button', { name: 'Try again' }));
    }
    expect(explanations.size).toBe(choices.length);
    fireEvent.click(choices[[2, 0, 0, 2][index]]);
    if (index === 0) expect(within(question).getByText(/a promise about a possible case, not a report that the case happened/)).toBeVisible();
    if (index < 3) fireEvent.click(screen.getByRole('button', { name: 'Next task' }));
  }
});

it('keeps the must-arrow note to roles, the raffle diagram and a moved if-clause', () => {
  render(<OpeningCourseContent id="must-arrow"/>);
  expect(screen.getByRole('button', { name: 'Find the indicator' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'You get a bicycle if you win the raffle. Which diagram preserves this sentence?' })).toBeVisible();
  const note = document.querySelector('[data-reference-source="8"]') as HTMLElement;
  expect(note.textContent).not.toMatch(/only if|requires|Group 1|Group 2/i);
  cleanup();
  render(<OpeningCourseContent id="necessary-words"/>);
  expect(screen.getByRole('heading', { name: 'A person borrows a locker only if they have a key. Which condition goes on the right?' })).toBeInTheDocument();
});

it('presents whole meaning as one sequence of four checks', () => {
  render(<OpeningCourseContent id="whole-meaning"/>);
  const headings = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
  expect(headings).toEqual([
    'Check a translation four ways',
    'Check 1: find the whole target, wherever it sits',
    'Check 2: keep every qualification',
    'Check 3: only and the only point to different targets',
    'Check 4: try the sentence from the inside',
  ]);
  expect(screen.getByText(/Borrowing a locker/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Any applicant who submits late pays a fee. What goes left?' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Entry requires a current pass. What goes right?' })).toBeVisible();
});


it('starts the unified mixed route with one question rather than stacked activity rounds', () => {
  render(<OpeningCourseContent id="mixed-practice"/>);
  expect(screen.getByRole('heading', { name: 'What does the rule cover?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Begin practice' }));
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'What does the rule cover?' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.queryByRole('navigation', { name: 'Practice rounds' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Compare with the choices' })).toBeNull();
});
it('shows every combination of the two conditions and rejects only a win without a bicycle', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const recap = section('Three combinations fit. One breaks the rule.');
  const rows = [...recap.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent || ''));
  expect(rows).toHaveLength(4);
  expect(new Set(rows.map(row => row.slice(0, 2).join(','))).size).toBe(4);
  expect(rows.filter(row => row[2].startsWith('Yes.'))).toHaveLength(3);
  expect(rows.filter(row => row[2].startsWith('No.')).map(row => row.slice(0, 2))).toEqual([['Yes', 'No']]);
  expect(recap.textContent).toContain('not a claim that any of them happened');
});
