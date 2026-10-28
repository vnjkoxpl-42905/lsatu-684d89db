import corrections from './rcAnswerKeyCorrections.json';
import type { RcLetter } from './rcTypes';

/** A documented key correction can explain an old saved verdict, not regrade it. */
export function isHistoricalRcGrade(questionId: number, currentAnswer: string, selected: unknown, savedCorrect: unknown): boolean {
  if (typeof selected !== 'string' || !/^[A-E]$/.test(selected) || typeof savedCorrect !== 'boolean') return false;
  return corrections.corrections.some((correction) => correction.questionId === questionId
    && correction.correctAnswer === currentAnswer && correction.previousAnswer !== currentAnswer
    && savedCorrect !== (selected === currentAnswer) && savedCorrect === (selected === correction.previousAnswer));
}

interface AcknowledgedAnswer {
  id?: string;
  questionId: number;
  selected: RcLetter | null;
  isCorrect: boolean | null;
}

/** Callers supply only the server-acknowledged row from this owner and session. */
export function rcCheckpointGrade(questionId: number, currentAnswer: string, selected: RcLetter | null, attemptId: string | undefined, acknowledged?: AcknowledgedAnswer): boolean | null {
  if (selected === null) return null;
  if (attemptId && acknowledged && acknowledged.id === attemptId && acknowledged.questionId === questionId
    && acknowledged.selected === selected && isHistoricalRcGrade(questionId, currentAnswer, selected, acknowledged.isCorrect)) return acknowledged.isCorrect;
  return selected === currentAnswer;
}
