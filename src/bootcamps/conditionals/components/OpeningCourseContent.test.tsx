import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';
import { MixedFamilyPractice, mixedFamilyItems } from './MixedFamilyPractice';

afterEach(cleanup);

it('teaches necessity before the visual and distinguishes a requirement from a guarantee in fresh practice', () => {
  const { container } = render(<OpeningCourseContent id="necessary"/>);
  expect(screen.queryByText(/raffle|bicycle|breathing/i)).toBeNull();
  const explanation = container.querySelector('.nc-lesson .cr-sufficiency-lead')!;
  expect(explanation).toHaveTextContent('A necessary condition is a requirement. It has to be met, but meeting it might not be enough.');
  expect(screen.queryByText('Replay emphasis')).toBeNull();
  expect(screen.queryByText(/Then is the indicator/)).toBeNull();
  const firstControl = container.querySelector('.nc-person-tabs button')!;
  expect(explanation.compareDocumentPosition(firstControl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const distinction = screen.getByRole('heading', { name: 'Two roles in the same relationship' });
  expect(firstControl.compareDocumentPosition(distinction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const film = screen.getByRole('region', { name: 'Short explanation of necessity' });
  expect(firstControl.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(film.querySelector('source')).toHaveAttribute('src', '/media/conditionals/necessity/required-not-enough.mp4');
  expect(within(film).queryByRole('group', { name: 'Choose an explanation' })).toBeNull();
  expect(film.querySelector('video')).toHaveAttribute('controls');
  expect(film.querySelector('video')).not.toHaveAttribute('autoplay');
  const questions = [...container.querySelectorAll<HTMLElement>('.nc-checks .cr-question')];
  const correctAnswers = [0, 1];
  questions.forEach((question, index) => {
    const area = within(question);
    const answers = area.getAllByRole('button');
    fireEvent.click(answers[1 - correctAnswers[index]]);
    expect(area.getByRole('status')).toHaveTextContent('Not quite.');
    fireEvent.click(answers[correctAnswers[index]]);
    expect(area.getByRole('status')).toHaveTextContent('Correct.');
    fireEvent.click(area.getByRole('button', { name: 'Try again' }));
    expect(answers[0]).toHaveFocus();
    expect(area.getByRole('status')).toBeEmptyDOMElement();
  });
});

it('retains the full sufficient explanation and necessity bridge on the dedicated course page', () => {
  const { rerender } = render(<OpeningCourseContent id="sufficient"/>);
  expect(screen.getByRole('heading', { name: 'Next: The Necessary Condition' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Use an indicator to find the guarantee' })).toBeVisible();
  expect(document.querySelectorAll('.cr-sufficient-checks [role="status"]')).toHaveLength(2);
  expect(screen.queryByText(/raffle|bicycle|100%|breathing/i)).toBeNull();
  expect(screen.queryByText(/The fact|Enough for what\?/i)).toBeNull();
  expect(screen.getByText(/optional clips use a hypothetical student, Maya/)).toBeVisible();
  const film = screen.getByRole('region', { name: 'Short explanations of sufficiency' });
  const groupVisual = document.querySelector('.sc-experience')!;
  expect(groupVisual.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(film.querySelector('video')).toHaveAttribute('controls');
  expect(film.querySelector('video')).not.toHaveAttribute('autoplay');
  fireEvent.click(within(film).getByRole('button', { name: 'What stays open' }));
  expect(film.querySelector('source')).toHaveAttribute('src', '/media/conditionals/sufficiency/what-stays-open.mp4');
  const guaranteeExplanation = screen.getByText(/Enrollment already guarantees it/);
  const firstControl = document.querySelector('.sc-sentence-map button')!;
  expect(guaranteeExplanation.compareDocumentPosition(firstControl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  rerender(<OpeningCourseContent id="necessary"/>);
  expect(screen.getByRole('region', { name: 'Short explanation of necessity' }).querySelector('source')).toHaveAttribute('src', '/media/conditionals/necessity/required-not-enough.mp4');
});

it('explains the sufficiency errors and retains keyboard focus when a learner retries', () => {
  const { container } = render(<OpeningCourseContent id="sufficient"/>);
  const questions = [...container.querySelectorAll<HTMLElement>('.cr-question')];
  const correctAnswers = [0, 1];
  questions.forEach((question, index) => {
    const area = within(question);
    const answers = area.getAllByRole('button');
    fireEvent.click(answers[1 - correctAnswers[index]]);
    expect(area.getByRole('status').textContent).toMatch(/Not quite/);
    fireEvent.click(answers[correctAnswers[index]]);
    expect(area.getByRole('status').textContent).toMatch(/Correct/);
    const retry = area.getByRole('button', { name: 'Try again' });
    retry.focus();
    fireEvent.click(retry);
    expect(answers[0]).toHaveFocus();
    expect(area.getByRole('status').textContent).toBe('');
  });
});

it('places narrated case applications after condition roles have been taught', () => {
  render(<OpeningCourseContent id="missing-requirement"/>);
  expect(screen.getByRole('heading', { name: 'Apply another rule' })).toBeVisible();
  expect(document.querySelector('video')).toHaveAttribute('controls');
  expect(screen.getByRole('button', { name: 'Enough to know' })).toBeVisible();
});

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

it('teaches complete sufficient conditions without a word selector or duplicate flashcards', () => {
  render(<OpeningCourseContent id="sufficient-words"/>);
  expect(screen.getByRole('heading', { name: 'Keep the words that limit the rule' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Keep the condition together, wherever it appears' })).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Choose an expression' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Recall the expressions' })).toBeNull();
  expect(screen.queryByText(/Work through all seven expressions/)).toBeNull();

  const applicant = screen.getByRole('group', { name: 'Any applicant who submits late pays a fee. Which complete condition goes on the left?' });
  expect(screen.queryByText(/Applicant alone includes people/)).toBeNull();
  fireEvent.click(within(applicant).getByRole('button', { name: 'Applicant' }));
  expect(screen.getByText(/Applicant alone includes people who submit on time/)).toBeVisible();
  fireEvent.click(within(applicant).getByRole('button', { name: 'Applicant submits late' }));
  expect(screen.getByText(/Applicant submits late keeps the restriction/)).toBeVisible();
  fireEvent.click(within(applicant).getByRole('button', { name: 'Applicant pays a fee' }));
  expect(screen.getByText(/Paying a fee is what follows/)).toBeVisible();

  const notebook = screen.getByRole('group', { name: 'The only notebooks kept on this shelf are hardback. Which condition is sufficient?' });
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook is hardback' }));
  expect(screen.getByText(/Being hardback does not guarantee a place/)).toBeVisible();
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook is kept on this shelf' }));
  expect(screen.getByText(/A notebook kept on this shelf must be hardback/)).toBeVisible();
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook' }));
  expect(screen.getByText(/Notebook alone would cover every notebook/)).toBeVisible();
});

it('bridges with one raffle question, then tests fresh cases with reasoned feedback', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  // The original seven applied questions follow the seventeen foundation checks.
  for (const answer of [0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 1, 0, 2, 1, 2]) {
    fireEvent.click(within(screen.getByRole('group')).getAllByRole('button')[answer]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }

  expect(screen.getAllByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toHaveLength(1);
  for (const repeated of ["You don't win the raffle. Could you still get a bicycle?", 'You win the raffle. Do we need another fact to establish that you get a bicycle?', 'Under our rule, what has to follow if you win?']) {
    expect(screen.queryByRole('heading', { name: repeated })).toBeNull();
  }
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells me what follows if I win.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  for (let index = 0; index < 4; index++) {
    const fresh = document.querySelector<HTMLElement>(`[data-practice-task="${index + 19}"]`)!;
    expect(fresh).toBeVisible();
    expect(fresh.textContent).not.toContain('→');
    expect(fresh.textContent).not.toMatch(/raffle|bicycle/);
    const question = fresh.querySelector<HTMLElement>('.d1-question-body')!;
    const choices = within(within(question).getByRole('group')).getAllByRole('button');
    const explanations = new Set<string>();
    for (const choice of choices) {
      fireEvent.click(choice);
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
      explanations.add(question.querySelector('.d1-feedback')?.textContent || '');
      fireEvent.click(within(question).getByRole('button', { name: 'Try again' }));
    }
    expect(explanations.size).toBe(choices.length);
    fireEvent.click(choices[[2, 0, 0, 2][index]]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    if (index === 0) expect(within(question).getByText(/a promise about a possible case, not a report that the case happened/)).toBeVisible();
    if (index < 3) fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
});

it('keeps the must-arrow note to roles, the raffle diagram and a moved if-clause', () => {
  render(<OpeningCourseContent id="must-arrow"/>);
  expect(screen.queryByRole('button', { name: 'Find the indicator' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Place the conditions. Then read the arrow.' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Two ways to say the same thing' })).toBeVisible();
  expect(screen.getByText('Left side')).toBeVisible();
  expect(screen.getByText('Sufficient condition')).toBeVisible();
  expect(screen.getByText('Right side')).toBeVisible();
  expect(screen.getByText('Necessary condition')).toBeVisible();
  const note = document.querySelector('[data-reference-source="8"]') as HTMLElement;
  expect(note.textContent).not.toMatch(/only if|Group 1|Group 2/i);
  expect(document.querySelectorAll('.ma-question-practice')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Question 1 of 4', level: 4 })).toBeVisible();
  const recap = document.querySelector('.ma-order');
  expect(recap?.textContent).not.toContain('You renew online');
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
