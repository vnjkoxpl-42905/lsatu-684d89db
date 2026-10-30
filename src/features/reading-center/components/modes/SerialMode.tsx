import React from "react";
import type { ModeProps } from "./types";
import { READING_TEXT_STYLE } from "../ReaderSurface";
import { Word } from "./Word";

export function SerialMode({ chunks, chunk, prefs, playing, onWordClick }: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  if (!currentChunk) return <div className="flex-1" />;

  const containerClasses = prefs.center_text
    ? "flex-1 flex flex-col justify-center items-center text-center w-full px-6"
    : "flex-1 flex flex-col justify-center items-start text-left w-full pl-[15%] pr-6";

  return (
    <div className={containerClasses} style={READING_TEXT_STYLE}>
      {currentChunk.rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          {row.map((token, tokenIdx) => (
            <React.Fragment key={token.index}>
              {tokenIdx > 0 && " "}
              <Word token={token} clickable={!playing} onWordClick={onWordClick} />
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
