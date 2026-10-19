// Content for the Conditional Indicators Refresher.
// Kept as plain data so the page components stay presentational.

export type GroupId = "g1" | "g2" | "g3" | "g4";

export interface GroupDef {
  id: GroupId;
  n: number;
  title: string;
  words: string[];
  rule?: string;
  steps?: string[];
  note?: string;
}

export const GROUPS: GroupDef[] = [
  {
    id: "g1",
    n: 1,
    title: "Sufficient",
    words: ["if", "when", "where", "all", "the only", "every", "any"],
    rule: "The indicator introduces the sufficient idea. That complete idea goes left of the arrow.",
  },
  {
    id: "g2",
    n: 2,
    title: "Necessary",
    words: ["only", "only if", "only when", "only where", "always", "requires", "must"],
    rule: "The indicator introduces the necessary idea. That complete idea goes right of the arrow.",
  },
  {
    id: "g3",
    n: 3,
    title: "Negate sufficient",
    words: ["unless", "until", "without"],
    steps: [
      "Choose one complete idea.",
      "Negate it.",
      "Put the negated idea on the left of the arrow.",
      "Keep the other complete idea unchanged on the right.",
    ],
    note: "Choosing the other starting idea gives you the contrapositive.",
  },
  {
    id: "g4",
    n: 4,
    title: "Negate necessary",
    words: ["no", "none", "not both", "never", "cannot"],
    steps: [
      "Keep one complete idea unchanged on the left.",
      "Negate the other complete idea.",
      "Put that negation on the right.",
    ],
    note: "Switching which complete idea you start with gives you the contrapositive.",
  },
];

export const GROUP_LABEL: Record<GroupId, string> = {
  g1: "Group 1 · Sufficient",
  g2: "Group 2 · Necessary",
  g3: "Group 3 · Negate sufficient",
  g4: "Group 4 · Negate necessary",
};

/** Full indicator pool for Sort Drills — every word from every group. */
export const INDICATOR_POOL: { word: string; group: GroupId }[] = GROUPS.flatMap(g =>
  g.words.map(word => ({ word, group: g.id })),
);

/* ------------------------------ Diagram drills ----------------------------- */

export interface DiagramItem {
  id: string;
  group: GroupId;
  prompt: string;
  /** Short context names available as buttons (slashed versions are derived). */
  names: string[];
  /** Connectors this item needs; omitted when the item needs none. */
  connectors?: ("+" | "or")[];
  /** Space-separated tokens. "/" prefix means the slashed (negated) name. */
  left: string;
  right: string;
}

export const DIAGRAM_ITEMS: DiagramItem[] = [
  { id: "d1", group: "g1", prompt: "If Mia trains, she qualifies.", names: ["trains", "qualifies"], left: "trains", right: "qualifies" },
  { id: "d2", group: "g1", prompt: "All dancers stretch.", names: ["dancer", "stretch"], left: "dancer", right: "stretch" },
  { id: "d3", group: "g1", prompt: "The only students admitted are seniors.", names: ["admitted", "senior"], left: "admitted", right: "senior" },
  { id: "d4", group: "g1", prompt: "If Ada studies and rests, she passes.", names: ["studies", "rests", "passes"], connectors: ["+"], left: "studies + rests", right: "passes" },
  { id: "d5", group: "g2", prompt: "Only members vote.", names: ["vote", "member"], left: "vote", right: "member" },
  { id: "d6", group: "g2", prompt: "The bridge opens only if it has been inspected.", names: ["opens", "inspected"], left: "opens", right: "inspected" },
  { id: "d7", group: "g2", prompt: "Funding requires approval.", names: ["funding", "approval"], left: "funding", right: "approval" },
  { id: "d8", group: "g2", prompt: "Hikers always bring a map.", names: ["hiker", "map"], left: "hiker", right: "map" },
  { id: "d9", group: "g2", prompt: "Every finalist must write or present.", names: ["finalist", "write", "present"], connectors: ["or"], left: "finalist", right: "write or present" },
  { id: "d10", group: "g3", prompt: "Unless the rain stops, the game is cancelled.", names: ["rain stops", "cancelled"], left: "/rain stops", right: "cancelled" },
  { id: "d11", group: "g3", prompt: "The plant dies without water.", names: ["water", "dies"], left: "/water", right: "dies" },
  { id: "d12", group: "g3", prompt: "Nina will not sign until the terms change.", names: ["terms change", "signs"], left: "/terms change", right: "/signs" },
  { id: "d13", group: "g4", prompt: "No reptiles are warm-blooded.", names: ["reptile", "warm-blooded"], left: "reptile", right: "/warm-blooded" },
  { id: "d14", group: "g4", prompt: "Sam never works weekends.", names: ["weekend", "works"], left: "weekend", right: "/works" },
  { id: "d15", group: "g4", prompt: "The pool and the gym are not both open.", names: ["pool open", "gym open"], left: "pool open", right: "/gym open" },
  { id: "d16", group: "g4", prompt: "None of the refunds are automatic.", names: ["refund", "automatic"], left: "refund", right: "/automatic" },
];

