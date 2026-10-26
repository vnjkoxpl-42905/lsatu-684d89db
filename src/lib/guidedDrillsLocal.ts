import type { GuidedDrill, GuidedDrillBankFilter } from '@/lib/guidedDrills';
import { coerceStudentLevel } from '@/lib/studentLevel';
import { GUIDED_DRILLS_LOCAL_SEED } from '@/data/guidedDrillsLocalSeed';

/**
 * Bundled, DB-independent guided-drill definitions (generated from the repo
 * seed). Used as a fallback so a guided drill still launches when the live
 * `guided_drills` row is missing, unpublished, or has a null `bank_filter`.
 * The question pool resolves client-side against the question bank, so these
 * definitions are enough to build a drill; teacher assignments still use the DB.
 */
const BY_SLUG = new Map<string, GuidedDrill>(
  GUIDED_DRILLS_LOCAL_SEED.map((row) => [
    row.slug,
    {
      id: row.slug,
      slug: row.slug,
      week: row.week ?? 0,
      order_in_week: row.order_in_week ?? 0,
      title: row.title,
      category: row.category ?? null,
      estimated_minutes: row.estimated_minutes ?? null,
      question_count: row.question_count ?? null,
      difficulty_min: row.difficulty_min ?? null,
      difficulty_max: row.difficulty_max ?? null,
      question_types: [...(row.question_types ?? [])],
      question_features: [...(row.question_features ?? [])],
      reasoning_types: [...(row.reasoning_types ?? [])],
      start_button_label: row.start_button_label ?? 'Start',
      instruction_card: { ...(row.instruction_card ?? {}) },
      bank_filter: { ...(row.bank_filter ?? {}) } as GuidedDrillBankFilter,
      source_file: row.source_file ?? null,
      is_published: true,
      // Built field by field, so a new column is silently dropped unless it is
      // added here too.
      level: coerceStudentLevel((row as { level?: unknown }).level, null),
    } satisfies GuidedDrill,
  ]),
);

/** Local guided-drill definition for a slug, or null when unknown. */
export function getLocalGuidedDrillBySlug(slug: string | undefined | null): GuidedDrill | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

/** True when a bank_filter has no usable constraints (treated as "missing"). */
export function isEmptyBankFilter(filter: GuidedDrillBankFilter | null | undefined): boolean {
  if (!filter) return true;
  const { qtypes, features, reasoning_types, difficulty_min, difficulty_max } = filter;
  return (
    (!qtypes || qtypes.length === 0) &&
    (!features || features.length === 0) &&
    (!reasoning_types || reasoning_types.length === 0) &&
    difficulty_min == null &&
    difficulty_max == null
  );
}
