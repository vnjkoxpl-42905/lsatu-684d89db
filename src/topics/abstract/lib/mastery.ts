import type { MasteryLevel, ModuleProgressRow } from "../types";

// Compute mastery level from a module progress row.
//
// - none: not yet attempted or below 60% on quiz
// - practicing: 60-79% on quiz, OR quiz passed but drill not done
// - solid: 80-94% on quiz AND drill done at any score
// - mastered: 95%+ on quiz AND drill at 80%+
export function computeMastery(row: ModuleProgressRow | undefined): MasteryLevel {
  if (!row) return "none";
  // Module 3 has no quiz. Only authenticated coach judgments count as correct;
  // self-check attempts are saved as unverified and cannot earn mastery.
  if (row.moduleId === "m3") {
    if (!row.drillComplete || row.drillTotal !== 15) return "none";
    const pct = (row.drillCorrect ?? 0) / row.drillTotal;
    if (pct >= 0.95) return "mastered";
    if (pct >= 0.8) return "solid";
    if (pct >= 0.6) return "practicing";
    return "none";
  }
  if (row.quizTotal === 0) return "none";
  const quizPct = row.quizScore / row.quizTotal;
  if (quizPct < 0.6) return "none";

  const drillPct =
    row.drillTotal && row.drillTotal > 0 ? (row.drillCorrect ?? 0) / row.drillTotal : 0;

  if (quizPct >= 0.95 && row.drillComplete && drillPct >= 0.8) return "mastered";
  if (quizPct >= 0.8 && row.drillComplete) return "solid";
  return "practicing";
}
