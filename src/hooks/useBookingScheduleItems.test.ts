import { describe, expect, it } from 'vitest';
import { bookingRedemptionsToScheduleItems } from './useBookingScheduleItems';

describe('bookingRedemptionsToScheduleItems', () => {
  it('maps confirmed bookings into LSAT U schedule items', () => {
    const [item] = bookingRedemptionsToScheduleItems([
      {
        id: 'redemption-1',
        start_at: '2026-08-12T17:00:00.000Z',
        end_at: '2026-08-12T18:10:00.000Z',
        status: 'booked',
        meet_url: 'https://meet.google.com/example',
        calendar_status: 'synced',
      },
    ], 'student-1', new Date('2026-08-10T12:00:00.000Z'));

    expect(item).toMatchObject({
      id: 'booking-redemption-1',
      title: '1:1 LSAT session',
      source_table: 'booking_pass_redemptions',
      source_id: 'redemption-1',
      due_at: '2026-08-12T17:00:00.000Z',
      status: 'assigned',
      visible_to_student: true,
      metadata_json: {
        schedule_kind: 'booking',
        meet_url: 'https://meet.google.com/example',
        calendar_status: 'synced',
      },
    });
  });

  it('omits canceled bookings and marks past sessions complete', () => {
    const items = bookingRedemptionsToScheduleItems([
      { id: 'canceled', start_at: '2026-08-11T17:00:00.000Z', status: 'canceled' },
      { id: 'past', start_at: '2026-08-08T17:00:00.000Z', end_at: '2026-08-08T18:10:00.000Z', status: 'booked' },
    ], 'student-1', new Date('2026-08-10T12:00:00.000Z'));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'booking-past', status: 'completed' });
  });
});
