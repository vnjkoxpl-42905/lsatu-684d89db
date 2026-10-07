import { describe, it, expect } from 'vitest';
import {
  parseSpec,
  formatSpec,
  parseExactRefs,
  createEmptySpec,
  MAX_VALUES_PER_FACET,
  MAX_EXACT_REFS,
  type DrillSpec,
  type SpecVocabulary,
} from './drillSpecParser';

const VOCAB: SpecVocabulary = {
  prepTests: Array.from({ length: 60 }, (_, i) => 101 + i), // 101..160
  sections: [1, 2, 3, 4],
  maxQuestionNumber: 26,
};

const spec = (over: Partial<DrillSpec> = {}): DrillSpec => ({ ...createEmptySpec(), ...over });

describe('parseSpec', () => {
  it('reads the three facets in any order and normalizes them', () => {
    const r = parseSpec('Q6,1 S3,2 PT105,101', VOCAB);
    expect(r.ok).toBe(true);
    expect(r.spec).toEqual({
      prepTests: [101, 105],
      sections: [2, 3],
      questionNumbers: [1, 6],
    });
  });

  it('expands ranges and tolerates spacing and case', () => {
    const r = parseSpec('pt 101-103  s2   q1-4', VOCAB);
    expect(r.ok).toBe(true);
    expect(r.spec.prepTests).toEqual([101, 102, 103]);
    expect(r.spec.sections).toEqual([2]);
    expect(r.spec.questionNumbers).toEqual([1, 2, 3, 4]);
  });

  it('deduplicates across repeated mentions of a facet', () => {
    const r = parseSpec('PT101,101 PT101-102', VOCAB);
    expect(r.ok).toBe(true);
    expect(r.spec.prepTests).toEqual([101, 102]);
  });

  it('always reads S as section, never as a PrepTest prefix', () => {
    const r = parseSpec('S2', VOCAB);
    expect(r.ok).toBe(true);
    expect(r.spec.sections).toEqual([2]);
    expect(r.spec.prepTests).toEqual([]);
  });

  it('rejects values outside the bank rather than silently dropping them', () => {
    const r = parseSpec('PT999', VOCAB);
    expect(r.ok).toBe(false);
    expect(r.issues[0].kind).toBe('unknown-value');
    expect(r.spec.prepTests).toEqual([]);
  });

  it('rejects a question number beyond the section length', () => {
    const r = parseSpec('Q40', VOCAB);
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toContain('1 to 26');
  });

  it('surfaces unmatched text instead of swallowing it', () => {
    const r = parseSpec('PT101 flaw', VOCAB);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.token === 'flaw')).toBe(true);
  });

  it('caps range expansion instead of allocating', () => {
    const r = parseSpec('Q1-999999999', VOCAB);
    expect(r.ok).toBe(false);
    expect(r.issues[0].kind).toBe('too-many');
    expect(r.spec.questionNumbers).toEqual([]);
  });

  it('rejects a backwards range', () => {
    const r = parseSpec('PT110-101', VOCAB);
    expect(r.ok).toBe(false);
    expect(r.issues[0].kind).toBe('bad-range');
  });

  it('treats an empty string as an empty spec, not an error', () => {
    const r = parseSpec('', VOCAB);
    expect(r.ok).toBe(true);
    expect(r.spec).toEqual(createEmptySpec());
  });

  it('enforces the per-facet ceiling', () => {
    const many = Array.from({ length: MAX_VALUES_PER_FACET + 1 }, (_, i) => i + 1).join(',');
    const r = parseSpec(`Q${many}`, VOCAB);
    expect(r.ok).toBe(false);
  });
});

describe('formatSpec', () => {
  it('emits facets in PT, S, Q order regardless of input order', () => {
    expect(formatSpec(spec({ questionNumbers: [1], sections: [2], prepTests: [101] }))).toBe(
      'PT101 S2 Q1',
    );
  });

  it('compacts three or more contiguous values into a range', () => {
    expect(formatSpec(spec({ prepTests: [101, 102, 103] }))).toBe('PT101-103');
  });

  it('leaves two contiguous values comma-separated', () => {
    expect(formatSpec(spec({ prepTests: [101, 102] }))).toBe('PT101,102');
  });

  it('mixes runs and singletons', () => {
    expect(formatSpec(spec({ questionNumbers: [1, 2, 3, 6, 8, 9] }))).toBe('Q1-3,6,8,9');
  });

  it('sorts and deduplicates before formatting', () => {
    expect(formatSpec(spec({ sections: [3, 2, 2] }))).toBe('S2,3');
  });

  it('omits empty facets entirely', () => {
    expect(formatSpec(spec({ prepTests: [101] }))).toBe('PT101');
    expect(formatSpec(createEmptySpec())).toBe('');
  });
});

describe('formatter idempotence', () => {
  const cases = [
    'PT101-110 S2,3 Q1,6,8,23',
    'Q6,1 S3,2 PT105,101',
    'pt 101-103  s2   q1-4',
    'PT101,102',
    'Q1-3,6,8,9',
    '',
  ];

  it.each(cases)('format(parse(format(x))) === format(x) for %j', (input) => {
    const once = parseSpec(input, VOCAB);
    expect(once.ok).toBe(true);
    const text = formatSpec(once.spec);
    const twice = parseSpec(text, VOCAB);
    expect(twice.ok).toBe(true);
    expect(formatSpec(twice.spec)).toBe(text);
  });

  it('round-trips a spec through text without losing values', () => {
    const original = spec({
      prepTests: [101, 102, 103, 110],
      sections: [2, 4],
      questionNumbers: [1, 6, 8, 23],
    });
    const reparsed = parseSpec(formatSpec(original), VOCAB);
    expect(reparsed.ok).toBe(true);
    expect(reparsed.spec).toEqual(original);
  });
});

describe('parseExactRefs', () => {
  it('parses comma or whitespace separated references, case-insensitively', () => {
    const r = parseExactRefs('PT101.S2.Q1, pt101.s2.q6  PT102.S3.Q8');
    expect(r.ok).toBe(true);
    expect(r.refs.map((x) => x.label)).toEqual([
      'PT101.S2.Q1',
      'PT101.S2.Q6',
      'PT102.S3.Q8',
    ]);
  });

  it('deduplicates while preserving first-seen order', () => {
    const r = parseExactRefs('PT101.S2.Q6 PT101.S2.Q1 PT101.S2.Q6');
    expect(r.ok).toBe(true);
    expect(r.refs.map((x) => x.label)).toEqual(['PT101.S2.Q6', 'PT101.S2.Q1']);
  });

  it('is atomic: one bad token fails the whole submission', () => {
    const r = parseExactRefs('PT101.S2.Q1, nonsense, PT101.S2.Q6');
    expect(r.ok).toBe(false);
    expect(r.issues[0].token).toBe('nonsense');
  });

  it('rejects a facet-style token, which belongs in the spec bar', () => {
    const r = parseExactRefs('PT101');
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toContain('PT101.S2.Q1');
  });

  it('caps a single submission', () => {
    const many = Array.from({ length: MAX_EXACT_REFS + 1 }, (_, i) => `PT101.S2.Q${i + 1}`).join(',');
    const r = parseExactRefs(many);
    expect(r.ok).toBe(false);
    expect(r.issues[0].kind).toBe('too-many');
    expect(r.refs).toEqual([]);
  });

  it('treats empty input as no references, not an error', () => {
    const r = parseExactRefs('   ');
    expect(r.ok).toBe(true);
    expect(r.refs).toEqual([]);
  });
});
