import { supabase } from '@/integrations/supabase/client';
import { LRQuestion } from './questionLoader';
import type { DrillMode } from '@/types/drill';

export interface QuestionPoolSettings {
  allowRepeats: boolean;
  preferUnseen: boolean;
  recycleAfterDays: number;
}

export interface QuestionUsage {
  qid: string;
  last_seen_at: string;
  times_seen: number;
}

/**
 * Does this launch define its own queue, rather than draw one from a pool?
 *
 * Pool dedupe exists so a GENERATED drill does not re-serve questions the
 * student has already worked. Pointed at a queue that was named rather than
 * generated, it silently deletes the thing that was asked for.
 *
 * A full section is the clearest case. PT103 Section 1 is 26 questions in one
 * fixed order; a "section" missing the three the student happened to drill last
 * week is not that section, and it was being served as though it were — 25 of
 * 26, with nothing on screen to say so. A section is an artifact, not a
 * selection, and the same holds for any queue the caller specified by qid.
 */
export function servesFixedQueue(
  mode: string,
  config?: { selectedQids?: string[] } | null,
): boolean {
  if (mode === 'full-section') return true;
  if (mode === 'type-drill' || mode === 'natural-drill') {
    return (config?.selectedQids?.length ?? 0) > 0;
  }
  return false;
}

/**
 * Service for managing question pool with deduplication and usage tracking
 */
export class QuestionPoolService {
  /**
   * Track that a question has been served to the user
   */
  static async markQuestionSeen(qid: string, classId: string, mode: DrillMode): Promise<void> {
    // Fire-and-forget telemetry: never throw into the drill flow, but check the
    // Supabase error explicitly (supabase-js resolves { error }, never throws)
    // and warn so a real RLS/transport failure is not fully invisible. Atomic
    // upsert (increment_question_seen) so times_seen can't lose an increment when
    // the same question is served on two surfaces or the effect double-fires.
    const { error } = await supabase.rpc('increment_question_seen', {
      p_class_id: classId,
      p_qid: qid,
      p_mode: mode
    });
    if (error) console.warn('[questionPool] markQuestionSeen failed:', error.message);
  }

  /**
   * Track that a question was displayed to the user (question_views table)
   */
  static async trackQuestionView(qid: string, classId: string, mode: DrillMode): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('question_views')
        .insert({
          class_id: classId,
          qid,
          mode,
          answered: false,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to track question view:', error);
        return null;
      }
      return data?.id ?? null;
    } catch (error) {
      console.error('Failed to track question view:', error);
      return null;
    }
  }

  /**
   * Mark a question view as answered
   */
  static async markViewAnswered(viewId: string): Promise<void> {
    // Fire-and-forget telemetry: check the error and warn, never throw.
    const { error } = await supabase
      .from('question_views')
      .update({ answered: true })
      .eq('id', viewId);
    if (error) console.warn('[questionPool] markViewAnswered failed:', error.message);
  }

  /**
   * Get all question usage for the user — cross-mode by default
   */
  static async getQuestionUsage(classId: string, mode: DrillMode, crossMode: boolean = true): Promise<Map<string, QuestionUsage>> {
    // Behavior-affecting: an empty Map silently disables dedupe and serves
    // repeats with no signal. Throw so the caller can surface "history
    // unavailable" and decide how to proceed (see Drill.tsx pool load).
    let query = supabase
      .from('question_usage')
      .select('qid, last_seen_at, times_seen')
      .eq('class_id', classId);

    // Only filter by mode if cross-mode is disabled
    if (!crossMode) {
      query = query.eq('mode', mode);
    }

    const { data, error } = await query;

    if (error) throw new Error(`getQuestionUsage failed: ${error.message}`);

    const usageMap = new Map<string, QuestionUsage>();
    data?.forEach(item => {
      const existing = usageMap.get(item.qid);
      if (!existing || (item.last_seen_at && (!existing.last_seen_at || item.last_seen_at > existing.last_seen_at))) {
        usageMap.set(item.qid, {
          qid: item.qid,
          last_seen_at: item.last_seen_at ?? '',
          times_seen: (existing?.times_seen ?? 0) + (item.times_seen ?? 1),
        });
      }
    });

    return usageMap;
  }

  /**
   * Reset question pool for a user (delete all usage records)
   */
  static async resetPool(classId: string, mode?: DrillMode): Promise<void> {
    let query = supabase
      .from('question_usage')
      .delete()
      .eq('class_id', classId);

    if (mode) {
      query = query.eq('mode', mode);
    }

    // supabase-js resolves { error } on a failed DELETE (it never throws), so
    // the old bare `await query` reported success even when zero rows were
    // deleted. Check and throw so callers can toast a real failure.
    const { error } = await query;
    if (error) throw new Error(`resetPool failed: ${error.message}`);
  }

  /**
   * Filter questions based on pool settings and usage
   */
  static filterQuestionPool(
    questions: LRQuestion[],
    usage: Map<string, QuestionUsage>,
    settings: QuestionPoolSettings
  ): { available: LRQuestion[]; exhausted: boolean } {
    const now = new Date();
    const recycleThreshold = new Date(now.getTime() - settings.recycleAfterDays * 24 * 60 * 60 * 1000);

    let available: LRQuestion[] = [];
    const unseen: LRQuestion[] = [];
    const recycled: LRQuestion[] = [];

    questions.forEach(q => {
      const usageRecord = usage.get(q.qid);

      if (!usageRecord) {
        // Never seen
        unseen.push(q);
      } else {
        // Seen: eligible to recycle once enough time has passed
        const lastSeen = new Date(usageRecord.last_seen_at);
        if (lastSeen < recycleThreshold) {
          recycled.push(q);
        }
      }
    });

    // Build final pool based on preferences.
    // When allowRepeats is on and the student is not asking to prioritise unseen
    // questions, the whole bank is available (previously this was silently
    // shrunk to unseen+recycled whenever any unseen question existed, so
    // allowRepeats behaved like no-repeats until the pool was fully exhausted).
    if (settings.allowRepeats && !settings.preferUnseen) {
      available = questions;
    } else if (settings.allowRepeats && settings.preferUnseen) {
      available = unseen.length > 0 ? unseen : questions;
    } else if (settings.preferUnseen && unseen.length > 0) {
      available = unseen;
    } else {
      available = [...unseen, ...recycled];
    }

    return {
      available,
      exhausted: available.length === 0
    };
  }

  /**
   * Get pool status for display
   */
  static getPoolStatus(
    totalQuestions: number,
    availableQuestions: number,
    settings: QuestionPoolSettings
  ): string {
    if (settings.allowRepeats) {
      return 'All questions';
    }
    if (settings.preferUnseen && availableQuestions === totalQuestions) {
      return 'Unseen only';
    }
    if (availableQuestions === 0) {
      return 'Pool exhausted';
    }
    return `${availableQuestions} available`;
  }
}
