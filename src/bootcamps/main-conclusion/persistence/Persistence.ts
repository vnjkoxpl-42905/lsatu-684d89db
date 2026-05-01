/**
 * Persistence interface — the only contract app code talks to.
 * v1 ships V1Persistence (LocalStorage + IndexedDB). v1.5 / LSAT U absorption
 * swaps in SupabasePersistence as a one-file change in `factory.ts`.
 *
 * See: docs/architecture-plan.md §3 + spec.html §6.9.
 */

export interface Persistence {
  // Tabular records (KV by table + record id)
  get<T>(table: string, id: string): Promise<T | null>;
  set<T>(table: string, id: string, record: T): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  list<T>(table: string, filter?: Partial<T>): Promise<T[]>;

  // Blob storage (R&R audio, large binaries)
  putBlob(key: string, blob: Blob): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  removeBlob(key: string): Promise<void>;

  // Batched writes
  transaction<T>(fn: (tx: PersistenceTx) => Promise<T>): Promise<T>;
}

export interface PersistenceTx {
  get<T>(table: string, id: string): Promise<T | null>;
  set<T>(table: string, id: string, record: T): Promise<void>;
}
