import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type LrQuestion = {
  questionNumber: number;
  status?: string;
  stimulus?: string;
  questionStem?: string;
  answerChoices?: Record<string, string>;
  correctAnswer?: string;
};

function lr(section: number): LrQuestion[] {
  return JSON.parse(readFileSync(resolve(`public/data/PT118-S${section}-LR.json`), 'utf8'));
}

function fingerprint(q: LrQuestion): string {
  return [q.stimulus, q.questionStem, ...'ABCDE'.split('').map((letter) => q.answerChoices?.[letter])]
    .map((part) => String(part ?? '').trim().replace(/\s+/g, ' ')).join('\u0000');
}

describe('modern official PT118 integrity', () => {
  it('preserves removed positions and the official S1 answer key without duplicate content', () => {
    const rows = lr(1);
    expect(rows.filter((q) => q.status === 'removed').map((q) => q.questionNumber)).toEqual([5]);
    const active = rows.filter((q) => q.status !== 'removed');
    expect(active.map((q) => q.questionNumber)).toEqual([1, 2, 3, 4, ...Array.from({ length: 21 }, (_, i) => i + 6)]);
    expect(active.map((q) => q.correctAnswer).join('')).toBe('ACBCDBAEACCEEECBDADAECBCE');
    expect(new Set(active.map(fingerprint)).size).toBe(active.length);
    expect(active.find((q) => q.questionNumber === 6)?.stimulus).toMatch(/Maria/);
    expect(active.find((q) => q.questionNumber === 22)?.stimulus).toMatch(/lack of rain/);
    expect(active.find((q) => q.questionNumber === 22)?.correctAnswer).toBe('E');
    expect(active.find((q) => q.questionNumber === 26)?.stimulus).toMatch(/population growth/i);
  });

  it('preserves S3 Q22 as removed and all other official answers', () => {
    const rows = lr(3);
    expect(rows.filter((q) => q.status === 'removed').map((q) => q.questionNumber)).toEqual([22]);
    const active = rows.filter((q) => q.status !== 'removed');
    expect(active.map((q) => q.questionNumber)).toEqual([...Array.from({ length: 21 }, (_, i) => i + 1), 23, 24, 25]);
    expect(active.map((q) => q.correctAnswer).join('')).toBe('BCABACBCDCCADEACEEEBADBD');
  });

  it('keeps S4 content and answer order stable', () => {
    const rows = lr(4);
    expect(rows.map((q) => q.questionNumber)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(rows.map((q) => q.correctAnswer).join('')).toBe('DBEDAECDCBCABDAECACAEEEDB');
    expect(new Set(rows.map(fingerprint)).size).toBe(rows.length);
  });

  it('credits RC Q1 D and Q5 A with exactly one matching choice flag each', () => {
    const data = JSON.parse(readFileSync(resolve('public/data/rc/RC-PT118.json'), 'utf8'));
    const questions = data.passages.flatMap((p: { questions: Record<string, unknown>[] }) => p.questions);
    expect(questions.find((q: { position: number }) => q.position === 1).correctAnswer).toBe('D');
    expect(questions.find((q: { position: number }) => q.position === 5).correctAnswer).toBe('A');
    for (const q of questions) {
      const correct = q.choices.filter((choice: { correct: boolean }) => choice.correct);
      expect(correct).toHaveLength(1);
      expect(correct[0].letter).toBe(q.correctAnswer);
    }
  });
});
