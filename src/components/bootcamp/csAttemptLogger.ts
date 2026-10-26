/**
 * Fire-and-forget logger for Causation Station per-question attempts.
 *
 * CSDrillPlayer already writes a 200-entry rolling blob to localStorage
 * (mirrored to bootcamp_kv) for its own dashboard — that is a cache, not a
 * record, and it cannot be queried. This mirrors every answer into the
 * durable `public.cs_attempts` table so the student's Drill History covers
 * Causation Station like every other surface. Errors are swallowed (with a
 * console.warn) so a bad network never breaks the drill UI.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CsAttemptInput {
  moduleId: string;
  questionId: string;
  /** Answer choice index as text, or null for ungraded free-response work. */
  selectedAnswer?: string | null;
  /** null for ungraded free-response work (modules 2/3). */
  correct: boolean | null;
  timeMs?: number | null;
}

// In-memory de-dupe so re-renders or accidental double-fires don't double-log
// the same answer within a session.
const seen = new Set<string>();

export function logCsAttempt(input: CsAttemptInput): void {
  void (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dedupeKey = `${user.id}::${input.moduleId}::${input.questionId}::${input.correct}::${input.selectedAnswer ?? ''}::${input.timeMs ?? ''}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      // cs_attempts is not in the generated Supabase types yet (it ships in
      // the same push as this file), so the table name is cast at the call
      // site — the established pattern in this repo for tables ahead of a
      // types regeneration.
      const { error } = await supabase.from('cs_attempts' as never).insert({
        user_id: user.id,
        module_id: input.moduleId,
        question_id: input.questionId,
        selected_answer: input.selectedAnswer ?? null,
        correct: input.correct,
        time_ms: input.timeMs ?? null,
      } as never);
      if (error) {
        console.warn('[cs_attempts] insert failed', error.message);
        seen.delete(dedupeKey);
      }
    } catch (e) {
      console.warn('[cs_attempts] log threw', e);
    }
  })();
}
