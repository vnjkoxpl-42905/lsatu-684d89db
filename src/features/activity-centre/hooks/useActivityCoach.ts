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
  /**
   * A numbered checklist to judge coverage against, for drills where WHICH
   * ideas survived is the feedback (The Press). Omit and no coverage comes
   * back, which every other drill wants.
   */
  ideas?: { n: number; text: string }[];
}

export interface JudgeResult {
  ok: boolean;
  verdict?: CoachVerdict;
  error?: string;
}

/**
 * How long a student waits before the Coach is treated as unreachable. Long
 * enough for a slow model call, short enough that nobody sits looking at a
 * spinner wondering whether the page is broken.
 */
const COACH_TIMEOUT_MS = 12_000;

export function useActivityCoach() {
  const [judging, setJudging] = useState(false);

  const judge = useCallback(async ({ item, studentResponse, attemptNo, coach, ideas }: JudgeArgs): Promise<JudgeResult> => {
    setJudging(true);
    // A hung gateway used to leave the textarea disabled and the spinner
    // spinning with no way out: no timeout, no abort, nothing for the student
    // to do but reload and lose the answer. The item now falls through to the
    // Coach-unavailable path, which reveals the credited answer and records the
    // attempt unjudged.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), COACH_TIMEOUT_MS);
    try {
      const { data, error } = await supabase.functions.invoke("activity-coach", {
        signal: abort.signal,
        body: {
          statement: item.prompt,
          studentResponse,
          creditedAnswers: item.credited_answers,
          explanation: item.explanation,
          attemptNo,
          coach,
          category: item.category,
          ideas,
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

      // Coverage is only ever passed through, and only as an array of numbers.
      // Anything else stays undefined so the checklist renders unjudged rather
      // than claiming ticks nobody assigned.
      const covered = Array.isArray(data.covered)
        ? data.covered.filter((n: unknown) => typeof n === "number")
        : undefined;

      return { ok: true, verdict: { verdict: data.verdict, feedback: data.feedback ?? "", covered } };
    } catch (e) {
      if (abort.signal.aborted) {
        console.error("[activity-coach] timed out", { ms: COACH_TIMEOUT_MS });
        return { ok: false, error: "Coach timed out" };
      }
      console.error("[activity-coach] threw", e);
      return { ok: false, error: e instanceof Error ? e.message : "Coach error" };
    } finally {
      clearTimeout(timeout);
      setJudging(false);
    }
  }, []);

  return { judge, judging };
}
