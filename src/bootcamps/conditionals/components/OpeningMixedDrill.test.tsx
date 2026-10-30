import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setImmediate as yieldToWorker } from 'node:timers/promises';
import { OpeningMixedDrill, openingDiagramItems } from './OpeningMixedDrill';
import { completeConditionItems, equivalenceItems, transferItems, confirmationItemsByError, obligationConfirmationItem } from '../content/mixedDrillItems';
import { mixedFamilyItems } from './MixedFamilyPractice';

// Real event-loop turns let the worker receive runner acknowledgements during long UI traversals.
beforeEach(async () => { await yieldToWorker(); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await yieldToWorker(); });
const active = () => within(document.querySelector<HTMLElement>('[data-mixed-question]:not([hidden])')!);
const next = () => {
  fireEvent.click(screen.getByRole('button', { name: /^(Next question|Try a fresh case|Review practice|Finish practice)$/ }));
  const proceed = screen.queryByRole('button', { name: 'Continue' });
  if (proceed) fireEvent.click(proceed);
};
function renderPractice() {
  const view = render(<OpeningMixedDrill/>);
  return view;
}
function choose(option: string) {
  fireEvent.click(active().getByRole('button', { name: option }));
  fireEvent.click(active().getByRole('button', { name: 'Check answer' }));
}
function solve(index: number) {
  if (index < 3) return choose(completeConditionItems[index].options[completeConditionItems[index].correct]);
  if (index < 10) {
    const item = openingDiagramItems[index - 3];
    fireEvent.click(active().getByRole('button', { name: 'Choose the left condition' }));
    fireEvent.click(active().getByRole('button', { name: item.left }));
    fireEvent.click(active().getByRole('button', { name: 'Choose the right condition' }));
    fireEvent.click(active().getByRole('button', { name: item.right }));
    return fireEvent.click(active().getByRole('button', { name: 'Check answer' }));
  }
  if (index < 16) {
    const item = mixedFamilyItems[index - 10];
    fireEvent.change(active().getByLabelText('Your diagram'), { target: { value: `${item.left} → ${item.right}` } });
    fireEvent.change(active().getByLabelText('Read it in English'), { target: { value: item.readback } });
    fireEvent.click(active().getByRole('button', { name: 'Compare with the choices' }));
    fireEvent.click(active().getByRole('button', { name: item.target }));
    fireEvent.click(active().getByRole('button', { name: item.left }));
    return fireEvent.click(active().getByRole('button', { name: 'Check answer' }));
  }
  const item = index < 20 ? equivalenceItems[index - 16] : transferItems[index - 20];
  choose(item.options[item.correct]);
}

it('shows one task, a single 24-question counter, progress and predictable heading focus', async () => {
  render(<StrictMode><OpeningMixedDrill/></StrictMode>);
  expect(screen.getByRole('heading', { name: 'What does the rule cover?' })).not.toHaveFocus();
  expect(screen.getByRole('group', { name: 'Answer choices' })).toBeVisible();
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Begin practice' })).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Choose the left condition' })).toBeNull();
  choose(completeConditionItems[0].options[0]);
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByText(completeConditionItems[0].feedback[0])).toBeVisible();
  choose(completeConditionItems[0].options[completeConditionItems[0].correct]);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  next();
  expect(screen.getByRole('heading', { name: 'What does the rule cover?' })).toHaveFocus();
  expect(screen.getByText('Question 2 of 24')).toBeVisible();
  expect(screen.queryByText(completeConditionItems[0].sentence)).not.toBeVisible();
});

