import { describe, expect, it } from 'vitest';
import {
  bookingDisplayId,
  bookingKey,
  bookingStateLabel,
  canLinkToBooking,
  decodeSessionParam,
  encodeSessionParam,
  groupsFor,
  identityFromBookingItem,
  isStudentEligible,
  parseSessionChain,
  phaseAccepts,
  projectSessionChain,
  scheduleHrefFor,
  toSessionBooking,
  withSessionChain,
  withSessionParam,
} from './sessionChain';
import { BOOKING_A, BOOKING_B, OTHER_STUDENT, STUDENT, booking, item, link } from '@/test/sessionChainFixtures';

const NOW = new Date('2026-10-02T12:00:00Z');

describe('parseSessionChain', () => {
  it('reads a valid v1 link', () => {
    expect(parseSessionChain({ session_chain: link() })).toEqual({ kind: 'valid', link: link() });
  });

  it('treats a missing member as unlinked, not invalid', () => {
    expect(parseSessionChain({})).toEqual({ kind: 'none' });
    expect(parseSessionChain(null)).toEqual({ kind: 'none' });
    expect(parseSessionChain({ session_chain: null })).toEqual({ kind: 'none' });
  });

  it.each([
    [{ session_chain: 'redemption:abc' }, 'malformed'],
    [{ session_chain: [] }, 'malformed'],
    [{ session_chain: { ...link(), version: 2 } }, 'unknown_version'],
    [{ session_chain: { ...link(), booking_source: 'calcom' } }, 'unknown_source'],
    [{ session_chain: { ...link(), booking_id: 'booking-redemption-x' } }, 'bad_id'],
    [{ session_chain: { ...link(), booking_id: '' } }, 'bad_id'],
    [{ session_chain: { ...link(), phase: 'homework' } }, 'bad_phase'],
  ])('rejects %j as %s without guessing', (metadata, reason) => {
    expect(parseSessionChain(metadata)).toEqual({ kind: 'invalid', reason });
  });
});

describe('withSessionChain', () => {
  it('replaces only session_chain and keeps unrelated keys and nested values', () => {
    const current = { kind: 'recap', read_at: '2026-10-01', nested: { a: [1, 2] }, session_chain: link() };
    const next = withSessionChain(current, link({ booking_id: BOOKING_B, phase: 'recap' }));
    expect(next).toEqual({ kind: 'recap', read_at: '2026-10-01', nested: { a: [1, 2] }, session_chain: link({ booking_id: BOOKING_B, phase: 'recap' }) });
    expect(current.session_chain).toEqual(link());
  });

  it('removes only the association', () => {
    expect(withSessionChain({ keep: true, session_chain: link() }, null)).toEqual({ keep: true });
  });
});

describe('booking identity', () => {
  it('keeps source/id pairs distinct across families with the same id', () => {
    const r = booking({ source: 'redemption', id: BOOKING_A });
    const s = booking({ source: 'single_session', id: BOOKING_A });
    expect(bookingKey(r)).not.toBe(bookingKey(s));
    expect(bookingDisplayId(r)).toBe(`booking-redemption-${BOOKING_A}`);
  });

  it('reads the typed pair from the calendar adapter, not the display id', () => {
    expect(identityFromBookingItem({ source_id: BOOKING_A, metadata_json: { booking_source: 'single_session' } })).toEqual({ source: 'single_session', id: BOOKING_A });
    expect(identityFromBookingItem({ source_id: 'nope', metadata_json: { booking_source: 'redemption' } })).toBeNull();
    expect(identityFromBookingItem({ source_id: BOOKING_A, metadata_json: {} })).toBeNull();
  });

  it('drops raw rows with unknown source or invalid id or time', () => {
    expect(toSessionBooking({ source: 'external', id: BOOKING_A, start_at: '2026-10-05T15:00:00Z' })).toBeNull();
    expect(toSessionBooking({ source: 'redemption', id: 'x', start_at: '2026-10-05T15:00:00Z' })).toBeNull();
    expect(toSessionBooking({ source: 'redemption', id: BOOKING_A, start_at: 'soon' })).toBeNull();
  });
});

