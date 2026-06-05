import { Fragment, useEffect, useMemo, useState } from 'react';

import {
  FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS,
  createDefaultFirstSentenceVsRebuttalAttemptLog,
  createEmptyFirstSentenceVsRebuttalSessionRecord,
  type FirstSentenceVsRebuttalAttemptLog,
  type FirstSentenceVsRebuttalQuestion,
  type FirstSentenceVsRebuttalQuestionStatus,
  type FirstSentenceVsRebuttalSessionRecord,
} from '@/bootcamps/main-conclusion/data/reference-drills/firstSentenceVsRebuttalLabData';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { now } from '@/bootcamps/main-conclusion/lib/ids';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import type { LessonProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { TABLES } from '@/bootcamps/main-conclusion/persistence/records';

import { indicatorTone, parseIndicatorMarkup, stripIndicatorMarkup } from './indicatorMarkup';
import './firstSentenceVsRebuttalLab.css';

type StepKey = 'indicators' | 'conclusion' | 'structure' | 'support';
type Tone = 'correct' | 'wrong' | 'warning';

interface FeedbackState {
  tone: Tone;
  message: string;
}

interface ActiveQuestionState {
  step: 0 | 1 | 2 | 3;
  foundIndicators: string[];
  wrongWordToken: string | null;
  selectedConclusionId: string | null;
  selectedStructure: 'first' | 'rebuttal' | null;
  selectedFollowUpId: string | null;
  finalStatus: FirstSentenceVsRebuttalQuestionStatus | null;
  revealed: boolean;
}

const SESSION_RECORD_ID = 'first-sentence-vs-rebuttal-lab-session';
const SESSION_LESSON_ID = 'drill-session:first-sentence-vs-rebuttal-lab';

function createActiveQuestionState(): ActiveQuestionState {
  return {
    step: 0,
    foundIndicators: [],
    wrongWordToken: null,
    selectedConclusionId: null,
    selectedStructure: null,
    selectedFollowUpId: null,
    finalStatus: null,
    revealed: false,
  };
}

function firstSentence(text: string) {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
}

function getQuestionStatus(log: FirstSentenceVsRebuttalAttemptLog): FirstSentenceVsRebuttalQuestionStatus {
  if (log.usedIndicatorReveal) return 'assisted';
  if (log.solvedClean && totalWrong(log) === 0) return 'clean';
  return 'recovered';
}

function totalWrong(log: FirstSentenceVsRebuttalAttemptLog) {
  return log.indicators.wrong + log.conclusion.wrong + log.structure.wrong + log.support.wrong;
}

function buildRetryMessage(question: FirstSentenceVsRebuttalQuestion, step: StepKey) {
  if (step === 'indicators') {
    return "That word is not doing argumentative work. Hint: look for language that signals a reason, a verdict, or a turn in the argument.";
  }
  if (step === 'conclusion') {
    return `That is not the main conclusion. Hint: ${firstSentence(question.review.whyConclusion)}`;
  }
  if (step === 'structure') {
    return `Not quite. Re-read the conclusion and ask whether the author is making a case or pushing back on a view. Hint: ${firstSentence(question.review.whyStructure)}`;
  }
  return `That is not the ${question.type === 'first' ? 'supporting claim' : 'opposing viewpoint'}. Hint: ${firstSentence(question.review.whyFollowUp)}`;
}

function statusSummary(status: FirstSentenceVsRebuttalQuestionStatus) {
  if (status === 'clean') return 'You solved every step cleanly on the first pass.';
  if (status === 'assisted') return 'You completed the argument, but used the indicator reveal on this one.';
  return 'You finished correctly after a miss or two. That still counts as progress.';
}

function statusLabel(status: FirstSentenceVsRebuttalQuestionStatus) {
  if (status === 'clean') return 'Clean';
  if (status === 'assisted') return 'Assisted';
  return 'Recovered';
}

function statusTone(status: FirstSentenceVsRebuttalQuestionStatus): Tone {
  if (status === 'clean') return 'correct';
  if (status === 'assisted') return 'warning';
  return 'warning';
}

function ensureAttemptLog(
  session: FirstSentenceVsRebuttalSessionRecord,
  questionId: number,
): FirstSentenceVsRebuttalAttemptLog {
  return session.attempts[questionId] ?? createDefaultFirstSentenceVsRebuttalAttemptLog();
}

function updateAttempt(
  session: FirstSentenceVsRebuttalSessionRecord,
  questionId: number,
  updater: (log: FirstSentenceVsRebuttalAttemptLog) => FirstSentenceVsRebuttalAttemptLog,
) {
  const current = ensureAttemptLog(session, questionId);
  return {
    ...session,
    attempts: {
      ...session.attempts,
      [questionId]: updater(current),
    },
  };
}

function recordMistake(session: FirstSentenceVsRebuttalSessionRecord, questionId: number, step: StepKey) {
  return updateAttempt(session, questionId, (log) => ({
    ...log,
    [step]: { wrong: log[step].wrong + 1 },
    solvedClean: false,
    completionStatus: log.completionStatus === 'clean' ? 'recovered' : log.completionStatus,
  }));
}

function recordIndicatorReveal(session: FirstSentenceVsRebuttalSessionRecord, questionId: number) {
  return updateAttempt(session, questionId, (log) => ({
    ...log,
    usedIndicatorReveal: true,
    solvedClean: false,
    completionStatus: 'assisted',
  }));
}

function persistableSession(session: FirstSentenceVsRebuttalSessionRecord): LessonProgress['checkpoint_responses'] {
  return {
    kind: 'first-sentence-vs-rebuttal-lab',
    session,
  };
}

function sessionFromRecord(record: LessonProgress | null): FirstSentenceVsRebuttalSessionRecord {
  const raw = record?.checkpoint_responses as
    | { kind?: string; session?: FirstSentenceVsRebuttalSessionRecord }
    | undefined;

  if (raw?.kind === 'first-sentence-vs-rebuttal-lab' && raw.session) {
    return {
      ...createEmptyFirstSentenceVsRebuttalSessionRecord(),
      ...raw.session,
      attempts: raw.session.attempts ?? {},
    };
  }

  return createEmptyFirstSentenceVsRebuttalSessionRecord();
}

function componentTotals(session: FirstSentenceVsRebuttalSessionRecord) {
  return Object.values(session.attempts).reduce(
    (totals, log) => ({
      indicators: totals.indicators + log.indicators.wrong,
      conclusion: totals.conclusion + log.conclusion.wrong,
      structure: totals.structure + log.structure.wrong,
      support: totals.support + log.support.wrong,
    }),
    { indicators: 0, conclusion: 0, structure: 0, support: 0 },
  );
}

export function FirstSentenceVsRebuttalLab({ drillId, title }: { drillId: string; title: string }) {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [session, setSession] = useState<FirstSentenceVsRebuttalSessionRecord>(createEmptyFirstSentenceVsRebuttalSessionRecord());
  const [active, setActive] = useState<ActiveQuestionState>(createActiveQuestionState());
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      const persist = getPersistence(user.id);
      const record = await persist.get<LessonProgress>(TABLES.lesson_progress, SESSION_RECORD_ID);
      if (cancelled) return;
      setSession(sessionFromRecord(record));
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!loaded || !user?.id) return;
    const persist = getPersistence(user.id);
    void persist.set(TABLES.lesson_progress, SESSION_RECORD_ID, {
      id: SESSION_RECORD_ID,
      user_id: user.id,
      lesson_id: SESSION_LESSON_ID,
      viewed_at: now(),
      checkpoint_responses: persistableSession(session),
    } satisfies LessonProgress);
  }, [loaded, session, user?.id]);

  const orderedQuestions = useMemo(
    () =>
      session.questionOrder
        .map((id) => FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === id))
        .filter((question): question is FirstSentenceVsRebuttalQuestion => Boolean(question)),
    [session.questionOrder],
  );

  const currentQuestion = orderedQuestions[session.currentQuestionIndex] ?? orderedQuestions[0];

  useEffect(() => {
    setActive(createActiveQuestionState());
    setFeedback(null);
  }, [currentQuestion?.id]);

  if (!currentQuestion) return null;

  const completedCount = session.completedQuestionIds.length;
  const progressPercent = Math.round((completedCount / orderedQuestions.length) * 100);
  const attemptLog = ensureAttemptLog(session, currentQuestion.id);
  const isSessionComplete = Boolean(session.completedAt) || completedCount >= orderedQuestions.length;
  const totals = componentTotals(session);

  function updateSession(next: FirstSentenceVsRebuttalSessionRecord) {
    setSession(next);
  }

  function handleWrong(step: StepKey, message: string, wrongWordToken?: string | null) {
    updateSession(recordMistake(session, currentQuestion.id, step));
    setActive((value) => ({ ...value, wrongWordToken: wrongWordToken ?? null }));
    setFeedback({ tone: 'wrong', message });
  }

  function handleIndicatorClick(indicatorId: string) {
    if (active.step !== 0 || active.foundIndicators.includes(indicatorId)) return;
    setActive((value) => ({
      ...value,
      foundIndicators: [...value.foundIndicators, indicatorId],
      wrongWordToken: null,
    }));
    setFeedback({
      tone: 'correct',
      message:
        active.foundIndicators.length + 1 === currentQuestion.indicatorCount
          ? 'All indicator words found. Move to the author’s actual conclusion.'
          : 'Indicator marked. Keep scanning for the turns, verdicts, and reasons.',
    });
  }

  function handlePlainWordClick(wordId: string) {
    if (active.step !== 0) return;
    handleWrong('indicators', buildRetryMessage(currentQuestion, 'indicators'), wordId);
  }

  function continueFromIndicators() {
    setActive((value) => ({ ...value, step: 1, wrongWordToken: null }));
    setFeedback({ tone: 'correct', message: 'Indicator words identified. Move to the author’s actual conclusion.' });
  }

  function skipIndicators() {
    updateSession(recordIndicatorReveal(session, currentQuestion.id));
    setActive((value) => ({
      ...value,
      step: 1,
      foundIndicators: Array.from({ length: currentQuestion.indicatorCount }, (_, index) => `reveal-${index}`),
      wrongWordToken: null,
    }));
    setFeedback({ tone: 'warning', message: 'Indicator words revealed. This question will count as assisted, not clean.' });
  }

  function continueFromConclusion() {
    const selected = currentQuestion.parts.find((part) => part.id === active.selectedConclusionId);
    if (!selected || selected.role !== 'conclusion') {
      setActive((value) => ({ ...value, selectedConclusionId: null }));
      handleWrong('conclusion', buildRetryMessage(currentQuestion, 'conclusion'));
      return;
    }

    setActive((value) => ({ ...value, step: 2 }));
    setFeedback({ tone: 'correct', message: 'Conclusion identified. Now classify the structure.' });
  }

  function continueFromStructure() {
    if (active.selectedStructure !== currentQuestion.type) {
      setActive((value) => ({ ...value, selectedStructure: null }));
      handleWrong('structure', buildRetryMessage(currentQuestion, 'structure'));
      return;
    }

    setActive((value) => ({ ...value, step: 3 }));
    setFeedback({ tone: 'correct', message: 'Structure classified. Finish by naming the role.' });
  }

  async function gradeQuestion() {
    const selected = currentQuestion.parts.find((part) => part.id === active.selectedFollowUpId);
    const correctRole = currentQuestion.type === 'first' ? 'support' : 'opposing';

    if (!selected || selected.role !== correctRole) {
      setActive((value) => ({ ...value, selectedFollowUpId: null }));
      handleWrong('support', buildRetryMessage(currentQuestion, 'support'));
      return;
    }

    const nextLog = ensureAttemptLog(session, currentQuestion.id);
    const status = getQuestionStatus(nextLog);
    const nextSession: FirstSentenceVsRebuttalSessionRecord = {
      ...session,
      completedQuestionIds: session.completedQuestionIds.includes(currentQuestion.id)
        ? session.completedQuestionIds
        : [...session.completedQuestionIds, currentQuestion.id],
      completedAt:
        session.completedQuestionIds.length + 1 >= orderedQuestions.length
          ? now()
          : session.completedAt,
    };

    updateSession(nextSession);
    setActive((value) => ({ ...value, revealed: true, finalStatus: status, wrongWordToken: null }));
    setFeedback({
      tone: statusTone(status),
      message: statusSummary(status),
    });

    if (nextSession.completedAt) {
      await markDrillComplete?.(drillId);
    }
  }

  async function advanceQuestion() {
    if (session.currentQuestionIndex + 1 >= orderedQuestions.length) {
      const nextSession = { ...session, completedAt: session.completedAt ?? now() };
      updateSession(nextSession);
      await markDrillComplete?.(drillId);
      return;
    }

    updateSession({
      ...session,
      currentQuestionIndex: session.currentQuestionIndex + 1,
    });
  }

  function renderPartMarkup(part: FirstSentenceVsRebuttalQuestion['parts'][number]) {
    const segments = parseIndicatorMarkup(part.text);
    return segments.map((segment, segmentIndex) => {
      if (segment.kind === 'indicator') {
        const indicatorId = `${part.id}:${segmentIndex}`;
        const found = active.foundIndicators.includes(indicatorId) || active.foundIndicators.some((id) => id.startsWith('reveal-'));
        return (
          <button
            key={indicatorId}
            type="button"
            className={`fsvr-lab__indicator${found ? ' fsvr-lab__indicator--found' : ''}`}
            data-tone={indicatorTone(segment.indicatorType)}
            onClick={() => handleIndicatorClick(indicatorId)}
          >
            {segment.text}
          </button>
        );
      }

      const pieces = segment.text.match(/[A-Za-z'’-]+|[^A-Za-z'’-]+/g) ?? [];
      return (
        <Fragment key={`${part.id}:${segmentIndex}`}>
          {pieces.map((piece, pieceIndex) => {
            const wordId = `${part.id}:${segmentIndex}:${pieceIndex}`;
            if (!/[A-Za-z'’-]+/.test(piece)) return <span key={wordId}>{piece}</span>;
            return (
              <button
                key={wordId}
                type="button"
                className={`fsvr-lab__plain-word${active.wrongWordToken === wordId ? ' fsvr-lab__plain-word--miss' : ''}`}
                onClick={() => handlePlainWordClick(wordId)}
              >
                {piece}
              </button>
            );
          })}
        </Fragment>
      );
    });
  }

  function renderStimulus() {
    return currentQuestion.parts.map((part) => {
      const isSelectedConclusion = active.selectedConclusionId === part.id;
      const isSelectedFollowUp = active.selectedFollowUpId === part.id;
      let partClass = 'fsvr-lab__part';

      if (active.revealed) {
        partClass += ` fsvr-lab__part--${part.role}`;
      } else if (active.step === 1 || active.step === 3) {
        partClass += ' fsvr-lab__part--clickable';
        if (isSelectedConclusion || isSelectedFollowUp) {
          partClass += ' fsvr-lab__part--selected';
        }
      }

      if (active.step === 0) {
        return (
          <div key={part.id} className="fsvr-lab__part">
            <div className="fsvr-lab__part-text">{renderPartMarkup(part)}</div>
          </div>
        );
      }

      return (
        <button
          key={part.id}
          type="button"
          className={partClass}
          onClick={() => {
            if (active.revealed) return;
            if (active.step === 1) {
              setActive((value) => ({ ...value, selectedConclusionId: part.id }));
              setFeedback(null);
              return;
            }
            if (active.step === 3 && part.id !== active.selectedConclusionId) {
              setActive((value) => ({ ...value, selectedFollowUpId: part.id }));
              setFeedback(null);
            }
          }}
        >
          <div className="fsvr-lab__part-text">{stripIndicatorMarkup(part.text)}</div>
        </button>
      );
    });
  }

  function renderControls() {
    const indicatorReady = active.foundIndicators.length >= currentQuestion.indicatorCount;
    const followUpPrompt = active.selectedStructure === 'first' ? 'Select a Supporting Claim' : 'Select the Opposing Viewpoint';

    return (
      <div className="fsvr-lab__controls">
        <div className="fsvr-lab__card" style={{ padding: '1rem' }}>
          <div className="fsvr-lab__step">
            {active.step === 0 && '1. Identify the Indicator Words'}
            {active.step === 1 && '2. Select the Main Conclusion'}
            {active.step === 2 && '3. Classify the Argument Structure'}
            {active.step === 3 && '4. Finish the Dissection'}
          </div>
          <p className="fsvr-lab__step-copy">
            {active.step === 0 && `Click each indicator word in the text above. ${active.foundIndicators.length} of ${currentQuestion.indicatorCount} found.`}
            {active.step === 1 && 'Click the phrase that represents the author’s ultimate point.'}
            {active.step === 2 && 'Decide whether the conclusion comes first or arrives as a rebuttal.'}
            {active.step === 3 && `${followUpPrompt}. Click the phrase in the stimulus above.`}
          </p>

          {feedback ? (
            <div className={`fsvr-lab__feedback fsvr-lab__feedback--${feedback.tone}`}>
              <span className="fsvr-lab__feedback-icon">{feedback.tone === 'correct' ? '✓' : feedback.tone === 'warning' ? '!' : '✕'}</span>
              <div className="fsvr-lab__feedback-copy">{feedback.message}</div>
            </div>
          ) : null}

          {active.step === 2 ? (
            <div className="fsvr-lab__choice-grid">
              <button
                type="button"
                className={`fsvr-lab__choice${active.selectedStructure === 'first' ? ' fsvr-lab__choice--selected' : ''}`}
                onClick={() => setActive((value) => ({ ...value, selectedStructure: 'first' }))}
              >
                Conclusion first
              </button>
              <button
                type="button"
                className={`fsvr-lab__choice${active.selectedStructure === 'rebuttal' ? ' fsvr-lab__choice--selected' : ''}`}
                onClick={() => setActive((value) => ({ ...value, selectedStructure: 'rebuttal' }))}
              >
                Rebuttal
              </button>
            </div>
          ) : null}

          {!active.revealed ? (
            <div className="fsvr-lab__cta-row">
              {active.step === 0 ? (
                <>
                  <button type="button" className="fsvr-lab__cta" disabled={!indicatorReady} onClick={continueFromIndicators}>
                    Continue to conclusion
                  </button>
                  <button type="button" className="fsvr-lab__cta fsvr-lab__cta--secondary" onClick={skipIndicators}>
                    Skip / Reveal All
                  </button>
                </>
              ) : null}
              {active.step === 1 ? (
                <button type="button" className="fsvr-lab__cta" disabled={!active.selectedConclusionId} onClick={continueFromConclusion}>
                  Continue to structure
                </button>
              ) : null}
              {active.step === 2 ? (
                <button type="button" className="fsvr-lab__cta" disabled={!active.selectedStructure} onClick={continueFromStructure}>
                  Continue to role
                </button>
              ) : null}
              {active.step === 3 ? (
                <button type="button" className="fsvr-lab__cta" disabled={!active.selectedFollowUpId} onClick={() => void gradeQuestion()}>
                  Check dissection
                </button>
              ) : null}
            </div>
          ) : (
            <div className="fsvr-lab__summary">
              <div className={`fsvr-lab__feedback fsvr-lab__feedback--${active.finalStatus === 'clean' ? 'correct' : 'warning'}`}>
                <span className="fsvr-lab__feedback-icon">{active.finalStatus === 'clean' ? '✓' : active.finalStatus === 'assisted' ? '↻' : '↺'}</span>
                <div>
                  <div className="fsvr-lab__step">{active.finalStatus ? `${statusLabel(active.finalStatus)} Dissection` : 'Review'}</div>
                  <div className="fsvr-lab__feedback-copy">{currentQuestion.feedback}</div>
                </div>
              </div>
              <div className="fsvr-lab__legend">
                <span><b style={{ background: 'rgba(253,224,71,0.75)' }} />Conclusion</span>
                <span><b style={{ background: 'rgba(244,114,182,0.75)' }} />Support</span>
                <span><b style={{ background: 'rgba(251,146,60,0.75)' }} />Opposing View</span>
                <span><b style={{ background: 'rgba(203,213,225,0.75)' }} />Neutral</span>
              </div>
              <button type="button" className="fsvr-lab__cta" onClick={() => void advanceQuestion()}>
                {session.currentQuestionIndex + 1 >= orderedQuestions.length ? 'Finish drills' : 'Next question'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderReview() {
    const rank = { assisted: 2, recovered: 1, clean: 0 } satisfies Record<FirstSentenceVsRebuttalQuestionStatus, number>;
    const cards = orderedQuestions
      .map((question) => ({
        question,
        log: ensureAttemptLog(session, question.id),
      }))
      .sort((left, right) => rank[getQuestionStatus(right.log)] - rank[getQuestionStatus(left.log)]);

    const cleanCount = cards.filter(({ log }) => getQuestionStatus(log) === 'clean').length;
    const strongest = [
      { key: 'indicators', label: 'Indicator words', value: totals.indicators },
      { key: 'conclusion', label: 'Main conclusion', value: totals.conclusion },
      { key: 'structure', label: 'Structure', value: totals.structure },
      { key: 'support', label: 'Support / opposing view', value: totals.support },
    ].sort((left, right) => left.value - right.value);

    return (
      <section className="fsvr-lab__review">
        <div>
          <div className="fsvr-lab__eyebrow">Session review</div>
          <h1>How that went</h1>
          <p>Twenty arguments dissected. Here’s the saved breakdown from this profile.</p>
        </div>

        <div className="fsvr-lab__summary">
          <strong className="fsvr-lab__review-label">Clean first-try</strong>
          <p>{cleanCount} of {orderedQuestions.length} questions were solved cleanly on the first pass.</p>
          <p>Strongest step: {strongest[0]?.label.toLowerCase()}. Weakest step: {strongest[strongest.length - 1]?.label.toLowerCase()}.</p>
        </div>

        <div className="fsvr-lab__review-grid">
          {cards.map(({ question, log }) => {
            const status = getQuestionStatus(log);
            const isOpen = expanded.includes(question.id);
            const conclusion = question.parts.find((part) => part.role === 'conclusion');
            const chips = [
              log.usedIndicatorReveal ? 'reveal used' : null,
              log.indicators.wrong ? `${log.indicators.wrong}x indicators` : null,
              log.conclusion.wrong ? `${log.conclusion.wrong}x conclusion` : null,
              log.structure.wrong ? `${log.structure.wrong}x structure` : null,
              log.support.wrong ? `${log.support.wrong}x role` : null,
            ].filter(Boolean) as string[];

            return (
              <article key={question.id} className="fsvr-lab__review-card">
                <button
                  type="button"
                  className="fsvr-lab__toggle"
                  onClick={() =>
                    setExpanded((value) =>
                      value.includes(question.id) ? value.filter((id) => id !== question.id) : [...value, question.id],
                    )
                  }
                >
                  <div>
                    <strong>Q{question.id}. {question.review.title}</strong>
                  </div>
                  <div className="fsvr-lab__chips">
                    {chips.map((chip) => <span key={chip} className="fsvr-lab__chip">{chip}</span>)}
                    <span className={`fsvr-lab__chip fsvr-lab__chip--${status}`}>{statusLabel(status)}</span>
                  </div>
                </button>
                {isOpen ? (
                  <div className="fsvr-lab__review-body">
                    <div>
                      <div className="fsvr-lab__review-label">Main conclusion</div>
                      <div className="fsvr-lab__review-quote">{conclusion ? stripIndicatorMarkup(conclusion.text) : '—'}</div>
                    </div>
                    <div>
                      <div className="fsvr-lab__review-label">Why that’s the conclusion</div>
                      <p>{question.review.whyConclusion}</p>
                    </div>
                    <div>
                      <div className="fsvr-lab__review-label">Why {question.type === 'first' ? 'First-sentence' : 'Rebuttal'}</div>
                      <p>{question.review.whyStructure}</p>
                    </div>
                    <div>
                      <div className="fsvr-lab__review-label">{question.type === 'first' ? 'Why that supporting claim' : 'Why that opposing view'}</div>
                      <p>{question.review.whyFollowUp}</p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="fsvr-lab">
      <div className="fsvr-lab__shell">
        <header className="fsvr-lab__hero">
          <div className="fsvr-lab__eyebrow">Argument drill</div>
          <h1>{title}</h1>
          <p>Preserved from the standalone quiz, rebuilt natively: indicator words, conclusion, structure, then the key role that makes the read hold together.</p>
          <div className="fsvr-lab__progress">
            <div className="fsvr-lab__progress-row">
              <span>{completedCount} of {orderedQuestions.length} questions complete</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="fsvr-lab__bar"><span style={{ width: `${progressPercent}%` }} /></div>
          </div>
        </header>

        {!isSessionComplete ? (
          <article className="fsvr-lab__workspace">
            <div className="fsvr-lab__stimulus">
              <div className="fsvr-lab__meta">
                <div>
                  <div className="fsvr-lab__title">{currentQuestion.review.title}</div>
                  <div className="fsvr-lab__subtitle">Question {session.currentQuestionIndex + 1} of {orderedQuestions.length}</div>
                </div>
                <div className="fsvr-lab__eyebrow">{currentQuestion.type === 'first' ? 'Conclusion first' : 'Rebuttal'}</div>
              </div>
              {renderStimulus()}
            </div>

            {renderControls()}
          </article>
        ) : (
          renderReview()
        )}
      </div>
    </section>
  );
}
