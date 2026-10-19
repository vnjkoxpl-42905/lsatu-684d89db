// Study settings: what each one is, where it is stored, and what it changes.
//
// Ownership and lifetime
// - Owner: the signed-in account (auth user id). Settings never follow a
//   device from one account to the next.
// - Persistence: this browser's localStorage, one key per account. There is
//   no server copy (no schema for one), so a second device starts from the
//   defaults. The UI says so.
// - Failure: a write that throws (private mode, full storage) leaves the
//   in-memory value in force for this tab and marks it unsaved. Later edits
//   build on that in-memory value, and a retry writes the latest value.
// - Legacy: before accounts were separated, every account on a device shared
//   one `userSettings` key. Nothing records which account wrote it, so it is
//   never attributed automatically. Every account starts from its own saved
//   settings or the defaults. When the old key holds non-default values, the
//   Account page offers them and only a person's explicit choice copies them
//   into their account. The old key is only ever read, never changed.
// - Unreadable storage: if the browser refuses to read the account's key,
//   defaults are used and the page says the saved settings could not be read.
//   A refused read is never treated as "no settings" for the legacy offer.
//
// Consequences
// - Timing is read when a section starts. A section already running keeps
//   the clock it started with; past sections keep the time they were taken
//   under.
// - Pool settings are read when a drill builds its question list. They
//   choose which questions come next and never edit past answers, scores or
//   history.

export type TimingMode = '35' | '52.5' | '70' | 'unlimited';

export interface UserSettings {
  // Stored for compatibility. No screen in the app reads these five today,
  // so the Account page does not offer them as switches.
  tutorEnabled: boolean;
  voiceCoachEnabled: boolean;
  showContrast: boolean;
  teachBackOnCorrect: boolean;
  sectionDebriefEnabled: boolean;
  storeFullTranscript: boolean;
  // Live settings.
  defaultTimingMode: TimingMode;
  allowRepeats: boolean;
  preferUnseen: boolean;
  recycleAfterDays: number;
}

export const DEFAULT_SETTINGS: UserSettings = Object.freeze({
  tutorEnabled: true,
  voiceCoachEnabled: true,
  showContrast: false,
  teachBackOnCorrect: false,
  sectionDebriefEnabled: false,
  storeFullTranscript: false,
  defaultTimingMode: '35',
  allowRepeats: false,
  preferUnseen: true,
  recycleAfterDays: 30,
}) as UserSettings;

export const LEGACY_SETTINGS_KEY = 'userSettings';
export const RECYCLE_MIN_DAYS = 1;
export const RECYCLE_MAX_DAYS = 365;

export function settingsKeyFor(userId: string): string {
  return `userSettings:${userId}`;
}

const TIMING_MODES: readonly TimingMode[] = ['35', '52.5', '70', 'unlimited'];

export function isTimingMode(value: unknown): value is TimingMode {
  return typeof value === 'string' && (TIMING_MODES as readonly string[]).includes(value);
}

/** A recycle value is valid only as a whole number of days in range. */
export function parseRecycleDays(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < RECYCLE_MIN_DAYS || n > RECYCLE_MAX_DAYS) return null;
  return n;
}

/**
 * Field-by-field repair of anything read from storage. A bad field falls back
 * to its default; good fields survive. Unknown keys are dropped.
 */
export function normalizeSettings(raw: unknown): UserSettings {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const bool = (k: keyof UserSettings) =>
    typeof src[k] === 'boolean' ? (src[k] as boolean) : (DEFAULT_SETTINGS[k] as boolean);
  // Numbers were once stored as strings by a form; accept "52.5" and 52.5.
  const timing = typeof src.defaultTimingMode === 'number' ? String(src.defaultTimingMode) : src.defaultTimingMode;
  return {
    tutorEnabled: bool('tutorEnabled'),
    voiceCoachEnabled: bool('voiceCoachEnabled'),
    showContrast: bool('showContrast'),
    teachBackOnCorrect: bool('teachBackOnCorrect'),
    sectionDebriefEnabled: bool('sectionDebriefEnabled'),
    storeFullTranscript: bool('storeFullTranscript'),
    defaultTimingMode: isTimingMode(timing) ? timing : DEFAULT_SETTINGS.defaultTimingMode,
    allowRepeats: bool('allowRepeats'),
    preferUnseen: bool('preferUnseen'),
    recycleAfterDays: parseRecycleDays(src.recycleAfterDays) ?? DEFAULT_SETTINGS.recycleAfterDays,
  };
}

/**
 * saved       the account's own stored settings
 * default     the account has no stored settings yet
 * unreadable  the account's key exists but is not valid JSON
 * unavailable the browser refused to read storage at all
 */
