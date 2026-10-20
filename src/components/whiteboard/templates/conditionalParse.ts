// Item C — pragmatic NLP for splitting a teacher-typed conditional
// sentence into antecedent + consequent for each of the four indicator
// groups. Not a general parser — designed for clean, single-sentence
// inputs. Returns the verbatim text when it can't parse so the teacher
// can edit the resulting boxes.

export type ConditionalGroup = 1 | 2 | 3 | 4;

export interface ParsedConditional {
  antecedent: string;
  consequent: string;
}

const GROUP_INDICATORS: Record<ConditionalGroup, RegExp> = {
  // Group 1 — sufficient first: if, when, every, all, whenever, anyone who
  1: /\b(if|when|whenever|every|all|anyone who|anyone that|any time|any time that)\b/i,
  // Group 2 — necessary phrasing: only if, only when, only — antecedent is
  // whichever side LACKS the indicator
  2: /\b(only if|only when|only)\b/i,
  // Group 3 — negated sufficient: no, none of, never
  3: /\b(no|none of|never)\b/i,
  // Group 4 — unless: rewrites to "if not ..."
  4: /\bunless\b/i,
};

const NEG = '¬';

// Strip leading/trailing punctuation/whitespace and capitalize-first
// idiosyncrasies so the boxes look clean.
function trim(s: string): string {
  return s
    .replace(/^[\s,;.:]+/g, '')
    .replace(/[\s,;.:]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function negate(clause: string): string {
  const t = trim(clause);
  if (!t) return t;
  if (t.startsWith(NEG)) return trim(t.slice(NEG.length));
  return `${NEG}${t}`;
}

export function parseSentenceForGroup(
  text: string,
  group: ConditionalGroup,
): ParsedConditional {
  if (!text) return { antecedent: '', consequent: '' };
  const cleaned = trim(text).replace(/[.!?]+$/g, '');

  if (group === 4) {
    // "Unless X, Y" or "Y unless X". X is the antecedent; negate it.
    const m = cleaned.match(/(.*?)\bunless\b(.*)/i);
    if (!m) return { antecedent: cleaned, consequent: '' };
    const leading = trim(m[1]);
    const trailing = trim(m[2]);
    if (leading) {
      return { antecedent: negate(trailing), consequent: leading };
    }
    // Sentence starts with "Unless"
    const [unlessClause, mainClause] = splitOnFirstComma(trailing);
    return { antecedent: negate(unlessClause), consequent: mainClause };
  }

  const indicator = GROUP_INDICATORS[group];
  const idx = cleaned.search(indicator);

  if (group === 1) {
    if (idx === -1) {
      // No indicator found; fall back to comma split, sufficient first.
      const [first, second] = splitOnFirstComma(cleaned);
      return { antecedent: first, consequent: second || '' };
    }
    const before = trim(cleaned.slice(0, idx));
    const afterMatch = cleaned.slice(idx).match(indicator);
    const afterIndicator = afterMatch
      ? cleaned.slice(idx + afterMatch[0].length)
      : cleaned.slice(idx);
    if (!before) {
      // "If X, Y" — antecedent = X (between If and comma), consequent = Y
      const [ant, cons] = splitOnFirstComma(afterIndicator);
      return { antecedent: trim(ant), consequent: trim(cons) };
    }
    // "Y, if X" — consequent first, then indicator + antecedent
    return { antecedent: trim(afterIndicator), consequent: before };
  }

  if (group === 2) {
    // Only-if: indicator side is the necessary clause (consequent).
    if (idx === -1) {
      const [first, second] = splitOnFirstComma(cleaned);
      return { antecedent: first, consequent: second || '' };
    }
    const before = trim(cleaned.slice(0, idx));
    const afterMatch = cleaned.slice(idx).match(indicator);
    const afterIndicator = afterMatch
      ? trim(cleaned.slice(idx + afterMatch[0].length))
      : trim(cleaned.slice(idx));
    if (!before) {
      // "Only if X, Y" -> Y is sufficient, X is necessary
      const [necessary, sufficient] = splitOnFirstComma(afterIndicator);
      return { antecedent: trim(sufficient), consequent: trim(necessary) };
    }
    return { antecedent: before, consequent: afterIndicator };
  }

  // Group 3 — negated sufficient. "No A are B" → A → ¬B
  const m3 = cleaned.match(/\bno\b\s+(.+?)\s+(?:are|is|can|do)\s+(.+)/i);
  if (m3) {
    return { antecedent: trim(m3[1]), consequent: negate(m3[2]) };
  }
  const [first, second] = splitOnFirstComma(cleaned);
  return { antecedent: first, consequent: negate(second || '') };
}

function splitOnFirstComma(s: string): [string, string] {
  const idx = s.indexOf(',');
  if (idx === -1) return [trim(s), ''];
  return [trim(s.slice(0, idx)), trim(s.slice(idx + 1))];
}
