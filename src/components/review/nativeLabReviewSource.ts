import { supabase } from '@/integrations/supabase/client';
import { ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS, CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/conclusionTypeQuestions';
import type { NativeLabKind } from '@/bootcamps/main-conclusion/lib/nativeLabAttempt';
import type { ReviewQueueItem } from './reviewQueueModel';
import type { IntroLrAttempt } from './introLrReviewSource';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const producer = new RegExp(`^native-lab:(main-conclusion|structure|conclusion-type):(${uuid})$`, 'i');
export function nativeLabQuestion(kind: NativeLabKind, id: string) {
  if (kind === 'conclusion-type') {
    const q = ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS.find(item => item.id === id);
    return q ? { title: 'Conclusion Type Lab', stimulus: q.stimulus, options: ['recommendation', 'causal', 'prediction', 'judgment', 'rebuttal'], answer: q.answer, explanation: q.explanation } : null;
  }
  const questions = kind === 'main-conclusion' ? ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS : CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS.flatMap(stage => stage.questions);
  const q = questions.find(item => item.id === id);
  return q ? { title: kind === 'main-conclusion' ? 'Main Conclusion Lab' : 'First-Sentence vs Rebuttal Lab', stimulus: q.stimulus,
    options: kind === 'main-conclusion' ? q.chunks : ['first-sentence', 'rebuttal'],
    answer: kind === 'main-conclusion' ? String(q.correctMainConclusionIndex) : q.structureType === 'rebuttal' ? 'rebuttal' : 'first-sentence',
    explanation: q.revealExplanation || q.hint } : null;
}
export function parseNativeLabAttempt(row: IntroLrAttempt, owner: string) {
  const match = producer.exec(row.drill_id);
  if (!match || row.mode !== 'native_lab_v1') throw new Error('Unsupported native lab attempt.');
  const kind = match[1] as NativeLabKind;
  const question = nativeLabQuestion(kind, row.question_id);
  if (!question || row.user_id !== owner || row.correct !== false || !Number.isFinite(Date.parse(row.created_at))) throw new Error('Native lab attempt is unavailable.');
  let answer: unknown;
  try { answer = JSON.parse(row.selected_answer ?? 'null'); } catch { throw new Error('Invalid native lab saved answer.'); }
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('Invalid native lab saved answer.');
  const payload = answer as Record<string, unknown>;
  if (typeof payload.answer !== 'string' || !Number.isSafeInteger(payload.ordinal) || Number(payload.ordinal) < 1 || payload.run_id !== match[2]) throw new Error('Invalid native lab submission identity.');
  const value = payload.answer;
  if (kind === 'main-conclusion' ? !/^(0|[1-9]\d*)$/.test(value) || Number(value) >= question.options.length : !question.options.includes(value)) throw new Error('Invalid native lab choice.');
  return { row, kind, runId: match[2], question, answer: value, ordinal: Number(payload.ordinal) };
}
export type NativeLabReviewAttempt = ReturnType<typeof parseNativeLabAttempt>;
export function nativeLabQueueItem(attempt: NativeLabReviewAttempt): ReviewQueueItem {
  const answer = attempt.kind === 'main-conclusion' ? attempt.question.options[Number(attempt.answer)] : attempt.answer;
  return { key: `native-lab:${attempt.row.id}`, area: 'lr', qid: attempt.row.question_id,
    label: `${attempt.question.title} · ${attempt.row.question_id} · Submission ${attempt.ordinal}`,
    qtype: attempt.question.title, reasons: ['missed'], sources: ['native_lab_attempts'], firstAnswer: attempt.ordinal === 1 ? answer : null,
    latestAnswer: answer, correctAnswer: null, firstMissAt: attempt.row.created_at, lastActivityAt: attempt.row.created_at,
    reflection: null, flaggedNote: null, href: `/review/native-lab/${encodeURIComponent(attempt.row.id)}` };
}
export async function loadNativeLabReview(owner: string): Promise<ReviewQueueItem[]> {
  const items: ReviewQueueItem[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('intro_lr_attempts').select('*').eq('user_id', owner).eq('correct', false)
      .eq('mode', 'native_lab_v1').like('drill_id', 'native-lab:%').order('id').range(offset, offset + 499);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Native lab saved attempts returned an invalid response.');
    items.push(...data.map(row => nativeLabQueueItem(parseNativeLabAttempt(row, owner))));
    if (data.length < 500) return items;
  }
}
export async function fetchOwnedNativeLabAttempt(owner: string, id: string): Promise<NativeLabReviewAttempt | null> {
  const { data, error } = await supabase.from('intro_lr_attempts').select('*').eq('user_id', owner).eq('id', id).eq('correct', false).eq('mode', 'native_lab_v1').maybeSingle();
  if (error) throw error;
  return data ? parseNativeLabAttempt(data, owner) : null;
}
