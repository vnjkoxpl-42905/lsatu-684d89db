import { describe, expect, it } from 'vitest';
import {
  formatPassageStatusLabel,
  matchesFilters,
  passageStatus,
  rollingAccuracy,
  type RcIndexPassageWithPt,
  type RcSelectionFilters,
} from './rcAdaptive';
import type { RcQuestionHistory, RcQuestionHistoryEntry } from './rcTypes';

const basePassage: RcIndexPassageWithPt = {
  passageId: 500,
  preptest: 140,
  section: 1,
  setNumber: 1,
  title: 'Test Passage',
  firstWords: 'In recent years',
  topic: 'Science',
  format: 'Standard',
  frameworks: ['Thesis'],
  difficulty: 3,
  questionCount: 2,
  explainedCount: 2,
  questionIds: [5001, 5002],
};

const baseFilters: RcSelectionFilters = {
  topics: [],
  formats: [],
  frameworks: [],
  families: [],
  difficulties: [],
  status: 'any',
  preptestMin: 101,
  preptestMax: 158,
};

function makeHistory(entries: RcQuestionHistoryEntry[]): RcQuestionHistory {
  return new Map(entries.map((entry) => [entry.questionId, entry]));
}

describe('passageStatus and formatPassageStatusLabel', () => {
  it('marks a passage with no history as not_attempted and Fresh', () => {
    const status = passageStatus(basePassage, [5001, 5002], new Map());
    expect(status.state).toBe('not_attempted');
    expect(status.attempted).toBe(false);
    expect(formatPassageStatusLabel(status)).toBe('Not attempted');
    expect(matchesFilters(basePassage, { ...baseFilters, status: 'fresh' }, status)).toBe(true);
  });

  it('marks a passage with only skipped attempts as skipped_only and Skipped, never Completed', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: false,
        firstTakeCorrect: null,
        unansweredOnFirstTake: true,
        everCorrect: false,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: false,
        firstTakeCorrect: null,
        unansweredOnFirstTake: true,
        everCorrect: false,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    const status = passageStatus(basePassage, [5001, 5002], history);
    expect(status.state).toBe('skipped_only');
    expect(status.attempted).toBe(true);
    expect(status.missed).toBe(0);
    expect(formatPassageStatusLabel(status)).toBe('Skipped');
    expect(matchesFilters(basePassage, { ...baseFilters, status: 'fresh' }, status)).toBe(false);
  });

  it('marks a completed session with one answered and one skipped question as partial, never Completed', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        unansweredOnFirstTake: false,
        everCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-1'],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: false,
        firstTakeCorrect: null,
        unansweredOnFirstTake: true,
        everCorrect: false,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    const status = passageStatus(basePassage, [5001, 5002], history);
    expect(status.state).toBe('partial');
    expect(formatPassageStatusLabel(status)).toBe('Partial');
  });

  it('marks an in_progress session as partial even if all questions in the passage have answers', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        unansweredOnFirstTake: false,
        everCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: true,
        firstTakeCorrect: false,
        unansweredOnFirstTake: false,
        everCorrect: false,
        everIncorrect: true,
        incorrectOnLastTake: true,
        lastFirstTakeIncorrect: true,
        incorrectCount: 1,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    const status = passageStatus(basePassage, [5001, 5002], history);
    expect(status.state).toBe('partial');
    expect(status.attempted).toBe(true);
    expect(formatPassageStatusLabel(status)).toBe('Partial · 1 missed');
    expect(matchesFilters(basePassage, { ...baseFilters, status: 'fresh' }, status)).toBe(false);
  });

  it('requires a single completed session covering every question to mark a passage completed', () => {
    const splitAcrossSessions = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-a'],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-b'],
        lastSeenAt: '2026-10-11T00:00:00Z',
      },
    ]);
    expect(passageStatus(basePassage, [5001, 5002], splitAcrossSessions).state).toBe('partial');

    const completedTogether = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-shared'],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-shared'],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    const completedStatus = passageStatus(basePassage, [5001, 5002], completedTogether);
    expect(completedStatus.state).toBe('completed');
    expect(formatPassageStatusLabel(completedStatus)).toBe('Completed');
  });
});

