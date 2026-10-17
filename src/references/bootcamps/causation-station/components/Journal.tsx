import React from 'react';
import Card from './common/Card';
import { ALL_QUESTIONS } from '../data/questions';
import type { Question, QuestionModuleId } from '../types';

type StoredAttempt = {
  questionId: string;
  moduleId: QuestionModuleId;
  answerIndex: number;
  correct: boolean;
  completedAt: string;
};

const Journal: React.FC = () => {
  const entries = React.useMemo(() => {
    let attempts: StoredAttempt[] = [];
    try {
      attempts = JSON.parse(localStorage.getItem('causationCoachAttemptHistory') ?? '[]');
    } catch (error) {
      console.error('Failed to parse causation attempt history for journal', error);
    }
    return attempts
      .filter((attempt) => !attempt.correct)
      .map((attempt) => {
        const question = (ALL_QUESTIONS[attempt.moduleId] ?? []).find((q) => q.id === attempt.questionId);
        return question ? { attempt, question } : null;
      })
      .filter(Boolean) as Array<{ attempt: StoredAttempt; question: Question }>;
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold text-punk-text mb-6">Mistake Journal</h2>
      <p className="text-punk-sub mb-8 max-w-3xl">
        Every great mind keeps a record of their toughest challenges. This is your personalized log of questions you've struggled with. Review them, understand the traps, and never make the same mistake twice.
      </p>
      
      {entries.length === 0 ? (
        <Card className="text-center">
          <p className="text-punk-sub">Your journal is empty for now. Incorrect answers from your drills will appear here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {entries.map(({ attempt, question }, index) => (
            <Card key={`${question.id}-${index}`} className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <h3 className="text-lg font-semibold text-punk-text mb-2">Question ({question.id})</h3>
                <div className="p-4 bg-punk-base/50 rounded-lg border border-punk-sub/20 mb-4">
                    <p className="text-punk-sub italic leading-relaxed">{question.stem}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-punk-magenta/20 text-punk-magenta text-xs font-semibold px-2.5 py-1 rounded-full">
                    #{question.moduleId}
                  </span>
                  <span className="bg-punk-cyan/20 text-punk-cyan text-xs font-semibold px-2.5 py-1 rounded-full">
                    {new Date(attempt.completedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="md:w-1/2">
                <h3 className="text-lg font-semibold text-punk-cyan mb-2">Review Prompt</h3>
                <p className="text-punk-sub whitespace-pre-wrap">
                  You picked choice {String.fromCharCode(65 + attempt.answerIndex)}. Re-read the causal claim, name the author&apos;s causal move, then explain why choice {String.fromCharCode(65 + question.correctIndex)} is better.
                </p>
                <p className="text-punk-sub whitespace-pre-wrap mt-4">{question.explanation}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journal;
