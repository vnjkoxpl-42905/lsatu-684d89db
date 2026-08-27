/**
 * The practice-test blueprint, run against the real bank on disk.
 *
 * The unit tests next door pin the RULES. This one pins the CONSEQUENCE: that
 * the rules, applied to the bank we actually ship, leave a student with real
 * PrepTests to sit. It exists because the first cut of this code gated on RC
 * question count and silently reduced 58 sittable PrepTests to 11 — a rule that
 * read as careful and behaved as broken. A count assertion would have caught it
 * the day it was written.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPracticeTests } from './practiceTest';
import { buildRcSections, type RcIndexPassageWithPt } from '@/features/rc/lib/rcSections';
import type { QuestionManifest } from './questionLoader';

const DATA = resolve(process.cwd(), 'public/data');

function realRcSections() {
  const index = JSON.parse(readFileSync(resolve(DATA, 'rc/rc-index.json'), 'utf8'));
  const passages: RcIndexPassageWithPt[] = index.preptests.flatMap(
    (pt: { preptest: number; passages: Record<string, unknown>[] }) =>
      pt.passages.map((p) => ({ ...p, preptest: pt.preptest })),
  ) as RcIndexPassageWithPt[];
  return buildRcSections(passages);
}

function realManifest(): QuestionManifest {
  const sections = readdirSync(DATA)
    .map((file) => /^PT(\d+)-S(\d+)-LR\.json$/.exec(file))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({
      pt: Number(m[1]),
      section: Number(m[2]),
      count: (JSON.parse(readFileSync(resolve(DATA, m[0]), 'utf8')) as unknown[]).length,
      filename: m[0],
    }));
  return { sections } as QuestionManifest;
}

describe('practice tests against the shipped bank', () => {
  const tests = buildPracticeTests(realManifest(), realRcSections());

  it('offers a practice test on most of the PrepTests in the bank', () => {
    const lrSectionsPerPt = realManifest().sections.reduce<Map<number, number>>(
      (m, s) => m.set(s.pt, (m.get(s.pt) ?? 0) + 1),
      new Map(),
    );
    const ptsWithTwoLrSections = [...lrSectionsPerPt.entries()].filter(([, n]) => n >= 2);
    // Every PrepTest that could be sat, is offered. The only permitted losses
    // are RC sections dropped for a missing or unanswerable passage.
    expect(tests.length).toBeGreaterThanOrEqual(ptsWithTwoLrSections.length - 3);
    expect(tests.length).toBeGreaterThan(40);
  });

  it('gives every test three sections in published order', () => {
    for (const t of tests) {
      expect(t.legs).toHaveLength(3);
      expect(t.legs.filter((l) => l.kind === 'lr')).toHaveLength(2);
      expect(t.legs.filter((l) => l.kind === 'rc')).toHaveLength(1);
      const sections = t.legs.map((l) => l.section);
      expect(sections).toEqual([...sections].sort((a, b) => a - b));
    }
  });

  it('never offers an RC leg without its four passages', () => {
    for (const t of tests) {
      const rc = t.legs.find((l) => l.kind === 'rc');
      expect(rc?.passageIds).toHaveLength(4);
      expect(rc!.questionCount).toBeGreaterThan(0);
    }
  });

  it('scores every test out of a real question count', () => {
    for (const t of tests) {
      expect(t.questionCount).toBe(t.legs.reduce((n, l) => n + l.questionCount, 0));
      expect(t.questionCount).toBeGreaterThan(60);
    }
  });

  it('flags the short Reading Comprehension sections rather than hiding them', () => {
    const short = tests.filter((t) => !t.rcFullLength);
    // Both kinds exist in the current bank; if that ever stops being true the
    // honesty copy in the Testing Centre is either dead or always on.
    expect(short.length).toBeGreaterThan(0);
    expect(short.length).toBeLessThan(tests.length);
  });
});
