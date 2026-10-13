import { describe, it, expect, beforeEach } from 'vitest';
import {
  setMessengerOpen,
  setHelpSheetOpen,
  isMessengerOpen,
  isBottomRightSurfaceOpen,
  subscribeBottomRightSurface,
} from './messengerOpenBus';

beforeEach(() => {
  setMessengerOpen(false);
  setHelpSheetOpen(false);
});

describe('messengerOpenBus — shared bottom-right surface signal', () => {
  it('reports any-surface-open when either surface opens', () => {
    expect(isBottomRightSurfaceOpen()).toBe(false);
    setMessengerOpen(true);
    expect(isBottomRightSurfaceOpen()).toBe(true);
    setMessengerOpen(false);
    expect(isBottomRightSurfaceOpen()).toBe(false);
    setHelpSheetOpen(true);
    expect(isBottomRightSurfaceOpen()).toBe(true);
  });

  it('keeps isMessengerOpen scoped to the messenger panel only', () => {
    setHelpSheetOpen(true);
    expect(isMessengerOpen()).toBe(false);
    expect(isBottomRightSurfaceOpen()).toBe(true);
    setMessengerOpen(true);
    expect(isMessengerOpen()).toBe(true);
  });

  it('stays open until BOTH surfaces close', () => {
    setMessengerOpen(true);
    setHelpSheetOpen(true);
    setMessengerOpen(false);
    expect(isBottomRightSurfaceOpen()).toBe(true);
    setHelpSheetOpen(false);
    expect(isBottomRightSurfaceOpen()).toBe(false);
  });

  it('notifies subscribers on change', () => {
    let hits = 0;
    const unsub = subscribeBottomRightSurface(() => {
      hits += 1;
    });
    setMessengerOpen(true);
    setMessengerOpen(true); // no-op, already open
    setMessengerOpen(false);
    unsub();
    expect(hits).toBe(2);
  });
});
