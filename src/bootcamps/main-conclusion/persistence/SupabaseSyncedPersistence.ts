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
 *     debounced background upsert into Supabase.
 *   - On hydrate(), all rows for this user are pulled from Supabase and merged
 *     into the local cache (server is authoritative — last-write-wins by
 *     `updated_at`).
 *   - Blobs (audio) stay local only.
 */

import type { Persistence, PersistenceTx } from './Persistence';
import { V1Persistence } from './V1Persistence';
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';
import { supabase } from '@/integrations/supabase/client';

const FLUSH_DEBOUNCE_MS = 800;

interface PendingWrite {
  table: string;
  id: string;
  data: unknown | null; // null = delete
}

export class SupabaseSyncedPersistence implements Persistence {
  private local: V1Persistence;
  private pending = new Map<string, PendingWrite>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated = false;
  private readyPromise: Promise<void>;

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
    if (!this.userId || this.userId === 'anon') return;
    if (this.pending.size === 0) return;
    const batch = Array.from(this.pending.values());
    this.pending.clear();
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
          for (const b of upserts) this.pending.set(this.key(b.table, b.id), b);
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
          console.warn('[SupabaseSyncedPersistence] delete failed', error.message);
          this.pending.set(this.key(d.table, d.id), d);
          this.scheduleFlush();
        }
      }
    } catch (e) {
      console.warn('[SupabaseSyncedPersistence] flush threw', e);
      for (const b of batch) this.pending.set(this.key(b.table, b.id), b);
      this.scheduleFlush();
    }
  }

  // ── Persistence API ────────────────────────────────────────────────────────

  get<T>(table: string, id: string): Promise<T | null> {
    return this.local.get<T>(table, id);
  }

  async set<T>(table: string, id: string, record: T): Promise<void> {
    await this.local.set(table, id, record);
    this.pending.set(this.key(table, id), { table, id, data: record });
    this.scheduleFlush();
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
          await innerTx.set(t, i, r);
          this.pending.set(this.key(t, i), { table: t, id: i, data: r });
        },
      };
      const result = await fn(tx);
      this.scheduleFlush();
      return result;
    });
  }
}
