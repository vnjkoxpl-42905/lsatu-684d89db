import { describe, expect, it, vi } from 'vitest';
import { conditionalUnits } from './content';
import { curriculumActivityDifficulties, getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';
import { elapsedSeconds, emptyDraft, emptyProgress, markConditionalLessonRead, newRun, nextUncheckedQuestionIndex, parseConditionalProgress, reconcileConditionalRun, recommendNext, reviewedConditionalLessonCount, type ConditionalProgress } from './progress';
import { CONDITIONAL_OPENING_EDITION, CONDITIONAL_OPENING_UNIT_IDS, conditionalOpeningEditionKey, needsExpandedConditionalLessonReview, openingQuestionRevisions } from './openingRevision';
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

describe('expanded-lesson edition review', () => {
  it('keeps previous reads and work while requiring a genuine read of the expanded reference sequence', () => {
    const progress = emptyProgress();
    const oldRead = '2026-10-02T12:00:00.000Z';
    const oldKey = `__lessonEdition:${CONDITIONAL_OPENING_EDITION}:orientation`;
    const groupKey = conditionalOpeningEditionKey('group-1')!;
    progress.lessons = { orientation: oldRead, [oldKey]: oldRead, 'group-1': oldRead, [groupKey]: oldRead };
    const before = JSON.stringify(progress);
    expect(needsExpandedConditionalLessonReview(progress.lessons, 'orientation')).toBe(true);
    expect(needsExpandedConditionalLessonReview(progress.lessons, 'group-1')).toBe(false);
    expect(JSON.stringify(progress)).toBe(before);
    const readAt = '2026-10-03T12:00:00.000Z';
    const marked = markConditionalLessonRead(progress, 'orientation', readAt);
    expect(marked.lessons[oldKey]).toBe(oldRead);
    expect(marked.lessons[groupKey]).toBe(oldRead);
    expect(marked.lessons[conditionalOpeningEditionKey('orientation')!]).toBe(readAt);
    expect(needsExpandedConditionalLessonReview(marked.lessons, 'orientation')).toBe(false);
    expect(reviewedConditionalLessonCount(marked.lessons)).toBe(2);
    expect(marked.runs).toBe(progress.runs);
    expect(marked.attempts).toBe(progress.attempts);
  });
  it('reminds old opening readers even when the original read happened after local authoring', () => {
    const lessons = { 'group-1': '2026-12-01T12:00:00.000Z' };
    expect(needsExpandedConditionalLessonReview(lessons, 'group-1')).toBe(true);
    expect(needsExpandedConditionalLessonReview({}, 'group-1')).toBe(false);
    expect(needsExpandedConditionalLessonReview({ 'rules-facts': lessons['group-1'] }, 'rules-facts')).toBe(false);
    expect(lessons).toEqual({ 'group-1': '2026-12-01T12:00:00.000Z' });
  });
  it('records a genuine revised read through the existing lesson map without changing other work', () => {
    const progress = emptyProgress();
    progress.lessons = { 'group-1': '2026-12-01T12:00:00.000Z', 'rules-facts': '2026-10-01T12:00:00.000Z' };
    const readAt = '2026-12-02T12:00:00.000Z';
    const marked = markConditionalLessonRead(progress, 'group-1', readAt);
    expect(marked.lessons).toEqual({ ...progress.lessons, 'group-1': readAt, [conditionalOpeningEditionKey('group-1')!]: readAt });
    expect(progress.lessons['group-1']).toBe('2026-12-01T12:00:00.000Z');
    expect(needsExpandedConditionalLessonReview(marked.lessons, 'group-1')).toBe(false);
    expect(marked.runs).toBe(progress.runs);
    expect(marked.attempts).toBe(progress.attempts);
    expect(marked.settings).toBe(progress.settings);
    expect(Object.keys(marked)).toEqual(Object.keys(progress));
  });
  it('stamps only the four opening units and excludes all edition metadata from lesson counts', () => {
    let progress = emptyProgress();
    for (const unitId of [...CONDITIONAL_OPENING_UNIT_IDS, 'rules-facts', 'quantifier-meaning']) {
      progress = markConditionalLessonRead(progress, unitId, '2026-12-02T12:00:00.000Z');
    }
    expect(Object.keys(progress.lessons)).toHaveLength(10);
    expect(reviewedConditionalLessonCount(progress.lessons)).toBe(6);
    expect(conditionalOpeningEditionKey('rules-facts')).toBeUndefined();
    expect(conditionalOpeningEditionKey('quantifier-meaning')).toBeUndefined();
    expect(recommendNext({ ...emptyProgress(), lessons: { [conditionalOpeningEditionKey('orientation')!]: '2026-12-02T12:00:00.000Z' } }, conditionalUnits)?.unitId).toBe('orientation');
    expect(recommendNext({ ...emptyProgress(), lessons: { [conditionalOpeningEditionKey('orientation')!]: '2026-12-02T12:00:00.000Z' } }, conditionalUnits)?.label).toContain('Learn:');
  });
  it('retains unknown lesson keys and the edition marker across JSON parsing and later module loads', async () => {
    const progress = markConditionalLessonRead(emptyProgress(), 'group-1', '2026-12-02T12:00:00.000Z');
    progress.lessons['historical-unit'] = '2026-10-01T12:00:00.000Z';
    const restored = parseConditionalProgress(JSON.parse(JSON.stringify(progress)));
    expect(restored.lessons).toEqual(progress.lessons);
    expect(reviewedConditionalLessonCount(restored.lessons)).toBe(2);
    vi.resetModules();
    vi.useFakeTimers();
    try {
      vi.setSystemTime('2027-06-01T12:00:00.000Z');
      vi.stubEnv('VITE_CONDITIONAL_OPENING_RELEASED_AT', '2027-06-01T12:00:00.000Z');
      const laterBuild = await import('./openingRevision');
      expect(laterBuild.CONDITIONAL_OPENING_EDITION).toBe(CONDITIONAL_OPENING_EDITION);
      expect(laterBuild.conditionalOpeningEditionKey('group-1')).toBe(conditionalOpeningEditionKey('group-1'));
      expect(laterBuild.needsExpandedConditionalLessonReview(restored.lessons, 'group-1')).toBe(false);
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });
});

describe('opening question revisions in saved runs', () => {
  const questions = (unitId: string, difficulty: ConditionalDifficulty) => conditionalUnits.find(unit => unit.id === unitId)!.drills[difficulty].map(question => ({ id: question.id, unitId, difficulty }));
  it('reopens a finished three-question run for additions without replacing its saved work', () => {
    const run = { ...newRun(['group-1-b1', 'group-1-b2', 'group-1-b3']), index: 3, finished: true, elapsed: 73, timerEnabled: true, timerStartedAt: null };
    for (const id of run.questionIds) run.drafts[id] = { ...emptyDraft(), working: `Saved ${id}`, choice: 0, checked: true, revealed: true };
    const updated = reconcileConditionalRun(run, questions('group-1', 'beginner'), []);
    expect(updated).toMatchObject({ id: run.id, index: 3, finished: false, elapsed: 73, timerEnabled: true, timerStartedAt: null });
    expect(updated.questionIds).toEqual(['group-1-b1', 'group-1-b2', 'group-1-b3', 'group-1-b4', 'group-1-b5', 'group-1-b6', 'group-1-b7']);
    expect(updated.drafts).toBe(run.drafts);
    expect(reconcileConditionalRun(updated, questions('group-1', 'beginner'), [])).toBe(updated);
  });
  it('does not reorder, save, or move unchanged sets when the current pool changes order', () => {
    const current = questions('group-1', 'beginner');
    const run = { ...newRun(current.map(question => question.id)), index: 1 };
    run.drafts[run.questionIds[1]] = { ...emptyDraft(), working: 'Still writing', choice: 1 };
    expect(reconcileConditionalRun(run, [...current].reverse(), [])).toBe(run);
    expect(run.index).toBe(1);
  });
  it('preserves checked-current feedback until Next and skips already checked questions afterward', () => {
    const run = { ...newRun(['group-1-b1', 'group-1-b2', 'group-1-b3']), index: 1 };
    for (const id of run.questionIds) run.drafts[id] = { ...emptyDraft(), working: 'Retain my reasoning', choice: 0, checked: true, revealed: true };
    const updated = reconcileConditionalRun(run, questions('group-1', 'beginner'), []);
    expect(updated.index).toBe(1);
    expect(updated.finished).toBe(false);
    expect(updated.drafts['group-1-b2']).toBe(run.drafts['group-1-b2']);
    expect(nextUncheckedQuestionIndex(updated, [], updated.index)).toBe(3);
  });
  it('removes a retired current ID only when its replacement is allowed and keeps a parseable cursor', () => {
    const run = { ...newRun(['group-1-a1', 'group-1-a2', 'group-1-a3']), index: 2, elapsed: 17, timerStartedAt: '2026-10-01T10:00:00.000Z' };
    for (const id of run.questionIds) run.drafts[id] = { ...emptyDraft(), working: 'Old work', checked: true, revealed: true, choice: 0 };
    expect(reconcileConditionalRun(run, [], [])).toBe(run);
    const allowed = [{ id: 'group-1-a3-v2', unitId: 'group-1', difficulty: 'advanced' as const }];
    const updated = reconcileConditionalRun(run, allowed, []);
    expect(updated.questionIds).toEqual(['group-1-a1', 'group-1-a2', 'group-1-a3-v2']);
    expect(updated).toMatchObject({ id: run.id, index: 2, finished: false, elapsed: 17, timerStartedAt: run.timerStartedAt });
    expect(updated.drafts['group-1-a3']).toBe(run.drafts['group-1-a3']);
    const progress = emptyProgress(); progress.runs.run = updated;
    expect(parseConditionalProgress(progress)).toBe(progress);
  });
  it('does not add an unrepresented unit or react to unrelated assignment pool changes', () => {
    const run = { ...newRun(['group-3-b1', 'group-4-b1']), index: 1, finished: false };
    expect(reconcileConditionalRun(run, questions('group-1', 'beginner'), [])).toBe(run);
    const openingRun = newRun(['group-1-b1', 'group-1-b2', 'group-1-b3']);
    expect(reconcileConditionalRun(openingRun, questions('group-2', 'beginner'), [])).toBe(openingRun);
  });
  it('recognizes checked work only from this run, including attempts without a draft', () => {
    const run = { ...newRun(['group-1-b1', 'group-1-b2', 'group-1-b3']), index: 3, finished: true };
    const progress = emptyProgress();
    const unit = conditionalUnits.find(unit => unit.id === 'group-1')!;
    recordQuestion(progress, unit, 'beginner');
    const oldAttempts = progress.attempts.filter(attempt => run.questionIds.includes(attempt.questionId)).map(attempt => ({ ...attempt, id: `${run.id}:${attempt.questionId}` }));
    expect(reconcileConditionalRun(run, questions('group-1', 'beginner'), oldAttempts).index).toBe(3);
    expect(reconcileConditionalRun(run, questions('group-1', 'beginner'), progress.attempts).index).toBe(0);
  });
  it('limits the registry to the 26 additions and four exact replacement IDs', () => {
    const additions = openingQuestionRevisions.flatMap(revision => revision.addedIds);
    expect(new Set(additions).size).toBe(30);
    expect(openingQuestionRevisions.flatMap(revision => Object.keys(revision.replacements))).toEqual(['group-1-a3', 'group-2-m2', 'group-2-a1', 'group-2-a3']);
    for (const revision of openingQuestionRevisions) expect(revision.addedIds.every(id => questions(revision.unitId, revision.difficulty).some(question => question.id === id))).toBe(true);
  });
  it('reopens finished advanced Group 2 work for both replacement questions without changing old answers', () => {
    const run = { ...newRun(['group-2-a1', 'group-2-a2', 'group-2-a3']), index: 3, finished: true };
    for (const id of run.questionIds) run.drafts[id] = { ...emptyDraft(), working: `Historical ${id}`, choice: 1, checked: true, revealed: true };
    const updated = reconcileConditionalRun(run, questions('group-2', 'advanced'), []);
    expect(updated.questionIds).toEqual(['group-2-a2', 'group-2-a1-v2', 'group-2-a3-v2', 'group-2-a4', 'group-2-a5', 'group-2-a6', 'group-2-a7']);
    expect(updated).toMatchObject({ id: run.id, index: 1, finished: false });
    expect(updated.drafts).toBe(run.drafts);
    expect(updated.drafts['group-2-a1'].choice).toBe(1);
    expect(updated.drafts['group-2-a3'].choice).toBe(1);
    expect(reconcileConditionalRun(updated, questions('group-2', 'advanced'), [])).toBe(updated);
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
