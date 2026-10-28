import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { practiceQuestionResults, practiceRetryQuestions, PracticeResultStrip, PracticeResultSummary } from './practiceResults';
import { CONDITIONAL_QUESTIONS } from './content';
import type { PracticeAnswer, PracticeRun } from './practiceStore';
const questions = CONDITIONAL_QUESTIONS.filter(question => question.mode === 'missing-link').slice(0, 6);
const answer = (index: number, attempt: number, verdict: PracticeAnswer['verdict'], revealed = false): PracticeAnswer => ({ id: `${index}-${attempt}`, questionId: questions[index].id, attempt, verdict, revealed, text: 'Recorded answer', at: '2026-10-28T10:00:00Z' });
function run(): PracticeRun { return { id: 'round', userId: 'actor', mode: 'missing-link', questions, createdAt: '2026-10-28', updatedAt: '2026-10-28', position: 5, stage: 'paper', selection: '', answers: [answer(0, 1, 'correct'), answer(1, 1, 'incorrect'), answer(1, 2, 'correct'), answer(2, 1, 'incorrect'), answer(2, 2, null, true), answer(3, 1, null, true), answer(4, 1, 'incorrect'), answer(4, 2, 'incorrect')] }; }
describe('conditional session result presentation', () => {
  it('keeps first success, retry, miss then reveal, defensive first reveal and unanswered distinct', () => {
    const results = practiceQuestionResults(run());
    expect(results.map(item => item.state)).toEqual(['correct-first', 'retry-correct', 'needs-review', 'revealed', 'needs-review', 'unanswered']);
    expect(results[2]).toMatchObject({ tone: 'missed', label: 'Missed, answer shown', attempts: 1 });
    expect(results[3]).toMatchObject({ tone: 'revealed', attempts: 0 });
  });
  it('preserves first-correct when a defensive later reveal exists', () => {
    const saved = run(); saved.answers.push(answer(0, 2, null, true));
    expect(practiceQuestionResults(saved)[0].state).toBe('correct-first');
  });
  it('keeps the live strip informational and does not expose question explanations', () => {
    render(<PracticeResultStrip run={run()}/>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('list', { name: 'Question outcomes' })).toBeVisible();
    expect(screen.queryByText(questions[5].explanation)).toBeNull();
  });
  it('makes only answered reviewed items actionable', () => {
    const onSelect = vi.fn(); render(<PracticeResultStrip run={run()} onSelect={onSelect}/>);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Review question 3: Missed, answer shown' }));
    expect(onSelect).toHaveBeenCalledWith(questions[2].id);
    expect(screen.queryByRole('button', { name: /Review question 6/ })).toBeNull();
  });
  it('uses selected questions as total while stating answered coverage separately', () => {
    render(<PracticeResultSummary run={run()}/>);
    expect(screen.getByText(/5 of 6 questions answered/)).toBeVisible();
  });
  it('selects retry snapshots without mutating the original and applies current allowed IDs', () => {
    const original = run(); const snapshot = JSON.stringify(original);
    expect(practiceRetryQuestions(original).map(question => question.id)).toEqual(questions.slice(1).map(question => question.id));
    expect(practiceRetryQuestions(original, [questions[2].id, questions[0].id])).toEqual([questions[2]]);
    expect(practiceRetryQuestions(original, [])).toEqual([]);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
