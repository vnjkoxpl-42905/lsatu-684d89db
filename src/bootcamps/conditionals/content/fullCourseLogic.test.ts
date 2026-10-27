import { describe, expect, it } from 'vitest';
import { and, atom, checkResponse, entails, equivalent, finiteQuantityEntails, findChain, implies, not, or, proveQuantity, validateItem } from './fullCourseLogic';
import type { FullCourseItem, QuantityStatement } from './fullCourseTypes';
const a = atom('a'), b = atom('b'), c = atom('c');
const q = (quantifier: QuantityStatement['quantifier'], subject: string, predicate: string): QuantityStatement => ({ quantifier, subject, predicate });
describe('actual semantic operations used by the expanded course', () => {
  it('checks recursive compounds and whole-group negation rather than member order', () => {
    expect(equivalent(implies(and(a, or(b, c)), not(c)), implies(c, or(not(a), and(not(b), not(c))))).correct).toBe(true);
    expect(equivalent(and(a, b), and(b, a)).correct).toBe(true);
    expect(equivalent(not(and(a, b)), and(not(a), not(b))).correct).toBe(false);
  });
  it('does not assume a conditional conclusion or automatically trigger a rule', () => {
    expect(entails([implies(a, b)], b).correct).toBe(false);
    expect(entails([implies(a, b), implies(b, c)], implies(a, c)).correct).toBe(true);
    expect(entails([a, not(a)], b).supported).toBe(false);
  });
  it('keeps domains distinct and reports an actual countermodel', () => {
    const result = entails([implies(atom('studentA'), b), atom('studentB')], b);
    expect(result.correct).toBe(false);
    expect(result.counterexample?.studentB).toBe(true);
    expect(result.counterexample?.b).toBe(false);
  });
  it('does not satisfy a joint trigger with one member', () => {
    const item: FullCourseItem = { kind: 'chain', id: 'joint', prompt: '', hint: '', explanation: '', atoms: [], start: a, target: c, rules: [{ id: 'joint', text: 'Both conditions require the result', rule: { if: and(a, b), then: c } }] };
    expect(checkResponse(item, { kind: 'chain', ruleIds: ['joint'] }).correct).toBe(false);
  });
  it('finds an executable connection that requires explicit contraposition', () => {
    const item = { kind: 'chain' as const, id: 'hidden', prompt: '', hint: '', explanation: '', atoms: [], start: a, target: not(c), rules: [{ id: 'first', text: '', rule: { if: a, then: b } }, { id: 'second', text: '', rule: { if: c, then: not(b) } }] };
    const path = findChain(item);
    expect(path).toEqual(['first', 'second:contra']);
    expect(checkResponse(item, { kind: 'chain', ruleIds: path! }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'chain', ruleIds: ['first', 'second'] }).correct).toBe(false);
  });
  it('accepts equivalent bridge orientations while requiring an added connection', () => {
    const atoms = ['a', 'b', 'c'].map(id => ({ id, label: id, subject: 'same item', domain: 'same group' }));
    const item = { kind: 'build-bridge' as const, id: 'bridge', prompt: '', hint: '', explanation: '', atoms, premises: [implies(a, b)], conclusion: implies(a, c) };
    expect(checkResponse(item, { kind: 'build-bridge', left: b, right: c }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'build-bridge', left: not(c), right: not(b) }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'build-bridge', left: a, right: c }).correct).toBe(false);
  });
  it('requires every truth value in a counterexample and leaves all premises true', () => {
    const item: FullCourseItem = { kind: 'case', id: 'case', prompt: '', hint: '', explanation: '', atoms: [], premises: [implies(a, b)], target: implies(b, a), task: 'counterexample' };
    expect(checkResponse(item, { kind: 'case', values: { a: false } }).supported).toBe(false);
    expect(checkResponse(item, { kind: 'case', values: { a: false, b: true } }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'case', values: { a: true, b: false } }).correct).toBe(false);
  });
  it('finds ambiguity in authored distractors instead of trusting a key', () => {
    expect(validateItem({ kind: 'choice', id: 'ambiguous', prompt: '', hint: '', explanation: '', correctOptionId: 'one', semantic: { kind: 'equivalent', target: and(a, b) }, options: [{ id: 'one', text: '', formula: and(a, b) }, { id: 'two', text: '', formula: and(b, a) }] })).toContain('The authored key does not match exactly one semantically correct option.');
  });
});
describe('quantity proofs distinguish theorems from finite examples', () => {
  it('proves witness propagation, subset preservation and shared-reference majority overlap', () => {
    expect(proveQuantity([q('some', 'a', 'b'), q('all', 'b', 'c')], q('some', 'a', 'c')).correct).toBe(true);
    expect(proveQuantity([q('most', 'a', 'b'), q('all', 'b', 'c')], q('most', 'a', 'c')).correct).toBe(true);
    expect(proveQuantity([q('most', 'a', 'b'), q('most', 'a', 'c')], q('some', 'b', 'c')).correct).toBe(true);
  });
  it('does not infer existence from two universal rules', () => {
    const result = proveQuantity([q('all', 'a', 'b'), q('all', 'a', 'c')], q('some', 'b', 'c'));
    expect(result.correct).toBe(false);
    expect(result.quantityCounterexample).toEqual([]);
  });
  it('refutes unrelated existential witnesses and serial majorities', () => {
    expect(proveQuantity([q('some', 'a', 'b'), q('some', 'b', 'c')], q('some', 'a', 'c')).correct).toBe(false);
    expect(proveQuantity([q('most', 'a', 'b'), q('most', 'b', 'c')], q('most', 'a', 'c')).correct).toBe(false);
  });
  it('checks a finite population only at its stated size', () => {
    const exact = { ...q('exactly', 'a', 'b'), count: 2 };
    expect(finiteQuantityEntails(3, ['a', 'b'], [exact], q('some', 'a', 'b')).correct).toBe(true);
    expect(() => finiteQuantityEntails(20, ['a', 'b'], [], q('all', 'a', 'b'))).toThrow(/five members/);
  });
  it('rejects a general claim beyond proof templates rather than silently passing bounded search', () => {
    const result = proveQuantity([{ ...q('exactly', 'a', 'b'), count: 6 }], q('some', 'a', 'b'));
    expect(result.supported).toBe(false);
    expect(result.correct).toBe(false);
  });
});
