import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OpeningCourseContent } from './OpeningCourseContent';
import { MixedFamilyPractice, mixedFamilyItems } from './MixedFamilyPractice';

afterEach(cleanup);

it('builds the necessary page to the contrapositive shape: definition, certainty, video, steps, words, look-alike, habit, Pop Quiz', () => {
  const { container } = render(<OpeningCourseContent id="necessary"/>);
  const names = ['What a necessary condition is', 'Where the certainty is', 'Watch the lesson', 'How to find it', 'Words that mark the requirement', 'What it is not', 'Picture it on its own', 'Pop Quiz'];
  for (const name of names) expect(screen.getByRole('heading', { name })).toBeVisible();
  const text = container.textContent ?? '';
  const order = names.slice(0, -1).map(name => text.indexOf(name));
  expect(order).toEqual([...order].sort((m, n) => m - n));
  expect(container.querySelector('.ct-definition')).toHaveTextContent('A necessary condition is a requirement. It has to be met, but meeting it might not be enough.');
  expect(screen.getByText('The necessary condition is what you can guarantee will occur if the sufficient condition happens.')).toBeVisible();
  expect(text).not.toMatch(/raffle|bicycle|breathing|promise|depends on|[—–~]/i);
  expect(container.querySelector('[role=tablist]')).toBeNull();
  const film = screen.getByRole('region', { name: 'Short explanation of necessity' });
  expect(film.querySelector('source')).toHaveAttribute('src', '/media/conditionals/necessity/required-not-enough.mp4');
  expect(film.querySelector('video')).toHaveAttribute('controls');
  expect(film.querySelector('video')).not.toHaveAttribute('autoplay');
  expect([...container.querySelectorAll('.ns-words li')].map(item => item.textContent)).toEqual(['only', 'only if', 'only when', 'only where', 'always', 'requires', 'must']);
  expect([...container.querySelectorAll('.ns-cards .ct-move')].map(card => card.getAttribute('data-verdict'))).toEqual(['wrong', 'right']);
});

it('finds the requirement in two steps, including a rule that names it first', () => {
  render(<OpeningCourseContent id="necessary"/>);
  const [lawSchool, fuel] = [...document.querySelectorAll<HTMLElement>('.ns-find')];
  const demo = within(fuel);
  expect(demo.getByRole('button', { name: /Step 2/ })).toBeDisabled();
  fireEvent.click(demo.getByRole('button', { name: /Step 1/ }));
  expect(fuel.querySelector('.ns-mark[data-role=necessary]')).toHaveAttribute('data-lit', 'true');
  expect(fuel.querySelector('.ns-mark[data-role=sufficient]')).toHaveAttribute('data-lit', 'false');
  fireEvent.click(demo.getByRole('button', { name: /Step 2/ }));
  expect(fuel.querySelector('.ns-find-result')).toHaveTextContent('If the car starts, then it has fuel.');
  expect(demo.getByRole('status')).toHaveTextContent('Its place in the sentence doesn’t decide its role.');
  expect(lawSchool.querySelector('.ns-frame')).toHaveAttribute('data-show', 'false');
});

it('runs the necessary Pop Quiz one question at a time on fresh rules', () => {
  render(<OpeningCourseContent id="necessary"/>);
  const quiz = within(document.querySelector('.ct-drill') as HTMLElement);
  expect(quiz.getByText('Question 1 of 4')).toBeVisible();
  fireEvent.click(quiz.getByRole('button', { name: 'In the race' }));
  expect(quiz.getByRole('status')).toHaveTextContent(/^Not that one\. Being in the race guarantees the brakes/);
  fireEvent.click(quiz.getByRole('button', { name: 'Working brakes' }));
  expect(quiz.getByRole('status')).toHaveTextContent('If a bike is in the race, then it has working brakes.');
  fireEvent.click(quiz.getByRole('button', { name: 'Next question' }));
  fireEvent.click(quiz.getByRole('button', { name: 'Yes, it’s in the race.' }));
  expect(quiz.getByRole('status')).toHaveTextContent(/Brakes are required, not enough/);
});

