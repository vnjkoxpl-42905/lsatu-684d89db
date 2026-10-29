/**
 * Study aids a student keeps on a question for themselves: a bookmark, the
 * answer choices they crossed out, and (LR only) their text highlights.
 *
 * None of this is an attempt. Nothing here grades, records, flags, or feeds
 * Review or diagnostics; it is the student's own scratch work, and it lives
 * in this browser's local storage only. It does not follow the account to
 * another device, and the UI must never say it does.
 *
 * Every record is filed under the signed-in actor's id. There is no shared
 * anonymous bucket: without an actor, nothing is read or written. A teacher
 * practising a question files aids under the teacher's own id, so a selected
 * student's records are never touched.
 *
 * A question is named by its family and its canonical id (`lr` + qid such as
 * `PT156-S2-Q1`, `rc` + the bank's numeric question id), so an LR and an RC
 * question can never share a slot.
 */
import type { Highlight, HighlightColor } from '@/lib/highlightUtils';

export type StudyFamily = 'lr' | 'rc';

export interface StudyQuestionRef {
  family: StudyFamily;
  /** Canonical id: the LR qid, or the RC question id as a string. */
  id: string;
}

export interface StudyBookmark extends StudyQuestionRef {
  /** Short human label, e.g. "PT156 · S2 · Q1". */
  label: string;
  /** RC only: the passage the question belongs to, for the open link. */
  passageId?: number;
  addedAt: string;
}

export interface StudyToolsState {
  bookmarks: Record<string, StudyBookmark>;
  eliminations: Record<string, string[]>;
  highlights: Record<string, Highlight[]>;
}

export type StudyStoreStatus = 'ok' | 'unavailable' | 'recovered' | 'incompatible';

export const STUDY_TOOLS_VERSION = 1;
const KEY_PREFIX = 'lsatu.studyTools.v1:';
const MAX_BOOKMARKS = 500;
const LETTERS = /^[A-E]$/;
const COLORS: ReadonlySet<HighlightColor> = new Set(['yellow', 'pink', 'orange', 'underline']);

export function emptyStudyTools(): StudyToolsState {
  return { bookmarks: {}, eliminations: {}, highlights: {} };
}

export function studyToolsStorageKey(actorId: string): string {
  return `${KEY_PREFIX}${actorId}`;
}

export function studyQuestionKey(ref: StudyQuestionRef): string {
  return `${ref.family}:${ref.id}`;
}

function validRef(family: unknown, id: unknown): family is StudyFamily {
  return (family === 'lr' || family === 'rc') && typeof id === 'string' && id.length > 0 && id.length <= 64;
}

function keyMatches(key: string, family: StudyFamily, id: string): boolean {
  return key === `${family}:${id}`;
}

function parseKey(key: string): StudyQuestionRef | null {
  const i = key.indexOf(':');
  if (i < 0) return null;
  const family = key.slice(0, i);
  const id = key.slice(i + 1);
  return validRef(family, id) ? { family, id } : null;
}

function validHighlight(h: unknown): h is Highlight {
  if (!h || typeof h !== 'object') return false;
  const v = h as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    Number.isInteger(v.start) &&
    Number.isInteger(v.end) &&
    (v.start as number) >= 0 &&
    (v.end as number) > (v.start as number) &&
    typeof v.text === 'string' &&
    COLORS.has(v.color as HighlightColor) &&
    typeof v.section === 'string' &&
    (v.section === 'stimulus' || v.section === 'stem' || /^choice:[A-E]$/.test(v.section))
  );
}

/**
 * Keep every well-formed entry and drop the rest one by one, so one bad
 * record costs that record, never the actor's whole store. `dropped` says
 * whether anything was discarded.
 */
