import * as React from 'react';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import type { TimingMode } from '@/lib/studySettings';

const OPTIONS: { value: TimingMode; label: string }[] = [
  { value: '35', label: 'Standard time · 1×' },
  { value: '52.5', label: 'Time and a half · 1.5×' },
  { value: '70', label: 'Double time · 2×' },
  { value: 'unlimited', label: 'Unlimited' },
];

/** Explicit account save, separate from the drawer's drill-only Apply/Cancel. */
export function ProfileTimingPreference({ compact = false }: { compact?: boolean }) {
  const { settings, ownerId, ready, profileTimingMode, profileTimingStatus, profileTimingError, saveProfileTiming } = useUserSettings();
  const [draft, setDraft] = React.useState<TimingMode>(settings.defaultTimingMode);
  const touched = React.useRef(false);
  const priorOwner = React.useRef(ownerId);
  const id = React.useId();
  React.useEffect(() => {
    if (priorOwner.current !== ownerId) {
      priorOwner.current = ownerId;
      touched.current = false;
      setDraft(settings.defaultTimingMode);
    } else if (!touched.current) setDraft(settings.defaultTimingMode);
  }, [ownerId, settings.defaultTimingMode]);
  const saving = profileTimingStatus === 'saving';
  const loading = profileTimingStatus === 'loading';
  const saved = profileTimingStatus === 'saved' && profileTimingMode === draft;
  return <section className={`profile-timing-preference${compact ? ' profile-timing-preference-compact' : ''}`} aria-labelledby={`${id}-heading`} style={{ display: 'grid', gap: 12 }}>
    <div>
      <h3 id={`${id}-heading`} className={compact ? 'sr-only' : undefined} style={{ fontSize: 15, lineHeight: 1.4, fontWeight: 600, margin: 0 }}>Time accommodation</h3>
      <p id={`${id}-help`} style={{ fontSize: 13, lineHeight: 1.5, margin: '6px 0 0', opacity: .85 }}>New practice defaults use this timing across devices. Saved drills and sessions already started keep their clock.</p>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <select
        aria-label="Profile time accommodation"
        aria-describedby={`${id}-help ${id}-status`}
        value={draft}
        disabled={!ready || !ownerId || saving || loading}
        onChange={event => { touched.current = true; setDraft(event.target.value as TimingMode); }}
        className="classroom-account-select profile-timing-select"
        style={{ minHeight: 44, minWidth: 0, flex: '1 1 180px', width: 'auto' }}
      >{OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <button
        type="button"
        className="classroom-account-ghost-button profile-timing-save"
        style={{ minHeight: 44, padding: '8px 12px', border: '1px solid var(--lsatu-field-border, #747773)', borderRadius: 8, color: 'inherit', background: 'transparent' }}
        disabled={!ready || !ownerId || saving || loading || saved}
        onClick={async () => { if (await saveProfileTiming(draft)) touched.current = false; }}
      >{loading ? 'Checking…' : saving ? 'Saving…' : saved ? 'Saved to profile' : 'Save to profile'}</button>
    </div>
    <p id={`${id}-status`} role={profileTimingError ? 'alert' : 'status'} style={{ fontSize: 12, lineHeight: 1.5, margin: 0, opacity: .85 }}>
      {!ownerId ? 'Sign in to save profile timing.' : loading ? 'Checking your profile timing…' : profileTimingError ?? (saved ? compact ? 'Saved across your profile. Apply and Cancel do not undo this save.' : 'Saved across your profile.' : 'Changes apply to your profile only when you save here.')}
    </p>
  </section>;
}
