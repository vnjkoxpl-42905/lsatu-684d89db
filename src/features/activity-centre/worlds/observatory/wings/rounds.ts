// Round construction for the observatory's two wings.
//
// The bank hands over 109 indicator/type pairs, every one of them authored and
// every one located in a real statement. That is enough to build both wings
// without inventing a single word.

import type { ActivityItem } from "../../../api/types";
import { parseSignal, type RelationKind, type Signal } from "../observatory";

export interface Flash {
  /** The bare indicator, off its statement. */
  indicator: string;
  kind: RelationKind;
  /** The statement it came from, shown after the call. */
  statement: string;
  order: number;
  rung: number;
}

export interface ForgeTask {
  kind: RelationKind;
  /** A subject to write about, taken from a real statement in the bank. */
  about: string;
  /** Indicators of this type the bank uses, for checking what they reached for. */
  lexicon: string[];
}

export function signalsOf(items: ActivityItem[]): Signal[] {
  return items.map(parseSignal).filter(Boolean) as Signal[];
}

/**
 * The Indicator Speed Round.
 *
 * Bare indicators, off their statements, called for type at speed. The hard
 * lexicon is weighted heavier by putting the later rungs first: Rung 3 and 4
 * are where the verb indicators and the look-alikes live, and those are the
 * ones that need the reflex.
 *
 * Duplicate indicators are dropped. Calling "if" eleven times trains nothing,
 * and it would let a student ride one answer through a third of the round.
 */
export function buildSpeedRound(items: ActivityItem[], size = 20): Flash[] {
  const seen = new Set<string>();
  const flashes: Flash[] = [];

  const signals = signalsOf(items).sort((a, b) => b.rung - a.rung);

  for (const s of signals) {
    for (const rel of s.relations) {
      for (const raw of rel.indicators) {
        const indicator = raw.trim().replace(/[.,]+$/, "");
        const key = indicator.toLowerCase();
        if (!indicator || seen.has(key)) continue;
        seen.add(key);
        flashes.push({
          indicator,
          kind: rel.kind,
          statement: s.statement,
          order: s.order,
          rung: s.rung,
        });
      }
    }
  }

  // Interleave by type so the same answer never lands three times running.
  const byKind = new Map<RelationKind, Flash[]>();
  for (const f of flashes) {
    if (!byKind.has(f.kind)) byKind.set(f.kind, []);
    byKind.get(f.kind)!.push(f);
  }
  const out: Flash[] = [];
  const kinds = [...byKind.keys()];
  for (let i = 0; out.length < size; i += 1) {
    let added = false;
    for (const k of kinds) {
      const f = byKind.get(k)![i];
      if (f) {
        out.push(f);
        added = true;
        if (out.length >= size) break;
      }
    }
    if (!added) break;
  }
  return out;
}

/**
 * Forge a Statement.
 *
 * The observatory asks for a relationship and the student writes one. What is
 * checked here is narrow and honest: whether the sentence reaches for an
 * indicator the bank actually uses for that type. The observatory does not
 * judge whether the statement is good, because it cannot, and saying otherwise
 * would be the fake-feedback this Centre refuses everywhere else.
 *
 * The subject comes from a real statement so the task is concrete rather than
 * "write a causal statement about anything".
 */
export function buildForgeTasks(items: ActivityItem[], size = 6): ForgeTask[] {
  const signals = signalsOf(items);

  const lexicon = new Map<RelationKind, Set<string>>();
  for (const s of signals) {
    for (const rel of s.relations) {
      if (!lexicon.has(rel.kind)) lexicon.set(rel.kind, new Set());
      for (const ind of rel.indicators) {
        const bare = ind.trim().replace(/[.,]+$/, "").split(/…|\.\.\./)[0].trim();
        if (bare.length > 1) lexicon.get(rel.kind)!.add(bare.toLowerCase());
      }
    }
  }

  // Only ask for a relationship the bank can actually recognise. A task with an
  // empty lexicon would demand a statement and then have nothing to check it
  // against, which is exactly the fake feedback this wing exists to avoid.
  const kinds = (["conditional", "causal", "comparative"] as RelationKind[]).filter(
    (k) => (lexicon.get(k)?.size ?? 0) > 0,
  );
  if (!kinds.length || !signals.length) return [];

  const tasks: ForgeTask[] = [];
  for (let i = 0; i < size; i += 1) {
    const kind = kinds[i % kinds.length];
    tasks.push({
      kind,
      about: subjectOf(signals[(i * 5) % signals.length].statement),
      lexicon: [...lexicon.get(kind)!],
    });
  }
  return tasks;
}

/** A rough subject for the writing prompt: the statement's opening noun phrase. */
function subjectOf(statement: string): string {
  const words = statement.replace(/^(if|when|whenever|only if|provided|unless)\s+/i, "").split(/\s+/);
  return words.slice(0, 3).join(" ").replace(/[^A-Za-z0-9\s-]/g, "").trim();
}

/** Which of this type's indicators the student's sentence reached for. */
export function indicatorsUsed(task: ForgeTask, sentence: string): string[] {
  const text = sentence.toLowerCase();
  return task.lexicon.filter((ind) =>
    new RegExp(`\\b${ind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text),
  );
}