describe('rollingAccuracy and blind-review separation', () => {
  it('does not promote an old grade into the recent forty after ungraded exposure', () => {
    const history = new Map(Array.from({ length: 41 }, (_, index) => [index, {
      questionId: index, attempts: 1, answered: true, everIncorrect: index === 0,
      incorrectOnLastTake: index === 0, incorrectCount: index === 0 ? 1 : 0,
      firstTakeCorrect: index !== 0,
      lastGradedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      lastSeenAt: index === 0 ? '2026-10-17T00:00:00Z' : new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    }]));
    expect(rollingAccuracy(history)).toBe(1);
  });
  it('excludes skipped and abandoned rows from rollingAccuracy and never counts null is_correct as right', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: false,
        firstTakeCorrect: null,
        unansweredOnFirstTake: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: false,
        firstTakeCorrect: null,
        unansweredOnFirstTake: false,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    expect(rollingAccuracy(history)).toBeNull();
  });

  it('uses firstTakeCorrect only and ignores blind-review fixes in rollingAccuracy and incorrect_last filter', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 2,
        answered: true,
        firstTakeCorrect: false,
        unansweredOnFirstTake: false,
        everCorrect: false,
        everIncorrect: true,
        incorrectOnLastTake: true,
        lastFirstTakeIncorrect: true,
        incorrectCount: 1,
        reviewCorrected: true,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-1'],
        lastSeenAt: '2026-10-10T00:10:00Z',
      },
      {
        questionId: 5002,
        attempts: 1,
        answered: true,
        firstTakeCorrect: true,
        unansweredOnFirstTake: false,
        everCorrect: true,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: true,
        completedAnsweredSessionIds: ['sess-1'],
        lastSeenAt: '2026-10-10T00:05:00Z',
      },
    ]);

    expect(rollingAccuracy(history)).toBe(0.5);
    const status = passageStatus(basePassage, [5001, 5002], history);
    expect(status.lastFirstTakeIncorrect).toBe(true);
    expect(status.incorrectOnLastTake).toBe(true);
    expect(status.reviewCorrected).toBe(true);
    expect(matchesFilters(basePassage, { ...baseFilters, status: 'incorrect_last' }, status)).toBe(
      true,
    );
  });

  it('classifies an abandoned-only passage as partial (Partial) rather than skipped_only (Skipped), while keeping it excluded from Fresh', () => {
    const history = makeHistory([
      {
        questionId: 5001,
        attempts: 1,
        answered: false,
        firstEverCorrect: null,
        firstTakeCorrect: null,
        unansweredOnFirstTake: false,
        everCorrect: false,
        everIncorrect: false,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 0,
        reviewCorrected: false,
        completedAnswered: false,
        completedAnsweredSessionIds: [],
        lastSeenAt: '2026-10-10T00:00:00Z',
      },
    ]);
    const status = passageStatus(basePassage, [5001, 5002], history);
    expect(status.state).toBe('partial');
    expect(formatPassageStatusLabel(status)).toBe('Partial');
    expect(matchesFilters(basePassage, { ...baseFilters, status: 'fresh' }, status)).toBe(false);
  });

  it('keeps rollingAccuracy and Incorrect on last try consistent across multi-drill retakes (Drill 1 wrong -> Drill 2 right, and Drill 1 right -> Drill 2 wrong)', () => {
    // Case A: Drill 1 wrong -> Drill 2 right
    const wrongThenRight = makeHistory([
      {
        questionId: 5001,
        attempts: 2,
        answered: true,
        firstEverCorrect: false,
        firstTakeCorrect: true,
        unansweredOnFirstTake: false,
        everCorrect: true,
        everIncorrect: true,
        incorrectOnLastTake: false,
        lastFirstTakeIncorrect: false,
        incorrectCount: 1,
        reviewCorrected: false,
        completedAnswered: true,
        completedAnsweredSessionIds: ['drill-1', 'drill-2'],
        lastSeenAt: '2026-10-12T00:00:00Z',
      },
    ]);
    expect(rollingAccuracy(wrongThenRight)).toBe(1);
    const statusWrongThenRight = passageStatus(basePassage, [5001, 5002], wrongThenRight);
    expect(statusWrongThenRight.everIncorrect).toBe(true);
    expect(statusWrongThenRight.lastFirstTakeIncorrect).toBe(false);
    expect(
      matchesFilters(
        basePassage,
        { ...baseFilters, status: 'incorrect_last' },
        statusWrongThenRight,
      ),
    ).toBe(false);
    expect(
      matchesFilters(
        basePassage,
        { ...baseFilters, status: 'incorrect_before' },
        statusWrongThenRight,
      ),
    ).toBe(true);

    // Case B: Drill 1 right -> Drill 2 wrong
    const rightThenWrong = makeHistory([
      {
        questionId: 5001,
        attempts: 2,
        answered: true,
        firstEverCorrect: true,
        firstTakeCorrect: false,
        unansweredOnFirstTake: false,
        everCorrect: true,
        everIncorrect: true,
        incorrectOnLastTake: true,
        lastFirstTakeIncorrect: true,
        incorrectCount: 1,
        reviewCorrected: false,
        completedAnswered: true,
        completedAnsweredSessionIds: ['drill-1', 'drill-2'],
        lastSeenAt: '2026-10-12T00:00:00Z',
      },
    ]);
    expect(rollingAccuracy(rightThenWrong)).toBe(0);
    const statusRightThenWrong = passageStatus(basePassage, [5001, 5002], rightThenWrong);
    expect(statusRightThenWrong.lastFirstTakeIncorrect).toBe(true);
    expect(
      matchesFilters(
        basePassage,
        { ...baseFilters, status: 'incorrect_last' },
        statusRightThenWrong,
      ),
    ).toBe(true);
  });
});

