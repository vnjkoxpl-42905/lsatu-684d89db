import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems, useStudentClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { useStudentBooking } from '@/hooks/useStudentBooking';
import { getClassroomItem, updateClassroomItemMetadataIfUnchanged } from '@/lib/classroomItems';
import {
  parseSessionChain,
  projectSessionChain,
  sameLink,
  toSessionBooking,
  withSessionChain,
  type Audience,
  type SessionBooking,
  type SessionChainLink,
  type SessionChainProjection,
} from '@/lib/sessionChain';

/**
 * Read state for a session-chain surface.
 *
 * Booking and item reads are tracked apart because they fail apart: without
 * bookings there is no appointment to show at all, while without items the
 * appointment is real but its links are unknown. Neither failure is ever
 * shown as "nothing linked".
 */
export interface SessionChainState {
  audience: Audience;
  subjectId: string | null;
  bookings: SessionBooking[];
  projection: SessionChainProjection;
  /** All of the subject's items, for the teacher's picker. Empty for students. */
  items: ClassroomItem[];
  bookingsLoading: boolean;
  itemsLoading: boolean;
  /** No booking data could be read for this subject. */
  bookingsFailed: boolean;
  /** No item data could be read; links are unknown, not empty. */
  itemsFailed: boolean;
  /** A background refresh failed; the rows shown are from an earlier read. */
  stale: boolean;
  retry: () => void;
}

interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export function deriveSessionChainState(input: {
  audience: Audience;
  subjectId: string | null;
  bookingQuery: QueryLike<SessionBooking[]>;
  itemQuery: QueryLike<ClassroomItem[]>;
  now?: Date;
}): SessionChainState {
  const { audience, subjectId, bookingQuery, itemQuery } = input;
  // Data is trusted only for the subject it was read for. Queries are keyed by
  // subject, so a new subject starts with no data rather than the last one's.
  const bookings = subjectId ? bookingQuery.data ?? [] : [];
  const items = subjectId ? (itemQuery.data ?? []).filter((item) => item.student_id === subjectId) : [];
  const projection = subjectId
    ? projectSessionChain({ items, bookings, subjectId, audience, now: input.now })
    : { byBooking: new Map(), issues: [] };
  return {
    audience,
    subjectId,
    bookings,
    projection,
    items: audience === 'teacher' ? items : [],
    bookingsLoading: !!subjectId && bookingQuery.isLoading && bookingQuery.data === undefined,
    itemsLoading: !!subjectId && itemQuery.isLoading && itemQuery.data === undefined,
    bookingsFailed: bookingQuery.isError && bookingQuery.data === undefined,
    itemsFailed: itemQuery.isError && itemQuery.data === undefined,
    stale: (bookingQuery.isError && bookingQuery.data !== undefined) || (itemQuery.isError && itemQuery.data !== undefined),
    retry: () => {
      void bookingQuery.refetch();
      void itemQuery.refetch();
    },
  };
}

/** Student Schedule and Notes: the signed-in student's own appointments and items. */
export function useStudentSessionChain(): SessionChainState {
  const { user } = useAuth();
  const subjectId = user?.id ?? null;
  const booking = useStudentBooking();
  const items = useClassroomItems();
  const bookingData = useMemo(
    () => (booking.data ? (booking.data.bookings ?? []).map(toSessionBooking).filter((b): b is SessionBooking => !!b) : undefined),
    [booking.data],
  );
  return deriveSessionChainState({
    audience: 'student',
    subjectId,
    bookingQuery: { data: bookingData, isLoading: booking.isLoading, isError: booking.isError, refetch: booking.refetch },
    itemQuery: { data: items.data, isLoading: items.isLoading, isError: items.isError, refetch: items.refetch },
  });
}

type AdminSingleSession = {
  source?: string;
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url?: string | null;
  user_id?: string | null;
  association?: string;
};

/**
 * Bookings Joshua can verify as this student's. Redemptions are read through
 * the admin RLS policy and joined to their pass's `student_id`; single
 * sessions come from the admin function's verified list, re-checked against
 * `user_id`. Possible email matches are never read into this list.
 */
export async function fetchTeacherBookings(studentId: string): Promise<SessionBooking[]> {
  const [redemptions, admin] = await Promise.all([
    supabase
      .from('booking_pass_redemptions')
      .select('id,start_at,end_at,status,meet_url,booking_passes!inner(student_id)')
      .eq('booking_passes.student_id', studentId)
      .order('start_at', { ascending: false }),
    supabase.functions.invoke('booking-pass-admin', { body: { action: 'get_for_student', student_id: studentId } }),
  ]);
  if (redemptions.error) throw redemptions.error;
  if (admin.error) throw new Error(admin.error.message);
  const adminData = admin.data as { error?: string; single_session_bookings?: AdminSingleSession[] } | null;
  if (adminData?.error) throw new Error(adminData.error);

  const rows: SessionBooking[] = [];
  for (const row of (redemptions.data ?? []) as Array<Record<string, unknown>>) {
    const pass = row.booking_passes as { student_id?: string } | Array<{ student_id?: string }> | null;
    const owner = Array.isArray(pass) ? pass[0]?.student_id : pass?.student_id;
    if (owner !== studentId) continue;
    const booking = toSessionBooking({ ...row, source: 'redemption' });
    if (booking) rows.push(booking);
  }
  for (const row of adminData?.single_session_bookings ?? []) {
    if (row.user_id !== studentId) continue;
    if (row.association && row.association.startsWith('possible_match')) continue;
    const booking = toSessionBooking({ ...row, source: 'single_session' });
    if (booking) rows.push(booking);
  }
  return rows.sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
}

