import React from 'react';
import { ALL_QUESTIONS } from '@/data/causationStation/questions';
import { Question, QuestionModuleId } from '@/types/causationStation';

type StoredAttempt = {
  questionId: string;
  moduleId: QuestionModuleId;
  answerIndex: number;
  correct: boolean;
  completedAt: string;
  ungraded?: boolean;
};

const CSJournal: React.FC = () => {
  const entries = React.useMemo(() => {
    let attempts: StoredAttempt[] = [];
    try {
      attempts = JSON.parse(localStorage.getItem('causationCoachAttemptHistory') ?? '[]');
    } catch (error) {
      console.error('Failed to parse causation attempt history for journal', error);
    }

    return attempts
      // Ungraded free-response (M2/M3) attempts have no wrong-answer choice to
      // review, so they do not belong in the wrong-answer journal.
      .filter((attempt) => !attempt.correct && !attempt.ungraded)
      .map((attempt) => {
        const question = (ALL_QUESTIONS[attempt.moduleId] ?? []).find((q) => q.id === attempt.questionId);
        return question ? { attempt, question } : null;
      })
      .filter(Boolean) as Array<{ attempt: StoredAttempt; question: Question }>;
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold text-punk-text mb-2">Mistake Journal</h2>
      <p className="text-sm text-punk-sub mb-6 max-w-2xl">
        Every great mind keeps a record of their toughest challenges. This is your personalized log of questions you've struggled with. Review them, understand the traps, and never make the same mistake twice.
      </p>

      {entries.length === 0 ? (
        <div className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6 text-center">
          <p className="text-sm text-punk-sub">Your journal is empty for now. Incorrect answers from your drills will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {entries.map(({ attempt, question }, index) => (
            <div key={`${question.id}-${index}`} className="bg-punk-panel/50 backdrop-blur-lg border border-punk-sub/20 rounded-lg shadow-lg p-6 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <h3 className="text-xs font-semibold text-punk-sub uppercase tracking-wide mb-2">
                  Question ({question.id})
                </h3>
                <div className="rounded-lg bg-punk-base/50 border border-punk-sub/20 p-4 mb-3">
                  <p className="text-sm text-punk-text italic leading-relaxed">{question.stem}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium bg-punk-magenta/20 text-punk-magenta px-2.5 py-0.5 rounded-full">
                    #{question.moduleId}
                  </span>
                  <span className="text-xs font-medium bg-punk-magenta/20 text-punk-magenta px-2.5 py-0.5 rounded-full">
                    {new Date(attempt.completedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="md:w-1/2">
                <h3 className="text-xs font-semibold text-punk-cyan uppercase tracking-wide mb-2">Review Prompt</h3>
                <p className="text-sm text-punk-sub leading-relaxed">
                  You picked choice {String.fromCharCode(65 + attempt.answerIndex)}. Re-read the causal claim, name the author's causal move, then explain why choice {String.fromCharCode(65 + question.correctIndex)} is better.
                </p>
                <p className="text-sm text-punk-sub leading-relaxed mt-4">{question.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CSJournal;
