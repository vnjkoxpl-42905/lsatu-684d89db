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
/** Client-written timestamp used to reconcile this browser with the cloud. */
export const SAVED_AT_KEY = '__savedAt';

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

function savedAt(data: LessonData): number {
  const value = data[SAVED_AT_KEY];
  return typeof value === 'string' ? Date.parse(value) || 0 : 0;
}

function stamp(data: LessonData): LessonData {
  return { ...data, [SAVED_AT_KEY]: new Date().toISOString() };
}

/** Prefer the newest complete snapshot. Legacy local records win so unsynced work is never discarded. */
export function chooseLatestProgress(
  local: LessonData,
  remote: LessonData | null,
  remoteUpdatedAt?: string,
): LessonData {
  if (!remote) return local;
  if (Object.keys(local).length === 0) return remote;
  const localTime = savedAt(local);
  const remoteTime = savedAt(remote) || (remoteUpdatedAt ? Date.parse(remoteUpdatedAt) || 0 : 0);
  if (localTime === 0) return local;
  return remoteTime > localTime ? remote : local;
}

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
      localStorage.setItem(STORE_KEY, JSON.stringify(stamp(data)));
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
  // Keep cloud writes ordered. Without this, a slow older request can arrive
  // after a newer one and move a student backwards.
  let cloudQueue: Promise<boolean> = Promise.resolve(true);

  async function writeCloud(data: LessonData): Promise<boolean> {
    try {
      const { error } = await supabase.from('rc_lesson_progress').upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          data,
          completed_at:
            typeof data[COMPLETED_KEY] === 'string' ? data[COMPLETED_KEY] : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' },
      );
      return !error;
    } catch {
      return false;
    }
  }

  return {
    async load() {
      const local = await localAdapter.load();
      try {
        const { data, error } = await supabase
          .from('rc_lesson_progress')
          .select('data, updated_at')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        if (error || !data || !isPlainRecord(data.data)) return local;

        const latest = chooseLatestProgress(local, data.data as LessonData, data.updated_at);
        // Reconcile both stores on entry. This uploads work that was captured
        // locally during an outage and downloads newer work from another device.
        await localAdapter.save(latest);
        if (latest === local) cloudQueue = cloudQueue.then(() => writeCloud(latest));
        return latest;
      } catch {
        return local;
      }
    },
    async save(data) {
      const snapshot = stamp(data);
      let localOk = false;
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
        localOk = true;
      } catch {
        localOk = false;
      }
      cloudQueue = cloudQueue.then(() => writeCloud(snapshot));
      const cloudOk = await cloudQueue;
      return localOk && cloudOk;
    },
  };
}
