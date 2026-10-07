import { describe, expect, it } from 'vitest';
import { entails, evaluate, parseExpression as p, valuationsFor } from './logic';

describe('conditional logic validation', () => {
  it('recognizes contraposition but rejects a reversal', () => {
    expect(entails([p('A → B')], p('B̸ → A̸'))).toBe(true);
    expect(entails([p('A → B')], p('B → A'))).toBe(false);
  });
  it('distinguishes and from inclusive or', () => {
    expect(evaluate(p('A and B'), { A: true, B: false })).toBe(false);
    expect(evaluate(p('A or B'), { A: true, B: true })).toBe(true);
    expect(entails([p('A → B or C'), p('A'), p('C̸')], p('B'))).toBe(true);
  });
  it('checks every assignment and rejects unsupported input', () => {
    expect(valuationsFor([p('A → B'), p('B → C')])).toHaveLength(8);
    expect(() => p('A and B or C')).toThrow('Ambiguous');
    expect(() => p('A → B → C')).toThrow('individual rules');
    expect(() => p('All birds fly')).toThrow('Unsupported');
    expect(() => evaluate(p('A'), {})).toThrow('Missing valuation');
  });
});
