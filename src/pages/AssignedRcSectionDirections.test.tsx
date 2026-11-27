vi.mock('@/hooks/useStudentWorkState', () => ({ useLoadedStudentWorkAcknowledgment: vi.fn() }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AssignedRcSectionDirections from './AssignedRcSectionDirections';

const mock = vi.hoisted(() => ({
  assignment: vi.fn(),
  prepare: vi.fn(),
}));
const owner = '60000000-0000-4000-8000-000000000001';
const assignmentId = '60000000-0000-4000-8000-000000000002';
const sittingId = '60000000-0000-4000-8000-000000000003';
const manifest = 'a'.repeat(64);
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: owner } }) }));
vi.mock('@/hooks/useStudentAssignments', () => ({ useStudentAssignment: () => mock.assignment() }));
vi.mock('@/lib/timedSectionClient', () => ({ prepareAssignedTimedSection: mock.prepare }));
vi.mock('@/lib/practiceTestStore', () => ({ getPracticeTestDeviceId: () => 'test-device' }));

function useRow(timing = '52.5', student = owner) {
  mock.assignment.mockReturnValue({
    assignment: {
      id: assignmentId, student_id: student, section_kind: 'rc', section_preptest: 110,
      section_number: 3, section_manifest_sha256: manifest, section_timing_mode: timing,
      question_qids: ['1', '2'], status: 'assigned',
    },
    loading: false,
    error: null,
  });
}
function mount() {
  return render(<MemoryRouter initialEntries={['/testing/sections/assigned/' + assignmentId + '?timer=35']}>
    <Routes>
      <Route path="/testing/sections/assigned/:assignmentId" element={<AssignedRcSectionDirections />} />
      <Route path="/testing/sections/assigned/:assignmentId/sitting/:sittingId" element={<p>Protected runner</p>} />
    </Routes>
  </MemoryRouter>);
}

describe('assigned RC directions', () => {
  beforeEach(() => {
    mock.prepare.mockReset().mockResolvedValue({ id: sittingId });
    useRow();
  });

  it.each([
    ['35', 2100000, 'Total Section Time - 35 minutes'],
    ['52.5', 3150000, 'Total Section Time - 52 minutes 30 seconds'],
    ['70', 4200000, 'Total Section Time - 70 minutes'],
    ['unlimited', null, 'Untimed section'],
  ])('shows and opens the assigned %s clock independently of the URL', async (timing, budgetMs, label) => {
    useRow(timing);
    mount();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(mock.prepare).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'OPEN SECTION' }));
    await screen.findByText('Protected runner');
    expect(mock.prepare).toHaveBeenCalledWith({
      ownerId: owner, assignmentId, launchId: expect.any(String), deviceId: 'test-device',
      pt: 110, section: 3, manifest, budgetMs,
    });
  });

  it('keeps the same launch identity after a lost reply', async () => {
    mock.prepare.mockRejectedValueOnce(new Error('Try again'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'OPEN SECTION' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
    await waitFor(() => expect(screen.getByRole('button', { name: 'OPEN SECTION' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'OPEN SECTION' }));
    await screen.findByText('Protected runner');
    expect(mock.prepare.mock.calls[0][0]).toEqual(mock.prepare.mock.calls[1][0]);
  });

  it('refuses to open a different student assignment', () => {
    useRow('52.5', sittingId);
    mount();
    expect(screen.getByRole('heading', { name: 'Section unavailable' })).toBeInTheDocument();
    expect(mock.prepare).not.toHaveBeenCalled();
  });
});
