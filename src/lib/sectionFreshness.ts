import { supabase } from '@/integrations/supabase/client';

/**
 * How much of a section a student has never seen.
 *
 * A PrepTest is a consumable: there are 59 of them and no more are coming, so
 * "which section should I sit" is really "which section have I not spent yet".
 *
 * Answered from the `attempts` table, NOT from `question_usage`. Usage is
 * written by the Smart Drill submit path and never by the section runner — a
 * section commits its answers through handleAnswerSelect, which records no
 * usage — so freshness built on usage would report every section a student has
 * ever sat as untouched. `attempts` is written by every mode, sections
 * included, and it already holds their whole history, so a student who sat
 * twenty sections last month sees that reflected the first time they open this.
 *
 * Scope note: only the LR runner writes attempts, so freshness is meaningful
 * for Logical Reasoning and silent for Reading Comprehension. Callers must not
 * present an RC section as "100% fresh" on the strength of an empty set.
 */

export interface SectionQuestions {
  pt: number;
  section: number;
  qids: string[];
}

export interface SectionFreshness {
  pt: number;
  section: number;
  /** Questions in the section. */
  total: number;
  /** Questions the student has never been served. */
  unseen: number;
  /** `unseen / total` as a whole percentage. */
  percentFresh: number;
  /**
   * True only when the student has never been served ANY question in it.
   * Deliberately strict: a section you have half-eaten is no longer a clean
   * read on where you stand, which is the only reason to sit one cold.
   */
  isFresh: boolean;
}

/** `${pt}-${section}`, the key every lookup here uses. */
export const sectionKey = (pt: number, section: number) => `${pt}-${section}`;

/**
 * Join sections against the qids a student has already answered. Only key
 * presence is read, so a Set or any qid-keyed Map works.
 */
export function buildSectionFreshness(
  sections: SectionQuestions[],
  answered: { has(qid: string): boolean },
): Map<string, SectionFreshness> {
  const out = new Map<string, SectionFreshness>();
  for (const { pt, section, qids } of sections) {
    const total = qids.length;
    if (total === 0) continue;
    let unseen = 0;
    for (const qid of qids) {
      if (!answered.has(qid)) unseen++;
    }
    out.set(sectionKey(pt, section), {
      pt,
      section,
      total,
      unseen,
      percentFresh: Math.round((unseen / total) * 100),
      isFresh: unseen === total,
    });
  }
  return out;
}

export type FreshnessFilter = 'fresh' | 'any';

/**
 * Does this section belong under the chosen filter?
 *
 * `any` is the escape hatch, not a mirror of `fresh`: a student who wants a
 * section they have already sat wants THAT section, and making them work out
 * which half of a split it fell into to reach it is a puzzle nobody asked for.
 * So the second option lifts the filter rather than inverting it.
 *
 * Unknown freshness passes both. When the history read failed we do not know
 * whether a section is spent, and hiding one on a guess is worse than offering
 * one already sat.
 */
export function matchesFreshness(
  freshness: SectionFreshness | undefined,
  filter: FreshnessFilter,
): boolean {
  if (filter === 'any') return true;
  if (!freshness) return true;
  return freshness.isFresh;
}

/** "100% fresh" / "42% fresh" / "spent" — the label beside a section. */
export function freshnessLabel(freshness: SectionFreshness | undefined): string | null {
  if (!freshness) return null;
  if (freshness.percentFresh === 0) return 'spent';
  return `${freshness.percentFresh}% fresh`;
}

/**
 * Every qid this student has answered, across every mode.
 *
 * Kept beside the join rather than in the component so the table this reads —
 * and the reason it is this table — travels with the definition of freshness.
 */
export async function fetchAnsweredQids(classId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('attempts').select('qid').eq('class_id', classId);
  if (error) throw new Error(`fetchAnsweredQids failed: ${error.message}`);
  return new Set((data ?? []).map((row) => row.qid));
}
