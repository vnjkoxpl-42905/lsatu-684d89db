import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';

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
    if (!currentQuestion) return;
    const nextState = createActiveQuestionState();
    if (session.completedQuestionIds.includes(currentQuestion.id)) {
      nextState.foundIndicators = Array.from({ length: currentQuestion.indicatorCount }, (_, index) => `reveal-${index}`);
      nextState.finalStatus = getQuestionStatus(ensureAttemptLog(session, currentQuestion.id));
      nextState.revealed = true;
    }
    setActive(nextState);
    setFeedback(null);
  }, [currentQuestion?.id, session.completedQuestionIds]);

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
    if (active.foundIndicators.length < currentQuestion.indicatorCount) {
      setFeedback({ tone: 'warning', message: 'Find the indicator words first, or use Skip / Reveal All.' });
      return;
    }
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
    if (!active.selectedConclusionId) {
      setFeedback({ tone: 'warning', message: 'Click the phrase you think is the conclusion first.' });
      return;
    }
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
    if (!active.selectedStructure) {
      setFeedback({ tone: 'warning', message: 'Choose Conclusion first or Rebuttal.' });
      return;
    }
    if (active.selectedStructure !== currentQuestion.type) {
      setActive((value) => ({ ...value, selectedStructure: null }));
      handleWrong('structure', buildRetryMessage(currentQuestion, 'structure'));
      return;
    }

    setActive((value) => ({ ...value, step: 3 }));
    setFeedback({ tone: 'correct', message: 'Structure classified. Finish by naming the role.' });
  }

  async function gradeQuestion() {
    if (!active.selectedFollowUpId) {
      setFeedback({ tone: 'warning', message: 'Click the phrase in the stimulus first.' });
      return;
    }
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

  function navigateToQuestion(index: number) {
    if (index < 0 || index >= orderedQuestions.length) return;
    updateSession({
      ...session,
      currentQuestionIndex: index,
    });
  }

  function renderPartMarkup(part: FirstSentenceVsRebuttalQuestion['parts'][number], interactive: boolean) {
    const segments = parseIndicatorMarkup(part.text);
    return segments.map((segment, segmentIndex) => {
      if (segment.kind === 'indicator') {
        const indicatorId = `${part.id}:${segmentIndex}`;
        const tone = indicatorTone(segment.indicatorType);
        if (!interactive) {
          return (
            <span
              key={indicatorId}
              className="fsvr-lab__indicator"
              data-tone={tone}
            >
              {segment.text}
            </span>
          );
        }
        const found = active.foundIndicators.includes(indicatorId) || active.foundIndicators.some((id) => id.startsWith('reveal-'));
        return (
          <button
            key={indicatorId}
            type="button"
            className={`fsvr-lab__indicator${found ? ' fsvr-lab__indicator--found' : ''}`}
            data-tone={tone}
            onClick={() => handleIndicatorClick(indicatorId)}
          >
            {segment.text}
          </button>
        );
      }

      if (!interactive) {
        return <Fragment key={`${part.id}:${segmentIndex}`}>{segment.text}</Fragment>;
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
    return currentQuestion.parts.map((part, index) => {
      const isSelectedConclusion = active.selectedConclusionId === part.id;
      const isSelectedFollowUp = active.selectedFollowUpId === part.id;
      const clickable = !active.revealed && (active.step === 1 || active.step === 3);
      const interactive = active.step === 0 && !active.revealed;

      let partClass = 'fsvr-lab__part';
      if (active.revealed) {
        partClass += ` fsvr-lab__part--${part.role}`;
      } else if (clickable) {
        partClass += ' fsvr-lab__part--clickable';
        if (isSelectedConclusion || isSelectedFollowUp) {
          partClass += ' fsvr-lab__part--selected';
        }
      } else {
        partClass += ' fsvr-lab__part--reading';
      }

      const selectPart = () => {
        if (active.step === 1) {
          setActive((value) => ({ ...value, selectedConclusionId: part.id }));
          setFeedback(null);
          return;
        }
        if (active.step === 3 && part.id !== active.selectedConclusionId) {
          setActive((value) => ({ ...value, selectedFollowUpId: part.id }));
          setFeedback(null);
        }
      };

      return (
        <Fragment key={part.id}>
          <span
            className={partClass}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? selectPart : undefined}
            onKeyDown={
              clickable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPart();
                    }
                  }
                : undefined
            }
          >
            <span className="fsvr-lab__part-text">{renderPartMarkup(part, interactive)}</span>
          </span>
          {index < currentQuestion.parts.length - 1 ? ' ' : null}
        </Fragment>
      );
    });
  }

  function renderControls() {
    const followUpPrompt = active.selectedStructure === 'first' ? 'Select a Supporting Claim' : 'Select the Opposing Viewpoint';

    return (
      <div className="fsvr-lab__controls">
        <div className="fsvr-lab__card fsvr-lab__controls-card">
          <div className="fsvr-lab__instruction-step">
            <div className="fsvr-lab__step-badge">{active.step + 1}</div>
            <div className="fsvr-lab__step">
              {active.step === 0 && 'Identify the Indicator Words'}
              {active.step === 1 && 'Select the Main Conclusion'}
              {active.step === 2 && 'Classify the Argument Structure'}
              {active.step === 3 && 'Finish the Dissection'}
            </div>
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
                  <button type="button" className="fsvr-lab__cta" onClick={continueFromIndicators}>
                    Continue to conclusion
                  </button>
                  <button type="button" className="fsvr-lab__cta fsvr-lab__cta--secondary" onClick={skipIndicators}>
                    Skip / Reveal All
                  </button>
                </>
              ) : null}
              {active.step === 1 ? (
                <button type="button" className="fsvr-lab__cta" onClick={continueFromConclusion}>
                  Continue to structure
                </button>
              ) : null}
              {active.step === 2 ? (
                <button type="button" className="fsvr-lab__cta" onClick={continueFromStructure}>
                  Continue to role
                </button>
              ) : null}
              {active.step === 3 ? (
                <button type="button" className="fsvr-lab__cta" onClick={() => void gradeQuestion()}>
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
                <span><b style={{ background: 'rgba(255,214,10,0.9)' }} />Conclusion</span>
                <span><b style={{ background: 'rgba(255,149,0,0.9)' }} />Support</span>
                <span><b style={{ background: 'rgba(255,59,48,0.9)' }} />Opposing View</span>
                <span><b style={{ background: 'rgba(199,199,204,0.95)' }} />Neutral</span>
              </div>
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
    const cleanPercent = Math.round((cleanCount / orderedQuestions.length) * 100);
    const strongest = [
      { key: 'indicators', label: 'Indicator words', value: totals.indicators },
      { key: 'conclusion', label: 'Main conclusion', value: totals.conclusion },
      { key: 'structure', label: 'Structure', value: totals.structure },
      { key: 'support', label: 'Support / opposing view', value: totals.support },
    ].sort((left, right) => left.value - right.value);
    const weakest = strongest[strongest.length - 1];

    return (
      <section className="fsvr-lab__review">
        <div>
          <div className="fsvr-lab__eyebrow">Session review</div>
          <h1>How that went</h1>
          <p>Twenty arguments dissected. Here’s what your saved session looked like, step by step.</p>
        </div>

        <div className="fsvr-lab__review-summary-grid">
          <div className="fsvr-lab__review-stat">
            <div className="fsvr-lab__review-label">Clean first-try</div>
            <div className="fsvr-lab__review-kpi">
              <span>{cleanCount}</span> / {orderedQuestions.length}
            </div>
            <div className="fsvr-lab__bar"><span style={{ width: `${cleanPercent}%` }} /></div>
            <p>{cleanPercent}% solved cleanly.</p>
          </div>
          <div className="fsvr-lab__review-stat">
            <div className="fsvr-lab__review-label">Misses by component</div>
            <div className="fsvr-lab__component-list">
              {strongest.map((item) => (
                <div key={item.key} className="fsvr-lab__component-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fsvr-lab__review-callouts">
          <div className="fsvr-lab__callout fsvr-lab__callout--strength">
            <div className="fsvr-lab__callout-icon">✓</div>
            <div>
              <div className="fsvr-lab__review-label">Strongest step</div>
              <p>{strongest[0]?.label} cost you the fewest misses this set.</p>
            </div>
          </div>
          <div className="fsvr-lab__callout fsvr-lab__callout--weakness">
            <div className="fsvr-lab__callout-icon">⚑</div>
            <div>
              <div className="fsvr-lab__review-label">Biggest weakness</div>
              <p>{weakest?.label} is where the most misses collected. Start your next review there.</p>
            </div>
          </div>
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

  const canGoPrevious = session.currentQuestionIndex > 0 && !isSessionComplete;
  const currentQuestionComplete = active.revealed || session.completedQuestionIds.includes(currentQuestion.id);
  const canGoNext = currentQuestionComplete && !isSessionComplete;
  const nextLabel = session.currentQuestionIndex + 1 >= orderedQuestions.length ? 'Finish' : 'Next';

  return (
    <section className="fsvr-lab">
      <div className="fsvr-lab__shell" data-review={isSessionComplete ? 'true' : 'false'}>
        <div className="fsvr-lab__topbar">
          <Link to="/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab" className="fsvr-lab__home">
            <Home className="fsvr-lab__home-icon" aria-hidden="true" />
            Home
          </Link>
        </div>

        {!isSessionComplete ? (
          <>
            <header className="fsvr-lab__hero">
              <div className="fsvr-lab__hero-copy">
                <div className="fsvr-lab__eyebrow">Argument Drill</div>
                <h1>{currentQuestion.review.title}</h1>
              </div>
              <div className="fsvr-lab__progress-card" aria-label={`${title} progress`}>
                <div className="fsvr-lab__progress-top">
                  <span className="fsvr-lab__progress-value">{progressPercent}%</span>
                  <span className="fsvr-lab__progress-label">Complete</span>
                </div>
                <div className="fsvr-lab__bar"><span style={{ width: `${progressPercent}%` }} /></div>
                <div className="fsvr-lab__progress-row">
                  <span>{completedCount} of {orderedQuestions.length} questions complete</span>
                </div>
              </div>
            </header>

            <article className="fsvr-lab__workspace">
              <div className="fsvr-lab__stimulus">
                <div className="fsvr-lab__stimulus-text">{renderStimulus()}</div>
              </div>

              {renderControls()}
            </article>

            <nav className="fsvr-lab__footer-nav" aria-label="Question navigation">
              <button
                type="button"
                className="fsvr-lab__nav-button"
                disabled={!canGoPrevious}
                onClick={() => navigateToQuestion(session.currentQuestionIndex - 1)}
              >
                <ChevronLeft className="fsvr-lab__nav-icon" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="fsvr-lab__nav-button"
                disabled={!canGoNext}
                onClick={() => void advanceQuestion()}
              >
                {nextLabel}
                <ChevronRight className="fsvr-lab__nav-icon" aria-hidden="true" />
              </button>
            </nav>
          </>
        ) : (
          renderReview()
        )}
      </div>
    </section>
  );
}
