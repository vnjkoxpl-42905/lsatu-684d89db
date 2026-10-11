import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from '../content';
import { ConditionalLessonNote } from './ConditionalLessonNote';
import { diagramExamples, orderedConditionalIdeas, translationExamples } from './ConditionalOpeningLesson';

vi.mock('@/components/ui/dynamic-island-toc', () => ({ DynamicIslandTOC: () => null }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(id: string) {
  const unit = conditionalUnits.find(item => item.id === id)!;
  const complete = vi.fn();
  return { complete, ...render(<MemoryRouter><ConditionalLessonNote unit={unit} onComplete={complete} reviewed={false} continueHref="/guided" /></MemoryRouter>) };
}

function showPageFor(element: Element) {
  const panel = element.closest<HTMLElement>('[data-lesson-page]');
  if (!panel?.hidden) return;
  if (screen.queryByRole('button', { name: /Lesson pages/ })) fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  const navigation = screen.getByRole('navigation', { name: 'Lesson pages' });
  fireEvent.click(within(navigation).getAllByRole('button')[Number(panel.dataset.lessonPage)]);
  expect(panel.hidden).toBe(false);
}

function showLastPage() {
  const panels = document.querySelectorAll('[data-lesson-page]');
  showPageFor(panels[panels.length - 1]);
}

function choiceOrder(lab: HTMLElement) {
  return [...lab.querySelector('.co-choices')!.querySelectorAll('button')].map(button => button.textContent);
}

it('lets learners test a requirement before translating its word family', () => {
  const { container, complete } = mount('group-2');
  const section = container.querySelector<HTMLElement>('#co-read-it-as-a-requirement')!;
  showPageFor(section);
  const pause = within(section).getByRole('button', { name: 'Show the reasoning' });
  expect(within(section).queryByText(/Mina could have the membership and never borrow/)).toBeNull();
  fireEvent.click(pause);
  expect(within(section).getByText(/Mina could have the membership and never borrow/)).toBeTruthy();
  fireEvent.click(within(section).getByRole('button', { name: 'Uses recording booth' }));
  expect(within(section).getByText(/Putting use on the right would make a reservation enough/)).toBeTruthy();
  fireEvent.click(within(section).getByRole('button', { name: 'Has a reservation' }));
  expect(within(section).getByText(/Having a reservation still leaves open whether the person uses it/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Reduce animation in this lesson' })).toBeNull();
  expect(complete).not.toHaveBeenCalled();
});

it('orders complete ideas consistently while varying the correct position within every group', () => {
  for (const id of ['group-1', 'group-2']) {
    const targetPositions = new Set<number>();
    const leftPositions = new Set<number>();
    for (const item of translationExamples[id]) {
      const before = { ...item };
      const order = orderedConditionalIdeas(item);
      expect(new Set(order)).toEqual(new Set([item.target, item.other]));
      expect(orderedConditionalIdeas(item)).toEqual(order);
      expect(orderedConditionalIdeas({ ...item })).toEqual(order);
      expect(item).toEqual(before);
      targetPositions.add(order.indexOf(item.target));
    }
    for (const item of diagramExamples[id]) leftPositions.add(orderedConditionalIdeas(item).indexOf(item.left));
    expect(targetPositions).toEqual(new Set([0, 1]));
    expect(leftPositions).toEqual(new Set([0, 1]));
  }
});

it.each(['group-1', 'group-2'])('keeps %s target choices stable while learners change their answers', id => {
  const { complete } = mount(id);
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  const correctPositions = new Set<number>();
  for (const item of translationExamples[id]) {
    fireEvent.click(within(lab).getByRole('button', { name: item.word }));
    const order = choiceOrder(lab);
    expect(order).toEqual(orderedConditionalIdeas(item));
    correctPositions.add(order.indexOf(item.target));
    fireEvent.click(within(lab).getByRole('button', { name: item.other }));
    expect(choiceOrder(lab)).toEqual(order);
    fireEvent.click(within(lab).getByRole('button', { name: item.target }));
    expect(choiceOrder(lab)).toEqual(order);
  }
  expect(correctPositions).toEqual(new Set([0, 1]));
  expect(complete).not.toHaveBeenCalled();
});

it.each(['group-1', 'group-2'])('varies %s diagram choices and explains the promise each reversed arrow adds', id => {
  const { complete } = mount(id);
  const lab = screen.getByText('Build the diagram').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  const correctPositions = new Set<number>();
  for (const [index, item] of diagramExamples[id].entries()) {
    expect(within(lab).getByText(item.sentence)).toBeTruthy();
    const order = choiceOrder(lab);
    expect(order).toEqual(orderedConditionalIdeas(item));
    correctPositions.add(order.indexOf(item.left));
    fireEvent.click(within(lab).getByRole('button', { name: item.right }));
    fireEvent.click(within(lab).getByRole('button', { name: 'Check my diagram' }));
    expect(within(lab).getByText(item.reversedPromise)).toBeTruthy();
    expect(choiceOrder(lab)).toEqual(order);
    if (index < diagramExamples[id].length - 1) fireEvent.click(within(lab).getByRole('button', { name: 'Next sentence' }));
  }
  expect(correctPositions).toEqual(new Set([0, 1]));
  expect(complete).not.toHaveBeenCalled();
});

it('teaches inquiry and single-occasion wording before testing a recurring rule', () => {
  const { container, complete } = mount('group-1');
  const ifSection = container.querySelector<HTMLElement>('#co-if-the-starting-condition-can-come-last')!;
  showPageFor(ifSection);
  const whenSection = container.querySelector<HTMLElement>('#co-when-an-occasion-can-supply-enough-information')!;
  showPageFor(whenSection);
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  expect(ifSection.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(whenSection.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(ifSection).getByText(/You can read asked if as asked whether/)).toBeTruthy();
  expect(within(whenSection).getByText(/That reports what was true on one visit/)).toBeTruthy();
  expect(within(whenSection).getByText(/Whenever can express the same recurring relationship/)).toBeTruthy();

  showPageFor(ifSection);
  fireEvent.click(within(ifSection).getByRole('button', { name: 'A locked drawer guarantees an inquiry.' }));
  expect(within(ifSection).getByText(/You changed a report of a question into a rule about locked drawers/)).toBeTruthy();
  showPageFor(ifSection);
  fireEvent.click(within(ifSection).getByRole('button', { name: 'The drawer was locked.' }));
  expect(within(ifSection).getByText(/You treated the question as if it supplied its own answer/)).toBeTruthy();
  showPageFor(ifSection);
  fireEvent.click(within(ifSection).getByRole('button', { name: 'The archivist asked whether the drawer was locked.' }));
  expect(within(ifSection).getByText(/This preserves the inquiry/)).toBeTruthy();

  showPageFor(whenSection);
  fireEvent.click(within(whenSection).getByRole('button', { name: 'When I checked the gallery, a lamp was on.' }));
  expect(within(whenSection).getByText(/You treated one reported visit as a promise about every visit/)).toBeTruthy();
  showPageFor(whenSection);
  fireEvent.click(within(whenSection).getByRole('button', { name: 'Whenever the alarm sounds, the staff evacuate.' }));
  expect(within(whenSection).getByText(/Whenever states the recurring connection here/)).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it('renders each named opening method before the learner continues to guided practice', () => {
  for (const id of ['orientation', 'sufficient-necessary', 'group-1', 'group-2']) {
    const unit = conditionalUnits.find(item => item.id === id)!;
    const instructions = `${unit.method.join(' ')} ${unit.guidedExample.prompt}`;
    const { unmount } = mount(id);
    showLastPage();
    const guided = screen.getByRole('link', { name: /Continue to guided practice/ });
    for (const name of ['What Test', 'Personalized If/Then']) {
      if (!instructions.includes(name)) continue;
      const method = id === 'orientation' && name === 'What Test'
        ? screen.getByRole('heading', { hidden: true, name: /Use the What Test/ })
        : screen.getByText(name, { selector: 'strong' });
      expect(method.compareDocumentPosition(guided) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    unmount();
  }
});

it('gives each independently assigned group its own What Test explanation before target selection', () => {
  for (const id of ['group-1', 'group-2']) {
    const { unmount } = mount(id);
    const method = screen.getByText('What Test', { selector: 'strong' });
    const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
    expect(method.closest('p')?.textContent).toMatch(/Guest alone drops registration.*parent alone drops the signature/);
    expect(method.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();
  }
});

it('pauses on both directions of a Personalized If/Then instead of supplying a conclusion immediately', () => {
  const { complete } = mount('sufficient-necessary');
  const section = screen.getByRole('heading', { hidden: true, name: 'Try the sentence from the inside' }).closest<HTMLElement>('section')!;
  showPageFor(section);
  const pauses = within(section).getAllByRole('button', { name: 'Show the reasoning' });
  expect(pauses).toHaveLength(2);
  expect(within(section).queryByText(/I get a bicycle. The rule covers the case in which I win/)).toBeNull();
  expect(within(section).queryByText(/I could get a bicycle without winning/)).toBeNull();
  fireEvent.click(pauses[0]);
  expect(within(section).getByText(/I get a bicycle. The rule covers the case in which I win/)).toBeTruthy();
  expect(within(section).queryByText(/I could get a bicycle without winning/)).toBeNull();
  fireEvent.click(pauses[1]);
  expect(within(section).getByText(/I could get a bicycle without winning/)).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it('reuses the Personalized If/Then in Only if with a genuine check of the reverse', () => {
  const { container, complete } = mount('group-2');
  const section = container.querySelector<HTMLElement>('#co-only-if-a-condition-that-must-be-met')!;
  showPageFor(section);
  expect(within(section).getByText('Personalized If/Then', { selector: 'strong' })).toBeTruthy();
  const pauses = within(section).getAllByRole('button', { name: 'Show the reasoning' });
  expect(pauses).toHaveLength(2);
  fireEvent.click(pauses[0]);
  expect(within(section).getByText(/I've completed it. The sentence requires project completion/)).toBeTruthy();
  expect(within(section).queryByText(/I could complete the project without graduating/)).toBeNull();
  fireEvent.click(pauses[1]);
  expect(within(section).getByText(/I could complete the project without graduating/)).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it('renders the opening repair anchors with the assigned unit’s actual mistake and correction', () => {
  for (const id of ['orientation', 'sufficient-necessary', 'group-1', 'group-2']) {
    const unit = conditionalUnits.find(item => item.id === id)!;
    const { container, unmount } = mount(id);
    const repair = container.querySelector<HTMLElement>('section#repair')!;
    expect(repair).toBeTruthy();
    expect(container.querySelectorAll('#repair')).toHaveLength(1);
    expect(repair.querySelector('h2')?.textContent).toBeTruthy();
    expect(within(repair).getByText(unit.commonMistake.mistake)).toBeTruthy();
    expect(within(repair).getByText(unit.commonMistake.repair)).toBeTruthy();
    unmount();
  }
});

it('makes the invitation check distinguish the stated requirement from its tempting reverse', () => {
  const { complete } = mount('sufficient-necessary');
  const check = screen.getByRole('heading', { hidden: true, name: 'Every finalist receives an invitation. Which requirement does this sentence establish?' }).closest<HTMLElement>('.co-check')!;
  showPageFor(check);
  fireEvent.click(within(check).getByRole('button', { name: 'Being a finalist is necessary for receiving an invitation.' }));
  expect(within(check).getByText(/You reversed the requirement/)).toBeTruthy();
  expect(within(check).getByText(/allows someone who isn't a finalist to receive an invitation too/)).toBeTruthy();
  fireEvent.click(within(check).getByRole('button', { name: 'Receiving an invitation is necessary for being a finalist.' }));
  expect(within(check).getByText(/receiving one required for finalist status/)).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it.each(['group-1', 'group-2'])('reveals %s exact sentence targets only after a correct choice and clears them on a new example', id => {
  const { complete } = mount(id);
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  for (const item of translationExamples[id]) {
    fireEvent.click(within(lab).getByRole('button', { name: item.word }));
    expect(lab.querySelector('mark')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: item.other }));
    expect(lab.querySelector('mark')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: item.target }));
    expect(lab.querySelector('.co-sentence-target')?.textContent).toBe(item.sentenceTarget);
    expect(lab.querySelector('.co-sentence-indicator')?.textContent?.toLowerCase()).toBe(item.word);
    expect(lab.querySelector('blockquote')?.textContent).toBe(item.sentence);
    fireEvent.click(within(lab).getByRole('button', { name: `Show the ${id === 'group-1' ? 'sufficient condition on the left' : 'requirement on the right'}` }));
    expect(lab.querySelector('.co-arrow')?.textContent).toContain(item.left);
    expect(lab.querySelector('.co-arrow')?.textContent).toContain(item.right);
    fireEvent.click(within(lab).getByRole('button', { name: item.other }));
    expect(lab.querySelector('mark')).toBeNull();
    expect(lab.querySelector('.co-arrow')).toBeNull();
  }
  expect(complete).not.toHaveBeenCalled();
});

it.each(['group-1', 'group-2'])('marks %s transfer spans only after the learner checks a correct diagram', id => {
  mount(id);
  const lab = screen.getByText('Build the diagram').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  for (const [index, item] of diagramExamples[id].entries()) {
    fireEvent.click(within(lab).getByRole('button', { name: item.right }));
    fireEvent.click(within(lab).getByRole('button', { name: 'Check my diagram' }));
    expect(lab.querySelector('mark')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: item.left }));
    expect(lab.querySelector('mark')).toBeNull();
    fireEvent.click(within(lab).getByRole('button', { name: 'Check my diagram' }));
    expect(lab.querySelector('.co-sentence-target')?.textContent).toBe(item.sentenceTarget);
    expect(lab.querySelector('blockquote')?.textContent).toBe(item.sentence);
    if (index < diagramExamples[id].length - 1) {
      fireEvent.click(within(lab).getByRole('button', { name: 'Next sentence' }));
      expect(lab.querySelector('mark')).toBeNull();
    }
  }
});

it('keeps each hero specific to its lesson and gives group recall a single sentence-to-rule job', () => {
  const captions = new Set<string>();
  for (const id of ['orientation', 'sufficient-necessary', 'group-1', 'group-2']) {
    const { container, unmount } = mount(id);
    const figure = container.querySelector<HTMLElement>('header .co-hero-figure')!;
    expect(figure).toBeTruthy();
    expect(figure.querySelector('figcaption')?.textContent).toBeTruthy();
    captions.add(figure.querySelector('figcaption')!.textContent!);
    expect(container.querySelector('.co-hero-orbit')).toBeNull();
    if (id === 'orientation') {
      expect(figure.textContent).not.toMatch(/ready|packed|→/i);
    }
    if (id.startsWith('group-')) {
      expect(container.querySelectorAll('.co-flash')).toHaveLength(1);
      expect(container.querySelector('#co-return-to-the-relationship')).toBeNull();
    }
    expect(screen.queryByText('Think it through before revealing. Say what you know and why.')).toBeNull();
    unmount();
  }
  expect(captions.size).toBe(4);
});

it('keeps the entire connector in reserved space beneath a sentence whose later clause wraps', () => {
  const rect = (left: number, top: number, width: number, height: number) => ({
    left, top, right: left + width, bottom: top + height, x: left, y: top, width, height, toJSON: () => ({}),
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.matches('.co-target-sentence')) return rect(20, 200, 250, 290);
    if (this.matches('.co-target-sentence blockquote')) return rect(20, 200, 250, 200);
    return rect(0, 0, 0, 0);
  });
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function () {
    const bounds = this.matches('.co-sentence-indicator') ? rect(35, 215, 30, 30) : rect(125, 215, 70, 30);
    return [bounds] as unknown as DOMRectList;
  });
  mount('group-2');
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  fireEvent.click(within(lab).getByRole('button', { name: 'Member' }));
  // Marks finish at y=245, but a later sentence line continues to y=400.
  // The rail starts at 410 and remains above the caption, rather than crossing that line.
  expect(lab.querySelector('.co-target-connector path')?.getAttribute('d')).toBe('M 30 210 V 238 H 140 V 210');
  expect(lab.querySelector('blockquote')?.textContent).toBe('Only members are admitted.');
});

it('reports a correct negative answer without reversing its meaning in feedback', () => {
  const { complete } = mount('orientation');
  const check = screen.getByRole('heading', { hidden: true, name: "If I'm wearing a helmet, must I be riding a studio bike?" }).closest<HTMLElement>('.cr-question')!;
  showPageFor(check);
  fireEvent.click(within(check).getByRole('button', { name: 'No, I could wear one without riding.' }));
  expect(check.querySelector('.cr-correct strong')?.textContent).toBe('Correct.');
  expect(within(check).getByRole('status').textContent).toMatch(/helmet wearer waiting beside a bike/);
  fireEvent.click(within(check).getByRole('button', { name: 'Yes, the helmet proves riding.' }));
  expect(check.querySelector('.cr-correct')).toBeNull();
  expect(within(check).getByRole('status').textContent).toMatch(/Not quite.*does not make all helmet wearers riders/);
  expect(complete).not.toHaveBeenCalled();
});

it('teaches permission and instruction after the core sequence but before the preserved attached practice', () => {
  const { container, complete } = mount('orientation');
  const unit = conditionalUnits.find(item => item.id === 'orientation')!;
  const permissionItem = unit.drills.advanced.find(item => item.id === 'orientation-a1')!;
  const instructionItem = unit.drills.advanced.find(item => item.id === 'orientation-a3')!;
  expect(permissionItem.options[permissionItem.answerIndex]).toBe('Imani may request a copy.');
  expect(instructionItem.options[instructionItem.answerIndex]).toBe('The instruction calls for shutdown.');
  const section = container.querySelector<HTMLElement>('[data-reference-boundary]')!;
  showPageFor(section);
  const lastStep = container.querySelector<HTMLElement>('[data-reference-step="13"]')!;
  showLastPage();
  const guided = screen.getByRole('link', { name: /Continue to guided practice/ });
  expect(lastStep.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(section.compareDocumentPosition(guided) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  showPageFor(section);
  const permission = within(section).getByRole('heading', { name: 'Lena is a guest with a ticket. Do we know that she used the cloakroom?' }).closest<HTMLElement>('.cr-question')!;
  const instruction = within(section).getByRole('heading', { name: /The notice says: If a tray is empty/ }).closest<HTMLElement>('.cr-question')!;
  expect(within(permission).getByRole('status').textContent).toBe('');
  fireEvent.click(within(permission).getByRole('button', { name: 'Yes, the ticket establishes that she used it.' }));
  expect(within(permission).getByRole('status').textContent).toMatch(/permission into a completed action/);
  fireEvent.click(within(permission).getByRole('button', { name: 'No, we know she is allowed to use it.' }));
  expect(permission.querySelector('.cr-correct')).toBeTruthy();
  expect(within(permission).getByRole('status').textContent).toMatch(/Whether she used.*remains open/);
  fireEvent.click(within(instruction).getByRole('button', { name: 'The tray has been returned.' }));
  expect(within(instruction).getByRole('status').textContent).toMatch(/instruction into a completed action/);
  fireEvent.click(within(instruction).getByRole('button', { name: 'The instruction calls for returning the tray.' }));
  expect(instruction.querySelector('.cr-correct')).toBeTruthy();
  expect(within(instruction).getByRole('status').textContent).toMatch(/Whether someone returned it is a separate question/);
  fireEvent.click(within(instruction).getByRole('button', { name: 'The tray cannot be returned.' }));
  expect(within(instruction).getByRole('status').textContent).toMatch(/does not say a return is impossible/);
  expect(complete).not.toHaveBeenCalled();
});

it('builds from a hypothetical through enough and required roles before missing requirements and notation', () => {
  const { container, complete } = mount('orientation');
  const sections = [...container.querySelectorAll<HTMLElement>('[data-reference-step]')];
  expect([...new Set(sections.map(section => Number(section.dataset.referenceStep)))]).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  expect(sections[0].textContent).toMatch(/condition.*true or false.*conditional.*has to be true/s);
  expect(sections[1].textContent).toMatch(/Sufficient means enough/);
  expect(sections[3].textContent).toMatch(/Necessary means required/);
  expect(sections[0].compareDocumentPosition(sections[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(sections[3].compareDocumentPosition(sections[5]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(sections[5].compareDocumentPosition(sections[7]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelector('.co-if-inline strong')?.textContent).toBe('if');
  const diagramStage = sections.filter(section => section.dataset.referenceStep === '8').map(section => section.textContent).join(' ');
  expect(diagramStage).toMatch(/condition comes last.*still goes left/);
  expect(diagramStage).toMatch(/before required.*after requires.*still goes right/);
  expect(sections[7].textContent).toMatch(/does not mean.*caused.*later/);
  expect(complete).not.toHaveBeenCalled();
});

it('keeps correct target status readable without colour and uses a fresh the-only check', () => {
  const { complete } = mount('group-1');
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  fireEvent.click(within(lab).getByRole('button', { name: 'Submitted before noon' }));
  expect(lab.querySelector('.co-correct .co-answer-state')?.textContent).toBe('Correct target.');
  const check = screen.getByRole('heading', { hidden: true, name: 'The only notebooks kept on this shelf are hardback. Which diagram preserves the rule?' }).closest<HTMLElement>('.co-check')!;
  showPageFor(check);
  fireEvent.click(within(check).getByRole('button', { name: 'Hardback → Kept on shelf' }));
  expect(within(check).getByText(/it does not put every hardback notebook on this shelf/)).toBeTruthy();
  fireEvent.click(within(check).getByRole('button', { name: 'Kept on shelf → Hardback' }));
  expect(check.querySelector('.co-correct .co-answer-state')?.textContent).toBe('Correct.');
  expect(within(check).getByText(/A hardback notebook on another shelf would also fit/)).toBeTruthy();
  expect(complete).not.toHaveBeenCalled();
});

it('keeps inline contents before the lesson and visible during practice', () => {
  const { container, complete } = mount('group-2');
  const navigation = container.querySelector<HTMLElement>('.co-page-bar')!;
  const article = container.querySelector('[data-lesson-page]')!;
  expect(navigation.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const lab = screen.getByText('Which words does the expression refer to?').closest<HTMLElement>('.co-lab')!;
  showPageFor(lab);
  fireEvent.focus(within(lab).getByRole('button', { name: 'Member' }));
  fireEvent.click(within(lab).getByRole('button', { name: 'Member' }));
  expect(navigation.hidden).toBe(false);
  expect(complete).not.toHaveBeenCalled();
});

it('keeps animation implementation controls out of the student lesson', () => {
  const { container, complete } = mount('orientation');
  expect(screen.queryByRole('button', { name: 'Reduce animation in this lesson' })).toBeNull();
  expect(container.querySelector('.co-reading-preferences')).toBeNull();
  expect(container.querySelector('.co-motion-toggle')).toBeNull();
  expect(screen.queryByText('The same setting applies to the explanations, diagrams, and cards.')).toBeNull();
  expect(complete).not.toHaveBeenCalled();
});

it('animates the IF explanation only while it is in view and keeps its hypothetical meaning unchanged', () => {
  let visibility: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof visibility) { visibility = callback; }
    observe = observe;
    disconnect = vi.fn();
  });
  const { container, complete } = mount('orientation');
  const figure = container.querySelector<HTMLElement>('.co-if-connection')!;
  const caption = figure.querySelector('figcaption')?.textContent;
  expect(observe).toHaveBeenCalledWith(figure);
  expect(figure.getAttribute('data-in-view')).toBe('false');
  act(() => visibility!([{ isIntersecting: true }]));
  expect(figure.getAttribute('data-in-view')).toBe('true');
  expect(figure.querySelector('figcaption')?.textContent).toBe(caption);
  expect(caption).toContain("Imagining that case doesn't tell us it happened.");
  act(() => visibility!([{ isIntersecting: false }]));
  expect(figure.getAttribute('data-in-view')).toBe('false');
  expect(figure.querySelector('figcaption')?.textContent).toBe(caption);
  expect(complete).not.toHaveBeenCalled();
});


it('uses denial of permission, rather than non-entry, to refute the reverse permission rule', () => {
  const { container } = mount('group-1');
  const heading = [...container.querySelectorAll('h3')].find(node => node.textContent === 'You learn that a vehicle was permitted inside. What does the sentence tell you about it?')!;
  showPageFor(heading);
  const pause = heading.closest<HTMLElement>('.co-think-pause')!;
  expect(pause.textContent).not.toContain('not permitted inside would fit');
  fireEvent.click(within(pause).getByRole('button', { name: 'Show the reasoning' }));
  expect(pause.textContent).toContain('An electric vehicle that is not permitted inside would fit the rule.');
  expect(pause.textContent).toContain('Whether a vehicle actually enters is a separate question.');
  expect(pause.textContent).not.toContain('electric vehicle that remains outside');
});
