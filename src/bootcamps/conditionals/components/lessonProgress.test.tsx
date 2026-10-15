import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { CourseLessonProvider, CourseProgressProvider, useDeviceCourseProgress } from '../courseProgress';
import { emptyProgress, recordCourseStep, type ConditionalProgress } from '../progress';
import { QuickQuiz, type QuizItem } from './SufficientQuiz';
import { ReferenceQuestion } from './ConditionalReferenceSequence';
import { OpeningCourseScreen } from './OpeningCourse';
import { RuleDrill } from './ContrapositiveVisuals';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
const url = (id: string) => `/course/${id}`;
const items: QuizItem[] = [
  { rule: 'All red parcels are tracked.', question: 'What is enough?', options: [{ text: 'Red parcel', tone: 'amber' }, { text: 'Tracked parcel', tone: 'teal', reason: 'That is what the rule requires.' }], correct: 0, answer: 'Being red guarantees tracking.' },
  { rule: 'All red parcels are tracked.', question: 'What is required?', options: [{ text: 'Red parcel', reason: 'That is what is enough.' }, { text: 'Tracked parcel' }], correct: 1, answer: 'Tracking is required for red parcels.' },
];
function QuizHarness({ quiz = items }: { quiz?: QuizItem[] }) {
  const store = useDeviceCourseProgress('lesson-test');
  return <CourseProgressProvider store={store}><CourseLessonProvider stepId="test"><QuickQuiz items={quiz} idPrefix="test"/><ReferenceQuestion prompt="Sibling exercise" options={['Yes', 'No']} correct={0} feedback={['Correct reasoning', 'Try another case']}/></CourseLessonProvider></CourseProgressProvider>;
}

it('focuses each new quick-quiz prompt after Next and restart without taking focus on initial rendering', () => {
  const arrival = document.createElement('button');
  document.body.append(arrival);
  arrival.focus();
  render(<QuizHarness/>);
  expect(arrival).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Red parcel' }));
  const next = screen.getByRole('button', { name: 'Next question' });
  next.focus();
  fireEvent.click(next);
  expect(screen.getByText('What is required?')).toHaveFocus();
  expect(screen.getByText('What is required?')).toHaveAccessibleDescription('All red parcels are tracked.');
  fireEvent.click(screen.getByRole('button', { name: 'Tracked parcel' }));
  const restart = screen.getByRole('button', { name: 'Try them again' });
  restart.focus();
  fireEvent.click(restart);
  expect(screen.getByText('What is enough?')).toHaveFocus();
  arrival.remove();
});

