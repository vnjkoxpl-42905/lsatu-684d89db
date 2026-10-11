import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { conditionalUnits } from '../content';
import { ConditionalLessonNote } from './ConditionalLessonNote';
import { diagramExamples, flashcardExamples } from './ConditionalOpeningLesson';
vi.mock('@/components/ui/dynamic-island-toc', () => ({ DynamicIslandTOC: () => null }));
afterEach(cleanup);

function mount(id: string) {
  const unit = conditionalUnits.find(item => item.id === id)!;
  const complete = vi.fn();
  const view = render(<MemoryRouter><ConditionalLessonNote unit={unit} onComplete={complete} reviewed={false} continueHref="/guided" /></MemoryRouter>);
  return { unit, complete, ...view };
}

function showPageFor(element: Element) {
  const panel = element.closest<HTMLElement>('[data-lesson-page]');
  if (!panel?.hidden) return;
  if (screen.queryByRole('button', { name: /Lesson pages/ })) fireEvent.click(screen.getByRole('button', { name: /Lesson pages/ }));
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Lesson pages' })).getAllByRole('button')[Number(panel.dataset.lessonPage)]);
  expect(panel.hidden).toBe(false);
}
function showLastPage() {
  const pages = document.querySelectorAll('[data-lesson-page]');
  showPageFor(pages[pages.length - 1]);
}
function showTargetPractice() {
  showPageFor(screen.getByText('Which words does the expression refer to?'));
}

it('keeps the full orientation formative until the student marks the lesson read', () => {
  const { container, complete } = mount('orientation');
  expect(screen.getByRole('heading', { name: 'What Are Conditionals?' })).toBeTruthy();
  const cases = container.querySelector<HTMLElement>('.cr-cases')!;
  showPageFor(cases);
  fireEvent.click(within(cases).getByRole('button', { name: /Necessary present/ }));
  expect(within(cases).getByRole('status').textContent).toBe('');
  fireEvent.click(within(cases).getByRole('button', { name: 'Winning the raffle is not settled.' }));
  expect(within(cases).getByRole('status').textContent).toMatch(/with or without winning the raffle/);
  expect(screen.queryByText(/dogs|mammals/)).toBeNull();
  expect(complete).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Mark lesson as read' })).toBeNull();
  showLastPage();
  fireEvent.click(screen.getByRole('button', { name: 'Mark lesson as read' }));
  expect(complete).toHaveBeenCalledOnce();
});

it('mounts the thirteen reference steps before the attached guided activity', () => {
  const { container, complete } = mount('orientation');
  const sections = [...container.querySelectorAll<HTMLElement>('[data-reference-step]')];
  expect([...new Set(sections.map(section => Number(section.dataset.referenceStep)))]).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
  showLastPage();
  const guided = screen.getByRole('link', { name: /Continue to guided practice/ });
  expect(sections[12].compareDocumentPosition(guided) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelector('.co-hero-orbit')).toBeNull();
  expect(complete).not.toHaveBeenCalled();
});

