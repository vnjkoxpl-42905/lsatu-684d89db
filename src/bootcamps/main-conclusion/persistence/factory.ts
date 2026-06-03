/**
 * Persistence factory.
 *
 * For signed-in users we use SupabaseSyncedPersistence: local-first reads/writes
 * with background autosave to the `bootcamp_kv` table so every profile keeps
 * all of their bootcamp progress in the cloud and across devices.
 * For anonymous callers we fall back to local-only V1Persistence.
 */

import type { Persistence } from './Persistence';
import { V1Persistence } from './V1Persistence';
import { LocalStoragePersistence } from './LocalStoragePersistence';
import { IndexedDBPersistence } from './IndexedDBPersistence';
import { SupabaseSyncedPersistence } from './SupabaseSyncedPersistence';

const _cache: Map<string, Persistence> = new Map();
let _testOverride: Persistence | null = null;

/** Returns the active adapter scoped to the supplied userId. */
export function getPersistence(userId: string = 'anon'): Persistence {
  if (_testOverride) return _testOverride;
  const existing = _cache.get(userId);
  if (existing) return existing;
  const created: Persistence =
    userId && userId !== 'anon'
      ? new SupabaseSyncedPersistence(userId)
      : new V1Persistence(
          new LocalStoragePersistence(userId),
          new IndexedDBPersistence(userId),
        );
  _cache.set(userId, created);
  return created;
}

/** Test hook — inject a fake. Passing null clears any override and cache. */
export function __setPersistenceForTests(p: Persistence | null): void {
  _testOverride = p;
  if (p === null) _cache.clear();
}

