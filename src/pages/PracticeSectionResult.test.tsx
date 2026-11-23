import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PracticeSectionResult } from './PracticeExamPages';
import ProtectedRoute from '@/components/ProtectedRoute';
import { OwnedWorkReviewGate } from '@/components/AssignmentGate';

const mockOwnsSectionHistoryRow = vi.fn();
const mockListPracticeSectionAttempts = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, authReady: true }) }));
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    loading: false,
    is_admin: false,
    has_classroom_access: false,
    has_analytics_access: false,
    has_drill_access: false,
    has_activity_access: false,
    has_practice_access: false,
  }),
}));
vi.mock('@/components/LockedModule', () => ({
  default: () => <div>Access locked</div>,
}));
vi.mock('@/lib/sectionHistory', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sectionHistory')>('@/lib/sectionHistory');
  return {
    ...actual,
    ownsSectionHistoryRow: (...args: unknown[]) => mockOwnsSectionHistoryRow(...args),
  };
});
vi.mock('@/lib/practiceSectionAttempts', async () => {
  const actual = await vi.importActual<typeof import('@/lib/practiceSectionAttempts')>(
    '@/lib/practiceSectionAttempts',
  );
  return {
    ...actual,
    listPracticeSectionAttempts: (...args: unknown[]) => mockListPracticeSectionAttempts(...args),
  };
});

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/testing/attempts/section/lr/:sessionId"
            element={<ProtectedRoute allowSignedIn><PracticeSectionResult /></ProtectedRoute>}
          />
          <Route
            path="/review/section/:historyId"
            element={
              <OwnedWorkReviewGate kind="section">
                <div>Section report destination</div>
              </OwnedWorkReviewGate>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PracticeSectionResult legacy URL resolver', () => {
  beforeEach(() => {
    mockOwnsSectionHistoryRow.mockReset();
    mockListPracticeSectionAttempts.mockReset();
  });

  it('redirects to /review/section/:id when the id matches a section_history row and lets an owner without classroom or analytics flags open their own report (F8)', async () => {
    mockOwnsSectionHistoryRow.mockResolvedValue(true);
    renderAt('/testing/attempts/section/lr/hist-123');
    await waitFor(() => expect(screen.getByText('Section report destination')).toBeTruthy());
    expect(screen.queryByText('Access locked')).toBeNull();
    expect(mockListPracticeSectionAttempts).not.toHaveBeenCalled();
  });

  it('blocks a non-owner behind the real OwnedWorkReviewGate when flags are off (F8)', async () => {
    mockOwnsSectionHistoryRow.mockResolvedValue(false);
    renderAt('/review/section/hist-other');
    await waitFor(() => expect(screen.getByText('Access locked')).toBeTruthy());
    expect(screen.queryByText('Section report destination')).toBeNull();
  });

  it('keeps the score summary relabeled when only a completed resume record exists', async () => {
    mockOwnsSectionHistoryRow.mockResolvedValue(false);
    mockListPracticeSectionAttempts.mockResolvedValue([
      {
        id: 'resume-old-1',
        kind: 'lr-section',
        status: 'completed',
        preptest: 120,
        section: 2,
        startedAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:35:00Z',
        answered: 24,
        total: 25,
        correct: 19,
        href: '/testing/attempts/section/lr/resume-old-1',
      },
    ]);
    renderAt('/testing/attempts/section/lr/resume-old-1');
    await waitFor(() =>
      expect(screen.getByText('Saved summary. Question detail was not kept.')).toBeTruthy(),
    );
    expect(screen.getByText('19 / 25')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /review walk/i })).toBeNull();
  });
});
