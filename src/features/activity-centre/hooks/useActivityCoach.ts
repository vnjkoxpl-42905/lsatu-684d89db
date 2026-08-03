import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityCoach, ActivityItem, CoachVerdict } from "../api/types";

// Calls the activity-coach edge function to judge one free-text response.
// On any failure the error is surfaced (returned + flagged), never swallowed,
// so the caller can toast and fall back to revealing the credited answer.

export interface JudgeArgs {
  item: ActivityItem;
  studentResponse: string;
  attemptNo: number;
  /**
   * This Activity's judging brief. Omitted for legacy Activities authored
   * before per-Activity rubrics existed; the edge function then applies its
   * Negation Station default, which is what those Activities expect.
   */
  coach?: ActivityCoach;
}

export interface JudgeResult {
  ok: boolean;
  verdict?: CoachVerdict;
  error?: string;
}

export function useActivityCoach() {
  const [judging, setJudging] = useState(false);

  const judge = useCallback(async ({ item, studentResponse, attemptNo, coach }: JudgeArgs): Promise<JudgeResult> => {
    setJudging(true);
    try {
      const { data, error } = await supabase.functions.invoke("activity-coach", {
        body: {
          statement: item.prompt,
          studentResponse,
          creditedAnswers: item.credited_answers,
          explanation: item.explanation,
          attemptNo,
          coach,
          category: item.category,
        },
      });

      if (error) {
        const msg = error.message || "Coach unavailable";
        console.error("[activity-coach] invoke failed", error);
        return { ok: false, error: msg };
      }
      if (!data || typeof data.verdict !== "string") {
        console.error("[activity-coach] malformed response", data);
        return { ok: false, error: (data && data.error) || "Coach returned no verdict" };
      }

      return { ok: true, verdict: { verdict: data.verdict, feedback: data.feedback ?? "" } };
    } catch (e) {
      console.error("[activity-coach] threw", e);
      return { ok: false, error: e instanceof Error ? e.message : "Coach error" };
    } finally {
      setJudging(false);
    }
  }, []);

  return { judge, judging };
}
