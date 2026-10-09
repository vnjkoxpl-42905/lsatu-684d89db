import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SufficientConditionExperience, SufficientReasoningWalkthrough } from './SufficientConditionExperience';
import { SufficientConditionFilm } from './SufficientConditionFilm';

afterEach(cleanup);

it('distinguishes combinations permitted by the sentence from a broken guarantee', () => {
  const { container } = render(<SufficientConditionExperience/>);
  const liveReading = container.querySelector('.sc-case-reading');
  expect(screen.getByText('These conditions belong together.')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName(/entire law-school group is inside the student group/);
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled in law school but not a student' }));
  expect(container.querySelector('.sc-case-reading')).toBe(liveReading);
  expect(liveReading).toHaveAttribute('aria-live', 'polite');
  expect(screen.getByText('This would break the guarantee.')).toBeVisible();
  expect(liveReading).toHaveAttribute('data-fits', 'false');
  expect(container.querySelector('figure')).toHaveAttribute('data-case', 'contradiction');
  fireEvent.click(screen.getByRole('button', { name: 'A student, but not enrolled in law school' }));
  expect(screen.getByText('The sentence allows this combination.')).toBeVisible();
  expect(screen.getByText(/It isn't the only way/)).toBeVisible();
  expect(liveReading).toHaveAttribute('data-fits', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled in law school and a student' }));
  expect(screen.getByText('These conditions belong together.')).toBeVisible();
  expect(container).not.toHaveTextContent('Maya');
});

it('explains the sufficient clause, stated outcome, and noncausal guarantee without adding facts', () => {
  const { container } = render(<SufficientReasoningWalkthrough/>);
  const liveReading = container.querySelector('.sc-walkthrough-comment');
  const trigger = screen.getByRole('button', { name: /If you're enrolled in law school/ });
  expect(trigger).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Enrollment is the condition that guarantees student status.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Then you're a student/ }));
  expect(screen.getByText('Being a student is what the sentence guarantees.')).toBeVisible();
  expect(trigger).toHaveAttribute('aria-pressed', 'false');
  expect(container.querySelector('.sc-walkthrough-comment')).toBe(liveReading);
  fireEvent.click(screen.getByRole('button', { name: 'guarantees' }));
  expect(screen.getByText('The first condition guarantees the second.')).toBeVisible();
  expect(screen.getByText(/doesn't mean that one event causes another/)).toBeVisible();
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Enrollment is the condition that guarantees student status.')).toBeVisible();
  expect(container).not.toHaveTextContent('Maya');
  expect(container).not.toHaveTextContent('Add the fact');
});

it('provides controlled captioned video and replaces playback when the clip changes', () => {
  const assets = [
    { id:'enough', title:'Enough to know', src:'/enough.mp4', captions:'/enough.vtt', caption:'Enrollment is enough.', transcript:'Enrollment guarantees student status.' },
    { id:'open', title:'What stays open', src:'/open.mp4', captions:'/open.vtt', caption:'Student status leaves enrollment open.', transcript:'A student could study another subject.' },
  ];
  const { container } = render(<SufficientConditionFilm assets={assets}/>);
  const firstVideo = container.querySelector('video');
  expect(firstVideo).toHaveAttribute('controls');
  expect(firstVideo).not.toHaveAttribute('autoplay');
  expect(container.querySelector('track')).toHaveAttribute('src','/enough.vtt');
  fireEvent.click(screen.getByRole('button',{name:'What stays open'}));
  expect(container.querySelector('video')).not.toBe(firstVideo);
  expect(container.querySelector('source')).toHaveAttribute('src','/open.mp4');
  expect(container.querySelector('track')).toHaveAttribute('src','/open.vtt');
  expect(screen.getByText('A student could study another subject.')).toBeInTheDocument();
});

it('does not imply a clip exists when no reviewed asset is available', () => {
  const { container } = render(<SufficientConditionFilm assets={[]}/>);
  expect(container.querySelector('video')).toBeNull();
});

it('keeps the explanation available after a failed load and retries without autoplay', () => {
  const { container } = render(<SufficientConditionFilm/>);
  const failedVideo = container.querySelector('video')!;
  fireEvent.error(failedVideo);
  expect(screen.getByRole('alert')).toHaveTextContent("The video couldn't load");
  expect(container.querySelector('details')).toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: 'Try loading the video again' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(container.querySelector('video')).not.toBe(failedVideo);
  expect(container.querySelector('video')).not.toHaveAttribute('autoplay');
});
