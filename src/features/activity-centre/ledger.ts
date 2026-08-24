/**
 * The indicator ledger.
 *
 * Everything here is a join of two things the app already stored and never put
 * together: the verdict per item, which the attempt log has carried since the
 * beginning, and the indicator word each item drills, which the bank has carried
 * for just as long. Sixty-two rows of "Not yet" is a record. Which words the
 * "Not yet"s are attached to is a diagnosis, and it needs no new capture.
 *
 * A miss is any judged item that did not earn full credit, so a `partial`
 * counts. It has to: the score weights a partial at half a mark, and a ledger
 * that quietly forgave partials would be telling a student a word was clean
 * while the percentage on the same screen said otherwise.
 *
 * An item nobody judged is not a miss and is not asked. A Coach outage is not
 * evidence about a word.
 */

import type { ActivityItem, Verdict } from "./api/types";
import {
  INDICATOR_FAMILIES,
  indicatorFor,
  indicatorMapFor,
  type IndicatorFamily,
  type IndicatorMeta,
} from "./indicator-families";

export interface IndicatorTally {
  indicator: string;
  /** Judged items drilling this word that did not earn full credit. */
  missed: number;
  /** Judged items drilling this word. */
  asked: number;
  /** The item orders behind `missed`, ascending. What a re-drill runs. */
  orders: number[];
}

export interface FamilyTally {
  family: IndicatorFamily;
  label: string;
  lesson: string;
  missed: number;
  asked: number;
  /** Worst first, then alphabetical, so the reading order is the work order. */
  indicators: IndicatorTally[];
}

export interface IndicatorLedger {
  /** Families that cost marks, worst first. */
  missedFamilies: FamilyTally[];
  /** Families asked and never missed. The "everything else was clean" half. */
  cleanFamilies: FamilyTally[];
  /** Every missed item, ascending. The re-drill list. */
  missedOrders: number[];
  /** Judged items that carry a mapped indicator. The ledger's denominator. */
  asked: number;
  missed: number;
  /**
   * Judged items whose category is not in the map. Zero today and asserted so
   * in a test; carried because a new item with a new category would otherwise
   * vanish from a screen claiming to account for the whole run.
   */
  unmapped: number;
}

const FAMILY_ORDER = Object.keys(INDICATOR_FAMILIES) as IndicatorFamily[];

/**
 * Build the ledger for a finished run, or null when there is nothing to say.
 *
 * Null, not an empty ledger, for three cases that are all "no diagnosis
 * available" rather than "no misses": an Activity nobody has grouped, a run
 * where nothing was judged, and a run carrying no mapped items at all. An empty
 * ledger means something different -- asked, and clean -- and the screen says so.
 */
export function buildIndicatorLedger(
  title: string | undefined,
  items: ActivityItem[],
  verdicts: Record<number, Verdict | null>,
): IndicatorLedger | null {
  const map = indicatorMapFor(title);
  if (!map) return null;

  // family -> indicator -> tally, built in one pass over the items.
  const byFamily = new Map<IndicatorFamily, Map<string, IndicatorTally>>();
  let asked = 0;
  let missed = 0;
  let unmapped = 0;
  const missedOrders: number[] = [];

  for (const item of items) {
    const verdict = verdicts[item.order];
    if (!verdict) continue; // never judged: no evidence either way

    const meta: IndicatorMeta | null = indicatorFor(item, map);
    if (!meta) {
      unmapped += 1;
      continue;
    }

    asked += 1;
    const isMiss = verdict !== "correct";
    if (isMiss) {
      missed += 1;
      missedOrders.push(item.order);
    }

    let words = byFamily.get(meta.family);
    if (!words) {
      words = new Map();
      byFamily.set(meta.family, words);
    }
    let tally = words.get(meta.indicator);
    if (!tally) {
      tally = { indicator: meta.indicator, missed: 0, asked: 0, orders: [] };
      words.set(meta.indicator, tally);
    }
    tally.asked += 1;
    if (isMiss) {
      tally.missed += 1;
      tally.orders.push(item.order);
    }
  }

  if (asked === 0) return null;

  const tallies: FamilyTally[] = [];
  for (const family of FAMILY_ORDER) {
    const words = byFamily.get(family);
    if (!words) continue;
    const indicators = [...words.values()].sort(
      (a, b) => b.missed - a.missed || a.indicator.localeCompare(b.indicator),
    );
    tallies.push({
      family,
      label: INDICATOR_FAMILIES[family].label,
      lesson: INDICATOR_FAMILIES[family].lesson,
      missed: indicators.reduce((n, i) => n + i.missed, 0),
      asked: indicators.reduce((n, i) => n + i.asked, 0),
      indicators,
    });
  }

  return {
    // Worst first. Ties break on how much of the family was asked, so a family
    // they missed two of three in outranks one they missed two of twelve in.
    missedFamilies: tallies
      .filter((t) => t.missed > 0)
      .sort((a, b) => b.missed - a.missed || a.asked - b.asked),
    cleanFamilies: tallies.filter((t) => t.missed === 0),
    missedOrders: missedOrders.sort((a, b) => a - b),
    asked,
    missed,
    unmapped,
  };
}

/**
 * The one-line headline, or null when there is no single word worth naming.
 *
 * Null when nothing was missed (the screen has a better sentence for that) and
 * when the worst word cost exactly as much as the next one: "Unless cost you the
 * most" is false if without cost the same, and a headline that has to be hedged
 * is not a headline.
 */
export function ledgerHeadline(ledger: IndicatorLedger): string | null {
  if (ledger.missed === 0) return null;
  const words = ledger.missedFamilies
    .flatMap((f) => f.indicators)
    .filter((i) => i.missed > 0)
    .sort((a, b) => b.missed - a.missed);
  if (words.length === 0) return null;
  if (words.length > 1 && words[1].missed === words[0].missed) return null;
  const top = words[0];
  const n = top.missed;
  return `${top.indicator} cost you ${n === 1 ? "one question" : `${n} questions`}.`;
}
