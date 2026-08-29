/**
 * Judging one spoken recall.
 *
 * A thin wrapper over the same `activity-coach` edge function every other
 * Activity uses, because the mechanism RRC needs is already there: send a
 * numbered checklist as `ideas`, get back `covered`, the numbers that survived.
 * That path was built for The Press and it is per-detail coverage, which is
 * exactly what a recall is scored on.
 *
 * What this adds is only the translation: a step's details in, the Coach's
 * numbers out.
 */

import { useCallback } from "react";
import { useActivityCoach } from "../hooks/useActivityCoach";
import type { ActivityCoach, ActivityItem } from "../api/types";
import type { RecallStep } from "./session";

export interface RecallJudgement {
  /** The detail numbers that survived, or undefined when nobody judged it. */
  covered?: number[];
  ok: boolean;
  error?: string;
}

export function useRecallCoach() {
  const { judge, judging } = useActivityCoach();

  const judgeRecall = useCallback(
    async (
      step: RecallStep,
      transcript: string,
      coach?: ActivityCoach,
    ): Promise<RecallJudgement> => {
      if (!step.details.length) return { ok: true, covered: [] };

      /**
       * The edge function requires a non-empty `creditedAnswers`, and a chunk
       * has no authored answer: its detail list IS the key. The source text is
       * sent in that slot because it is the honest thing to put there, being
       * literally the content she has to carry.
       *
       * It does not invite verbatim credit. The RRC rubric sent alongside says
       * her own words are required and that equivalent phrasing carries the
       * detail, and RRC reads only `covered` from the reply. The verdict is
       * ignored: a recall is not correct or incorrect, it is a set of details
       * that did or did not survive.
       */
      const asItem: ActivityItem = {
        order: step.index,
        prompt: step.source,
        credited_answers: [step.source],
        explanation: "",
      };

      const result = await judge({
        item: asItem,
        studentResponse: transcript,
        attemptNo: 1,
        coach,
        ideas: step.details.map((d) => ({ n: d.n, text: d.text })),
      });

      return {
        ok: result.ok,
        error: result.error,
        // Absent stays absent. "Nobody judged this" and "nothing survived" are
        // different claims and the app only has grounds for one of them.
        covered: result.verdict?.covered,
      };
    },
    [judge],
  );

  return { judgeRecall, judging };
}