it('keeps the sufficient page short: definition, indicators, demo, video, Pop Quiz, then the necessity bridge', () => {
  const { rerender } = render(<OpeningCourseContent id="sufficient"/>);
  expect(screen.getByRole('heading', { name: 'Next: The Necessary Condition' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Pop Quiz' })).toBeVisible();
  expect(screen.queryByText(/raffle|bicycle|100%|breathing/i)).toBeNull();
  expect(screen.queryByText(/The fact|Enough for what\?/i)).toBeNull();
  expect(screen.queryByText(/optional clips|Want to see the rule|Let's look at what that means|Let's use every/)).toBeNull();
  const indicators = document.querySelector('.sc-indicator-list')!;
  const film = screen.getByRole('region', { name: 'Short explanations of sufficiency' });
  const demo = document.querySelector('.sc-experience')!;
  const quiz = screen.getByRole('heading', { name: 'Pop Quiz' });
  const bridge = screen.getByRole('heading', { name: 'Next: The Necessary Condition' });
  const before = (first: Element, second: Element) => expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  before(indicators, demo); before(demo, film); before(film, quiz); before(quiz, bridge);
  expect(film.querySelector('video')).toHaveAttribute('controls');
  expect(film.querySelector('video')).not.toHaveAttribute('autoplay');
  fireEvent.click(within(film).getByRole('button', { name: 'What stays open' }));
  expect(film.querySelector('source')).toHaveAttribute('src', '/media/conditionals/sufficiency/what-stays-open.mp4');
  rerender(<OpeningCourseContent id="necessary"/>);
  expect(screen.getByRole('region', { name: 'Short explanation of necessity' }).querySelector('source')).toHaveAttribute('src', '/media/conditionals/necessity/required-not-enough.mp4');
});

it('runs the sufficient Pop Quiz one question at a time with short, specific feedback', () => {
  render(<OpeningCourseContent id="sufficient"/>);
  const quiz = document.querySelector('.cr-sufficient-checks .ct-drill') as HTMLElement;
  const area = within(quiz);
  expect(area.getByText('Question 1 of 4')).toBeVisible();
  fireEvent.click(area.getByRole('button', { name: 'Any applicant' }));
  expect(area.getByRole('status')).toHaveTextContent('Not that one. The rule covers invited applicants, not every applicant.');
  fireEvent.click(area.getByRole('button', { name: 'Invited to an interview' }));
  expect(area.getByRole('status')).toHaveTextContent('If an applicant is invited to an interview, then the applicant gets an email.');
  fireEvent.click(area.getByRole('button', { name: 'Next question' }));
  expect(area.getByText('Question 2 of 4')).toBeVisible();
  expect(area.getByRole('status')).toHaveTextContent('Pick the answer the rule supports.');
  fireEvent.click(area.getByRole('button', { name: 'It is match day' }));
  expect(area.getByRole('status')).toHaveTextContent('Not that one.');
  fireEvent.click(area.getByRole('button', { name: 'It rains on match day' }));
  fireEvent.click(area.getByRole('button', { name: 'Next question' }));
  fireEvent.click(area.getByRole('button', { name: 'Nothing. They might or might not get one.' }));
  fireEvent.click(area.getByRole('button', { name: 'Next question' }));
  expect(area.getByText('Question 4 of 4')).toBeVisible();
  fireEvent.click(area.getByRole('button', { name: /Nothing. She might be studying something else./ }));
  expect(area.getByRole('status')).toHaveTextContent('If someone is a student, the rule says nothing about law school.');
  expect(area.getByRole('button', { name: 'Try them again' })).toBeVisible();
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

it('requires a checked group and arrow before revealing the family in mixed practice', () => {
  render(<section><h2>Independent conditional translation</h2><MixedFamilyPractice/></section>);
  const mixed = section('Independent conditional translation');
  const first = mixedFamilyItems[0];
  const item = within(mixed).getByText(first.sentence).closest('[data-mixed-item]') as HTMLElement;
  expect(within(mixed).queryByText(/points to what is/)).toBeNull();
  expect(mixed.textContent).not.toMatch(/Group 1|Group 2/);
  expect(within(item).queryByRole('button', { name: first.target })).toBeNull();
  attemptTranslation(item, 1);
  let check = within(item).getByRole('button', { name: 'Check question 1' });
  expect(check).toBeDisabled();
  expect(within(mixed).getByRole('button', { name: 'Next mixed question' })).toBeDisabled();

  // Incomplete target and reversed arrow each receive their own explanation.
  fireEvent.click(within(item).getByRole('button', { name: first.partial }));
  fireEvent.click(within(item).getByRole('button', { name: first.right }));
  expect(check).toBeEnabled();
  fireEvent.click(check);
  expect(within(item).getByText('Revise the part described below.')).toBeVisible();
  expect(within(item).getByText(first.partialFeedback)).toBeVisible();
  expect(within(item).getByText(first.reversed)).toBeVisible();
  // A wrong check gives hints only: no family, explanation or readback until the translation is right.
  expect(within(item).queryByText(/points to what is enough/)).toBeNull();
  expect(within(item).queryByText(first.why)).toBeNull();
  expect(within(item).queryByText(/Read it back/)).toBeNull();

  fireEvent.click(within(item).getByRole('button', { name: 'Try sentence 1 again' }));
  expect(within(item).queryByText(first.reversed)).toBeNull();
  attemptTranslation(item, 1);
  check = within(item).getByRole('button', { name: 'Check question 1' });
  fireEvent.click(within(item).getByRole('button', { name: first.target }));
  fireEvent.click(within(item).getByRole('button', { name: first.left }));
  fireEvent.click(check);
  expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);

  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed question' }));
  expect(within(mixed).getByText(mixedFamilyItems[1].sentence)).toBeVisible();
  expect(within(mixed).getByText(first.sentence)).not.toBeVisible();
  fireEvent.click(within(mixed).getByRole('button', { name: 'Previous mixed question' }));
  expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);

});

it('keeps the depot and the intake-time classification in every field of the corrected mixed items', () => {
  const bus = mixedFamilyItems[2];
  // Wrong-answer hints no longer restate the answer, so they are checked only for stale wording.
  for (const text of [bus.sentence, bus.target, bus.left, bus.partialFeedback, bus.reversed, bus.why, bus.readback]) {
    expect(text).toMatch(/depot/);
  }
  const phone = mixedFamilyItems[4];
  const fields = [phone.sentence, phone.target, phone.other, phone.left, phone.right, phone.partialFeedback, phone.otherFeedback, phone.reversed, phone.why, phone.readback];
  for (const text of fields) expect(text).not.toMatch(/repaired on the same day|has a cracked screen|has cracked screen/i);
  for (const text of [phone.sentence, phone.target, phone.left, phone.reversed, phone.why, phone.readback]) {
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
    fireEvent.click(within(item).getByRole('button', { name: `Check question ${index + 1}` }));
    expect(item.querySelector('.co-correct strong')?.textContent).toMatch(/^Read it back: If /);
    return item;
  };
  solve(0);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed question' }));
  solve(1);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed question' }));

  const bus = mixedFamilyItems[2];
  const busItem = within(mixed).getByText(bus.sentence).closest('[data-mixed-item]') as HTMLElement;
  attemptTranslation(busItem, 3);
  fireEvent.click(within(busItem).getByRole('button', { name: bus.target }));
  fireEvent.click(within(busItem).getByRole('button', { name: 'Stops at hospital' }));
  expect(within(busItem).getByRole('img', { name: 'Your diagram: Stops at hospital implies Bus leaves depot after midnight' })).toBeVisible();
  fireEvent.click(within(busItem).getByRole('button', { name: 'Check question 3' }));
  expect(within(busItem).getByText(bus.reversed)).toBeVisible();
  fireEvent.click(within(busItem).getByRole('button', { name: 'Bus leaves depot after midnight' }));
  fireEvent.click(within(busItem).getByRole('button', { name: 'Check question 3' }));
  expect(busItem.querySelector('.co-correct strong')?.textContent).toContain(bus.readback);
  expect(within(busItem).getByText('Read it back: If a bus leaves the depot after midnight, it stops at the hospital.')).toBeVisible();
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed question' }));
  solve(3);
  fireEvent.click(within(mixed).getByRole('button', { name: 'Next mixed question' }));

  const phone = mixedFamilyItems[4];
  const phoneItem = within(mixed).getByText(phone.sentence).closest('[data-mixed-item]') as HTMLElement;
  attemptTranslation(phoneItem, 5);
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'phones that arrived with a cracked screen' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Arrived with cracked screen' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Check question 5' }));
  expect(within(phoneItem).getByText(phone.otherFeedback)).toBeVisible();
  expect(within(phoneItem).getByText(phone.reversed)).toBeVisible();
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'phones placed in the same-day repair queue' }));
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Phone in same-day repair queue' }));
  expect(within(phoneItem).getByRole('img', { name: 'Your diagram: Phone in same-day repair queue implies Arrived with cracked screen' })).toBeVisible();
  fireEvent.click(within(phoneItem).getByRole('button', { name: 'Check question 5' }));
  expect(phoneItem.querySelector('.co-correct strong')?.textContent).toContain(phone.readback);
  expect(within(phoneItem).getByText('Read it back: If a phone is placed in the same-day repair queue, it arrived with a cracked screen.')).toBeVisible();
});

