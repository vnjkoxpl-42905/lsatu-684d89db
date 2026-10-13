import { describe, expect, it } from 'vitest';
import { hasAuthoredProse as scriptPredicate } from '../../scripts/explanation-prose.mjs';
import { hasAuthoredProse as appPredicate } from '@/hooks/useLrExplanation';
import fixtures from './__fixtures__/explanationProse.json';

/**
 * One predicate, two runtimes, one fixture set. The census script and the
 * drill surface must agree on which questions have a written explanation, so
 * both implementations run the same cases here.
 */
describe('hasAuthoredProse', () => {
  it.each(fixtures)('$name (app)', ({ styles, expected }) => {
    expect(appPredicate(styles)).toBe(expected);
  });

  it.each(fixtures)('$name (census script)', ({ styles, expected }) => {
    expect(scriptPredicate(styles)).toBe(expected);
  });
});
