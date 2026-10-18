import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RcExamPane } from './RcExamPane';
describe('responsive RC pane layout', () => {
  it('switches panes in a narrow container and restores both at a usable width', () => {
    let resize!: (entries: { contentRect: { width: number } }[]) => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: typeof resize) { resize = callback; }
      observe() { resize([{ contentRect: { width: 600 } }]); }
      disconnect() {}
    });
    try {
      render(<RcExamPane responsive schemeClassName="" passageOnly={false} passage={<p>Original passage</p>} question={<p>Original question</p>} />);
      expect(screen.getByText('Original passage')).toBeInTheDocument();
      expect(screen.queryByText('Original question')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Questions' }));
      expect(screen.getByText('Original question')).toBeInTheDocument();
      expect(screen.queryByText('Original passage')).toBeNull();
      act(() => resize([{ contentRect: { width: 1000 } }]));
      expect(screen.getByText('Original passage')).toBeInTheDocument();
      expect(screen.getByText('Original question')).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Reader pane' })).toBeNull();
    } finally { vi.unstubAllGlobals(); }
  });
});
