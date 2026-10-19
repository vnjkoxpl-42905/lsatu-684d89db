/**
 * The real LSAT sittings, from LSAC's published calendar.
 *
 * Source: https://www.lsac.org/LSATdates (US/Canada administrations, read
 * 2026-08-29). Each sitting runs over several days and the candidate picks a
 * slot inside that window, so `date` is the first day — enough for the
 * classroom countdown and honest about which administration they are sitting.
 *
 * This list has an end. When it runs out the intake still works: the student
 * says they have not picked a date yet, and LSAC's next calendar gets added
 * here. Never extend it by guessing dates that have not been published.
 */
export interface LsatAdministration {
  /** ISO date of the first day of the sitting: what lands in profiles.test_date. */
  date: string;
  /** How the sitting is named, e.g. "November 2026". */
  label: string;
  /** The window, for the student who needs to recognise their own slot. */
  window: string;
  /** Last day to register, from LSAC. */
  registrationDeadline: string;
}

export const LSAT_ADMINISTRATIONS: LsatAdministration[] = [
  { date: '2026-09-09', label: 'September 2026', window: 'Sep 9-12', registrationDeadline: '2026-07-28' },
  { date: '2026-10-07', label: 'October 2026', window: 'Oct 7-10', registrationDeadline: '2026-08-27' },
  { date: '2026-11-11', label: 'November 2026', window: 'Nov 11-14', registrationDeadline: '2026-10-01' },
  { date: '2027-01-13', label: 'January 2027', window: 'Jan 13-16', registrationDeadline: '2026-12-01' },
  { date: '2027-02-12', label: 'February 2027', window: 'Feb 12-13', registrationDeadline: '2026-12-29' },
  { date: '2027-04-08', label: 'April 2027', window: 'Apr 8-10', registrationDeadline: '2027-02-25' },
  { date: '2027-06-09', label: 'June 2027', window: 'Jun 9-12', registrationDeadline: '2027-04-29' },
];

/** The sittings a student can still take, soonest first. */
export function upcomingAdministrations(today: Date = new Date()): LsatAdministration[] {
  const cutoff = today.toISOString().slice(0, 10);
  return LSAT_ADMINISTRATIONS.filter((sitting) => sitting.date >= cutoff);
}

/** The sitting a stored date belongs to, if it is one of them. */
export function administrationFor(date: string | undefined): LsatAdministration | undefined {
  return LSAT_ADMINISTRATIONS.find((sitting) => sitting.date === date);
}

/** Whether registration for a sitting has already closed. */
export function registrationClosed(
  sitting: LsatAdministration,
  today: Date = new Date(),
): boolean {
  return today.toISOString().slice(0, 10) > sitting.registrationDeadline;
}
