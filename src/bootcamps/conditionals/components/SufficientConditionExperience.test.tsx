import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SufficientConditionExperience, SufficientReasoningWalkthrough } from './SufficientConditionExperience';
import { SufficientConditionFilm } from './SufficientConditionFilm';

afterEach(cleanup);

it('distinguishes combinations permitted by the sentence from a broken guarantee', () => {
  const { container } = render(<SufficientConditionExperience/>);
  const liveReading = container.querySelector('.sc-case-reading');
  expect(screen.getByText('This is the relationship the sentence guarantees.')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName(/entire law-school group is highlighted inside the student group/);
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled, but not a student' }));
  expect(container.querySelector('.sc-case-reading')).toBe(liveReading);
  expect(liveReading).toHaveAttribute('aria-live', 'polite');
  expect(screen.getByText('The guarantee does not allow this.')).toBeVisible();
  expect(liveReading).toHaveAttribute('data-fits', 'false');
  expect(container.querySelector('figure')).toHaveAttribute('data-case', 'contradiction');
  expect(screen.getByRole('img')).toHaveAccessibleName(/crossed out/);
  expect(container.querySelector('.sc-excluded-person')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'A student outside law school' }));
  expect(screen.getByText('You can be a student without being in law school.')).toBeVisible();
  expect(screen.getByText(/Someone studying history could be a student too/)).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName(/Students outside law school are highlighted/);
  expect(liveReading).toHaveAttribute('data-fits', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled and a student' }));
  expect(screen.getByText('This is the relationship the sentence guarantees.')).toBeVisible();
  expect(container).not.toHaveTextContent('Maya');
});

it('explains the sufficient clause, stated outcome, and one-way guarantee without adding facts', () => {
  const { container } = render(<SufficientReasoningWalkthrough/>);
  const liveReading = container.querySelector('.sc-walkthrough-comment');
  const trigger = screen.getByRole('button', { name: /If you're enrolled in law school/ });
  expect(trigger).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Being enrolled in law school is enough to guarantee being a student.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Then you're a student/ }));
  expect(screen.getByText('Anyone enrolled in law school has to be a student.')).toBeVisible();
  expect(trigger).toHaveAttribute('aria-pressed', 'false');
  expect(container.querySelector('.sc-walkthrough-comment')).toBe(liveReading);
  fireEvent.click(screen.getByRole('button', { name: 'guarantees' }));
  expect(screen.getByText('You cannot have the first condition without the second.')).toBeVisible();
  expect(screen.getByText(/That's the connection the sentence gives us/)).toBeVisible();
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Being enrolled in law school is enough to guarantee being a student.')).toBeVisible();
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