it('reuses the real reviewed diagram engine without its own count, storage or untaught transformations', async () => {
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  renderPractice();
  for (let index = 0; index < 3; index++) { solve(index); next(); await yieldToWorker(); }
  expect(screen.getByText('Question 4 of 24')).toBeVisible();
  expect(screen.getByText(openingDiagramItems[0].prompt)).toBeVisible();
  expect(screen.queryByText(/Statement 1 of|Sentence 1 of|Contrapositive/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /^Not / })).toBeNull();
  solve(3);
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
  next();
  expect(screen.getByText(openingDiagramItems[1].prompt)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(active().getByRole('status')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it('keeps independent writing before supplied labels and retains it across questions', async () => {
  renderPractice();
  for (let index = 0; index < 10; index++) { solve(index); next(); await yieldToWorker(); }
  expect(screen.getByText('Question 11 of 24')).toBeVisible();
  expect(active().queryByRole('button', { name: mixedFamilyItems[0].target })).toBeNull();
  expect(active().getByRole('button', { name: 'Compare with the choices' })).toBeDisabled();
  solve(10);
  expect(active().getByText(`Read it back: ${mixedFamilyItems[0].readback}`)).toBeVisible();
  next();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(active().getByLabelText('Read it in English')).toHaveValue(mixedFamilyItems[0].readback);
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
});

// These full-run checks traverse 24 retained question panels plus review. Their budget
// includes real event-loop yields on the Windows harness; it is not a UI latency assertion.
it('freezes first checks and treats a repaired fresh answer differently from an independent confirmation', async () => {
  renderPractice();
  choose(completeConditionItems[0].options[0]);
  for (let index = 0; index < 24; index++) { solve(index); next(); await yieldToWorker(); }
  const fresh = confirmationItemsByError.qualification[0];
  expect(screen.getByText('Fresh check 1 of 1')).toBeVisible();
  expect(screen.getByRole('progressbar', { name: 'Fresh checks completed' })).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByText('Fresh check 1 of 1')).toBeVisible();
  expect(screen.getByText(fresh.sentence)).toBeVisible();
  expect(screen.queryByText(completeConditionItems[0].sentence)).not.toBeVisible();
  choose(fresh.options[(fresh.correct + 1) % fresh.options.length]);
  expect(screen.getByRole('button', { name: 'Finish practice' })).toBeDisabled();
  choose(fresh.options[fresh.correct]);
  next();
  expect(screen.getByText('You answered 23 of 24 correctly on your first try. You corrected 1 after checking the explanation.')).toBeVisible();
  expect(screen.getByText(/Who or what the rule covers: you corrected the new question after checking the explanation/)).toBeVisible();
  expect(screen.queryByText(/you answered the new question correctly on your first try/)).toBeNull();
  expect(screen.getByText(/Your written translations are for you to compare with the examples/)).toBeVisible();
  expect(document.querySelector('[data-mixed-question="mixed-independent-1"] textarea')).toHaveValue(`${mixedFamilyItems[0].left} → ${mixedFamilyItems[0].right}`);
  fireEvent.click(screen.getByRole('button', { name: 'Review my answers' }));
  for (let index = 0; index < 10; index++) { next(); await yieldToWorker(); }
  expect(active().getByLabelText('Your diagram')).toHaveValue(`${mixedFamilyItems[0].left} → ${mixedFamilyItems[0].right}`);
  expect(active().getByLabelText('Read it in English')).toHaveValue(mixedFamilyItems[0].readback);
  expect(active().getByText(`Read it back: ${mixedFamilyItems[0].readback}`)).toBeVisible();
}, 60000);

it('groups a wrong role choice with a new direction question instead of a qualification question', async () => {
  renderPractice();
  choose(completeConditionItems[0].options[2]);
  for (let index = 0; index < 24; index++) { solve(index); next(); await yieldToWorker(); }
  expect(screen.getByText(confirmationItemsByError.direction[0].sentence)).toBeVisible();
  expect(screen.queryByText(confirmationItemsByError.qualification[0].sentence)).toBeNull();
});

it('explains repeated diagram conditions and follows them with a fresh diagram check', async () => {
  renderPractice();
  for (let index = 0; index < 3; index++) { solve(index); next(); await yieldToWorker(); }
  fireEvent.click(active().getByRole('button', { name: 'Mia trains' }));
  fireEvent.click(active().getByRole('button', { name: 'Mia trains' }));
  fireEvent.click(active().getByRole('button', { name: 'Choose the right condition' }));
  fireEvent.click(active().getByRole('button', { name: 'Mia qualifies' }));
  fireEvent.click(active().getByRole('button', { name: 'Check answer' }));
  expect(active().getByText(/Extra or repeated words change the diagram/)).toBeVisible();
  expect(active().queryByText(/Mia trains on the left/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(active().getByRole('button', { name: 'Try again' }));
  for (let index = 3; index < 24; index++) { solve(index); next(); await yieldToWorker(); }
  expect(screen.getByText(confirmationItemsByError.direction[0].sentence)).toBeVisible();
  expect(screen.queryByText(confirmationItemsByError.qualification[0].sentence)).toBeNull();
});

it('checks an obligation mistake with a new obligation case rather than a different equivalence skill', async () => {
  renderPractice();
  for (let index = 0; index < 23; index++) { solve(index); next(); await yieldToWorker(); }
  choose(transferItems[3].options[0]);
  solve(23);
  expect(screen.getByRole('button', { name: 'Try a fresh case' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Review practice' })).toBeNull();
  next();
  expect(screen.getByText(obligationConfirmationItem.sentence)).toBeVisible();
  expect(screen.queryByText(confirmationItemsByError.equivalence[0].sentence)).toBeNull();
  choose(obligationConfirmationItem.options[obligationConfirmationItem.correct]);
  next();
  expect(screen.getByText(/What is required and what actually happened: you answered the new question correctly on your first try/)).toBeVisible();
});

it('continues directly to the next stage without repeating instructions', async () => {
  renderPractice();
  for (let index = 0; index < 2; index++) { solve(index); next(); await yieldToWorker(); }
  solve(2);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: 'Build the diagram' })).toBeVisible();
  expect(screen.queryByText('If a parcel has a blue sticker, it has been inspected.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  expect(screen.getByRole('progressbar')).toBeVisible();
  expect(screen.getByText('Question 4 of 24')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Choose the left condition' })).toBeVisible();
});

it('offers review directly when no first-attempt errors need a fresh case', async () => {
  renderPractice();
  for (let index = 0; index < 23; index++) { solve(index); next(); await yieldToWorker(); }
  solve(23);
  expect(screen.getByRole('button', { name: 'Review practice' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Try a fresh case' })).toBeNull();
  next();
  expect(screen.getByRole('heading', { name: 'Review your practice' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'How the new sentences went' })).toBeNull();
}, 60000);

it('returns focus to the first answer when an incorrect choice is retried', async () => {
  renderPractice();
  choose(completeConditionItems[0].options[0]);
  const retry = active().getByRole('button', { name: 'Try this question again' });
  retry.focus();
  fireEvent.click(retry);
  expect(active().getByRole('button', { name: completeConditionItems[0].options[0] })).toHaveFocus();
  expect(active().queryByRole('button', { name: 'Try this question again' })).toBeNull();
  expect(active().getByRole('button', { name: 'Check answer' })).toBeDisabled();
});

it('builds diagrams from full condition labels and gives only a hint for a reversed arrow', async () => {
  renderPractice();
  for (let index = 0; index < 3; index++) { solve(index); next(); await yieldToWorker(); }
  expect(active().queryByRole('button', { name: 'trains' })).toBeNull();
  fireEvent.click(active().getByRole('button', { name: 'Mia qualifies' }));
  fireEvent.click(active().getByRole('button', { name: 'Choose the right condition' }));
  fireEvent.click(active().getByRole('button', { name: 'Mia trains' }));
  fireEvent.click(active().getByRole('button', { name: 'Check answer' }));
  const diagram = document.querySelector('[data-mixed-question]:not([hidden]) .omd-diagram')!;
  expect(diagram).toHaveAttribute('data-result', 'wrong');
  const feedback = diagram.querySelector('.cir-feedback')!;
  expect(feedback.querySelector('p')).toHaveTextContent('Check which condition is enough to prove the other.');
  expect(feedback.textContent).not.toMatch(/Training is enough|If Mia trains/);
  fireEvent.click(active().getByRole('button', { name: 'Try again' }));
  solve(3);
  expect(diagram).toHaveAttribute('data-result', 'right');
  expect(diagram.querySelector('.cir-feedback p')).toHaveTextContent('Right. Read it back: If Mia trains, she qualifies.');
  expect(diagram.querySelector('.cir-feedback')).toHaveTextContent(/Training is enough under this rule/);
});

it('maps the shared one-word diagram labels to full condition labels', async () => {
  expect(openingDiagramItems.map(item => [item.left, item.right])).toEqual([
    ['Mia trains', 'Mia qualifies'], ['Person is a dancer', 'Person stretches'], ['Student is admitted', 'Student is a senior'],
    ['Person votes', 'Person is a member'], ['Bridge opens', 'Bridge has been inspected'], ['There is funding', 'There is approval'], ['Person is a hiker', 'Person brings a map'],
  ]);
});
