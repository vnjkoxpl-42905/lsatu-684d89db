import { supabase } from "@/integrations/supabase/client";

export type ChoiceVerdict = "got_it" | "partly" | "missed";
export interface ChoiceJudgment { verdict: ChoiceVerdict; feedback: string }

export function readChoiceJudgment(value: unknown): ChoiceJudgment | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (!["got_it", "partly", "missed"].includes(String(result.verdict))) return null;
  if (typeof result.feedback !== "string" || !result.feedback.trim() || result.feedback.length > 800) return null;
  return { verdict: result.verdict as ChoiceVerdict, feedback: result.feedback.trim() };
}

export async function judgeAnswerChoice(itemId: string, keywords: string[], translation: string): Promise<ChoiceJudgment | null> {
  try {
    const { data, error } = await supabase.functions.invoke("abstract-choice-coach", {
      body: { itemId, keywords, translation },
      signal: AbortSignal.timeout(20000),
    });
    return error ? null : readChoiceJudgment(data);
  } catch {
    return null;
  }
}
