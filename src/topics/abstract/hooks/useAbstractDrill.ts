import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";
import type { AttemptResult } from "../types";

// useAbstractDrill: lightweight session + persistence wrapper for D1-D5
// (v1.0) and D7-D8 (v1.1). Inlines the { ok, error } pattern from audit F2.2
// since the shared useAttemptPersistence hook does not yet exist (audit F2.5).

export type AbstractDrillId = "d1" | "d2" | "d3" | "d4" | "d5" | "d7" | "d8";

export interface AbstractDrillAttempt {
  drillId: AbstractDrillId;
  questionId: string;
  questionIndex: number;
  correct: boolean;
  selectedAnswer: string | null;
  timeMs: number;
}

export interface UseAbstractDrillResult {
  questionIndex: number;
  total: number;
  correctCount: number;
  attemptedCount: number;
  recordAttempt: (input: AbstractDrillAttempt) => Promise<AttemptResult>;
  next: () => void;
  back: () => void;
  reset: () => void;
}

export function useAbstractDrill<Q>(
  questions: Q[],
  drillId: AbstractDrillAttempt["drillId"],
): UseAbstractDrillResult {
  const { user } = useAuth();
  const { classId } = useClassId();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);

  const total = questions.length;

  const recordAttempt = useCallback(
    async (input: AbstractDrillAttempt): Promise<AttemptResult> => {
      setAttemptedCount((c) => c + 1);
      if (input.correct) setCorrectCount((c) => c + 1);

      if (!user || !classId) {
        // No durable identity yet (logged-out preview). Score locally only.
        return { ok: true };
      }

      const { error } = await supabase.from("attempts").insert({
        class_id: classId,
        user_id: user.id,
        correct: input.correct,
        level: 0,
        mode: `abstract:${input.drillId}`,
        pt: 0,
        qid: input.questionId,
        qnum: input.questionIndex,
        qtype: "abstract",
        section: 0,
        time_ms: input.timeMs,
        selected_answer: input.selectedAnswer,
        timestamp_iso: new Date().toISOString(),
      });

      if (error) {
        toast.error(
          "We could not save your last answer, tap to retry.",
          {
            action: {
              label: "Retry",
              onClick: () => {
                void recordAttempt(input);
              },
            },
          },
        );
        return { ok: false, error };
      }
      return { ok: true };
    },
    [classId, user],
  );

  const next = useCallback(() => {
    setQuestionIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const back = useCallback(() => {
    setQuestionIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setQuestionIndex(0);
    setCorrectCount(0);
    setAttemptedCount(0);
  }, []);

  return useMemo(
    () => ({
      questionIndex,
      total,
      correctCount,
      attemptedCount,
      recordAttempt,
      next,
      back,
      reset,
    }),
    [
      questionIndex,
      total,
      correctCount,
      attemptedCount,
      recordAttempt,
      next,
      back,
      reset,
    ],
  );
}

// Helper: apply the dark-mode drill lifecycle from Drill.tsx:112-120.
// Removes the `light` class on mount, restores it on unmount if it was present.
export function useDrillDarkMode(): void {
  useEffect(() => {
    const root = document.documentElement;
    const wasLight = root.classList.contains("light");
    if (wasLight) root.classList.remove("light");
    return () => {
      if (wasLight) root.classList.add("light");
    };
  }, []);
}
