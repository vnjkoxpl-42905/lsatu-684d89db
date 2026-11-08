import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression: saveBRResults was declared after the early-return Blind Review
// branches whose onComplete callbacks call it, so every completion threw
// "Cannot access before initialization" and BR results were never saved.
describe('Drill saveBRResults declaration order', () => {
  it('declares saveBRResults before every call site', () => {
    const src = readFileSync(resolve(__dirname, 'Drill.tsx'), 'utf8');
    const decl = src.indexOf('const saveBRResults');
    expect(decl).toBeGreaterThan(-1);
    const calls = [...src.matchAll(/await saveBRResults\(/g)].map((m) => m.index!);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) expect(decl).toBeLessThan(call);
  });
});
