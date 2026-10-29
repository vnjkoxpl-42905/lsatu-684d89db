import type { Token, Chunk, Preferences } from "../../lib/types";

export interface ModeProps {
  tokens: Token[];
  chunks: Chunk[];
  chunk: number;              // current chunk index
  prefs: Preferences;
  playing: boolean;
  onWordClick: (wordIndex: number) => void; // used for jump and bookmarks
}

export interface EReaderModeProps extends ModeProps {
  page: number;
  onPageCountChange: (count: number) => void;
  onPageChange: (page: number) => void;
  searchQuery: string;
}
