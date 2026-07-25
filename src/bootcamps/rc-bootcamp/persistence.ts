/**
 * Progress persistence for the RC bootcamp lesson.
 *
 * Two implementations behind one adapter. localStorage is the parity path with
 * the approved prototype (same key, same shape, same guards) and is what a
 * signed-out preview uses. For a signed-in student the Supabase adapter writes
 * the same record to `rc_lesson_progress` AND to localStorage, so a dropped
 * connection never costs the student their writing.
 *
 * Nothing here invents progress. A read that cannot be trusted returns an empty
 * record and the lesson starts at the beginning; a remote write that fails
 * reports failure rather than showing a "Saved" state that did not happen.
 *
 * `rc_lesson_progress` is not in the generated Supabase types yet (it ships in
 * the same push as this file), so the client is cast at the call site — the
 * established pattern in this repo for tables ahead of a types regeneration.
 */

import { supabase } from '@/integrations/supabase/client';
import { TOTAL_SCREENS } from './content';

/** localStorage key — unchanged from the prototype so an in-progress local run survives the port. */
export const STORE_KEY = 'rc-ewtp-v1';

/** Reserved keys inside the flat record. Everything else is the student's own work. */
export const AT_KEY = '__at';
export const FURTHEST_KEY = '__furthest';
export const COMPLETED_KEY = '__completedAt';

export type LessonData = Record<string, string | number>;

export interface PersistenceAdapter {
  load(): Promise<LessonData>;
  save(data: LessonData): Promise<boolean>;
}

/** Integer-guard a stored screen index. Anything else is discarded. */
export function safeIndex(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < TOTAL_SCREENS
    ? (value as number)
    : null;
}

function isPlainRecord(value: unknown): value is LessonData {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * `rc_lesson_progress` ships in the same push as this file, so it is not in the
 * generated Supabase types yet. One cast here, rather than at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedDb = supabase as any;

export const localAdapter: PersistenceAdapter = {
  async load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return isPlainRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  },
  async save(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Supabase-backed progress for a signed-in student, mirrored to localStorage.
 * If the remote row is unavailable for any reason the local record is used, so
 * the lesson degrades to prototype parity instead of losing the student's work.
 */
export function createSupabaseAdapter(userId: string, lessonId: string): PersistenceAdapter {
  /**
   * If the table is missing or unreadable — the window between this code
   * shipping and the migration running, most obviously — stop asking. One
   * failure per session, then local only, instead of an error on every
   * keystroke.
   */
  let remoteAvailable = true;

  return {
    async load() {
      const local = await localAdapter.load();
      if (!remoteAvailable) return local;
      try {
        const { data, error } = await untypedDb
          .from('rc_lesson_progress')
          .select('data')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        if (error) {
          remoteAvailable = false;
          return local;
        }
        if (!data || !isPlainRecord(data.data)) return local;
        return data.data as LessonData;
      } catch {
        remoteAvailable = false;
        return local;
      }
    },
    async save(data) {
      const localOk = await localAdapter.save(data);
      if (!remoteAvailable) return localOk;
      try {
        const { error } = await untypedDb.from('rc_lesson_progress').upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            data,
            completed_at: data[COMPLETED_KEY] ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' },
        );
        if (error) {
          remoteAvailable = false;
          return localOk;
        }
        return localOk;
      } catch {
        remoteAvailable = false;
        return localOk;
      }
    },
  };
}
