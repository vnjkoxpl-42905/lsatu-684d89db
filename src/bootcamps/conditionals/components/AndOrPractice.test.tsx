import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AndOrDrill } from './AndOrPractice';
import { AndOrLesson } from './AndOrLessons';
import { andOrDrills, andOrQuizzes } from '../content/andOrItems';
import { choiceStep } from '../content/andOrTasks';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const meaning = andOrDrills[0];
const optionFor = (itemIndex: number, correct: boolean) => choiceStep(meaning.items[itemIndex])!.options.filter(option => option.correct === correct);
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }));

it('gives a hint for the chosen wrong answer before any reveal, and unlocks the answer only after a second miss', () => {
  render(<AndOrDrill setId={meaning.id} run/>);
  const [first, second] = optionFor(0, false);
  expect(screen.queryByRole('button', { name: /Show me the answer/ })).toBeNull();
  press(first.text);
  expect(screen.getByText('Not that one.')).toBeVisible();
  expect(screen.getByText(first.hint)).toBeVisible();
  expect(screen.queryByText(meaning.items[0].why)).toBeNull();
  expect(screen.queryByRole('button', { name: /Show me the answer/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Next question/ })).toBeDisabled();
  press(second.text);
  expect(screen.getByText(second.hint)).toBeVisible();
  expect(screen.queryByText(meaning.items[0].why)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show me the answer' }));
  expect(screen.getByText(/counts as completed, not as answered correctly/)).toBeVisible();
  expect(screen.getByText(new RegExp(meaning.items[0].why.slice(0, 30)))).toBeVisible();
  expect(screen.getByRole('button', { name: /Next question/ })).toBeEnabled();
  // A revealed question completes the step but is not scored as correct, and 100% needs every question.
  expect(screen.getByRole('progressbar', { name: 'Drill progress' }).getAttribute('aria-valuenow')).toBe('1');
  expect(screen.getByText(/17%/)).toBeVisible();
});

it('shows full reasoning on a correct answer and resumes saved attempts from the same device', () => {
  const view = render(<AndOrDrill setId={meaning.id} run/>);
  press(optionFor(0, false)[0].text);
  view.unmount();
  render(<AndOrDrill setId={meaning.id} run/>);
  expect(screen.getByText('Not that one.')).toBeVisible();
  expect(screen.getByText('Not this one')).toBeVisible();
  press(optionFor(0, true)[0].text);
  expect(screen.getByText(meaning.items[0].why)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  expect(screen.getByRole('heading', { name: 'Question 2 of 6' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Previous question/ })).toBeEnabled();
});

it('offers one question map and moves focus to the feedback', () => {
  render(<AndOrDrill setId={meaning.id} run/>);
  expect(screen.getAllByRole('navigation', { name: 'Question map' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Question 1, current' })).toHaveAttribute('aria-current', 'step');
  press(optionFor(0, true)[0].text);
  expect(document.activeElement).toBe(screen.getByText('Yes.').closest('[role=status]'));
  fireEvent.click(screen.getByRole('button', { name: 'Question 4' }));
  expect(screen.getByRole('heading', { name: 'Question 4 of 6' })).toBeVisible();
});

const transfer = andOrDrills[3];
const openBuildItem = () => {
  render(<AndOrDrill setId={transfer.id} run/>);
  fireEvent.click(screen.getByRole('button', { name: 'Question 3' }));
};

it('starts every fresh short-version field blank and uses the draft in the builder', () => {
  openBuildItem();
  const fields = screen.getAllByRole('textbox');
  expect(fields).toHaveLength(3);
  for (const field of fields) expect(field).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  fireEvent.change(fields[0], { target: { value: 'Slip signed' } });
  fireEvent.change(fields[1], { target: { value: 'Parent attends' } });
  fireEvent.change(fields[2], { target: { value: 'Gets a seat' } });
  expect(screen.getByText(/Compare with ours/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getAllByRole('button', { name: 'NOT off' })).toHaveLength(3);
  expect(screen.getAllByText('Slip signed').length).toBeGreaterThan(0);
});

it('rejects a single-letter short version and a duplicate one', () => {
  openBuildItem();
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'S' } });
  fireEvent.change(fields[1], { target: { value: 'Parent attends' } });
  fireEvent.change(fields[2], { target: { value: 'Parent attends' } });
  expect(screen.getByText(/A single letter does not keep its meaning/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
});

function buildThroughDiagram() {
  const fields = screen.getAllByRole('textbox');
  fireEvent.change(fields[0], { target: { value: 'Slip signed' } });
  fireEvent.change(fields[1], { target: { value: 'Parent attends' } });
  fireEvent.change(fields[2], { target: { value: 'Gets a seat' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
}
const row = (label: string) => screen.getAllByText(label).map(node => node.closest('.ao-build-row')).find(Boolean) as HTMLElement;

it('checks a built diagram by structure, hints at the mistake, and clears the build when the wording changes', () => {
  openBuildItem();
  buildThroughDiagram();
  // Both conditions on the right: an obvious structural miss, with no answer given away.
  for (const label of ['Slip signed', 'Parent attends', 'Gets a seat']) fireEvent.click(within(row(label)).getByRole('button', { name: 'Right' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByText('Not yet.')).toBeVisible();
  expect(screen.queryByText(/Show me the arrangement/)).toBeNull();
  fireEvent.click(within(row('Slip signed')).getByRole('button', { name: 'Left' }));
  fireEvent.click(within(row('Parent attends')).getByRole('button', { name: 'Left' }));
  fireEvent.click(screen.getByRole('button', { name: 'AND' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByText(/Check the connector on the left side/)).toBeVisible();
  // One structural miss so far; an unplaced board never counted as a miss.
  expect(screen.queryByRole('button', { name: 'Show me the arrangement' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'OR' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.getByText('That works.')).toBeVisible();
  // Return to the wording and edit it: the arrangement and its accepted check go, the text stays.
  fireEvent.click(screen.getByRole('button', { name: /1\. Short versions/ }));
  const fields = screen.getAllByRole('textbox');
  expect(fields[0]).toHaveValue('Slip signed');
  fireEvent.change(fields[0], { target: { value: 'Permission slip signed' } });
  expect(fields[0]).toHaveValue('Permission slip signed');
  expect(fields[1]).toHaveValue('Parent attends');
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.queryByText('That works.')).toBeNull();
  for (const label of ['Permission slip signed', 'Parent attends', 'Gets a seat']) {
    const toggles = within(row(label)).getAllByRole('button');
    expect(toggles.filter(button => button.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
  }
});

it('lets a revealed build step complete without calling it built correctly', () => {
  openBuildItem();
  buildThroughDiagram();
  fireEvent.click(within(row('Slip signed')).getByRole('button', { name: 'Left' }));
  fireEvent.click(within(row('Parent attends')).getByRole('button', { name: 'Right' }));
  fireEvent.click(within(row('Gets a seat')).getByRole('button', { name: 'Right' }));
  expect(screen.queryByRole('button', { name: 'Show me the arrangement' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  expect(screen.queryByRole('button', { name: 'Show me the arrangement' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check this step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show me the arrangement' }));
  expect(screen.getByText(/counts as completed, not as built correctly/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeVisible();
});

it('runs each lesson’s Pop Quiz one question at a time with a specific hint', () => {
  for (const id of Object.keys(andOrQuizzes)) {
    const view = render(<MemoryRouter><AndOrLesson id={id}/></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Pop Quiz' })).toBeVisible();
    expect(screen.getByText('Question 1 of 4')).toBeVisible();
    const item = andOrQuizzes[id][0];
    const options = choiceStep(item)!.options;
    const wrong = options.find(option => !option.correct)!;
    fireEvent.click(within(screen.getByRole('region', { name: 'Pop Quiz' })).getByRole('button', { name: new RegExp(`^${wrong.text.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }));
    expect(screen.getByText(wrong.hint)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Next question/ })).toBeNull();
    view.unmount();
  }
});