describe('appointment statuses', () => {
  it.each(['draft', 'checkout_open', 'expired', 'abandoned', 'failed', 'open', 'unknown'])('drops %s rows: they were never appointments', (status) => {
    expect(toSessionBooking({ source: 'single_session', id: BOOKING_A, start_at: '2026-10-05T15:00:00Z', status })).toBeNull();
  });

  it.each([['refunded', 'Canceled'], ['refund_pending', 'Canceled'], ['refund_failed', 'Canceled'], ['cancelled', 'Canceled'], ['no_show', 'Missed']])('keeps %s as an appointment labelled %s', (status, label) => {
    const b = toSessionBooking({ source: 'single_session', id: BOOKING_A, start_at: '2026-10-05T15:00:00Z', status });
    expect(b).not.toBeNull();
    expect(bookingStateLabel(b!, NOW)).toBe(label);
    expect(canLinkToBooking(b!)).toBe(false);
  });
});

describe('booking state', () => {
  it('describes an elapsed appointment as calendar time only, never completed work', () => {
    const label = bookingStateLabel(booking({ startAt: '2026-09-01T15:00:00Z', endAt: '2026-09-01T16:00:00Z' }), NOW);
    expect(label).toBe('Session time has passed');
    expect(label.toLowerCase()).not.toContain('complete');
  });

  it('labels a canceled appointment and blocks new links to it', () => {
    const canceled = booking({ status: 'cancelled' });
    expect(bookingStateLabel(canceled, NOW)).toBe('Canceled');
    expect(canLinkToBooking(canceled)).toBe(false);
    expect(canLinkToBooking(booking())).toBe(true);
  });
});

describe('eligibility', () => {
  it('omits draft, archived, hidden, locked and foreign items from students', () => {
    expect(isStudentEligible(item(), STUDENT, NOW)).toBe(true);
    expect(isStudentEligible(item({ status: 'draft' }), STUDENT, NOW)).toBe(false);
    expect(isStudentEligible(item({ status: 'archived' }), STUDENT, NOW)).toBe(false);
    expect(isStudentEligible(item({ visible_to_student: false }), STUDENT, NOW)).toBe(false);
    expect(isStudentEligible(item({ unlock_at: '2026-12-01T00:00:00Z' }), STUDENT, NOW)).toBe(false);
    expect(isStudentEligible(item({ type: 'bootcamp_module', unlock_at: '2026-12-01T00:00:00Z' }), STUDENT, NOW)).toBe(true);
    expect(isStudentEligible(item({ student_id: OTHER_STUDENT }), STUDENT, NOW)).toBe(false);
  });

  it('only lets a real recap sit in the Recap group', () => {
    expect(phaseAccepts('recap', 'session_recap')).toBe(true);
    expect(phaseAccepts('recap', 'drill')).toBe(false);
    expect(phaseAccepts('preparation', 'drill')).toBe(true);
    expect(phaseAccepts('follow_up', 'announcement')).toBe(false);
  });
});

