import { describe, expect, it, vi } from 'vitest';
import { teachingNoteDate } from './teachingNoteDates';

describe('teaching note calendar dates', () => {
  it('groups a UTC month boundary in the same local month as its date label', () => {
    const value = teachingNoteDate('2026-10-01T01:00:00Z', 'America/Toronto');
    expect(value.key).toBe('2026-09');
    expect(value.month).toMatch(/September/);
    expect(value.label).toMatch(/Sep.*30/);
  });
  it('handles a local month ahead of UTC consistently', () => {
    const value = teachingNoteDate('2026-09-30T23:00:00Z', 'Asia/Tokyo');
    expect(value.key).toBe('2026-10');
    expect(value.label).toMatch(/Oct.*1/);
  });
  it('uses a clear fallback for missing or malformed dates', () => {
    for (const input of ['', 'not-a-date']) {
      expect(teachingNoteDate(input)).toEqual({ key: 'undated', month: 'Date unavailable', label: 'Date unavailable' });
    }
  });
  it.each(['fa-IR', 'th-TH'])('keeps labels and grouping Gregorian under the %s default calendar', (locale) => {
    const DateTimeFormat = Intl.DateTimeFormat;
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((selectedLocale, options) => new DateTimeFormat(selectedLocale ?? locale, options));
    try {
      const date = new Date('2026-10-01T01:00:00Z');
      const result = teachingNoteDate(date.toISOString(), 'America/Toronto');
      expect(result.key).toBe('2026-09');
      expect(result.month).toBe(new DateTimeFormat(locale, { calendar: 'gregory', timeZone: 'America/Toronto', month: 'long', year: 'numeric' }).format(date));
      expect(result.label).toBe(new DateTimeFormat(locale, { calendar: 'gregory', timeZone: 'America/Toronto', month: 'short', day: 'numeric', year: 'numeric' }).format(date));
      expect(spy.mock.calls.every(([, options]) => options?.calendar === 'gregory')).toBe(true);
    } finally { spy.mockRestore(); }
  });
});
