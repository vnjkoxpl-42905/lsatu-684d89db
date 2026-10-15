/**
 * Port of Spreeder's reading engine (static analysis of the shipped bundle,
 * 2026-10-13). Pure functions only. See
 * dev/ai-os/research/2026-10-13-spreeder-reconstruction-spec.md section 4.
 */

export interface Word {
  index: number;        // 0-based position in the passage (Spreeder id - 1)
  text: string;
  sectionIndex: number;
  charPosition: number; // offset in the normalised passage
}

export interface Section {
  index: number;
  text: string;
  words: Word[];
}

export interface TextModel {
  sections: Section[];
  words: Word[];
}

/** Spreeder stripNewLines + breakToSections pre-pass: one space-separated stream, no paragraphs. */
export function normalizeText(body: string): string {
  return body
    .replace(/[\n\t\r]/g, " ")
    .replace(/—/g, "-")
    .replace(/┘/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ABBREVIATIONS = ["dr", "mr", "mrs", "ms"];

/** Sentences grouped into sections of about 2000 characters, hard-split past 2400. */
export function breakToSections(text: string): string[] {
  const sentences = text.match(/[^.!?]+([.!?"”]+|$)/gim) ?? [];
  const out: string[] = [];
  let acc = "";
  const push = (s: string) => out.push(s.trim());
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (acc.length + s.length < 2000) {
      acc += s;
    } else if (acc.length + s.length > 2400) {
      const room = Math.max(0, 2400 - acc.length);
      const head = s.match(new RegExp("^.{0," + room + "}[^\\s]+", "s"));
      if (head && head.length > 0) {
        let part = head[0];
        if (part.length > acc.length + 2600) part = part.substr(0, 2600 - acc.length);
        acc += part;
        push(acc);
        acc = "";
        sentences[i] = s.substr(part.length);
        i--;
      } else {
        acc += s;
        push(acc);
        acc = "";
      }
    } else {
      acc += s;
      let close = true;
      if (i + 1 < sentences.length) {
        if (sentences[i + 1].charAt(0).replace(/\s+/g, "").length > 0) close = false;
        if (close) {
          const tail = s.match(/\s[a-z]+.$/gi);
          if (tail && tail.length > 0) {
            const w = tail[0].substr(0, tail[0].length - 1).substr(1);
            if (w.length === 1 || ABBREVIATIONS.includes(w.toLowerCase())) close = false;
          }
        }
      }
      if (close) {
        push(acc);
        acc = "";
      }
    }
  }
  if (acc.length > 0) push(acc);
  return out.filter((s) => s.length > 0);
}

export function buildTextModel(body: string): TextModel {
  const sectionTexts = breakToSections(normalizeText(body));
  const sections: Section[] = [];
  const words: Word[] = [];
  let pos = 0;
  sectionTexts.forEach((text, si) => {
    const sw: Word[] = [];
    for (const t of text.split(" ")) {
      const w: Word = { index: words.length, text: t, sectionIndex: si, charPosition: pos };
      words.push(w);
      sw.push(w);
      pos += t.length + 1;
    }
    sections.push({ index: si, text, words: sw });
  });
  return { sections, words };
}

// ---------------------------------------------------------------- layout

export type Measure = (text: string) => number;

export interface PlacedWord {
  word: Word;
  x: number; // relative to its line
}

export interface Line {
  words: PlacedWord[];
  width: number; // includes trailing space, as Spreeder measures it
}

/** Fill a line while `x + width(word + space) <= maxWidth` and it holds fewer than wordsPerLine words. */
export function buildLines(words: Word[], measure: Measure, maxWidth: number, wordsPerLine: number): Line[] {
  const space = measure(" ");
  const lines: Line[] = [];
  let cur: PlacedWord[] = [];
  let x = 0;
  for (const word of words) {
    const w = measure(word.text) + space;
    if (cur.length > 0 && !(x + w <= maxWidth && cur.length < wordsPerLine)) {
      lines.push({ words: cur, width: x });
      cur = [];
      x = 0;
    }
    cur.push({ word, x });
    x += w;
  }
  if (cur.length > 0) lines.push({ words: cur, width: x });
  return lines;
}

export interface Chunk {
  lines: Line[];
  firstWord: number; // global word index
  lastWord: number;
  text: string;
}

function toChunk(lines: Line[]): Chunk {
  const all = lines.flatMap((l) => l.words);
  return {
    lines,
    firstWord: all[0].word.index,
    lastWord: all[all.length - 1].word.index,
    text: all.map((p) => p.word.text).join(" "),
  };
}

/** Serial / Flow: a slide is numberOfLines lines. */
export function serialChunks(lines: Line[], numberOfLines: number): Chunk[] {
  const out: Chunk[] = [];
  for (let i = 0; i < lines.length; i += numberOfLines) out.push(toChunk(lines.slice(i, i + numberOfLines)));
  return out;
}

export interface Page {
  lines: Line[];
  groups: Chunk[];
}

/**
 * Highlight / Scroll: a page holds floor((height - 20) / fontSize) lines (Spreeder
 * ignores line spacing here), split into groups of numberOfLines lines.
 */
export function highlightPages(lines: Line[], stageHeight: number, fontSize: number, numberOfLines: number): Page[] {
  const linesPerPage = Math.max(1, Math.floor((stageHeight - 20) / fontSize));
  const groupsPerPage = Math.max(1, Math.floor(linesPerPage / numberOfLines));
  const perPage = groupsPerPage * numberOfLines;
  const pages: Page[] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    const pl = lines.slice(i, i + perPage);
    const groups: Chunk[] = [];
    for (let g = 0; g < pl.length; g += numberOfLines) groups.push(toChunk(pl.slice(g, g + numberOfLines)));
    pages.push({ lines: pl, groups });
  }
  return pages;
}

// ---------------------------------------------------------------- timing

/**
 * Spreeder ships /[\\.\\?!:;\\-\\–,]/: inside the class "\\-\\" is a backslash-to-backslash
 * range, so the ASCII hyphen does NOT double a chunk; backslash, en dash and the rest do.
 */
const PUNCTUATION = /[\\.?!:;–,]/;

export interface DelayOptions {
  wpm: number;
  numberOfLines: number;
  speedVariability: boolean;
  punctuationPauses: boolean;
}

/** Spreeder computeSwitchingTimeDelays for one section. */
export function chunkDelays(section: Section, chunks: Chunk[], opts: DelayOptions): number[] {
  const n = chunks.length;
  if (n === 0) return [];
  const total = Math.round((section.words.length / opts.wpm) * 60000);
  const perChunk = Math.round(total / n);
  const avgChars = section.text.length / n;
  const lastLines = chunks[n - 1].lines.length;
  const even = evenChunkDelays(total, n, lastLines, opts.numberOfLines);
  return chunks.map((c, i) => {
    const notLast = i + 1 < n;
    let d = opts.speedVariability ? perChunk * ((c.text.length + (notLast ? 1 : 0)) / avgChars) : notLast ? even.even : even.last;
    if (opts.punctuationPauses && PUNCTUATION.test(c.text)) d *= 2;
    return d;
  });
}

export function evenChunkDelays(total: number, count: number, lastLines: number, numberOfLines: number): { even: number; last: number } {
  if (count <= 1) return { even: total, last: total };
  const f = Math.min(Math.max(lastLines / numberOfLines, 0), 1);
  const even = total / (count - 1 + f);
  return { even, last: even * f };
}

/** Spreeder computeTotalTimeBySection: word-count chunks of groupSize * lines, used for "remaining". */
export function sectionTime(text: string, opts: { wpm: number; groupSize: number; numberOfLines: number; punctuationPauses: boolean }): number {
  if (!text) return 0;
  const n = Math.max(1, opts.groupSize * opts.numberOfLines);
  const chunks: string[] = Array.from(text.match(new RegExp(`[\\S]+(?:\\s+[\\S]+){0,${n - 1}}`, "g")) ?? []);
  const totalWords = text.split(" ").length;
  const total = Math.round((totalWords / opts.wpm) * 60000);
  if (!opts.punctuationPauses) return total;
  const per = Math.round(total / chunks.length);
  return chunks.reduce((sum, c) => sum + (PUNCTUATION.test(c) ? 2 * per : per), 0);
}

export function remainingMs(model: TextModel, wordIndex: number, opts: { wpm: number; groupSize: number; numberOfLines: number; punctuationPauses: boolean }): number {
  const word = model.words[wordIndex] ?? model.words[0];
  if (!word) return 0;
  const section = model.sections[word.sectionIndex];
  const offset = word.index - section.words[0].index;
  const rest = section.words.slice(offset).map((w) => w.text).join(" ");
  let ms = sectionTime(rest, opts);
  for (let s = word.sectionIndex + 1; s < model.sections.length; s++) ms += sectionTime(model.sections[s].text, opts);
  return ms;
}

/** "2 minutes", "1 hour and 5 minutes", "Less than a minute". */
export function formatDuration(ms: number): string {
  const minutesTotal = ms / 60000;
  const hours = Math.floor(minutesTotal / 60);
  const minutes = Math.floor(minutesTotal % 60);
  const unit = (n: number, u: string) => `${n} ${n > 1 ? u + "s" : u}`;
  let out = "";
  if (hours > 0) out = unit(hours, "hour");
  if (hours > 0 && minutes > 0) out += " and ";
  if (minutes > 0) out += unit(minutes, "minute");
  if (hours === 0 && minutes < 1) out = "Less than a minute";
  return out;
}

/** Spreeder sectionsCompletedPercentage. */
export function progressPercent(model: TextModel, wordIndex: number): number {
  const word = model.words[wordIndex];
  if (!word || model.sections.length === 0) return 0;
  if (word.sectionIndex === 0 && word.index === 0) return 0;
  const section = model.sections[word.sectionIndex];
  const pos = word.index - section.words[0].index;
  const frac = pos === section.words.length - 1 ? 1 : pos / section.words.length;
  return Math.min(100, Math.round(((word.sectionIndex + frac) / model.sections.length) * 100));
}

export function clampWpm(wpm: number): number {
  return Math.min(5000, Math.max(50, Math.round(wpm / 10) * 10));
}

export function clampFontSize(size: number): number {
  return Math.min(74, Math.max(8, size));
}

/** Font label to the CSS family Spreeder draws with (it appends ", monospace"). */
export function canvasFont(stack: string, size: number): string {
  return `${size}px ${stack}, monospace`;
}
