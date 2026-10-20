import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RcPassagePane } from './RcPassagePane';
import type { RcPassage } from '../lib/rcTypes';

vi.mock('../hooks/useRcMarkSurface', () => ({ useRcMarkSurface: () => ({}) }));
vi.mock('./RcSelectionPopover', () => ({ RcSelectionPopover: () => null }));

afterEach(cleanup);

describe('passage scroll restoration', () => {
  it('restores the requested position on layout changes and only resets for a new passage', () => {
    const passage = { passageId: 16, text: 'A long passage', title: null } as RcPassage;
    const props = {
      passage, highlights: [], color: 'yellow' as const,
      onColorChange: vi.fn(), onAddHighlight: vi.fn(), onRemoveHighlight: vi.fn(),
      onRemoveRange: vi.fn(), highlightMode: 'none' as const,
      findQuery: '', findIndex: 0, onFindCount: vi.fn(), onScroll: vi.fn(),
      textStyle: {}, scrollTop: 720, passageOnly: false,
    };
    const view = render(<RcPassagePane {...props} />);
    const pane = view.container.querySelector('.rc-passage-col') as HTMLDivElement;
    expect(pane.scrollTop).toBe(720);

    // Model the browser's shorter full-width scroll range after reflow.
    view.rerender(<RcPassagePane {...props} passageOnly scrollTop={377.6} />);
    expect(pane.scrollTop).toBe(377.6);
    fireEvent.scroll(pane);
    expect(props.onScroll).toHaveBeenLastCalledWith(377.6);
    view.rerender(<RcPassagePane {...props} />);
    expect(pane.scrollTop).toBe(720);

    // An ordinary render must not fight the student's scrolling.
    pane.scrollTop = 800;
    view.rerender(<RcPassagePane {...props} scrollTop={800} />);
    expect(pane.scrollTop).toBe(800);
    view.rerender(<RcPassagePane {...props} passage={{ ...passage, passageId: 17 }} scrollTop={0} />);
    expect(pane.scrollTop).toBe(0);
  });
});
