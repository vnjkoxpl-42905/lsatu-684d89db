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
 * Service for managing question pool with deduplication and usage tracking
 */
export class QuestionPoolService {
  /**
   * Track that a question has been served to the user
   */
  static async markQuestionSeen(qid: string, classId: string, mode: DrillMode): Promise<void> {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('question_usage')
        .select('*')
        .eq('class_id', classId)
        .eq('qid', qid)
        .eq('mode', mode)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await supabase
          .from('question_usage')
          .update({
            last_seen_at: new Date().toISOString(),
            times_seen: existing.times_seen + 1
          })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await supabase
          .from('question_usage')
          .insert({
            class_id: classId,
            qid,
            mode,
            last_seen_at: new Date().toISOString(),
            times_seen: 1
          });
      }
    } catch (error) {
      console.error('Failed to mark question as seen:', error);
    }
  }

  /**
   * Track that a question was displayed to the user (question_views table)
   */
  static async trackQuestionView(qid: string, classId: string, mode: DrillMode): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any)
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
    try {
      await (supabase as any)
        .from('question_views')
        .update({ answered: true })
        .eq('id', viewId);
    } catch (error) {
      console.error('Failed to mark view as answered:', error);
    }
  }

  /**
   * Get all question usage for the user — cross-mode by default
   */
  static async getQuestionUsage(classId: string, mode: DrillMode, crossMode: boolean = true): Promise<Map<string, QuestionUsage>> {
    try {
      let query = supabase
        .from('question_usage')
        .select('qid, last_seen_at, times_seen')
        .eq('class_id', classId);

      // Only filter by mode if cross-mode is disabled
      if (!crossMode) {
        query = query.eq('mode', mode);
      }

      const { data, error } = await query;

      if (error) throw error;

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
    } catch (error) {
      console.error('Failed to get question usage:', error);
      return new Map();
    }
  }

  /**
   * Reset question pool for a user (delete all usage records)
   */
  static async resetPool(classId: string, mode?: DrillMode): Promise<void> {
    try {
      let query = supabase
        .from('question_usage')
        .delete()
        .eq('class_id', classId);

      if (mode) {
        query = query.eq('mode', mode);
      }

      await query;
    } catch (error) {
      console.error('Failed to reset question pool:', error);
      throw error;
    }
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
    let unseen: LRQuestion[] = [];
    let recycled: LRQuestion[] = [];

    questions.forEach(q => {
      const usageRecord = usage.get(q.qid);

      if (!usageRecord) {
        // Never seen - always available
        unseen.push(q);
      } else if (settings.allowRepeats) {
        // Repeats allowed - all questions available
        available.push(q);
      } else {
        // Check if enough time has passed to recycle
        const lastSeen = new Date(usageRecord.last_seen_at);
        if (lastSeen < recycleThreshold) {
          recycled.push(q);
        }
      }
    });

    // Build final pool based on preferences
    if (settings.preferUnseen && unseen.length > 0) {
      available = unseen;
    } else if (unseen.length > 0 || recycled.length > 0) {
      available = [...unseen, ...recycled];
    } else if (settings.allowRepeats) {
      // Pool exhausted, but repeats allowed
      available = questions;
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
