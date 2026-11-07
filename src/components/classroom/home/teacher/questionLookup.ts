import {
  parseRcPassageAddress,
  type FinderHit,
} from "@/components/questionfinder/questionFinderSearch";
import type {
  FinderAddressSection,
  FinderAddressTest,
} from "@/components/questionfinder/useFinderAddressIndex";
import { lrAddressLabel, lrQuestionPath, parseLrAddress } from "@/lib/lrQuestionAddress";

/**
 * The pure layer of the Home question lookup: what a typed string means, what the real
 * address index says about it, and where it lands. No React, no fetching.
 *
 * Three readings, in order: nothing typed, a spoken address ("PT151 S4 Q10", "151 4 10",
 * "pt151 s4 q1" while still typing), or a phrase to search question text for.
 */

export interface SpokenAddress {
  pt: number;
  section?: number;
  /** RC passage position, when the teacher named one. */
  pnum?: number;
  /** The question digits exactly as typed, so "1" can still narrow to 1 and 10 to 19. */
  qText?: string;
}

const MARKER_SECTION = "(?:sections?|sec|s)";
const MARKER_QUESTION = "(?:questions?|q|no\\.?|#)";
const SEP = "[\\s,.:/-]";
const SPOKEN = new RegExp(
  `^(?:pt|preptest|practice\\s*test|test)?\\s*[-.]?\\s*(\\d{1,3})` +
    `(?:(?:${SEP}*${MARKER_SECTION}|${SEP}+)\\s*[-.]?\\s*(\\d{1,2})` +
    `(?:(?:${SEP}*${MARKER_QUESTION}|${SEP}+)\\s*[-.]?\\s*(\\d{1,3}))?)?$`,
  "i",
);
/** A marker with nothing after it yet: "pt151 s", "pt151 s4 q". The address so far still stands. */
const DANGLING = new RegExp(`${SEP}*(?:${MARKER_SECTION}|${MARKER_QUESTION}|passage|p)?${SEP}*$`, "i");

export function readSpokenAddress(text: string): SpokenAddress | null {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return null;
  const passage = parseRcPassageAddress(value);
  if (passage?.section !== undefined) {
    return {
      pt: passage.pt,
      section: passage.section,
      pnum: passage.pnum,
      qText: passage.qnum === undefined ? undefined : String(passage.qnum),
    };
  }
  const trimmed = /\d/.test(value) ? value.replace(DANGLING, "") : value;
  const m = trimmed.match(SPOKEN);
  if (!m) return null;
  const spoken: SpokenAddress = { pt: Number(m[1]) };
  if (m[2] !== undefined) spoken.section = Number(m[2]);
  if (m[3] !== undefined) spoken.qText = m[3];
  return spoken;
}

export type SectionKind = "lr" | "rc";

export interface SectionOption {
  section: number;
  kind: SectionKind;
  questions: number;
}

export function sectionOptions(test: FinderAddressTest): SectionOption[] {
  return [...test.sections]
    .sort((a, b) => a.section - b.section)
    .map((s) => {
      const rcCount = s.rc.reduce((sum, p) => sum + p.questions.length, 0);
      return s.lr.length
        ? { section: s.section, kind: "lr" as const, questions: s.lr.length }
        : { section: s.section, kind: "rc" as const, questions: rcCount };
    })
    .filter((s) => s.questions > 0);
}

export interface QuestionOption {
  qnum: number;
  /** RC only: the passage that holds the question, and its internal id for deep linking. */
  passage?: { id: number; position: number };
  questionId?: number;
}

export function questionOptions(
  section: FinderAddressSection,
  pnum?: number,
): QuestionOption[] {
  if (section.lr.length) return section.lr.map((qnum) => ({ qnum }));
  return section.rc
    .filter((p) => pnum === undefined || p.position === pnum)
    .flatMap((p) =>
      p.questions.map((q) => ({
        qnum: q.number,
        passage: { id: p.id, position: p.position },
        questionId: q.id,
      })),
    )
    .sort((a, b) => a.qnum - b.qnum);
}

export interface Landing {
  kind: SectionKind;
  route: string;
  label: string;
  qnum: number;
}

const sectionLabel = (pt: number, section: number, qnum: number) =>
  `PT${pt} · S${section} · Q${qnum}`;

