import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SectionReport } from './SectionReport';
import SectionReportPage from '@/pages/SectionReportPage';
import { selectSectionDiagnosis, type SectionReportData } from './sectionReportModel';
import type { OwnedSectionReportResult, SectionHistoryRow } from '@/lib/sectionHistory';

const mockFetchOwnedSectionReport = vi.fn<
  (userId: string, historyId: string) => Promise<OwnedSectionReportResult>
>();
const primaryReviewFill = 'bg-[var(--section-review-action)]';
const mockToast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));

// jsdom does not implement window scrolling; tests that count calls spy on this stub.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true, configurable: true });

vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('@/components/drill/EnhancedBlindReview', () => ({
  EnhancedBlindReview: ({ onBack }: { onBack: () => void }) => <button onClick={onBack}>Leave blind review</button>,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/components/drill/SectionReviewWalk', () => ({
  default: ({ onBack, initialIndex, session }: {
    onBack: () => void;
    initialIndex: number;
    session: { questionQueue: string[] };
  }) => <button onClick={onBack}>Return from question {initialIndex + 1} of {session.questionQueue.length}</button>,
}));
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
    mockToast.error.mockReset();
    mockToast.info.mockReset();
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
    expect(screen.getByText(/At time: 0\/1 on the 1 questions you answered/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Do blind review' })).toHaveClass(primaryReviewFill);
    expect(screen.getByRole('button', { name: 'Open review walk' })).not.toHaveClass(primaryReviewFill);
  });

  it.each([0, 1])('separates %i overtime answers from blanks in a 26-question report', async (overtime) => {
    const questions = Array.from({ length: 26 }, (_, index) => ({
      ...baseRow.questions[0],
      qid: `q${index + 1}`,
      qnum: index + 1,
      initialAnswer: index < 10 + overtime ? 'B' : '—',
      initialCorrect: index < 10 + overtime,
      // Existing persisted rows also marked blanks as overtime.
      answeredInOvertime: index >= 10,
    }));
    mockFetchOwnedSectionReport.mockResolvedValue({
      state: 'released',
      row: { ...baseRow, questions, initialTotal: 26, initialScore: 10 + overtime },
    });
    render(<MemoryRouter><SectionReport historyId="hist-1" onBack={vi.fn()} /></MemoryRouter>);
    expect(await screen.findByText(/At time: 10\/10/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`Overtime answers: ${overtime}\\.`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`Unanswered: ${16 - overtime}\\.`))).toBeTruthy();
    expect(screen.getByText(/score above counts all 26/)).toBeTruthy();
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
    expect(screen.getByRole('button', { name: 'Open review walk' })).toHaveClass(primaryReviewFill);
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
    expect(screen.getByRole('button', { name: 'Do blind review' })).toHaveClass(primaryReviewFill);
    expect(screen.queryByText(/20\/25/)).toBeNull();
    expect(screen.queryByText('Initial Score')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open review walk' })).toBeNull();
  });

  it('retries preparing blind review without showing a sealed result', async () => {
    const sealedReport = {
      state: 'sealed' as const,
      reason: 'blind-review' as const,
      id: 'hist-sealed',
      pt: 130,
      section: 2,
      completedAt: '2026-11-23T10:00:00Z',
    };
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ ...sealedReport, questionQids: [], blindReviewPreparationFailed: true })
      .mockResolvedValueOnce({ ...sealedReport, questionQids: ['frozen-q1'] });
    const onStartBlindReview = vi.fn();
    render(
      <MemoryRouter>
        <SectionReport historyId="hist-sealed" onBack={vi.fn()} onStartBlindReview={onStartBlindReview} />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Retry loading questions' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Do blind review' }));
    expect(onStartBlindReview).toHaveBeenCalledWith(expect.objectContaining({ questionQids: ['frozen-q1'] }));
    expect(screen.queryByText('Initial Score')).toBeNull();
  });

  it('offers Start over only for standalone released sections when onStartOver is provided (F5)', async () => {
    const onStartOver = vi.fn();
    mockFetchOwnedSectionReport.mockResolvedValueOnce({ state: 'released', row: baseRow });
    const { rerender } = render(
      <MemoryRouter>
        <SectionReport
          historyId="hist-1"
          onBack={vi.fn()}
          onStartOver={onStartOver}
        />
      </MemoryRouter>,
    );

    const startOver = await screen.findByRole('button', { name: 'Start over' });
    startOver.click();
    expect(onStartOver).toHaveBeenCalledWith(baseRow);

    mockFetchOwnedSectionReport.mockResolvedValueOnce({
      state: 'released',
      row: { ...baseRow, id: 'hist-pt', practiceTestRunId: 'pt-run-1' },
    });
    rerender(
      <MemoryRouter>
        <SectionReport
          historyId="hist-pt"
          onBack={vi.fn()}
          onStartOver={onStartOver}
        />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull());
  });

  it('never renders fallbackData when historyId lookup errors or is not-found, and forwards clicked qid + row (F6)', async () => {
    const staleMemoryFallback: SectionReportData = {
      pt: 130,
      section: 2,
      stats: [],
      initialScore: 99,
      initialTotal: 99,
      initialPercent: 99,
      brScore: null,
      brPercent: null,
      brDelta: null,
      totalTimeMs: 1000,
      avgTimeMs: 1000,
      unansweredCount: 0,
      predictedScore: null,
      showPredictionStatus: false,
      analysis: null,
      analysisSource: 'first-pass',
      brUsed: false,
      sectionClock: null,
      hasDetail: false,
    };

    mockFetchOwnedSectionReport.mockRejectedValueOnce(new Error('Account report lookup failed'));
    const { rerender } = render(
      <MemoryRouter>
        <SectionReport
          historyId="hist-err"
          fallbackData={staleMemoryFallback}
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Account report lookup failed')).toBeTruthy();
    expect(screen.queryByText('99%')).toBeNull();

    mockFetchOwnedSectionReport.mockResolvedValueOnce({ state: 'not-found' });
    rerender(
      <MemoryRouter>
        <SectionReport
          historyId="hist-missing"
          fallbackData={staleMemoryFallback}
          onBack={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('This section report was not found in your account.')).toBeTruthy();
    expect(screen.queryByText('99%')).toBeNull();

    const onReviewSection = vi.fn();
    mockFetchOwnedSectionReport.mockResolvedValueOnce({ state: 'released', row: baseRow });
    rerender(
      <MemoryRouter>
        <SectionReport
          historyId="hist-1"
          fallbackData={staleMemoryFallback}
          onBack={vi.fn()}
          onReviewSection={onReviewSection}
        />
      </MemoryRouter>,
    );
    await screen.findByText(/PT130\.S2/);
    fireEvent.click(screen.getByRole('button', { name: /^Q1\b/ }));
    fireEvent.click(screen.getByRole('button', { name: /Open in review walk/i }));
    expect(onReviewSection).toHaveBeenCalledWith('pt130-s2-q1', baseRow, expect.any(HTMLButtonElement));
  });

  it('sorts filtered questions by time spent and restores question order', async () => {
    const [first, second] = baseRow.questions;
    mockFetchOwnedSectionReport.mockResolvedValue({
      state: 'released',
      row: { ...baseRow, questions: [first, { ...second, timeMs: 120_000 }] },
    });
    render(<MemoryRouter><SectionReport historyId="hist-1" onBack={vi.fn()} /></MemoryRouter>);

    const sort = await screen.findByRole('combobox', { name: 'Sort by' });
    const firstQuestion = () => screen.getAllByRole('button', { name: /^Q\d+\b/ })[0];
    expect(firstQuestion()).toHaveTextContent('Q1');

    fireEvent.change(sort, { target: { value: 'time' } });
    expect(firstQuestion()).toHaveTextContent('Q2');
    fireEvent.click(screen.getByRole('button', { name: /^Incorrect\b/ }));
    expect(screen.getAllByRole('button', { name: /^Q\d+\b/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^All questions\b/ }));
    expect(firstQuestion()).toHaveTextContent('Q2');

    fireEvent.change(sort, { target: { value: 'question' } });
    expect(firstQuestion()).toHaveTextContent('Q1');

    const breakdown = screen.getByRole('region', { name: 'Section breakdown' });
    fireEvent.click(within(breakdown).getByRole('button', { name: /Flaw/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter: Type: Flaw' }));
    expect(screen.getByRole('button', { name: /^All questions\b/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Question review' })).toHaveFocus();
  });

  it('restores the report state and focus after a full-order question walk', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({ state: 'released', row: baseRow });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1']}>
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      fireEvent.change(await screen.findByRole('combobox', { name: 'Sort by' }), { target: { value: 'time' } });
      fireEvent.click(screen.getByRole('button', { name: /^Flagged\b/ }));
      fireEvent.click(screen.getByRole('button', { name: /^Q2\b/ }));
      const trigger = screen.getByRole('button', { name: 'Open in review walk' });
      // Safari leaves focus where it was when a button is clicked.
      screen.getByRole('combobox', { name: 'Sort by' }).focus();
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });
      fireEvent.click(trigger);

      const returnButton = await screen.findByRole('button', { name: 'Return from question 2 of 2' });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 0, behavior: 'instant' });
      fireEvent.click(returnButton);
      expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('time');
      expect(screen.getByRole('button', { name: 'Clear filter: Flagged' })).toBeVisible();
      expect(screen.queryByRole('button', { name: /^Q1\b/ })).toBeNull();
      expect(trigger).toHaveFocus();
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 640, behavior: 'instant' });
      expect(mockFetchOwnedSectionReport).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
      scrollTo.mockRestore();
      client.clear();
    }
  });

  it('opens a deep-linked question walk from one owner-scoped report fetch', async () => {
    mockFetchOwnedSectionReport.mockResolvedValue({ state: 'released', row: baseRow });
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1?walk=1&qid=pt130-s2-q2']}>
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      expect(await screen.findByRole('button', { name: 'Return from question 2 of 2' })).toBeVisible();
      expect(mockFetchOwnedSectionReport).toHaveBeenCalledExactlyOnceWith('u1', 'hist-1');
      expect(screen.queryByRole('heading', { name: 'Question review' })).toBeNull();
    } finally {
      client.clear();
    }
  });

  it('drops the opening status when the walk request leaves the address before loading', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    mockFetchOwnedSectionReport
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue({ state: 'released', row: baseRow });
    function GoToReport() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate('/review/section/hist-1')}>Go to report</button>
          <button onClick={() => navigate(-1)}>Browser back</button>
        </>
      );
    }
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1?walk=1']}>
            <GoToReport />
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Opening review walk');
      fireEvent.click(screen.getByRole('button', { name: 'Go to report' }));
      expect(await screen.findByRole('heading', { name: 'Question review' })).toBeVisible();
      expect(screen.queryByText(/Opening review walk/)).toBeNull();

      // Open the walk from the report, then go back to the original ?walk=1 entry.
      fireEvent.click(screen.getByRole('button', { name: 'Open review walk' }));
      expect(await screen.findByRole('button', { name: 'Return from question 1 of 2' })).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
      await waitFor(() => expect(screen.queryByText(/Opening review walk/)).toBeNull());
      expect(screen.getByRole('button', { name: 'Return from question 1 of 2' })).toBeVisible();
    } finally {
      scrollSpy.mockRestore();
      client.clear();
    }
  });

  it('starts a later general walk at the first question after an abandoned question link', async () => {
    mockFetchOwnedSectionReport
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue({ state: 'released', row: baseRow });
    function Nav() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate('/review/section/hist-1')}>Go to report</button>
          <button onClick={() => navigate('/review/section/hist-1?walk=1')}>Go to walk</button>
        </>
      );
    }
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1?qid=pt130-s2-q2']}>
            <Nav />
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Go to report' }));
      await screen.findByRole('heading', { name: 'Question review' });
      fireEvent.click(screen.getByRole('button', { name: 'Go to walk' }));
      expect(await screen.findByRole('button', { name: 'Return from question 1 of 2' })).toBeVisible();
    } finally {
      client.clear();
    }
  });

  it('holds the report while a history-navigated question link loads', async () => {
    let resolveWalk: (value: OwnedSectionReportResult) => void = () => {};
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveWalk = resolve; }))
      .mockResolvedValue({ state: 'released', row: baseRow });
    function GoToQuestion() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/review/section/hist-1?qid=pt130-s2-q2')}>Go to Q2</button>;
    }
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1']}>
            <GoToQuestion />
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      await screen.findByRole('heading', { name: 'Question review' });
      fireEvent.click(screen.getByRole('button', { name: 'Go to Q2' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Opening review walk');
      expect(screen.queryByRole('button', { name: 'Open review walk' })).toBeNull();
      resolveWalk({ state: 'released', row: baseRow });
      expect(await screen.findByRole('button', { name: 'Return from question 2 of 2' })).toBeVisible();
    } finally {
      scrollSpy.mockRestore();
      client.clear();
    }
  });

  it('does not start a second blind review when another tab already finished it', async () => {
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockResolvedValue({ state: 'released', row: { ...baseRow, brUsed: true, brScore: 22, brPercent: 88, brDelta: 2 } });
    const client = new QueryClient();
    try {
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/review/section/hist-1']}>
            <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Do blind review' }));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Do blind review' })).toBeNull());
      expect(screen.getByRole('heading', { name: 'Question review' })).toBeVisible();
      expect(mockFetchOwnedSectionReport.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      client.clear();
    }
  });

  function renderPage(initialEntry: string, extra?: ReactNode) {
    const client = new QueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          {extra}
          <Routes><Route path="/review/section/:historyId" element={<SectionReportPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    return { ...view, client };
  }

  it('keeps the report state when a history-navigated question link is abandoned', async () => {
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockImplementationOnce(() => new Promise(() => {}));
    function Nav() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate('/review/section/hist-1?qid=pt130-s2-q2')}>Go to Q2</button>
          <button onClick={() => navigate(-1)}>Browser back</button>
        </>
      );
    }
    const { client } = renderPage('/review/section/hist-1', <Nav />);
    try {
      fireEvent.change(await screen.findByRole('combobox', { name: 'Sort by' }), { target: { value: 'time' } });
      fireEvent.click(screen.getByRole('button', { name: /^Flagged\b/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Go to Q2' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Opening review walk');
      fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
      expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('time');
      expect(screen.getByRole('button', { name: 'Clear filter: Flagged' })).toBeVisible();
      expect(mockFetchOwnedSectionReport).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  });

  it('covers the report while blind review is checked, so the walk cannot open underneath', async () => {
    let resolveCheck: (value: OwnedSectionReportResult) => void = () => {};
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCheck = resolve; }));
    const { client } = renderPage('/review/section/hist-1');
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Do blind review' }));
      expect(screen.getByRole('status')).toHaveTextContent('Opening blind review');
      expect(screen.queryByRole('button', { name: 'Open review walk' })).toBeNull();
      resolveCheck({ state: 'released', row: baseRow });
      expect(await screen.findByRole('button', { name: 'Leave blind review' })).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Leave blind review' }));
      expect(await screen.findByRole('combobox', { name: 'Sort by' })).toBeVisible();
      expect(mockFetchOwnedSectionReport).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  });

  it('does not start blind review when the check fails, and drops a check after leaving', async () => {
    let resolveLate: (value: OwnedSectionReportResult) => void = () => {};
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockRejectedValueOnce(new Error('network down'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveLate = resolve; }));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, unmount } = renderPage('/review/section/hist-1');
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Do blind review' }));
      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Could not open blind review. Please try again.'));
      expect(screen.queryByRole('button', { name: 'Leave blind review' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Do blind review' })).toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: 'Do blind review' }));
      unmount();
      resolveLate({ state: 'released', row: { ...baseRow, brUsed: true } });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockToast.info).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      client.clear();
    }
  });

  it('refreshes instead of starting when the fresh read is not eligible', async () => {
    mockFetchOwnedSectionReport
      .mockResolvedValueOnce({ state: 'released', row: baseRow })
      .mockResolvedValueOnce({ state: 'not-found' })
      .mockResolvedValue({ state: 'released', row: baseRow });
    const { client } = renderPage('/review/section/hist-1');
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Do blind review' }));
      await waitFor(() => expect(mockFetchOwnedSectionReport).toHaveBeenCalledTimes(3));
      expect(screen.queryByRole('button', { name: 'Leave blind review' })).toBeNull();
    } finally {
      client.clear();
    }
  });
});
