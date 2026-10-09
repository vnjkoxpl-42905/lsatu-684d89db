import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { useRcA11y } from './useRcA11y';

beforeEach(() => localStorage.clear());

it('keeps a chosen reading size after remounting', () => {
  const first = renderHook(() => useRcA11y());
  act(() => first.result.current.update({ fontSize: 125 }));
  first.unmount();
  const restored = renderHook(() => useRcA11y());
  expect(restored.result.current.fontScale).toBe(1.25);
});

it.each([0, -100, '125', 9999])('recovers a usable default from an invalid saved text size %s', size => {
  localStorage.setItem('rc-player-a11y', JSON.stringify({ fontSize: size }));
  const { result } = renderHook(() => useRcA11y());
  expect(result.current.fontScale).toBe(1);
});
