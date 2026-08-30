/**
 * What the per-question timeline actually draws.
 *
 * Three things have to hold or the row lies about the sitting: every answer
 * the student put down appears, the last one carries the verdict colour, and
 * the pace tick is the clock they actually sat rather than the national 35.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LRSectionResults } from './LRSectionResults';
import type { DrillSession } from '@/types/drill';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/sectionHistorySave', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sectionHistorySave')>(
    '@/lib/sectionHistorySave',
  );
  return {
    ...actual,
    persistSectionResults: () => Promise.resolve(),
    logSectionWrongAnswers: () => Promise.resolve(),
    wajQidsForSection: () => Promise.resolve(new Set<string>()),
  };
});
vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => ({
      qid,
      qtype: 'Necessary Assumption',
      difficulty: 3,
      correctAnswer: 'C',
    }),
  },
}));

/** One question, answered A at 0:30 and changed to B at 1:30. C was right. */
const session = {
  mode: 'full-section',
  fullSectionConfig: {
    pt: 130,
    section: 1,
    // Time and a half: 52.5 minutes, which is the clock the pace tick must use.
    timer: { mode: '52.5', isPaused: false, elapsedMs: 0, startedAt: 0 },
  },
  questionQueue: ['q1'],
  currentIndex: 1,
  attempts: new Map([
    [
      'q1',
      {
        selectedAnswer: 'B',
        correct: false,
        timeMs: 95_000,
        timestamp: 0,
        switchCount: 1,
        answerTrail: [
          { answer: 'A', atMs: 30_000 },
          { answer: 'B', atMs: 90_000 },
        ],
      },
    ],
  ]),
} as unknown as DrillSession;

/** The same section, carried past its own buzzer with one question left. */
const overtimeSession = {
  ...session,
  questionQueue: ['q1', 'q2'],
  regulationMark: { answeredQids: ['q1'] },
  attempts: new Map([
    ...Array.from((session.attempts as Map<string, unknown>).entries()),
    ['q2', { selectedAnswer: 'C', correct: true, timeMs: 40_000, timestamp: 0 }],
  ]),
} as unknown as DrillSession;

describe('LRSectionResults answer timeline', () => {
  it('draws every answer the student put down, in order', () => {
    render(
      <MemoryRouter>
        <LRSectionResults session={session} classId="c1" onBack={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByTitle('A at 0:30')).toBeTruthy();
    expect(screen.getByTitle('B at 1:30')).toBeTruthy();
  });

  it('measures against the clock the student actually sat', () => {
    render(
      <MemoryRouter>
        <LRSectionResults session={session} classId="c1" onBack={vi.fn()} />
      </MemoryRouter>,
    );

    // The clock they sat, named the way they chose it.
    expect(screen.getByText(/pace · 52:30 section · Time and a half/)).toBeTruthy();
  });

  it('separates what was answered inside the clock from what came after', () => {
    render(
      <MemoryRouter>
        <LRSectionResults session={overtimeSession} classId="c1" onBack={vi.fn()} />
      </MemoryRouter>,
    );

    // q1 was answered at the buzzer and got it wrong; q2 came after.
    expect(screen.getByText(/At time: 0\/1 on the 1 questions you reached/)).toBeTruthy();
    expect(screen.getByText(/answered after the clock ran out \(1 right\)/)).toBeTruthy();
    expect(screen.getByText(/· overtime/)).toBeTruthy();
  });
});
