import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ConditionalRequirementsSummary } from './ConditionalRequirementsSummary';

afterEach(cleanup);
const target = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: 'full-conditionals-v3' } as const;

it('renders resolver-derived new and historical counts', () => {
  render(<ConditionalRequirementsSummary target={target} existingSnapshots={[undefined]}/>);
  expect(screen.getByText(/This new assignment requires 71 lessons and drills/)).toBeVisible();
  expect(screen.getByText(/Existing assignments retain their required steps \(70\)/)).toBeVisible();
});
it('does not invent existing counts for an empty or invalid snapshot', () => {
  const view = render(<ConditionalRequirementsSummary target={target}/>);
  expect(screen.queryByText(/Existing assignments/)).toBeNull();
  view.rerender(<ConditionalRequirementsSummary target={target} existingSnapshots={[{ version: 999 }]}/>);
  expect(screen.queryByText(/Existing assignments retain/)).toBeNull();
  expect(screen.getByText(/needs its required lessons reviewed/)).toBeVisible();
});
it('shows an incomplete-selection state instead of a zero or invalid number', () => {
  render(<ConditionalRequirementsSummary target={{ ...target, scope: 'skill', unitId: 'missing' }}/>);
  expect(screen.getByRole('status')).toHaveTextContent('Choose valid conditional work');
  expect(screen.queryByText(/requires \d|NaN/)).toBeNull();
});