describe('projectSessionChain', () => {
  const bookings = [booking(), booking({ id: BOOKING_B, startAt: '2026-10-05T18:00:00Z', endAt: null })];

  it('places exact records in their groups, identically for student and teacher', () => {
    const prep = item({ title: 'Flaw drill', type: 'drill', metadata_json: { session_chain: link() } });
    const recap = item({ title: 'Recap', type: 'session_recap', metadata_json: { session_chain: link({ phase: 'recap' }) } });
    const follow = item({ title: 'Homework', metadata_json: { session_chain: link({ phase: 'follow_up' }) } });
    const items = [prep, recap, follow];
    const student = groupsFor(projectSessionChain({ items, bookings, subjectId: STUDENT, audience: 'student', now: NOW }), bookings[0]);
    const teacher = groupsFor(projectSessionChain({ items, bookings, subjectId: STUDENT, audience: 'teacher', now: NOW }), bookings[0]);
    for (const groups of [student, teacher]) {
      expect(groups.preparation.map((r) => r.item.id)).toEqual([prep.id]);
      expect(groups.recap.map((r) => r.item.id)).toEqual([recap.id]);
      expect(groups.follow_up.map((r) => r.item.id)).toEqual([follow.id]);
    }
    expect(student.preparation[0].route).toBe('/drill');
  });

  it('returns three empty groups for a valid booking with no links', () => {
    const groups = groupsFor(projectSessionChain({ items: [item()], bookings, subjectId: STUDENT, audience: 'student', now: NOW }), bookings[0]);
    expect(groups).toEqual({ preparation: [], recap: [], follow_up: [] });
  });

  it('never merges duplicate titles or same-day appointments', () => {
    const a = item({ title: 'Same title', metadata_json: { session_chain: link() } });
    const b = item({ title: 'Same title', metadata_json: { session_chain: link({ booking_id: BOOKING_B }) } });
    const unlinked = item({ title: 'Same title', due_at: '2026-10-05T15:30:00Z' });
    const projection = projectSessionChain({ items: [a, b, unlinked], bookings, subjectId: STUDENT, audience: 'student', now: NOW });
    expect(groupsFor(projection, bookings[0]).preparation.map((r) => r.item.id)).toEqual([a.id]);
    expect(groupsFor(projection, bookings[1]).preparation.map((r) => r.item.id)).toEqual([b.id]);
  });

  it('distinguishes the same id across booking families', () => {
    const single = booking({ source: 'single_session', id: BOOKING_A });
    const x = item({ metadata_json: { session_chain: link({ booking_source: 'single_session' }) } });
    const projection = projectSessionChain({ items: [x], bookings: [booking(), single], subjectId: STUDENT, audience: 'student', now: NOW });
    expect(groupsFor(projection, booking()).preparation).toHaveLength(0);
    expect(groupsFor(projection, single).preparation.map((r) => r.item.id)).toEqual([x.id]);
  });

  it('keeps hidden records from students and labels them for the teacher', () => {
    const hidden = item({ visible_to_student: false, metadata_json: { session_chain: link() } });
    const draft = item({ status: 'draft', metadata_json: { session_chain: link() } });
    const locked = item({ unlock_at: '2026-12-01T00:00:00Z', metadata_json: { session_chain: link() } });
    const items = [hidden, draft, locked];
    expect(groupsFor(projectSessionChain({ items, bookings, subjectId: STUDENT, audience: 'student', now: NOW }), bookings[0]).preparation).toEqual([]);
    const teacher = groupsFor(projectSessionChain({ items, bookings, subjectId: STUDENT, audience: 'teacher', now: NOW }), bookings[0]).preparation;
    expect(teacher.map((r) => r.teacherOnly)).toEqual(['Hidden from student', 'Draft', 'Locked until unlock date']);
  });

  it('drops foreign items silently and never names them', () => {
    const foreign = item({ student_id: OTHER_STUDENT, title: 'Foreign secret', metadata_json: { session_chain: link() } });
    const teacher = projectSessionChain({ items: [foreign], bookings, subjectId: STUDENT, audience: 'teacher', now: NOW });
    expect(teacher.byBooking.size).toBe(0);
    expect(teacher.issues).toEqual([]);
  });

  it('does not create links to a booking the subject does not own', () => {
    const elsewhere = item({ title: 'Points elsewhere', metadata_json: { session_chain: link({ booking_id: '33333333-3333-4333-8333-333333333333' }) } });
    const student = projectSessionChain({ items: [elsewhere], bookings, subjectId: STUDENT, audience: 'student', now: NOW });
    expect(student.byBooking.size).toBe(0);
    expect(student.issues).toEqual([]);
    const teacher = projectSessionChain({ items: [elsewhere], bookings, subjectId: STUDENT, audience: 'teacher', now: NOW });
    expect(teacher.issues).toEqual([{ itemId: elsewhere.id, title: 'Points elsewhere', problem: 'appointment_unavailable' }]);
  });

  it('discloses malformed metadata and phase mismatches to the teacher only', () => {
    const bad = item({ metadata_json: { session_chain: { version: 9 } } });
    const drillAsRecap = item({ type: 'drill', metadata_json: { session_chain: link({ phase: 'recap' }) } });
    const student = projectSessionChain({ items: [bad, drillAsRecap], bookings, subjectId: STUDENT, audience: 'student', now: NOW });
    expect(student.byBooking.size).toBe(0);
    const teacher = projectSessionChain({ items: [bad, drillAsRecap], bookings, subjectId: STUDENT, audience: 'teacher', now: NOW });
    expect(teacher.issues.map((i) => i.problem)).toEqual(['invalid_metadata', 'phase_mismatch']);
  });

  it('keeps historical links on a canceled appointment', () => {
    const canceled = booking({ status: 'cancelled' });
    const x = item({ metadata_json: { session_chain: link() } });
    const groups = groupsFor(projectSessionChain({ items: [x], bookings: [canceled], subjectId: STUDENT, audience: 'student', now: NOW }), canceled);
    expect(groups.preparation).toHaveLength(1);
  });

  it('keeps links across a same-id reschedule and does not transfer to a replacement id', () => {
    const x = item({ metadata_json: { session_chain: link() } });
    const moved = booking({ startAt: '2026-10-09T15:00:00Z', endAt: '2026-10-09T16:10:00Z' });
    expect(groupsFor(projectSessionChain({ items: [x], bookings: [moved], subjectId: STUDENT, audience: 'student', now: NOW }), moved).preparation).toHaveLength(1);
    const replacement = booking({ id: BOOKING_B });
    expect(groupsFor(projectSessionChain({ items: [x], bookings: [replacement], subjectId: STUDENT, audience: 'student', now: NOW }), replacement).preparation).toHaveLength(0);
  });

  it('does not touch the work status of linked items when the appointment has passed', () => {
    const x = item({ status: 'assigned', metadata_json: { session_chain: link() } });
    const past = booking({ startAt: '2026-09-01T15:00:00Z', endAt: '2026-09-01T16:00:00Z' });
    const record = groupsFor(projectSessionChain({ items: [x], bookings: [past], subjectId: STUDENT, audience: 'student', now: NOW }), past).preparation[0];
    expect(record.item.status).toBe('assigned');
  });
});

