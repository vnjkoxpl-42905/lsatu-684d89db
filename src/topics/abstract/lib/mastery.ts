import type { MasteryLevel, ModuleProgressRow } from "../types";

// Compute mastery level from a module progress row.
//
// - none: not yet attempted or below 60% on quiz
// - practicing: 60-79% on quiz, OR quiz passed but drill not done
// - solid: 80-94% on quiz AND drill done at any score
// - mastered: 95%+ on quiz AND drill at 80%+
export function computeMastery(row: ModuleProgressRow | undefined): MasteryLevel {
  if (!row) return "none";
  // Module 3 is an ungraded source exercise. Completion is practice, not proof
  // of correctness; legacy quiz or coach scores cannot grant mastery here.
  if (["m3", "m5", "m6", "m7"].includes(row.moduleId)) return "none";
  if (row.quizTotal === 0) return "none";
  const quizPct = row.quizScore / row.quizTotal;
  if (quizPct < 0.6) return "none";

  const drillPct =
    row.drillTotal && row.drillTotal > 0 ? (row.drillCorrect ?? 0) / row.drillTotal : 0;

  if (quizPct >= 0.95 && row.drillComplete && drillPct >= 0.8) return "mastered";
  if (quizPct >= 0.8 && row.drillComplete) return "solid";
  return "practicing";
}
