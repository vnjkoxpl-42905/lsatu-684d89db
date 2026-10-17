import * as React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_SETTINGS_KEY, settingsKeyFor } from '@/lib/studySettings';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, authReady: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { UserSettingsProvider, useUserSettings } from './UserSettingsContext';

type Ctx = ReturnType<typeof useUserSettings>;
let ctx: Ctx;
function Probe() {
  ctx = useUserSettings();
  return (
    <output data-testid="probe">
      {`${ctx.ownerId ?? 'none'}|${ctx.settings.defaultTimingMode}|${ctx.settings.recycleAfterDays}|${ctx.saveState}`}
    </output>
  );
}

function Harness() {
  return (
    <UserSettingsProvider>
      <Probe />
    </UserSettingsProvider>
  );
}

const probe = () => screen.getByTestId('probe').textContent;
const stored = (id: string) => JSON.parse(localStorage.getItem(settingsKeyFor(id)) ?? 'null');

function switchTo(id: string | null, rerender: (ui: React.ReactElement) => void) {
  auth.user = id ? { id } : null;
  rerender(<Harness />);
}

beforeEach(() => {
  localStorage.clear();
  auth.user = null;
  auth.authReady = true;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UserSettingsProvider account isolation', () => {
  it('swaps settings on A -> B -> A while mounted and never saves A\'s values under B', () => {
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: '70' }));
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    expect(probe()).toBe('a|70|30|saved');

    switchTo('b', rerender);
    expect(probe()).toBe('b|35|30|saved');
    act(() => {
      ctx.updateSettings({ recycleAfterDays: 7 });
    });
    expect(stored('b')).toMatchObject({ defaultTimingMode: '35', recycleAfterDays: 7 });
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70' });
    expect(stored('a').recycleAfterDays).toBeUndefined();

    switchTo('a', rerender);
    expect(probe()).toBe('a|70|30|saved');
  });

  it('shows defaults after logout and the right account after logging back in', () => {
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: '52.5' }));
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    switchTo(null, rerender);
    expect(probe()).toBe('none|35|30|signed-out');
    switchTo('b', rerender);
    expect(probe()).toBe('b|35|30|saved');
    switchTo('a', rerender);
    expect(probe()).toBe('a|52.5|30|saved');
  });

  it('ignores a stale update from the previous account after a switch', () => {
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    const staleUpdate = ctx.updateSettings;
    switchTo('b', rerender);
    let wrote = true;
    act(() => {
      wrote = staleUpdate({ defaultTimingMode: 'unlimited' });
    });
    expect(wrote).toBe(false);
    expect(probe()).toBe('b|35|30|saved');
    expect(localStorage.getItem(settingsKeyFor('b'))).toBeNull();
    expect(localStorage.getItem(settingsKeyFor('a'))).toBeNull();
  });
});

describe('UserSettingsProvider failed writes', () => {
  it('keeps every edit made while writes fail, then saves the latest on retry', () => {
    auth.user = { id: 'a' };
    render(<Harness />);
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    act(() => {
      ctx.updateSettings({ defaultTimingMode: '70' });
    });
    act(() => {
      ctx.updateSettings({ recycleAfterDays: 10 });
    });
    // The second edit built on the first, not on the stale stored snapshot.
    expect(probe()).toBe('a|70|10|unsaved');

    spy.mockRestore();
    let ok = false;
    act(() => {
      ok = ctx.retrySave();
    });
    expect(ok).toBe(true);
    expect(probe()).toBe('a|70|10|saved');
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70', recycleAfterDays: 10 });
  });

  it('builds two quick edits in one tick on each other', () => {
    auth.user = { id: 'a' };
    render(<Harness />);
    act(() => {
      ctx.updateSettings({ defaultTimingMode: '52.5' });
      ctx.updateSettings({ recycleAfterDays: 3 });
    });
    expect(stored('a')).toMatchObject({ defaultTimingMode: '52.5', recycleAfterDays: 3 });
  });

  it('keeps A\'s unsaved edits for A across A -> B -> A, hides them from B, and drops them on logout', () => {
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    act(() => {
      ctx.updateSettings({ defaultTimingMode: '70' });
    });
    spy.mockRestore();

    switchTo('b', rerender);
    expect(probe()).toBe('b|35|30|saved');
    switchTo('a', rerender);
    expect(probe()).toBe('a|70|30|unsaved');

    switchTo(null, rerender);
    switchTo('a', rerender);
    expect(probe()).toBe('a|35|30|saved');
  });
});

