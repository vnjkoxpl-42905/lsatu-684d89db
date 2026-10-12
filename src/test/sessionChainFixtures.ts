import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { SessionBooking, SessionChainLink } from '@/lib/sessionChain';

/** Deterministic, local-only fixtures. They prove nothing about production RLS. */
export const STUDENT = 'aaaaaaaa-0000-4000-8000-000000000001';
export const OTHER_STUDENT = 'aaaaaaaa-0000-4000-8000-000000000002';
export const BOOKING_A = '11111111-1111-4111-8111-111111111111';
export const BOOKING_B = '22222222-2222-4222-8222-222222222222';

export function booking(overrides: Partial<SessionBooking> = {}): SessionBooking {
  return {
    source: 'redemption',
    id: BOOKING_A,
    startAt: '2026-10-05T15:00:00.000Z',
    endAt: '2026-10-05T16:10:00.000Z',
    status: 'booked',
    meetUrl: null,
    ...overrides,
  };
}

export function link(overrides: Partial<SessionChainLink> = {}): SessionChainLink {
  return { version: 1, booking_source: 'redemption', booking_id: BOOKING_A, phase: 'preparation', ...overrides };
}

let n = 0;
export function item(overrides: Partial<ClassroomItem> = {}): ClassroomItem {
  n += 1;
  return {
    id: `item-${n}`,
    student_id: STUDENT,
    class_id: null,
    created_by: 'teacher-1',
    type: 'homework',
    title: `Item ${n}`,
    description: null,
    content_html: null,
    content_markdown: '# body',
    source_table: null,
    source_id: null,
    status: 'assigned',
    unlock_at: null,
    due_at: null,
    completed_at: null,
    priority: 0,
    visible_to_student: true,
    metadata_json: {},
    created_at: `2026-10-01T00:00:${String(n % 60).padStart(2, '0')}.000Z`,
    updated_at: '2026-10-01T00:00:00.000000+00:00',
    ...overrides,
  };
}
