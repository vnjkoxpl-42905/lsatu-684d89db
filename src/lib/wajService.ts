import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface WAJHistoryItem {
  attempt_at_iso: string;
  result: 0 | 1; // 0=wrong, 1=right
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
  review?: {
    q1: string; // why I chose the wrong answer
    q2: string; // why I eliminated the right answer
    q3: string; // plan to avoid it next time
  };
}

export interface WAJEntry {
  id: string;
  class_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  first_wrong_at_iso: string;
  last_status: 'wrong' | 'right';
  revisit_count: number;
  history_json: WAJHistoryItem[];
  created_at: string;
  updated_at: string;
}

export async function logWrongAnswer(params: {
  class_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
  review?: {
    q1: string;
    q2: string;
    q3: string;
  };
}) {
  const historyItem: WAJHistoryItem = {
    attempt_at_iso: new Date().toISOString(),
    result: 0,
    chosen_answer: params.chosen_answer,
    correct_answer: params.correct_answer,
    time_ms: params.time_ms,
    confidence_1_5: params.confidence_1_5,
    review: params.review,
  };

  // Atomic insert-or-append (append_waj_wrong): a single ON CONFLICT upsert so two
  // concurrent attempts on the same question can't drop a history item, and a read
  // failure can no longer misroute into a duplicate insert. Throw on error so a
  // failed journal write is never silent.
  const { error } = await supabase.rpc('append_waj_wrong', {
    p_class_id: params.class_id,
    p_qid: params.qid,
    p_item: historyItem as unknown as Json,
    p_pt: params.pt,
    p_section: params.section,
    p_qnum: params.qnum,
    p_qtype: params.qtype,
    p_level: params.level,
  });

  if (error) throw error;
}

/**
 * Ensure a wrong_answer_journal entry exists for a question the student
 * flagged for review — regardless of whether they got it right, wrong, or
 * haven't answered. This is the flag -> journal bridge: flagging surfaces a
 * question in the Wrong Answer Journal even when it wasn't missed.
 *
 * No-op if an entry already exists (e.g. auto-logged as a miss) so existing
 * attempt history is never disturbed. When the current attempt is known, it
 * seeds one history item + last_status from it; otherwise it creates a neutral
 * entry (last_status 'right') that the student re-rates in the journal.
 */
export async function ensureJournalEntry(params: {
  class_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  chosen_answer?: string | null;
  correct_answer?: string | null;
  time_ms?: number | null;
  confidence_1_5?: number | null;
}): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('wrong_answer_journal')
    .select('id')
    .eq('class_id', params.class_id)
    .eq('qid', params.qid)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return; // already journaled — leave history untouched

  const answered = !!params.chosen_answer && !!params.correct_answer;
  const isRight = answered ? params.chosen_answer === params.correct_answer : true;
  const history: WAJHistoryItem[] = answered
    ? [
        {
          attempt_at_iso: new Date().toISOString(),
          result: isRight ? 1 : 0,
          chosen_answer: params.chosen_answer as string,
          correct_answer: params.correct_answer as string,
          time_ms: params.time_ms ?? 0,
          confidence_1_5: params.confidence_1_5 ?? null,
        },
      ]
    : [];

  const { error } = await supabase.from('wrong_answer_journal').insert({
    class_id: params.class_id,
    qid: params.qid,
    pt: params.pt,
    section: params.section,
    qnum: params.qnum,
    qtype: params.qtype,
    level: params.level,
    first_wrong_at_iso: new Date().toISOString(),
    last_status: isRight ? 'right' : 'wrong',
    revisit_count: 0,
    history_json: history as unknown as Json,
  });

  // Ignore unique-constraint races (a parallel auto-log won).
  if (error && error.code !== '23505') throw error;
}

export async function logCorrectAnswer(params: {
  class_id: string;
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  chosen_answer: string;
  correct_answer: string;
  time_ms: number;
  confidence_1_5: number | null;
}) {
  // Atomic append-if-exists (append_waj_correct): update-only, so no row is
  // created when the student never missed this question, matching prior behavior.
  // The append is a single statement, so a concurrent write can't drop an item.
  const historyItem: WAJHistoryItem = {
    attempt_at_iso: new Date().toISOString(),
    result: 1,
    chosen_answer: params.chosen_answer,
    correct_answer: params.correct_answer,
    time_ms: params.time_ms,
    confidence_1_5: params.confidence_1_5,
  };

  const { error } = await supabase.rpc('append_waj_correct', {
    p_class_id: params.class_id,
    p_qid: params.qid,
    p_item: historyItem as unknown as Json,
  });

  if (error) throw error;
}

export async function getWAJEntries(class_id: string, filters?: {
  qtype?: string;
  level?: number;
  pt?: number;
  last_status?: 'wrong' | 'right';
}) {
  let query: any = supabase
    .from('wrong_answer_journal')
    .select('*')
    .eq('class_id', class_id)
    .order('first_wrong_at_iso', { ascending: false });

  if (filters?.qtype) {
    query = query.eq('qtype', filters.qtype);
  }
  if (filters?.level) {
    query = query.eq('level', filters.level);
  }
  if (filters?.pt) {
    query = query.eq('pt', filters.pt);
  }
  if (filters?.last_status) {
    query = query.eq('last_status', filters.last_status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as WAJEntry[];
}
