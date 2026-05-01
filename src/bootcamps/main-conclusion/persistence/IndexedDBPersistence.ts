import { openDB, type IDBPDatabase } from 'idb';
import type { Persistence, PersistenceTx } from './Persistence';

const DB_NAME = 'mc-bootcamp';
const DB_VERSION = 1;
const BLOB_STORE = 'rr_audio';
const RECORD_STORES = [
  'simulator_attempts',
  'drill_stagegate',
  'traps_tag',
  'mistakes_profile',
  'srs_queue',
  'rr_recordings_meta',
  'rr_reviews',
  'journal_entries',
  'calibration_attempts',
  'lesson_progress',
] as const;

export class IndexedDBPersistence implements Persistence {
  private dbp: Promise<IDBPDatabase> | null = null;
  constructor(private userId: string = 'anon') {}

  private db(): Promise<IDBPDatabase> {
    if (!this.dbp) {
      this.dbp = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          for (const store of RECORD_STORES) {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' });
            }
          }
          if (!db.objectStoreNames.contains(BLOB_STORE)) {
            db.createObjectStore(BLOB_STORE);
          }
        },
      });
    }
    return this.dbp;
  }

  private scope(rec: { user_id?: string }): boolean {
    return !rec.user_id || rec.user_id === this.userId;
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    const db = await this.db();
    const rec = await db.get(table, id);
    return (rec as T) ?? null;
  }

  async set<T>(table: string, id: string, record: T): Promise<void> {
    const db = await this.db();
    await db.put(table, { ...(record as object), id } as never);
  }

  async remove(table: string, id: string): Promise<void> {
    const db = await this.db();
    await db.delete(table, id);
  }

  async list<T>(table: string, filter?: Partial<T>): Promise<T[]> {
    const db = await this.db();
    const all = (await db.getAll(table)) as T[];
    return all.filter((r) => {
      if (!this.scope(r as { user_id?: string })) return false;
      if (!filter) return true;
      return Object.entries(filter).every(
        ([k, v]) => (r as Record<string, unknown>)[k] === v,
      );
    });
  }

  async putBlob(key: string, blob: Blob): Promise<void> {
    const db = await this.db();
    await db.put(BLOB_STORE, blob, key);
  }

  async getBlob(key: string): Promise<Blob | null> {
    const db = await this.db();
    const b = await db.get(BLOB_STORE, key);
    return (b as Blob) ?? null;
  }

  async removeBlob(key: string): Promise<void> {
    const db = await this.db();
    await db.delete(BLOB_STORE, key);
  }

  async transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T> {
    const db = await this.db();
    const idbTx = db.transaction(RECORD_STORES as unknown as string[], 'readwrite');
    const tx: PersistenceTx = {
      get: async <U>(t: string, i: string) => {
        const r = await idbTx.objectStore(t as never).get(i);
        return (r as U) ?? null;
      },
      set: async <U>(t: string, i: string, r: U) => {
        await idbTx.objectStore(t as never).put({ ...(r as object), id: i } as never);
      },
    };
    const result = await fn(tx);
    await idbTx.done;
    return result;
  }
}
