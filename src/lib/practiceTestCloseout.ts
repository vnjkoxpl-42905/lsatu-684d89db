/**
 * Closeout bookkeeping for one leg of a practice test.
 *
 * Finishing a leg is several writes, not one: the per-question attempts, the
 * wrong answer journal, the `section_history` row, and finally the resume
 * record. Any of them can fail, and a retry must not redo the parts that
 * already landed. A phase-level boolean is too coarse for that, because
 * `commitSessionAttempts` can save SOME attempts and then throw.
 *
 * So progress is tracked per question, under its own key. It deliberately does
 * NOT graft fields onto the drill resume record: that record's persisted shape
 * parses only known fields, and widening it is surgery this does not need.
 *
 * The ordering the caller must follow is:
 *
 *   attempts -> WAJ coverage complete -> section_history -> finalize resume
 *
 * WAJ coverage gates the history write rather than following it. The invigilator
 * treats the presence of a `section_history` row as "this leg is finished" and
 * advances past it, so writing history first makes the journal retry
 * unreachable. A leg that is unscored but recoverable beats a leg that is scored
 * with misses missing from the journal forever.
 */

export interface CloseoutProgress {
  /** Questions whose attempt row has been written. */
  savedQids: string[];
  /** Questions already journaled as wrong answers. */
  wajQids: string[];
  /** Whether the `section_history` row landed. */
  historySaved: boolean;
}

const EMPTY: CloseoutProgress = {
  savedQids: [],
  wajQids: [],
  historySaved: false,
};

export function closeoutKey(
  userId: string,
  runId: string,
  legIndex: number,
): string {
  return `lsatu:pt-closeout:${userId}:${runId}:${legIndex}`;
}

/**
 * Reads closeout progress.
 *
 * Any unreadable or malformed value is treated as "no progress", which costs at
 * most some redundant writes. Throwing here would strand the student on a drill
 * screen, which is the one outcome worth avoiding.
 */
export function readCloseoutProgress(key: string): CloseoutProgress {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<CloseoutProgress>;
    return {
      savedQids: Array.isArray(parsed.savedQids) ? parsed.savedQids : [],
      wajQids: Array.isArray(parsed.wajQids) ? parsed.wajQids : [],
      historySaved: parsed.historySaved === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeCloseoutProgress(
  key: string,
  progress: CloseoutProgress,
): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // A full or unavailable store costs a redundant retry, not correctness.
  }
}

export function clearCloseoutProgress(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing useful to do; the key is keyed by run and leg, so a stale entry
    // is only ever read by a retry of this same leg.
  }
}

/** Merges newly written qids into stored progress, without duplicates. */
export function recordCloseoutProgress(
  key: string,
  delta: Partial<CloseoutProgress>,
): CloseoutProgress {
  const current = readCloseoutProgress(key);
  const next: CloseoutProgress = {
    savedQids: union(current.savedQids, delta.savedQids),
    wajQids: union(current.wajQids, delta.wajQids),
    historySaved: delta.historySaved ?? current.historySaved,
  };
  writeCloseoutProgress(key, next);
  return next;
}

function union(a: string[], b?: string[]): string[] {
  if (!b || b.length === 0) return a;
  return Array.from(new Set([...a, ...b]));
}

/**
 * The journal entries still owed for this leg.
 *
 * Empty means the journal is complete and the `section_history` row may be
 * written. Anything else means the leg is not finished yet.
 */
export function outstandingWajQids(
  expected: string[],
  progress: CloseoutProgress,
): string[] {
  const done = new Set(progress.wajQids);
  return expected.filter((qid) => !done.has(qid));
}
