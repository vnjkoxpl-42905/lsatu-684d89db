// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ statuses: {} as Record<string, string>, items: [] as Record<string, unknown>[] }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useStudentAssignments', () => ({ useAdminTAAssignmentsForStudent: () => ({ assignments: [], loading: false, error: null, refresh: vi.fn() }) }));
vi.mock('@/hooks/useClassroomItems', () => ({ useStudentClassroomItems: () => ({ data: state.items, isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock('@/hooks/useScopedStudentWork', () => ({ useScopedStudentWork: () => ({ activityStatuses: state.statuses }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
import HubAssignments from './HubAssignments';

beforeEach(() => {
  state.statuses = {};
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
});
