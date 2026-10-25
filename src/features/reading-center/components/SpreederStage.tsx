import React, { useEffect, useRef, useState } from "react";
import type { Preferences } from "../lib/types";
import type { Chunk, Line, Word } from "../lib/spreeder";
import type { SectionLayout, StageSize } from "../hooks/useSpreederEngine";

/**
 * Draws Spreeder's Serial / Flow / Highlight / Scroll stage with absolutely
 * positioned words, using the same geometry Spreeder computes for its canvas:
 * stage padding 20px, lines fontSize * lineSpacing apart.
 */
export function SpreederStage({
  prefs,
  fontStack,
  stage,
  layout,
  chunk,
  chunkIndex,
  delay,
  playing,
  seekVersion,
  onWordClick,
  onStageClick,
}: {
  prefs: Preferences;
  fontStack: string;
  stage: StageSize;
  layout: SectionLayout;
  chunk: Chunk | undefined;
  chunkIndex: number;
  delay: number;
  playing: boolean;
  seekVersion: number;
  onWordClick: (w: Word) => void;
  onStageClick: () => void;
}): React.ReactElement {
  const mode = prefs.reading_mode;
  const fs = prefs.font_size;
  const isFlow = mode === "flow";
  const ls = isFlow ? 1 : prefs.line_spacing;
  const [hover, setHover] = useState<number | null>(null);

  const wordSpan = (w: Word, x: number, y: number, color: string) => (
    <span
      key={w.index}
      data-word={w.index}
      onClick={(e) => {
        e.stopPropagation();
        onWordClick(w);
      }}
      onMouseEnter={() => setHover(w.index)}
      onMouseLeave={() => setHover((h) => (h === w.index ? null : h))}
      className="absolute cursor-pointer whitespace-pre"
      style={{
        left: x,
        top: y,
        lineHeight: `${fs}px`,
        color: hover === w.index ? "#0000ff" : color,
        textDecoration: hover === w.index ? "underline" : undefined,
      }}
    >
      {w.text}
    </span>
  );

  const drawLines = (lines: Line[], top: number, xOf: (l: Line) => number, colorOf: (w: Word) => string) =>
    lines.flatMap((l, i) => l.words.map((p) => wordSpan(p.word, xOf(l) + p.x, top + i * fs * ls, colorOf(p.word))));

  let content: React.ReactNode = null;
  if (chunk && (mode === "serial" || isFlow)) {
    const S = chunk.lines.length;
    const F = fs * S + (S - 1) * fs * (ls - 1);
    const center = !isFlow && prefs.center_text;
    content = drawLines(chunk.lines, (stage.height - F) / 2, (l) => (center ? (stage.width - l.width) / 2 : 20), () => "var(--rc-read)");
  } else if (chunk && (mode === "highlight" || mode === "scroll")) {
    const page = layout.pages[layout.chunkPage[chunkIndex]];
    if (page) {
      const inChunk = (w: Word) => w.index >= chunk.firstWord && w.index <= chunk.lastWord;
      const lines = mode === "scroll" ? page.lines.filter((l) => l.words.some((p) => inChunk(p.word))) : page.lines;
      const firstLine = page.lines.indexOf(lines[0]);
      content = lines.flatMap((l, i) =>
        l.words.map((p) =>
          wordSpan(p.word, 20 + p.x, (firstLine + i) * fs * ls, mode === "scroll" || inChunk(p.word) ? "var(--rc-read)" : "var(--rc-dim)"),
        ),
      );
    }
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ fontFamily: `${fontStack}, monospace`, fontSize: fs }}
      onClick={onStageClick}
    >
      {content}
      {isFlow && chunk && <FlowMask key={`${layout.sectionIndex}:${chunkIndex}:${seekVersion}`} duration={delay} playing={playing} />}
    </div>
  );
}

/**
 * Flow reveal: a surface-coloured mask sweeps left to right across the window
 * over the chunk's display time. (Spreeder's shipped animation multiplies by the
 * per-frame delta instead of elapsed time, so it barely moves; this is the
 * intended behaviour.)
 */
function FlowMask({ duration, playing }: { duration: number; playing: boolean }): React.ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animation = el.animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], { duration: Math.max(1, duration), fill: "forwards" });
    animation.pause();
    animationRef.current = animation;
    return () => { animation.cancel(); animationRef.current = null; };
  }, [duration]);
  useEffect(() => {
    if (playing) animationRef.current?.play();
    else animationRef.current?.pause();
  }, [playing, duration]);
  return <div ref={ref} aria-hidden data-rc-flow-mask className="pointer-events-none absolute inset-0" style={{ background: "var(--rc-surface)" }} />;
}
