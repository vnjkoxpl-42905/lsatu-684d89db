import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RcPassagePane } from './RcPassagePane';
import type { RcPassage } from '../lib/rcTypes';

vi.mock('../hooks/useRcMarkSurface', () => ({ useRcMarkSurface: () => ({}) }));
vi.mock('./RcSelectionPopover', () => ({ RcSelectionPopover: () => null }));

afterEach(cleanup);

describe('passage scroll restoration', () => {
  it('reveals one formatted sentence at a time and safely changes passages without losing the source', () => {
    const props = { passage: { passageId: 16, text: 'First **sentence.** Second sentence.\n\nThird sentence.', title: null } as RcPassage,
      highlights: [], color: 'yellow' as const, onColorChange: vi.fn(), onAddHighlight: vi.fn(), onRemoveHighlight: vi.fn(), onRemoveRange: vi.fn(), highlightMode: 'none' as const,
      findQuery: '', findIndex: 0, onFindCount: vi.fn(), onScroll: vi.fn(), textStyle: {}, scrollTop: 0, onSentenceCount: vi.fn() };
    const view = render(<RcPassagePane {...props} sentenceLimit={1} />);
    const source = view.container.querySelector('.rc-passage-text')!;
    const original = source.textContent;
    expect(source.querySelector('strong')).toBeVisible();
    expect([...source.querySelectorAll<HTMLSpanElement>('[data-rc-sentence-fragment]')].find(span => span.textContent?.includes('Second sentence'))).not.toBeVisible();
    view.rerender(<RcPassagePane {...props} sentenceLimit={2} />);
    expect(source.textContent).toBe(original);
    expect([...source.querySelectorAll<HTMLSpanElement>('[data-rc-sentence-fragment]')].find(span => span.textContent?.includes('Second sentence'))).toBeVisible();
    view.rerender(<RcPassagePane {...props} passage={{ ...props.passage, passageId: 17, text: 'A different first sentence. Another sentence.' }} sentenceLimit={1} />);
    expect(source.textContent).toContain('A different first sentence. Another sentence.');
    expect(source.textContent).not.toContain('Third sentence.');
    expect(props.onSentenceCount).toHaveBeenLastCalledWith(2);
  });
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
