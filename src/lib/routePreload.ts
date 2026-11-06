/**
 * Route chunk prefetching.
 *
 * Heavy classroom routes are code-split, so the chunk fetch starts at click
 * time and the student watches a Suspense fallback that a hover could have
 * avoided. Hover reliably precedes the click by a few hundred milliseconds,
 * which is usually enough for the chunk to land and parse.
 *
 * Each preloader wraps the SAME dynamic import expression the route's
 * React.lazy() uses. The bundler dedupes them into one chunk and the module
 * registry dedupes the second call, so the `started` guard is only about not
 * churning the microtask queue on every mouseenter.
 */

const started = new Set<string>();

const once = (key: string, load: () => Promise<unknown>) => () => {
  if (started.has(key)) return;
  started.add(key);
  // A failed prefetch must stay silent: the route's own lazy() will retry and
  // surface the error properly if the student actually navigates there.
  void load().catch(() => {
    started.delete(key);
  });
};

/** The drill hub's loader. App.tsx passes this to React.lazy so the prefetch
 *  and the route resolve the same module id and share one chunk. */
export const loadDrillHub = () => import("@/pages/DrillsEntry");

export const preloadDrillHub = once("drill-hub", loadDrillHub);
