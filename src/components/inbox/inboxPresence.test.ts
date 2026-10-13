import { describe, expect, it, vi } from 'vitest';
import { isParticipantOnline } from '@/components/inbox/inboxPresence';

describe('isParticipantOnline', () => {
  it('treats recent last_seen_at timestamps as online', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    expect(isParticipantOnline('2026-06-02T11:56:00.000Z')).toBe(true);
  });

  it('treats stale timestamps as offline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));

    expect(isParticipantOnline('2026-06-02T11:40:00.000Z')).toBe(false);
  });

  it('treats missing timestamps as offline', () => {
    expect(isParticipantOnline(null)).toBe(false);
  });
});
