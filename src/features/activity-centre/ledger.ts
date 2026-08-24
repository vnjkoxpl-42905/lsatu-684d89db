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

import type {
  ActivityAssignment,
  ActivityItem,
  ActivityItemResponse,
  ActivityStatus,
  Verdict,
} from "./api/types";
import { reconstructProgress } from "./progress";
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

/* ------------------------------------------------------------------ *
 * The same join, on the teacher's side
 *
 * Nothing new is captured for this and nothing new is computed. It is the
 * student's own ledger, read from the attempt log the student already wrote,
 * shown to the person preparing their next session. That is the whole feature:
 * the data has been sitting there since the first run.
 * ------------------------------------------------------------------ */

export interface AssignmentLedger {
  assignmentId: string;
  title: string;
  status: ActivityStatus;
  startedAt: string | null;
  completedAt: string | null;
  /** How far through the run the attempt log reaches. */
  resolved: number;
  total: number;
  ledger: IndicatorLedger;
}

/**
 * One ledger per assignment that has something to say, newest first.
 *
 * Per assignment, deliberately, rather than merged per Activity. Two runs of the
 * same Activity can disagree about an item -- missed in March, clean in August --
 * and there is no obvious rule for which one describes the student. Showing both
 * runs answers that honestly; picking one silently would not. If a merge policy
 * is ever wanted it belongs here, decided out loud.
 *
 * An assignment nobody has started has no attempts, so `buildIndicatorLedger`
 * returns null for it and it drops out rather than appearing as a row of zeroes.
 */
export function ledgersForAssignments(
  assignments: ActivityAssignment[],
  responses: ActivityItemResponse[],
): AssignmentLedger[] {
  const byAssignment = new Map<string, ActivityItemResponse[]>();
  for (const r of responses) {
    const list = byAssignment.get(r.assignment_id);
    if (list) list.push(r);
    else byAssignment.set(r.assignment_id, [r]);
  }

  const out: AssignmentLedger[] = [];
  for (const a of assignments) {
    const rows = byAssignment.get(a.id);
    if (!rows || rows.length === 0) continue;
    const items = [...a.items].sort((x, y) => x.order - y.order);
    const progress = reconstructProgress(items, rows);
    const ledger = buildIndicatorLedger(a.title, items, progress.verdicts);
    if (!ledger) continue;
    out.push({
      assignmentId: a.id,
      title: a.title,
      status: a.status,
      startedAt: a.started_at,
      completedAt: a.completed_at,
      resolved: progress.resolvedCount,
      total: items.length,
      ledger,
    });
  }

  // Newest first, on the timestamp that describes the WORK rather than the
  // paperwork: when they finished it, else when they started, else when it was
  // handed to them. Sorting on created_at would put a run they did yesterday
  // below an assignment issued last month and never opened.
  return out.sort((a, b) => {
    const at = a.completedAt ?? a.startedAt ?? "";
    const bt = b.completedAt ?? b.startedAt ?? "";
    return bt.localeCompare(at);
  });
}

/**
 * The families costing this student the most, across every run they have done.
 *
 * This one DOES aggregate across assignments, because the question it answers is
 * about the student rather than about a run: what to spend the next session on.
 * It counts every judged item once per run, so a word they missed in two separate
 * runs is a word that has cost them twice, which is the honest reading of "this
 * keeps happening".
 */
export function familiesAcrossRuns(ledgers: AssignmentLedger[]): FamilyTally[] {
  const merged = new Map<IndicatorFamily, FamilyTally>();
  for (const { ledger } of ledgers) {
    for (const f of [...ledger.missedFamilies, ...ledger.cleanFamilies]) {
      const existing = merged.get(f.family);
      if (!existing) {
        merged.set(f.family, {
          ...f,
          indicators: f.indicators.map((i) => ({ ...i, orders: [...i.orders] })),
        });
        continue;
      }
      existing.missed += f.missed;
      existing.asked += f.asked;
      for (const i of f.indicators) {
        const found = existing.indicators.find((x) => x.indicator === i.indicator);
        if (found) {
          found.missed += i.missed;
          found.asked += i.asked;
          found.orders.push(...i.orders);
        } else {
          existing.indicators.push({ ...i, orders: [...i.orders] });
        }
      }
    }
  }

  for (const f of merged.values()) {
    f.indicators.sort((a, b) => b.missed - a.missed || a.indicator.localeCompare(b.indicator));
  }

  return [...merged.values()]
    .filter((f) => f.missed > 0)
    .sort((a, b) => b.missed - a.missed || a.asked - b.asked);
}
