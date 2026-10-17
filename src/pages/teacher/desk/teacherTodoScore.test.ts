import { describe, expect, it } from 'vitest';
import { IMMINENT_BASE, TODO_BAND_BASE, isImminent, recencyPoints, todoScore } from './teacherTodoScore';

const NOW = Date.parse('2026-08-04T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

describe('recencyPoints', () => {
  it('peaks at now and decays to nothing past the horizon', () => {
    expect(recencyPoints(NOW, NOW)).toBe(999);
    expect(recencyPoints(NOW - 36 * HOUR, NOW)).toBe(500);
    expect(recencyPoints(NOW - 72 * HOUR, NOW)).toBe(0);
    expect(recencyPoints(NOW - 300 * HOUR, NOW)).toBe(0);
  });

  it('measures distance in both directions, so a soon event scores like a recent one', () => {
    expect(recencyPoints(NOW + 24 * HOUR, NOW)).toBe(recencyPoints(NOW - 24 * HOUR, NOW));
  });

  it('scores nothing rather than throwing on a missing or unparseable moment', () => {
    expect(recencyPoints(null, NOW)).toBe(0);
    expect(recencyPoints(undefined, NOW)).toBe(0);
    expect(recencyPoints('not a date', NOW)).toBe(0);
    expect(recencyPoints(0, NOW)).toBe(0);
  });

  it('never reaches the band width, so it cannot promote an item out of its band', () => {
    expect(recencyPoints(NOW, NOW)).toBeLessThan(1_000);
  });
});

describe('isImminent', () => {
  it('covers the next two hours and nothing else', () => {
    expect(isImminent(NOW + 30 * 60 * 1000, NOW)).toBe(true);
    expect(isImminent(NOW + 2 * HOUR, NOW)).toBe(true);
    expect(isImminent(NOW + 3 * HOUR, NOW)).toBe(false);
    // Already started — no longer something to be warned about.
    expect(isImminent(NOW - 5 * 60 * 1000, NOW)).toBe(false);
    expect(isImminent(null, NOW)).toBe(false);
  });
});

describe('todoScore', () => {
  it('ranks yesterday\'s student email above a routine event tomorrow', () => {
    const email = todoScore({ band: 'email', timestamp: NOW - 24 * HOUR, now: NOW });
    const tomorrow = NOW + 24 * HOUR;
    const calendar = todoScore({ band: 'calendar', timestamp: tomorrow, imminentAt: tomorrow, now: NOW });
    expect(email).toBeGreaterThan(calendar);
  });

  it('puts a session starting within two hours first', () => {
    const soon = NOW + 90 * 60 * 1000;
    const session = todoScore({ band: 'calendar', timestamp: soon, imminentAt: soon, now: NOW });
    const freshEmail = todoScore({ band: 'email', timestamp: NOW, now: NOW });
    const freshWork = todoScore({ band: 'work', timestamp: NOW, now: NOW });
    expect(session).toBeGreaterThan(freshEmail);
    expect(session).toBeGreaterThan(freshWork);
    expect(session).toBeGreaterThanOrEqual(IMMINENT_BASE);
  });

  it('keeps the bands separated no matter how stale or fresh the items are', () => {
    const stalestEmail = todoScore({ band: 'email', timestamp: NOW - 500 * HOUR, now: NOW });
    const freshestWork = todoScore({ band: 'work', timestamp: NOW, now: NOW });
    const freshestCalendar = todoScore({ band: 'calendar', timestamp: NOW + 30 * HOUR, now: NOW });
    expect(stalestEmail).toBeGreaterThan(freshestWork);
    expect(freshestWork).toBeGreaterThan(freshestCalendar);
    expect(stalestEmail).toBe(TODO_BAND_BASE.email);
  });

  it('orders within a band by closeness to now', () => {
    const older = todoScore({ band: 'email', timestamp: NOW - 48 * HOUR, now: NOW });
    const newer = todoScore({ band: 'email', timestamp: NOW - 2 * HOUR, now: NOW });
    expect(newer).toBeGreaterThan(older);
  });

  it('orders calendar entries by how soon they start', () => {
    const sooner = NOW + 6 * HOUR;
    const later = NOW + 40 * HOUR;
    expect(
      todoScore({ band: 'calendar', timestamp: sooner, imminentAt: sooner, now: NOW }),
    ).toBeGreaterThan(
      todoScore({ band: 'calendar', timestamp: later, imminentAt: later, now: NOW }),
    );
  });
});
