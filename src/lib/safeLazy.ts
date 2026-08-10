import { lazy, type ComponentType } from 'react';

// Stale-chunk safe lazy. After a deploy, a cached app shell can resolve a
// dynamic import to `undefined` (chunk manifest mismatch) or to a module
// whose default export is missing. Plain React.lazy then crashes the render
// with "Cannot read properties of undefined (reading 'default')" and blanks
// the screen. safeLazy detects both shapes and forces a one-time hard reload
// to pick up the fresh manifest instead of throwing. sessionStorage guards
// against reload loops if the failure is something else.
const RELOAD_KEY = '__safe_lazy_chunk_reload__';

export function markSafeLazyReloaded() {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {}
}

export function safeLazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod || !mod.default) throw new Error('missing default export');
      // A successful resolution means the manifest is fresh again — clear the
      // guard so a genuinely new stale chunk later can still trigger a reload.
      markSafeLazyReloaded();
      return mod;
    } catch (err) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      } catch {}
      throw err;
    }
  });
}
