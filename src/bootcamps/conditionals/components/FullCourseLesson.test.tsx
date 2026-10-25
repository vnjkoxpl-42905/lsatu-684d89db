import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { fullCourseLessons } from '../content/fullCourseContent';
import { FullCourseLesson } from './FullCourseLesson';

afterEach(cleanup);
const media = { src: '/lesson.mp4', poster: '/lesson.jpg', captions: '/lesson.vtt', transcript: ['A unique written fallback for this test.'] };

it.each(fullCourseLessons)('keeps $id in the approved teaching order with a real learner attempt', lesson => {
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

it('renders the written fallback only when requested or when playback fails', async () => {
  const { container } = render(<FullCourseLesson lesson={fullCourseLessons[0]} media={media}/>);
  fireEvent.click(screen.getByText('Read the written version'));
  await waitFor(() => expect(screen.getByText(media.transcript[0])).toBeVisible());
  fireEvent.error(container.querySelector('video')!);
  expect(screen.getByText('The video could not load. The written version is below.')).toBeVisible();
  expect(container.querySelector('video')).toBeNull();
  expect(screen.getByText(media.transcript[0])).toBeVisible();
});
