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

it.each([-1, 9999, '0.25', null])('recovers defaults from malformed spacing and scheme %s', lineHeight => {
  localStorage.setItem('rc-player-a11y', JSON.stringify({ scheme: 'unknown', lineHeight }));
  const { result } = renderHook(() => useRcA11y());
  expect(result.current.settings.scheme).toBe('default');
  expect(result.current.extraLeading).toBe(0);
});

it('retains spacing and color across reload and migrates legacy spacing', () => {
  localStorage.setItem('rc-player-a11y', JSON.stringify({ lineHeight: 1.65 }));
  const first = renderHook(() => useRcA11y());
  expect(first.result.current.extraLeading).toBe(0.25);
  act(() => first.result.current.update({ lineHeight: 0.45, scheme: 'navy' }));
  first.unmount();
  const restored = renderHook(() => useRcA11y());
  expect(restored.result.current.settings).toEqual({ fontSize: 100, lineHeight: 0.45, scheme: 'navy', paragraphFocus: false });
});


it('persists paragraph focus and the percentage spacing choices independently', () => {
  const first = renderHook(() => useRcA11y());
  act(() => first.result.current.update({ paragraphFocus: true, lineHeight: 1.6 }));
  first.unmount();
  const restored = renderHook(() => useRcA11y());
  expect(restored.result.current.settings.paragraphFocus).toBe(true);
  expect(restored.result.current.extraLeading).toBe(1.6);
  act(() => restored.result.current.update({ lineHeight: 0.8 }));
  expect(restored.result.current.settings.paragraphFocus).toBe(true);
  expect(restored.result.current.extraLeading).toBe(0.8);
});
