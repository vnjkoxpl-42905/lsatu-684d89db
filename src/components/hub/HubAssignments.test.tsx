// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ statuses: {} as Record<string, string>, items: [] as Record<string, unknown>[], capability: false, revokedIds: [] as string[], revoke: vi.fn(), refresh: vi.fn(), invalidate: vi.fn(), from: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error } }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
  useQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useStudentAssignments', () => ({ useAdminTAAssignmentsForStudent: () => ({ assignments: [], loading: false, error: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useClassroomItems', () => ({ useStudentClassroomItems: () => ({ data: state.items, isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock('@/hooks/useScopedStudentWork', () => ({ useScopedStudentWork: () => ({ activityStatuses: state.statuses, revokedActivityIds: state.revokedIds, refresh: state.refresh }) }));
vi.mock('@/features/activity-centre/hooks/useActivityRevocationCapability', () => ({ useActivityRevocationCapability: () => state.capability }));
vi.mock('@/features/activity-centre/api/activityRevocation', () => ({ revokeActivityAssignment: state.revoke }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));
import HubAssignments from './HubAssignments';

beforeEach(() => {
  state.statuses = {};
  state.capability = false;
  state.revokedIds = [];
  state.revoke.mockReset().mockResolvedValue({ assignment_id: 'issued-one' });
  state.refresh.mockReset().mockResolvedValue(undefined);
  state.invalidate.mockReset().mockResolvedValue(undefined);
  state.from.mockReset();
  state.success.mockReset(); state.error.mockReset();
  state.items = [{ id: 'mirror', student_id: 'student', type: 'activity', title: 'Relationship practice', source_table: 'activity_assignments', source_id: 'issued-one', status: 'completed', visible_to_student: true, created_at: '2026-09-30T00:00:00Z' }];
});
afterEach(cleanup);

describe('teacher Activity classroom mirrors', () => {
  it('shows source progress and refuses misleading mirror-only unassignment', () => {
    state.statuses = { 'issued-one': 'assigned' };
    render(<HubAssignments studentId="student" />);
    expect(screen.getByText('assigned')).toBeTruthy();
    expect(screen.queryByText('completed')).toBeNull();
    expect((screen.getByRole('button', { name: 'Unassign Relationship practice unavailable' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Unassign unavailable. The Activity assignment and saved work are kept.')).toBeTruthy();
  });

  it('shows unverified when the source cannot be confirmed, not the mirror completion claim', () => {
    render(<HubAssignments studentId="student" />);
    expect(screen.getByText('unverified')).toBeTruthy();
    expect(screen.getByText(/Saved Activity progress could not be confirmed/)).toBeTruthy();
    expect(screen.queryByText('completed')).toBeNull();
  });

  it('keeps ordinary post unassignment controls available', () => {
    state.items = [{ id: 'post', type: 'note', title: 'Lesson notes', status: 'assigned', visible_to_student: true, created_at: '2026-09-30T00:00:00Z' }];
    render(<HubAssignments studentId="student" />);
    expect((screen.getByRole('button', { name: 'Unassign Lesson notes' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('confirms source revocation before refreshing source and mirror, without deleting', async () => {
    state.capability = true;
    state.statuses = { 'issued-one': 'assigned' };
    render(<HubAssignments studentId="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unassign Relationship practice' }));
    expect(screen.getByText(/saved answers and results will be kept/)).toBeTruthy();
    expect(state.revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
    await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
    expect(state.revoke).toHaveBeenCalledWith('issued-one', 'student');
    expect(state.invalidate).toHaveBeenCalledWith({ queryKey: ['classroom-items-admin', 'student'] }, { throwOnError: true });
    expect(state.from).not.toHaveBeenCalled();
  });

  it('keeps a denied revocation visible and does not refresh as completed', async () => {
    state.capability = true;
    state.statuses = { 'issued-one': 'assigned' };
    state.revoke.mockRejectedValue(new Error('denied'));
    render(<HubAssignments studentId="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unassign Relationship practice' }));
    fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
    await waitFor(() => expect(state.revoke).toHaveBeenCalledTimes(1));
    expect(state.refresh).not.toHaveBeenCalled();
    expect(state.from).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(state.error).toHaveBeenCalledWith('Could not confirm Activity unassignment', { description: 'Refresh the work list before retrying.' });
  });

  it('does not revoke the previous student when selection changes with the dialog open', () => {
    state.capability = true;
    state.statuses = { 'issued-one': 'assigned' };
    const view = render(<HubAssignments studentId="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unassign Relationship practice' }));
    view.rerender(<HubAssignments studentId="another-student" />);
    fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
    expect(state.revoke).not.toHaveBeenCalled();
  });

  it('reports acknowledged revocation separately from a failed list refresh', async () => {
    state.capability = true;
    state.statuses = { 'issued-one': 'assigned' };
    state.refresh.mockRejectedValue(new Error('refresh failed'));
    render(<HubAssignments studentId="student" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unassign Relationship practice' }));
    fireEvent.click(screen.getByRole('button', { name: /^Unassign$/ }));
    await waitFor(() => expect(state.error).toHaveBeenCalledWith('Activity unassigned, but the work list could not refresh. Reload to see the updated list.'));
    expect(state.success).toHaveBeenCalledWith('Activity unassigned. Saved work has been kept.');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('suppresses a retained mirror whose issued source is revoked', () => {
    state.revokedIds = ['issued-one'];
    render(<HubAssignments studentId="student" />);
    expect(screen.queryByText('Relationship practice')).toBeNull();
  });
});
