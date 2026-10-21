import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RcChoiceRow } from './RcChoiceRow';
import type { RcChoice, RcHighlight, RcHighlightMode } from '../lib/rcTypes';

const choice: RcChoice = {
  letter: 'B',
  text: 'The author regards the theory as incomplete.',
  tag: null,
  percent: null,
  responseCount: null,
  correct: false,
  explanation: null,
};

interface Overrides {
  annotationsDisabled?: boolean;
  selected?: boolean;
  highlightMode?: RcHighlightMode;
  eliminated?: boolean;
  disabled?: boolean;
  revealed?: boolean;
  highlights?: RcHighlight[];
}

function renderRow(overrides: Overrides = {}) {
  const onSelect = vi.fn();
  const onToggleElimination = vi.fn();
  const onAnchor = vi.fn();
  const paneRef = React.createRef<HTMLUListElement>();
  render(
    <ul ref={paneRef}>
      <RcChoiceRow
        choice={choice}
        questionId={42}
        selected={overrides.selected ?? false}
        eliminated={overrides.eliminated ?? false}
        revealed={overrides.revealed ?? false}
        disabled={overrides.disabled}
        annotationsDisabled={overrides.annotationsDisabled}
        onSelect={onSelect}
        onToggleElimination={onToggleElimination}
        highlights={overrides.highlights ?? []}
        color="yellow"
        highlightMode={overrides.highlightMode ?? 'none'}
        onAddHighlight={vi.fn()}
        onRemoveHighlight={vi.fn()}
        onRemoveRange={vi.fn()}
        onAnchor={onAnchor}
        paneRef={paneRef}
      />
    </ul>,
  );
  const text = screen.getByText(/regards the theory/);
  return { onSelect, onToggleElimination, onAnchor, text };
}

/** A drag across the choice text, as the browser leaves it behind on click. */
function selectAll(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

// jsdom lays nothing out: a Range has no client rect, and the popover anchor
// is measured from one.
beforeAll(() => {
  if (!('getBoundingClientRect' in Range.prototype)) {
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 10, right: 60, top: 20, bottom: 40, width: 50, height: 20 }),
    });
  }
});

afterEach(() => window.getSelection()?.removeAllRanges());

