import { supabase } from "@/integrations/supabase/client";
export type { MeaningDetail, RcAssessment, RcGrade, RcGradeResult, RcGradeItem, RcGradeResponse } from "../../../../../supabase/functions/_shared/rcRecallGrading";
import type { RcGradeResponse } from "../../../../../supabase/functions/_shared/rcRecallGrading";

async function invoke(attemptId: string, recapId?: string): Promise<RcGradeResponse> {
  const { data, error } = await supabase.functions.invoke("rc-recall-grade", { body: { attemptId, ...(recapId ? { recapId } : {}) } });
  if (error) throw new Error("Your recall could not be checked. Your recording is kept. Try again.");
  if (!data || data.attemptId !== attemptId || !Array.isArray(data.items)) throw new Error("Your recall feedback could not be confirmed. Try again.");
  return data as RcGradeResponse;
}
/** Lists existing feedback without calling transcription or judging providers. */
export const fetchRcGrades = (attemptId: string) => invoke(attemptId);
export const getRcGrades = fetchRcGrades;
/** Grades/retries one saved recording; a cached completed grade is returned unchanged. */
export const gradeRcRecap = (attemptId: string, recapId: string) => invoke(attemptId, recapId);
