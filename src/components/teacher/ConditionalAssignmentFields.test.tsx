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
