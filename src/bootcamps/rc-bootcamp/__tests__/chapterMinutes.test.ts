/**
 * The time estimates a student sees have to be true, which means they have to
 * match the content they were computed from. This recomputes them from the
 * lesson and fails if the checked-in numbers have gone stale — the fix is to
 * re-run `node scripts/rc-chapter-minutes.mjs`.
 */

import { describe, expect, it } from 'vitest';
import { CHAPTER_MINUTES, LESSON_MINUTES } from '../chapterMinutes.generated';
import { CHAPTERS, PASSAGES } from '../content';
import { ACTS } from '../lessonMeta';

const WORDS_PER_MINUTE = 200;

function countWords(value?: string): number {
  if (!value) return 0;
  const text = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function computeChapterMinutes(chapter: (typeof CHAPTERS)[number]): number {
  let words = 0;
  let fixed = 0;

  for (const screen of chapter.screens) {
    const s = screen as unknown as Record<string, unknown>;
    for (const key of ['title', 'lede', 'body', 'intro', 'directive', 'question', 'outro', 'task']) {
      words += countWords(s[key] as string | undefined);
    }
    const callout = s.callout as { body: string } | undefined;
    if (callout) words += countWords(callout.body);
    const outroCallout = s.outroCallout as { body: string } | undefined;
    if (outroCallout) words += countWords(outroCallout.body);
    const reveal = s.reveal as { html: string } | undefined;
    if (reveal) words += countWords(reveal.html);
    for (const step of (s.steps as string[] | undefined) ?? []) words += countWords(step);
    for (const beat of (s.beats as Record<string, unknown>[] | undefined) ?? []) {
      words += countWords(beat.html as string | undefined);
      words += countWords(beat.question as string | undefined);
      words += countWords(beat.note as string | undefined);
      for (const option of (beat.options as string[] | undefined) ?? []) words += countWords(option);
    }
    const followUp = s.followUp as { text?: string; html?: string } | undefined;
    if (followUp) {
      words += countWords(followUp.text);
      words += countWords(followUp.html);
    }

    if (screen.type === 'read') fixed += screen.minutes ?? 0;
    if (screen.type === 'write') fixed += 1;

    if (screen.type === 'passage' || (screen.type === 'read' && !screen.minutes)) {
      const passage = PASSAGES[screen.passageId];
      for (const para of passage?.paras ?? []) words += countWords(para);
    }
  }

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE + fixed));
}

describe('RC bootcamp chapter minutes', () => {
  it('has one estimate per chapter', () => {
    expect(CHAPTER_MINUTES).toHaveLength(CHAPTERS.length);
  });

  it('matches a fresh computation from the content', () => {
    expect(CHAPTER_MINUTES).toEqual(CHAPTERS.map(computeChapterMinutes));
  });

  it('never shows a student zero minutes', () => {
    for (const minutes of CHAPTER_MINUTES) expect(minutes).toBeGreaterThanOrEqual(1);
  });

  it('sums to the published lesson total', () => {
    expect(LESSON_MINUTES).toBe(CHAPTER_MINUTES.reduce((a, b) => a + b, 0));
  });
});

describe('RC bootcamp acts', () => {
  it('covers every chapter exactly once, in order', () => {
    const covered: number[] = [];
    for (const act of ACTS) {
      for (let i = act.from; i <= act.to; i += 1) covered.push(i);
    }
    expect(covered).toEqual(CHAPTERS.map((_, i) => i));
  });
});