export type SettingsSource = 'saved' | 'default' | 'unreadable' | 'unavailable';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** `undefined` means the read itself failed, which is not the same as absent. */
function safeGet(storage: StorageLike | null, key: string): string | null | undefined {
  if (!storage) return undefined;
  try {
    return storage.getItem(key);
  } catch {
    return undefined;
  }
}

function sameSettings(a: UserSettings, b: UserSettings): boolean {
  return (Object.keys(DEFAULT_SETTINGS) as (keyof UserSettings)[]).every((k) => a[k] === b[k]);
}

function parse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Read an account's settings. Never throws, and never applies the old
 * device-wide settings. `legacyOffer` is set only when the account has
 * definitely stored nothing yet and the old key holds readable, non-default
 * values; the person decides whether to use them.
 */
export function readSettingsFor(
  storage: StorageLike | null,
  userId: string | null,
): { settings: UserSettings; source: SettingsSource; legacyOffer: UserSettings | null } {
  const defaults = { ...DEFAULT_SETTINGS };
  if (!userId) return { settings: defaults, source: 'default', legacyOffer: null };
  const own = safeGet(storage, settingsKeyFor(userId));
  if (own === undefined) return { settings: defaults, source: 'unavailable', legacyOffer: null };
  if (own !== null) {
    const value = parse(own);
    return value === undefined
      ? { settings: defaults, source: 'unreadable', legacyOffer: null }
      : { settings: normalizeSettings(value), source: 'saved', legacyOffer: null };
  }
  return { settings: defaults, source: 'default', legacyOffer: readLegacyOffer(storage) };
}

/** The old device-wide settings, when readable and different from defaults. */
export function readLegacyOffer(storage: StorageLike | null): UserSettings | null {
  const raw = safeGet(storage, LEGACY_SETTINGS_KEY);
  if (typeof raw !== 'string') return null;
  const value = parse(raw);
  if (value === undefined) return null;
  const settings = normalizeSettings(value);
  return sameSettings(settings, DEFAULT_SETTINGS) ? null : settings;
}

/** Write an account's settings. Returns false instead of throwing. */
export function writeSettingsFor(storage: StorageLike | null, userId: string, settings: UserSettings): boolean {
  if (!storage) return false;
  try {
    storage.setItem(settingsKeyFor(userId), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Plain summary of an offer, so a person can recognise their own settings. */
export function legacyOfferSummary(s: UserSettings): string {
  const parts = [`section time ${TIMING_LABEL[s.defaultTimingMode]}`];
  parts.push(s.allowRepeats ? 'repeats allowed' : 'no repeats');
  parts.push(s.preferUnseen ? 'new questions first' : 'new questions not first');
  parts.push(`questions come back after ${s.recycleAfterDays} day${s.recycleAfterDays === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/* ── consequences, in the words the Account page shows ─────────────────── */

export const TIMING_LABEL: Record<TimingMode, string> = {
  '35': '35:00, standard time',
  '52.5': '52:30, time and a half',
  '70': '70:00, double time',
  unlimited: 'No timer, a stopwatch counts up',
};

export function timingConsequence(mode: TimingMode): string {
  const clock =
    mode === 'unlimited'
      ? 'Timed sections you start will run without a countdown.'
      : `Timed sections you start will give you ${mode === '35' ? '35 minutes' : mode === '52.5' ? '52 minutes 30 seconds' : '70 minutes'} as your standard section.`;
  return `${clock} Practice-test paces are worked out from this too. A section already running keeps its clock, and past sections keep the time they were taken under.`;
}

export function poolConsequence(s: Pick<UserSettings, 'allowRepeats' | 'preferUnseen' | 'recycleAfterDays'>): string {
  const days = `${s.recycleAfterDays} day${s.recycleAfterDays === 1 ? '' : 's'}`;
  if (s.allowRepeats && !s.preferUnseen) {
    return 'Your next drill can draw from every question, including ones you have already answered.';
  }
  if (s.allowRepeats && s.preferUnseen) {
    return 'Your next drill uses questions you have never answered while any are left, then draws from every question.';
  }
  if (s.preferUnseen) {
    return `Your next drill uses questions you have never answered while any are left. After that, a question comes back ${days} after you last saw it.`;
  }
  return `Your next drill mixes questions you have never answered with ones you last saw more than ${days} ago.`;
}

export const POOL_HISTORY_NOTE =
  'These settings only choose which questions come next. Your past answers, scores and history do not change. Full sections and hand-picked question sets are always served whole.';
