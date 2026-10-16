import * as React from 'react';

/**
 * Player display settings from the text-size popover. They persist in
 * localStorage so a student who needs a scheme or a larger size sets it once.
 */

export type RcColorScheme = 'default' | 'grey' | 'purple' | 'violet' | 'navy' | 'black';

export const RC_COLOR_SCHEMES: { id: RcColorScheme; label: string }[] = [
  { id: 'default', label: 'Black on white' },
  { id: 'grey', label: 'Grey on light grey' },
  { id: 'purple', label: 'Purple on light green' },
  { id: 'violet', label: 'Black on violet' },
  { id: 'navy', label: 'Yellow on navy' },
  { id: 'black', label: 'White on black' },
];

/** Percentages, matching the official interface's own wording. */
export const RC_FONT_SIZES = [75, 100, 125, 150, 175];

/** Extra leading relative to the comfortable 1.6 default: 100%, 150%, 200%.
 * Existing intermediate leading values remain valid when restoring preferences.
 */
export const RC_LINE_HEIGHTS = [
  { label: 'Default', percent: 100, value: 0 },
  { label: 'Medium', percent: 150, value: 0.8 },
  { label: 'Large', percent: 200, value: 1.6 },
];

export interface RcA11ySettings {
  scheme: RcColorScheme;
  fontSize: number;
  /** Extra leading, not an absolute line height. */
  lineHeight: number;
  paragraphFocus: boolean;
}

const STORAGE_KEY = 'rc-player-a11y';

const DEFAULTS: RcA11ySettings = { scheme: 'default', fontSize: 100, lineHeight: 0, paragraphFocus: false };

/**
 * Line height used to be stored as an absolute 1.35 / 1.65 / 1.85. Map those
 * forward so a student who already picked one keeps roughly what they chose.
 */
function migrateLineHeight(stored: number | undefined): number {
  if (typeof stored !== 'number' || !Number.isFinite(stored) || stored < 0) return DEFAULTS.lineHeight;
  if (RC_LINE_HEIGHTS.some(option => option.value === stored) || stored === 0.25 || stored === 0.45) return stored;
  if (stored === 1.85) return 0.45;
  if (stored === 1.65) return 0.25;
  return 0;
}

function read(): RcA11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RcA11ySettings>;
    return {
      scheme: RC_COLOR_SCHEMES.some(option => option.id === parsed.scheme) ? parsed.scheme : DEFAULTS.scheme,
      fontSize: typeof parsed.fontSize === 'number' && Number.isFinite(parsed.fontSize)
        && parsed.fontSize >= 50 && parsed.fontSize <= 300 ? parsed.fontSize : DEFAULTS.fontSize,
      lineHeight: migrateLineHeight(parsed.lineHeight),
      paragraphFocus: parsed.paragraphFocus === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useRcA11y() {
  const [settings, setSettings] = React.useState<RcA11ySettings>(read);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // A student with storage blocked still gets the setting for this session.
    }
  }, [settings]);

  const update = React.useCallback((patch: Partial<RcA11ySettings>) => {
    setSettings((prev) => ({
      scheme: RC_COLOR_SCHEMES.some(option => option.id === patch.scheme) ? patch.scheme : prev.scheme,
      fontSize: typeof patch.fontSize === 'number' && Number.isFinite(patch.fontSize)
        && patch.fontSize >= 50 && patch.fontSize <= 300 ? patch.fontSize : prev.fontSize,
      lineHeight: patch.lineHeight === undefined ? prev.lineHeight : migrateLineHeight(patch.lineHeight),
      paragraphFocus: typeof patch.paragraphFocus === 'boolean' ? patch.paragraphFocus : prev.paragraphFocus,
    }));
  }, []);

  return {
    settings,
    update,
    /** Scheme class for the exam pane. Empty for the default black-on-white. */
    className: settings.scheme === 'default' ? '' : `rc-scheme-${settings.scheme}`,
    /** 1.0 = the LR player's base sizes. */
    fontScale: settings.fontSize / 100,
    extraLeading: settings.lineHeight,
  };
}