export function sanitizeStudyTools(raw: unknown): { state: StudyToolsState; dropped: boolean } {
  const state = emptyStudyTools();
  let dropped = false;
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== STUDY_TOOLS_VERSION) {
    return { state, dropped: raw != null };
  }
  const r = raw as Record<string, unknown>;

  const bookmarks = r.bookmarks && typeof r.bookmarks === 'object' ? (r.bookmarks as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(bookmarks)) {
    const b = value as Partial<StudyBookmark> | null;
    if (
      b &&
      validRef(b.family, b.id) &&
      keyMatches(key, b.family, b.id) &&
      typeof b.label === 'string' &&
      typeof b.addedAt === 'string' &&
      (b.passageId === undefined || Number.isInteger(b.passageId))
    ) {
      state.bookmarks[key] = {
        family: b.family,
        id: b.id,
        label: b.label.slice(0, 120),
        addedAt: b.addedAt,
        ...(b.passageId !== undefined ? { passageId: b.passageId } : {}),
      };
    } else dropped = true;
  }

  const eliminations = r.eliminations && typeof r.eliminations === 'object' ? (r.eliminations as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(eliminations)) {
    if (parseKey(key) && Array.isArray(value) && value.every((l) => typeof l === 'string' && LETTERS.test(l))) {
      if (value.length) state.eliminations[key] = Array.from(new Set(value as string[])).sort();
    } else dropped = true;
  }

  const highlights = r.highlights && typeof r.highlights === 'object' ? (r.highlights as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(highlights)) {
    const ref = parseKey(key);
    // Highlights are LR-only here; RC keeps its own annotation store.
    if (ref?.family === 'lr' && Array.isArray(value)) {
      const kept = value.filter(validHighlight);
      if (kept.length !== value.length) dropped = true;
      if (kept.length) state.highlights[key] = kept;
    } else dropped = true;
  }

  return { state, dropped };
}

export interface StudyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StudyStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Where an unreadable store is set aside, untouched, before anything replaces it. */
export function studyToolsQuarantineKey(actorId: string): string {
  return `${KEY_PREFIX}${actorId}:unreadable`;
}

interface LoadResult {
  state: StudyToolsState;
  status: StudyStoreStatus;
  /** The stored string, when there was one. */
  raw: string | null;
}

/**
 * Read one actor's aids.
 *  - `unavailable`: no actor, or storage cannot be read.
 *  - `incompatible`: written by a newer version. Read as empty, never written.
 *  - `recovered`: unparseable or partly malformed; `state` is what survived,
 *    and the original string must be set aside before anything overwrites it.
 */
export function loadStudyTools(
  actorId: string | null | undefined,
  storage: StudyStorage | null = defaultStorage(),
): LoadResult {
  if (!actorId || !storage) return { state: emptyStudyTools(), status: 'unavailable', raw: null };
  let raw: string | null;
  try {
    raw = storage.getItem(studyToolsStorageKey(actorId));
  } catch {
    return { state: emptyStudyTools(), status: 'unavailable', raw: null };
  }
  if (raw == null) return { state: emptyStudyTools(), status: 'ok', raw };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: emptyStudyTools(), status: 'recovered', raw };
  }
  const v = parsed && typeof parsed === 'object' ? (parsed as { v?: unknown }).v : undefined;
  if (typeof v === 'number' && v > STUDY_TOOLS_VERSION) {
    return { state: emptyStudyTools(), status: 'incompatible', raw };
  }
  const { state, dropped } = sanitizeStudyTools(parsed);
  return { state, status: dropped ? 'recovered' : 'ok', raw };
}

export interface MutateResult {
  state: StudyToolsState;
  /** True only when the change reached storage. */
  saved: boolean;
  status: StudyStoreStatus;
}

/**
 * Apply one change to the latest stored copy, not to a snapshot taken
 * earlier, so a second tab's marks on other questions survive. Each update
 * function touches only its own question key, which is what makes this a
 * per-question merge.
 *
 * Never overwrites what it cannot read: an unreadable store is copied to the
 * quarantine key first (and if that copy fails, nothing is written), and a
 * newer-version store is left alone. In both failure cases the change is
 * applied to `fallback` in memory only and `saved` is false.
 */
export function mutateStudyTools(
  actorId: string | null | undefined,
  fn: (prev: StudyToolsState) => StudyToolsState,
  fallback: StudyToolsState,
  storage: StudyStorage | null = defaultStorage(),
): MutateResult {
  const loaded = loadStudyTools(actorId, storage);
  if (loaded.status === 'unavailable' || loaded.status === 'incompatible') {
    return { state: fn(fallback), saved: false, status: loaded.status };
  }
  if (loaded.status === 'recovered' && loaded.raw != null) {
    try {
      // Never replace an earlier set-aside copy with a later one.
      const base = studyToolsQuarantineKey(actorId!);
      const qKey = storage!.getItem(base) == null ? base : `${base}:${Date.now()}`;
      storage!.setItem(qKey, loaded.raw);
    } catch {
      return { state: fn(fallback), saved: false, status: 'recovered' };
    }
  }
  const next = fn(loaded.state);
  return { state: next, saved: saveStudyTools(actorId, next, storage), status: loaded.status };
}

