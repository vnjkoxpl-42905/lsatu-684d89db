/**
 * Persistence factory — the LSAT U absorption hand-off point.
 * v1: V1Persistence (LocalStorage + IndexedDB).
 * v1.5 / LSAT U absorption: replace the export below with `new SupabasePersistence(...)`.
 * One-file change. App code never knows the difference.
 */

import type { Persistence } from './Persistence';
import { V1Persistence } from './V1Persistence';
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';

let _persistence: Persistence | null = null;

/** Returns the active adapter. Lazily constructed so SSR / tests can override. */
export function getPersistence(userId: string = 'anon'): Persistence {
  if (_persistence) return _persistence;
  _persistence = new V1Persistence(
    new LocalStoragePersistence(userId),
    new IndexedDBPersistence(userId),
  );
  return _persistence;
}

/** Test hook — inject a fake. */
export function __setPersistenceForTests(p: Persistence | null): void {
  _persistence = p;
}
