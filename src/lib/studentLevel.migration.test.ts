import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { LEVEL_BANDS, STUDENT_LEVELS } from './studentLevel';

/**
 * The band numbers live in TypeScript (studentLevel.ts) and are restated once
 * in SQL, in the guided_drills.level backfill. Nothing at runtime connects the
 * two, so a change to LEVEL_BANDS would silently leave the catalog tagged
 * against the old bands. This spec is that connection.
 */

const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20260805001000_guided_drill_level.sql',
);
const LEVEL_COLUMN_MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20260805000000_student_level.sql',
);

describe('guided_drills.level backfill agrees with LEVEL_BANDS', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it.each(STUDENT_LEVELS)('states the %s band exactly as TypeScript defines it', (level) => {
    const { min, max } = LEVEL_BANDS[level];
    // e.g. beginner -> ">= 1" paired with "<= 3" on the same WHEN clause.
    const clause = new RegExp(
      `>=\\s*${min}\\s+AND\\s+coalesce\\(difficulty_max,\\s*5\\)\\s*<=\\s*${max}[\\s\\S]{0,200}?THEN '${level}'`,
    );
    expect(
      clause.test(sql),
      `The backfill has no clause mapping difficulty ${min}-${max} to '${level}'. ` +
        `If LEVEL_BANDS changed, write a new migration to re-tag guided_drills.level.`,
    ).toBe(true);
  });

  it('constrains the column to exactly the levels the app knows', () => {
    for (const level of STUDENT_LEVELS) {
      expect(sql).toContain(`'${level}'`);
    }
    // A level in the DB that the app cannot parse would silently become "not
    // set" everywhere, via coerceStudentLevel.
    const check = sql.match(/CHECK \(level IN \(([^)]+)\)\)/);
    expect(check, 'the level column must carry a CHECK constraint').toBeTruthy();
    const allowed = check![1].split(',').map((s) => s.trim().replace(/'/g, ''));
    expect(allowed.sort()).toEqual([...STUDENT_LEVELS].sort());
  });
});

describe('student level columns', () => {
  const sql = readFileSync(LEVEL_COLUMN_MIGRATION, 'utf8');

  it('grants UPDATE on proficiency_level', () => {
    // profiles had UPDATE revoked and re-granted per column. Column privileges
    // are checked before RLS, so without this grant nobody -- admin included --
    // can write the column, and the error reads like an RLS bug.
    expect(sql).toMatch(/GRANT UPDATE \(proficiency_level\) ON public\.profiles TO authenticated/i);
  });

  it('keeps students from re-levelling themselves or their assignments', () => {
    // The self-update policies are not column-scoped; these guards are.
    expect(sql).toMatch(/NEW\.proficiency_level\s+IS DISTINCT FROM OLD\.proficiency_level/);
    expect(sql).toMatch(/NEW\.level\s+IS DISTINCT FROM OLD\.level/);
    expect(sql).toMatch(/NEW\.question_count\s+IS DISTINCT FROM OLD\.question_count/);
  });

  it('does not reuse profiles.level, which is gamification XP', () => {
    expect(sql).not.toMatch(/ALTER TABLE public\.profiles[\s\S]{0,80}ADD COLUMN[^;]*\blevel\b\s+text/);
  });
});
