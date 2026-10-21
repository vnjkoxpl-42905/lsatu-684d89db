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

/**
 * Extra leading added on top of the pane's own line height, rather than an
 * absolute value. The passage and the question column run at different line
 * heights (1.7 and 1.6, matching the LR player), and one absolute number would
 * flatten that difference the moment a student touched the control.
 */
export const RC_LINE_HEIGHTS = [
  { label: 'Default', value: 0 },
  { label: 'Roomy', value: 0.25 },
  { label: 'Roomiest', value: 0.45 },
];

export interface RcA11ySettings {
  scheme: RcColorScheme;
  fontSize: number;
  /** Extra leading, not an absolute line height. */
  lineHeight: number;
}

const STORAGE_KEY = 'rc-player-a11y';

const DEFAULTS: RcA11ySettings = { scheme: 'default', fontSize: 100, lineHeight: 0 };

/**
 * Line height used to be stored as an absolute 1.35 / 1.65 / 1.85. Map those
 * forward so a student who already picked one keeps roughly what they chose.
 */
function migrateLineHeight(stored: number | undefined): number {
  if (stored == null) return DEFAULTS.lineHeight;
  if (stored < 1) return stored;
  if (stored >= 1.8) return 0.45;
  if (stored >= 1.5) return 0.25;
  return 0;
}

function read(): RcA11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RcA11ySettings>;
    return {
      scheme: parsed.scheme ?? DEFAULTS.scheme,
      fontSize: parsed.fontSize ?? DEFAULTS.fontSize,
      lineHeight: migrateLineHeight(parsed.lineHeight),
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
    setSettings((prev) => ({ ...prev, ...patch }));
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
