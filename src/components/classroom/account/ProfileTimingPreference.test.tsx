import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROFILE_TIMING_KEY, settingsKeyFor } from '@/lib/studySettings';

const auth = vi.hoisted(() => ({ user: { id: 'a' } as any, session: null as any, authReady: true }));
const api = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: api } }));
import { UserSettingsProvider, useUserSettings } from '@/contexts/UserSettingsContext';
import { ProfileTimingPreference } from './ProfileTimingPreference';

let context: ReturnType<typeof useUserSettings>;
function Probe() { context = useUserSettings(); return <output>{context.ownerId}:{context.settings.defaultTimingMode}:{context.settings.recycleAfterDays}</output>; }
const ui = () => <UserSettingsProvider><ProfileTimingPreference compact /><Probe /></UserSettingsProvider>;
const metadata = (mode: string) => ({ [PROFILE_TIMING_KEY]: { version: 1, mode } });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  localStorage.clear();
  auth.user = { id: 'a' }; auth.session = null; auth.authReady = true;
  api.getUser.mockReset().mockImplementation(async () => ({ data: { user: { id: auth.user?.id, user_metadata: auth.session?.user?.user_metadata } }, error: null }));
  api.updateUser.mockReset().mockImplementation(async ({ data }) => ({ data: { user: { id: auth.user?.id, user_metadata: data } }, error: null }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('profile-wide practice timing', () => {
  it('hydrates the account copy before children consume the default and preserves local pool preferences', async () => {
    auth.session = { user: { id: 'a', user_metadata: metadata('70') } };
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: '35', recycleAfterDays: 7, allowRepeats: true }));
    render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('saved'));
    expect(context.settings).toMatchObject({ defaultTimingMode: '70', recycleAfterDays: 7, allowRepeats: true });
    expect(screen.getByRole('combobox', { name: 'Profile time accommodation' })).toHaveValue('70');
    expect(screen.getByRole('button', { name: 'Saved to profile' })).toBeDisabled();
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it('saves only after explicit action and confirms the owner-scoped metadata response', async () => {
    render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('not-saved'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '52.5' } });
    expect(context.settings.defaultTimingMode).toBe('35');
    expect(api.updateUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save to profile' }));
    await screen.findByRole('button', { name: 'Saved to profile' });
    expect(api.updateUser).toHaveBeenCalledWith({ data: metadata('52.5') });
    expect(context.settings.defaultTimingMode).toBe('52.5');
    expect(JSON.parse(localStorage.getItem(settingsKeyFor('a'))!)).toMatchObject({ defaultTimingMode: '52.5' });
  });

  it('keeps the original timing and offers retry when the profile write fails', async () => {
    api.updateUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'network' } });
    render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('not-saved'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save to profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not saved');
    expect(context.settings.defaultTimingMode).toBe('35');
    expect(screen.queryByRole('button', { name: 'Saved to profile' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save to profile' }));
    await screen.findByRole('button', { name: 'Saved to profile' });
    expect(context.settings.defaultTimingMode).toBe('70');
  });

  it('does not write if the account changes while identity is being verified', async () => {
    const check = deferred<any>(); api.getUser.mockReturnValue(check.promise);
    const { rerender } = render(ui());
    let result!: Promise<boolean>;
    act(() => { result = context.saveProfileTiming('70'); });
    auth.user = { id: 'b' }; rerender(ui());
    await act(async () => { check.resolve({ data: { user: { id: 'a' } }, error: null }); await result; });
    expect(api.updateUser).not.toHaveBeenCalled();
    expect(context.ownerId).toBe('b'); expect(context.settings.defaultTimingMode).toBe('35');
  });

  it('ignores a late save response after another account becomes active', async () => {
    const write = deferred<any>(); api.updateUser.mockReturnValue(write.promise);
    const { rerender } = render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('not-saved'));
    let result!: Promise<boolean>;
    act(() => { result = context.saveProfileTiming('52.5'); });
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(1));
    auth.user = { id: 'b' }; auth.session = { user: { id: 'b', user_metadata: metadata('70') } }; rerender(ui());
    await act(async () => { write.resolve({ data: { user: { id: 'a', user_metadata: metadata('52.5') } }, error: null }); await result; });
    expect(context.ownerId).toBe('b'); expect(context.settings.defaultTimingMode).toBe('70');
    expect(context.profileTimingMode).toBe('70');
  });

  it('blocks duplicate pending saves and rejects an unconfirmed returned value', async () => {
    const write = deferred<any>(); api.updateUser.mockReturnValue(write.promise);
    render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('not-saved'));
    let first!: Promise<boolean>; let second!: Promise<boolean>;
    act(() => { first = context.saveProfileTiming('70'); second = context.saveProfileTiming('52.5'); });
    expect(await second).toBe(false);
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledTimes(1));
    await act(async () => { write.resolve({ data: { user: { id: 'a', user_metadata: metadata('35') } }, error: null }); await first; });
    expect(context.profileTimingStatus).toBe('error'); expect(context.settings.defaultTimingMode).toBe('35');
  });

  it('reads refreshed session metadata even when the Auth user object is retained', () => {
    const { rerender } = render(ui());
    const retainedUser = auth.user;
    auth.session = { user: { id: 'a', user_metadata: metadata('52.5') } }; rerender(ui());
    expect(auth.user).toBe(retainedUser);
    expect(context.settings.defaultTimingMode).toBe('52.5');
    act(() => context.updateSettings({ defaultTimingMode: '70' }));
    auth.session = { user: { id: 'a', user_metadata: metadata('52.5') } }; rerender(ui());
    expect(context.settings.defaultTimingMode).toBe('70');
  });

  it('keeps a successful account save truthful when the local cache is unavailable', async () => {
    render(ui());
    await waitFor(() => expect(context.profileTimingStatus).toBe('not-saved'));
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await act(async () => { expect(await context.saveProfileTiming('70')).toBe(true); });
    expect(context.profileTimingStatus).toBe('saved'); expect(context.saveState).toBe('unsaved');
    expect(context.settings.defaultTimingMode).toBe('70');
  });

  it('refreshes cached auth timing from the account and ignores a delayed read after a newer edit', async () => {
    const read = deferred<any>(); api.getUser.mockReturnValue(read.promise);
    auth.session = { user: { id: 'a', user_metadata: metadata('35') } };
    render(ui());
    act(() => context.updateSettings({ defaultTimingMode: '70' }));
    await act(async () => { read.resolve({ data: { user: { id: 'a', user_metadata: metadata('52.5') } }, error: null }); });
    expect(context.settings.defaultTimingMode).toBe('70');
    expect(context.profileTimingStatus).not.toBe('loading');
  });

  it('loads a timing change made on another device even when the cached session is older', async () => {
    auth.session = { user: { id: 'a', user_metadata: metadata('35') } };
    api.getUser.mockResolvedValue({ data: { user: { id: 'a', user_metadata: metadata('70') } }, error: null });
    render(ui());
    await waitFor(() => expect(context.settings.defaultTimingMode).toBe('70'));
    expect(context.profileTimingStatus).toBe('saved');
  });

  it('preserves cached timing with an honest error when the account refresh fails', async () => {
    auth.session = { user: { id: 'a', user_metadata: metadata('35') } };
    localStorage.setItem(settingsKeyFor('a'), JSON.stringify({ defaultTimingMode: '70' }));
    api.getUser.mockRejectedValue(new Error('offline'));
    render(ui());
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be checked');
    expect(context.settings.defaultTimingMode).toBe('70');
    expect(context.profileTimingStatus).toBe('error');
  });
});
