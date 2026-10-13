import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useProgressWindow } from './useProgressWindow';

describe('selected-student window stays in its URL', () => {
  it('does not read or change the teacher own-practice default', () => {
    localStorage.setItem('lsatu:progress-window', '7');
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/teacher/students/s2/progress']}>{children}</MemoryRouter>;
    const { result } = renderHook(() => useProgressWindow(false), { wrapper });
    expect(result.current[0]).toBe(30);
    act(() => result.current[1](14));
    expect(result.current[0]).toBe(14);
    expect(localStorage.getItem('lsatu:progress-window')).toBe('7');
  });
});
