import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { useStudentBooking, type StudentRedemption } from '@/hooks/useStudentBooking';

export type StudentBookingRedemption = Pick<StudentRedemption, 'id' | 'start_at' | 'status'> &
  Partial<Pick<StudentRedemption, 'end_at' | 'meet_url' | 'calendar_status'>>;

export function bookingRedemptionsToScheduleItems(
  redemptions: StudentBookingRedemption[],
  studentId: string,
  now = new Date(),
): ClassroomItem[] {
  return redemptions
    .filter((redemption) => redemption.status === 'booked' && !Number.isNaN(new Date(redemption.start_at).getTime()))
    .map((redemption) => {
      const completed = new Date(redemption.end_at ?? redemption.start_at) < now;
      return {
        id: `booking-${redemption.id}`,
        student_id: studentId,
        class_id: null,
        created_by: studentId,
        type: 'activity',
        title: '1:1 LSAT session',
        description: 'Your booked session with Joshua.',
        content_html: null,
        content_markdown: null,
        source_table: 'booking_pass_redemptions',
        source_id: redemption.id,
        status: completed ? 'completed' : 'assigned',
        unlock_at: null,
        due_at: redemption.start_at,
        completed_at: completed ? (redemption.end_at ?? redemption.start_at) : null,
        priority: 100,
        visible_to_student: true,
        metadata_json: {
          schedule_kind: 'booking',
          end_at: redemption.end_at ?? null,
          meet_url: redemption.meet_url ?? null,
          calendar_status: redemption.calendar_status ?? null,
        },
        created_at: redemption.start_at,
        updated_at: redemption.start_at,
      } satisfies ClassroomItem;
    });
}

/**
 * Booking redemptions are the source of truth for student sessions. This hook
 * adapts them into the same display shape as classroom work without copying
 * rows into classroom_items or waiting for Google Calendar synchronization.
 */
export function useBookingScheduleItems() {
  const { user } = useAuth();
  const query = useStudentBooking();
  const data = useMemo(
    () => bookingRedemptionsToScheduleItems(query.data?.redemptions ?? [], user?.id ?? ''),
    [query.data?.redemptions, user?.id],
  );
  return { ...query, data };
}
