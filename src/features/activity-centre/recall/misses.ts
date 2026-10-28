import { classifyDetail } from "./grading";

/**
 * What kind of thing a student keeps dropping.
 *
 * Every Report Card already stores the exact Details she missed, run after run,
 * and nothing has ever read across them. One run says "you dropped 'all
 * employees' on stimulus 1", which is a fact about a stimulus. Twenty runs say
 * "you drop the quantifier four times in five", which is a fact about her, and
 * it is the only one of the two that changes what she practises.
 *
 * The grouping is deliberately coarse. Five buckets a person can act on, not a
 * taxonomy: the drill's own briefing already tells her which of these carry the
 * load ("The names, the numbers, and the small words carrying the load, all,
 * most, only, probably, they either come back or they do not"), so these are
 * the categories she has already been taught to watch.
 *
 * Computed rather than stored, so it re-derives from the runs on record and a
 * better grouping is one deploy away rather than a backfill.
 */

export type MissKind = "quantity" | "name" | "strength" | "role" | "claim";

export const MISS_LABEL: Record<MissKind, string> = {
  quantity: "Numbers and quantifiers",
  name: "Names and proper nouns",
  strength: "How strongly it was claimed",
  role: "What the sentence was doing",
  claim: "Plain facts",
};

/**
 * The quantifiers the method singles out, plus anything with a digit in it.
 *
 * Word-boundary matched, so "all" does not fire on "allocated" and "some" does
 * not fire on "something". Checked before names, because "all four nurses" is a
 * quantity miss first and a name miss second.
 */
const QUANTITY =
  /\b(all|most|some|none|no|only|every|each|few|many|several|half|both|never|always|at least|at most|more|less|fewer|greater|percent|per cent)\b|\d/i;

/**
 * A proper noun, taken as a capitalised word that is not the first one.
 *
 * Details are authored as sentences, so the opening capital says nothing. This
 * is a heuristic and is meant to be: it separates "The nurses were in Sweden."
 * from "The study ran for four years." without a gazetteer.
 */
const NAME = /\s[A-Z][a-z]+/;

export function missKind(text: string): MissKind {
  const kind = classifyDetail(text);
  if (kind === "structure") return "role";
  if (kind === "modality") return "strength";
  if (QUANTITY.test(text)) return "quantity";
  if (NAME.test(text)) return "name";
  return "claim";
}

export interface MissTally {
  kind: MissKind;
  label: string;
  missed: number;
  /** Of everything of this kind she was asked for, the share she dropped. */
  share: number;
}

/**
 * What she keeps dropping, as a share rather than a count.
 *
 * A count answers "which kind did I miss most", and the answer is always
 * whichever kind there is most of: plain facts outnumber modality about eight
 * to one, so a count puts "plain facts" at the top of every student's list for
 * ever. The share answers the question actually worth asking, which is which
 * kind she drops *when it comes up*.
 *
 * `asked` is every Detail she was asked for. Where a run predates the stored
 * carried/missed split it contributes only its misses, which biases the share
 * upward and is why a kind with almost nothing behind it is dropped rather than
 * reported.
 */
export function tallyMisses(
  runs: { missed: string[]; asked: string[] }[],
  minimumAsked = 5,
): MissTally[] {
  const missed = new Map<MissKind, number>();
  const asked = new Map<MissKind, number>();
  for (const run of runs) {
    for (const text of run.asked) asked.set(missKind(text), (asked.get(missKind(text)) ?? 0) + 1);
    for (const text of run.missed) missed.set(missKind(text), (missed.get(missKind(text)) ?? 0) + 1);
  }
  const out: MissTally[] = [];
  for (const [kind, total] of asked) {
    if (total < minimumAsked) continue;
    const dropped = missed.get(kind) ?? 0;
    out.push({ kind, label: MISS_LABEL[kind], missed: dropped, share: dropped / total });
  }
  // Worst first, and ties broken by how much evidence there is, so a kind
  // measured over three hundred Details outranks one measured over six.
  return out.sort((a, b) => b.share - a.share || b.missed - a.missed);
}
