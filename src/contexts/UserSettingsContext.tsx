import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  readSettingsFor,
  writeSettingsFor,
  PROFILE_TIMING_KEY,
  isTimingMode,
  readProfileTiming,
  type TimingMode,
  type SettingsSource,
  type UserSettings,
} from '@/lib/studySettings';

export type { UserSettings } from '@/lib/studySettings';

/**
 * saved      written to this browser for the signed-in account (or nothing
 *            has been changed since a clean read)
 * unsaved    the browser refused the write; the value is in force in this tab
 *            only, and a retry writes the latest value
 * signed-out nobody to save for; defaults are in force
 */
export type SettingsSaveState = 'saved' | 'unsaved' | 'signed-out';
export type ProfileTimingStatus = 'not-saved' | 'loading' | 'saving' | 'saved' | 'error' | 'signed-out';

interface UserSettingsContextType {
  settings: UserSettings;
  /** Applies at once. Returns whether the change was written to storage. */
  updateSettings: (updates: Partial<UserSettings>) => boolean;
  saveState: SettingsSaveState;
  /** Writes the current value again. Returns whether it was written. */
  retrySave: () => boolean;
  /**
   * How the account's stored settings were read. `unreadable`/`unavailable`
   * mean defaults are in force because the saved value could not be read.
   */
  source: SettingsSource;
  /**
   * Settings saved in this browser before settings belonged to accounts.
   * Offered only to an account with nothing stored; never applied unless the
   * person chooses them with `adoptLegacy`.
   */
  legacyOffer: UserSettings | null;
  adoptLegacy: () => boolean;
  /** The account these settings belong to, or null when signed out. */
  ownerId: string | null;
  /** False until auth has resolved and settings belong to the current account. */
  ready: boolean;
  profileTimingMode: TimingMode | null;
  profileTimingStatus: ProfileTimingStatus;
  profileTimingError: string | null;
  /** Explicit account write. Does not change a running session's frozen clock. */
  saveProfileTiming: (mode: TimingMode) => Promise<boolean>;
}

interface Snapshot {
  ownerId: string | null;
  settings: UserSettings;
  saveState: SettingsSaveState;
  source: SettingsSource;
  legacyOffer: UserSettings | null;
  /** Fields changed since the last successful write, kept for merging. */
  dirty: Partial<UserSettings>;
}

