import type { Persistence, PersistenceTx } from './Persistence';
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';

/**
 * Composite that delegates by table:
 *   - users / prefs_user / module_progress → LocalStorage (small + frequent reads)
 *   - everything else (potentially large) → IndexedDB
 *   - blobs always → IndexedDB
 *
 * Per architecture-plan.md §3.2.
 */
const LS_TABLES = new Set(['users', 'prefs_user', 'module_progress']);

export class V1Persistence implements Persistence {
  constructor(
    private ls: LocalStoragePersistence = new LocalStoragePersistence(),
    private idb: IndexedDBPersistence = new IndexedDBPersistence(),
  ) {}

  private route(table: string): Persistence {
    return LS_TABLES.has(table) ? this.ls : this.idb;
  }

  get<T>(table: string, id: string): Promise<T | null> { return this.route(table).get<T>(table, id); }
  set<T>(table: string, id: string, record: T): Promise<void> { return this.route(table).set(table, id, record); }
  remove(table: string, id: string): Promise<void> { return this.route(table).remove(table, id); }
  list<T>(table: string, filter?: Partial<T>): Promise<T[]> { return this.route(table).list<T>(table, filter); }

  putBlob(key: string, blob: Blob): Promise<void> { return this.idb.putBlob(key, blob); }
  getBlob(key: string): Promise<Blob | null> { return this.idb.getBlob(key); }
  removeBlob(key: string): Promise<void> { return this.idb.removeBlob(key); }

  async transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T> {
    // For Lesson 1.1, transactions are scoped to a single store. Composite-store
    // transactions (e.g., crossing module_progress + lesson_progress) currently
    // run as best-effort sequential writes via the IDB transaction. Tighten when
    // Module 4 needs cross-store atomicity.
    return this.idb.transaction(fn);
  }
}
