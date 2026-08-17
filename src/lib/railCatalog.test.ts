import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RAIL_CATALOG, type RailItemId } from './railCatalog';

/**
 * The rail draws a padlock from an item's flags. The route enforces its own.
 * When the two disagree the padlock is decorative and the student reaches the
 * content by typing the URL, which is exactly what shipped for /bootcamps
 * (no guard at all) and for the `allowSignedIn` routes (flags never ran).
 *
 * These tests read src/App.tsx as text rather than rendering it. Mounting the
 * route tree drags in Supabase, auth and every lazy page; the question here is
 * only what the route table declares, and the text answers it.
 */

const APP_SOURCE = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

/** The rail item -> the path its route registers under. */
const ROUTE_FOR: Record<RailItemId, string> = {
  home: '/classroom',
  notes: '/classroom',
  work: '/classroom',
  drill: 'drill',
  bootcamps: '/bootcamps',
  activities: '/activities',
  journal: '/journal',
  flagged: '/flagged',
  analytics: '/analytics',
  messages: '/inbox/*',
  // Schedule owns booking: `/booking` is the same shell with the Book tab
  // open, so there is no separate `booking` rail item to map.
  schedule: '/schedule',
};

/**
 * The `element={...}` text for a `<Route path="X">`, up to the next `<Route`.
 * Good enough to answer "is there a guard, and on what flags".
 */
function routeElement(path: string): string {
  const start = APP_SOURCE.indexOf(`path="${path}"`);
  expect(start, `no route registered for path "${path}"`).toBeGreaterThan(-1);
  const rest = APP_SOURCE.slice(start);
  const next = rest.indexOf('<Route', 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('rail catalog agrees with the route table', () => {
  it('every rail item maps to a route this test knows about', () => {
    for (const item of RAIL_CATALOG) {
      expect(ROUTE_FOR[item.id], `rail item "${item.id}" has no route`).toBeTruthy();
    }
  });

  it.each(RAIL_CATALOG.filter((i) => i.flags.length > 0))(
    'a padlocked item is enforced by its route: $id',
    (item) => {
      const element = routeElement(ROUTE_FOR[item.id]);

      // A padlock over an unguarded route is the /bootcamps bug.
      expect(
        element.includes('ProtectedRoute'),
        `rail padlocks "${item.id}" on ${item.flags.join('/')} but its route has no ProtectedRoute`,
      ).toBe(true);

      // The route has to gate on at least one flag the rail padlocks on,
      // or the two are guarding different things.
      expect(
        item.flags.some((flag) => element.includes(flag)),
        `rail padlocks "${item.id}" on ${item.flags.join('/')}, its route gates on something else`,
      ).toBe(true);
    },
  );

  it.each(RAIL_CATALOG)(
    'allowSignedIn matches the route: $id',
    (item) => {
      const element = routeElement(ROUTE_FOR[item.id]);
      const routeAllowsSignedIn = element.includes('allowSignedIn');

      expect(
        !!item.allowSignedIn,
        routeAllowsSignedIn
          ? `route for "${item.id}" lets any signed-in user through, so the rail must not padlock it (set allowSignedIn: true)`
          : `rail marks "${item.id}" allowSignedIn but its route does not, so the rail unlocks a door the route keeps shut`,
      ).toBe(routeAllowsSignedIn);
    },
  );
});
