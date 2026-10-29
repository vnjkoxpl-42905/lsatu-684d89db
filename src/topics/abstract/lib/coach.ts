import type { AbstractChoice } from "../types";

// Templated coach feedback for v1.
//
// No live LLM. Pure rule-based functions return { verdict, message,
// idealTranslation } so TranslatorWorkspace and the Decode Gauntlet item
// overlays can surface coaching without an Anthropic round-trip.
//
// Anthropic-backed coach feedback is deferred to v2.1 per
// _BUILD_SPEC_v2.0.md Section "Locked decisions" #2.

export type CoachVerdict = "match" | "partial" | "miss";

export interface CoachFeedback {
  verdict: CoachVerdict;
  message: string;
  idealTranslation: string;
}

// Score the overlap between the student's translation and the ideal
// translation as a 0..1 token-overlap rate, weighted toward keyword hits.
function scoreOverlap(student: string, ideal: string, keywords: string[]): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const studentTokens = new Set(norm(student));
  const idealTokens = norm(ideal);
  const keywordTokens = keywords.flatMap(norm);
  if (idealTokens.length === 0) return 0;

  let hits = 0;
  for (const token of idealTokens) {
    if (studentTokens.has(token)) hits += 1;
  }
  let keywordHits = 0;
  for (const token of keywordTokens) {
    if (studentTokens.has(token)) keywordHits += 1;
  }
  const idealRate = hits / idealTokens.length;
  const keywordRate = keywordTokens.length > 0 ? keywordHits / keywordTokens.length : 0;
  return 0.6 * idealRate + 0.4 * keywordRate;
}

export function getTranslationFeedback(
  studentText: string,
  idealTranslation: string,
  keywords: string[],
): CoachFeedback {
  const trimmed = studentText.trim();
  if (trimmed.length < 8) {
    return {
      verdict: "miss",
      message: "Your translation is too short. Decode each keyword into its LSAT meaning first, then write a full plain-English version.",
      idealTranslation,
    };
  }
  const score = scoreOverlap(trimmed, idealTranslation, keywords);
  if (score >= 0.55) {
    return {
      verdict: "match",
      message: "Strong match. Your translation captures the load-bearing keywords and the structural shape of the original.",
      idealTranslation,
    };
  }
  if (score >= 0.3) {
    return {
      verdict: "partial",
      message: "Partial match. You got some keywords but missed others. Compare against the ideal translation and notice which structural words you dropped.",
      idealTranslation,
    };
  }
  return {
    verdict: "miss",
    message: "Significant gap. The keywords in your translation do not align with the LSAT meaning of the original. Run the Decode method step by step.",
    idealTranslation,
  };
}

export interface GauntletPicks {
  keywordsPicked: string[];
  translationText: string;
  requirementsChecked: number[];
}

export interface GauntletCoachNote {
  verdict: CoachVerdict;
  keywordsMessage: string;
  translationMessage: string;
  requirementsMessage: string;
  staticCoachNote: string;
}

export function getGauntletItemFeedback(
  item: AbstractChoice,
  picks: GauntletPicks,
): GauntletCoachNote {
  const correctKwSet = new Set(item.correctKeywords.map((k) => k.toLowerCase()));
  const distractorKwSet = new Set(item.distractorKeywords.map((k) => k.toLowerCase()));
  const picked = picks.keywordsPicked.map((k) => k.toLowerCase());

  const correctHits = picked.filter((k) => correctKwSet.has(k)).length;
  const distractorHits = picked.filter((k) => distractorKwSet.has(k)).length;

  let keywordsMessage: string;
  if (correctHits === correctKwSet.size && distractorHits === 0) {
    keywordsMessage = "You picked every load-bearing keyword and avoided the distractors. Clean strip-down.";
  } else if (distractorHits > 0) {
    keywordsMessage = `You picked ${distractorHits} distractor keyword(s). Distractors look like keywords but do not do structural work; re-read each pick and ask whether the stimulus must satisfy that word.`;
  } else {
    keywordsMessage = `You picked ${correctHits} of ${correctKwSet.size} load-bearing keywords. Re-scan for the words that change the structural meaning if removed.`;
  }

  const translationFb = getTranslationFeedback(
    picks.translationText,
    item.plainEnglish,
    item.correctKeywords,
  );

  const totalReqs = item.stimulusRequirements.length;
  const checkedReqs = picks.requirementsChecked.length;
  let requirementsMessage: string;
  if (checkedReqs === totalReqs) {
    requirementsMessage = "You confirmed every requirement. The choice can only be correct if the stimulus matches all of these.";
  } else {
    requirementsMessage = `You confirmed ${checkedReqs} of ${totalReqs} requirements. Each requirement must hold for the choice to be correct. Re-read the stimulus and check the ones you skipped.`;
  }

  const overallVerdict: CoachVerdict =
    correctHits === correctKwSet.size &&
    distractorHits === 0 &&
    checkedReqs === totalReqs &&
    translationFb.verdict === "match"
      ? "match"
      : translationFb.verdict === "miss" || correctHits === 0
        ? "miss"
        : "partial";

  return {
    verdict: overallVerdict,
    keywordsMessage,
    translationMessage: translationFb.message,
    requirementsMessage,
    staticCoachNote: item.coachNote,
  };
}
