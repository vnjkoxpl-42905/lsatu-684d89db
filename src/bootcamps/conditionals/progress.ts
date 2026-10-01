import type { ConditionalDifficulty, ConditionalUnit } from './content/types';

export interface AnswerDraft {
  working: string;
  hint: boolean;
  revealed: boolean;
  choice: number | null;
  checked: boolean;
}
export interface ConditionalAttempt {
  id: string;
  questionId: string;
  unitId: string;
  difficulty: ConditionalDifficulty;
  choice: number | null;
  correct: boolean;
  hint: boolean;
  explanationBeforeCheck: boolean;
  working: string;
  checkedAt: string;
}
export interface ConditionalRun {
  id: string;
  questionIds: string[];
  index: number;
  drafts: Record<string, AnswerDraft>;
  finished: boolean;
  elapsed: number;
  timerEnabled: boolean;
  timerStartedAt?: string | null;
}
export interface ConditionalProgress {
  id: 'conditionals-v1';
  lessons: Record<string, string>;
  runs: Record<string, ConditionalRun>;
  attempts: ConditionalAttempt[];
  journal: string;
  settings: { showMethod: boolean };
  updated_at: string;
}
export const emptyDraft = (): AnswerDraft => ({ working: '', hint: false, revealed: false, choice: null, checked: false });
export const emptyProgress = (): ConditionalProgress => ({ id: 'conditionals-v1', lessons: {}, runs: {}, attempts: [], journal: '', settings: { showMethod: true }, updated_at: new Date().toISOString() });
export function newRun(questionIds: string[]): ConditionalRun {
  return { id: crypto.randomUUID(), questionIds, index: 0, drafts: {}, finished: false, elapsed: 0, timerEnabled: false };
}
export function attemptSummary(attempts: ConditionalAttempt[]) {
  return { total: attempts.length, correct: attempts.filter(a => a.correct).length, assisted: attempts.filter(a => a.hint || a.explanationBeforeCheck).length };
}
export function parseConditionalProgress(value: unknown): ConditionalProgress {
  const bad = () => { throw new Error('Your stored conditional progress has an unsupported format. Your record has been preserved; ask Joshua to review it.'); };
  if (!value || typeof value !== 'object') return bad();
  const record = value as ConditionalProgress;
  if (record.id !== 'conditionals-v1' || !record.lessons || typeof record.lessons !== 'object' || !record.runs || typeof record.runs !== 'object' || !Array.isArray(record.attempts) || typeof record.journal !== 'string' || typeof record.settings?.showMethod !== 'boolean' || !Number.isFinite(Date.parse(record.updated_at))) return bad();
  if (Object.values(record.lessons).some(date => typeof date !== 'string' || !Number.isFinite(Date.parse(date)))) return bad();
  for (const run of Object.values(record.runs)) {
    if (!run || typeof run.id !== 'string' || !Array.isArray(run.questionIds) || run.questionIds.some(id => typeof id !== 'string') || !Number.isInteger(run.index) || run.index < 0 || run.index > run.questionIds.length || !run.drafts || typeof run.drafts !== 'object' || typeof run.finished !== 'boolean' || typeof run.timerEnabled !== 'boolean' || !Number.isFinite(run.elapsed) || run.elapsed < 0 || (run.timerStartedAt != null && !Number.isFinite(Date.parse(run.timerStartedAt)))) return bad();
    for (const draft of Object.values(run.drafts)) if (!draft || typeof draft.working !== 'string' || typeof draft.hint !== 'boolean' || typeof draft.revealed !== 'boolean' || typeof draft.checked !== 'boolean' || (draft.choice !== null && (!Number.isInteger(draft.choice) || draft.choice < 0))) return bad();
  }
  for (const attempt of record.attempts) if (!attempt || typeof attempt.id !== 'string' || typeof attempt.questionId !== 'string' || typeof attempt.unitId !== 'string' || !['beginner', 'medium', 'advanced'].includes(attempt.difficulty) || typeof attempt.correct !== 'boolean' || typeof attempt.hint !== 'boolean' || typeof attempt.explanationBeforeCheck !== 'boolean' || typeof attempt.working !== 'string' || !Number.isFinite(Date.parse(attempt.checkedAt)) || (attempt.choice !== null && (!Number.isInteger(attempt.choice) || attempt.choice < 0))) return bad();
  return record;
}
export function elapsedSeconds(run: ConditionalRun, now = Date.now()): number {
  return run.elapsed + (run.timerStartedAt ? Math.max(0, Math.floor((now - Date.parse(run.timerStartedAt)) / 1000)) : 0);
}
export function recommendNext(progress: ConditionalProgress, units: ConditionalUnit[]) {
  for (const phase of ['conditional', 'quantifier'] as const) {
    const phaseUnits = units.filter(unit => unit.phase === phase);
    for (const unit of phaseUnits) {
      if (!progress.lessons[unit.id]) return { mode: 'learn' as const, unitId: unit.id, label: `Learn: ${unit.title}`, difficulty: 'beginner' as const, phase };
      if (!progress.attempts.some(attempt => attempt.questionId === unit.guidedExample.id)) return { mode: 'learn' as const, unitId: unit.id, label: `Guided example: ${unit.title}`, difficulty: 'beginner' as const, phase };
      if (unit.drills.beginner.some(question => !progress.attempts.some(attempt => attempt.questionId === question.id && attempt.difficulty === 'beginner'))) return { mode: 'practice' as const, unitId: unit.id, label: `Beginner practice: ${unit.title}`, difficulty: 'beginner' as const, phase };
    }
    for (const difficulty of ['medium', 'advanced'] as const) {
      if (phaseUnits.some(unit => unit.drills[difficulty].some(question => !progress.attempts.some(attempt => attempt.questionId === question.id && attempt.difficulty === difficulty)))) return { mode: 'practice' as const, unitId: undefined, label: `${difficulty === 'medium' ? 'Medium' : 'Advanced'} ${phase === 'conditional' ? 'conditional' : 'quantifier'} practice`, difficulty, phase };
    }
  }
  return null;
}
