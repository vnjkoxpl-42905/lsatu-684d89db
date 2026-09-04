import { createElement, lazy, type ComponentType } from 'react';
import { BUILD_SHA } from '@/lib/buildInfo';

// Stale-chunk safe lazy. After a deploy, a cached app shell can resolve a
// dynamic import to `undefined` (chunk manifest mismatch) or to a module whose
// default export is missing. Plain React.lazy then crashes the render with
// "Cannot read properties of undefined (reading 'default')" / "missing default
// export" and blanks the screen.
//
// safeLazy handles both shapes:
//  1. retry the import once (transient network / partially-written cache),
//  2. purge Cache Storage + service workers and hard-reload ONCE per build,
//  3. if the reload for this build already happened, render a small recovery
//     notice instead of throwing — a visible message beats a blank screen.
const RELOAD_KEY = '__safe_lazy_chunk_reload__';

function reloadKeyForBuild() {
  return `${RELOAD_KEY}:${BUILD_SHA}`;
}

export function markSafeLazyReloaded() {
  try {
    sessionStorage.removeItem(reloadKeyForBuild());
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {}
}

async function purgeCaches() {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    if (regs?.length) await Promise.all(regs.map((r) => r.unregister()));
  } catch {}
}

function RecoveryNotice() {
  return createElement(
    'div',
    {
      style: {
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        textAlign: 'center',
        font: '15px/1.5 system-ui, sans-serif',
      },
    },
    createElement('div', null, "This page didn't finish loading."),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          void purgeCaches().finally(() => window.location.reload());
        },
        style: {
          padding: '8px 16px',
          borderRadius: '999px',
          border: '1px solid currentColor',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
        },
      },
      'Reload',
    ),
  );
}

export function safeLazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const load = async () => {
      const mod = await factory();
      if (!mod || !mod.default) throw new Error('missing default export');
      return mod;
    };

    try {
      const mod = await load();
      return mod;
    } catch {
      // One in-place retry first — transient failures are common and a reload
      // is far more disruptive than a second fetch.
      try {
        return await load();
      } catch (err) {
        const key = reloadKeyForBuild();
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(key) === '1';
          if (!alreadyReloaded) sessionStorage.setItem(key, '1');
        } catch {}

        if (!alreadyReloaded) {
          await purgeCaches();
          try {
            window.location.reload();
          } catch {}
          // Keep the tree suspended while the reload happens.
          await new Promise(() => {});
        }

        // Reload for this build already happened and it still fails: show a
        // recovery notice rather than throwing into a blank screen.
        console.error('[safeLazy] chunk failed to load', err);
        return { default: RecoveryNotice as unknown as T };
      }
    }
  });
}
