import React, { useMemo, useRef, useEffect } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";
import { READING_TEXT_STYLE } from "../ReaderSurface";
import { Word } from "./Word";

export function HighlightMode({ tokens, chunks, chunk, prefs, playing, onWordClick }: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  const lines = useMemo(() => chunkTokens(tokens, prefs.words_per_line, 1), [tokens, prefs.words_per_line]);

  // Keep the current chunk vertically centred in this scroll box; inline "nearest"
  // stops the page from scrolling sideways.
  useEffect(() => {
    activeWordRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: prefs.wpm > 600 ? "auto" : "smooth",
    });
  }, [chunk, prefs.wpm, prefs.font_size, prefs.line_spacing, prefs.font_family]);

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto px-6 py-[30vh] flex justify-center">
      <div className="max-w-[46rem] w-full" style={READING_TEXT_STYLE}>
        {lines.map((line, lineIdx) => {
          const rowTokens = line.rows[0] ?? [];
          const endsParagraph = rowTokens[rowTokens.length - 1]?.endsParagraph;
          return (
            <div key={lineIdx} className={endsParagraph ? "mb-6" : ""}>
              {rowTokens.map((token, tokenIdx) => {
                const current =
                  !!currentChunk && token.index >= currentChunk.startWord && token.index <= currentChunk.endWord;
                return (
                  <React.Fragment key={token.index}>
                    {tokenIdx > 0 && " "}
                    <span
                      ref={currentChunk && token.index === currentChunk.startWord ? activeWordRef : null}
                      style={{ opacity: current ? 1 : 0.35 }}
                      className={current ? "font-semibold" : ""}
                    >
                      <Word token={token} clickable={!playing} onWordClick={onWordClick} />
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
