import * as React from 'react';
import { RC_HIGHLIGHT_COLORS, type RcHighlightColor } from '../lib/rcTypes';

/**
 * The floating control that appears at a text selection inside the passage or a
 * choice: apply the current color, pick a different one, or remove a highlight
 * the student clicked on.
 */

export interface RcSelectionAnchor {
  x: number;
  y: number;
  mode: 'apply' | 'remove';
}

interface Props {
  anchor: RcSelectionAnchor | null;
  color: RcHighlightColor;
  onColorChange: (color: RcHighlightColor) => void;
  /** The color is passed explicitly: picking a swatch applies it immediately,
   *  and reading it from state here would apply the previously chosen one. */
  onApply: (color: RcHighlightColor) => void;
  onRemove: () => void;
  onDismiss: () => void;
}

export function RcSelectionPopover({
  anchor,
  color,
  onColorChange,
  onApply,
  onRemove,
  onDismiss,
}: Props) {
  const [swatchesOpen, setSwatchesOpen] = React.useState(false);

  React.useEffect(() => {
    if (!anchor) setSwatchesOpen(false);
  }, [anchor]);

  if (!anchor) return null;

  return (
    <div
      className="rc-selection-popover"
      style={{ left: anchor.x, top: anchor.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {anchor.mode === 'remove' ? (
        <button type="button" onClick={onRemove}>
          Remove highlight
        </button>
      ) : (
        <>
          <button type="button" onClick={() => onApply(color)}>
            Highlight
          </button>
          <button
            type="button"
            aria-label="Choose highlight color"
            onClick={() => setSwatchesOpen((v) => !v)}
          >
            ▾
          </button>
          {swatchesOpen && (
            <span className="rc-swatches">
              {(Object.keys(RC_HIGHLIGHT_COLORS) as RcHighlightColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  className="rc-swatch"
                  style={{
                    background: RC_HIGHLIGHT_COLORS[c],
                    // slate-900, the official chrome's selected treatment. This
                    // was the old LawHub blue, which no longer appears anywhere.
                    outline: c === color ? '2px solid #0f172a' : 'none',
                  }}
                  onClick={() => {
                    onColorChange(c);
                    setSwatchesOpen(false);
                    onApply(c);
                  }}
                />
              ))}
            </span>
          )}
        </>
      )}
      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}

export default RcSelectionPopover;
