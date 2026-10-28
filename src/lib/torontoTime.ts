/**
 * Progress shows every date in Toronto time and says so. One module keeps day keys,
 * short dates and exact times from drifting apart across charts, groups and rows.
 */
const ZONE = 'America/Toronto';

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const shortDate = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const exactTime = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

const mediumDate = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', year: 'numeric' });
const exactTimeYear = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
/** "Oct 28, 2026" in Toronto. For spans that can cross years (all time). */
export const torontoMediumDate = (value: string | number | Date) => mediumDate.format(new Date(value));
/** "Oct 28, 2026, 7:05 PM EDT" in Toronto. */
export const torontoExactTimeYear = (value: string | number | Date) => exactTimeYear.format(new Date(value));

/** YYYY-MM-DD in Toronto. The sort-safe grouping key. */
export const torontoDayKey = (value: string | number | Date) => dayKey.format(new Date(value));
/** "Oct 28" in Toronto. */
export const torontoShortDate = (value: string | number | Date) => shortDate.format(new Date(value));
/** "Wed, Oct 28, 2026" in Toronto. */
export const torontoLongDate = (value: string | number | Date) => longDate.format(new Date(value));
/** "Oct 28, 7:05 PM EDT" in Toronto. */
export const torontoExactTime = (value: string | number | Date) => exactTime.format(new Date(value));
