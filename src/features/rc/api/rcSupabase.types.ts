/**
 * Row types for the three RC progress tables.
 *
 * These live here, not in src/integrations/supabase/types.ts, because that file
 * is generated and must not be hand-edited. Until it is regenerated, the RC
 * tables are unknown to the typed client, so `rcDb` casts it once, in one place,
 * rather than scattering `as any` through the API layer.
 */
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RcDrillSessionRow {
  id: string;
  user_id: string;
  config: unknown;
  passage_ids: number[];
  status: string;
  excluded_from_analytics: boolean;
  started_at: string;
  completed_at: string | null;
  practice_test_run_id?: string | null;
  practice_test_leg?: number | null;
}

export interface RcAttemptRow {
  id: string;
  session_id: string;
  user_id: string;
  question_id: number;
  passage_id: number;
  selected: string | null;
  is_correct: boolean | null;
  time_ms: number;
  flagged: boolean;
  eliminations: string[];
  is_first_attempt: boolean;
  created_at: string;
}

export interface RcAnnotationRow {
  user_id: string;
  passage_id: number;
  highlights: unknown;
  updated_at: string;
}

/** The Supabase client, untyped, for the RC tables only. */
export const rcDb = supabase as unknown as SupabaseClient;

export const RC_SESSIONS_TABLE = 'rc_drill_sessions';
export const RC_ATTEMPTS_TABLE = 'rc_attempts';
export const RC_ANNOTATIONS_TABLE = 'rc_annotations';
