/**
 * Fire-and-forget logger for Intro to LR per-question attempts.
 *
 * Every answer the student submits in the bootcamp's InteractiveDrillRunner
 * is recorded to `public.intro_lr_attempts`, scoped to the signed-in user.
 * Errors are swallowed (with a console.warn) so a bad network never breaks
 * the drill UI.
 */

import { supabase } from '@/integrations/supabase/client';

export interface IntroLrAttemptInput {
  drillId: string;
  questionId: string;
  mode: string;
  correct: boolean;
  selectedAnswer?: string | null;
  timeMs?: number | null;
}

// In-memory de-dupe so re-renders or accidental double-fires don't double-log
// the same question response within a session.
const seen = new Set<string>();

export function logIntroLrAttempt(input: IntroLrAttemptInput): void {
  void (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dedupeKey = `${user.id}::${input.drillId}::${input.questionId}::${input.correct}::${input.selectedAnswer ?? ''}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      const { error } = await supabase.from('intro_lr_attempts').insert({
        user_id: user.id,
        drill_id: input.drillId,
        question_id: input.questionId,
        mode: input.mode,
        selected_answer: input.selectedAnswer ?? null,
        correct: input.correct,
        time_ms: input.timeMs ?? null,
      });
      if (error) {
        console.warn('[intro_lr_attempts] insert failed', error.message);
        seen.delete(dedupeKey);
      }
    } catch (e) {
      console.warn('[intro_lr_attempts] log threw', e);
    }
  })();
}
