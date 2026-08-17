import { describe, expect, it } from 'vitest';
import { bookingRecordsToScheduleItems } from './useBookingScheduleItems';

describe('bookingRecordsToScheduleItems', () => {
  it('maps package redemptions into LSAT U schedule items', () => {
    const [item] = bookingRecordsToScheduleItems([
      {
        source: 'redemption',
        id: 'redemption-1',
        start_at: '2026-08-12T17:00:00.000Z',
        end_at: '2026-08-12T18:10:00.000Z',
        status: 'booked',
        meet_url: 'https://meet.google.com/example',
        calendar_status: 'synced',
      },
    ], 'student-1', new Date('2026-08-10T12:00:00.000Z'));

    expect(item).toMatchObject({
      id: 'booking-redemption-redemption-1',
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

  it('maps native single sessions without pretending they are redemptions', () => {
    const [item] = bookingRecordsToScheduleItems([
      {
        source: 'single_session',
        id: 'single-1',
        start_at: '2026-08-12T17:00:00.000Z',
        end_at: '2026-08-12T18:10:00.000Z',
        status: 'booked',
        meet_url: null,
      },
    ], 'student-1', new Date('2026-08-10T12:00:00.000Z'));

    expect(item).toMatchObject({
      id: 'booking-single_session-single-1',
      source_table: 'single_session_bookings',
      source_id: 'single-1',
      metadata_json: { booking_source: 'single_session' },
    });
  });

  it('omits canceled bookings and marks past sessions complete', () => {
    const items = bookingRecordsToScheduleItems([
      { source: 'redemption', id: 'canceled', start_at: '2026-08-11T17:00:00.000Z', status: 'canceled' },
      { source: 'redemption', id: 'past', start_at: '2026-08-08T17:00:00.000Z', end_at: '2026-08-08T18:10:00.000Z', status: 'booked' },
    ], 'student-1', new Date('2026-08-10T12:00:00.000Z'));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'booking-redemption-past', status: 'completed' });
  });
});
