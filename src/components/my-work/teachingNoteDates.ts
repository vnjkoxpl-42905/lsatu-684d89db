/** Archive headings and row dates must use the same calendar/time zone. */
export function teachingNoteDate(value: string, timeZone?: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return { key: 'undated', month: 'Date unavailable', label: 'Date unavailable' };
  }
  const options: Intl.DateTimeFormatOptions = { calendar: 'gregory', ...(timeZone ? { timeZone } : {}) };
  const parts = new Intl.DateTimeFormat('en-US', { ...options, year: 'numeric', month: '2-digit' }).formatToParts(date);
  return {
    key: `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`,
    month: new Intl.DateTimeFormat(undefined, { ...options, month: 'long', year: 'numeric' }).format(date),
    label: new Intl.DateTimeFormat(undefined, { ...options, month: 'short', day: 'numeric', year: 'numeric' }).format(date),
  };
}
