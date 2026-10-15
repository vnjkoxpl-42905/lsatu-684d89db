import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  LEGACY_SETTINGS_KEY,
  legacyOfferSummary,
  normalizeSettings,
  parseRecycleDays,
  poolConsequence,
  readSettingsFor,
  settingsKeyFor,
  timingConsequence,
  writeSettingsFor,
} from './studySettings';

function memoryStorage(initial: Record<string, string> = {}, opts: { failWrites?: boolean; failReads?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => {
      if (opts.failReads) throw new Error('SecurityError');
      return data.has(k) ? (data.get(k) as string) : null;
    },
    setItem: (k: string, v: string) => {
      if (opts.failWrites) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
  };
}

describe('normalizeSettings', () => {
  it('repairs bad fields one by one and keeps good ones', () => {
    const out = normalizeSettings({
      defaultTimingMode: '90',
      allowRepeats: 'yes',
      preferUnseen: false,
      recycleAfterDays: 0,
      extra: 1,
    });
    expect(out.defaultTimingMode).toBe('35');
    expect(out.allowRepeats).toBe(false);
    expect(out.preferUnseen).toBe(false);
    expect(out.recycleAfterDays).toBe(30);
    expect('extra' in out).toBe(false);
  });

  it('accepts a timing stored as a number by an older form', () => {
    expect(normalizeSettings({ defaultTimingMode: 52.5 }).defaultTimingMode).toBe('52.5');
    expect(normalizeSettings({ defaultTimingMode: 70 }).defaultTimingMode).toBe('70');
  });

  it('treats non-objects as defaults', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });
});

describe('parseRecycleDays', () => {
  it('accepts whole days in range only', () => {
    expect(parseRecycleDays('14')).toBe(14);
    expect(parseRecycleDays('')).toBeNull();
    expect(parseRecycleDays('0')).toBeNull();
    expect(parseRecycleDays('366')).toBeNull();
    expect(parseRecycleDays('2.5')).toBeNull();
  });
});

describe('per-account storage', () => {
  it('reads only the signed-in account\'s key', () => {
    const s = memoryStorage({ [settingsKeyFor('a')]: JSON.stringify({ defaultTimingMode: '70' }) });
    expect(readSettingsFor(s, 'a')).toMatchObject({ source: 'saved', settings: { defaultTimingMode: '70' } });
    expect(readSettingsFor(s, 'b')).toMatchObject({ source: 'default', settings: { defaultTimingMode: '35' } });
    expect(readSettingsFor(s, null).source).toBe('default');
  });

  it('never applies the old device-wide settings; it only offers them to an account with nothing stored', () => {
    const legacyRaw = JSON.stringify({ defaultTimingMode: '70', allowRepeats: true });
    const s = memoryStorage({ [LEGACY_SETTINGS_KEY]: legacyRaw });
    for (const id of ['a', 'b']) {
      const read = readSettingsFor(s, id);
      expect(read.source).toBe('default');
      expect(read.settings).toEqual(DEFAULT_SETTINGS);
      expect(read.legacyOffer).toMatchObject({ defaultTimingMode: '70', allowRepeats: true });
    }
    s.data.set(settingsKeyFor('a'), JSON.stringify({ recycleAfterDays: 9 }));
    expect(readSettingsFor(s, 'a').legacyOffer).toBeNull();
    // The old key is never changed.
    expect(s.data.get(LEGACY_SETTINGS_KEY)).toBe(legacyRaw);
  });

  it('offers nothing when the old key is default, broken or unreadable', () => {
    expect(readSettingsFor(memoryStorage({ [LEGACY_SETTINGS_KEY]: JSON.stringify(DEFAULT_SETTINGS) }), 'a').legacyOffer).toBeNull();
    expect(readSettingsFor(memoryStorage({ [LEGACY_SETTINGS_KEY]: '{oops' }), 'a').legacyOffer).toBeNull();
  });

  it('treats a refused read as unavailable, not as "nothing stored"', () => {
    const s = memoryStorage({ [LEGACY_SETTINGS_KEY]: JSON.stringify({ defaultTimingMode: '70' }) }, { failReads: true });
    expect(readSettingsFor(s, 'a')).toEqual({ settings: DEFAULT_SETTINGS, source: 'unavailable', legacyOffer: null });
    expect(readSettingsFor(null, 'a').source).toBe('unavailable');
  });

  it('reports unreadable JSON instead of throwing', () => {
    const s = memoryStorage({ [settingsKeyFor('a')]: '{not json' });
    expect(readSettingsFor(s, 'a')).toMatchObject({ source: 'unreadable', settings: DEFAULT_SETTINGS });
  });

  it('returns false on a refused write rather than throwing', () => {
    const s = memoryStorage({}, { failWrites: true });
    expect(writeSettingsFor(s, 'a', DEFAULT_SETTINGS)).toBe(false);
    expect(writeSettingsFor(null, 'a', DEFAULT_SETTINGS)).toBe(false);
  });

  it('summarises an offer in plain words', () => {
    expect(legacyOfferSummary({ ...DEFAULT_SETTINGS, defaultTimingMode: '70' })).toBe(
      'section time 70:00, double time, no repeats, new questions first, questions come back after 30 days',
    );
  });
});

describe('consequence copy', () => {
  it('says timing applies to sections started later and not to running or past ones', () => {
    const text = timingConsequence('70');
    expect(text).toContain('70 minutes');
    expect(text).toContain('A section already running keeps its clock');
    expect(timingConsequence('unlimited')).toContain('without a countdown');
  });

  it('describes the pool the way the drill actually filters it', () => {
    expect(poolConsequence({ allowRepeats: true, preferUnseen: false, recycleAfterDays: 30 })).toContain('every question');
    expect(poolConsequence({ allowRepeats: true, preferUnseen: true, recycleAfterDays: 30 })).toContain('never answered while any are left, then draws from every question');
    expect(poolConsequence({ allowRepeats: false, preferUnseen: true, recycleAfterDays: 1 })).toContain('1 day after');
    expect(poolConsequence({ allowRepeats: false, preferUnseen: false, recycleAfterDays: 14 })).toContain('more than 14 days ago');
  });

  it('uses no em dashes in student-facing copy', () => {
    const copy = [
      timingConsequence('35'),
      timingConsequence('52.5'),
      poolConsequence({ allowRepeats: false, preferUnseen: true, recycleAfterDays: 30 }),
    ].join(' ');
    expect(copy).not.toContain('—');
  });
});
