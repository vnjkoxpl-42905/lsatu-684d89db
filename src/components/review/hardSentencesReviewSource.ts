import { supabase } from '@/integrations/supabase/client';
import { HS_DRILL_ID, HS_DRILL_ITEMS, type ClusterItem } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { M5_CAPSTONE, type CapstoneItem } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
import type { ReviewQueueItem } from './reviewQueueModel';

export type HardSentencesAttempt = {
  kind: 'cluster'; key: string; answer: string | null; at: string; item: ClusterItem;
} | {
  kind: 'capstone'; key: string; answer: string; at: string; item: CapstoneItem;
};
export interface HardSentencesReviewResult { items: ReviewQueueItem[]; unavailable: string[] }
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function parseHardSentencesCluster(raw: unknown, userId: string): HardSentencesAttempt | null {
  if (!object(raw) || raw.drill_id !== HS_DRILL_ID || raw.mode !== 'cluster_decomposition') return null;
  const item = HS_DRILL_ITEMS.find(candidate => candidate.id === raw.question_id);
  if (!item) throw new Error('Saved Hard Sentences cluster wording is unavailable.');
  if (raw.user_id !== userId || typeof raw.id !== 'string' || !date(raw.created_at) || typeof raw.correct !== 'boolean'
    || !(raw.selected_answer === null || typeof raw.selected_answer === 'string')) throw new Error('Invalid saved Hard Sentences cluster attempt.');
  if (raw.correct) return null;
  return { kind: 'cluster', key: raw.id, answer: typeof raw.selected_answer === 'string' ? raw.selected_answer : null, at: raw.created_at, item };
}

export function parseHardSentencesCapstone(raw: unknown, key: string, userId: string): HardSentencesAttempt | null {
  if (!object(raw) || raw.calibration_module !== 'M5') return null;
  const item = M5_CAPSTONE.find(candidate => candidate.id === raw.item_id);
  if (!item) {
    if (typeof raw.item_id === 'string' && raw.item_id.startsWith('MC-HS-CAP-')) throw new Error('Saved Hard Sentences capstone wording is unavailable.');
    return null;
  }
  if (raw.user_id !== userId || raw.calibration_only !== true || typeof raw.correct !== 'boolean' || !date(raw.attempted_at)
    || typeof raw.picked !== 'string' || !item.choices.some(choice => choice.letter === raw.picked)) throw new Error('Invalid saved Hard Sentences capstone attempt.');
  if (raw.correct) return null;
  // Older producers used distinct envelope and payload UUIDs. The envelope is the exact fetch key.
  return { kind: 'capstone', key, answer: raw.picked, at: raw.attempted_at, item };
}

export function hardSentencesQueueItem(attempt: HardSentencesAttempt): ReviewQueueItem {
  return {
    key: `hard-sentences:${attempt.kind}:${attempt.key}`, area: 'lr', qid: attempt.item.id,
    label: `Hard Sentences · ${attempt.kind === 'cluster' ? 'Cluster drill' : 'Capstone'} · ${attempt.item.id}`,
    qtype: attempt.kind === 'cluster' ? 'Cluster decomposition' : 'Cluster decomposition capstone', reasons: ['missed'], sources: ['hard_sentences'],
    firstAnswer: null, latestAnswer: attempt.answer, correctAnswer: null,
    firstMissAt: attempt.at, lastActivityAt: attempt.at, reflection: null, flaggedNote: null,
    href: `/review/hard-sentences/${attempt.kind}/${encodeURIComponent(attempt.key)}`, actionLabel: 'Review saved attempt',
  };
}

async function loadCluster(userId: string): Promise<HardSentencesReviewResult> {
  const items: ReviewQueueItem[] = [];
  let unavailableCount = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('intro_lr_attempts').select('*').eq('user_id', userId)
      .eq('drill_id', HS_DRILL_ID).eq('correct', false).order('id').range(offset, offset + 499);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Hard Sentences cluster source returned an invalid response.');
    for (const raw of data) {
      try { const attempt = parseHardSentencesCluster(raw, userId); if (attempt) items.push(hardSentencesQueueItem(attempt)); }
      catch { unavailableCount++; }
    }
    if (data.length < 500) return { items, unavailable: unavailableCount ? [`${unavailableCount} Hard Sentences cluster submissions unavailable`] : [] };
  }
}

async function loadCapstone(userId: string): Promise<HardSentencesReviewResult> {
  const items: ReviewQueueItem[] = [];
  let unavailableCount = 0;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('bootcamp_kv').select('record_id,data').eq('user_id', userId)
      .eq('table_name', 'calibration_attempts').order('record_id').range(offset, offset + 499);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Hard Sentences capstone source returned an invalid response.');
    for (const row of data) {
      try {
        if (!row || typeof row.record_id !== 'string') throw new Error('Invalid saved capstone envelope.');
        const attempt = parseHardSentencesCapstone(row.data, row.record_id, userId);
        if (attempt) items.push(hardSentencesQueueItem(attempt));
      } catch { unavailableCount++; }
    }
    if (data.length < 500) return { items, unavailable: unavailableCount ? [`${unavailableCount} Hard Sentences capstone submissions unavailable`] : [] };
  }
}

export async function loadHardSentencesReview(userId: string): Promise<HardSentencesReviewResult> {
  const results = await Promise.allSettled([loadCluster(userId), loadCapstone(userId)]);
  return {
    items: results.flatMap(result => result.status === 'fulfilled' ? result.value.items : []).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)),
    unavailable: results.flatMap((result, index) => result.status === 'rejected' ? [index === 0 ? 'Hard Sentences cluster attempts' : 'Hard Sentences capstone attempts'] : result.value.unavailable),
  };
}

export async function fetchOwnedHardSentencesAttempt(userId: string, kind: string, key: string): Promise<HardSentencesAttempt | null> {
  if (kind === 'cluster') {
    const { data, error } = await supabase.from('intro_lr_attempts').select('*').eq('user_id', userId).eq('id', key)
      .eq('drill_id', HS_DRILL_ID).eq('correct', false).maybeSingle();
    if (error) throw error;
    return parseHardSentencesCluster(data, userId);
  }
  if (kind === 'capstone') {
    const { data, error } = await supabase.from('bootcamp_kv').select('record_id,data').eq('user_id', userId)
      .eq('table_name', 'calibration_attempts').eq('record_id', key).maybeSingle();
    if (error) throw error;
    return data ? parseHardSentencesCapstone(data.data, key, userId) : null;
  }
  return null;
}
