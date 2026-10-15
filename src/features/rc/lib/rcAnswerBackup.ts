import type { RcLetter } from './rcTypes';

export type PendingRcAnswer = {
  userId: string;
  sessionId: string;
  questionId: number;
  selected: RcLetter;
  attemptId: string;
  currentIndex: number;
  elapsed: number;
  /** Set only when the student explicitly asks to save/confirm this answer. */
  saveRequested?: boolean;
};

const backupKey = (userId: string, sessionId: string) => `lsatu:rc-answer:${userId}:${sessionId}`;

export function readRcAnswerBackups(userId: string, sessionId: string): PendingRcAnswer[] {
  try {
    const raw = window.localStorage.getItem(backupKey(userId, sessionId));
    if (!raw) return [];
    const stored = JSON.parse(raw);
    // Existing devices have one scalar answer. Read it without discarding it
    // when the device first upgrades to the multi-question draft format.
    const answers = Array.isArray(stored?.answers) ? stored.answers : [stored];
    return answers.filter((value): value is PendingRcAnswer => value
      && value.userId === userId && value.sessionId === sessionId
      && Number.isInteger(value.questionId) && /^[A-E]$/.test(value.selected)
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.attemptId)
      && Number.isInteger(value.currentIndex) && Number.isFinite(value.elapsed));
  } catch {
    return [];
  }
}

export function readRcAnswerBackup(userId: string, sessionId: string): PendingRcAnswer | null {
  return readRcAnswerBackups(userId, sessionId).at(-1) ?? null;
}

export function writeRcAnswerBackup(
  userId: string,
  sessionId: string,
  answer: Omit<PendingRcAnswer, 'userId' | 'sessionId'>,
): boolean {
  try {
    const answers = readRcAnswerBackups(userId, sessionId).filter((entry) => entry.questionId !== answer.questionId);
    answers.push({ userId, sessionId, ...answer });
    window.localStorage.setItem(backupKey(userId, sessionId), JSON.stringify({ answers }));
    return true;
  } catch (error) {
    console.warn('[rc:answer] device backup unavailable', error);
    return false;
  }
}

export function requestRcAnswerBackupSave(userId: string, sessionId: string, questionIds: number[]): boolean {
  try {
    const answers = readRcAnswerBackups(userId, sessionId);
    if (!answers.length) return true;
    window.localStorage.setItem(backupKey(userId, sessionId), JSON.stringify({
      answers: answers.map((answer) => questionIds.includes(answer.questionId) ? { ...answer, saveRequested: true } : answer),
    }));
    return true;
  } catch (error) {
    console.warn('[rc:answer] device save intent unavailable', error);
    return false;
  }
}

export function clearRcAnswerBackup(userId: string, sessionId: string, questionId?: number, attemptId?: string): void {
  try {
    if (questionId == null) {
      window.localStorage.removeItem(backupKey(userId, sessionId));
      return;
    }
    const answers = readRcAnswerBackups(userId, sessionId);
    const remaining = answers.filter((answer) => answer.questionId !== questionId || answer.attemptId !== attemptId);
    if (remaining.length === answers.length) return;
    if (remaining.length) window.localStorage.setItem(backupKey(userId, sessionId), JSON.stringify({ answers: remaining }));
    else window.localStorage.removeItem(backupKey(userId, sessionId));
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
  return readActiveRcAnswerBackups(userId, sessionId, status, reviewOnly).at(-1) ?? null;
}

export function readActiveRcAnswerBackups(
  userId: string,
  sessionId: string,
  status: string | null,
  reviewOnly: boolean,
): PendingRcAnswer[] {
  if (status !== 'in_progress' || reviewOnly) {
    if (status === 'completed') clearRcAnswerBackup(userId, sessionId);
    return [];
  }
  return readRcAnswerBackups(userId, sessionId);
}
