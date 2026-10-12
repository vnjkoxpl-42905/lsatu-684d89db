import { describe, expect, it } from 'vitest';
import { conditionalUnits } from './content';
import { curriculumActivityDifficulties, getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';
import { elapsedSeconds, emptyDraft, emptyProgress, newRun, parseConditionalProgress, recommendNext, type ConditionalProgress } from './progress';
import type { ConditionalDifficulty, ConditionalUnit } from './content/types';

function recordQuestion(progress: ConditionalProgress, unit: ConditionalUnit, level: ConditionalDifficulty, guided = false) {
  const questions = guided ? [unit.guidedExample] : unit.drills[level];
  for (const question of questions) progress.attempts.push({ id: `${question.id}:attempt`, questionId: question.id, unitId: unit.id, difficulty: level, choice: 0, correct: false, hint: true, explanationBeforeCheck: false, working: 'A → B', checkedAt: '2026-10-01T10:00:00.000Z' });
}

describe('conditional stored progress', () => {
  it('accepts a resumable production draft and distinguishes explanation assistance from correctness', () => {
    const progress = emptyProgress();
    const run = newRun(['question-one']);
    run.drafts['question-one'] = { ...emptyDraft(), working: 'A → B', hint: true, revealed: true, choice: 1 };
    progress.runs['practice:beginner:group-1'] = run;
    expect(parseConditionalProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
    expect(progress.attempts).toEqual([]);
  });
  it.each([
    ['foreign course', (record: ConditionalProgress) => { record.id = 'main-conclusion' as never; }],
    ['ungraded string choice', (record: ConditionalProgress) => { const run = newRun(['Q']); run.drafts.Q = { ...emptyDraft(), choice: 'A' as never }; record.runs.run = run; }],
    ['impossible question index', (record: ConditionalProgress) => { record.runs.run = { ...newRun(['Q']), index: 5 }; }],
    ['invalid lesson timestamp', (record: ConditionalProgress) => { record.lessons.orientation = 'not a date'; }],
    ['missing settings', (record: ConditionalProgress) => { delete record.settings; }],
  ])('rejects %s without replacing the source record', (_label, change) => {
    const progress = emptyProgress();
    change(progress);
    const before = JSON.stringify(progress);
    expect(() => parseConditionalProgress(progress)).toThrow('record has been preserved');
    expect(JSON.stringify(progress)).toBe(before);
  });
  it('resumes stopwatch elapsed time from the saved starting timestamp without periodic persisted ticks', () => {
    const run = { ...newRun(['Q']), elapsed: 12, timerEnabled: true, timerStartedAt: '2026-10-01T10:00:00.000Z' };
    expect(elapsedSeconds(run, Date.parse('2026-10-01T10:00:08.000Z'))).toBe(20);
    expect(elapsedSeconds(run, Date.parse('2026-10-01T09:59:00.000Z'))).toBe(12);
    expect(run.elapsed).toBe(12);
  });
});

describe('progressive recommended path', () => {
  const units = [conditionalUnits.find(unit => unit.id === 'orientation'), conditionalUnits.find(unit => unit.id === 'rules-facts'), conditionalUnits.find(unit => unit.phase === 'quantifier')];
  it('interleaves lesson review, guided response, and beginner practice before the next foundation lesson', () => {
    const progress = emptyProgress();
    expect(recommendNext(progress, units)).toMatchObject({ mode: 'learn', unitId: units[0].id });
    progress.lessons[units[0].id] = '2026-10-01T10:00:00.000Z';
    expect(recommendNext(progress, units)?.label).toContain('Guided example');
    recordQuestion(progress, units[0], 'beginner', true);
    expect(recommendNext(progress, units)).toMatchObject({ mode: 'practice', unitId: units[0].id, difficulty: 'beginner' });
    recordQuestion(progress, units[0], 'beginner');
    expect(recommendNext(progress, units)).toMatchObject({ mode: 'learn', unitId: units[1].id });
  });
  it('continues to quantifiers after each conditional activity, without whole-course difficulty passes', () => {
    const progress = emptyProgress();
    for (const unit of units.filter(unit => unit.phase === 'conditional')) {
      progress.lessons[unit.id] = '2026-10-01T10:00:00.000Z';
      recordQuestion(progress, unit, 'beginner', true);
      recordQuestion(progress, unit, getCurriculumDifficulty(unit));
    }
    expect(recommendNext(progress, units)).toMatchObject({ mode: 'learn', unitId: units[2].id, phase: 'quantifier' });
    const quantifier = units[2];
    progress.lessons[quantifier.id] = '2026-10-01T10:00:00.000Z';
    recordQuestion(progress, quantifier, 'beginner', true);
    recordQuestion(progress, quantifier, getCurriculumDifficulty(quantifier));
    expect(recommendNext(progress, units)).toBeNull();
    expect(progress.attempts.every(attempt => !attempt.correct && attempt.hint)).toBe(true);
  });
  it('assigns activity demands at each skill rather than requiring earlier difficulty passes', () => {
    const selected = conditionalUnits.filter(unit => ['mixed-translation', 'sufficient-assumption', 'flaw'].includes(unit.id));
    const progress = emptyProgress();
    for (const unit of selected) {
      progress.lessons[unit.id] = '2026-10-01T10:00:00.000Z';
      recordQuestion(progress, unit, 'beginner', true);
    }
    expect(recommendNext(progress, selected)).toMatchObject({ unitId: 'mixed-translation', difficulty: 'medium' });
    recordQuestion(progress, selected[0], 'medium');
    expect(recommendNext(progress, selected)).toMatchObject({ unitId: 'sufficient-assumption', difficulty: 'advanced' });
    recordQuestion(progress, selected[1], 'advanced');
    expect(recommendNext(progress, selected)).toMatchObject({ unitId: 'flaw', difficulty: 'medium' });
  });
  it('respects a teacher starting stage without marking skipped skills complete', () => {
    const progress = emptyProgress();
    expect(recommendNext(progress, conditionalUnits, 'direct-linking')).toMatchObject({ mode: 'learn', unitId: 'direct-linking', difficulty: 'medium' });
    expect(progress.lessons).toEqual({});
    expect(progress.attempts).toEqual([]);
    expect(getCurriculumUnits(conditionalUnits, 'quantifier-meaning').every(unit => unit.phase === 'quantifier')).toBe(true);
    expect(getCurriculumUnits(conditionalUnits, 'missing-stage')).toEqual(conditionalUnits);
  });
  it('explicitly maps every authored unit and keeps phase order even when input is reordered', () => {
    expect(conditionalUnits.every(unit => Object.prototype.hasOwnProperty.call(curriculumActivityDifficulties, unit.id))).toBe(true);
    const reordered = [units[2], units[0], units[1]];
    expect(getCurriculumUnits(reordered).map(unit => unit.id)).toEqual(units.map(unit => unit.id));
    expect(getCurriculumDifficulty('quantifier-meaning')).toBe('beginner');
  });
});
