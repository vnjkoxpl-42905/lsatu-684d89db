// Round construction for the atelier's two wings.
//
// Both run only on items whose conclusion the atelier can actually locate (45
// of 62). An item with no crown has no answer key, and a wing that scored a
// student against a claim nobody identified would be inventing the answer.

import type { ActivityItem } from "../../../api/types";
import { parseArgument, type Argument } from "../atelier";

export interface RoleCall {
  order: number;
  level: number;
  claim: string;
  /** True when this claim is the argument's conclusion. */
  isConclusion: boolean;
  /** The argument it came from, shown after the call so the claim has context. */
  argument: string;
}

export interface LightPage {
  order: number;
  level: number;
  strips: { n: number; text: string }[];
  /** Which strip is the conclusion. */
  answer: number;
  /**
   * The words the Logic HUD lifts out of the strips after a wrong tap. Only
   * indicators actually present in this argument; an empty HUD is not raised.
   */
  hud: string[];
}

export function argumentsOf(items: ActivityItem[]): Argument[] {
  return items.map(parseArgument).filter(Boolean) as Argument[];
}

/** Indicators worth lifting into the HUD, checked against the argument's text. */
const HUD_WORDS = [
  "therefore",
  "thus",
  "hence",
  "so",
  "it follows that",
  "consequently",
  "accordingly",
  "clearly",
  "should",
  "must",
  "because",
  "since",
  "after all",
  "but",
  "however",
  "yet",
  "although",
];

/**
 * Role Call.
 *
 * The spec asks for a four-way tag (CONCLUSION / SUPPORT / BACKGROUND /
 * OPPOSING VIEW). Three of those four are not in the bank: the parentheticals
 * in the explanations are verdict tags, not role labels, and the label set is
 * still an open question on the drill's README. So this runs the separation
 * that IS authored: is this claim the one being proved, or is it doing work for
 * the one being proved? That is the Step-1 cut, and every call is checkable.
 *
 * One crown and one support per argument, so the round cannot be cleared by
 * always answering "support". Supports outnumber crowns roughly two to one in
 * the raw claims, and an unbalanced round teaches the wrong reflex.
 */
export function buildRoleCall(items: ActivityItem[], size = 10): RoleCall[] {
  const calls: RoleCall[] = [];

  for (const arg of argumentsOf(items)) {
    if (arg.crown === null) continue;
    const crown = arg.claims[arg.crown];
    const support = arg.claims.find((c) => c.n !== arg.crown);
    if (!crown || !support) continue;

    calls.push({
      order: arg.order,
      level: arg.level,
      claim: crown.text,
      isConclusion: true,
      argument: arg.claims.map((c) => c.text).join(" "),
    });
    calls.push({
      order: arg.order,
      level: arg.level,
      claim: support.text,
      isConclusion: false,
      argument: arg.claims.map((c) => c.text).join(" "),
    });
  }

  // Alternate so the answer never arrives in a run a student could ride.
  const crowns = calls.filter((c) => c.isConclusion);
  const supports = calls.filter((c) => !c.isConclusion);
  const out: RoleCall[] = [];
  for (let i = 0; i < Math.max(crowns.length, supports.length); i += 1) {
    // Flip which side leads each round so the alternation is not itself a tell.
    const pair = i % 2 === 0 ? [crowns[i], supports[i]] : [supports[i], crowns[i]];
    for (const c of pair) if (c) out.push(c);
  }
  return out.slice(0, size);
}

/**
 * The Light Table.
 *
 * Recognition before production: the argument lies flat as strips and the
 * student taps the conclusion. One tap, no typing. A wrong tap raises the Logic
 * HUD, which lifts this argument's own indicator words into the air before the
 * student taps again.
 *
 * This runs on his 62-item bank rather than the 20 in `conclusiondrill.html`.
 * The HUD behaviour and the data shape are his; the items are the ones already
 * vetted for this Centre, which was the recommendation on the drill's README.
 */
export function buildLightTable(items: ActivityItem[], size = 12): LightPage[] {
  const pages: LightPage[] = [];

  for (const arg of argumentsOf(items)) {
    if (arg.crown === null) continue;
    // A single-strip page has nothing to choose between.
    if (arg.claims.length < 2) continue;

    const text = arg.claims.map((c) => c.text).join(" ").toLowerCase();
    const hud = HUD_WORDS.filter((w) => new RegExp(`\\b${w}\\b`).test(text));

    pages.push({
      order: arg.order,
      level: arg.level,
      strips: arg.claims.map((c) => ({ n: c.n, text: c.text })),
      answer: arg.crown,
      hud,
    });
    if (pages.length >= size) break;
  }

  return pages;
}
