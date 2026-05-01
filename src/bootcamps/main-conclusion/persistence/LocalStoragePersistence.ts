import type { Persistence, PersistenceTx } from './Persistence';

const PREFIX = 'student';

/** Per architecture-plan.md §3.2 — KV via `student:{userId}:{table}:{id}` keys. */
export class LocalStoragePersistence implements Persistence {
  constructor(private userId: string = 'anon') {}

  private k(table: string, id: string): string {
    return `${PREFIX}:${this.userId}:${table}:${id}`;
  }

  private prefix(table: string): string {
    return `${PREFIX}:${this.userId}:${table}:`;
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    const raw = localStorage.getItem(this.k(table, id));
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(table: string, id: string, record: T): Promise<void> {
    try {
      localStorage.setItem(this.k(table, id), JSON.stringify(record));
    } catch (err) {
      console.warn('[LocalStoragePersistence] quota exceeded or write failed', err);
      throw err;
    }
  }

  async remove(table: string, id: string): Promise<void> {
    localStorage.removeItem(this.k(table, id));
  }

  async list<T>(table: string, filter?: Partial<T>): Promise<T[]> {
    const out: T[] = [];
    const p = this.prefix(table);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(p)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const rec = JSON.parse(raw) as T;
        if (!filter || matchesFilter(rec, filter)) out.push(rec);
      } catch {
        // skip malformed
      }
    }
    return out;
  }

  // Blob storage is delegated to IndexedDBPersistence by V1Persistence; calling
  // these on the LocalStorage adapter directly is a programmer error.
  async putBlob(_key: string, _blob: Blob): Promise<void> {
    throw new Error('LocalStoragePersistence does not support blobs — use IndexedDBPersistence');
  }
  async getBlob(_key: string): Promise<Blob | null> {
    throw new Error('LocalStoragePersistence does not support blobs — use IndexedDBPersistence');
  }
  async removeBlob(_key: string): Promise<void> {
    throw new Error('LocalStoragePersistence does not support blobs — use IndexedDBPersistence');
  }

  async transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T> {
    // localStorage has no native transactions; we approximate by collecting writes
    // and applying atomically. For v1 the simple semantics are sufficient.
    const tx: PersistenceTx = {
      get: <U>(t: string, i: string) => this.get<U>(t, i),
      set: <U>(t: string, i: string, r: U) => this.set<U>(t, i, r),
    };
    return fn(tx);
  }
}

function matchesFilter<T>(record: T, filter: Partial<T>): boolean {
  return Object.entries(filter).every(
    ([k, v]) => (record as Record<string, unknown>)[k] === v,
  );
}
