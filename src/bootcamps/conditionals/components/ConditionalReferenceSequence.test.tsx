import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ConditionalReferenceSequence } from './ConditionalReferenceSequence';

afterEach(cleanup);

function mount() {
  const view = render(<ConditionalReferenceSequence/>);
  const step = (number: number) => {
    const section = view.container.querySelector<HTMLElement>(`[data-reference-step="${number}"]`);
    expect(section, `reference step ${number} is missing`).toBeTruthy();
    return section!;
  };
  return { ...view, step };
}

it('teaches all thirteen reference steps in order with notation after the conceptual contrapositive and cases', () => {
  const { container, step } = mount();
  const sections = [...container.querySelectorAll<HTMLElement>('[data-reference-step]')];
  expect(sections.map(section => Number(section.dataset.referenceStep))).toEqual(
    Array.from({ length: 13 }, (_, index) => index + 1),
  );
  for (const section of sections) {
    expect(section.hasAttribute('data-toc')).toBe(true);
    expect(within(section).getByRole('heading', { level: 2 }).textContent?.trim()).toBeTruthy();
  }
  expect(step(2).textContent).toMatch(/sufficient|enough/i);
  expect(step(4).textContent).toMatch(/necessary|required/i);
  expect(step(6).textContent).toMatch(/requirement/i);
  for (let number = 1; number <= 7; number++) {
    expect(step(number).querySelector('.co-arrow'), `notation is premature in step ${number}`).toBeNull();
    expect(step(number).textContent).not.toContain('→');
  }
  expect(step(8).textContent).toMatch(/arrow|diagram/i);
  expect(step(9).textContent).toMatch(/contrapositive/i);
  expect(step(10).textContent).toMatch(/diagram|abbreviat/i);
  expect(step(11).textContent).toMatch(/target/i);
  expect(step(12).textContent).toMatch(/Personalized If\/Then/);
  expect(step(13).textContent).toMatch(/practice|diagram/i);
});

