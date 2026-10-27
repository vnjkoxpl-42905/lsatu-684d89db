import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { fullCourseLessons } from '../content/fullCourseContent';
import { fullCourseMedia } from '../content/fullCourseMedia';
import { FullCourseLesson } from './FullCourseLesson';

afterEach(cleanup);
const media = { src: '/lesson.mp4', poster: '/lesson.jpg', captions: '/lesson.vtt', transcript: ['A unique written fallback for this test.'] };

it.each(fullCourseLessons.filter(lesson => !['exception-language', 'exclusion-language', 'negative-translation'].includes(lesson.id)))('keeps $id in the approved teaching order with a real learner attempt', lesson => {
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
  expect(headings).toEqual(['If not … then …', 'What does it say?', 'Find the two complete ideas', 'Negate one idea', 'Either idea works', 'Now build a fresh rule', 'Watch the lesson', 'What the rule leaves open', 'What if an idea already has “not”?', 'Without: name the second idea in full', 'Until: keep the timing', 'Read the whole sentence', 'Pop Quiz', 'More practice, when you need it']);
  const gameChoice = screen.getByRole('button', { name: 'Choose “the game is played”' });
  fireEvent.click(gameChoice);
  expect(gameChoice).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Only Played changed. Rains was left alone.')).toBeVisible();
  const rainChoice = screen.getByRole('button', { name: 'Choose “it rains”' });
  expect(rainChoice).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(rainChoice);
  expect(screen.getByText('Only Rains changed. Played was left alone.')).toBeVisible();
  expect(container.textContent).not.toMatch(/[\/~][a-z]/i);
  for (const formula of screen.getAllByRole('img')) {
    expect(formula.getAttribute('aria-label')).not.toMatch(/[\/~][a-z]/i);
  }
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

it('keeps the actual unless lesson, quiz and film transcript free of slash or tilde negation', () => {
  const lesson = fullCourseLessons.find(entry => entry.id === 'exception-language')!;
  const film = fullCourseMedia['exception-language'];
  // Provenance paths contain directory separators, not student-facing notation.
  const { sourceRefs: _provenance, ...content } = lesson;
  expect(film.transcript.length).toBeGreaterThan(0);
  for (const source of [content, lesson.quiz, film.transcript]) {
    expect(JSON.stringify(source)).not.toMatch(/[\/~][a-z]/i);
  }
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
  expect(screen.getByText(/Negate means treat an idea as not true/)).toBeVisible();
});

it('gives Group 4 a focused presentation, visible boundaries and fresh blank boards', () => {
  const lesson = fullCourseLessons.find(entry => entry.id === 'exclusion-language')!;
  const { container } = render(<FullCourseLesson lesson={lesson}/>);
  expect(screen.getByRole('heading', { name: 'If one, then not the other' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Not all means at least one exception' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Keep permission separate from conduct' })).toBeVisible();
  expect(screen.getByText(/It does not establish that no guest actually entered/)).toBeVisible();
  expect(container.querySelectorAll('.idea-board')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /Click here to keep/ })).toBeNull();
  expect(container.querySelectorAll('.ib-placed')).toHaveLength(4);
  expect([...container.querySelectorAll('.ib-placed')].every(node => node.textContent === 'Place an idea here')).toBe(true);
});

it('compares the two negation locations on a dedicated Group 3/4 lesson', () => {
  render(<FullCourseLesson lesson={fullCourseLessons.find(entry => entry.id === 'negative-translation')!}/>);
  expect(screen.getByRole('heading', { name: 'Group 3 puts the negated idea on IF' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Group 4 puts the negated idea on THEN' })).toBeVisible();
  expect(screen.getAllByRole('button', { name: 'Check this rule' })).toHaveLength(2);
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
