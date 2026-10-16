import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { GUIDED_DRILLS_LOCAL_SEED } from './guidedDrillsLocalSeed';
import { getLocalGuidedDrillBySlug } from '@/lib/guidedDrillsLocal';
import { STUDENT_LEVELS } from '@/lib/studentLevel';

/**
 * The bundled seed is generated from data/guided-drills/_seed.json and is the
 * fallback that keeps a drill launchable when its DB row is missing. It carried
 * an "AUTO-GENERATED, regenerate when the seed changes" header for a long time
 * with no generator committed, so it could only drift. These specs make drift
 * a test failure rather than a silent divergence.
 */

const SEED_JSON = resolve(__dirname, '../../data/guided-drills/_seed.json');

function sourceRows(): Array<Record<string, unknown>> {
  const raw = JSON.parse(readFileSync(SEED_JSON, 'utf8'));
  return (
    Array.isArray(raw) ? raw : Object.values(raw).flat()
  ) as Array<Record<string, unknown>>;
}

describe('guidedDrillsLocalSeed', () => {
  it('covers exactly the drills in the source seed', () => {
    const source = sourceRows();
    expect(GUIDED_DRILLS_LOCAL_SEED).toHaveLength(source.length);
    expect(GUIDED_DRILLS_LOCAL_SEED.map((r) => r.slug).sort()).toEqual(
      source.map((r) => r.slug as string).sort(),
    );
  });

  it('carries the same level as the source seed for every drill', () => {
    const bySlug = new Map(sourceRows().map((r) => [r.slug as string, r.level ?? null]));
    for (const row of GUIDED_DRILLS_LOCAL_SEED) {
      const expected = bySlug.get(row.slug) ?? null;
      expect(
        (row as { level?: unknown }).level ?? null,
        `${row.slug}: bundled level is stale. Run: node scripts/build-guided-drills-local-seed.mjs`,
      ).toBe(expected);
    }
  });

  it('only ever uses levels the app can parse', () => {
    for (const row of GUIDED_DRILLS_LOCAL_SEED) {
      const level = (row as { level?: unknown }).level ?? null;
      if (level !== null) expect(STUDENT_LEVELS).toContain(level);
    }
  });

  it('surfaces the level through the fallback loader, not just the raw data', () => {
    // guidedDrillsLocal.ts builds its GuidedDrill field by field, so a new
    // column is dropped unless it is mapped there too.
    const tagged = GUIDED_DRILLS_LOCAL_SEED.find(
      (r) => (r as { level?: unknown }).level === 'advanced',
    );
    expect(tagged, 'expected at least one advanced drill in the seed').toBeTruthy();
    expect(getLocalGuidedDrillBySlug(tagged!.slug)?.level).toBe('advanced');
  });
});
