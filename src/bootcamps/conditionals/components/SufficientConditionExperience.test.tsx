import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SufficientConditionExperience, SufficientReasoningWalkthrough } from './SufficientConditionExperience';
import { SufficientConditionFilm } from './SufficientConditionFilm';

afterEach(cleanup);

it('distinguishes a guarantee from two kinds of uncertainty without asserting the reverse', () => {
  const { container } = render(<SufficientConditionExperience/>);
  const liveReading = container.querySelector('.sc-case-reading');
  expect(screen.getByText('Maya is a student.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Only student status is known' }));
  expect(container.querySelector('.sc-case-reading')).toBe(liveReading);
  expect(liveReading).toHaveAttribute('aria-live', 'polite');
  expect(screen.getByText("We don't know whether Maya is enrolled in law school.")).toBeVisible();
  expect(screen.getByText(/Both fit the rule/)).toBeVisible();
  expect(container.querySelector('figure')).toHaveAttribute('data-case', 'student');
  fireEvent.click(screen.getByRole('button', { name: 'Not enrolled in law school' }));
  expect(screen.getByText("We don't know whether Maya is a student.")).toBeVisible();
  expect(screen.getByText(/The rule still holds in either case/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled in law school' }));
  expect(screen.getByText('Maya is a student.')).toBeVisible();
});

it('reveals the fact before the inference and gives focus to Replay when complete', () => {
  render(<SufficientReasoningWalkthrough/>);
  expect(screen.queryByText('Maya is enrolled in law school.')).toBeNull();
  expect(screen.queryByText('Maya is a student.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add the fact' }));
  expect(screen.getByText('Maya is enrolled in law school.')).toBeVisible();
  expect(screen.queryByText('Maya is a student.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'See what follows' }));
  expect(screen.getByText('Maya is a student.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Replay' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Reasoning complete' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
  expect(screen.queryByText('Maya is a student.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Add the fact' })).toBeEnabled();
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