describe('UserSettingsProvider stored data', () => {
  it('repairs invalid stored fields without discarding good ones', () => {
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: 'fast', recycleAfterDays: 12 }));
    auth.user = { id: 'a' };
    render(<Harness />);
    expect(probe()).toBe('a|35|12|saved');
  });

  it('never attributes the old device-wide settings to anyone automatically, across A -> B -> A', () => {
    const legacyRaw = JSON.stringify({ defaultTimingMode: '70' });
    localStorage.setItem(LEGACY_SETTINGS_KEY, legacyRaw);
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    expect(probe()).toBe('a|35|30|saved');
    expect(ctx.legacyOffer).toMatchObject({ defaultTimingMode: '70' });
    expect(localStorage.getItem(settingsKeyFor('a'))).toBeNull();
    switchTo('b', rerender);
    expect(probe()).toBe('b|35|30|saved');
    switchTo('a', rerender);
    expect(probe()).toBe('a|35|30|saved');
    expect(localStorage.getItem(LEGACY_SETTINGS_KEY)).toBe(legacyRaw);
  });

  it('copies the old settings only to the account that explicitly chooses them', () => {
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ defaultTimingMode: '70' }));
    auth.user = { id: 'a' };
    const { rerender } = render(<Harness />);
    act(() => {
      expect(ctx.adoptLegacy()).toBe(true);
    });
    expect(probe()).toBe('a|70|30|saved');
    expect(ctx.legacyOffer).toBeNull();
    switchTo('b', rerender);
    expect(probe()).toBe('b|35|30|saved');
    expect(localStorage.getItem(settingsKeyFor('b'))).toBeNull();
    switchTo('a', rerender);
    expect(probe()).toBe('a|70|30|saved');
  });

  it('keeps an explicitly chosen old setting when the write fails, and saves it on retry', () => {
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ defaultTimingMode: '70' }));
    auth.user = { id: 'a' };
    render(<Harness />);
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    act(() => {
      expect(ctx.adoptLegacy()).toBe(false);
    });
    act(() => {
      ctx.updateSettings({ recycleAfterDays: 4 });
    });
    expect(probe()).toBe('a|70|4|unsaved');
    spy.mockRestore();
    act(() => {
      ctx.retrySave();
    });
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70', recycleAfterDays: 4 });
  });

  it('when reads are refused, uses defaults, offers nothing, and never overwrites the unread saved value', () => {
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: '70', allowRepeats: true }));
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ defaultTimingMode: '52.5' }));
    const get = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    auth.user = { id: 'a' };
    render(<Harness />);
    expect(probe()).toBe('a|35|30|saved');
    expect(ctx.source).toBe('unavailable');
    expect(ctx.legacyOffer).toBeNull();

    act(() => {
      ctx.updateSettings({ recycleAfterDays: 8 });
    });
    act(() => {
      ctx.updateSettings({ preferUnseen: false });
    });
    expect(probe()).toBe('a|35|8|unsaved');
    // Nothing was written over the saved value the page never read.
    expect(get).toHaveBeenCalled();
    get.mockRestore();
    expect(stored('a')).toEqual({ defaultTimingMode: '70', allowRepeats: true });

    // Reads work again: the saved value is kept and only the changed fields
    // are laid on top.
    act(() => {
      ctx.retrySave();
    });
    expect(probe()).toBe('a|70|8|saved');
    expect(stored('a')).toMatchObject({ defaultTimingMode: '70', allowRepeats: true, recycleAfterDays: 8, preferUnseen: false });
  });

  it('is not ready until auth has resolved', () => {
    auth.authReady = false;
    render(<Harness />);
    expect(ctx.ready).toBe(false);
  });
});
