/**
 * A bootcamp that is still being finished must not reach students, and the
 * rule is easy to break by adding a new surface that forgets to check the flag.
 * These lock the two decisions the flag exists to make.
 */

import { describe, expect, it } from 'vitest';
import { BOOTCAMPS, type BootcampDef } from './bootcamps';

/** The filter used by the student-facing library (src/pages/Bootcamps.tsx). */
function visibleTo(isAdmin: boolean, assigned: Set<string>): BootcampDef[] {
  return isAdmin ? BOOTCAMPS : BOOTCAMPS.filter((b) => !b.adminOnly && assigned.has(b.id));
}

describe('bootcamp library visibility', () => {
  const everyId = new Set(BOOTCAMPS.map((b) => b.id));

  it('hides admin-only bootcamps from a student even when assigned', () => {
    const adminOnly = BOOTCAMPS.filter((b) => b.adminOnly);
    expect(adminOnly.length).toBeGreaterThan(0);
    const visible = visibleTo(false, everyId).map((b) => b.id);
    for (const bootcamp of adminOnly) expect(visible).not.toContain(bootcamp.id);
  });

  it('still shows admin-only bootcamps to an admin', () => {
    const visible = visibleTo(true, new Set()).map((b) => b.id);
    for (const bootcamp of BOOTCAMPS.filter((b) => b.adminOnly)) {
      expect(visible).toContain(bootcamp.id);
    }
  });

  it('leaves released bootcamps assignable as before', () => {
    const released = BOOTCAMPS.filter((b) => !b.adminOnly);
    const visible = visibleTo(false, everyId).map((b) => b.id);
    for (const bootcamp of released) expect(visible).toContain(bootcamp.id);
  });

  it('shows a student nothing they were not assigned', () => {
    expect(visibleTo(false, new Set())).toHaveLength(0);
  });

  it('keeps the RC bootcamp admin-only until it is released', () => {
    const rc = BOOTCAMPS.find((b) => b.id === 'rc-engaging-with-the-passage');
    expect(rc?.adminOnly).toBe(true);
  });
});