it('focuses the prompt when restarting a one-question quick quiz', () => {
  render(<QuizHarness quiz={items.slice(0, 1)}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Red parcel' }));
  const restart = screen.getByRole('button', { name: 'Try them again' });
  restart.focus();
  fireEvent.click(restart);
  expect(screen.getByText('What is enough?')).toHaveFocus();
  expect(screen.getByText('What is enough?')).toHaveAccessibleDescription('All red parcels are tracked.');
});

it('focuses each new contrapositive rule and its description after Next and restart', () => {
  const arrival = document.createElement('button');
  document.body.append(arrival);
  arrival.focus();
  render(<RuleDrill/>);
  expect(arrival).toHaveFocus();
  const prompt = screen.getByText('Which one is the contrapositive?');
  for (const [step, correct] of [2, 0, 1, 2].entries()) {
    fireEvent.click(within(screen.getByRole('group', { name: 'Which one is the contrapositive?' })).getAllByRole('button')[correct]);
    const move = screen.getByRole('button', { name: step === 3 ? 'Try them again' : 'Next rule' });
    move.focus();
    fireEvent.click(move);
    expect(prompt).toHaveFocus();
    expect(prompt).toHaveAccessibleDescription(document.querySelector('.ct-drill-sentence')!.textContent!);
  }
  expect(screen.getByText('Rule 1 of 4')).toBeVisible();
  arrival.remove();
});

it('keeps wrong attempts, hints, question position and sibling answers on reload without role-color leakage', () => {
  const first = render(<QuizHarness/>);
  expect(document.querySelector('.ct-drill-options .ct-pill')).toBeNull();
  const wrong = screen.getByRole('button', { name: 'Tracked parcel' });
  fireEvent.click(wrong);
  fireEvent.click(wrong);
  fireEvent.click(within(screen.getByRole('group', { name: 'Sibling exercise' })).getByRole('button', { name: 'Yes' }));
  first.unmount();
  const resumed = render(<QuizHarness/>);
  expect(screen.getByRole('button', { name: 'Show me' })).toBeVisible();
  expect(screen.getByText('Correct reasoning')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  resumed.unmount();
  render(<QuizHarness/>);
  expect(screen.getByText('Question 2 of 2')).toBeVisible();
  const state = JSON.parse(localStorage.getItem('conditional-course-progress:lesson-test')!).test.state.lessonInteractions;
  expect(state['quiz:test'].answers[0]).toMatchObject({ attempts: 2, assisted: true });
  expect(state['question:Sibling exercise']).toBe(0);
});

it('invalidates saved completion when the authored quiz changes', async () => {
  const first = render(<QuizHarness/>);
  fireEvent.click(screen.getByRole('button', { name: 'Red parcel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Tracked parcel' }));
  first.unmount();
  render(<QuizHarness quiz={items.map(item => ({ ...item, rule: 'All blue parcels are tracked.' }))}/>);
  expect(screen.getByText('Question 1 of 2')).toBeVisible();
  await waitFor(() => expect(JSON.parse(localStorage.getItem('conditional-course-progress:lesson-test')!).test.state.lessonInteractions['quiz:test'].complete).toBe(false));
});

it('waits for account hydration and remounts cleanly for a different account', () => {
  const save = vi.fn();
  const { rerender } = render(<MemoryRouter><OpeningCourseScreen view="meaning" url={url} storageScope="account-a" progressStore={{ ready: false, steps: {}, save }}/></MemoryRouter>);
  expect(screen.getByRole('status')).toHaveTextContent('Loading your saved course work');
  expect(document.querySelector('.opening-course-content')).toBeNull();
  expect(save).not.toHaveBeenCalled();
  rerender(<MemoryRouter><OpeningCourseScreen view="meaning" url={url} storageScope="account-a" progressStore={{ ready: true, steps: {}, save }}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'No, it tells you what follows if you sign up.' }));
  rerender(<MemoryRouter><OpeningCourseScreen view="meaning" url={url} storageScope="account-b" progressStore={{ ready: true, steps: {}, save }}/></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'No, it tells you what follows if you sign up.' })).toHaveAttribute('aria-pressed', 'false');
});

it('marks a lesson read only after its quiz and an explicit completion action', () => {
  let snapshot: ConditionalProgress;
  function Account() {
    const [progress, setProgress] = useState(emptyProgress());
    snapshot = progress;
    return <MemoryRouter><OpeningCourseScreen view="necessary" url={url} progressStore={{ steps: progress.course ?? {}, save: (id, patch) => setProgress(prior => recordCourseStep(prior, id, patch)) }}/></MemoryRouter>;
  }
  render(<Account/>);
  const complete = screen.getByRole('button', { name: 'Mark lesson as read' });
  expect(complete).toBeDisabled();
  expect(snapshot!.course!.necessary.status).toBe('started');
  const quiz = within(document.querySelector('.ct-drill') as HTMLElement);
  for (const name of ['Working brakes', 'Nothing settles it. It may or may not be in the race.', 'Show a passport', 'Flour']) {
    fireEvent.click(quiz.getByRole('button', { name }));
    const next = quiz.queryByRole('button', { name: 'Next question' });
    if (next) fireEvent.click(next);
  }
  expect(complete).toBeEnabled();
  expect(snapshot!.course!.necessary.status).toBe('started');
  fireEvent.click(complete);
  expect(snapshot!.course!.necessary.status).toBe('done');
});

it('pauses videos when their retained lesson body is hidden by navigation', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const { rerender } = render(<MemoryRouter><OpeningCourseScreen view="sufficient" url={url}/></MemoryRouter>);
  rerender(<MemoryRouter><OpeningCourseScreen view="necessary" url={url}/></MemoryRouter>);
  expect(pause).toHaveBeenCalled();
});
