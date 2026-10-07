import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { useStudentBooking, type StudentBooking } from '@/hooks/useStudentBooking';

export type StudentBookingRecord = Pick<StudentBooking, 'source' | 'id' | 'start_at' | 'status'> &
  Partial<Pick<StudentBooking, 'end_at' | 'meet_url' | 'calendar_status'>>;

export function bookingRecordsToScheduleItems(
  bookings: StudentBookingRecord[],
  studentId: string,
  now = new Date(),
): ClassroomItem[] {
  return bookings
    .filter((booking) => booking.status === 'booked' && !Number.isNaN(new Date(booking.start_at).getTime()))
    .map((booking) => {
      const completed = new Date(booking.end_at ?? booking.start_at) < now;
      return {
        id: `booking-${booking.source}-${booking.id}`,
        student_id: studentId,
        class_id: null,
        created_by: studentId,
        type: 'activity',
        title: '1:1 LSAT session',
        description: 'Your booked session with Joshua.',
        content_html: null,
        content_markdown: null,
        source_table: booking.source === 'redemption' ? 'booking_pass_redemptions' : 'single_session_bookings',
        source_id: booking.id,
        status: completed ? 'completed' : 'assigned',
        unlock_at: null,
        due_at: booking.start_at,
        completed_at: completed ? (booking.end_at ?? booking.start_at) : null,
        priority: 100,
        visible_to_student: true,
        metadata_json: {
          schedule_kind: 'booking',
          booking_source: booking.source,
          end_at: booking.end_at ?? null,
          meet_url: booking.meet_url ?? null,
          calendar_status: booking.calendar_status ?? null,
        },
        created_at: booking.start_at,
        updated_at: booking.start_at,
      } satisfies ClassroomItem;
    });
}

/**
 * Unified bookings are the source of truth for student sessions. This hook
 * adapts them into the same display shape as classroom work without copying
 * rows into classroom_items or waiting for Google Calendar synchronization.
 */
export function useBookingScheduleItems() {
  const { user } = useAuth();
  const query = useStudentBooking();
  const data = useMemo(
    () => bookingRecordsToScheduleItems(query.data?.bookings ?? [], user?.id ?? ''),
    [query.data?.bookings, user?.id],
  );
  return { ...query, data };
}