it('checks each Group 2 target before revealing direction and preserves obligations', () => {
  mount('group-2');
  showTargetPractice();
  fireEvent.click(screen.getByRole('button', { name: 'must' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Required to attend interview' })[0]);
  expect(screen.getByText(/does not establish that every finalist complied/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show the requirement on the right' }));
  expect(screen.getByText('Required to attend interview', { selector: '.co-arrow span' })).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
});

it('sequences language before later inference and retains stable assignment IDs', () => {
  expect(conditionalUnits.slice(0, 4).map(unit => unit.id)).toEqual(['orientation', 'sufficient-necessary', 'group-1', 'group-2']);
  for (const id of ['group-1', 'group-2']) {
    const unit = conditionalUnits.find(item => item.id === id)!;
    expect(unit.method.join(' ')).not.toMatch(/contrapositive/);
    expect(unit.guidedExample.prompt).not.toMatch(/six steps|contrapose/);
  }
});

it('distinguishes a chain rule from the new facts established by adding a case', () => {
  mount('direct-linking');
  expect(screen.getByText('Every calibrated meter is listed.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Add: Meter D is calibrated' }));
  expect(screen.getByText('Meter D is registered and listed.')).toBeTruthy();
});

it('uses the same original order scenario for sufficient and necessary roles', () => {
  mount('sufficient-necessary');
  expect(screen.getByText(/Winning the raffle is enough/)).toBeTruthy();
  expect(screen.getByText(/Getting one is the required result/)).toBeTruthy();
  expect(screen.queryByText(/dogs|mammals/)).toBeNull();
  const overview = screen.getByText('Winning is sufficient. Getting a bicycle is necessary.', { selector: 'title' }).closest('svg');
  expect(overview?.getAttribute('role')).toBe('img');
  expect(overview?.getAttribute('aria-labelledby')).toBe('co-order-overview-title co-order-overview-desc');
});

it('resets lesson interactions when the production wrapper changes units', () => {
  const group1 = conditionalUnits.find(unit => unit.id === 'group-1')!;
  const group2 = conditionalUnits.find(unit => unit.id === 'group-2')!;
  const props = { onComplete: vi.fn(), reviewed: false, continueHref: '/guided' };
  const { rerender } = render(<MemoryRouter><ConditionalLessonNote unit={group1} {...props}/></MemoryRouter>);
  showTargetPractice();
  fireEvent.click(screen.getAllByRole('button', { name: 'Submitted before noon' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Show the sufficient condition on the left' }));
  expect(screen.getByText('Submitted before noon', { selector: '.co-lab .co-arrow span' })).toBeTruthy();
  rerender(<MemoryRouter><ConditionalLessonNote unit={group2} {...props}/></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Show the requirement on the right' })).toBeNull();
  expect(screen.queryByText('Submitted before noon')).toBeNull();
  expect(screen.queryByText(/You have the complete target/)).toBeNull();
});

it('does not reveal the four-case conclusions before a formative attempt and clears them on reset', () => {
  const { container } = mount('orientation');
  const lab = container.querySelector<HTMLElement>('.cr-cases')!;
  showPageFor(lab);
  expect(within(lab).getByRole('status').textContent).toBe('');
  expect(lab.querySelector('.cr-case-review')).toBeNull();
  fireEvent.click(within(lab).getByRole('button', { name: 'You get a bicycle.' }));
  expect(lab.querySelector('.cr-correct')).toBeTruthy();
  fireEvent.click(within(lab).getByRole('button', { name: 'Reset the four cases' }));
  expect(within(lab).getByRole('status').textContent).toBe('');
});

it('keeps recall prompts readable and exposes answers through an expanded control', () => {
  mount('group-1');
  expect(screen.getByText('An oven light comes on if the door is opened.')).toBeTruthy();
  showPageFor(screen.getByText('An oven light comes on if the door is opened.'));
  const reveal = screen.getByRole('button', { name: 'Reveal answer' });
  expect(reveal.getAttribute('aria-expanded')).toBe('false');
  expect(reveal.getAttribute('aria-controls')).toBeTruthy();
  fireEvent.click(reveal);
  expect(screen.getByText('If the oven door is opened, then its light comes on.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hide answer' }).getAttribute('aria-expanded')).toBe('true');
  expect(screen.queryByRole('button', { name: 'Reveal recall explanation' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }));
  expect(screen.getByRole('button', { name: 'Reveal answer' }).getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('If the oven door is opened, then its light comes on.')).toBeNull();
});

it('provides separate original transfer banks without repeating recorded drills', () => {
  const transfer = [...Object.values(diagramExamples).flat(), ...Object.values(flashcardExamples).flat()];
  expect(transfer).toHaveLength(28);
  expect(new Set(transfer.map(item => item.sentence)).size).toBe(28);
  const drills = conditionalUnits.flatMap(unit => Object.values(unit.drills).flat()).map(item => item.prompt);
  for (const item of transfer) expect(drills).not.toContain(item.sentence);
});

it('gives each formative choice its own reasoning without marking the lesson read', () => {
  for (const id of ['orientation', 'sufficient-necessary', 'group-1', 'group-2']) {
    const { container, complete, unmount } = mount(id);
    const checks = [...container.querySelectorAll<HTMLElement>('.co-check:not(.cr-integrated-item)')];
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      showPageFor(check);
      const answerOptions = check.querySelector<HTMLElement>('.cr-answer-options, .co-choices')!;
      const choices = within(answerOptions).getAllByRole('button');
      const explanations: string[] = [];
      for (const choice of choices) {
        fireEvent.click(choice);
        const feedback = check.querySelector('.co-feedback, .cr-feedback');
        expect(feedback?.textContent?.trim()).toBeTruthy();
        explanations.push(feedback!.textContent!);
      }
      expect(new Set(explanations).size).toBe(choices.length);
    }
    expect(complete).not.toHaveBeenCalled();
    unmount();
  }
});

it('names the attached guided activity and permits a truthful preview-only label', () => {
  const { unmount } = mount('group-1');
  showLastPage();
  expect(screen.getByRole('link', { name: /Continue to guided practice/ }).getAttribute('href')).toBe('/guided');
  unmount();
  const unit = conditionalUnits.find(item => item.id === 'group-1')!;
  render(<MemoryRouter><ConditionalLessonNote unit={unit} onComplete={vi.fn()} reviewed={false} continueHref="/preview" continueLabel="Preview next lesson"/></MemoryRouter>);
  showLastPage();
  expect(screen.getByRole('link', { name: /Preview next lesson/ }).getAttribute('href')).toBe('/preview');
});
