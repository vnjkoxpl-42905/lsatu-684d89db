import * as authored from "@/bootcamps/main-conclusion/content/drills.source";
import {
  adaptChainQuestion, adaptFamilyQuestion, adaptFirstSentenceQuestion,
  adaptIndicatorQuestion, adaptNestedQuestion, adaptXRayQuestion,
} from "@/bootcamps/main-conclusion/components/interactive-drills/adapters";
import type { InteractiveDrillItem } from "@/bootcamps/main-conclusion/components/interactive-drills/types";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ReviewQueueItem } from "./reviewQueueModel";

export type IntroLrAttempt = Database["public"]["Tables"]["intro_lr_attempts"]["Row"];

const authoredItems: InteractiveDrillItem[] = [
  ...[
  authored.DRILL_3_1_STAGE_1, authored.DRILL_3_1_STAGE_2, authored.DRILL_3_1_STAGE_3, authored.DRILL_3_1_STAGE_4,
  ].flatMap((questions) => questions.map(adaptIndicatorQuestion)),
  ...[authored.DRILL_3_2_STAGE_1, authored.DRILL_3_2_STAGE_2, authored.DRILL_3_2_STAGE_3, authored.DRILL_3_2_STAGE_4]
    .flatMap((questions) => questions.map(adaptXRayQuestion)),
  ...[authored.DRILL_3_3_STAGE_1, authored.DRILL_3_3_STAGE_2, authored.DRILL_3_3_STAGE_3, authored.DRILL_3_3_STAGE_4]
    .flatMap((questions) => questions.map(adaptFirstSentenceQuestion)),
  ...[authored.DRILL_3_4_STAGE_1, authored.DRILL_3_4_STAGE_2, authored.DRILL_3_4_STAGE_3, authored.DRILL_3_4_STAGE_4]
    .flatMap((questions) => questions.map(adaptFamilyQuestion)),
  ...authored.DRILL_3_5_QUESTIONS.map(adaptChainQuestion),
  ...authored.DRILL_3_7_QUESTIONS.map((question): InteractiveDrillItem => ({
    id: question.id,
    mode: "pronoun_replacement",
    title: "Pronoun Replacement",
    prompt: "Replace the vague phrase with its antecedent.",
    payload: question,
  })),
  ...authored.DRILL_3_9_QUESTIONS.map(adaptNestedQuestion),
];

const byId = new Map(authoredItems.map((item) => [item.id, item]));

export function getAuthoredIntroLrQuestion(questionId: string): InteractiveDrillItem | null {
  return byId.get(questionId) ?? null;
}

export function buildIntroLrReviewQueue(attempts: IntroLrAttempt[]): ReviewQueueItem[] {
  return attempts.flatMap((row) => {
    if (row.correct !== false || !getAuthoredIntroLrQuestion(row.question_id)) return [];
    const question = getAuthoredIntroLrQuestion(row.question_id)!;
    return [{
      key: `intro-lr:${row.id}`, area: "lr" as const, qid: row.question_id,
      label: `Intro to LR · ${question.title} · ${row.question_id}`,
      qtype: question.title, reasons: ["missed" as const], sources: ["intro_lr_attempts" as const],
      firstAnswer: row.selected_answer, latestAnswer: row.selected_answer, correctAnswer: null,
      firstMissAt: row.created_at, lastActivityAt: row.created_at,
      reflection: null, flaggedNote: null,
      href: `/review/intro-lr/${encodeURIComponent(row.id)}`,
      actionLabel: "Review attempt",
    }];
  }).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export async function loadIntroLrReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
  const rows: IntroLrAttempt[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("intro_lr_attempts")
      .select("*").eq("user_id", userId).eq("correct", false)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return buildIntroLrReviewQueue(rows);
}

export async function fetchOwnedIntroLrAttempt(userId: string, attemptId: string): Promise<IntroLrAttempt | null> {
  const { data, error } = await supabase.from("intro_lr_attempts")
    .select("*").eq("id", attemptId).eq("user_id", userId).eq("correct", false).maybeSingle();
  if (error) throw error;
  return data && getAuthoredIntroLrQuestion(data.question_id) ? data : null;
}
