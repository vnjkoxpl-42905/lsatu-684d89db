import { describe, expect, it } from 'vitest';
import { buildPracticeBuckets, buildPrototypeModel, questionLabel } from './model';
import { DEMO_AS_OF, demoAnswers, demoCoverage, getDemoData } from './fixture';
import type { GradedQuestionAnswer } from '@/lib/firstAnswerProgress';

describe('prototype evidence model', () => {
  it('computes fixture counts from unique first answers and keeps repeats separate', () => {
    const model = buildPrototypeModel(demoAnswers, demoCoverage, 30, DEMO_AS_OF);
    expect(model.progress.LR.denominator).toBe(75);
    expect(model.progress.RC.denominator).toBe(15);
    expect(model.progress.repeatCount).toBe(12);
    expect(model.topics.reduce((sum, row) => sum + row.denominator, 0)).toBe(75);
    expect(model.history).toHaveLength(102);
  });

  it('withholds affected LR and topic percentages without suppressing healthy RC', () => {
    const data = getDemoData('partial');
    const model = buildPrototypeModel(data.answers, data.coverage, 30, DEMO_AS_OF);
    expect(model.areaPartial).toEqual({ LR: true, RC: false });
    expect(model.progress.LR.percent).toBeNull();
    expect(model.topics.every((row) => row.percent === null)).toBe(true);
    expect(model.progress.RC.percent).not.toBeNull();
  });

  it('assigns first identity globally before a date filter', () => {
    const original = demoAnswers[0];
    const repeated = { ...original, attemptId: 'new-repeat', correct: !original.correct, gradedAt: DEMO_AS_OF };
    const model = buildPrototypeModel([original, repeated], demoCoverage, 7, DEMO_AS_OF);
    expect(model.progress.LR.denominator).toBe(0);
    expect(model.progress.repeatCount).toBe(1);
    expect(model.history[0].isFirst).toBe(false);
  });

  it('groups missing and internal topics only in presentation', () => {
    const rows: GradedQuestionAnswer[] = demoAnswers.slice(0, 3).map((row, index) => ({
      ...row, topic: index ? 'abstract' : undefined,
    }));
    const model = buildPrototypeModel(rows, demoCoverage, 30, DEMO_AS_OF);
    expect(model.topics.map((row) => row.topic)).toEqual(['Unclassified']);
    expect(model.untypedFirstAnswers).toBe(3);
    expect(model.history.some((row) => row.topic === 'abstract')).toBe(true);
    expect(rows[0].questionKey).toBe(model.history.at(-1)?.questionKey);
  });

  it('does not turn sparse answers into a percentage', () => {
    const data = getDemoData('sparse');
    const model = buildPrototypeModel(data.answers, data.coverage, 7, DEMO_AS_OF);
    expect(model.progress.LR.denominator).toBe(2);
    expect(model.progress.LR.percent).toBeNull();
  });

  it('makes labels readable without changing identity', () => {
    expect(questionLabel('LR:PT101-S2-Q4')).toBe('PT 101 · Section 2 · Question 4');
    expect(questionLabel('RC:12:3')).toBe('Passage 12 · Question 3');
  });
});

describe('complete available question chronology', () => {
  it('uses the shared answer ordering, removes duplicate attempts and caps at asOf', () => {
    const original = demoAnswers[0];
    const tied = { ...original, attemptId: 'tie-later', answeredAt: new Date(Date.parse(original.gradedAt) + 1000).toISOString() };
    const earlierPick = { ...original, attemptId: 'tie-earlier', answeredAt: new Date(Date.parse(original.gradedAt) - 1000).toISOString() };
    const recent = { ...original, attemptId: 'recent-repeat', gradedAt: DEMO_AS_OF };
    const future = { ...original, attemptId: 'future', gradedAt: new Date(Date.parse(DEMO_AS_OF) + 1).toISOString() };
    const model = buildPrototypeModel([future, tied, recent, earlierPick, original, tied], demoCoverage, 7, DEMO_AS_OF);
    expect(model.allAnswers.map((row) => row.attemptId)).toEqual(['tie-earlier', original.attemptId, 'tie-later', 'recent-repeat']);
    expect(model.history.map((row) => row.attemptId)).toEqual(['recent-repeat']);
    expect(model.history[0].isFirst).toBe(false);
  });
});

