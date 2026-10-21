import type { RcLetter } from './rcTypes';

export type PendingRcAnswer = {
  userId: string;
  sessionId: string;
  questionId: number;
  selected: RcLetter;
  attemptId: string;
  currentIndex: number;
  elapsed: number;
};

const backupKey = (userId: string, sessionId: string) => `lsatu:rc-answer:${userId}:${sessionId}`;

export function readRcAnswerBackup(userId: string, sessionId: string): PendingRcAnswer | null {
  try {
    const raw = window.localStorage.getItem(backupKey(userId, sessionId));
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingRcAnswer;
    return value.userId === userId && value.sessionId === sessionId
      && Number.isInteger(value.questionId) && /^[A-E]$/.test(value.selected)
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.attemptId)
      && Number.isInteger(value.currentIndex) && Number.isFinite(value.elapsed)
      ? value : null;
  } catch {
    return null;
  }
}

export function writeRcAnswerBackup(
  userId: string,
  sessionId: string,
  answer: Omit<PendingRcAnswer, 'userId' | 'sessionId'>,
): boolean {
  try {
    window.localStorage.setItem(backupKey(userId, sessionId), JSON.stringify({ userId, sessionId, ...answer }));
    return true;
  } catch (error) {
    console.warn('[rc:answer] device backup unavailable', error);
    return false;
  }
}

export function clearRcAnswerBackup(userId: string, sessionId: string): void {
  try {
    window.localStorage.removeItem(backupKey(userId, sessionId));
  } catch {
    // Account acknowledgment is authoritative.
  }
}

export function readActiveRcAnswerBackup(
  userId: string,
  sessionId: string,
  status: string | null,
  reviewOnly: boolean,
): PendingRcAnswer | null {
  if (status !== 'in_progress' || reviewOnly) {
    if (status === 'completed') clearRcAnswerBackup(userId, sessionId);
    return null;
  }
  return readRcAnswerBackup(userId, sessionId);
}