describe('RcChoiceRow text surface', () => {
  it('keeps answer choices usable when annotation hydration disables marking', () => {
    const { onSelect, onAnchor, text } = renderRow({ annotationsDisabled: true, highlightMode: 'yellow' });
    fireEvent.mouseUp(text); fireEvent.click(text);
    expect(onSelect).toHaveBeenCalledWith('B');
    expect(onAnchor.mock.calls.every(([anchor]) => anchor === null)).toBe(true);
  });
  it('a saved selected cross-out stays visible, unstruck and selectable with crossing out disabled', () => {
    const { onSelect, onToggleElimination, text } = renderRow({ selected: true, eliminated: true });
    const surface = text.closest('[data-rc-mark-surface]')!;
    expect(surface).not.toHaveClass('line-through');
    expect(text).toBeVisible();
    expect(text.closest('li')).not.toHaveClass('opacity-55');
    const crossOut = screen.getByRole('button', { name: 'Choice B is your answer and cannot be crossed out' });
    expect(crossOut).toBeDisabled();
    fireEvent.click(crossOut);
    expect(onToggleElimination).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    const badge = screen.getByRole('button', { name: 'Choice B' });
    expect(badge).toBeEnabled();
    fireEvent.click(badge);
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('cross-out controls have an explicit visible touch affordance', () => {
    renderRow();
    expect(screen.getByRole('button', { name: 'Cross out choice B' })).toHaveClass('[@media(hover:none)]:opacity-100');
  });
  it('a plain click on the text answers', () => {
    const { onSelect, text } = renderRow();
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('a click that left a selection behind does not answer, it asks to highlight', () => {
    const { onSelect, onAnchor, text } = renderRow();
    selectAll(text);
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onAnchor).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'apply' }),
      expect.objectContaining({ applyPending: expect.any(Function) }),
    );
  });

  it('under a marker a plain click still answers, after a beat', () => {
    vi.useFakeTimers();
    try {
      for (const mode of ['yellow', 'pink', 'orange', 'underline'] as const) {
        const { onSelect, text } = renderRow({ highlightMode: mode });
        fireEvent.mouseUp(text);
        fireEvent.click(text);
        expect(onSelect, mode).not.toHaveBeenCalled();
        vi.advanceTimersByTime(350);
        expect(onSelect, mode).toHaveBeenCalledWith('B');
        cleanup();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('with the eraser a click beside a mark still answers', () => {
    const { onSelect, text } = renderRow({ highlightMode: 'erase' });
    fireEvent.mouseUp(text);
    fireEvent.click(text);
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('under a marker a double-click on a word marks it and never answers', () => {
    // Browser order: down, up, click (caret only), down (word selected), up,
    // click, dblclick. The first click cannot yet tell it is not a pick.
    vi.useFakeTimers();
    try {
      const { onSelect, text } = renderRow({ highlightMode: 'yellow' });
      fireEvent.mouseDown(text);
      fireEvent.mouseUp(text);
      fireEvent.click(text, { detail: 1 });
      fireEvent.mouseDown(text, { detail: 2 });
      selectAll(text);
      fireEvent.mouseUp(text, { detail: 2 });
      fireEvent.click(text, { detail: 2 });
      fireEvent.doubleClick(text);
      vi.advanceTimersByTime(500);
      expect(onSelect).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a mark is taken even when the mouse is released outside the text', () => {
    // The drag ran past the end of the choice into the row's padding.
    const onAdd = vi.fn();
    const paneRef = React.createRef<HTMLUListElement>();
    render(
      <ul ref={paneRef}>
        <RcChoiceRow
          choice={choice}
          questionId={42}
          selected={false}
          eliminated={false}
          revealed={false}
          onSelect={vi.fn()}
          onToggleElimination={vi.fn()}
          highlights={[]}
          color="yellow"
          highlightMode="pink"
          onAddHighlight={onAdd}
          onRemoveHighlight={vi.fn()}
          onRemoveRange={vi.fn()}
          onAnchor={vi.fn()}
          paneRef={paneRef}
        />
      </ul>,
    );
    const text = screen.getByText(/regards the theory/);
    selectAll(text);
    fireEvent.mouseUp(paneRef.current!);
    expect(onAdd).toHaveBeenCalledWith(expect.stringMatching(/^q42:B$/), 0, choice.text.length, 'pink', 'highlight');
  });

  it('an eliminated row never answers from the text', () => {
    const { onSelect, text } = renderRow({ eliminated: true });
    fireEvent.click(text);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a disabled (revealed) row never answers from the text', () => {
    const { onSelect, text } = renderRow({ disabled: true, revealed: true });
    fireEvent.click(text);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('the letter badge still answers', () => {
    const { onSelect } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: 'Choice B' }));
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('the text is not a button, so a drag can start inside it', () => {
    const { text } = renderRow();
    expect(text.closest('button')).toBeNull();
    expect(text.closest('[data-rc-mark-surface]')).not.toBeNull();
  });

  it('paints only the marks on its own target, even when disabled', () => {
    const { text } = renderRow({
      disabled: true,
      revealed: true,
      highlights: [
        { target: 'q42:B', start: 4, end: 10, color: 'pink' },
        { target: 'q42:A', start: 0, end: 5, color: 'yellow' },
        { target: 'q43:B', start: 0, end: 5, color: 'yellow', kind: 'underline' },
        { target: 'passage', start: 0, end: 5, color: 'orange' },
      ],
    });
    const surface = text.closest('[data-rc-mark-surface]')!;
    const marks = surface.querySelectorAll('mark[data-rc-highlight]');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('author');
  });
});