it('teaches every Group 1 indicator before the sufficient-side drill, then the complete phrase', () => {
  render(<OpeningCourseContent id="sufficient-words"/>);
  const tabs = within(screen.getByRole('group', { name: 'Choose an indicator' })).getAllByRole('button').map(tab => tab.textContent?.replace(/[^A-Za-z ]/g, '').replace(/ opened$/, '').trim());
  expect(tabs).toEqual(['If', 'When', 'Where', 'All', 'The only', 'Every', 'Any']);
  expect(screen.getByText(/Work through all seven indicators/)).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Recall the indicators' })).toBeNull();
  const text = document.body.textContent ?? '';
  // Words the drills test: when, whenever, where, each, every, any, people who.
  for (const word of [/\bWhenever\b/, /\bEach\b/, /people who/i, /\bWhere\b/]) expect(text).toMatch(word);
  // The complete-condition note no longer repeats the report and late-applicant examples the indicator note teaches.
  expect(screen.queryByRole('heading', { name: 'Keep the condition together, wherever it appears' })).toBeNull();
  expect(screen.queryByRole('group', { name: 'Any applicant who submits late pays a fee. Which complete condition goes on the left?' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Keep the whole phrase before you place it' })).toBeVisible();

  const notebook = screen.getByRole('group', { name: 'The only notebooks kept on this shelf are hardback. Which condition is sufficient?' });
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook is hardback' }));
  expect(screen.getByText(/Being hardback does not guarantee a place/)).toBeVisible();
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook is kept on this shelf' }));
  expect(screen.getByText(/A notebook kept on this shelf must be hardback/)).toBeVisible();
  fireEvent.click(within(notebook).getByRole('button', { name: 'Notebook' }));
  expect(screen.getByText(/Notebook alone would cover every notebook/)).toBeVisible();
});

it('teaches only after with the Group 2 words before the drills test it', () => {
  render(<OpeningCourseContent id="necessary-words"/>);
  expect(screen.getByRole('heading', { name: 'Only after also marks a requirement' })).toBeInTheDocument();
  expect(screen.getByText(/Only after what\?/)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Pharmacy fills the prescription implies A doctor has signed it' })).toBeInTheDocument();
  const question = screen.getByRole('group', { name: "A doctor has signed Ana's prescription. Does this rule prove the pharmacy fills it?" });
  fireEvent.click(within(question).getByRole('button', { name: 'Yes. The signature is enough.' }));
  expect(screen.getByText(/The signature is what filling requires/)).toBeInTheDocument();
});

it('opens with one meaning-page question, then tests fresh cases with reasoned feedback', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  // The seven rule-vs-fact questions now open the drill.
  expect(screen.getAllByRole('heading', { name: 'Does the rule itself tell us that you actually sign up for the fun run?' })).toHaveLength(1);
  expect(document.body.textContent).not.toMatch(/raffle|bicycle|promise/i);
  for (const repeated of ["You don't win the raffle. Could you still get a bicycle?", 'You win the raffle. Do we need another fact to prove that you get a bicycle?', 'Under our rule, what has to follow if you win?']) {
    expect(screen.queryByRole('heading', { name: repeated })).toBeNull();
  }
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells you what follows if you sign up.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  const correct = [2, 0, 0, 2];
  for (let index = 0; index < 4; index++) {
    const fresh = document.querySelector<HTMLElement>(`[data-practice-task="${index + 2}"]`)!;
    expect(fresh).toBeVisible();
    expect(fresh.textContent).not.toContain('→');
    expect(fresh.textContent).not.toMatch(/raffle|bicycle/);
    const question = fresh.querySelector<HTMLElement>('.d1-question-body')!;
    const choices = within(within(question).getByRole('group')).getAllByRole('button');
    const explanations = new Set<string>();
    choices.forEach((choice, option) => {
      if (option === correct[index]) return;
      fireEvent.click(choice);
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
      explanations.add(question.querySelector('.d1-feedback')?.textContent || '');
      fireEvent.click(within(question).getByRole('button', { name: 'Try again' }));
    });
    fireEvent.click(choices[correct[index]]);
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    explanations.add(question.querySelector('.d1-feedback')?.textContent || '');
    expect(explanations.size).toBe(choices.length);
    if (index === 0) expect(within(question).getByText("The rule tells you what follows if it rains. It doesn't report that it rained.")).toBeVisible();
    if (index < 3) fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
});

it('keeps the must-arrow note to roles, the law-school diagram and a moved if-clause', () => {
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
  expect(recap?.textContent).toContain('You are a student if you are enrolled in law school.');
  // The sentence-order comparison comes before the practice that tests it.
  expect(recap!.compareDocumentPosition(document.querySelector('.ma-placement')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(note.textContent).not.toMatch(/raffle|bicycle|promise|reverse/i);
  cleanup();
  render(<OpeningCourseContent id="necessary-words"/>);
  expect(screen.getByRole('heading', { name: 'A person borrows a locker only if they have a key. Which condition goes on the right?' })).toBeInTheDocument();
});

it('teaches meaning checks, modal strength and symbol definitions before worksheet production', () => {
  render(<OpeningCourseContent id="whole-meaning"/>);
  const headings = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
  expect(headings).toEqual([
    'Check a translation four ways',
    'Check 1: find the whole group, wherever it sits',
    'Check 2: keep every qualification',
    'Check 3: only and the only point to different groups',
    'Can, should and must keep their meaning',
    'Short labels stand for complete conditions',
    'Check 4: try the rule from the inside',
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
it('defines the contrapositive first, then says it was already there, plays the lecture video, flips and negates, and sets it against the reverse and inverse', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const names = ['What a contrapositive is', 'You already knew this', 'Watch the lesson', 'How to write it', 'What it is not', "Read it, don't always write it"];
  for (const name of names) expect(screen.getByRole('heading', { name })).toBeVisible();
  const full = document.body.textContent ?? '';
  const text = full.slice(0, full.indexOf('Pop Quiz'));
  const order = names.map(name => text.indexOf(name));
  expect(order).toEqual([...order].sort((m, n) => m - n));
  expect(text.indexOf('If the necessary condition is absent, the sufficient condition is absent too')).toBeLessThan(text.indexOf('ceiling light'));
  expect(text).toMatch(/then the power must be on/);
  expect(text).toMatch(/left side of the arrow/);
  expect(text).toMatch(/right side of the arrow/);
  expect(text).toMatch(/logically equivalent/);
  expect(text).toMatch(/waiting for you to spot it/);
  expect(text).toMatch(/interchangeable!/);
  expect(text).not.toMatch(/foreign|promise|nothing to stand on|depends on|raffle|elevator|coat|coffee|breathing|Logic Games|the one other thing|ignore the conditional/i);
  expect(text).not.toMatch(/[—–]/);
  expect(text).not.toMatch(/~/);
  expect(text).toMatch(/If the power is off, then the ceiling light must be off/);
  expect(document.querySelectorAll('.ct-neg').length).toBeGreaterThan(4);
});

it('places the lecture video after the idea is introduced, with captions and a written fallback', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const video = document.querySelector('.ct-lecture video') as HTMLVideoElement;
  expect(video.querySelector('track[kind=captions]')).not.toBeNull();
  expect(video.querySelector('source')?.getAttribute('src')).toBe('/media/conditionals/contrapositive/lecture.mp4');
  expect(document.querySelector('.ct-picker')).toBeNull();
});

it('says the contrapositive in plain English early, pulses the key term, and no longer repeats the raffle recap', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  expect(document.body.textContent).toContain('If the power is off, then the ceiling light must be off.');
  expect(document.querySelector('.ct-pulse-word')?.textContent).toBe('logically equivalent');
  expect(document.body.textContent).not.toMatch(/Three combinations fit|Write the meaning you already understand|raffle|bicycle/i);
});

it('works through four fresh rules one at a time, one for each place a not can sit', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  expect(screen.getByRole('heading', { name: 'Pop Quiz' })).toBeVisible();
  expect(document.body.textContent).not.toMatch(/patterns?/i);
  const drill = document.querySelector('.ct-drill') as HTMLElement;
  const rules = [
    ['If a guest is on the list, the guest gets a wristband.', 'not wristband → not on the list'],
    ['If the shop is open, the shutters are not down.', 'shutters down → not shop open'],
    ['If the gate is not locked, the dog can get out.', 'not dog gets out → gate locked'],
    ['If a ticket is not stamped, it is not valid.', 'ticket valid → ticket stamped'],
  ];
  rules.forEach(([sentence, correct], index) => {
    expect(within(drill).getByText(sentence)).toBeVisible();
    expect(within(drill).getByText('Rule ' + (index + 1) + ' of 4', { exact: false })).toBeVisible();
    const options = [...drill.querySelectorAll<HTMLButtonElement>('.ct-drill-option')];
    expect(options).toHaveLength(3);
    const wrong = options.find(option => option.getAttribute('aria-label') !== correct)!;
    fireEvent.click(wrong);
    expect(wrong.dataset.state).toBe('wrong');
    expect(within(drill).getByRole('status').textContent).toMatch(/Not that one/);
    fireEvent.click(within(drill).getByRole('button', { name: correct }));
    expect(within(drill).getByRole('button', { name: correct }).dataset.state).toBe('right');
    if (index < 3) fireEvent.click(within(drill).getByRole('button', { name: 'Next rule' }));
  });
  expect(within(drill).getByText(/That is all four/)).toBeVisible();
});

it('marks the reverse and the inverse as wrong and the contrapositive as right', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const cards = [...document.querySelectorAll<HTMLElement>('.ct-move')];
  expect(cards.map(card => card.dataset.verdict)).toEqual(['wrong', 'wrong', 'right']);
  expect(cards.map(card => card.querySelector('.ct-move-badge')?.textContent)).toEqual(['Wrong', 'Wrong', 'Right']);
  expect(cards.map(card => card.querySelector('.ct-move-how')?.textContent)).toEqual(['Flip the sides only.', 'Add “not” only.', 'Flip the sides and add “not” to both.']);
});

it('never shows a squiggle anywhere on the contrapositive page, including the practice answer choices', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  expect(document.body.textContent).not.toMatch(/[~∼¬]/);
  expect(document.querySelectorAll('.ct-drill-option .ct-pill[data-not=true]').length).toBeGreaterThan(3);
});

it('lets the student click Step 1 to flip and Step 2 to put not on both', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const demo = document.querySelector('.ct-flip') as HTMLElement;
  const step1 = within(demo).getByRole('button', { name: /Step 1. Click here to flip the sides/ });
  const step2 = within(demo).getByRole('button', { name: /Step 2. Click here to put “not” on both/ });
  expect(demo.dataset.stage).toBe('0');
  expect(step2).toBeDisabled();
  fireEvent.click(step1);
  expect(demo.dataset.stage).toBe('1');
  expect(step1).toBeDisabled();
  fireEvent.click(step2);
  expect(demo.dataset.stage).toBe('2');
  expect(demo.querySelectorAll('[data-struck=true]')).toHaveLength(2);
  fireEvent.click(within(demo).getByRole('button', { name: 'Start over' }));
  expect(demo.dataset.stage).toBe('0');
});

it('tells the student what the arrow says, where to start reading and what it is for', () => {
  render(<OpeningCourseContent id="must-arrow"/>);
  for (const name of ['What the arrow says', 'Start at the left', 'What the arrow is for']) expect(screen.getByRole('heading', { name })).toBeVisible();
});

it('shows a rule that already has a not, and its double negative turning positive', () => {
  render(<OpeningCourseContent id="contrapositive"/>);
  const demo = document.querySelectorAll('.ct-flip')[1] as HTMLElement;
  expect(demo.textContent).toMatch(/Snowing/);
  expect(demo.querySelectorAll('[data-struck=true]')).toHaveLength(1);
  fireEvent.click(within(demo).getByRole('button', { name: /Step 1/ }));
  fireEvent.click(within(demo).getByRole('button', { name: /Step 2/ }));
  const chips = [...demo.querySelectorAll('.ct-chip')].map(chip => (chip as HTMLElement).dataset.struck);
  expect(chips).toEqual(['true', 'false']);
  expect(within(demo).getByRole('status').textContent).toMatch(/the two cancel and it turns positive/);
});

it('follows the contrapositive with the four-situation chart: two rows settle something, two settle nothing', () => {
  render(<OpeningCourseContent id="four-situations"/>);
  const names = ['When a rule settles something', 'Don’t fall for the necessary condition', 'Four situations', 'Ask where the fact lands'];
  for (const name of names) expect(screen.getByRole('heading', { name })).toBeVisible();
  const full = document.body.textContent ?? '';
  const text = full.slice(0, full.indexOf('Pop Quiz'));
  const order = names.map(name => text.indexOf(name));
  expect(order).toEqual([...order].sort((m, n) => m - n));
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  expect(rows.map(row => row.getAttribute('data-settled'))).toEqual(['true', 'true', 'false', 'false']);
  expect(rows.map(row => within(row).getByRole('rowheader').textContent)).toEqual(['Sufficient present', 'Necessary absent', 'Sufficient absent', 'Necessary present']);
  expect(rows.slice(2).every(row => row.textContent?.includes('Nothing!'))).toBe(true);
  expect(text).not.toMatch(/raffle|breathing|air is present|promise|depends on|door|[—–~]/i);
  // Never claim a closed list of what a rule tells you, and never tell students to ignore or set aside a rule.
  expect(text).not.toMatch(/that is all|all it tells you|says nothing else|set it aside|ignore/i);
  expect(text).toContain('If the pool is open, then a lifeguard must be on duty.');
  expect(screen.getByRole('heading', { name: 'Pop Quiz' })).toBeVisible();
});

it('quizzes all four situations on a fresh rule and explains a wrong tap', () => {
  render(<OpeningCourseContent id="four-situations"/>);
  expect(screen.getAllByText('If a library book is overdue, the borrower gets a reminder text.')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Nothing. Sam may or may not get a text.' }));
  expect(screen.getByRole('status')).toHaveTextContent(/^Not that one\. An overdue book is the sufficient condition/);
  fireEvent.click(screen.getByRole('button', { name: 'Sam gets a reminder text.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Her book is overdue.' }));
  expect(screen.getByRole('status')).toHaveTextContent(/hold that is ready/);
});

// Copy rules from wiki/COPY-CORRECTIONS.md, checked on every lesson page in the course path.
it.each(['meaning', 'sufficient', 'necessary', 'must-arrow', 'sufficient-words', 'necessary-words', 'whole-meaning', 'contrapositive', 'four-situations', 'foundation-practice'])('keeps retired examples and rejected wording off the %s page', id => {
  const { container } = render(<OpeningCourseContent id={id}/>);
  container.querySelectorAll('details').forEach(details => details.setAttribute('open', ''));
  const text = container.textContent ?? '';
  expect(text).not.toMatch(/raffle|bicycle|coffee|breathing|elevator|\bcoat\b|promis|nothing to stand on|the one other thing|Logic Games|concept lesson|ignore the conditional|[—–~]/i);
  expect(text).not.toMatch(/\breverse[sd]?\b|\btrigger|\bpatterns?\b|\bstatement \d/i);
  // "Depends on" stays only as an indicator inside a quoted rule on the necessary-words page.
  if (id !== 'necessary-words') expect(text).not.toMatch(/depends on/i);
  // The careful door metaphor is approved for the necessary page only.
  if (id !== 'necessary') expect(text).not.toMatch(/\bdoor\b/i);
});

it('writes every lesson Pop Quiz and practice explanation without obligation metaphors', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  for (const file of ['OpeningCourseContent.tsx', 'NecessaryNote.tsx', 'FourSituations.tsx', 'SufficientQuiz.tsx', 'MustArrowPractice.tsx', 'ContrapositiveVisuals.tsx']) {
    const source = readFileSync(resolve(__dirname, file), 'utf8');
    expect(source, file).not.toMatch(/promis|raffle|bicycle|\breverses\b|'Right\.'|"Right\."/i);
  }
});

it('varies where the correct answer sits in each lesson Pop Quiz', () => {
  for (const id of ['sufficient', 'necessary', 'four-situations']) {
    const { container } = render(<OpeningCourseContent id={id}/>);
    const quiz = container.querySelector<HTMLElement>('.ct-drill')!;
    const positions: number[] = [];
    for (let step = 0; step < 4; step++) {
      const options = within(quiz).getAllByRole('button').filter(button => button.classList.contains('ct-drill-option'));
      const index = options.findIndex(option => { fireEvent.click(option); return option.getAttribute('data-state') === 'right'; });
      positions.push(index);
      if (step < 3) fireEvent.click(within(quiz).getByRole('button', { name: 'Next question' }));
    }
    expect(new Set(positions).size, id).toBeGreaterThan(1);
    cleanup();
  }
});
