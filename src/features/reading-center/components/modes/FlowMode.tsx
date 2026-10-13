import React, { useMemo } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";
import { READING_TEXT_STYLE } from "../ReaderSurface";
import { Word, flowLineWords } from "./Word";

/**
 * Flow: the chunk flashes at the spot it would occupy in a normal line of text.
 * The line is about ten words (a whole number of chunks), so the eye travels
 * left to right across it before dropping to the next line. Words outside the
 * current chunk are invisible but keep their space.
 */
export function FlowMode({ tokens, chunks, chunk, prefs, playing, onWordClick }: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  const lines = useMemo(
    () => chunkTokens(tokens, flowLineWords(prefs.words_per_line), 1),
    [tokens, prefs.words_per_line],
  );

  if (!currentChunk) return <div className="flex-1" />;

  const currentLine =
    lines.find((l) => currentChunk.startWord >= l.startWord && currentChunk.startWord <= l.endWord) ?? lines[0];
  const lineTokens = currentLine?.rows[0] ?? [];

  return (
    <div className="flex-1 flex flex-col justify-center items-start text-left w-full pl-[15%] pr-6">
      <div style={READING_TEXT_STYLE}>
        {lineTokens.map((token, tokenIdx) => {
          const visible = token.index >= currentChunk.startWord && token.index <= currentChunk.endWord;
          return (
            <React.Fragment key={token.index}>
              {tokenIdx > 0 && " "}
              <span className={visible ? "" : "opacity-0 select-none pointer-events-none"} aria-hidden={!visible}>
                <Word token={token} clickable={!playing && visible} onWordClick={onWordClick} />
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