type Pending = Omit<Snapshot, 'ownerId'>;

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const UserSettingsContext = React.createContext<UserSettingsContextType | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, session, authReady } = useAuth();
  const actorId = user?.id ?? null;
  const accountUser = session?.user?.id === actorId ? session.user : user;
  const remoteTiming = readProfileTiming(accountUser?.user_metadata);
  const actorRef = React.useRef(actorId);
  actorRef.current = actorId;
  const profileBusy = React.useRef(new Set<string>());
  const timingRevision = React.useRef(0);
  const [profileState, setProfileState] = React.useState<{
    ownerId: string | null; mode: TimingMode | null; status: ProfileTimingStatus; error: string | null;
  }>({ ownerId: actorId, mode: remoteTiming, status: actorId ? 'loading' : 'signed-out', error: null });
  const observedRemote = React.useRef({ ownerId: actorId, mode: remoteTiming });

  // Edits the browser refused to store, per account, for this tab's lifetime.
  // Switching A -> B -> A brings A's unsaved edits back to A and never shows
  // them to B. Signing out drops them all, since the device may be changing
  // hands.
  const unsavedRef = React.useRef(new Map<string, Pending>());

  const load = React.useCallback((id: string | null): Snapshot => {
    if (!id) {
      return { ownerId: null, settings: { ...DEFAULT_SETTINGS }, saveState: 'signed-out', source: 'default', legacyOffer: null, dirty: {} };
    }
    const pending = unsavedRef.current.get(id);
    if (pending) return { ownerId: id, ...pending };
    const { settings, source, legacyOffer } = readSettingsFor(browserStorage(), id);
    return { ownerId: id, settings: source !== 'saved' && remoteTiming ? { ...settings, defaultTimingMode: remoteTiming } : settings, saveState: 'saved', source, legacyOffer, dirty: {} };
  }, [remoteTiming]);

  const [snapshot, setSnapshot] = React.useState<Snapshot>(() => load(actorId));

  // An actual actor change swaps the whole snapshot in the same render, so no
  // frame ever shows one account's settings while another is signed in.
  let current = snapshot;
  if (snapshot.ownerId !== actorId) {
    current = load(actorId);
    setSnapshot(current);
  }

  // The committed state every write builds on. Updated synchronously by
  // `apply`, so two quick edits never persist a stale snapshot.
  const latest = React.useRef(current);
  latest.current = current;

  React.useEffect(() => {
    if (actorId === null) unsavedRef.current.clear();
  }, [actorId]);

  const apply = React.useCallback((owner: string | null, updates: Partial<UserSettings>): boolean => {
    const base = latest.current;
    // A callback created for a previous account must not write into this one.
    if (base.ownerId !== owner) return false;
    const dirty = { ...base.dirty, ...updates };
    let settings = normalizeSettings({ ...base.settings, ...updates });
    let source = base.source;
    let next: Snapshot;
    let written = false;
    if (!owner) {
      next = { ...base, settings, saveState: 'signed-out', dirty };
    } else {
      const storage = browserStorage();
      let mayWrite = true;
      if (source === 'unavailable') {
        // The stored value was never read. Writing now could overwrite real
        // saved settings with defaults, so read first and lay only the
        // fields this person changed on top of whatever is stored.
        const fresh = readSettingsFor(storage, owner);
        if (fresh.source === 'unavailable') {
          mayWrite = false;
        } else {
          source = fresh.source;
          settings = normalizeSettings({ ...fresh.settings, ...dirty });
        }
      }
      written = mayWrite && writeSettingsFor(storage, owner, settings);
      next = {
        ownerId: owner,
        settings,
        saveState: written ? 'saved' : 'unsaved',
        source: written ? 'saved' : source,
        // Once the account holds its own value, in memory or stored, the old
        // device-wide offer no longer applies.
        legacyOffer: null,
        dirty: written ? {} : dirty,
      };
      if (written) unsavedRef.current.delete(owner);
      else {
        const { ownerId: _owner, ...pending } = next;
        unsavedRef.current.set(owner, pending);
      }
    }
    latest.current = next;
    setSnapshot(next);
    return written;
  }, []);

  const ownerId = current.ownerId;
  const updateSettings = React.useCallback(
    (updates: Partial<UserSettings>) => {
      if (updates.defaultTimingMode !== undefined) {
        timingRevision.current += 1;
        if (actorRef.current === ownerId) setProfileState(previous => ({ ...previous, status: previous.mode ? 'saved' : 'not-saved', error: null }));
      }
      return apply(ownerId, updates);
    },
    [apply, ownerId],
  );
  const retrySave = React.useCallback(() => apply(ownerId, {}), [apply, ownerId]);
  const adoptLegacy = React.useCallback(() => {
    const offer = latest.current.ownerId === ownerId ? latest.current.legacyOffer : null;
    if (offer) timingRevision.current += 1;
    return offer ? apply(ownerId, { ...offer, ...(remoteTiming ? { defaultTimingMode: remoteTiming } : {}) }) : false;
  }, [apply, ownerId, remoteTiming]);

  // Session metadata is the account copy. AuthContext intentionally retains
  // the same `user` object for token refreshes, so use session.user above.
  // Only a changed remote value hydrates timing; unrelated auth refreshes must
  // not erase a newer local-only timing edit or any question-pool preference.
  React.useEffect(() => {
    const previous = observedRemote.current;
    observedRemote.current = { ownerId: actorId, mode: remoteTiming };
    if (previous.ownerId !== actorId) {
      setProfileState({ ownerId: actorId, mode: remoteTiming, status: actorId ? 'loading' : 'signed-out', error: null });
    } else if (previous.mode !== remoteTiming) {
      timingRevision.current += 1;
      setProfileState({ ownerId: actorId, mode: remoteTiming, status: actorId ? remoteTiming ? 'saved' : 'not-saved' : 'signed-out', error: null });
      if (actorId && remoteTiming) apply(actorId, { defaultTimingMode: remoteTiming });
    }
  }, [actorId, remoteTiming, apply]);

  // A cached auth session can predate a save on another device. Refresh only
  // this account preference, and never lay a delayed read over a newer edit.
  React.useEffect(() => {
    if (!actorId || authReady === false) return;
    let cancelled = false;
    const revision = timingRevision.current;
    setProfileState(previous => ({ ...previous, ownerId: actorId, status: 'loading', error: null }));
    void supabase.auth.getUser().then(result => {
      if (cancelled || actorRef.current !== actorId || timingRevision.current !== revision) return;
      if (result.error || result.data.user?.id !== actorId) throw new Error('profile-read-failed');
      const mode = readProfileTiming(result.data.user.user_metadata);
      if (mode) apply(actorId, { defaultTimingMode: mode });
      setProfileState({ ownerId: actorId, mode, status: mode ? 'saved' : 'not-saved', error: null });
    }).catch(() => {
      if (!cancelled && actorRef.current === actorId && timingRevision.current === revision) {
        setProfileState(previous => ({ ...previous, ownerId: actorId, status: 'error', error: 'Profile timing could not be checked. Your last known timing is still in use. Save to profile to confirm your choice.' }));
      }
    });
    return () => { cancelled = true; };
  }, [actorId, authReady, apply]);

  const saveProfileTiming = React.useCallback(async (mode: TimingMode): Promise<boolean> => {
    if (!ownerId || actorRef.current !== ownerId || authReady === false || !isTimingMode(mode) || profileBusy.current.has(ownerId)) return false;
    timingRevision.current += 1;
    profileBusy.current.add(ownerId);
    setProfileState(previous => ({ ...previous, ownerId, status: 'saving', error: null }));
    try {
      const checked = await supabase.auth.getUser();
      if (checked.error || checked.data.user?.id !== ownerId || actorRef.current !== ownerId) {
        throw new Error('account-changed');
      }
      const result = await supabase.auth.updateUser({ data: { [PROFILE_TIMING_KEY]: { version: 1, mode } } });
      if (actorRef.current !== ownerId) return false;
      if (result.error || result.data.user?.id !== ownerId || readProfileTiming(result.data.user.user_metadata) !== mode) {
        throw new Error('profile-not-confirmed');
      }
      apply(ownerId, { defaultTimingMode: mode });
      setProfileState({ ownerId, mode, status: 'saved', error: null });
      return true;
    } catch {
      if (actorRef.current === ownerId) setProfileState(previous => ({
        ...previous, ownerId, status: 'error',
        error: 'Your profile timing was not saved. Your current timing is unchanged. Try again.',
      }));
      return false;
    } finally {
      profileBusy.current.delete(ownerId);
    }
  }, [ownerId, authReady, apply]);

  const ownProfile = profileState.ownerId === actorId ? profileState : {
    ownerId: actorId, mode: remoteTiming,
    status: actorId ? 'loading' as const : 'signed-out' as const,
    error: null,
  };

  const value = React.useMemo<UserSettingsContextType>(
    () => ({
      settings: current.settings,
      updateSettings,
      saveState: current.saveState,
      retrySave,
      source: current.source,
      legacyOffer: current.legacyOffer,
      adoptLegacy,
      ownerId,
      ready: authReady !== false && ownerId === actorId,
      profileTimingMode: ownProfile.mode,
      profileTimingStatus: ownProfile.status,
      profileTimingError: ownProfile.error,
      saveProfileTiming,
    }),
    [actorId, adoptLegacy, authReady, current.legacyOffer, current.saveState, current.settings, current.source, ownerId, retrySave, updateSettings, ownProfile.mode, ownProfile.status, ownProfile.error, saveProfileTiming],
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings() {
  const context = React.useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return context;
}
