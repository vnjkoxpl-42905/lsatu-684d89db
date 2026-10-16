import { describe, it, expect } from 'vitest';
import {
  encodeLRFilterState,
  decodeLRFilterState,
  normalizeLRDrillFilters,
  LR_FILTER_KIND,
  LR_FILTER_VERSION,
} from './drillFilterCodec';
import { createEmptyLRDrillFilters } from './lrDrillFilters';

/** A real pre-change LR builder row: untagged, scalar questionNumber. */
const LEGACY_LR_ROW = {
  prepTests: [101, 102],
  sections: [2],
  questionNumber: 14,
  questionTypes: ['Flaw'],
  reasoningTypes: [],
  questionFeatures: [],
  difficulties: [4, 5],
  searchQuery: '',
};

/** A real Smart Builder row. Shares `difficulties` and `reasoningTypes` only. */
const NATURAL_DRILL_ROW = {
  qtypes: ['Flaw'],
  difficulties: [3],
  pts: [101],
  features: [],
  reasoningTypes: [],
  set_size: 10,
  explanation: 'ten flaw questions',
  skipRecent: true,
};

describe('encode / decode round trip', () => {
  it('writes a tagged envelope and reads it back unchanged', () => {
    const filters = { ...createEmptyLRDrillFilters(), prepTests: [101], questionNumbers: [1, 6] };
    const encoded = encodeLRFilterState(filters);

    expect(encoded.kind).toBe(LR_FILTER_KIND);
    expect(encoded.version).toBe(LR_FILTER_VERSION);

    const decoded = decodeLRFilterState(encoded);
    expect(decoded.status).toBe('ok');
    if (decoded.status !== 'ok') return;
    expect(decoded.filters).toEqual(filters);
    expect(decoded.legacy).toBe(false);
  });
});

describe('legacy rows', () => {
  it('recognises an untagged LR row structurally', () => {
    const decoded = decodeLRFilterState(LEGACY_LR_ROW);
    expect(decoded.status).toBe('ok');
    if (decoded.status !== 'ok') return;
    expect(decoded.legacy).toBe(true);
  });

  it('lifts a scalar questionNumber into the array', () => {
    const decoded = decodeLRFilterState(LEGACY_LR_ROW);
    if (decoded.status !== 'ok') throw new Error('expected ok');
    expect(decoded.filters.questionNumbers).toEqual([14]);
  });

  it('treats a legacy null questionNumber as unrestricted', () => {
    const decoded = decodeLRFilterState({ ...LEGACY_LR_ROW, questionNumber: null });
    if (decoded.status !== 'ok') throw new Error('expected ok');
    expect(decoded.filters.questionNumbers).toEqual([]);
  });

  it('preserves every other legacy facet', () => {
    const decoded = decodeLRFilterState(LEGACY_LR_ROW);
    if (decoded.status !== 'ok') throw new Error('expected ok');
    expect(decoded.filters.prepTests).toEqual([101, 102]);
    expect(decoded.filters.questionTypes).toEqual(['Flaw']);
    expect(decoded.filters.difficulties).toEqual([4, 5]);
  });
});

describe('collision safety', () => {
  it('never claims a Smart Builder row', () => {
    expect(decodeLRFilterState(NATURAL_DRILL_ROW).status).toBe('not-ours');
  });

  it('rejects a row carrying Smart Builder keys even if it also has prepTests', () => {
    const hybrid = { ...LEGACY_LR_ROW, set_size: 10 };
    expect(decodeLRFilterState(hybrid).status).toBe('not-ours');
  });

  it('declines objects missing the discriminating pair', () => {
    expect(decodeLRFilterState({ prepTests: [101] }).status).toBe('not-ours');
    expect(decodeLRFilterState({ questionTypes: ['Flaw'] }).status).toBe('not-ours');
  });

  it('declines non-objects', () => {
    expect(decodeLRFilterState(null).status).toBe('not-ours');
    expect(decodeLRFilterState('nope').status).toBe('not-ours');
    expect(decodeLRFilterState([1, 2, 3]).status).toBe('not-ours');
  });
});

describe('tag edge cases', () => {
  it('refuses a version from a newer client rather than guessing', () => {
    const future = { kind: LR_FILTER_KIND, version: LR_FILTER_VERSION + 1, filters: LEGACY_LR_ROW };
    const decoded = decodeLRFilterState(future);
    expect(decoded.status).toBe('unsupported-version');
    if (decoded.status !== 'unsupported-version') return;
    expect(decoded.version).toBe(LR_FILTER_VERSION + 1);
  });

  it('falls back to the structural path when the tag is malformed', () => {
    const malformed = { kind: LR_FILTER_KIND, ...LEGACY_LR_ROW }; // no version, no nested filters
    const decoded = decodeLRFilterState(malformed);
    expect(decoded.status).toBe('ok');
    if (decoded.status !== 'ok') return;
    expect(decoded.legacy).toBe(true);
  });

  it('does not treat a malformed tag on a foreign row as ours', () => {
    const malformed = { kind: LR_FILTER_KIND, ...NATURAL_DRILL_ROW };
    expect(decodeLRFilterState(malformed).status).toBe('not-ours');
  });
});

describe('normalizeLRDrillFilters', () => {
  it('fills every field from an empty object without throwing', () => {
    expect(normalizeLRDrillFilters({})).toEqual(createEmptyLRDrillFilters());
  });

  it('drops non-numeric junk out of numeric facets', () => {
    const out = normalizeLRDrillFilters({ prepTests: [101, 'x', null, 102] });
    expect(out.prepTests).toEqual([101, 102]);
  });

  it('prefers an existing questionNumbers array over the legacy scalar', () => {
    const out = normalizeLRDrillFilters({ questionNumbers: [1, 2], questionNumber: 9 });
    expect(out.questionNumbers).toEqual([1, 2]);
  });
});
