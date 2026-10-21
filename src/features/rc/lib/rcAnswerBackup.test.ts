import { beforeEach, expect, it, vi } from 'vitest';
import { clearRcAnswerBackup, readActiveRcAnswerBackup, readRcAnswerBackup, writeRcAnswerBackup } from './rcAnswerBackup';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const attemptId = '55555555-5555-4555-8555-555555555555';

beforeEach(() => window.localStorage.clear());

it('keeps an unsaved answer on this device, scoped to owner and session', () => {
  expect(writeRcAnswerBackup(owner, session, {
    questionId: 7,
    selected: 'C',
    attemptId,
    currentIndex: 3,
    elapsed: 105,
  })).toBe(true);
  expect(readRcAnswerBackup(owner, session)?.selected).toBe('C');
  expect(readRcAnswerBackup(owner, session)?.attemptId).toBe(attemptId);
  expect(readRcAnswerBackup(other, session)).toBeNull();
  expect(readRcAnswerBackup(owner, '44444444-4444-4444-8444-444444444444')).toBeNull();
  clearRcAnswerBackup(owner, session);
  expect(readRcAnswerBackup(owner, session)).toBeNull();
});

it('rejects a copied backup whose embedded owner or session differs', () => {
  writeRcAnswerBackup(owner, session, {
    questionId: 7,
    selected: 'C',
    attemptId,
    currentIndex: 3,
    elapsed: 105,
  });
  const raw = window.localStorage.getItem(`lsatu:rc-answer:${owner}:${session}`);
  window.localStorage.setItem(`lsatu:rc-answer:${other}:${session}`, raw!);
  expect(readRcAnswerBackup(other, session)).toBeNull();
});

it('does not replay a pending answer into a completed session', () => {
  writeRcAnswerBackup(owner, session, {
    questionId: 7,
    selected: 'C',
    attemptId,
    currentIndex: 3,
    elapsed: 105,
  });
  expect(readActiveRcAnswerBackup(owner, session, 'completed', false)).toBeNull();
  expect(readRcAnswerBackup(owner, session)).toBeNull();
});

it('does not replay an old backup without a stable attempt ID', () => {
  window.localStorage.setItem(`lsatu:rc-answer:${owner}:${session}`, JSON.stringify({
    userId: owner, sessionId: session, questionId: 7, selected: 'C', currentIndex: 3, elapsed: 105,
  }));
  expect(readRcAnswerBackup(owner, session)).toBeNull();
});

it('reports device backup failure instead of claiming the answer is protected', () => {
  const failure = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new Error('storage disabled');
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    expect(writeRcAnswerBackup(owner, session, {
      questionId: 7, selected: 'C', attemptId, currentIndex: 3, elapsed: 105,
    })).toBe(false);
    expect(readRcAnswerBackup(owner, session)).toBeNull();
  } finally {
    failure.mockRestore();
    warning.mockRestore();
  }
});
