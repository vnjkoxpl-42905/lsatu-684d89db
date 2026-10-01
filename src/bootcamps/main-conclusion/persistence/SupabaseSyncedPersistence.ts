/**
 * SupabaseSyncedPersistence
 * -------------------------
 * Wraps the local V1Persistence (LocalStorage + IndexedDB) and mirrors every
 * write to the `bootcamp_kv` table in Supabase so each user's bootcamp progress
 * follows their profile across devices/sessions.
 *
 * Strategy:
 *   - Reads come from the local cache (fast, offline-friendly).
 *   - Writes are committed to the local cache immediately, then queued for a
 *     debounced background upsert into Supabase. Module progress instead waits
 *     for an exact account acknowledgement before updating the local cache.
 *   - On hydrate(), account rows are merged with local rows. A newer local
 *     practice session is preserved. Official LR sections wait for the
 *     runner's guarded account save; other sessions are queued for sync.
 *   - Blobs (audio) stay local only.
 */

import type { Persistence, PersistenceTx } from './Persistence';
import { V1Persistence } from './V1Persistence';
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';
import { supabase } from '@/integrations/supabase/client';

const FLUSH_DEBOUNCE_MS = 800;

/** Official LR sections use the runner's acknowledged save and PT lease gate. */
function ownsAccountSave(table: string, record: unknown): boolean {
  if (table !== 'practice_sessions' || !record || typeof record !== 'object') return false;
  const slug = (record as { pool_slug?: unknown }).pool_slug;
  return typeof slug === 'string' &&
    (slug.startsWith('drill::section::') || slug.startsWith('drill::practice-test::'));
}

