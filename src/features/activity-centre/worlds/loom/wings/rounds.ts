// Round construction for the loom's two wings.
//
// Both are built from authored text only. That bites hardest on the Decode
// Bench: only the four Q4 items carry a `Decode:` line, because Q4 is the rung
// whose whole point is a vocabulary decode. The bench therefore runs four
// items and says so, rather than inventing decodes for the other sixteen
// phrases so the round would look fuller.

import type { ActivityItem } from "../../../api/types";
import { carries, parseCallback, type Callback } from "../loom";

export interface ReverseCall {
  order: number;
  rung: number;
  /** The idea on the upper sheet, which the student has to find the callback to. */
  idea: string;
  /** The whole lower sheet, unmarked: finding the phrase is the exercise. */
  caller: string;
  /** The phrase that calls back to it. */
  phrase: string;
  topic: string | null;
}

export interface DecodeCard {
  order: number;
  /** The dense phrase, off its passage. */
  phrase: string;
  /** The bank's own decode of its parts. */
  decode: string;
  /** The terms the decode picks out, for checking what the student reached for. */
  terms: string[];
}

const DECODE = /Decode:\s*(.+?)(?:\.\s*(?:Translation|Near-miss|`partial`)|$)/s;
const TERM = /\*([^*]+)\*/g;

export function callbacksOf(items: ActivityItem[]): Callback[] {
  return items.map(parseCallback).filter(Boolean) as Callback[];
}

/**
 * The Reverse Loom.
 *
 * The Main Hall goes down the page then back up. This wing goes the other way:
 * here is the idea, now find where the passage picks it up again. That is the
 * forward scan real reading comprehension questions demand, and it is the
 * harder direction because nothing is marked.
 *
 * The lower sheet arrives unmarked on purpose. Bracketing the phrase would
 * hand over the answer.
 */
export function buildReverseLoom(items: ActivityItem[], size = 10): ReverseCall[] {
  const calls: ReverseCall[] = [];
  for (const c of callbacksOf(items)) {
    // Without a landing there is no idea to point at, and the wing would be
    // asking the student to find the callback to the whole paragraph.
    if (!c.landing) continue;
    calls.push({
      order: c.order,
      rung: c.rung,
      idea: c.landing.text,
      caller: c.caller,
      phrase: c.phrase,
      topic: c.topic,
    });
    if (calls.length >= size) break;
  }
  return calls;
}

/**
 * The Decode Bench.
 *
 * The dense phrases with no passage behind them, so the student works on the
 * words alone. This is step one of the five-step breakdown drilled by itself.
 */
export function buildDecodeBench(items: ActivityItem[]): DecodeCard[] {
  const cards: DecodeCard[] = [];
  for (const item of items) {
    const c = parseCallback(item);
    if (!c) continue;
    const decode = item.explanation?.match(DECODE)?.[1]?.trim();
    if (!decode) continue;

    const terms = [...decode.matchAll(TERM)].map((m) => m[1].trim()).filter(Boolean);
    cards.push({
      order: c.order,
      phrase: c.phrase,
      // The asterisks are the bank's emphasis marks, not something to show raw.
      decode: decode.replace(/\*/g, ""),
      terms,
    });
  }
  return cards;
}

/** Whether the student's answer quotes the phrase the passage actually uses. */
export function foundPhrase(call: ReverseCall, response: string): boolean {
  const said = response.toLowerCase().trim();
  if (!said) return false;
  const target = call.phrase.toLowerCase();
  // Either they quoted it, or they carried nearly all of its content words.
  return said.includes(target) || carries(call.phrase, response) >= 0.75;
}

/** Which of the decode's own terms the student's answer engaged with. */
export function termsReached(card: DecodeCard, response: string): string[] {
  const text = response.toLowerCase();
  return card.terms.filter((t) => text.includes(t.toLowerCase()));
}
