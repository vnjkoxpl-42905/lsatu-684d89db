import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OpeningCourseContent } from './OpeningCourseContent';
import { DrillOneEntry, DrillOneExperience, type DrillOneQuestion } from './DrillOneExperience';
import { CourseProgressProvider, type CourseProgressStore } from '../courseProgress';
import { useDeviceCourseProgress } from '../courseProgress';
import { useCallback } from 'react';

afterEach(cleanup);

// Rule-vs-fact questions first, then the concept checks, then indicators.
const correctAnswers = [1, 2, 0, 0, 2, 0, 1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 1, 0, 2, 1, 0, 2, 1, 2];
const answerOptions = () => within(screen.getByRole('group')).getAllByRole('button');
const check = () => fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));

it('requires a deliberate check before feedback, diagrams, progress or forward navigation', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  expect(screen.getByRole('heading', { name: 'Does the rule itself tell us that you actually win the raffle?' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  fireEvent.click(answerOptions()[1]);
  expect(screen.queryByText('Correct.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  check();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveAccessibleDescription(/Imagining a win helps/);
  expect(screen.getByText('Read the rule left to right')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
});

it('gives a hint for a wrong answer without marking or naming the correct option', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  fireEvent.click(answerOptions()[0]);
  check();
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  expect(screen.getByText(/You added a case fact/)).toBeVisible();
  expect(screen.queryByText(/The correct answer is marked above/)).toBeNull();
  expect(screen.queryByText('Correct answer')).toBeNull();
  expect(answerOptions().filter(option => option.getAttribute('data-correct') === 'true')).toHaveLength(0);
  expect(answerOptions()[0]).toHaveAttribute('data-incorrect', 'true');
  expect(screen.queryByText('Read the rule left to right')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
});

it('retains the first answer through repair and restores focus to an enabled choice', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  fireEvent.click(answerOptions()[0]);
  check();
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(answerOptions()[0]).toHaveFocus();
  expect(answerOptions()[0]).toBeEnabled();
  expect(screen.queryByText('Not quite.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  fireEvent.click(answerOptions()[1]);
  check();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  expect(screen.getByRole('heading', { name: /It's Friday/ })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  for (let index = 1; index < correctAnswers.length; index++) {
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(answerOptions()[correctAnswers[index]]);
    check();
  }
  expect(screen.queryByRole('button', { name: 'Back to results' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(screen.getByRole('heading', { name: 'Spot the condition complete.' })).toHaveFocus();
  expect(screen.getByText(/of 24 correct on your first attempt/)).toHaveTextContent('23 of 24');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '24');
  fireEvent.click(screen.getByRole('button', { name: 'Question 1 Review reasoning' }));
  expect(screen.getByRole('heading', { name: /actually win the raffle/ })).toHaveFocus();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Back to results' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.getByRole('heading', { name: 'Spot the condition complete.' })).toHaveFocus();
  expect(screen.getByText(/of 24 correct on your first attempt/)).toHaveTextContent('23 of 24');
});

const simpleQuestion: DrillOneQuestion = { rule: 'If A, then B.', prompt: 'What follows from A?', options: ['B', 'Not B'], correct: 0, feedback: ['A requires B.', 'A cannot hold without B.'] };

it('does not resave when a reactive provider recreates the same question array', () => {
  localStorage.removeItem('conditional-course-progress:foundation-array');
  let saves = 0;
  function Provider() {
    const store = useDeviceCourseProgress('foundation-array');
    const save = useCallback<CourseProgressStore['save']>((id, patch) => {
      saves++;
      if (saves > 10) throw new Error('Unbounded foundation save loop');
      store.save(id, patch);
    }, [store.save]);
    return <CourseProgressProvider store={{ ...store, save }}><DrillOneExperience questions={[{ ...simpleQuestion }]}/></CourseProgressProvider>;
  }
  render(<Provider/>);
  expect(saves).toBe(1);
  fireEvent.click(answerOptions()[0]); check();
  expect(saves).toBe(3);
});

it('does not complete the last question on a wrong first answer and offers help after repeated misses', () => {
  let steps: CourseProgressStore['steps'] = {};
  const store: CourseProgressStore = { steps, save: (id, patch) => { steps[id] = { ...steps[id], ...patch, status: steps[id]?.status === 'done' ? 'done' : patch.status ?? 'started', updatedAt: 'now' }; } };
  render(<CourseProgressProvider store={store}><DrillOneExperience questions={[simpleQuestion]}/></CourseProgressProvider>);
  fireEvent.click(answerOptions()[1]); check();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.queryByText('Practice complete')).toBeNull();
  expect(steps['foundation-practice'].done).toBe(0);
  expect(screen.queryByRole('button', { name: 'Show me' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(answerOptions()[1]); check();
  fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
  expect(screen.getByRole('heading', { name: 'Worked explanation' })).toHaveFocus();
  expect(screen.queryByRole('heading', { name: 'Correct.' })).toBeNull();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(screen.getByText(/of 1 correct on your first attempt/)).toHaveTextContent('0 of 1');
  expect(screen.getByText('1 reviewed with Show me.')).toBeVisible();
  expect(steps['foundation-practice'].status).toBe('done');
  fireEvent.click(screen.getByRole('button', { name: 'Start a new round' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(steps['foundation-practice'].status).toBe('done');
  fireEvent.click(answerOptions()[0]); check();
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  expect(screen.getByText(/of 1 correct on your first attempt/)).toHaveTextContent('1 of 1');
  expect(screen.getByText(/Earlier rounds/)).toHaveTextContent('Round 1: 0 of 1 correct first time, 1 with Show me');
});

it('invalidates only the saved question whose authored content changed', () => {
  let steps: CourseProgressStore['steps'] = {};
  const store: CourseProgressStore = { steps, save: (id, patch) => { steps[id] = { ...steps[id], ...patch, status: steps[id]?.status === 'done' ? 'done' : patch.status ?? 'started', updatedAt: 'now' }; } };
  const second = { ...simpleQuestion, prompt: 'What follows in another case?' };
  const view = render(<CourseProgressProvider store={store}><DrillOneExperience questions={[simpleQuestion, second]}/></CourseProgressProvider>);
  fireEvent.click(answerOptions()[0]); check();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(answerOptions()[0]); check();
  fireEvent.click(screen.getByRole('button', { name: 'See results' }));
  view.unmount();
  render(<CourseProgressProvider store={store}><DrillOneExperience questions={[simpleQuestion, { ...second, correct: 1 }]}/></CourseProgressProvider>);
  expect(screen.getByText('Question 2 of 2')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('button', { name: 'See results' })).toBeDisabled();
  expect(steps['foundation-practice'].status).toBe('done');
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
});

it('checks every option across all 24 questions in the rule, concept, indicator order', () => {
  render(<OpeningCourseContent id="foundation-practice"/>);
  for (let index = 0; index < correctAnswers.length; index++) {
    expect(screen.getByText(`Question ${index + 1} of 24`)).toBeVisible();
    const choices = answerOptions();
    const explanations = new Set<string>();
    choices.forEach((choice, option) => {
      if (option === correctAnswers[index]) return;
      fireEvent.click(choice);
      check();
      expect(screen.getByRole('heading', { name: 'Not quite.' })).toBeVisible();
      explanations.add(document.querySelector('.d1-feedback p')?.textContent || '');
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    fireEvent.click(choices[correctAnswers[index]]);
    check();
    expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
    explanations.add(document.querySelector('.d1-feedback p')?.textContent || '');
    expect(explanations.size).toBe(choices.length);
    if (index === 5) expect(screen.getByRole('heading', { name: 'What is sufficient here?' })).toBeVisible();
    if (index === 6) expect(screen.getByText('If a car is parked in the staff lot, it has a permit sticker.')).toBeVisible();
    if (index === 7) expect(screen.getByRole('heading', { name: 'What is a necessary condition?' })).toBeVisible();
    if (index < 23) fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
  expect(screen.getByText('Every completed registration requires a paid deposit.')).toBeVisible();
}, 60000);

it('keeps every saved answer with its question when the question order changed', () => {
  // Order 1 (no version): 17 concept and indicator questions, then the 7 rule-vs-fact questions.
  const legacy = Array.from({ length: 24 }, () => ({ selected: null as number | null, checked: false, first: null as number | null }));
  legacy[0] = { selected: 1, checked: true, first: 1 }; // "What is a necessary condition?": a wrong answer
  legacy[17] = { selected: 1, checked: true, first: 1 }; // the raffle question: the right answer
  let steps: CourseProgressStore['steps'] = { 'foundation-practice': { status: 'started', updatedAt: '2026-10-10T00:00:00.000Z', state: { current: 17, answers: legacy, finished: false, seenResults: false } } };
  const store: CourseProgressStore = { steps, save: (id, patch) => { steps = { ...steps, [id]: { ...steps[id], ...patch, status: steps[id]?.status === 'done' ? 'done' : patch.status ?? steps[id]?.status ?? 'started', updatedAt: 'now' } }; } };
  render(<CourseProgressProvider store={store}><OpeningCourseContent id="foundation-practice"/></CourseProgressProvider>);
  expect(screen.getByText('Question 1 of 24')).toBeVisible();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  const saved = steps['foundation-practice'].state as { order: number; current: number; answers: typeof legacy };
  expect(saved.order).toBe(2);
  expect(saved.current).toBe(0);
  expect(saved.answers[0]).toEqual(legacy[17]);
  expect(saved.answers[7]).toEqual(legacy[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  for (let index = 1; index < 7; index++) {
    fireEvent.click(answerOptions()[correctAnswers[index]]);
    check();
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  }
  expect(screen.getByRole('heading', { name: 'What is a necessary condition?' })).toBeVisible();
  expect(answerOptions()[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toBeVisible();
});

it('titles the entry page Spot the condition', () => {
  render(<MemoryRouter><DrillOneEntry startUrl="/start" lessonsUrl="/lessons"/></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'Spot the condition' })).toBeVisible();
  expect(screen.queryByText(/Drill/)).toBeNull();
  expect(document.body.textContent).not.toMatch(/trigger|required outcome/i);
});