function updatedAt(value: unknown): number {
  if (!value || typeof value !== 'object') return Number.NEGATIVE_INFINITY;
  const timestamp = (value as { updated_at?: unknown }).updated_at;
  if (typeof timestamp !== 'string') return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

interface PendingWrite {
  table: string;
  id: string;
  data: unknown | null; // null = delete
}

export class SupabaseSyncedPersistence implements Persistence {
  private local: V1Persistence;
  private pending = new Map<string, PendingWrite>();
  private inFlightWrites = new Map<string, PendingWrite>();
  private flushInFlight: Promise<void> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated = false;
  private readyPromise: Promise<void>;
  private moduleWrites = new Map<string, Promise<void>>();

  constructor(private userId: string) {
    this.local = new V1Persistence(
      new LocalStoragePersistence(userId),
      new IndexedDBPersistence(userId),
    );
    // Kick off cloud hydration. The UI does not block on it, but callers that
    // must not fabricate a default over real cloud data await ready() first.
    // hydrate() never rejects (it catches internally), so ready() always resolves.
    this.readyPromise = this.hydrate();

    // Best-effort flush on tab close.
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        void this.flush();
      });
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void this.flush();
      });
    }
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  private key(table: string, id: string): string {
    return `${table}::${id}`;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated || !this.userId || this.userId === 'anon') return;
    try {
      const { data, error } = await supabase
        .from('bootcamp_kv')
        .select('table_name, record_id, data')
        .eq('user_id', this.userId);
      if (error) {
        console.warn('[SupabaseSyncedPersistence] hydrate failed', error.message);
        return;
      }
      for (const row of data ?? []) {
        try {
          const key = this.key(row.table_name, row.record_id);
          // A write made while the cloud request was in flight owns this row.
          // Replacing it with the fetched snapshot would lose the latest answer.
          if (this.pending.has(key) || this.inFlightWrites.has(key)) continue;
          const local = await this.local.get<unknown>(row.table_name, row.record_id);
          if (this.pending.has(key) || this.inFlightWrites.has(key)) continue;
          if (row.table_name === 'practice_sessions' && updatedAt(local) > updatedAt(row.data)) {
            if (!ownsAccountSave(row.table_name, local)) {
              this.pending.set(key, { table: row.table_name, id: row.record_id, data: local });
              this.scheduleFlush();
            }
            continue;
          }
          await this.local.set(row.table_name, row.record_id, row.data as object);
        } catch (e) {
          console.warn('[SupabaseSyncedPersistence] hydrate row failed', e);
        }
      }
      this.hydrated = true;
    } catch (e) {
      console.warn('[SupabaseSyncedPersistence] hydrate threw', e);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      void this.flush();
    }, FLUSH_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    if (!this.userId || this.userId === 'anon') return;
    if (this.pending.size === 0) return;
    const operation = this.flushPending();
    this.flushInFlight = operation;
    try {
      await operation;
    } finally {
      this.flushInFlight = null;
      if (this.pending.size > 0 && !this.flushTimer) this.scheduleFlush();
    }
  }

  private async flushPending(): Promise<void> {
    const batch = Array.from(this.pending.values());
    this.pending.clear();
    for (const item of batch) this.inFlightWrites.set(this.key(item.table, item.id), item);
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const upserts = batch.filter((b) => b.data !== null);
    const deletes = batch.filter((b) => b.data === null);

    try {
      if (upserts.length > 0) {
        const rows = upserts.map((b) => ({
          user_id: this.userId,
          table_name: b.table,
          record_id: b.id,
          data: b.data as never,
        }));
        const { error } = await supabase
          .from('bootcamp_kv')
          .upsert(rows, { onConflict: 'user_id,table_name,record_id' });
        if (error) {
          console.warn('[SupabaseSyncedPersistence] upsert failed', error.message);
          // Re-queue on failure.
          for (const b of upserts) {
            const key = this.key(b.table, b.id);
            if (!this.pending.has(key)) this.pending.set(key, b);
          }
          this.scheduleFlush();
        }
      }
      for (const d of deletes) {
        const { error } = await supabase
          .from('bootcamp_kv')
          .delete()
          .eq('user_id', this.userId)
          .eq('table_name', d.table)
          .eq('record_id', d.id);
        if (error) {
          // Student deletes are denied by RLS (admin-only data retention).
          // Drop the delete rather than requeueing forever — the cloud row is
          // intentionally preserved.
          console.warn('[SupabaseSyncedPersistence] delete denied/failed (cloud row preserved)', error.message);
        }
      }
    } catch (e) {
      console.warn('[SupabaseSyncedPersistence] flush threw', e);
      for (const b of batch) {
        const key = this.key(b.table, b.id);
        if (!this.pending.has(key)) this.pending.set(key, b);
      }
      this.scheduleFlush();
    } finally {
      for (const item of batch) {
        const key = this.key(item.table, item.id);
        if (this.inFlightWrites.get(key) === item) this.inFlightWrites.delete(key);
      }
    }
  }

  // ── Persistence API ────────────────────────────────────────────────────────

  get<T>(table: string, id: string): Promise<T | null> {
    return this.local.get<T>(table, id);
  }

  async set<T>(table: string, id: string, record: T): Promise<void> {
    if (table === 'module_progress') {
      const previous = this.moduleWrites.get(id) ?? Promise.resolve();
      const write = previous.catch(() => undefined).then(() => this.saveModuleProgress(id, record));
      this.moduleWrites.set(id, write);
      try { await write; } finally { if (this.moduleWrites.get(id) === write) this.moduleWrites.delete(id); }
      return;
    }
    await this.local.set(table, id, record);
    if (ownsAccountSave(table, record)) return;
    this.pending.set(this.key(table, id), { table, id, data: record });
    this.scheduleFlush();
  }

  private async saveModuleProgress<T>(id: string, record: T): Promise<void> {
    await this.ready();
    if (this.flushInFlight) await this.flushInFlight;
    // This namespace never queues writes. Remove an older pending snapshot
    // before acknowledging a direct save so it cannot flush afterward.
    this.pending.delete(this.key('module_progress', id));
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.requireModuleActor();
      const { data: existing, error: readError } = await supabase.from('bootcamp_kv').select('user_id,table_name,record_id,data')
        .eq('user_id', this.userId).eq('table_name', 'module_progress').eq('record_id', id).maybeSingle();
      if (readError) throw readError;
      if (existing && (existing.user_id !== this.userId || existing.table_name !== 'module_progress' || existing.record_id !== id)) throw new Error('Module progress owner could not be verified.');
      const merged = mergeModuleProgress(this.userId, id, existing?.data ?? null, record);
      const row = { user_id: this.userId, table_name: 'module_progress', record_id: id, data: merged as never };
      await this.requireModuleActor();
      const query = existing
        ? supabase.from('bootcamp_kv').update({ data: row.data }).eq('user_id', this.userId).eq('table_name', 'module_progress').eq('record_id', id).eq('data', JSON.stringify(existing.data))
        : supabase.from('bootcamp_kv').insert(row);
      const { data: acknowledged, error } = await query.select('user_id,table_name,record_id,data').maybeSingle();
      if (error) { if (!existing && error.code === '23505') continue; throw error; }
      if (!acknowledged) continue; // Lost CAS or a missing returned row never counts as saved.
      if (acknowledged.user_id !== row.user_id || acknowledged.table_name !== row.table_name || acknowledged.record_id !== id
        || canonicalJson(acknowledged.data) !== canonicalJson(merged)) throw new Error('The account did not acknowledge module progress.');
      await this.requireModuleActor();
      await this.local.set('module_progress', id, merged);
      return;
    }
    throw new Error('Module progress changed in another session. Try saving completion again.');
  }
  private async requireModuleActor(): Promise<void> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user || user.id !== this.userId) throw new Error('The signed-in account changed. Module progress has not been acknowledged.');
  }

  async remove(table: string, id: string): Promise<void> {
    await this.local.remove(table, id);
    this.pending.set(this.key(table, id), { table, id, data: null });
    this.scheduleFlush();
  }

  list<T>(table: string, filter?: Partial<T>): Promise<T[]> {
    return this.local.list<T>(table, filter);
  }

  putBlob(key: string, blob: Blob): Promise<void> { return this.local.putBlob(key, blob); }
  getBlob(key: string): Promise<Blob | null> { return this.local.getBlob(key); }
  removeBlob(key: string): Promise<void> { return this.local.removeBlob(key); }

  async transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T> {
    // Wrap the inner tx so writes inside the transaction also get queued for sync.
    // The callbacks are arrow functions, so `this` stays lexically bound here.
    return this.local.transaction(async (innerTx) => {
      const tx: PersistenceTx = {
        get: <U>(t: string, i: string) => innerTx.get<U>(t, i),
        set: async <U>(t: string, i: string, r: U) => {
          if (t === 'module_progress') throw new Error('Module progress requires an acknowledged set outside a local transaction.');
          await innerTx.set(t, i, r);
          if (!ownsAccountSave(t, r)) {
            this.pending.set(this.key(t, i), { table: t, id: i, data: r });
          }
        },
      };
      const result = await fn(tx);
      this.scheduleFlush();
      return result;
    });
  }
}

function mergeModuleProgress(owner: string, id: string, saved: unknown, incoming: unknown): Record<string, unknown> {
  const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  if (!isRecord(incoming) || incoming.user_id !== owner || incoming.id !== id) throw new Error('Invalid module progress identity.');
  if (saved !== null && (!isRecord(saved) || saved.user_id !== owner || saved.id !== id)) throw new Error('Saved module progress identity is invalid.');
  const base = isRecord(saved) ? saved : {};
  const merged = { ...base, ...incoming };
  const keys = new Set([...Object.keys(base), ...Object.keys(incoming), 'unlocked_modules', 'unlocked_routes', 'completed_lessons', 'completed_drills', 'completed_milestones', 'completed_hard_sections', 'completed_capstones']);
  for (const key of [...keys].filter(key => key.startsWith('completed_') || key.startsWith('unlocked_'))) {
    const before = base[key] ?? []; const next = incoming[key] ?? [];
    if (!Array.isArray(before) || !Array.isArray(next) || [...before, ...next].some(item => typeof item !== 'string')) throw new Error('Module progress lists are invalid.');
    merged[key] = [...new Set([...before, ...next])];
  }
  return merged;
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
