import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClassId } from "@/hooks/useClassId";
import { questionBank } from "@/lib/questionLoader";
import { localDayISO } from "@/lib/localDate";
import {
  computeStudentAnalytics,
  type AttemptRow,
  type StudentAnalytics,
} from "@/lib/mainhubAnalytics";

export interface StudentStreak {
  current: number;
  longest: number;
  questionsToday: number;
  goal: number;
  goalReached: boolean;
}

export interface StudentAnalyticsResult {
  analytics: StudentAnalytics | null;
  streak: StudentStreak | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Single query surface for the signed-in student's real analytics. Reads only
 * this student's `attempts` (filtered by `class_id`, which equals `user.id`
 * per the auth invariant) plus their streak/daily-goal profile. All numbers
 * are derived from real rows — never mocked — so empty states are truthful.
 */
export function useStudentAnalytics(): StudentAnalyticsResult {
  const { classId, loading: classIdLoading } = useClassId();

  const query = useQuery({
    queryKey: ["student-analytics", classId],
    enabled: !!classId,
    queryFn: async () => {
      const [attemptsRes, profileRes, todayRes] = await Promise.all([
        supabase
          .from("attempts")
          .select("qid, qtype, level, correct, mode, time_ms, timestamp_iso")
          .eq("class_id", classId)
          .order("timestamp_iso", { ascending: true }),
        supabase
          .from("profiles")
          .select("streak_current, longest_streak, daily_goal_questions")
          .eq("class_id", classId)
          .maybeSingle(),
        supabase
          .from("daily_stats")
          .select("questions_answered")
          .eq("class_id", classId)
          .eq("date", localDayISO())
          .maybeSingle(),
      ]);

      if (attemptsRes.error) throw attemptsRes.error;

      const rows = (attemptsRes.data ?? []) as AttemptRow[];
      const analytics = computeStudentAnalytics(rows, (qid) => {
        const q = questionBank.getQuestion(qid);
        if (!q) return undefined;
        return { reasoningType: q.reasoningType, questionFeatures: q.questionFeatures };
      });

      const profile = profileRes.data;
      const goal = profile?.daily_goal_questions ?? 5;
      const questionsToday = todayRes.data?.questions_answered ?? 0;
      const streak: StudentStreak = {
        current: profile?.streak_current ?? 0,
        longest: profile?.longest_streak ?? 0,
        questionsToday,
        goal,
        goalReached: questionsToday >= goal,
      };

      return { analytics, streak };
    },
  });

  return {
    analytics: query.data?.analytics ?? null,
    streak: query.data?.streak ?? null,
    loading: classIdLoading || query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
