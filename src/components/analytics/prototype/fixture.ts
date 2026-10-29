import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';

/** Design demonstration only. These records are not a student's saved work. */
export const DEMO_AS_OF = '2026-10-27T23:00:00-04:00';
const topics = ['Necessary Assumption', 'Strengthen', 'Flaw', 'Weaken', 'Must Be True', 'Method of Reasoning'];
const end = Date.parse(DEMO_AS_OF);

export const demoAnswers: GradedQuestionAnswer[] = Array.from({ length: 90 }, (_, index) => {
  const rc = index % 6 === 5;
  const gradedAt = new Date(end - (29 - Math.floor(index / 3)) * 86_400_000 - (3 - index % 3) * 3_600_000).toISOString();
  return {
    attemptId: `demo-first-${index}`, questionKey: rc ? `RC:${Math.floor(index / 6) + 1}:${index % 5 + 1}` : `LR:PT${101 + Math.floor(index / 24)}-S2-Q${index % 24 + 1}`,
    area: rc ? 'RC' : 'LR', source: rc ? 'rc_attempts' : index % 4 === 0 ? 'lr_section_history' : 'lr_attempts',
    mode: rc ? 'rc-drill' : index % 4 === 0 ? 'timed-section' : 'type-drill',
    correct: (index * 7 + Math.floor(index / 9)) % 11 < 7,
    gradedAt, answeredAt: gradedAt,
    topic: rc ? undefined : topics[(index + Math.floor(index / 6)) % topics.length],
  };
});

// Repeated practice has its own attempt/date and must not change first accuracy.
demoAnswers.push(...demoAnswers.slice(0, 12).map((answer, index) => ({
  ...answer, attemptId: `demo-repeat-${index}`, correct: index % 4 !== 0,
  gradedAt: new Date(end - (5 - Math.floor(index / 3)) * 86_400_000 - (4 - index % 3) * 3_600_000).toISOString(),
  answeredAt: undefined,
})));

export const demoCoverage: ProgressCoverage = {
  includedSources: ['lr_attempts', 'lr_section_history', 'rc_attempts'],
  missingSources: [], excludedRows: {},
};

export type DemoState = 'populated' | 'empty' | 'sparse' | 'partial' | 'loading' | 'error';

export function getDemoData(state: DemoState): { answers: GradedQuestionAnswer[]; coverage: ProgressCoverage } {
  const coverage: ProgressCoverage = { ...demoCoverage, includedSources: [...demoCoverage.includedSources], missingSources: [], excludedRows: {} };
  if (state === 'partial') {
    coverage.includedSources = ['lr_attempts', 'rc_attempts'];
    coverage.missingSources = [{ source: 'lr_section_history', reason: 'Demonstration: section history could not be loaded.' }];
    return { answers: demoAnswers.filter((row) => row.source !== 'lr_section_history'), coverage };
  }
  if (state === 'sparse') return { answers: demoAnswers.filter((row) => row.area === 'LR').slice(-2).map((row, index) => ({ ...row, attemptId: `demo-sparse-${index}`, gradedAt: new Date(end - (index + 1) * 86_400_000).toISOString() })), coverage };
  return { answers: state === 'populated' ? demoAnswers : [], coverage };
}
