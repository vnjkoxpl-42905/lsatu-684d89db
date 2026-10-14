import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

type BroadcastHandler = (message: { payload: unknown }) => void;

const handlers: BroadcastHandler[] = [];
const sent: unknown[] = [];
const channelMock = {
  on: vi.fn((_type: string, _filter: unknown, handler: BroadcastHandler) => {
    handlers.push(handler);
    return channelMock;
  }),
  subscribe: vi.fn(() => channelMock),
  send: vi.fn((message: unknown) => {
    sent.push(message);
    return Promise.resolve('ok');
  }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  },
}));

import { useTypingIndicator, TYPING_DECAY_MS, TYPING_THROTTLE_MS } from './useTypingIndicator';

function emit(payload: { user_id: string; stopped?: boolean }) {
  handlers.forEach((handler) => handler({ payload }));
}

describe('useTypingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.length = 0;
    sent.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lights up on the other participant typing and decays after the window', () => {
    const { result, unmount } = renderHook(() => useTypingIndicator('conv-1', 'me'));

    expect(result.current.otherTyping).toBe(false);
    act(() => emit({ user_id: 'them' }));
    expect(result.current.otherTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(TYPING_DECAY_MS + 50);
    });
    expect(result.current.otherTyping).toBe(false);
    unmount();
  });

  it('ignores its own broadcasts and clears immediately on a stop event', () => {
    const { result, unmount } = renderHook(() => useTypingIndicator('conv-1', 'me'));

    act(() => emit({ user_id: 'me' }));
    expect(result.current.otherTyping).toBe(false);

    act(() => emit({ user_id: 'them' }));
    expect(result.current.otherTyping).toBe(true);
    act(() => emit({ user_id: 'them', stopped: true }));
    expect(result.current.otherTyping).toBe(false);
    unmount();
  });

  it('throttles outgoing typing broadcasts', () => {
    const { result, unmount } = renderHook(() => useTypingIndicator('conv-1', 'me'));

    act(() => {
      result.current.broadcastTyping();
      result.current.broadcastTyping();
      result.current.broadcastTyping();
    });
    expect(sent).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(TYPING_THROTTLE_MS + 50);
      result.current.broadcastTyping();
    });
    expect(sent).toHaveLength(2);
    unmount();
  });
});
