import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** One question's identity in the LR source tables. */
export interface PopularityKey {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
}

/** qid -> letter -> percent of students who picked it. Missing means no data. */
export type PopularityMap = Record<string, Record<string, number>>;

/**
 * Answer popularity for a whole drill in two queries, for the results table.
 * The numbers are the source's `student_percent`; nothing is computed or
 * guessed, and a question without them simply has no entry.
 */
export async function fetchAnswerPopularity(keys: PopularityKey[]): Promise<PopularityMap> {
  if (keys.length === 0) return {};
  const pts = [...new Set(keys.map((k) => k.pt))];
  const { data: questions, error } = await supabase
    .from('lr_questions')
    .select('id, preptest, section, question_number')
    .in('preptest', pts);
  if (error) throw error;
  const idToQid = new Map<string, string>();
  for (const k of keys) {
    const row = questions?.find((q) => q.preptest === k.pt && q.section === k.section && q.question_number === k.qnum);
    if (row) idToQid.set(row.id, k.qid);
  }
  if (idToQid.size === 0) return {};
  const { data: choices, error: cErr } = await supabase
    .from('lr_answer_choices')
    .select('question_id, letter, student_percent')
    .in('question_id', [...idToQid.keys()]);
  if (cErr) throw cErr;
  const out: PopularityMap = {};
  for (const c of choices ?? []) {
    const qid = idToQid.get(c.question_id);
    if (!qid || c.student_percent == null) continue;
    (out[qid] ??= {})[c.letter] = Number(c.student_percent);
  }
  return out;
}

export function useAnswerPopularity(keys: PopularityKey[]) {
  return useQuery({
    queryKey: ['answer-popularity', keys.map((k) => k.qid).join(',')],
    queryFn: () => fetchAnswerPopularity(keys),
    enabled: keys.length > 0,
    staleTime: 60 * 60 * 1000,
  });
}
