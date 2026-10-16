import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InspectAxis = "functional" | "content" | "pedagogy" | "completeness";
export type InspectLevel = "high" | "medium" | "low";

export interface InspectFinding {
  axis: InspectAxis;
  severity: InspectLevel;
  location: string;
  issue: string;
  suggestedFix: string;
  confidence: InspectLevel;
}

export interface InspectReport {
  summary: string;
  unitsExamined: string[];
  findings: InspectFinding[];
  /** Set when the model answered in prose without a structured report. */
  unstructured?: boolean;
}

export interface InspectInput {
  target?: string;
  question?: string;
}

/**
 * Calls the admin-only `inspect` edge function (agentic auditor). Read-only:
 * the function can never modify code or data. Returns a structured report.
 */
export function useInspector() {
  return useMutation<InspectReport, Error, InspectInput>({
    mutationFn: async ({ target, question }) => {
      if (!target?.trim() && !question?.trim()) {
        throw new Error("Give a target or a question to inspect.");
      }
      const { data, error } = await supabase.functions.invoke("inspect", {
        body: { target, question },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as InspectReport;
    },
  });
}
