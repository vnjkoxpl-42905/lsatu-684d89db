import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SufficientConditionExperience, SufficientReasoningWalkthrough } from './SufficientConditionExperience';
import { readFileSync } from 'node:fs';
import { SufficientConditionFilm } from './SufficientConditionFilm';

afterEach(cleanup);

it('distinguishes combinations allowed by the conditional from a broken guarantee', () => {
  const { container } = render(<SufficientConditionExperience/>);
  const liveReading = container.querySelector('.sc-case-reading');
  expect(screen.getByText('If someone is enrolled in law school, then they are a student.')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName(/entire law-school group is highlighted inside the student group/);
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled, but not a student' }));
  expect(container.querySelector('.sc-case-reading')).toBe(liveReading);
  expect(liveReading).toHaveAttribute('aria-live', 'polite');
  expect(screen.getByText("Enrolled but not a student can't happen.")).toBeVisible();
  expect(liveReading).toHaveAttribute('data-fits', 'false');
  expect(container.querySelector('figure')).toHaveAttribute('data-case', 'contradiction');
  expect(screen.getByRole('img')).toHaveAccessibleName(/crossed out/);
  expect(container.querySelector('.sc-excluded-person')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'A student outside law school' }));
  expect(screen.getByText("If someone isn't enrolled in law school, they might or might not be a student.")).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName(/Students outside law school are highlighted/);
  expect(liveReading).toHaveAttribute('data-fits', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Enrolled and a student' }));
  expect(screen.getByText('If someone is enrolled in law school, then they are a student.')).toBeVisible();
  expect(container).not.toHaveTextContent('Maya');
});

it('reveals the guarantee only after activating the sufficient condition and lets the learner replay it', () => {
  const { container } = render(<SufficientReasoningWalkthrough/>);
  const trigger = screen.getByRole('button', { name: /Being enrolled in law school/ });
  const explanationId = trigger.getAttribute('aria-controls')!.split(' ')[1];
  const liveReading = document.getElementById(explanationId);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(liveReading).toBeEmptyDOMElement();
  expect(liveReading).toHaveAttribute('aria-live', 'polite');
  expect(liveReading).toHaveAttribute('aria-atomic', 'true');
  expect(screen.queryByRole('button', { name: 'guarantees' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Being a student/ })).toBeNull();
  expect(container.querySelector('.sc-revealed-relationship')).not.toBeVisible();
  trigger.focus();
  fireEvent.click(trigger);
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(container.querySelector('.sc-revealed-relationship')).toBeVisible();
  expect(screen.getByRole('button', { name: 'guarantees' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Being a student/ })).toBeVisible();
  expect(document.getElementById(explanationId)).toBe(liveReading);
  expect(liveReading).toHaveTextContent('The guarantee runs in one direction.');
  fireEvent.click(screen.getByRole('button', { name: /Being a student/ }));
  expect(liveReading).toHaveTextContent('Being a student is guaranteed.');
  fireEvent.click(trigger);
  expect(liveReading).toHaveTextContent('Enrollment is enough on its own.');
  expect(liveReading).toHaveTextContent("You don't need another fact about them.");
  expect(liveReading).not.toHaveTextContent('The word');
  const restart = screen.getByRole('button', { name: 'Start again' });
  restart.focus();
  fireEvent.click(restart);
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: 'guarantees' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Being a student/ })).toBeNull();
  expect(document.getElementById(explanationId)).toBe(liveReading);
  expect(liveReading).toBeEmptyDOMElement();
  fireEvent.click(trigger);
  expect(screen.getByRole('button', { name: 'guarantees' })).toBeVisible();
  expect(container).not.toHaveTextContent('sentence');
});

it('disables reveal motion for the reduced-motion preference', () => {
  const experienceStyles = readFileSync('src/bootcamps/conditionals/components/sufficient-condition-experience.css', 'utf8');
  expect(experienceStyles).toMatch(/@media\(prefers-reduced-motion:reduce\)\s*\{\s*\.sc-revealed-relationship[^}]+animation:none!important;\s*transform:none!important;/);
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
