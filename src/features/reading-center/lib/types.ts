export type ReadingMode = "serial" | "flow" | "highlight" | "scroll" | "ereader";
export type ReaderTheme = "light" | "dark" | "high_contrast" | "system";

export interface Passage {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  body: string;
  cover_url: string | null;
  word_count: number;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Preferences {
  wpm: number;
  reading_mode: ReadingMode;
  number_of_lines: number;
  words_per_line: number;
  center_text: boolean;
  theme: ReaderTheme;
  font_family: string;
  font_size: number;
  line_spacing: number;
  punctuation_pauses: boolean;
  speed_variability: boolean;
  goal_wpm: number;
}

export interface Progress {
  passage_id: string;
  word_index: number;
  completed_at: string | null;
  last_opened_at: string;
  hidden_from_recent: boolean;
}

export interface Bookmark {
  id: string;
  passage_id: string;
  word_index: number;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  passage_id: string;
  reading_mode: ReadingMode;
  wpm: number;
  words_read: number;
  active_ms: number;
  paused_ms: number;
  started_at: string;
  ended_at: string;
}

export interface Token {
  index: number;          // position in the whole passage, starting at 0
  text: string;           // the word with its punctuation attached
  paragraphIndex: number; // starting at 0
  endsSentence: boolean;
  hasPunctuation: boolean;
  endsParagraph: boolean;
}

export interface Chunk {
  index: number;          // chunk number, starting at 0
  startWord: number;      // token index of the first word
  endWord: number;        // token index of the last word (inclusive)
  rows: Token[][];        // numberOfLines rows, each up to wordsPerLine tokens
}
