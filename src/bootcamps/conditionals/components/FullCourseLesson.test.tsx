import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { fullCourseLessons } from '../content/fullCourseContent';
import { FullCourseLesson } from './FullCourseLesson';

afterEach(cleanup);
const media = { src: '/lesson.mp4', poster: '/lesson.jpg', captions: '/lesson.vtt', transcript: ['A unique written fallback for this test.'] };

it.each(fullCourseLessons.filter(lesson => lesson.id !== 'exception-language'))('keeps $id in the approved teaching order with a real learner attempt', lesson => {
  const { container } = render(<FullCourseLesson lesson={lesson} media={media}/>);
  const headings = [...container.querySelectorAll('article > section > h2')].map(node => node.textContent);
  expect(headings).toEqual(['What it is', 'Why it matters', 'Watch the lesson', 'How to use it', 'What it is not', 'Pop Quiz']);
  expect(screen.getByRole('button', { name: lesson.demos[0].steps[0].label })).toBeVisible();
  expect(screen.getByRole('button', { name: lesson.demos[1].steps[0].label })).toBeVisible();
  expect(screen.queryByRole('status')).toBeNull();
  expect(container.querySelector('input:checked')).toBeNull();
  expect(container.querySelector('video')).toHaveAttribute('controls');
  expect(container.querySelector('track')).toHaveAttribute('kind', 'captions');
  expect(screen.queryByText(media.transcript[0])).toBeNull();
});

it('teaches unless from meaning to both translations before until, without and the quiz', () => {
  const lesson = fullCourseLessons.find(entry => entry.id === 'exception-language')!;
  const { container } = render(<FullCourseLesson lesson={lesson} media={media}/>);
  const headings = [...container.querySelectorAll('article > section > h2')].map(node => node.textContent);
  expect(headings).toEqual(['If not … then …', 'What does it say?', 'Find the two complete ideas', 'Negate one idea', 'Either idea works', 'Watch the lesson', 'What the rule leaves open', 'What if an idea already has “not”?', 'Without: name the second idea in full', 'Until: keep the timing', 'Read the whole sentence', 'Pop Quiz']);
  const gameChoice = screen.getByRole('button', { name: 'Choose “the game is played”' });
  fireEvent.click(gameChoice);
  expect(gameChoice).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Only Played changed. Rains was left alone.')).toBeVisible();
  const rainChoice = screen.getByRole('button', { name: 'Choose “it rains”' });
  expect(rainChoice).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(rainChoice);
  expect(screen.getByText('Only Rains changed. Played was left alone.')).toBeVisible();
  expect(container.textContent).not.toMatch(/\/[RGMOTAI]\b/);
  const negated = [...container.querySelectorAll('.fc-u-idea[data-negated=true]')];
  expect(negated.length).toBeGreaterThan(10);
  expect(negated.every(token => token.querySelector('.fc-u-sr')?.textContent === 'not ')).toBe(true);
  expect(screen.getByRole('img', { name: 'If the store opens, then the manager arrives' })).toBeVisible();
  expect(screen.getByRole('img', { name: 'If the inspection is not complete yet, then the lab has not opened yet' })).toBeVisible();
  expect(screen.queryByText(/Wrong/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'The game is played' }));
  expect(screen.getByText(/With no rain, the game is played/)).toBeVisible();
  expect(container.querySelector('track')).toHaveAttribute('kind', 'captions');
});

it('gives a repair before the meaning answer and resets the attempt', () => {
  const lesson = fullCourseLessons.find(entry => entry.id === 'exception-language')!;
  render(<FullCourseLesson lesson={lesson} media={media}/>);
  fireEvent.click(screen.getByRole('button', { name: 'We cannot tell' }));
  expect(screen.getByText(/Reread what it promises/)).toBeVisible();
  expect(screen.queryByText(/With no rain, the game is played/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.queryByText('Not quite.')).toBeNull();
  expect(screen.getByRole('button', { name: 'The game is played' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: /not\s+Rains\s*:\s*it does not rain/ }));
  expect(screen.getByText(/Negating an idea says that it is not true/)).toBeVisible();
});

it('renders the written fallback only when requested or when playback fails', async () => {
  const { container } = render(<FullCourseLesson lesson={fullCourseLessons[0]} media={media}/>);
  fireEvent.click(screen.getByText('Read the written version'));
  await waitFor(() => expect(screen.getByText(media.transcript[0])).toBeVisible());
  fireEvent.error(container.querySelector('video')!);
  expect(screen.getByText('The video could not load. The written version is below.')).toBeVisible();
  expect(container.querySelector('video')).toBeNull();
  expect(screen.getByText(media.transcript[0])).toBeVisible();
});
