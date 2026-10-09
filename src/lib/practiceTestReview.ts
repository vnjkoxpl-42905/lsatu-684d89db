import { loadPassages } from '@/features/rc/lib/rcBank';
import type { RcPassage } from '@/features/rc/lib/rcTypes';
import { supabase } from '@/integrations/supabase/client';
import type { PracticeTestLeg, PracticeTestRun } from '@/lib/practiceTest';
import type { SectionQuestionStat } from '@/lib/sectionHistorySave';

export interface PracticeTestReviewQuestion {
  id: string;
  number: number;
  type: string | null;
  selected: string | null;
  correctAnswer: string;
  correct: boolean | null;
  timeMs: number | null;
  flagged: boolean | null;
  blindReviewAnswer: string | null;
  href: string;
  rcContent?: {
    passage: string;
    prompt: string | null;
    choices: { letter: string; text: string }[];
  };
}

export interface PracticeTestLegReview {
  legIndex: number;
  questions: PracticeTestReviewQuestion[];
  available: boolean;
}

const answer = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-E]$/.test(value) ? value : null;

export function mapLrReviewQuestions(raw: unknown, runId: string): PracticeTestReviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((value: SectionQuestionStat) => {
    if (!value || typeof value.qid !== 'string' || !/^PT\d+-S\d+-Q\d+$/.test(value.qid)) return [];
    const correctAnswer = answer(value.correctAnswer);
    if (!correctAnswer) return [];
    return [{
      id: value.qid,
      number: Number.isFinite(value.qnum) ? value.qnum : Number(value.qid.match(/-Q(\d+)$/)?.[1] ?? 0),
      type: typeof value.qtype === 'string' ? value.qtype : null,
      selected: answer(value.initialAnswer),
      correctAnswer,
      correct: typeof value.initialCorrect === 'boolean' ? value.initialCorrect : null,
      timeMs: typeof value.timeMs === 'number' && value.timeMs >= 0 ? value.timeMs : null,
      flagged: typeof value.flagged === 'boolean' ? value.flagged : null,
      blindReviewAnswer: answer(value.brAnswer),
      href: `/drill?mode=type-drill&qids=${encodeURIComponent(value.qid)}&present=smart&returnTo=${encodeURIComponent(`/testing/test/${runId}`)}`,
    }];
  });
}

type FirstRcAttempt = { question_id: number; selected: string | null; is_correct: boolean | null; time_ms: number; flagged: boolean };

export function mapRcReviewQuestions(passages: RcPassage[], attempts: FirstRcAttempt[], sessionId: string): PracticeTestReviewQuestion[] {
  const first = new Map(attempts.map((attempt) => [attempt.question_id, attempt]));
  return passages.flatMap((passage) => passage.questions.map((question) => {
    const attempt = first.get(question.questionId);
    return {
      id: String(question.questionId),
      number: question.position,
      type: question.questionType || null,
      selected: answer(attempt?.selected),
      correctAnswer: question.correctAnswer,
      correct: typeof attempt?.is_correct === 'boolean' ? attempt.is_correct : null,
      timeMs: typeof attempt?.time_ms === 'number' && attempt.time_ms >= 0 ? attempt.time_ms : null,
      flagged: typeof attempt?.flagged === 'boolean' ? attempt.flagged : null,
      blindReviewAnswer: null,
      href: `/rc/drill?sessionId=${encodeURIComponent(sessionId)}&review=1&q=${question.questionId}`,
      rcContent: {
        passage: passage.text,
        prompt: question.prompt,
        choices: question.choices.map(({ letter, text }) => ({ letter, text })),
      },
    } satisfies PracticeTestReviewQuestion;
  }));
}

async function readLrReview(userId: string, run: PracticeTestRun, leg: PracticeTestLeg, legIndex: number): Promise<PracticeTestLegReview> {
  const { data, error } = await supabase.from('section_history')
    .select('questions_json')
    .eq('user_id', userId)
    .eq('practice_test_run_id', run.id)
    .eq('practice_test_leg', legIndex)
    .eq('pt', run.pt)
    .eq('section', leg.section)
    .order('completed_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const questions = mapLrReviewQuestions(data?.[0]?.questions_json, run.id);
  return { legIndex, questions, available: questions.length > 0 };
}

async function readRcReview(userId: string, run: PracticeTestRun, leg: PracticeTestLeg, legIndex: number): Promise<PracticeTestLegReview> {
  const { data: session, error: sessionError } = await supabase.from('rc_drill_sessions')
    .select('id, passage_ids, status')
    .eq('user_id', userId)
    .eq('practice_test_run_id', run.id)
    .eq('practice_test_leg', legIndex)
    .eq('status', 'completed')
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session || [...session.passage_ids].sort((a, b) => a - b).join(',') !== [...(leg.passageIds ?? [])].sort((a, b) => a - b).join(',')) {
    return { legIndex, questions: [], available: false };
  }
  const [{ data: attempts, error: attemptsError }, passages] = await Promise.all([
    supabase.from('rc_attempts')
      .select('question_id, selected, is_correct, time_ms, flagged')
      .eq('user_id', userId)
      .eq('session_id', session.id)
      .eq('is_first_attempt', true),
    loadPassages(leg.passageIds ?? []),
  ]);
  if (attemptsError) throw attemptsError;
  const questions = mapRcReviewQuestions(passages, attempts ?? [], session.id);
  return { legIndex, questions, available: questions.length > 0 };
}

export async function loadPracticeTestReview(userId: string, run: PracticeTestRun): Promise<PracticeTestLegReview[]> {
  if (run.userId !== userId || run.status !== 'complete') throw new Error('This exam result is not available.');
  return Promise.all(run.legs.map((leg, index) =>
    !leg.completedAt
      ? Promise.resolve({ legIndex: index, questions: [], available: false })
      : leg.kind === 'lr'
        ? readLrReview(userId, run, leg, index)
        : readRcReview(userId, run, leg, index),
  ));
}