export function landingFor(
  pt: number,
  section: number,
  option: QuestionOption,
): Landing {
  if (option.passage) {
    const params = new URLSearchParams({ passage: String(option.passage.id) });
    if (option.questionId !== undefined) params.set("q", String(option.questionId));
    return {
      kind: "rc",
      route: `/rc/drill?${params.toString()}`,
      label: sectionLabel(pt, section, option.qnum),
      qnum: option.qnum,
    };
  }
  return {
    kind: "lr",
    route: lrQuestionPath({ pt, section, qnum: option.qnum }),
    label: sectionLabel(pt, section, option.qnum),
    qnum: option.qnum,
  };
}

export type Reading =
  | { kind: "empty" }
  | { kind: "phrase"; phrase: string }
  | {
      kind: "address";
      spoken: SpokenAddress;
      /** False while the address index is still loading or could not load. */
      indexed: boolean;
      test?: FinderAddressTest;
      section?: FinderAddressSection;
      sections: SectionOption[];
      /** Question numbers still matching what was typed after the section. */
      numbers: QuestionOption[];
      /** The one exact question, when the typed address names one that exists. */
      landing?: Landing;
      /** Plain words for why nothing resolves, so a typo is never a silent dead end. */
      problem?: string;
    };

export function readQuery(
  text: string,
  tests: FinderAddressTest[],
  indexed: boolean,
): Reading {
  const value = text.trim();
  if (!value) return { kind: "empty" };
  const spoken = readSpokenAddress(value);
  if (!spoken) return value.length >= 2 ? { kind: "phrase", phrase: value } : { kind: "empty" };

  if (!indexed) {
    // No index to consult. A full LR-shaped address still goes straight to its question page.
    const exact =
      spoken.pnum === undefined
        ? parseLrAddress({
            pt: String(spoken.pt),
            section: String(spoken.section),
            qnum: spoken.qText,
          })
        : null;
    const landing = exact
      ? {
          kind: "lr" as const,
          route: lrQuestionPath(exact),
          label: lrAddressLabel(exact),
          qnum: exact.qnum,
        }
      : undefined;
    return { kind: "address", spoken, indexed: false, sections: [], numbers: [], landing };
  }

  const test = tests.find((t) => t.pt === spoken.pt);
  if (!test) {
    return {
      kind: "address",
      spoken,
      indexed: true,
      sections: [],
      numbers: [],
      problem: `PrepTest ${spoken.pt} is not in the question bank.`,
    };
  }
  const sections = sectionOptions(test);
  if (spoken.section === undefined) {
    return { kind: "address", spoken, indexed: true, test, sections, numbers: [] };
  }
  const section = test.sections.find((s) => s.section === spoken.section);
  if (!section || !sections.some((s) => s.section === spoken.section)) {
    return {
      kind: "address",
      spoken,
      indexed: true,
      test,
      sections,
      numbers: [],
      problem: `PT${spoken.pt} has no section ${spoken.section} here.`,
    };
  }
  const all = questionOptions(section, spoken.pnum);
  const typed = spoken.qText;
  const numbers = typed === undefined ? all : all.filter((o) => String(o.qnum).startsWith(typed.replace(/^0+/, "")));
  const exact = typed === undefined ? undefined : all.find((o) => o.qnum === Number(typed));
  const problem =
    typed !== undefined && !numbers.length
      ? `PT${spoken.pt} S${spoken.section} has questions ${all[0]?.qnum}–${all[all.length - 1]?.qnum}.`
      : undefined;
  return {
    kind: "address",
    spoken,
    indexed: true,
    test,
    section,
    sections,
    numbers,
    landing: exact ? landingFor(spoken.pt, spoken.section, exact) : undefined,
    problem,
  };
}

/** The same short address the finder prints on its own result rows. */
export function hitLabel(hit: FinderHit): string {
  return hit.bank === "lr"
    ? sectionLabel(hit.pt, hit.section, hit.qnum)
    : `PT${hit.preptest} · S${hit.section} · P${hit.setNumber}${hit.qnum !== undefined ? ` · Q${hit.qnum}` : ""}`;
}

/* ---------------------------------------------------------------- recents */

export interface RecentQuestion {
  route: string;
  label: string;
  detail?: string;
}

const RECENT_KEY = "lsatu.teacher.recentQuestions";
const RECENT_MAX = 5;

export function loadRecents(): RecentQuestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw
          .filter((r) => r && typeof r.route === "string" && typeof r.label === "string")
          .slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function rememberQuestion(item: RecentQuestion): RecentQuestion[] {
  const next = [item, ...loadRecents().filter((r) => r.route !== item.route)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* Private window or blocked storage: the list just will not persist. */
  }
  return next;
}
