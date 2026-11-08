import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildBreakdown, type AttemptLike, type BreakdownRow } from "@/lib/analyticsBreakdowns";

/**
 * Per-tag numbers for the results-page tag popover: the student's accuracy on
 * that question type or feature, and how often it appears on the test.
 *
 * Same query key and the same `buildBreakdown` as /analytics, so the numbers
 * match that page exactly and the attempts are fetched once for both.
 */
export function useTagStats(bankReady: boolean) {
  const { user } = useAuth();
  const { data: attempts } = useQuery<AttemptLike[]>({
    queryKey: ["analytics:attempts", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("qid, qtype, correct, time_ms")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as AttemptLike[];
    },
  });

  return React.useMemo(() => {
    const map = new Map<string, BreakdownRow>();
    if (!bankReady || !attempts) return map;
    for (const row of buildBreakdown("questionFeature", attempts)) map.set(row.key, row);
    // A question type wins over a feature of the same name.
    for (const row of buildBreakdown("qtype", attempts)) map.set(row.key, row);
    return map;
  }, [attempts, bankReady]);
}