/* -------------------------------- Flashcards ------------------------------- */

export type FlashKind = "indicator" | "group" | "translation" | "contrast";

export interface FlashCard {
  id: string;
  kind: FlashKind;
  /** What the student sees first. */
  front: string;
  /** Step 1 prompt is always diagram; step 2 is always plain English. */
  conditional: string;
  contrapositive: string;
  englishConditional: string;
  englishContrapositive: string;
  note?: string;
}

export const FLASHCARDS: FlashCard[] = [
  {
    id: "f1", kind: "indicator", front: "\u201cIf\u201d \u2014 which side of the arrow does it introduce?",
    conditional: "if X \u2192 Y", contrapositive: "/Y \u2192 /X",
    englishConditional: "If X happens, then Y happens.", englishContrapositive: "If Y does not happen, then X does not happen.",
    note: "Group 1. The indicator introduces the sufficient idea, so it goes left.",
  },
  {
    id: "f2", kind: "indicator", front: "\u201cOnly if\u201d \u2014 which side of the arrow does it introduce?",
    conditional: "X \u2192 Y", contrapositive: "/Y \u2192 /X",
    englishConditional: "X only if Y: if X happens, then Y happens.", englishContrapositive: "If Y does not happen, then X does not happen.",
    note: "Group 2. The idea after the indicator is necessary, so it goes right.",
  },
  {
    id: "f3", kind: "group", front: "Which group does \u201cunless\u201d belong to?",
    conditional: "/X \u2192 Y", contrapositive: "/Y \u2192 X",
    englishConditional: "If X does not happen, then Y happens.", englishContrapositive: "If Y does not happen, then X happens.",
    note: "Group 3. Negate one complete idea and put it on the left; the other stays unchanged on the right.",
  },
  {
    id: "f4", kind: "group", front: "Which group does \u201cnot both\u201d belong to?",
    conditional: "X \u2192 /Y", contrapositive: "Y \u2192 /X",
    englishConditional: "If X is the case, then Y is not the case.", englishContrapositive: "If Y is the case, then X is not the case.",
    note: "Group 4. Keep one idea unchanged on the left and negate the other on the right.",
  },
  {
    id: "f5", kind: "translation", front: "Only members vote.",
    conditional: "vote \u2192 member", contrapositive: "/member \u2192 /vote",
    englishConditional: "If someone votes, then that person is a member.", englishContrapositive: "If someone is not a member, then that person does not vote.",
    note: "Group 2: \u201conly\u201d introduces the necessary idea.",
  },
  {
    id: "f6", kind: "translation", front: "The plant dies without water.",
    conditional: "/water \u2192 dies", contrapositive: "/dies \u2192 water",
    englishConditional: "If the plant does not get water, then the plant dies.", englishContrapositive: "If the plant does not die, then the plant got water.",
    note: "Group 3: negate one complete idea and put it on the left.",
  },
  {
    id: "f7", kind: "translation", front: "No reptiles are warm-blooded.",
    conditional: "reptile \u2192 /warm-blooded", contrapositive: "warm-blooded \u2192 /reptile",
    englishConditional: "If a creature is a reptile, then it is not warm-blooded.", englishContrapositive: "If a creature is warm-blooded, then it is not a reptile.",
    note: "Group 4: keep one idea, negate the other on the right.",
  },
  {
    id: "f8", kind: "translation", front: "All dancers stretch.",
    conditional: "dancer \u2192 stretch", contrapositive: "/stretch \u2192 /dancer",
    englishConditional: "If someone is a dancer, then that person stretches.", englishContrapositive: "If someone does not stretch, then that person is not a dancer.",
    note: "Group 1: \u201call\u201d introduces the sufficient idea.",
  },
  {
    id: "f9", kind: "contrast", front: "\u201cAll runners hydrate\u201d versus \u201cOnly runners hydrate\u201d \u2014 do they diagram the same way?",
    conditional: "runner \u2192 hydrate  /  hydrate \u2192 runner", contrapositive: "/hydrate \u2192 /runner  /  /runner \u2192 /hydrate",
    englishConditional: "If someone is a runner, then that person hydrates. But: if someone hydrates, then that person is a runner.",
    englishContrapositive: "If someone does not hydrate, then that person is not a runner. But: if someone is not a runner, then that person does not hydrate.",
    note: "No. \u201call\u201d is Group 1; \u201conly\u201d is Group 2. They point opposite ways.",
  },
  {
    id: "f10", kind: "contrast", front: "\u201cUnless you pay, you leave\u201d versus \u201cIf you pay, you leave\u201d \u2014 do they diagram the same way?",
    conditional: "/pay \u2192 leave  /  pay \u2192 leave", contrapositive: "/leave \u2192 pay  /  /leave \u2192 /pay",
    englishConditional: "If you do not pay, then you leave. But: if you do pay, then you leave.",
    englishContrapositive: "If you do not leave, then you paid. But: if you do not leave, then you did not pay.",
    note: "No. \u201cunless\u201d is Group 3, so the starting idea is negated first.",
  },
  {
    id: "f11", kind: "translation", front: "Nina will not sign until the terms change.",
    conditional: "/terms change \u2192 /signs", contrapositive: "signs \u2192 terms change",
    englishConditional: "If the terms do not change, then Nina does not sign.", englishContrapositive: "If Nina signs, then the terms changed.",
    note: "Group 3: \u201cuntil\u201d behaves exactly like \u201cunless\u201d.",
  },
  {
    id: "f12", kind: "indicator", front: "\u201crequires\u201d \u2014 which side of the arrow does it introduce?",
    conditional: "funding \u2192 approval", contrapositive: "/approval \u2192 /funding",
    englishConditional: "If there is funding, then there was approval.", englishContrapositive: "If there was no approval, then there is no funding.",
    note: "Group 2: what is required is necessary, so it goes right.",
  },
];

