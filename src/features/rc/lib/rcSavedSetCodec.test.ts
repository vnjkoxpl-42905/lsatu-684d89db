import { describe, expect, it } from 'vitest';
import { decodeRcSavedSet, isRcSavedState, type RcSavedPayload } from './rcSavedSetCodec';
export const recipe: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'recipe', config: { reveal: 'end_of_set', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'fresh', preptestMin: 101, preptestMax: 148 }, count: 1, passageIds: [], questionIds: [] };
describe('RC saved definition codec', () => {
  it('keeps fixed snapshots and recipes distinct', () => {
    expect(decodeRcSavedSet(recipe)).toEqual({ status: 'ok', value: recipe });
    const fixed = { ...recipe, mode: 'fixed', passageIds: [7], questionIds: [70, 71] };
    expect(decodeRcSavedSet(fixed)).toEqual({ status: 'ok', value: fixed });
    expect(decodeRcSavedSet({ ...recipe, passageIds: [7] }).status).toBe('invalid');
    expect(decodeRcSavedSet({ ...fixed, questionIds: [70, 70] }).status).toBe('invalid');
  });
  it('preserves the strict recorded-exposure filter separately from legacy not-attempted recipes', () => {
    const strict = { ...recipe, filters: { ...recipe.filters, status: 'strict_no_exposure' } };
    expect(decodeRcSavedSet(strict)).toEqual({ status: 'ok', value: strict });
    expect(decodeRcSavedSet(recipe)).toEqual({ status: 'ok', value: recipe });
  });
  it('refuses unknown versions and cannot mistake LR rows for RC', () => {
    expect(decodeRcSavedSet({ ...recipe, version: 2 }).status).toBe('unsupported-version');
    expect(isRcSavedState({ kind: 'rc-builder', version: 99 })).toBe(true);
    expect(decodeRcSavedSet({ kind: 'lr-builder', version: 1, filters: {} }).status).toBe('not-ours');
  });
  it('strips runtime state and rejects invalid ranges or clocks', () => {
    const restored = decodeRcSavedSet({ ...recipe, config: { ...recipe.config, timedSectionSittingId: 'private', resultsRevealedAt: '2026-10-17', draftAnswers: [{}] } });
    expect(restored).toEqual({ status: 'ok', value: recipe });
    expect(decodeRcSavedSet({ ...recipe, filters: { ...recipe.filters, preptestMin: 149, preptestMax: 148 } }).status).toBe('invalid');
    expect(decodeRcSavedSet({ ...recipe, config: { reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 0 } } }).status).toBe('invalid');
  });
});