export const teacherBookingsKey = (studentId: string | null) => ['session-chain', 'teacher-bookings', studentId] as const;

/** Teacher dossier: the selected student's verified appointments and all their items. */
export function useTeacherSessionChain(studentId: string | null): SessionChainState {
  const bookings = useQuery({
    queryKey: teacherBookingsKey(studentId),
    enabled: !!studentId,
    queryFn: () => fetchTeacherBookings(studentId!),
    staleTime: 30_000,
  });
  const items = useStudentClassroomItems(studentId);
  return deriveSessionChainState({
    audience: 'teacher',
    subjectId: studentId,
    bookingQuery: bookings,
    itemQuery: items,
  });
}

// ── Writer ───────────────────────────────────────────────────────────────────

/** What the teacher's screen showed as the item's association before saving. */
export type ExpectedLink = SessionChainLink | null | 'invalid';

export type CommitOutcome =
  | { kind: 'saved'; item: ClassroomItem }
  /** The row changed since it was shown. `current` is what it holds now. */
  | { kind: 'conflict'; current: ExpectedLink }
  /** The write was rejected and a re-read shows nothing changed. Safe to retry. */
  | { kind: 'not_saved'; message: string }
  /** The write failed and the re-read failed too. Retrying must re-read first. */
  | { kind: 'unknown'; message: string }
  | { kind: 'unavailable' };

function currentLinkState(item: ClassroomItem): ExpectedLink {
  const parsed = parseSessionChain(item.metadata_json);
  if (parsed.kind === 'invalid') return 'invalid';
  return parsed.kind === 'valid' ? parsed.link : null;
}

function matches(actual: ExpectedLink, expected: ExpectedLink): boolean {
  if (actual === 'invalid' || expected === 'invalid') return actual === expected;
  return sameLink(actual, expected);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The change could not be saved.';
}

/**
 * Change one item's association and nothing else.
 *
 * Reads the authoritative row, refuses if its association is not what the
 * teacher was shown, then writes `metadata_json` with only `session_chain`
 * changed, conditioned on the row's `updated_at`. A lost reply is settled by
 * re-reading the row, never by repeating the write blind.
 */
export async function commitSessionLink(input: {
  itemId: string;
  studentId: string;
  expected: ExpectedLink;
  next: SessionChainLink | null;
}): Promise<CommitOutcome> {
  const fresh = await getClassroomItem(input.itemId);
  if (!fresh || fresh.student_id !== input.studentId) return { kind: 'unavailable' };
  const current = currentLinkState(fresh);
  if (current !== 'invalid' && sameLink(current, input.next)) return { kind: 'saved', item: fresh };
  if (!matches(current, input.expected)) return { kind: 'conflict', current };

  try {
    const written = await updateClassroomItemMetadataIfUnchanged({
      id: fresh.id,
      studentId: input.studentId,
      expectedUpdatedAt: fresh.updated_at,
      metadata: withSessionChain(fresh.metadata_json, input.next),
    });
    if (written) return { kind: 'saved', item: written };
    const after = await getClassroomItem(input.itemId);
    if (!after || after.student_id !== input.studentId) return { kind: 'unavailable' };
    return { kind: 'conflict', current: currentLinkState(after) };
  } catch (error) {
    try {
      const after = await getClassroomItem(input.itemId);
      if (!after || after.student_id !== input.studentId) return { kind: 'unavailable' };
      const state = currentLinkState(after);
      if (state !== 'invalid' && sameLink(state, input.next)) return { kind: 'saved', item: after };
      if (after.updated_at === fresh.updated_at) return { kind: 'not_saved', message: message(error) };
      return { kind: 'conflict', current: state };
    } catch {
      return { kind: 'unknown', message: message(error) };
    }
  }
}

export type WriterResult =
  | (CommitOutcome & { refreshFailed?: boolean })
  /** The selected student changed while the write was in flight. */
  | { kind: 'superseded' };

/**
 * Context-bound writer for one selected student. A result that arrives after
 * the student changed is reported as superseded, so the caller cannot apply
 * it to the next student's panel; the original student's cache is still
 * refreshed.
 */
export function useSessionLinkWriter(studentId: string | null) {
  const qc = useQueryClient();
  const epoch = useRef(0);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    epoch.current += 1;
    inFlight.current = false;
    setPending(false);
  }, [studentId]);

  const save = useCallback(
    async (itemId: string, expected: ExpectedLink, next: SessionChainLink | null): Promise<WriterResult | null> => {
      if (!studentId || inFlight.current) return null;
      const mine = epoch.current;
      const subject = studentId;
      inFlight.current = true;
      setPending(true);
      let outcome: CommitOutcome;
      try {
        outcome = await commitSessionLink({ itemId, studentId: subject, expected, next });
      } catch (error) {
        // The pre-write read failed: nothing was written.
        outcome = { kind: 'not_saved', message: message(error) };
      }
      let refreshFailed = false;
      if (outcome.kind !== 'not_saved') {
        try {
          await qc.refetchQueries({ queryKey: ['classroom-items-admin', subject], exact: true }, { throwOnError: true });
        } catch {
          refreshFailed = true;
        }
      }
      if (mine !== epoch.current) return { kind: 'superseded' };
      inFlight.current = false;
      setPending(false);
      return { ...outcome, refreshFailed };
    },
    [qc, studentId],
  );

  return { save, pending };
}

