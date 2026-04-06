import React from "react";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/highlightUtils";

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
  onHighlightClick?: (id: string) => void;
  eraserMode?: boolean;
}

// ─── Single source of truth for highlight/underline styles ───────────────────
// Shared by both the dialogue and paragraph rendering paths.
function getHighlightStyles(color: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline',
    padding: '2px 0',
    margin: 0,
    border: 'none',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    wordSpacing: 'inherit',
    verticalAlign: 'baseline',
    whiteSpace: 'pre-wrap',
    borderRadius: 0,
    WebkitBoxDecorationBreak: 'clone',
    // @ts-ignore — valid CSS property, missing from older React types
    boxDecorationBreak: 'clone',
  };

  if (color === 'underline') {
    return {
      ...base,
      background: 'none',
      textDecoration: 'underline',
      textDecorationColor: '#000000',
      textDecorationThickness: '2px',
      textUnderlineOffset: '3px',
    };
  }

  const colors: Record<string, string> = {
    yellow: 'rgba(250, 204, 21, 0.5)',
    pink: 'rgba(244, 114, 182, 0.5)',
    orange: 'rgba(251, 146, 60, 0.5)',
  };
  const bg = colors[color] ?? colors.yellow;

  return {
    ...base,
    backgroundImage: `linear-gradient(${bg}, ${bg})`,
    backgroundPosition: '0 0.15em',
    backgroundSize: '100% calc(100% - 0.3em)',
    backgroundRepeat: 'no-repeat',
  };
}

// ─── Inline segment renderer ─────────────────────────────────────────────────
// Splits `text` into plain and highlighted spans given pre-adjusted highlights
// (offsets already relative to the start of `text`).
function renderSegments(
  text: string,
  highlights: Highlight[],
  prefix: string,
  eraserMode: boolean | undefined,
  onHighlightClick: ((id: string) => void) | undefined
): React.ReactNode {
  if (highlights.length === 0) return text;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    if (h.start > cursor) {
      nodes.push(<span key={`${prefix}-t${i}`}>{text.slice(cursor, h.start)}</span>);
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
    nodes.push(<span key={`${prefix}-tend`}>{text.slice(cursor)}</span>);
  }

  return <>{nodes}</>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HighlightedText({
  text,
  highlights,
  onHighlightClick,
  eraserMode,
}: HighlightedTextProps) {
  // Detect multi-speaker dialogue (e.g. "Sam: text\nTiya: text")
  const speakerPattern = /^([A-Z][a-z]*):\s+/;
  const turnSplitPattern = /(?=^[A-Z][a-z]*:\s)/gm;
  const rawSegments = text.split(turnSplitPattern).filter(s => s.trim());

  const dialogueTurns = rawSegments
    .map(seg => {
      const match = seg.match(speakerPattern);
      if (match) return { speaker: match[1], text: seg.slice(match[0].length).trim() };
      return null;
    })
    .filter(Boolean);

  const isDialogue =
    dialogueTurns.length >= 2 &&
    dialogueTurns.length === rawSegments.length &&
    dialogueTurns.every(t => t !== null);

  // ── Dialogue rendering ──────────────────────────────────────────────────
  if (isDialogue) {
    let currentOffset = 0;
    const turnRanges = dialogueTurns.map(turn => {
      const speakerPrefix = `${turn!.speaker}: `;
      const turnStart = text.indexOf(speakerPrefix, currentOffset);
      const start = turnStart + speakerPrefix.length; // body start in raw string
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
              {/*
                data-para-start = raw-string offset where this turn's body begins.
                captureTextSelection uses this to compute accurate character offsets
                without relying on DOM .toString() across block boundaries.
              */}
              <span className="inline" data-para-start={tr.start}>
                {renderSegments(tr.turn.text, turnHighlights, `d${idx}`, eraserMode, onHighlightClick)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Paragraph rendering ─────────────────────────────────────────────────
  const paragraphs = text.split('\n\n');

  if (highlights.length === 0) {
    return (
      <>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            {para}
          </p>
        ))}
      </>
    );
  }

  let currentOffset = 0;
  const paragraphRanges = paragraphs.map(para => {
    const start = currentOffset;
    const end = currentOffset + para.length;
    currentOffset = end + 2; // account for the '\n\n' separator
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
          /*
            data-para-start = raw-string offset where this paragraph begins.
            Within a single <p> there are no block boundaries, so within-element
            DOM text offsets match raw string offsets exactly.
          */
          <p key={idx} data-para-start={pr.start} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            {renderSegments(pr.text, paraHighlights, `p${idx}`, eraserMode, onHighlightClick)}
          </p>
        );
      })}
    </>
  );
}
