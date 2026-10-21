import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DossierWork from './DossierWork';

const state = vi.hoisted(() => ({ available: false, uncertain: false, revoke: vi.fn(), refresh: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error } }));
vi.mock('./StudentDossier', () => ({ useDossier: () => ({ studentId: 'student', openAssign: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: state.invalidate }) }));
vi.mock('@/features/activity-centre/hooks/useActivityRevocationCapability', () => ({ useActivityRevocationCapability: () => state.available }));
vi.mock('@/features/activity-centre/api/activityRevocation', () => ({ revokeActivityAssignment: state.revoke }));
vi.mock('@/hooks/useScopedStudentWork', () => ({ useScopedStudentWork: () => ({
  resolution: { state: 'ready' }, error: null, failedSources: state.uncertain ? ['saved assignment sessions'] : [], loading: false, refresh: state.refresh,
  rows: [{ sourceTable: 'activity_assignments', refId: 'issued', kind: 'activity', title: 'Unmirrored Activity', subtitle: 'Practice', status: 'assigned', progressUnverified: state.uncertain }],
}) }));
vi.mock('@/components/hub/HubAssignments', () => ({ default: () => null }));
vi.mock('@/components/teacher/bootcamps/BootcampLessonProgress', () => ({ BootcampLessonProgress: () => null }));
vi.mock('@/features/activity-centre/components/StudentIndicatorLedger', () => ({ StudentIndicatorLedger: () => null }));
beforeEach(() => {
  state.available = false;
  state.uncertain = false;
  state.revoke.mockReset().mockResolvedValue({ assignment_id: 'issued' });
  state.refresh.mockReset().mockResolvedValue(undefined);
  state.invalidate.mockReset().mockResolvedValue(undefined);
  state.success.mockReset(); state.error.mockReset();
});
afterEach(cleanup);
it('keeps source unassignment disabled when the live capability is absent', () => {
  render(<DossierWork />);
  expect((screen.getByRole('button', { name: 'Unassign Unmirrored Activity unavailable' }) as HTMLButtonElement).disabled).toBe(true);
  expect(state.revoke).not.toHaveBeenCalled();
});
it('confirms an unmirrored source then refreshes both projections after acknowledgment', async () => {
  state.available = true;
  render(<DossierWork />);
  fireEvent.click(screen.getByRole('button', { name: 'Unassign Unmirrored Activity' }));
  expect(screen.getByRole('alertdialog')).toBeTruthy();
  expect(state.revoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
  await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
  expect(state.revoke).toHaveBeenCalledWith('issued', 'student');
  expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ['classroom-items-admin', 'student'] }, { throwOnError: true });
});
it('preserves the source row and confirmation dialog when revocation fails', async () => {
  state.available = true;
  state.revoke.mockRejectedValue(new Error('denied'));
  render(<DossierWork />);
  fireEvent.click(screen.getByRole('button', { name: 'Unassign Unmirrored Activity' }));
  fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
  await waitFor(() => expect(state.revoke).toHaveBeenCalledTimes(1));
  expect(state.refresh).not.toHaveBeenCalled();
  expect(screen.getByText('Unmirrored Activity')).toBeTruthy();
  expect(screen.getByRole('alertdialog')).toBeTruthy();
});
it('reports confirmed revocation even if the following source refresh fails', async () => {
  state.available = true;
  state.refresh.mockRejectedValue(new Error('offline'));
  render(<DossierWork />);
  fireEvent.click(screen.getByRole('button', { name: 'Unassign Unmirrored Activity' }));
  fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
  await waitFor(() => expect(state.error).toHaveBeenCalledWith('Activity unassigned, but the work list could not refresh. Reload to see the updated list.'));
  expect(state.success).toHaveBeenCalledWith('Activity unassigned. Saved work has been kept.');
  expect(screen.queryByRole('alertdialog')).toBeNull();
});

it('shows uncertain progress and a named saved-source retry without implying untouched work', () => {
  state.uncertain = true;
  const view = render(<DossierWork />);
  expect(screen.getByText('Progress unverified')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('saved assignment sessions');
  state.uncertain = false;
  view.rerender(<DossierWork />);
  expect(screen.queryByText('Progress unverified')).toBeNull();
  expect(screen.getByText('assigned')).toBeTruthy();
});
