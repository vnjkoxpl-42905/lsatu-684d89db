import { describe, expect, it } from 'vitest';
import { parseProgressWindow } from './useProgressWindow';

describe('Progress timeframe', () => {
  it('accepts only supported windows', () => {
    expect(['7', '14', '21', '30', 'all'].map(parseProgressWindow)).toEqual([7, 14, 21, 30, 'all']);
    expect(parseProgressWindow('90')).toBeNull();
    expect(parseProgressWindow(null)).toBeNull();
  });
});
