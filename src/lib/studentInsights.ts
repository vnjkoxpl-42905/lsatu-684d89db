import { supabase } from "@/integrations/supabase/client";
import { breakdownKeysFor, type BreakdownKind } from "@/lib/analyticsBreakdowns";
import { isReleasedAnswer, orderedDistinctAnswers, type GradedQuestionAnswer } from "@/lib/firstAnswerProgress";
import { questionBank } from "@/lib/questionLoader";
import type { RcQuestionIndexEntry } from "@/features/rc/lib/rcTypes";
import type { SittingKind } from "@/lib/studentAnalytics";

export type InsightAnswer = GradedQuestionAnswer & { correct: boolean };
export type InsightDimension = Exclude<BreakdownKind, "wrongByQtype"> | "wrongAnswers";

export function answersInScope(
  answers: GradedQuestionAnswer[],
  include: Record<SittingKind, boolean>,
  since: string | null,
  asOf: string,
): InsightAnswer[] {
  const seen = new Set<string>();
  const start = since ? Date.parse(since) : -Infinity;
  const end = Date.parse(asOf);
  return orderedDistinctAnswers(answers).filter((answer): answer is InsightAnswer => {
    if (seen.has(answer.questionKey)) return false;
    seen.add(answer.questionKey);
    const kind = answer.mode === "practice-test" ? "preptest"
      : answer.mode === "timed-section" ? "section" : "drill";
    const date = Date.parse(answer.gradedAt);
    return include[kind] && date >= start && date <= end && isReleasedAnswer(answer);
  });
}

function lrQuestion(answer: InsightAnswer) {
  return answer.area === "LR" ? questionBank.getQuestion(answer.questionKey.slice(3)) : undefined;
}

function rcQuestion(answer: InsightAnswer, index: ReadonlyMap<number, RcQuestionIndexEntry>) {
  const source = answer.provenance;
  if (source?.kind !== "rc-session") return undefined;
  const question = index.get(source.questionId);
  return question?.passageId === source.passageId ? question : undefined;
}

export function evidenceQuestion(answer: InsightAnswer, index: ReadonlyMap<number, RcQuestionIndexEntry>) {
  const lr = lrQuestion(answer);
  const rc = rcQuestion(answer, index);
  return {
    label: lr ? `PT${lr.pt}.S${lr.section}.Q${lr.qnum}`
      : rc ? `PT${rc.preptest}.S${rc.section}.Q${rc.position}` : answer.questionKey.slice(3),
    prompt: lr?.questionStem ?? rc?.prompt,
    stimulus: lr?.stimulus,
    choices: lr?.answerChoices,
    picked: answer.selectedAnswer,
    correct: lr?.correctAnswer,
  };
}

export interface InsightRow {
  label: string;
  answers: InsightAnswer[];
  misses: InsightAnswer[];
  averageTime: number | null;
  timedCount: number;
}

export function breakdownInsights(
  answers: InsightAnswer[],
  dimension: InsightDimension,
  index: ReadonlyMap<number, RcQuestionIndexEntry>,
  traps: ReadonlyMap<string, string>,
) {
  const groups = new Map<string, InsightAnswer[]>();
  let matched = 0;
  for (const answer of answers) {
    if (dimension === "wrongAnswers" && answer.correct) continue;
    const lr = lrQuestion(answer);
    const rc = rcQuestion(answer, index);
    let labels: string[] = [];
    if (dimension === "wrongAnswers") {
      const trap = traps.get(answer.attemptId);
      if (trap) labels = [trap];
    } else if (lr) {
      labels = breakdownKeysFor(dimension, lr);
    } else if (rc) {
      if (dimension === "qtype" && rc.questionType) labels = [rc.questionType];
      if (dimension === "questionFeature") labels = rc.features;
      if (dimension === "difficulty" && rc.difficulty && rc.difficulty > 0) labels = [String(rc.difficulty)];
    }
    if (dimension === "qtype" && labels.length === 0 && answer.topic && answer.topic !== "Unknown") {
      labels = [answer.topic];
    }
    if (labels.length) matched++;
    for (const label of new Set(labels)) {
      const name = dimension === "difficulty" ? `Level ${label}` : label;
      const group = groups.get(name) ?? [];
      group.push(answer);
      groups.set(name, group);
    }
  }
  const rows: InsightRow[] = Array.from(groups, ([label, group]) => {
    const timed = group.flatMap(({ timeMs }) => typeof timeMs === "number" && Number.isFinite(timeMs) && timeMs > 0 ? [timeMs] : []);
    return {
      label,
      answers: group,
      misses: group.filter((answer) => !answer.correct),
      averageTime: timed.length ? timed.reduce((sum, time) => sum + time, 0) / timed.length : null,
      timedCount: timed.length,
    };
  });
  rows.sort((a, b) => dimension === "difficulty"
    ? a.label.localeCompare(b.label, undefined, { numeric: true })
    : b.misses.length - a.misses.length || b.answers.length - a.answers.length || a.label.localeCompare(b.label));
  return { rows, matched };
}

export async function loadInsightTraps(answers: InsightAnswer[]) {
  const eligible = answers.flatMap((answer) => {
    if (answer.correct || !answer.selectedAnswer) return [];
    const question = lrQuestion(answer);
    return question ? [{ answer, question }] : [];
  });
  const preptests = [...new Set(eligible.map(({ question }) => question.pt))];
  const byAddress = new Map<string, string>();
  for (let offset = 0; offset < preptests.length; offset += 5) {
    const { data, error } = await supabase.from("lr_questions")
      .select("preptest,section,question_number,lr_answer_choices(letter,tag)")
      .in("preptest", preptests.slice(offset, offset + 5));
    if (error) throw error;
    for (const row of data ?? []) {
      for (const choice of row.lr_answer_choices ?? []) {
        if (choice.tag?.trim()) {
          byAddress.set(`${row.preptest}:${row.section}:${row.question_number}:${choice.letter}`, choice.tag.trim());
        }
      }
    }
  }
  const traps = new Map<string, string>();
  for (const { answer, question } of eligible) {
    const tag = byAddress.get(`${question.pt}:${question.section}:${question.qnum}:${answer.selectedAnswer?.trim().toUpperCase()}`);
    if (tag) traps.set(answer.attemptId, tag);
  }
  return traps;
}