it('lets learners inspect every family expression in source order while preserving the same relationship', () => {
  const { step } = mount();
  const families = [
    { number: 3, names: ['if', 'when / whenever', 'any / anytime', 'all', 'every / every time', 'in order to', 'people who', 'each'], role: 'Borrows a locker' },
    { number: 5, names: ['then', 'must', 'necessary', 'required', 'only / only if', 'depends', 'need / need to', 'have to', 'essential', 'precondition'], role: 'Has a key' },
  ];
  for (const family of families) {
    const lab = step(family.number).querySelector<HTMLElement>('.cr-family')!;
    const buttons = [...lab.querySelectorAll<HTMLButtonElement>('ol button')];
    expect(buttons.map(button => button.textContent?.replace(/^\d+/, ''))).toEqual(family.names);
    expect(lab.querySelector('blockquote')).toBeNull();
    for (const button of buttons) {
      fireEvent.click(button);
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(lab.querySelector('blockquote')?.textContent).toMatch(/locker|key/i);
      expect(lab.querySelector('.cr-family-role strong')?.textContent).toBe(family.role);
    }
    fireEvent.click(within(lab).getByRole('button', { name: 'Clear the example' }));
    expect(lab.querySelector('blockquote')).toBeNull();
    expect(buttons.every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
  }
});

it('asks for a prediction before naming the contrapositive and hides the derivation again on reset', () => {
  const { step } = mount();
  const section = step(6);
  const discovery = section.querySelector<HTMLElement>('.cr-discovery')!;
  expect(discovery.querySelector('.cr-discovery-reasoning')).toBeNull();
  expect(section.textContent).not.toMatch(/contrapositive/);
  expect(within(section).queryByRole('heading', { name: /You don't get a bicycle/ })).toBeNull();
  const question = within(section).getByRole('heading', { name: /Could Report K/ }).closest<HTMLElement>('.cr-question')!;
  expect(within(question).getByRole('status').textContent).toBe('');
  fireEvent.click(within(question).getByRole('button', { name: 'Yes, its location is unrestricted.' }));
  expect(within(question).getByRole('status').textContent).toMatch(/Not quite.*stamp/i);
  expect(section.querySelector('.cr-discovery-reasoning')?.textContent).toMatch(/contrapositive.*necessary condition is absent/i);
  const anchor = within(section).getByRole('heading', { name: /You don't get a bicycle/ }).closest<HTMLElement>('.cr-question')!;
  fireEvent.click(within(anchor).getByRole('button', { name: "You don't win the raffle." }));
  expect(anchor.querySelector('.cr-correct')).toBeTruthy();
  fireEvent.click(within(question).getByRole('button', { name: 'Try again' }));
  expect(discovery.querySelector('.cr-discovery-reasoning')).toBeNull();
  expect(within(question).getByRole('status').textContent).toBe('');
});

it('distinguishes the two valid inferences from both unknown cases without exposing conclusions before an attempt', () => {
  const { step } = mount();
  const lab = step(7).querySelector<HTMLElement>('.cr-cases')!;
  const startingFacts = within(lab).getByRole('group', { name: 'Choose a starting fact' });
  const cases = [
    ['Sufficient present', 'You get a bicycle.', "You don't get a bicycle.", /winning.*sufficient|rule.*bicycle/i],
    ['Necessary absent', "You don't win the raffle.", 'You win the raffle.', /missing requirement|cannot fit the rule/i],
    ['Sufficient absent', 'Getting a bicycle is not settled.', "You don't get a bicycle.", /both.*bicycle.*winning|bicycle remains open/i],
    ['Necessary present', 'Winning the raffle is not settled.', 'You win the raffle.', /with or without.*winning|requirement does not establish/i],
  ] as const;
  for (const [label, correct, wrong, reasoning] of cases) {
    fireEvent.click(within(startingFacts).getByRole('button', { name: new RegExp(label) }));
    expect(within(lab).getByRole('status').textContent).toBe('');
    const options = within(lab).getByRole('group', { name: 'Choose what follows' });
    fireEvent.click(within(options).getByRole('button', { name: wrong }));
    expect(lab.querySelector('.cr-correct')).toBeNull();
    expect(within(lab).getByRole('status').textContent).toMatch(/Not quite/);
    fireEvent.click(within(options).getByRole('button', { name: correct }));
    expect(lab.querySelector('.cr-correct')).toBeTruthy();
    expect(within(lab).getByRole('status').textContent).toMatch(reasoning);
  }
  expect(lab.querySelector('.cr-case-review')?.textContent).toMatch(/Two facts give an inference; two leave/i);
  fireEvent.click(within(lab).getByRole('button', { name: 'Reset the four cases' }));
  expect(lab.querySelector('.cr-case-review')).toBeNull();
  expect(within(lab).getByRole('status').textContent).toBe('');
});

it('constructs the first diagram incrementally and preserves roles when the if-clause moves', () => {
  const { step } = mount();
  const writer = step(8).querySelector<HTMLElement>('.cr-writer')!;
  expect(within(writer).queryByRole('img')).toBeNull();
  expect(writer.querySelector('mark')).toBeNull();
  fireEvent.click(within(writer).getByRole('button', { name: 'Find the indicator' }));
  expect(writer.querySelector('mark')?.textContent).toBe('If');
  expect(within(writer).queryByRole('img')).toBeNull();
  fireEvent.click(within(writer).getByRole('button', { name: 'Draw the must arrow' }));
  expect(within(writer).getByRole('img').getAttribute('aria-label')).toBe('Not placed yet implies Not placed yet');
  fireEvent.click(within(writer).getByRole('button', { name: 'Put winning on the left' }));
  expect(within(writer).getByRole('img').getAttribute('aria-label')).toBe('Win implies Not placed yet');
  fireEvent.click(within(writer).getByRole('button', { name: 'Fill the remaining condition' }));
  expect(within(writer).getByRole('img').getAttribute('aria-label')).toBe('Win implies Get bicycle');
  expect(within(writer).getByRole('status').textContent).toMatch(/Read it back.*win.*bicycle/i);
  const check = within(step(8)).getByRole('heading', { name: /moved if-clause/ }).closest<HTMLElement>('.cr-question')!;
  fireEvent.click(within(check).getByRole('button', { name: 'Get bicycle → Win' }));
  expect(within(check).getByRole('status').textContent).toMatch(/sentence order/);
  fireEvent.click(within(check).getByRole('button', { name: 'Win → Get bicycle' }));
  expect(check.querySelector('.cr-correct')).toBeTruthy();
  fireEvent.click(within(writer).getByRole('button', { name: 'Reset the construction' }));
  expect(within(writer).queryByRole('img')).toBeNull();
  expect(writer.querySelector('mark')).toBeNull();
});

it('negates both complete conditions correctly in all four sign patterns, including existing negatives', () => {
  const { step } = mount();
  const patterns = [
    ['W → B', '~B → ~W', 'B → W'],
    ['T → ~L', 'L → ~T', '~L → T'],
    ['~C → U', '~U → C', 'C → ~U'],
    ['~F → ~G', 'G → F', 'F → G'],
  ];
  for (const [original, correct, wrong] of patterns) {
    const question = within(step(9)).getByRole('heading', { name: `Which is the contrapositive of ${original}?` }).closest<HTMLElement>('.cr-question')!;
    expect(within(question).getByRole('status').textContent).toBe('');
    fireEvent.click(within(question).getByRole('button', { name: wrong }));
    expect(question.querySelector('.cr-correct')).toBeNull();
    fireEvent.click(within(question).getByRole('button', { name: correct }));
    expect(question.querySelector('.cr-correct')).toBeTruthy();
    expect(within(question).getByRole('status').textContent).toMatch(/same (rule|relationship)/);
    fireEvent.click(within(question).getByRole('button', { name: 'Try again' }));
    expect(within(question).getByRole('status').textContent).toBe('');
  }
  expect(step(9).querySelectorAll('.cr-method li')).toHaveLength(5);
});

it('answers practical writing questions before target reading and the Personalized If/Then', () => {
  const { step } = mount();
  const faq = step(10).querySelector<HTMLElement>('.cr-faq')!;
  const summaries = [...faq.querySelectorAll('summary')].map(summary => summary.textContent);
  expect(summaries).toEqual(['When should I diagram?', 'How do I check whether my diagram is right?', 'What if writing takes time?', 'Should I always write the contrapositive?', 'How should I abbreviate the conditions?']);
  const note = within(faq).getByRole('heading', { name: 'Why this practice asks for both' });
  const lastFAQ = faq.querySelectorAll('details')[4];
  expect(note.compareDocumentPosition(lastFAQ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(faq.textContent).toMatch(/no fixed letter limit/);
  expect(step(10).compareDocumentPosition(step(11)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(step(11).compareDocumentPosition(step(12)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(step(12).compareDocumentPosition(step(13)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('keeps a complete qualified target and recognizes its role on either side of the indicator', () => {
  const { step } = mount();
  const labs = [...step(11).querySelectorAll<HTMLElement>('.cr-target')];
  expect(labs).toHaveLength(3);
  const answers = [['reports with editor approval', 'reports'], ['editor approval', 'publication'], ['editor approval', 'publication']];
  for (const [index, lab] of labs.entries()) {
    const [correct, wrong] = answers[index];
    expect(lab.querySelector('mark')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: wrong }));
    expect(lab.querySelector('mark')).toBeNull();
    expect(lab.querySelector('.cr-correct')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: correct }));
    expect(lab.querySelector('mark')?.textContent?.toLowerCase()).toBe(correct);
    expect(within(lab).getByRole('status').textContent).toMatch(/Correct target/);
    fireEvent.click(within(lab).getByRole('button', { name: 'Clear the target' }));
    expect(lab.querySelector('mark')).toBeNull();
  }
});

it('tests a Personalized If/Then in both directions without treating the necessary condition as enough', () => {
  const { step } = mount();
  const section = step(12);
  const checks = [...section.querySelectorAll<HTMLElement>('.cr-question')];
  expect(checks).toHaveLength(2);
  fireEvent.click(within(checks[0]).getByRole('button', { name: 'I am wearing a helmet.' }));
  expect(checks[0].querySelector('.cr-correct')).toBeTruthy();
  fireEvent.click(within(checks[1]).getByRole('button', { name: 'Yes, the helmet proves riding.' }));
  expect(checks[1].querySelector('.cr-correct')).toBeNull();
  fireEvent.click(within(checks[1]).getByRole('button', { name: 'No, I could wear one without riding.' }));
  expect(checks[1].querySelector('.cr-correct')).toBeTruthy();
  expect(within(checks[1]).getByRole('status').textContent).toMatch(/waiting beside a bike.*promise/i);
});

it('requires both independent diagrams before giving nine fresh practice keys and resets each attempt', () => {
  const { step } = mount();
  const expected = [
    ['RT → PT', '~PT → ~RT'], ['SF → RC', '~RC → ~SF'], ['A → C', '~C → ~A'],
    ['D → B', '~B → ~D'], ['E → P', '~P → ~E'], ['M → V', '~V → ~M'],
    ['~C → H', '~H → C'], ['A → ~R', 'R → ~A'], ['~R → ~L', 'L → R'],
  ];
  const items = [...step(13).querySelectorAll<HTMLElement>('[data-reference-practice]')];
  expect(items).toHaveLength(9);
  expect(new Set(items.map(item => item.querySelector('h3')?.textContent)).size).toBe(9);
  const firstLegendRoles = new Set<boolean>();
  for (const [index, item] of items.entries()) {
    const number = index + 1;
    const [original, contra] = expected[index];
    const originalChoices = within(item).getByRole('group', { name: `Original diagram for item ${number}` });
    const contraChoices = within(item).getByRole('group', { name: `Contrapositive for item ${number}` });
    const check = within(item).getByRole('button', { name: `Check both diagrams for item ${number}` }) as HTMLButtonElement;
    firstLegendRoles.add(item.querySelector('dt')?.textContent === original.split(' → ')[0]);
    expect(check.disabled).toBe(true);
    expect(item.querySelector('.cr-answer-key')).toBeNull();
    expect(within(item).getByRole('status').textContent).toBe('');
    fireEvent.click(within(originalChoices).getByRole('button', { name: original }));
    expect(check.disabled).toBe(true);
    const wrongContra = within(contraChoices).getAllByRole('button').find(button => button.textContent !== contra)!;
    fireEvent.click(wrongContra);
    expect(check.disabled).toBe(false);
    expect(item.querySelector('.cr-answer-key')).toBeNull();
    fireEvent.click(check);
    expect(item.querySelector('.cr-correct')).toBeNull();
    expect(within(item).getByRole('status').textContent).toMatch(/original preserves the direction.*contrapositive must start/i);
    expect(item.querySelector('.cr-answer-key')?.textContent).toContain(original);
    expect(item.querySelector('.cr-answer-key')?.textContent).toContain(contra);
    fireEvent.click(within(contraChoices).getByRole('button', { name: contra }));
    expect(item.querySelector('.cr-answer-key')).toBeNull();
    fireEvent.click(check);
    expect(item.querySelector('.cr-correct strong')?.textContent).toBe('Both diagrams are correct.');
    expect(within(item).getByRole('status').textContent).toMatch(/Read the original:.*Read its contrapositive:/);
    fireEvent.click(within(item).getByRole('button', { name: `Try item ${number} again` }));
    expect(check.disabled).toBe(true);
    expect(item.querySelector('.cr-answer-key')).toBeNull();
    expect(within(item).getByRole('status').textContent).toBe('');
  }
  expect(firstLegendRoles).toEqual(new Set([true, false]));
});

it('covers both source word families in their assigned teaching sections without a positional shortcut', () => {
  const { step } = mount();
  const familyWords = (number: number) => [...step(number).querySelectorAll('.cr-family-list button')]
    .map(button => button.textContent?.replace(/^\d+/, '')).join(' ');
  for (const expression of [
    /\bif\b/i, /\bwhen\b/i, /\bwhenever\b/i, /\bany\b/i, /\banytime\b/i,
    /\ball\b/i, /\bevery\b/i, /\bevery time\b/i, /\bin order to\b/i,
    /\bpeople who\b/i, /\beach\b/i,
  ]) expect(familyWords(3), `sufficient family is missing ${expression}`).toMatch(expression);
  for (const expression of [
    /\bthen\b/i, /\bmust\b/i, /\bnecessary\b/i, /\brequired\b/i, /\bonly\b/i,
    /\bonly if\b/i, /\bdepends\b/i, /\bneed\b/i, /\bneed to\b/i,
    /\bhave to\b/i, /\bessential\b/i, /\bprecondition\b/i,
  ]) expect(familyWords(5), `necessary family is missing ${expression}`).toMatch(expression);
  expect(step(3).textContent).toMatch(/in order to/i);
  expect(step(11).textContent).toMatch(/before/i);
});

it('retains a nearby focus target when the final construction action disappears', () => {
  const { step } = mount();
  const area = within(step(8));
  for (const name of ['Find the indicator', 'Draw the must arrow', 'Put winning on the left', 'Fill the remaining condition']) {
    const control = area.getByRole('button', { name });
    control.focus();
    fireEvent.click(control);
  }
  expect(document.activeElement).toBe(area.getByRole('button', { name: 'Reset the construction' }));
  expect(area.queryByRole('button', { name: 'Fill the remaining condition' })).toBeNull();
});

it('returns focus to the first answer when a retry clears its own control', () => {
  const { step } = mount();
  const question = step(1).querySelector<HTMLElement>('.cr-question')!;
  const area = within(question);
  const first = area.getAllByRole('button')[0];
  fireEvent.click(first);
  const retry = area.getByRole('button', { name: 'Try again' });
  retry.focus();
  fireEvent.click(retry);
  expect(document.activeElement).toBe(first);
  expect(area.queryByRole('button', { name: 'Try again' })).toBeNull();
});

it('returns focus to the first expression when a family example is cleared', () => {
  const { step } = mount();
  const area = within(step(3));
  const first = area.getByRole('button', { name: /^if$/ });
  fireEvent.click(first);
  const clear = area.getByRole('button', { name: 'Clear the example' });
  clear.focus();
  fireEvent.click(clear);
  expect(document.activeElement).toBe(first);
  expect(area.queryByRole('button', { name: 'Clear the example' })).toBeNull();
});

it('returns focus to the first target choice when target feedback is cleared', () => {
  const { step } = mount();
  const area = within(step(11).querySelector<HTMLElement>('.cr-target')!);
  const first = area.getAllByRole('button')[0];
  fireEvent.click(first);
  const clear = area.getByRole('button', { name: 'Clear the target' });
  clear.focus();
  fireEvent.click(clear);
  expect(document.activeElement).toBe(first);
  expect(area.queryByRole('button', { name: 'Clear the target' })).toBeNull();
});
