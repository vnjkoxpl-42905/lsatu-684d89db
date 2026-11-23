import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SectionReport } from './SectionReport';
import { selectSectionDiagnosis } from './sectionReportModel';
import type { OwnedSectionReportResult, SectionHistoryRow } from '@/lib/sectionHistory';

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

const baseRow: SectionHistoryRow = {
  id: 'hist-1',
  practiceTestRunId: null,
  pt: 130,
  section: 2,
  mode: 'full-section',
  initialScore: 20,
  initialTotal: 25,
  initialPercent: 80,
  brScore: null,
  brPercent: null,
  brDelta: null,
  brUsed: false,
  totalTimeMs: 2100_000,
  avgTimeMs: 84_000,
  unansweredCount: 1,
  byQtype: { Flaw: { correct: 3, total: 4 } },
  byDifficulty: { '3': { correct: 3, total: 4 } },
  questions: [
    {
      qid: 'pt130-s2-q1',
      qnum: 1,
      qtype: 'Flaw',
      difficulty: 3,
      initialAnswer: 'B',
      correctAnswer: 'C',
      initialCorrect: false,
      timeMs: 90_000,
      switchCount: 1,
      flagged: false,
      answeredInOvertime: false,
    },
    {
      qid: 'pt130-s2-q2',
      qnum: 2,
      qtype: 'Flaw',
      difficulty: 4,
      initialAnswer: 'A',
      correctAnswer: 'A',
      initialCorrect: true,
      timeMs: 60_000,
      switchCount: 0,
      flagged: true,
      answeredInOvertime: true,
    },
  ],
  analysis: {
    headline: 'Timing pressure cost late questions.',
    categories: [],
    findings: [],
    breakdowns: [],
    notRun: [],
  } as unknown as SectionHistoryRow['analysis'],
  analysisSource: 'first-pass',
  releaseRequiresBr: false,
  predictedScore: null,
  brResults: null,
  completedAt: '2026-11-23T10:00:00Z',
};

describe('selectSectionDiagnosis', () => {
  it('labels blind review diagnosis when analysisSource is blind-review', () => {
    const out = selectSectionDiagnosis({
      analysis: baseRow.analysis,
      analysisSource: 'blind-review',
      brUsed: true,
    });
    expect(out.source).toBe('blind-review');
    expect(out.label).toBe('Blind review diagnosis');
  });

  it('labels first-pass diagnosis otherwise', () => {
    const out = selectSectionDiagnosis({
      analysis: baseRow.analysis,
      analysisSource: 'first-pass',
      brUsed: false,
    });
    expect(out.source).toBe('first-pass');
    expect(out.label).toBe('First-pass diagnosis');
  });
});

describe('SectionReport', () => {
  beforeEach(() => {
    mockFetchOwnedSectionReport.mockReset();
  });

  it('shows score, explicit no prediction saved, first-pass diagnosis label, overtime split, and Do blind review', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({ state: 'released', row: baseRow });
    render(
      <MemoryRouter>
        <SectionReport
          historyId="hist-1"
          onBack={vi.fn()}
          onReviewSection={vi.fn()}
          onStartBlindReview={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/PT130\.S2/)).toBeTruthy());
    expect(screen.getByText('No prediction saved')).toBeTruthy();
    expect(screen.getByText('First-pass diagnosis')).toBeTruthy();
    expect(screen.getByText('Timing pressure cost late questions.')).toBeTruthy();
    expect(screen.getByText(/At time: 0\/1 on the 1 questions you reached/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Do blind review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open review walk' })).toBeTruthy();
  });

  it('shows saved prediction and blind review diagnosis label when BR is complete', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({
      state: 'released',
      row: {
        ...baseRow,
        predictedScore: 22,
        brUsed: true,
        brScore: 23,
        brPercent: 92,
        brDelta: 3,
        analysisSource: 'blind-review',
      },
    });
    render(
      <MemoryRouter>
        <SectionReport
          historyId="hist-1"
          onBack={vi.fn()}
          onReviewSection={vi.fn()}
          onStartBlindReview={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Blind review diagnosis')).toBeTruthy());
    expect(screen.getByText(/You guessed 22/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Do blind review' })).toBeNull();
  });

  it('hides score, first answers, and credited answers for a sealed assigned section', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({
      state: 'sealed',
      reason: 'blind-review',
      id: 'hist-sealed',
      pt: 130,
      section: 2,
      completedAt: '2026-11-23T10:00:00Z',
      questionQids: ['pt130-s2-q1'],
    });
    render(
      <MemoryRouter>
        <SectionReport
          historyId="hist-sealed"
          onBack={vi.fn()}
          onReviewSection={vi.fn()}
          onStartBlindReview={vi.fn()}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Section complete')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Do blind review' })).toBeTruthy();
    expect(screen.queryByText(/20\/25/)).toBeNull();
    expect(screen.queryByText('Initial Score')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open review walk' })).toBeNull();
  });
});