describe('first-answer practice buckets', () => {
  const end = Date.parse(DEMO_AS_OF);
  const rowAt = (id: string, at: number, correct = true): GradedQuestionAnswer => ({
    ...demoAnswers[1], attemptId: id, questionKey: `LR:${id}`, gradedAt: new Date(at).toISOString(), correct,
  });

  it('partitions exact window edges once, including final end and zero-volume bins', () => {
    const start = end - 7 * 86_400_000;
    const width = (end - start) / 6;
    const rows = [rowAt('before', start - 1), rowAt('start', start), rowAt('boundary', start + width, false), rowAt('end', end), rowAt('future', end + 1)];
    const model = buildPrototypeModel(rows, demoCoverage, 7, DEMO_AS_OF);
    const buckets = buildPracticeBuckets(model, 'LR');
    expect(buckets).toHaveLength(6);
    expect(buckets.map((bucket) => bucket.answers.map((row) => row.attemptId))).toEqual([['start'], ['boundary'], [], [], [], ['end']]);
    expect(buckets[0].start).toBe(new Date(start).toISOString());
    expect(buckets.at(-1)?.end).toBe(new Date(end).toISOString());
    expect(buckets.reduce((sum, bucket) => sum + bucket.correct + bucket.missed, 0)).toBe(model.progress.LR.denominator);
    expect(buckets.reduce((sum, bucket) => sum + bucket.correct, 0)).toBe(model.progress.LR.correct);
    expect(buckets[1]).toMatchObject({ correct: 0, missed: 1 });
  });

  it('reconciles demonstration first answers separately by subject without repeats', () => {
    const model = buildPrototypeModel(demoAnswers, demoCoverage, 30, DEMO_AS_OF);
    for (const area of ['LR', 'RC'] as const) {
      const buckets = buildPracticeBuckets(model, area);
      expect(buckets.flatMap((bucket) => bucket.answers)).toHaveLength(model.progress[area].denominator);
      expect(buckets.flatMap((bucket) => bucket.answers).every((row) => row.isFirst && row.area === area)).toBe(true);
    }
  });

  it('excludes a recent repeat whose first answer is outside the period', () => {
    const original = rowAt('old', end - 12 * 86_400_000);
    const repeat = { ...original, attemptId: 'repeat', gradedAt: DEMO_AS_OF, correct: false };
    const model = buildPrototypeModel([original, repeat], demoCoverage, 7, DEMO_AS_OF);
    expect(buildPracticeBuckets(model, 'LR').every((bucket) => bucket.answers.length === 0)).toBe(true);
    expect(model.progress.repeatCount).toBe(1);
  });

  it('keeps sparse answers useful and uses their actual all-time span', () => {
    const first = rowAt('one', end - 1.5 * 86_400_000, false);
    const model = buildPrototypeModel([first], demoCoverage, 'all', DEMO_AS_OF);
    const buckets = buildPracticeBuckets(model, 'LR');
    expect(model.progress.LR.percent).toBeNull();
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toMatchObject({ start: first.gradedAt, correct: 0, missed: 1 });
    expect(buckets[1].answers).toEqual([]);
  });

  it('has one inclusive bucket when a same-day answer is at asOf', () => {
    const model = buildPrototypeModel([rowAt('now', end)], demoCoverage, 'all', DEMO_AS_OF);
    const buckets = buildPracticeBuckets(model, 'LR');
    expect(buckets).toHaveLength(1);
    expect(buckets[0].start).toBe(buckets[0].end);
    expect(buckets[0].correct).toBe(1);
  });

  it('keeps empty periods explicit, including a single empty all-time bucket', () => {
    const all = buildPracticeBuckets(buildPrototypeModel([], demoCoverage, 'all', DEMO_AS_OF), 'LR');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ start: new Date(end).toISOString(), end: new Date(end).toISOString(), answers: [], correct: 0, missed: 0 });
    expect(buildPracticeBuckets(buildPrototypeModel([], demoCoverage, 7, DEMO_AS_OF), 'LR')).toHaveLength(6);
  });

  it('withholds affected buckets while leaving the complete subject available', () => {
    const data = getDemoData('partial');
    const model = buildPrototypeModel(data.answers, data.coverage, 30, DEMO_AS_OF);
    expect(buildPracticeBuckets(model, 'LR')).toEqual([]);
    expect(buildPracticeBuckets(model, 'RC')).toHaveLength(6);
    const unavailable = buildPrototypeModel([], { includedSources: [], missingSources: [], excludedRows: {} }, 'all', DEMO_AS_OF);
    expect(buildPracticeBuckets(unavailable, 'RC')).toEqual([]);
  });
});
