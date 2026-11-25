import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailSectionReport } from '@/lib/sectionHistorySave';
import { LRSectionResults } from './LRSectionResults';
import type { SectionHistoryRow, OwnedSectionReportResult } from '@/lib/sectionHistory';
import type { DrillSession } from '@/types/drill';

const mockFetchOwnedSectionReport = vi.fn<
  (userId: string, historyId: string) => Promise<OwnedSectionReportResult>
>();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/sectionHistory', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sectionHistory')>('@/lib/sectionHistory');
  return {
    ...actual,
    fetchOwnedSectionReport: (...args: [string, string]) => mockFetchOwnedSectionReport(...args),
  };
});
vi.mock('@/lib/sectionHistorySave', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sectionHistorySave')>('@/lib/sectionHistorySave');
  return {
    ...actual,
    emailSectionReport: vi.fn(async () => {}),
    persistSectionResults: vi.fn(),
    logSectionWrongAnswers: vi.fn(),
  };
});
vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: () => undefined,
  },
}));

const losingTabSession: DrillSession = {
  mode: 'full-section',
  fullSectionConfig: { pt: 130, section: 2, timer: { mode: '35', isPaused: false, elapsedMs: 0, startedAt: 0 } },
  questionQueue: ['pt130-s2-q1', 'pt130-s2-q2'],
  currentIndex: 1,
  attempts: new Map([
    ['pt130-s2-q1', { selectedAnswer: 'C', correct: false, timeMs: 10_000, timestamp: 1, reviewDone: false }],
    ['pt130-s2-q2', { selectedAnswer: 'D', correct: false, timeMs: 10_000, timestamp: 2, reviewDone: false }],
  ]),
};

const savedRowFromTabA: SectionHistoryRow = {
  id: 'hist-tab-a',
  practiceTestRunId: null,
  pt: 130,
  section: 2,
  mode: 'full-section',
  initialScore: 2,
  initialTotal: 2,
  initialPercent: 100,
  brScore: null,
  brPercent: null,
  brDelta: null,
  brUsed: false,
  totalTimeMs: 120_000,
  avgTimeMs: 60_000,
  unansweredCount: 0,
  byQtype: {},
  byDifficulty: {},
  questions: [
    {
      qid: 'pt130-s2-q1',
      qnum: 1,
      qtype: 'Flaw',
      difficulty: 3,
      initialAnswer: 'B',
      correctAnswer: 'B',
      initialCorrect: true,
      timeMs: 60_000,
      switchCount: 0,
      flagged: false,
    },
    {
      qid: 'pt130-s2-q2',
      qnum: 2,
      qtype: 'Strengthen',
      difficulty: 4,
      initialAnswer: 'A',
      correctAnswer: 'A',
      initialCorrect: true,
      timeMs: 60_000,
      switchCount: 0,
      flagged: false,
    },
  ],
  analysis: null,
  analysisSource: 'first-pass',
  completedAt: '2026-11-23T10:00:00Z',
};

describe('LRSectionResults (F6)', () => {
  beforeEach(() => {
    mockFetchOwnedSectionReport.mockReset();
  });

  it('opening an existing report has no delivery side effect', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({ state: 'released', row: savedRowFromTabA });
    const legacyMountProperties = { savedHistoryCreatedNow: true };
    const view = () => render(
      <MemoryRouter>
        <LRSectionResults
          session={losingTabSession}
          classId="u1"
          savedHistoryId="hist-tab-a"
          onBack={vi.fn()}
          {...legacyMountProperties}
        />
      </MemoryRouter>,
    );
    const first = view();
    await waitFor(() => expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0));
    first.unmount();
    view();
    await waitFor(() => expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0));
    expect(emailSectionReport).not.toHaveBeenCalled();
  });

  it('never renders losing-tab fallback scores on lookup error when savedHistoryId is set and forwards clicked qid + saved row', async () => {
    mockFetchOwnedSectionReport.mockRejectedValueOnce(new Error('Lookup unavailable'));
    const { rerender } = render(
      <MemoryRouter>
        <LRSectionResults
          session={losingTabSession}
          classId="u1"
          savedHistoryId="hist-tab-a"
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lookup unavailable')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();

    const onReviewSection = vi.fn();
    mockFetchOwnedSectionReport.mockResolvedValueOnce({ state: 'released', row: savedRowFromTabA });
    rerender(
      <MemoryRouter>
        <LRSectionResults
          session={losingTabSession}
          classId="u1"
          savedHistoryId="hist-tab-a-2"
          onReviewSection={onReviewSection}
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Strengthen').at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: /Open in review walk/i }));
    expect(onReviewSection).toHaveBeenCalledWith('pt130-s2-q2', savedRowFromTabA);
  });
});
