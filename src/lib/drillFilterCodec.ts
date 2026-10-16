/**
 * Reading and writing the LR builder's filter state in `user_saved_sets`.
 *
 * `filter_state` is a bare JSON column shared by more than one producer: the LR
 * builder saves `LRDrillFilters`, and the Smart Builder saves its own
 * `ParsedConfig`. Neither ever wrote a discriminator, so historical rows are
 * untagged raw objects and cannot be told apart by a tag.
 *
 * New writes carry one. Old rows go through a structural check instead, and
 * anything that is not confidently ours is left alone rather than coerced —
 * misreading a Smart Builder row as an LR filter would silently produce the
 * wrong set, which is worse than declining to restore it.
 *
 * There is no migration. The reader is tolerant, permanently.
 */

import {
  createEmptyLRDrillFilters,
  type LRDrillFilters,
} from '@/lib/lrDrillFilters';

export const LR_FILTER_KIND = 'lr-builder';
export const LR_FILTER_VERSION = 1;

export interface TaggedLRFilterState extends Record<string, unknown> {
  kind: typeof LR_FILTER_KIND;
  version: number;
  filters: LRDrillFilters;
}

export type DecodeOutcome =
  /** Ours, and understood. */
  | { status: 'ok'; filters: LRDrillFilters; legacy: boolean }
  /** Ours, but written by a newer client than this one. */
  | { status: 'unsupported-version'; version: number }
  /** Not the LR builder's, or not recognisable. Left untouched. */
  | { status: 'not-ours' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string');
}

/**
 * Structural fingerprint of an LR builder filter object.
 *
 * `prepTests` and `questionTypes` are the discriminating pair: the Smart
 * Builder calls the same concepts `pts` and `qtypes`, so the two vocabularies
 * never overlap. Requiring both, and rejecting anything carrying Smart Builder
 * keys, keeps the check collision-safe in both directions.
 */
function looksLikeLegacyLRFilters(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;

  const hasSmartBuilderKeys =
    'pts' in value || 'qtypes' in value || 'set_size' in value || 'skipRecent' in value;
  if (hasSmartBuilderKeys) return false;

  return 'prepTests' in value && 'questionTypes' in value;
}

/**
 * Normalize any recognised LR filter object onto the current shape.
 *
 * The one shape change so far: `questionNumber: number | null` became
 * `questionNumbers: number[]`. A legacy scalar becomes a single-element array;
 * a legacy null becomes empty, which already meant unrestricted.
 */
export function normalizeLRDrillFilters(raw: Record<string, unknown>): LRDrillFilters {
  const base = createEmptyLRDrillFilters();

  const questionNumbers = (() => {
    if (Array.isArray(raw.questionNumbers)) return numberArray(raw.questionNumbers);
    const scalar = raw.questionNumber;
    if (typeof scalar === 'number' && Number.isFinite(scalar)) return [scalar];
    return base.questionNumbers;
  })();

  return {
    prepTests: numberArray(raw.prepTests),
    sections: numberArray(raw.sections),
    questionNumbers,
    questionTypes: stringArray(raw.questionTypes),
    reasoningTypes: stringArray(raw.reasoningTypes),
    questionFeatures: stringArray(raw.questionFeatures),
    difficulties: numberArray(raw.difficulties),
    searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery : '',
  };
}

/** What the LR builder writes from now on. */
export function encodeLRFilterState(filters: LRDrillFilters): TaggedLRFilterState {
  return {
    kind: LR_FILTER_KIND,
    version: LR_FILTER_VERSION,
    filters: { ...filters },
  };
}

/**
 * Read a `filter_state` blob.
 *
 * A malformed or partial tag is treated as untagged and falls through to the
 * structural path, because a half-written tag is likelier to be corruption
 * than a claim of provenance. A tag from a *newer* version is refused outright
 * rather than parsed optimistically — fields this client cannot see would be
 * dropped on the next save.
 */
export function decodeLRFilterState(value: unknown): DecodeOutcome {
  if (!isRecord(value)) return { status: 'not-ours' };

  const tagged = value.kind === LR_FILTER_KIND;
  const version = typeof value.version === 'number' ? value.version : null;

  if (tagged && version !== null && isRecord(value.filters)) {
    if (version > LR_FILTER_VERSION) {
      return { status: 'unsupported-version', version };
    }
    return {
      status: 'ok',
      filters: normalizeLRDrillFilters(value.filters),
      legacy: false,
    };
  }

  if (looksLikeLegacyLRFilters(value)) {
    return { status: 'ok', filters: normalizeLRDrillFilters(value), legacy: true };
  }

  return { status: 'not-ours' };
}
