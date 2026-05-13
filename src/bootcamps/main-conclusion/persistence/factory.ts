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

// Per-user adapter cache. The original implementation cached a single
// `_persistence` after the first call and ignored later userId arguments,
// which meant a sign-out → sign-in as a different user kept writing under
// the first user's storage prefix. Keying the cache by userId prevents that.
const _cache: Map<string, Persistence> = new Map();
let _testOverride: Persistence | null = null;

/** Returns the active adapter scoped to the supplied userId. */
export function getPersistence(userId: string = 'anon'): Persistence {
  if (_testOverride) return _testOverride;
  const existing = _cache.get(userId);
  if (existing) return existing;
  const created = new V1Persistence(
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
