import React from "react";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/highlightUtils";
import { looksLikeSpeakerLabel } from "@/lib/dialogue";

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
  onHighlightClick?: (id: string) => void;
  eraserMode?: boolean;
  /** Optional case-insensitive search term to overlay (does not mutate user highlights). */
  searchTerm?: string;
  /**
   * Overrides for the paragraph wrapper. An answer choice is one short block
   * inside its own row, so it wants no bottom margin and the row's own line
   * height rather than the stimulus's paragraph rhythm.
   */
  paragraphStyle?: React.CSSProperties;
}

// ─── Single source of truth for highlight/underline styles ───────────────────
function getHighlightStyles(color: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline',
    padding: 0,
    margin: 0,
    border: 'none',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    wordSpacing: 'inherit',
    verticalAlign: 'baseline',
    whiteSpace: 'pre-wrap',
    borderRadius: 0,
    WebkitBoxDecorationBreak: 'clone',
    // @ts-ignore
    boxDecorationBreak: 'clone',
  };

  if (color === 'underline') {
    return {
      ...base,
      background: 'transparent',
      backgroundImage: 'none',
      backgroundColor: 'transparent',
      mixBlendMode: 'normal',
      textDecoration: 'underline',
      textDecorationColor: '#000000',
      textDecorationThickness: '2px',
      textUnderlineOffset: '3px',
    };
  }

  const colors: Record<string, string> = {
    yellow: 'rgba(250, 204, 21, 0.32)',
    pink: 'rgba(244, 114, 182, 0.32)',
    orange: 'rgba(251, 146, 60, 0.32)',
  };
  const bg = colors[color] ?? colors.yellow;

  return {
    ...base,
    backgroundImage: 'none',
    backgroundColor: bg,
    // Multiply keeps overlapping highlight ranges from visually doubling up.
    mixBlendMode: 'multiply',
  };
}

// ─── Search-term overlay for plain-text segments only ───────────────────────
// Wraps case-insensitive matches inside a <mark> WITHOUT touching user
// highlight spans. Returns React nodes for the given plain text slice.
function renderWithSearch(text: string, searchTerm: string | undefined, keyPrefix: string): React.ReactNode {
  if (!searchTerm || searchTerm.trim().length < 2) return text;
  const term = searchTerm.trim();
  const lower = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  if (!lower.includes(lowerTerm)) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let i = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(lowerTerm, cursor);
    if (idx === -1) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (idx > cursor) nodes.push(text.slice(cursor, idx));
    nodes.push(
      <mark
        key={`${keyPrefix}-s${i++}`}
        style={{ backgroundColor: 'rgba(56, 189, 248, 0.55)', color: 'inherit', padding: 0 }}
      >
        {text.slice(idx, idx + term.length)}
      </mark>,
    );
    cursor = idx + term.length;
  }
  return <>{nodes}</>;
}

// ─── Inline segment renderer ─────────────────────────────────────────────────
function renderSegments(
  text: string,
  highlights: Highlight[],
  prefix: string,
  eraserMode: boolean | undefined,
  onHighlightClick: ((id: string) => void) | undefined,
  searchTerm?: string,
): React.ReactNode {
  if (highlights.length === 0) {
    return renderWithSearch(text, searchTerm, prefix);
  }

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    if (h.start > cursor) {
      const slice = text.slice(cursor, h.start);
      nodes.push(<span key={`${prefix}-t${i}`}>{renderWithSearch(slice, searchTerm, `${prefix}-t${i}`)}</span>);
    }
    nodes.push(
      <span
        key={`${prefix}-h${h.id}`}
        data-highlight-id={h.id}
        className={cn('hl', 'transition-all', eraserMode && 'cursor-pointer hover:opacity-60')}
        style={getHighlightStyles(h.color)}
        onClick={() => eraserMode && onHighlightClick?.(h.id)}
      >
        {text.slice(h.start, h.end)}
      </span>
    );
    cursor = h.end;
  }

  if (cursor < text.length) {
    const slice = text.slice(cursor);
    nodes.push(<span key={`${prefix}-tend`}>{renderWithSearch(slice, searchTerm, `${prefix}-tend`)}</span>);
  }

  return <>{nodes}</>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HighlightedText({
  text,
  highlights,
  onHighlightClick,
  eraserMode,
  searchTerm,
  paragraphStyle,
}: HighlightedTextProps) {
  const speakerPattern = /^([A-Z][A-Za-z’' -]{1,80}):\s+/;
  const turnSplitPattern = /(?=^[A-Z][A-Za-z’' -]{1,80}:\s)/gm;
  const rawSegments = text.split(turnSplitPattern).filter(s => s.trim());

  const dialogueTurns = rawSegments
    .map(seg => {
      const match = seg.match(speakerPattern);
      if (match && looksLikeSpeakerLabel(match[1])) {
        return { speaker: match[1], text: seg.slice(match[0].length).trim() };
      }
      return null;
    })
    .filter(Boolean);

  const isDialogue =
    dialogueTurns.length >= 2 &&
    dialogueTurns.length === rawSegments.length &&
    dialogueTurns.every(t => t !== null);

  if (isDialogue) {
    let currentOffset = 0;
    const turnRanges = dialogueTurns.map(turn => {
      const speakerPrefix = `${turn!.speaker}: `;
      const turnStart = text.indexOf(speakerPrefix, currentOffset);
      const start = turnStart + speakerPrefix.length;
      const end = start + turn!.text.length;
      currentOffset = end;
      return { turn: turn!, start, end };
    });

    return (
      <div className="space-y-4">
        {turnRanges.map((tr, idx) => {
          const turnHighlights = highlights
            .filter(h => h.start < tr.end && h.end > tr.start)
            .map(h => ({
              ...h,
              start: Math.max(0, h.start - tr.start),
              end: Math.min(tr.turn.text.length, h.end - tr.start),
            }));

          return (
            <div key={idx} className="leading-relaxed" style={{ lineHeight: 1.7 }}>
              <span className="font-bold">{tr.turn.speaker}:</span>{' '}
              <span className="inline" data-para-start={tr.start}>
                {renderSegments(tr.turn.text, turnHighlights, `d${idx}`, eraserMode, onHighlightClick, searchTerm)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const paragraphs = text.split('\n\n');

  let currentOffset = 0;
  const paragraphRanges = paragraphs.map(para => {
    const start = currentOffset;
    const end = currentOffset + para.length;
    currentOffset = end + 2;
    return { start, end, text: para };
  });

  return (
    <>
      {paragraphRanges.map((pr, idx) => {
        const paraHighlights = highlights
          .filter(h => h.start < pr.end && h.end > pr.start)
          .map(h => ({
            ...h,
            start: Math.max(0, h.start - pr.start),
            end: Math.min(pr.text.length, h.end - pr.start),
          }));

        return (
          <p key={idx} data-para-start={pr.start} style={{ margin: '0 0 12px', lineHeight: 1.6, ...paragraphStyle }}>
            {renderSegments(pr.text, paraHighlights, `p${idx}`, eraserMode, onHighlightClick, searchTerm)}
          </p>
        );
      })}
    </>
  );
}
