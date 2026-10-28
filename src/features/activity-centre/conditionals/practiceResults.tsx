import { ResultBadge, ResultDistribution } from '@/features/conditional-feedback/ConditionalResults';
import type { PracticeRun } from './practiceStore';
import './practice-results.css';

type Tone = 'correct' | 'missed' | 'revealed' | 'neutral' | 'retry';
export type QuestionResultState = 'unanswered' | 'revealed' | 'correct-first' | 'retry-correct' | 'needs-review';
const states: { id: QuestionResultState; label: string; tone: Tone }[] = [
  { id: 'correct-first', label: 'Correct first time', tone: 'correct' },
  { id: 'retry-correct', label: 'Correct after retry', tone: 'retry' },
  { id: 'needs-review', label: 'Needs review', tone: 'missed' },
  { id: 'revealed', label: 'Answer viewed first', tone: 'revealed' },
  { id: 'unanswered', label: 'Not answered', tone: 'neutral' },
];
export function practiceQuestionResults(run: PracticeRun) {
  return run.questions.map((question, index) => {
    const answers = run.answers.filter(answer => answer.questionId === question.id);
    const first = answers[0]; const latest = answers.at(-1);
    const state: QuestionResultState = !first ? 'unanswered' : first.revealed ? 'revealed' : first.verdict === 'correct' ? 'correct-first' : latest?.verdict === 'correct' && !latest.revealed ? 'retry-correct' : 'needs-review';
    const meta = states.find(value => value.id === state)!;
    return { question, index, state, tone: meta.tone, label: state === 'needs-review' && latest?.revealed ? 'Missed, answer shown' : meta.label, answered: !!first, attempts: answers.filter(answer => !answer.revealed).length };
  });
}
export function practiceRetryQuestions(run: PracticeRun, allowedQuestionIds?: readonly string[]) {
  return practiceQuestionResults(run).filter(item => item.state !== 'correct-first' && (!allowedQuestionIds || allowedQuestionIds.includes(item.question.id))).map(item => item.question);
}
export function PracticeResultStrip({ run, onSelect }: { run: PracticeRun; onSelect?: (id: string) => void }) {
  return <ol className="cpr-strip" aria-label="Question outcomes">{practiceQuestionResults(run).map(item => <li key={item.question.id}>{onSelect && item.answered ? <button type="button" onClick={() => onSelect(item.question.id)} aria-label={`Review question ${item.index + 1}: ${item.label}`}><span>Question {item.index + 1}</span><ResultBadge tone={item.tone} label={item.label}/></button> : <div><span>Question {item.index + 1}</span><ResultBadge tone={item.tone} label={item.label}/></div>}</li>)}</ol>;
}
export function PracticeResultSummary({ run }: { run: PracticeRun }) {
  const results = practiceQuestionResults(run); const answered = results.filter(item => item.answered).length;
  return <section className="cpr-results" aria-label="Session outcomes"><ResultDistribution title="This session" segments={states.map(state => ({ ...state, count: results.filter(item => item.state === state.id).length }))}/><p>{answered} of {results.length} questions answered. Reveals and retries are shown separately from first-answer success.</p></section>;
}
