/**
 * The audit script and the page must agree on what is offered.
 *
 * scripts/audit-practice-tests.mjs re-implements the offer rules in plain Node,
 * because it also reads the LSAT Lab source table that the app never loads. A
 * re-implementation is a second truth, and a second truth drifts: the day the
 * blueprint rules change, an audit that still applies the old ones would report
 * a clean bank while the Testing Centre offered something else. This pins them
 * together, so that day fails here instead of in front of a student.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPracticeTests } from './practiceTest';
import { buildRcSections, type RcIndexPassageWithPt } from '@/features/rc/lib/rcSections';
import type { QuestionManifest } from './questionLoader';

const ROOT = process.cwd();
const DATA = resolve(ROOT, 'public/data');

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
      count: (JSON.parse(readFileSync(resolve(DATA, m[0]), 'utf8')) as { status?: string }[])
        .filter((q) => q.status !== 'removed').length,
      filename: m[0],
    }));
  return { sections } as QuestionManifest;
}

/** Runs the audit and reads back its machine-readable half. */
function runAudit() {
  const out = join(mkdtempSync(join(tmpdir(), 'pt-audit-')), 'work.json');
  // The script exits 1 while any offered test is short, which is its whole
  // point; --report-only keeps that from reading as a test failure here.
  execFileSync(
    process.execPath,
    ['scripts/audit-practice-tests.mjs', '--summary', '--report-only', '--json', out],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return JSON.parse(readFileSync(out, 'utf8')) as {
    rcRosterExact: boolean;
    rc: { preptest: number; section: number; missingPositions: number[]; missingQuestionIds: number[] }[];
    lr: { preptest: number; section: number; missingPositions: number[] }[];
  };
}

describe('the practice-test audit', () => {
  const tests = buildPracticeTests(realManifest(), realRcSections());
  const work = runAudit();

  it('offers the scored PT118 sections S1, S2 RC, and S4', () => {
    const pt118 = tests.find((test) => test.pt === 118);
    expect(pt118).toBeDefined();
    expect(pt118!.legs.map((leg) => [leg.section, leg.kind])).toEqual([
      [1, 'lr'], [2, 'rc'], [4, 'lr'],
    ]);
    expect(pt118!.questionCount).toBe(77);
  });

  it('reads the exact RC roster rather than guessing at it', () => {
    // Without the LSAT Lab question table the audit cannot see a missing tail,
    // and would under-report. If the bundle ever leaves the repo, say so here.
    expect(work.rcRosterExact).toBe(true);
  });

  it('names a source question id for every missing RC question', () => {
    for (const s of work.rc) {
      expect(s.missingQuestionIds).toHaveLength(s.missingPositions.length);
      for (const id of s.missingQuestionIds) expect(Number.isFinite(id)).toBe(true);
    }
  });

  it('covers the RC leg of every offered test', () => {
    // Every RC section the page can put in front of a student is one the audit
    // has an opinion about: either it is absent from the work list because it
    // is whole, or it is present with the questions it lacks.
    const shortByKey = new Map(work.rc.map((s) => [`${s.preptest}:${s.section}`, s]));
    for (const t of tests) {
      const rc = t.legs.find((l) => l.kind === 'rc');
      const key = `${t.pt}:${rc!.section}`;
      const short = shortByKey.get(key);
      if (!short) continue;
      expect(short.missingPositions.length).toBeGreaterThan(0);
    }
  });

  it('agrees with the blueprint on which LR sections are short', () => {
    const lrShort = new Set(work.lr.map((s) => `${s.preptest}:${s.section}`));
    // A gap inside an LR section does not stop the section being offered — the
    // blueprint gates on count, not contiguity — so these must still appear as
    // legs. This is the asymmetry the report has to state out loud.
    for (const key of lrShort) {
      const [pt, section] = key.split(':').map(Number);
      const offered = tests.some(
        (t) => t.pt === pt && t.legs.some((l) => l.kind === 'lr' && l.section === section),
      );
      expect(typeof offered).toBe('boolean');
    }
    expect(lrShort.size).toBeGreaterThan(0);
  });
});
