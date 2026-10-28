// Two small local stores that stand between a student and losing work.
//
// Everything a student types is already written to `activity_item_responses`
// -- but only as part of a SUBMITTED attempt. Between keystrokes and submit
// there was nothing at all, and after a failed write there was nothing either,
// while the toast said "your progress this session still counts". These close
// both gaps without a network write per keystroke, which a draft does not
// deserve.
//
// Every function here is best-effort by design. localStorage throws in private
// modes and when the quota is full, and a failure to cache a draft must never
// take down the run it was meant to protect.

import type { JudgeSource, Verdict } from "./api/types";

const DRAFT_PREFIX = "ac:draft:";
const OUTBOX_KEY = "ac:outbox";
/** Beyond this an outbox is not a retry queue, it is a leak. */
const OUTBOX_LIMIT = 50;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode, or full. The run continues either way. */
  }
}

function drop(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* as above */
  }
}

/* ------------------------------------------------------------------ *
 * Drafts: what they had typed but not yet submitted
 * ------------------------------------------------------------------ */

export function draftKey(assignmentId: string, itemOrder: number): string {
  return `${DRAFT_PREFIX}${assignmentId}:${itemOrder}`;
}

export function saveDraft(key: string, text: string): void {
  if (!text) {
    drop(key);
    return;
  }
  write(key, text);
}

export function loadDraft(key: string): string {
  return read(key) ?? "";
}

export function clearDraft(key: string): void {
  drop(key);
}

/* ------------------------------------------------------------------ *
 * Outbox: attempts the database refused
 * ------------------------------------------------------------------ */

export interface PendingAttempt {
  assignmentId: string;
  studentId: string;
  itemOrder: number;
  responseText: string;
  verdict: Verdict | null;
  attemptNo: number;
  judgeSource?: JudgeSource;
  shadowFault?: string | null;
  latencyMs?: number;
  parserVersion?: string;
}

export function readOutbox(): PendingAttempt[] {
  const raw = read(OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingAttempt[]) : [];
  } catch {
    // Corrupt is not recoverable and not worth carrying forward.
    drop(OUTBOX_KEY);
    return [];
  }
}

function writeOutbox(queue: PendingAttempt[]): void {
  if (queue.length === 0) {
    drop(OUTBOX_KEY);
    return;
  }
  write(OUTBOX_KEY, JSON.stringify(queue.slice(-OUTBOX_LIMIT)));
}

/**
 * Queue an attempt whose write failed. Same (assignment, item, attempt) replaces
 * rather than stacks: a student retrying the same submit should leave one row
 * to flush, not five.
 */
export function queueAttempt(attempt: PendingAttempt): void {
  const queue = readOutbox().filter(
    (a) =>
      !(
        a.assignmentId === attempt.assignmentId &&
        a.itemOrder === attempt.itemOrder &&
        a.attemptNo === attempt.attemptNo
      ),
  );
  queue.push(attempt);
  writeOutbox(queue);
}

/**
 * Try every queued attempt through `send`. Anything that fails again stays
 * queued for the next flush; anything that succeeds leaves. Never throws: a
 * flush is a background repair, not something the student is waiting on.
 */
export async function flushOutbox(
  send: (attempt: PendingAttempt) => Promise<void>,
): Promise<{ sent: number; remaining: number }> {
  const queue = readOutbox();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const stillPending: PendingAttempt[] = [];
  let sent = 0;
  for (const attempt of queue) {
    try {
      await send(attempt);
      sent += 1;
    } catch {
      stillPending.push(attempt);
    }
  }
  writeOutbox(stillPending);
  return { sent, remaining: stillPending.length };
}

export function clearOutbox(): void {
  drop(OUTBOX_KEY);
}
