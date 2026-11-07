import { describe, expect, it } from 'vitest';
import { REPLY_MAX_TRAVEL_PX, REPLY_THRESHOLD_PX, reachedReplyThreshold } from './replyUtils';

describe('reachedReplyThreshold', () => {
  it('does nothing for a small or leftward pull', () => {
    expect(reachedReplyThreshold(0)).toBe(false);
    expect(reachedReplyThreshold(REPLY_THRESHOLD_PX - 1)).toBe(false);
    expect(reachedReplyThreshold(-80)).toBe(false);
  });

  it('opens a reply at and past the threshold', () => {
    expect(reachedReplyThreshold(REPLY_THRESHOLD_PX)).toBe(true);
    expect(reachedReplyThreshold(REPLY_MAX_TRAVEL_PX)).toBe(true);
  });

  it('keeps the threshold reachable inside the travel limit', () => {
    expect(REPLY_THRESHOLD_PX).toBeLessThan(REPLY_MAX_TRAVEL_PX);
  });
});
