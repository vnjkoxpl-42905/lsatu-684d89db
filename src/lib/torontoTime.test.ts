import { describe, expect, it } from 'vitest';
import { torontoDayKey, torontoExactTime, torontoExactTimeYear, torontoMediumDate, torontoShortDate } from './torontoTime';

describe('Toronto time formatting', () => {
  it('moves the calendar day at Toronto midnight, not UTC midnight', () => {
    // 2026-10-28 03:59:59Z is 23:59:59 EDT on the 27th; 04:00:00Z is midnight on the 28th.
    expect(torontoDayKey('2026-10-28T03:59:59Z')).toBe('2026-10-27');
    expect(torontoDayKey('2026-10-28T04:00:00Z')).toBe('2026-10-28');
  });

  it('follows the winter offset after the November change', () => {
    expect(torontoDayKey('2026-11-02T04:59:59Z')).toBe('2026-11-01');
    expect(torontoDayKey('2026-11-02T05:00:00Z')).toBe('2026-11-02');
  });

  it('adds the year where a span can cross years', () => {
    expect(torontoMediumDate('2026-01-01T04:59:59Z')).toBe('Dec 31, 2025');
    expect(torontoExactTimeYear('2026-10-28T23:05:00Z')).toContain('2026');
  });

  it('labels exact times with the zone', () => {
    expect(torontoExactTime('2026-10-28T23:05:00Z')).toBe('Oct 28, 7:05 PM EDT');
    expect(torontoShortDate('2026-10-28T03:00:00Z')).toBe('Oct 27');
  });
});
