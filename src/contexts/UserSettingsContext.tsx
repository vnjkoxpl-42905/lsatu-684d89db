import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  readSettingsFor,
  writeSettingsFor,
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
  const { user, authReady } = useAuth();
  const actorId = user?.id ?? null;

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
    return { ownerId: id, settings, saveState: 'saved', source, legacyOffer, dirty: {} };
  }, []);

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
    (updates: Partial<UserSettings>) => apply(ownerId, updates),
    [apply, ownerId],
  );
  const retrySave = React.useCallback(() => apply(ownerId, {}), [apply, ownerId]);
  const adoptLegacy = React.useCallback(() => {
    const offer = latest.current.ownerId === ownerId ? latest.current.legacyOffer : null;
    return offer ? apply(ownerId, offer) : false;
  }, [apply, ownerId]);

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
    }),
    [actorId, adoptLegacy, authReady, current.legacyOffer, current.saveState, current.settings, current.source, ownerId, retrySave, updateSettings],
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
