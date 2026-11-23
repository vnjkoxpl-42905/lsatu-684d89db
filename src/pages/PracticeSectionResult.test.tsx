import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PracticeSectionResult } from './PracticeExamPages';

const mockOwnsSectionHistoryRow = vi.fn();
const mockListPracticeSectionAttempts = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
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
          <Route path="/testing/attempts/section/lr/:sessionId" element={<PracticeSectionResult />} />
          <Route path="/review/section/:historyId" element={<div>Section report destination</div>} />
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

  it('redirects to /review/section/:id when the id matches a section_history row', async () => {
    mockOwnsSectionHistoryRow.mockResolvedValue(true);
    renderAt('/testing/attempts/section/lr/hist-123');
    await waitFor(() => expect(screen.getByText('Section report destination')).toBeTruthy());
    expect(mockListPracticeSectionAttempts).not.toHaveBeenCalled();
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
