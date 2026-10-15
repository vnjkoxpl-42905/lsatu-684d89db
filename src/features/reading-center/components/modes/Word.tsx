import React from "react";
import type { Token } from "../../lib/types";

const WORD_BUTTON =
  "cursor-pointer border-0 bg-transparent p-0 text-inherit [font:inherit] hover:underline focus-visible:outline focus-visible:outline-1";

/** One passage word: a plain span while playing, a click target (jump or bookmark) when paused. */
export function Word({
  token,
  clickable,
  onWordClick,
}: {
  token: Token;
  clickable: boolean;
  onWordClick: (wordIndex: number) => void;
}): React.ReactElement {
  if (!clickable) return <span>{token.text}</span>;
  return (
    <button type="button" className={WORD_BUTTON} onClick={() => onWordClick(token.index)}>
      {token.text}
    </button>
  );
}

/** Words per visual line in Flow mode: about ten, always a whole number of chunks. */
export function flowLineWords(wordsPerLine: number): number {
  return wordsPerLine * Math.max(1, Math.ceil(10 / wordsPerLine));
}