/* ------------------------------- Unless drill ------------------------------ */

export type UnlessPattern = 1 | 2 | 3 | 4;

export const UNLESS_LETTERS = ["A", "B", "C", "D", "P", "Q", "R", "S"];

export interface UnlessRound {
  pattern: UnlessPattern;
  x: string;
  y: string;
}

/** Statement text pieces; "/" marks the slashed letter. */
export function unlessStatement({ pattern, x, y }: UnlessRound): string {
  switch (pattern) {
    case 1: return `/${x}, unless ${y}.`;
    case 2: return `Unless ${y}, ${x}.`;
    case 3: return `Unless /${y}, /${x}.`;
    case 4: return `${x}, unless /${y}.`;
  }
}

/**
 * The two complete ideas as they appear in the statement: `after` is the idea
 * that follows "unless" (with any slash it carries), `other` is the rest.
 */
export function unlessParts({ pattern, x, y }: UnlessRound): { after: string; other: string } {
  switch (pattern) {
    case 1: return { after: y, other: `/${x}` };
    case 2: return { after: y, other: x };
    case 3: return { after: `/${y}`, other: `/${x}` };
    case 4: return { after: `/${y}`, other: x };
  }
}

/**
 * Joshua's answer key: choose either idea, negate it and put it on the left;
 * the other idea goes on the right exactly as written. The key chooses the
 * idea that is not the unless idea; choosing the unless idea gives the contrapositive.
 * (/A, unless B. -> A -> B; Unless B, A. -> /A -> B; Unless /B, /A. -> A -> /B; A, unless /B. -> /A -> /B)
 */
export function unlessAnswer(round: UnlessRound): { left: string; right: string } {
  const { after, other } = unlessParts(round);
  return { left: negateToken(other), right: after };
}

export type UnlessVerdict = "correct" | "no-answer" | "kept-both" | "reversed" | "changed-unless" | "other";

/** Grades a placement. The diagram and its contrapositive both count. */
export function gradeUnless(round: UnlessRound, left: string | null, right: string | null): UnlessVerdict {
  if (!left || !right) return "no-answer";
  const { after, other } = unlessParts(round);
  const is = (l: string, r: string) => left === l && right === r;
  const either = (l: string, r: string) => is(l, r) || is(negateToken(r), negateToken(l));
  if (either(negateToken(other), after)) return "correct";
  if (either(other, after)) return "kept-both";
  if (either(after, negateToken(other))) return "reversed";
  if (either(negateToken(other), negateToken(after))) return "changed-unless";
  return "other";
}

export function negateToken(token: string): string {
  return token.startsWith("/") ? token.slice(1) : `/${token}`;
}

export function contrapositiveOf(left: string, right: string): { left: string; right: string } {
  return { left: negateToken(right), right: negateToken(left) };
}
