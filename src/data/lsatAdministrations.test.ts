import { describe, expect, it } from 'vitest';
import {
  LSAT_ADMINISTRATIONS,
  administrationFor,
  registrationClosed,
  upcomingAdministrations,
} from './lsatAdministrations';

describe('lsatAdministrations', () => {
  it('holds real LSAC sittings in order, none of them invented', () => {
    const dates = LSAT_ADMINISTRATIONS.map((s) => s.date);
    expect(dates).toEqual([...dates].sort());
    expect(administrationFor('2026-11-11')?.label).toBe('November 2026');
    expect(administrationFor('2026-11-12')).toBeUndefined();
  });

  it('offers only sittings a student can still sit', () => {
    const upcoming = upcomingAdministrations(new Date('2026-10-20T12:00:00Z'));
    expect(upcoming[0].label).toBe('November 2026');
    expect(upcoming.some((s) => s.label === 'October 2026')).toBe(false);
  });

  it('runs out rather than inventing dates past the published calendar', () => {
    expect(upcomingAdministrations(new Date('2028-01-01T12:00:00Z'))).toEqual([]);
  });

  it('knows when registration has closed on a sitting still to come', () => {
    const november = administrationFor('2026-11-11')!;
    expect(registrationClosed(november, new Date('2026-09-15T12:00:00Z'))).toBe(false);
    expect(registrationClosed(november, new Date('2026-10-15T12:00:00Z'))).toBe(true);
  });
});
