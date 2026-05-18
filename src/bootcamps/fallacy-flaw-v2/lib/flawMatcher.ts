/**
 * flawMatcher — maps Fallacy Bootcamp flaw ids to questions in the LSAT U
 * question bank. We filter for Flaw-type questions, then keyword-match the
 * correct answer choice text (and falling back to the question stem) against
 * each flaw's signature phrasing.
 *
 * Used by FlawDrillLauncher so any flaw card / drill tile can spin up a
 * queue of real LSAT questions tagged with that flaw and open them in the
 * shared LRQuestionModal.
 */
import { questionBank, type LRQuestion } from "@/lib/questionLoader";

type FlawId =
  | "necessary-vs-sufficient"
  | "causal-flaw"
  | "sampling-fallacy"
  | "part-vs-whole"
  | "unproven-vs-proven-false"
  | "ad-hominem"
  | "circular-reasoning"
  | "internal-contradiction"
  | "equivocation"
  | "inappropriate-appeal"
  | "sleight-of-hand"
  | "value-assumption"
  | "sleazy-sales-pitch"
  | "universal-desires-assumption";

/**
 * Keyword signatures for each flaw, matched (case-insensitive) against the
 * correct answer choice text. Designed to be specific enough to avoid
 * cross-firing between flaws.
 */
const FLAW_KEYWORDS: Record<FlawId, string[]> = {
  "necessary-vs-sufficient": [
    "necessary condition",
    "sufficient condition",
    "necessary for",
    "sufficient for",
    "necessary and sufficient",
  ],
  "causal-flaw": [
    "causal",
    "cause",
    "caused",
    "correlation",
    "third factor",
    "coincid",
    "preceded",
  ],
  "sampling-fallacy": [
    "sample",
    "unrepresentative",
    "generaliz",
    "biased",
    "small sample",
    "representative",
  ],
  "part-vs-whole": [
    "part",
    "whole",
    "members",
    "group as a whole",
    "individual members",
    "composition",
    "division",
  ],
  "unproven-vs-proven-false": [
    "lack of evidence",
    "absence of evidence",
    "has not been shown",
    "has not been proven",
    "ignorance",
    "fails to establish",
  ],
  "ad-hominem": [
    "person",
    "character",
    "attacking",
    "ad hominem",
    "source",
    "personal",
    "credibility",
  ],
  "circular-reasoning": [
    "presupposes",
    "presuppose",
    "circular",
    "takes for granted what it sets out to",
    "what it seeks to establish",
    "begs the question",
  ],
  "internal-contradiction": [
    "contradicts",
    "inconsistent",
    "self-contradict",
    "incompatible",
    "contradiction",
  ],
  equivocation: [
    "two different senses",
    "ambiguous",
    "equivocat",
    "different meaning",
    "shifts the meaning",
    "term",
  ],
  "inappropriate-appeal": [
    "appeal to",
    "authority",
    "popularity",
    "emotion",
    "irrelevant authority",
    "questionable authority",
  ],
  "sleight-of-hand": [
    "scope",
    "shifts",
    "substitutes",
    "different topic",
    "narrow",
    "broader",
    "broaden",
    "irrelevant",
  ],
  "value-assumption": [
    "takes for granted",
    "presumes without",
    "value judgment",
    "presumes, without",
    "assumes without",
  ],
  "sleazy-sales-pitch": [
    "false dilemma",
    "only two",
    "either",
    "overlooks the possibility",
    "false choice",
  ],
  "universal-desires-assumption": [
    "everyone",
    "all people",
    "universally",
    "presumes that everyone",
    "people generally",
  ],
};

let cache: Map<string, LRQuestion[]> | null = null;

function buildCache() {
  const map = new Map<string, LRQuestion[]>();
  const flaws = questionBank
    .getAllQuestions()
    .filter((q) => q.qtype === "Flaw");

  for (const flawId of Object.keys(FLAW_KEYWORDS) as FlawId[]) {
    const keywords = FLAW_KEYWORDS[flawId].map((k) => k.toLowerCase());
    const matches: LRQuestion[] = [];
    for (const q of flaws) {
      const correctText = (q.answerChoices?.[q.correctAnswer] ?? "").toLowerCase();
      const stem = (q.stimulus ?? "").toLowerCase();
      const hit = keywords.some(
        (k) => correctText.includes(k) || stem.includes(k),
      );
      if (hit) matches.push(q);
    }
    // Sort by difficulty asc for sensible progression.
    matches.sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3));
    map.set(flawId, matches);
  }
  cache = map;
}

export function getQuestionsForFlaw(flawId: string): LRQuestion[] {
  if (!questionBank.isReady()) return [];
  if (!cache) buildCache();
  return cache!.get(flawId) ?? [];
}

export function getQueueForFlaw(flawId: string, limit = 12): string[] {
  return getQuestionsForFlaw(flawId)
    .slice(0, limit)
    .map((q) => q.qid);
}

/** Total count of all bank-tagged flaw questions across every flaw id. */
export function getTotalFlawQuestionCount(): number {
  if (!questionBank.isReady()) return 0;
  return questionBank.getAllQuestions().filter((q) => q.qtype === "Flaw").length;
}
