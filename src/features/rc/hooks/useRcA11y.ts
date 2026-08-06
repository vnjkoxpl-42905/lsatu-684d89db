import * as React from 'react';

/**
 * Player display settings from the Accessibility panel. They persist in
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

export const RC_FONT_SIZES = [75, 100, 125, 150, 175];
export const RC_LINE_HEIGHTS = [1.35, 1.65, 1.85];

export interface RcA11ySettings {
  scheme: RcColorScheme;
  fontSize: number;
  lineHeight: number;
}

const STORAGE_KEY = 'rc-player-a11y';

const DEFAULTS: RcA11ySettings = { scheme: 'default', fontSize: 100, lineHeight: 1.35 };

function read(): RcA11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RcA11ySettings>;
    return {
      scheme: parsed.scheme ?? DEFAULTS.scheme,
      fontSize: parsed.fontSize ?? DEFAULTS.fontSize,
      lineHeight: parsed.lineHeight ?? DEFAULTS.lineHeight,
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

  const className = settings.scheme === 'default' ? '' : `rc-scheme-${settings.scheme}`;
  const style = {
    '--rc-font-scale': String(settings.fontSize / 100),
    '--rc-line-height': String(settings.lineHeight),
  } as React.CSSProperties;

  return { settings, update, className, style };
}
