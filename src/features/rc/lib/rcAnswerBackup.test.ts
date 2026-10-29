import { beforeEach, expect, it, vi } from 'vitest';
import { clearRcAnswerBackup, readActiveRcAnswerBackup, readRcAnswerBackup, readRcAnswerBackups, requestRcAnswerBackupSave, writeRcAnswerBackup } from './rcAnswerBackup';

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

it('preserves legacy drafts and other questions when a matching answer is acknowledged', () => {
  window.localStorage.setItem(`lsatu:rc-answer:${owner}:${session}`, JSON.stringify({
    userId: owner, sessionId: session, questionId: 7, selected: 'C', attemptId, currentIndex: 3, elapsed: 105,
  }));
  const secondAttemptId = '66666666-6666-4666-8666-666666666666';
  writeRcAnswerBackup(owner, session, {
    questionId: 8, selected: 'B', attemptId: secondAttemptId, currentIndex: 4, elapsed: 106,
  });
  expect(readRcAnswerBackups(owner, session).map((answer) => answer.questionId)).toEqual([7, 8]);
  expect(readRcAnswerBackups(owner, session).some((answer) => answer.saveRequested)).toBe(false);
  clearRcAnswerBackup(owner, session, 7, attemptId);
  expect(readRcAnswerBackups(owner, session).map((answer) => answer.questionId)).toEqual([8]);
  clearRcAnswerBackup(owner, session, 8, secondAttemptId);
  expect(readRcAnswerBackups(owner, session)).toEqual([]);
});

it('does not let an older acknowledgement remove a newer choice for the same question', () => {
  writeRcAnswerBackup(owner, session, {
    questionId: 7, selected: 'C', attemptId, currentIndex: 3, elapsed: 105,
  });
  requestRcAnswerBackupSave(owner, session, [7]);
  expect(readRcAnswerBackup(owner, session)?.saveRequested).toBe(true);
  const newerAttemptId = '77777777-7777-4777-8777-777777777777';
  writeRcAnswerBackup(owner, session, {
    questionId: 7, selected: 'D', attemptId: newerAttemptId, currentIndex: 3, elapsed: 107, saveRequested: false,
  });
  clearRcAnswerBackup(owner, session, 7, attemptId);
  expect(readRcAnswerBackups(owner, session)).toHaveLength(1);
  expect(readRcAnswerBackup(owner, session)).toMatchObject({ selected: 'D', attemptId: newerAttemptId, saveRequested: false });
  expect(readActiveRcAnswerBackup(owner, session, 'in_progress', true)).toBeNull();
  expect(readRcAnswerBackup(other, session)).toBeNull();
});