describe('DST and midnight boundaries', () => {
  it('matches by typed identity only, so a session across a DST change or midnight keeps its links', () => {
    // 2026-11-01 05:30Z is 01:30 EDT/EST ambiguity in New York and the prior
    // calendar day in Los Angeles; the item is dated a different day entirely.
    const dst = booking({ startAt: '2026-11-01T05:30:00Z', endAt: '2026-11-01T06:40:00Z' });
    const x = item({ due_at: '2026-10-30T23:59:00Z', metadata_json: { session_chain: link() } });
    const near = item({ due_at: '2026-11-01T05:30:00Z' });
    const groups = groupsFor(projectSessionChain({ items: [x, near], bookings: [dst], subjectId: STUDENT, audience: 'student', now: NOW }), dst);
    expect(groups.preparation.map((r) => r.item.id)).toEqual([x.id]);
  });
});

describe('URL selection', () => {
  it('round-trips a typed pair and preserves unrelated parameters', () => {
    const identity = { source: 'single_session' as const, id: BOOKING_A };
    const params = withSessionParam(new URLSearchParams('tab=week&foo=1'), identity);
    expect(params.get('foo')).toBe('1');
    expect(params.get('tab')).toBe('week');
    expect(decodeSessionParam(params.get('session'))).toEqual({ kind: 'valid', identity });
    expect(withSessionParam(params, null).toString()).toBe('tab=week&foo=1');
    expect(scheduleHrefFor(identity)).toBe(`/schedule?session=${encodeURIComponent(encodeSessionParam(identity))}`);
  });

  it.each(['v2.redemption.' + BOOKING_A, `booking-redemption-${BOOKING_A}`, 'v1.calcom.' + BOOKING_A, 'v1.redemption.nope'])('rejects %s', (raw) => {
    expect(decodeSessionParam(raw)).toEqual({ kind: 'invalid' });
  });

  it('treats no parameter as no selection', () => {
    expect(decodeSessionParam(null)).toEqual({ kind: 'absent' });
  });
});
