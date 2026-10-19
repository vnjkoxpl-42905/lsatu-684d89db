/**
 * cloudMirror — mirrors student-owned localStorage data to the cloud so
 * progress survives cache clears, new devices, and browser switches.
 *
 * Every mirrored write lands in `bootcamp_kv` (table_name = 'localstore',
 * record_id = the localStorage key) under the signed-in user's id. Students
 * cannot delete these rows (RLS: admin-only delete), so cloud copies are
 * never lost unless an admin explicitly removes them.
 *
 * Semantics:
 *   - Writes: localStorage stays the fast local cache; the cloud write is
 *     debounced (~1s) and retried on failure. Also flushed on tab hide/close.
 *   - Removals: mirrored as a tombstone ({ v: null }) rather than a delete,
 *     so intentional resets don't get resurrected on the next hydrate.
 *   - Hydrate (on sign-in): pulls all 'localstore' rows and fills ONLY keys
 *     missing locally. A fresh device gets its data back; an active device
 *     never has in-progress local state clobbered.
 *
 * The raw localStorage string is stored verbatim (data = { v: string|null }),
 * so readers keep using their existing JSON.parse paths unchanged.
 */

import { supabase } from '@/integrations/supabase/client';

const TABLE_NAME = 'localstore';
const FLUSH_DEBOUNCE_MS = 1000;

let currentUserId: string | null = null;
const pending = new Map<string, string | null>(); // key -> raw value (null = tombstone)
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleBound = false;

function bindLifecycle() {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;
  window.addEventListener('beforeunload', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  if (!currentUserId || pending.size === 0) return;
  const batch = Array.from(pending.entries());
  pending.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    const rows = batch.map(([key, value]) => ({
      user_id: currentUserId!,
      table_name: TABLE_NAME,
      record_id: key,
      data: { v: value },
    }));
    const { error } = await supabase
      .from('bootcamp_kv')
      .upsert(rows, { onConflict: 'user_id,table_name,record_id' });
    if (error) {
      console.warn('[cloudMirror] upsert failed:', error.message);
      for (const [k, v] of batch) pending.set(k, v);
      scheduleFlush();
    }
  } catch (e) {
    console.warn('[cloudMirror] flush threw', e);
    for (const [k, v] of batch) pending.set(k, v);
    scheduleFlush();
  }
}

/** Pull cloud copies into localStorage for keys this device doesn't have. */
async function hydrate(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('bootcamp_kv')
      .select('record_id, data')
      .eq('user_id', userId)
      .eq('table_name', TABLE_NAME);
    if (error) {
      console.warn('[cloudMirror] hydrate failed:', error.message);
      return;
    }
    let restored = 0;
    for (const row of data ?? []) {
      const value = (row.data as { v?: string | null } | null)?.v;
      if (value == null) continue; // tombstone or empty
      try {
        if (localStorage.getItem(row.record_id) === null) {
          localStorage.setItem(row.record_id, value);
          restored += 1;
        }
      } catch {
        /* storage unavailable */
      }
    }
    if (restored > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cloud-mirror-hydrated', { detail: { restored } }));
    }
  } catch (e) {
    console.warn('[cloudMirror] hydrate threw', e);
  }
}

/** Start mirroring for a signed-in user and restore any missing local data. */
export function initCloudMirror(userId: string): void {
  if (!userId || currentUserId === userId) return;
  currentUserId = userId;
  bindLifecycle();
  void hydrate(userId);
}

/** Stop mirroring (sign-out). Pending writes are flushed first if possible. */
export function stopCloudMirror(): void {
  void flush();
  currentUserId = null;
}

/** localStorage.setItem + cloud mirror. Drop-in replacement. */
export function mirroredSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
  if (currentUserId) {
    pending.set(key, value);
    scheduleFlush();
  }
}

/** localStorage.removeItem + cloud tombstone (prevents hydrate resurrection). */
export function mirroredRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
  if (currentUserId) {
    pending.set(key, null);
    scheduleFlush();
  }
}
