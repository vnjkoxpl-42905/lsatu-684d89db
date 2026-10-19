import type { Chunk, Token } from "./types";

const SENTENCE_END = /[.!?]["'’”)\]]*$/;
const OTHER_PUNCT = /[,;:—–)\]]["'’”]*$/;

/** Split text into paragraphs: one or more blank lines separate paragraphs. */
export function splitParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function tokenize(body: string): Token[] {
  const tokens: Token[] = [];
  const paragraphs = splitParagraphs(body);
  paragraphs.forEach((para, paragraphIndex) => {
    const words = para.split(/\s+/).filter((w) => w.length > 0);
    words.forEach((text, i) => {
      const endsSentence = SENTENCE_END.test(text);
      tokens.push({
        index: tokens.length,
        text,
        paragraphIndex,
        endsSentence,
        hasPunctuation: !endsSentence && OTHER_PUNCT.test(text),
        endsParagraph: i === words.length - 1,
      });
    });
  });
  return tokens;
}

export function countWords(body: string): number {
  return tokenize(body).length;
}

/**
 * Group tokens into chunks of up to wordsPerLine * numberOfLines words.
 * A chunk never crosses a paragraph boundary.
 */
export function chunkTokens(tokens: Token[], wordsPerLine: number, numberOfLines: number): Chunk[] {
  const size = Math.max(1, wordsPerLine) * Math.max(1, numberOfLines);
  const chunks: Chunk[] = [];
  let current: Token[] = [];
  const flush = () => {
    if (current.length === 0) return;
    const rows: Token[][] = [];
    for (let i = 0; i < current.length; i += wordsPerLine) rows.push(current.slice(i, i + wordsPerLine));
    chunks.push({
      index: chunks.length,
      startWord: current[0].index,
      endWord: current[current.length - 1].index,
      rows,
    });
    current = [];
  };
  for (const t of tokens) {
    current.push(t);
    if (current.length === size || t.endsParagraph) flush();
  }
  flush();
  return chunks;
}

/** Index of the chunk that contains wordIndex. Returns 0 if not found. */
export function chunkIndexForWord(chunks: Chunk[], wordIndex: number): number {
  const i = chunks.findIndex((c) => wordIndex >= c.startWord && wordIndex <= c.endWord);
  return i === -1 ? 0 : i;
}

/** Normalise a passage title into a URL slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
