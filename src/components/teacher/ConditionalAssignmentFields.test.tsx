import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConditionalAssignmentFields } from './ConditionalAssignmentFields';
import { DEFAULT_CONDITIONAL_TARGET, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { conditionalAssignmentUnitIds } from '@/bootcamps/conditionals/assignments';

it('authors new stage grants using the current teaching order through the persisted target contract', async () => {
  const onChange = vi.fn();
  const view = render(<ConditionalAssignmentFields value={DEFAULT_CONDITIONAL_TARGET} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Conditional assignment scope' }), { target: { value: 'stage' } });
  const stage = onChange.mock.lastCall![0] as ConditionalAssignmentTarget;
  expect(stage.curriculumVersion).toBe(2);
  view.rerender(<ConditionalAssignmentFields value={stage} onChange={onChange} />);
  await waitFor(() => expect(screen.getByRole('option', { name: /^Group 1:/ })).toBeTruthy());
  fireEvent.change(screen.getByRole('combobox', { name: 'Conditional skill' }), { target: { value: 'group-1' } });
  const assigned = await resolveConditionalAssignment(onChange.mock.lastCall![0]);
  expect(assigned.target.curriculumVersion).toBe(2);
  expect(conditionalAssignmentUnitIds(assigned.target)).toContain('contraposition');
});

it('authors an explicit full edition and hides unsupported scope and supplementary skill choices', async () => {
  vi.stubEnv('VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED', 'true');
  const onChange = vi.fn();
  const view = render(<ConditionalAssignmentFields value={DEFAULT_CONDITIONAL_TARGET} onChange={onChange}/>);
  fireEvent.change(screen.getByRole('combobox', { name: 'Conditional course edition' }), { target: { value: 'full-conditionals-v3' } });
  const full = onChange.mock.lastCall![0] as ConditionalAssignmentTarget;
  expect(full).toMatchObject({ courseEdition: 'full-conditionals-v3', curriculumVersion: 3, scope: 'course' });
  view.rerender(<ConditionalAssignmentFields value={{ ...full, scope: 'skill', unitId: 'group-3' }} onChange={onChange}/>);
  await waitFor(() => expect(screen.getByRole('option', { name: /^Group 3:/ })).toBeTruthy());
  expect(screen.queryByRole('option', { name: 'Start at a curriculum stage' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'General practice' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'Say Exactly What Is Not True' })).toBeNull();
  expect(screen.queryByRole('combobox', { name: 'Conditional learning mode' })).toBeNull();
  expect((await resolveConditionalAssignment({ ...full, scope: 'skill', unitId: 'group-3' })).key).toBe('skill:v3:group-3:learn:beginner');
});

it('does not offer unreleased v3 assignments by default', () => {
 vi.stubEnv('VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED', undefined);
 render(<ConditionalAssignmentFields value={DEFAULT_CONDITIONAL_TARGET} onChange={vi.fn()}/>);
 expect(screen.queryByRole('option', { name: 'Full course: Chapters 1–7' })).toBeNull();
});

it('shows a stored full edition truthfully when release is off and disables new activity selection', () => {
 vi.stubEnv('VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED', undefined);
 const onChange = vi.fn();
 render(<ConditionalAssignmentFields value={{ scope: 'activity', mode: 'practice', difficulty: 'beginner', curriculumVersion: 3, courseEdition: 'full-conditionals-v3', activityId: 'unless', activitySettings: {} }} onChange={onChange}/>);
 expect(screen.getByRole('combobox', { name: 'Conditional course edition' })).toHaveValue('full-conditionals-v3');
 expect(screen.getByRole('option', { name: 'Full course: Chapters 1–7' })).toBeInTheDocument();
 expect(screen.getByRole('option', { name: 'One activity with settings' })).toBeDisabled();
 fireEvent.change(screen.getByRole('combobox', { name: 'Conditional assignment scope' }), { target: { value: 'activity' } });
 expect(onChange).not.toHaveBeenCalled();
});