/** Write one actor's aids. Returns false when nothing was saved. */
export function saveStudyTools(
  actorId: string | null | undefined,
  state: StudyToolsState,
  storage: StudyStorage | null = defaultStorage(),
): boolean {
  if (!actorId || !storage) return false;
  try {
    storage.setItem(
      studyToolsStorageKey(actorId),
      JSON.stringify({ v: STUDY_TOOLS_VERSION, ...state }),
    );
    return true;
  } catch {
    return false;
  }
}

// ── Pure updates. Each returns a new state; the input is never mutated. ──

export function isBookmarked(state: StudyToolsState, ref: StudyQuestionRef): boolean {
  return !!state.bookmarks[studyQuestionKey(ref)];
}

export function toggleBookmark(
  state: StudyToolsState,
  bookmark: Omit<StudyBookmark, 'addedAt'>,
  now: Date = new Date(),
): StudyToolsState {
  const key = studyQuestionKey(bookmark);
  const bookmarks = { ...state.bookmarks };
  if (bookmarks[key]) {
    delete bookmarks[key];
  } else {
    if (Object.keys(bookmarks).length >= MAX_BOOKMARKS) return state;
    bookmarks[key] = { ...bookmark, addedAt: now.toISOString() };
  }
  return { ...state, bookmarks };
}

export function removeBookmark(state: StudyToolsState, ref: StudyQuestionRef): StudyToolsState {
  const key = studyQuestionKey(ref);
  if (!state.bookmarks[key]) return state;
  const bookmarks = { ...state.bookmarks };
  delete bookmarks[key];
  return { ...state, bookmarks };
}

/** Bookmarks newest first. */
export function listBookmarks(state: StudyToolsState, family?: StudyFamily): StudyBookmark[] {
  return Object.values(state.bookmarks)
    .filter((b) => !family || b.family === family)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function eliminationsFor(state: StudyToolsState, ref: StudyQuestionRef): string[] {
  return state.eliminations[studyQuestionKey(ref)] ?? [];
}

export function setEliminations(
  state: StudyToolsState,
  ref: StudyQuestionRef,
  letters: Iterable<string>,
): StudyToolsState {
  const key = studyQuestionKey(ref);
  const next = Array.from(new Set(letters)).filter((l) => LETTERS.test(l)).sort();
  const eliminations = { ...state.eliminations };
  if (next.length) eliminations[key] = next;
  else delete eliminations[key];
  return { ...state, eliminations };
}

export function highlightsFor(state: StudyToolsState, ref: StudyQuestionRef): Highlight[] {
  return state.highlights[studyQuestionKey(ref)] ?? [];
}

export function setHighlights(
  state: StudyToolsState,
  ref: StudyQuestionRef,
  list: Highlight[],
): StudyToolsState {
  if (ref.family !== 'lr') return state;
  const key = studyQuestionKey(ref);
  const kept = list.filter(validHighlight);
  const highlights = { ...state.highlights };
  if (kept.length) highlights[key] = kept;
  else delete highlights[key];
  return { ...state, highlights };
}

/**
 * Clear this question's marks: cross-outs and highlights. The bookmark is a
 * separate, explicit toggle and stays; other questions are untouched.
 */
export function clearQuestionMarks(state: StudyToolsState, ref: StudyQuestionRef): StudyToolsState {
  const key = studyQuestionKey(ref);
  const eliminations = { ...state.eliminations };
  const highlights = { ...state.highlights };
  delete eliminations[key];
  delete highlights[key];
  return { ...state, eliminations, highlights };
}

/** Where a bookmark opens, through the existing launch routes. */
export function bookmarkHref(bookmark: StudyBookmark, lrHref: (qid: string) => string): string | null {
  if (bookmark.family === 'lr') return lrHref(bookmark.id);
  if (bookmark.passageId == null) return null;
  return `/rc/drill?passage=${bookmark.passageId}&q=${encodeURIComponent(bookmark.id)}`;
}
