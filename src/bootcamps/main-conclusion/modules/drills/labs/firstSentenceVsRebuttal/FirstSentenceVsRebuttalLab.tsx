import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Home, RotateCcw } from 'lucide-react';
import { getNextAction } from '@/bootcamps/main-conclusion/content/introToLrPath';

import {
  FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS,
  createDefaultFirstSentenceVsRebuttalAttemptLog,
  createEmptyFirstSentenceVsRebuttalSessionRecord,
  firstSentenceVsRebuttalFollowUpIds,
  firstSentenceVsRebuttalFollowUpRole,
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
type FeedbackTargetKind = 'indicator' | 'plain-word' | 'part' | 'choice';
type ConfirmableStep = 0 | 1 | 2;

interface FeedbackState {
  tone: Tone;
  message: string;
}

interface FeedbackTarget {
  kind: FeedbackTargetKind;
  id: string;
  tone: Tone;
}

interface ActiveQuestionState {
  step: 0 | 1 | 2 | 3;
  foundIndicators: string[];
  wrongWordToken: string | null;
  wrongPhraseId: string | null;
  selectedConclusionId: string | null;
  selectedStructure: 'first' | 'rebuttal' | null;
  selectedFollowUpIds: string[];
  confirmedStep: ConfirmableStep | null;
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
    wrongPhraseId: null,
    selectedConclusionId: null,
    selectedStructure: null,
    selectedFollowUpIds: [],
    confirmedStep: null,
    finalStatus: null,
    revealed: false,
  };
}

const INDICATOR_TONE_LABEL: Record<string, string> = {
  premise: 'Premise',
  pivot: 'Pivot',
  opposing: 'Opposing view',
  concession: 'Concession',
  opinion: 'Opinion',
  conclusion: 'Conclusion',
};

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
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [reviewQuestionId, setReviewQuestionId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Start Drill always begins a fresh session at Question 1 — no mid-drill resume.
  useEffect(() => {
    if (!user?.id) return;
    setSession(createEmptyFirstSentenceVsRebuttalSessionRecord());
    setActive(createActiveQuestionState());
    setFeedback(null);
    setReviewQuestionId(null);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!loaded || !user?.id) return;
    let cancelled = false;
    const persist = getPersistence(user.id);
    void (async () => {
      try {
        await persist.set(TABLES.lesson_progress, SESSION_RECORD_ID, {
          id: SESSION_RECORD_ID,
          user_id: user.id,
          lesson_id: SESSION_LESSON_ID,
          viewed_at: now(),
          checkpoint_responses: persistableSession(session),
        } satisfies LessonProgress);
        if (!cancelled) setSaveStatus('saved');
      } catch {
        /* persistence is best-effort; ignore write failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, session, user?.id]);

  // Fade the "Saved" indicator out shortly after it appears.
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = setTimeout(() => setSaveStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Clear the wrong-answer shake/flash after the animation has played.
  useEffect(() => {
    if (!active.wrongWordToken && !active.wrongPhraseId) return;
    const timer = setTimeout(() => {
      setActive((value) => ({ ...value, wrongWordToken: null, wrongPhraseId: null }));
    }, 650);
    return () => clearTimeout(timer);
  }, [active.wrongWordToken, active.wrongPhraseId]);

  const orderedQuestions = useMemo(
    () =>
      session.questionOrder
        .map((id) => FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === id))
        .filter((question): question is FirstSentenceVsRebuttalQuestion => Boolean(question)),
    [session.questionOrder],
  );

  const currentQuestion = orderedQuestions[session.currentQuestionIndex] ?? orderedQuestions[0];
  const currentQuestionIsComplete = currentQuestion ? session.completedQuestionIds.includes(currentQuestion.id) : false;

  useEffect(() => {
    if (!currentQuestion) return;
    const nextState = createActiveQuestionState();
    if (currentQuestionIsComplete) {
      nextState.foundIndicators = Array.from({ length: currentQuestion.indicatorCount }, (_, index) => `reveal-${index}`);
      nextState.finalStatus = getQuestionStatus(ensureAttemptLog(session, currentQuestion.id));
      nextState.revealed = true;
    }
    setActive(nextState);
    setFeedback(null);
    setFeedbackTarget(null);
  }, [currentQuestion?.id, currentQuestionIsComplete]);

  if (!currentQuestion) return null;

  const completedCount = session.completedQuestionIds.length;
  const progressPercent = Math.round((completedCount / orderedQuestions.length) * 100);
  const attemptLog = ensureAttemptLog(session, currentQuestion.id);
  const isSessionComplete = Boolean(session.completedAt) || completedCount >= orderedQuestions.length;
  const totals = componentTotals(session);

  function updateSession(next: FirstSentenceVsRebuttalSessionRecord) {
    setSession(next);
  }

  function showWarning(message = 'Choose an answer first.') {
    setFeedback({ tone: 'warning', message });
    setFeedbackTarget(null);
  }

  function showCorrect(message: string, target?: FeedbackTarget | null) {
    setFeedback({ tone: 'correct', message });
    setFeedbackTarget(target ?? null);
  }

  function handleWrong(step: StepKey, message: string, target?: FeedbackTarget | null) {
    updateSession(recordMistake(session, currentQuestion.id, step));
    setActive((value) => ({
      ...value,
      wrongWordToken: target?.kind === 'plain-word' ? target.id : null,
      confirmedStep: null,
    }));
    setFeedback({ tone: 'wrong', message });
    setFeedbackTarget(target ?? null);
  }

  function handleIndicatorClick(indicatorId: string) {
    if (active.step !== 0 || active.foundIndicators.includes(indicatorId)) return;
    const nextFoundIndicators = [...active.foundIndicators, indicatorId];
    const complete = nextFoundIndicators.length >= currentQuestion.indicatorCount;
    setActive((value) => ({
      ...value,
      foundIndicators: value.foundIndicators.includes(indicatorId)
        ? value.foundIndicators
        : [...value.foundIndicators, indicatorId],
      wrongWordToken: null,
      confirmedStep: complete ? 0 : null,
    }));
    showCorrect(
      complete ? 'Correct. Next: choose the main conclusion.' : 'Correct. Keep finding the indicator words.',
      { kind: 'indicator', id: indicatorId, tone: 'correct' },
    );
  }

  function handleConclusionChoice(part: FirstSentenceVsRebuttalQuestion['parts'][number]) {
    if (active.step !== 1 || active.revealed) return;

    if (part.role !== 'conclusion') {
      handleWrong('conclusion', buildRetryMessage(currentQuestion, 'conclusion'), {
        kind: 'part',
        id: part.id,
        tone: 'wrong',
      });
      setActive((value) => ({ ...value, selectedConclusionId: null, wrongPhraseId: part.id, confirmedStep: null }));
      return;
    }

    setActive((value) => ({
      ...value,
      selectedConclusionId: part.id,
      wrongPhraseId: null,
      confirmedStep: 1,
    }));
    showCorrect('Correct. Next: classify the structure.', {
      kind: 'part',
      id: part.id,
      tone: 'correct',
    });
  }

  function handleStructureChoice(choice: 'first' | 'rebuttal') {
    if (choice !== currentQuestion.type) {
      setActive((value) => ({ ...value, selectedStructure: null, confirmedStep: null }));
      handleWrong('structure', buildRetryMessage(currentQuestion, 'structure'), {
        kind: 'choice',
        id: choice,
        tone: 'wrong',
      });
      return;
    }

    setActive((value) => ({ ...value, selectedStructure: choice, confirmedStep: 2 }));
    showCorrect('Correct. Next: find the supporting or opposing part.', {
      kind: 'choice',
      id: choice,
      tone: 'correct',
    });
  }

  function handlePlainWordClick(wordId: string) {
    if (active.step !== 0) return;
    handleWrong('indicators', buildRetryMessage(currentQuestion, 'indicators'), {
      kind: 'plain-word',
      id: wordId,
      tone: 'wrong',
    });
  }

  function continueFromIndicators() {
    if (active.foundIndicators.length < currentQuestion.indicatorCount) {
      showWarning();
      return;
    }
    if (active.confirmedStep !== 0) {
      showCorrect('Correct. Next: choose the main conclusion.');
      setActive((value) => ({ ...value, confirmedStep: 0 }));
      return;
    }
    setActive((value) => ({ ...value, step: 1, wrongWordToken: null, confirmedStep: null }));
    setFeedbackTarget(null);
    setFeedback(null);
  }

  async function revealEverything() {
    const conclusionId = currentQuestion.parts.find((part) => part.role === 'conclusion')?.id ?? null;
    const followUpIds = firstSentenceVsRebuttalFollowUpIds(currentQuestion);

    const revealedSession = recordIndicatorReveal(session, currentQuestion.id);
    const alreadyCompleted = revealedSession.completedQuestionIds.includes(currentQuestion.id);
    const nextSession: FirstSentenceVsRebuttalSessionRecord = {
      ...revealedSession,
      completedQuestionIds: alreadyCompleted
        ? revealedSession.completedQuestionIds
        : [...revealedSession.completedQuestionIds, currentQuestion.id],
      completedAt:
        !alreadyCompleted && revealedSession.completedQuestionIds.length + 1 >= orderedQuestions.length
          ? now()
          : revealedSession.completedAt,
    };
    updateSession(nextSession);

    const status = getQuestionStatus(ensureAttemptLog(nextSession, currentQuestion.id));
    setActive((value) => ({
      ...value,
      step: 3,
      revealed: true,
      finalStatus: status,
      foundIndicators: Array.from({ length: currentQuestion.indicatorCount }, (_, index) => `reveal-${index}`),
      selectedConclusionId: conclusionId,
      selectedStructure: currentQuestion.type,
      selectedFollowUpIds: followUpIds,
      wrongWordToken: null,
      wrongPhraseId: null,
      confirmedStep: null,
    }));
    setFeedbackTarget(null);
    setFeedback({ tone: 'warning', message: 'Full answer revealed. This question counts as assisted, not clean.' });

    if (nextSession.completedAt) {
      await markDrillComplete?.(drillId);
    }
  }

  function continueFromConclusion() {
    if (active.confirmedStep === 1) {
      setActive((value) => ({ ...value, step: 2, confirmedStep: null }));
      setFeedbackTarget(null);
      setFeedback(null);
      return;
    }

    if (!active.selectedConclusionId) {
      showWarning();
      return;
    }
    const selected = currentQuestion.parts.find((part) => part.id === active.selectedConclusionId);

    if (!selected || selected.role !== 'conclusion') {
      const targetId = active.selectedConclusionId;
      setActive((value) => ({ ...value, selectedConclusionId: null, confirmedStep: null }));
      handleWrong('conclusion', buildRetryMessage(currentQuestion, 'conclusion'), targetId ? {
        kind: 'part',
        id: targetId,
        tone: 'wrong',
      } : null);
      return;
    }

    setActive((value) => ({ ...value, selectedConclusionId: selected.id, confirmedStep: 1 }));
    showCorrect('Correct. Next: classify the structure.', {
      kind: 'part',
      id: selected.id,
      tone: 'correct',
    });
  }

  function continueFromStructure() {
    if (active.confirmedStep === 2) {
      setActive((value) => ({ ...value, step: 3, confirmedStep: null }));
      setFeedbackTarget(null);
      setFeedback(null);
      return;
    }

    if (!active.selectedStructure) {
      showWarning();
      return;
    }
    if (active.selectedStructure !== currentQuestion.type) {
      const targetId = active.selectedStructure;
      setActive((value) => ({ ...value, selectedStructure: null, confirmedStep: null }));
      handleWrong('structure', buildRetryMessage(currentQuestion, 'structure'), {
        kind: 'choice',
        id: targetId,
        tone: 'wrong',
      });
      return;
    }

    setActive((value) => ({ ...value, confirmedStep: 2 }));
    showCorrect('Correct. Next: find the supporting or opposing part.', {
      kind: 'choice',
      id: active.selectedStructure,
      tone: 'correct',
    });
  }

  async function gradeQuestion() {
    const targetIds = firstSentenceVsRebuttalFollowUpIds(currentQuestion);
    const targetRole = firstSentenceVsRebuttalFollowUpRole(currentQuestion);
    const noun = targetRole === 'support' ? 'supporting claim' : 'opposing viewpoint';
    const selected = active.selectedFollowUpIds;

    if (selected.length === 0) {
      setFeedback({
        tone: 'warning',
        message: targetIds.length > 1 ? `Click every ${noun} in the stimulus first.` : `Click the ${noun} in the stimulus first.`,
      });
      return;
    }

    const complete = targetIds.length === selected.length && targetIds.every((id) => selected.includes(id));
    if (!complete) {
      setFeedback({
        tone: 'warning',
        message: `You have ${selected.length} of ${targetIds.length}. Select every ${noun} before checking.`,
      });
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
    setFeedbackTarget(selected[0] ? { kind: 'part', id: selected[0], tone: 'correct' } : null);
    setFeedback({
      tone: 'correct',
      message: `Correct. Move to the next step. ${statusSummary(status)}`,
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
        const tip = INDICATOR_TONE_LABEL[tone] ?? 'Indicator';
        if (!interactive) {
          // Indicators past Step 1 are already identified — show their type on hover.
          return (
            <span
              key={indicatorId}
              className="fsvr-lab__indicator fsvr-lab__indicator--found"
              data-tone={tone}
              data-tip={tip}
            >
              {segment.text}
            </span>
          );
        }
        const found = active.foundIndicators.includes(indicatorId) || active.foundIndicators.some((id) => id.startsWith('reveal-'));
        const success = feedbackTarget?.kind === 'indicator' && feedbackTarget.id === indicatorId && feedbackTarget.tone === 'correct';
        return (
          <button
            key={indicatorId}
            type="button"
            className={`fsvr-lab__indicator${found ? ' fsvr-lab__indicator--found' : ''}${success ? ' fsvr-lab__indicator--success' : ''}`}
            data-tone={tone}
            data-tip={found ? tip : undefined}
            aria-pressed={found}
            aria-label={found ? `${segment.text} — ${tip} indicator, found` : `Mark indicator word ${segment.text}`}
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
                aria-label={`Check word ${piece}`}
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
      const isSelected =
        (active.step === 1 && active.selectedConclusionId === part.id) ||
        (active.step === 3 && active.selectedFollowUpIds.includes(part.id));
      const isWrong = active.wrongPhraseId === part.id;
      const clickable = !active.revealed && (active.step === 1 || active.step === 3);
      const interactive = active.step === 0 && !active.revealed;

      let partClass = 'fsvr-lab__part';
      if (active.revealed) {
        partClass += ` fsvr-lab__part--${part.role}`;
      } else if (clickable) {
        partClass += ' fsvr-lab__part--clickable';
        if (isSelected) partClass += ' fsvr-lab__part--selected';
        if (isWrong) partClass += ' fsvr-lab__part--wrong';
      } else {
        partClass += ' fsvr-lab__part--reading';
      }

      const selectPart = () => {
        if (active.step === 1) {
          handleConclusionChoice(part);
          return;
        }
        if (active.step === 3) {
          const targetIds = firstSentenceVsRebuttalFollowUpIds(currentQuestion);
          if (!targetIds.includes(part.id)) {
            // Not a designated follow-up: flash/shake but never select or count a
            // miss. Covers both wrong-role parts and correct-role-but-not-the-
            // answer parts (e.g. a second supporting claim that isn't the
            // cleanest one the review names).
            setActive((value) => ({ ...value, wrongPhraseId: part.id }));
            setFeedbackTarget({ kind: 'part', id: part.id, tone: 'wrong' });
            setFeedback({ tone: 'wrong', message: buildRetryMessage(currentQuestion, 'support') });
            return;
          }
          setActive((value) => ({
            ...value,
            wrongPhraseId: null,
            confirmedStep: null,
            selectedFollowUpIds: value.selectedFollowUpIds.includes(part.id)
              ? value.selectedFollowUpIds.filter((id) => id !== part.id)
              : [...value.selectedFollowUpIds, part.id],
          }));
          setFeedback(null);
          setFeedbackTarget(null);
        }
      };

      if (feedbackTarget?.kind === 'part' && feedbackTarget.id === part.id) {
        partClass += feedbackTarget.tone === 'correct' ? ' fsvr-lab__part--success' : ' fsvr-lab__part--miss';
      }

      return (
        <Fragment key={part.id}>
          <span
            className={partClass}
            data-role={part.role}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-pressed={clickable ? isSelected : undefined}
            aria-label={clickable ? 'Select this phrase' : undefined}
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

  function renderColorCodedStimulus(question: FirstSentenceVsRebuttalQuestion) {
    return question.parts.map((part, index) => (
      <Fragment key={part.id}>
        <span className={`fsvr-lab__part fsvr-lab__part--${part.role}`} data-role={part.role}>
          <span className="fsvr-lab__part-text">{renderPartMarkup(part, false)}</span>
        </span>
        {index < question.parts.length - 1 ? ' ' : null}
      </Fragment>
    ));
  }

  function renderBreakdown(question: FirstSentenceVsRebuttalQuestion) {
    const conclusion = question.parts.find((part) => part.role === 'conclusion');
    const supports = question.parts.filter((part) => part.role === 'support');
    const opposings = question.parts.filter((part) => part.role === 'opposing');
    return (
      <div className="fsvr-lab__breakdown-body">
        <div>
          <div className="fsvr-lab__review-label">Main conclusion</div>
          <div className="fsvr-lab__review-quote">{conclusion ? stripIndicatorMarkup(conclusion.text) : '—'}</div>
        </div>
        {supports.length ? (
          <div>
            <div className="fsvr-lab__review-label">Support / premise</div>
            {supports.map((part) => (
              <div key={part.id} className="fsvr-lab__review-quote">{stripIndicatorMarkup(part.text)}</div>
            ))}
          </div>
        ) : null}
        {opposings.length ? (
          <div>
            <div className="fsvr-lab__review-label">Opposing viewpoint</div>
            {opposings.map((part) => (
              <div key={part.id} className="fsvr-lab__review-quote">{stripIndicatorMarkup(part.text)}</div>
            ))}
          </div>
        ) : null}
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
        <div>
          <div className="fsvr-lab__review-label">Key takeaway</div>
          <p>{question.feedback}</p>
        </div>
      </div>
    );
  }

  function renderControls() {
    const followUpRole = firstSentenceVsRebuttalFollowUpRole(currentQuestion);
    const followUpTargetIds = firstSentenceVsRebuttalFollowUpIds(currentQuestion);
    const followUpPrompt =
      followUpRole === 'support'
        ? followUpTargetIds.length > 1
          ? 'Select every supporting claim'
          : 'Select the supporting claim'
        : 'Select the opposing viewpoint';

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
            {active.step === 3 &&
              `${followUpPrompt} in the stimulus above. ${active.selectedFollowUpIds.length} of ${followUpTargetIds.length} selected.`}
          </p>

          {feedback ? (
            <div className={`fsvr-lab__feedback fsvr-lab__feedback--${feedback.tone}`} role="status" aria-live="polite">
              <span className="fsvr-lab__feedback-icon">{feedback.tone === 'correct' ? '✓' : feedback.tone === 'warning' ? '!' : '✕'}</span>
              <div className="fsvr-lab__feedback-copy">{feedback.message}</div>
            </div>
          ) : null}

          {active.step === 2 ? (
            <div className="fsvr-lab__choice-grid">
              <button
                type="button"
                aria-pressed={active.selectedStructure === 'first'}
                className={`fsvr-lab__choice${active.selectedStructure === 'first' ? ' fsvr-lab__choice--selected' : ''}${feedbackTarget?.kind === 'choice' && feedbackTarget.id === 'first' ? ` fsvr-lab__choice--${feedbackTarget.tone === 'correct' ? 'success' : 'miss'}` : ''}`}
                onClick={() => handleStructureChoice('first')}
              >
                First sentence conclusion
              </button>
              <button
                type="button"
                aria-pressed={active.selectedStructure === 'rebuttal'}
                className={`fsvr-lab__choice${active.selectedStructure === 'rebuttal' ? ' fsvr-lab__choice--selected' : ''}${feedbackTarget?.kind === 'choice' && feedbackTarget.id === 'rebuttal' ? ` fsvr-lab__choice--${feedbackTarget.tone === 'correct' ? 'success' : 'miss'}` : ''}`}
                onClick={() => handleStructureChoice('rebuttal')}
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
                    {active.confirmedStep === 0 ? 'Next: choose the main conclusion' : 'Continue to conclusion'}
                  </button>
                  <button type="button" className="fsvr-lab__cta fsvr-lab__cta--secondary" onClick={() => void revealEverything()}>
                    Skip / Reveal All
                  </button>
                </>
              ) : null}
              {active.step === 1 ? (
                <button type="button" className="fsvr-lab__cta" aria-disabled={!active.selectedConclusionId} onClick={continueFromConclusion}>
                  {active.confirmedStep === 1 ? 'Next: classify the structure' : 'Continue to structure'}
                </button>
              ) : null}
              {active.step === 2 ? (
                <button type="button" className="fsvr-lab__cta" aria-disabled={!active.selectedStructure} onClick={continueFromStructure}>
                  {active.confirmedStep === 2 ? 'Next: find the supporting or opposing part' : 'Continue to role'}
                </button>
              ) : null}
              {active.step === 3 ? (
                <button type="button" className="fsvr-lab__cta" aria-disabled={active.selectedFollowUpIds.length === 0} onClick={() => void gradeQuestion()}>
                  Check dissection
                </button>
              ) : null}
            </div>
          ) : (
            <div className="fsvr-lab__summary">
              <div className="fsvr-lab__feedback fsvr-lab__feedback--correct" role="status" aria-live="polite">
                <span className="fsvr-lab__feedback-icon">✓</span>
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
              <details className="fsvr-lab__breakdown">
                <summary className="fsvr-lab__breakdown-summary">Full breakdown</summary>
                {renderBreakdown(currentQuestion)}
              </details>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderReview() {
    const reviewQuestion = reviewQuestionId != null ? orderedQuestions.find((question) => question.id === reviewQuestionId) : null;
    if (reviewQuestion) {
      const status = getQuestionStatus(ensureAttemptLog(session, reviewQuestion.id));
      return (
        <section className="fsvr-lab__review fsvr-lab__review--single">
          <div className="fsvr-lab__answer-key-head">
            <button type="button" className="fsvr-lab__nav-button" onClick={() => setReviewQuestionId(null)}>
              <ChevronLeft className="fsvr-lab__nav-icon" aria-hidden="true" />
              Answer key
            </button>
            <span className={`fsvr-lab__chip fsvr-lab__chip--${status}`}>{statusLabel(status)}</span>
          </div>
          <div>
            <div className="fsvr-lab__eyebrow">Answer key · Q{reviewQuestion.id}</div>
            <h1>{reviewQuestion.review.title}</h1>
          </div>
          <div className="fsvr-lab__stimulus fsvr-lab__stimulus--review">
            <div className="fsvr-lab__stimulus-text">{renderColorCodedStimulus(reviewQuestion)}</div>
          </div>
          <div className="fsvr-lab__legend">
            <span><b style={{ background: 'rgba(255,214,10,0.9)' }} />Conclusion</span>
            <span><b style={{ background: 'rgba(255,149,0,0.9)' }} />Support</span>
            <span><b style={{ background: 'rgba(255,59,48,0.9)' }} />Opposing View</span>
            <span><b style={{ background: 'rgba(199,199,204,0.95)' }} />Neutral</span>
          </div>
          {renderBreakdown(reviewQuestion)}
        </section>
      );
    }

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
    const nextAction = getNextAction('/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab');

    return (
      <section className="fsvr-lab__review">
        <div>
          <div className="fsvr-lab__eyebrow">Session review</div>
          <h1>How that went</h1>
          <p>Twenty arguments dissected. Here’s what your saved session looked like, step by step.</p>
        </div>

        <div className="fsvr-lab__cta-row">
          <button
            type="button"
            className="fsvr-lab__cta fsvr-lab__cta--secondary"
            onClick={() => {
              setSession(createEmptyFirstSentenceVsRebuttalSessionRecord());
              setActive(createActiveQuestionState());
              setFeedback(null);
              setFeedbackTarget(null);
              setExpanded([]);
              setReviewQuestionId(null);
            }}
          >
            <RotateCcw className="fsvr-lab__nav-icon" aria-hidden="true" />
            Run it again
          </button>
          {nextAction ? (
            <Link
              to={nextAction.route}
              state={nextAction.linkState}
              className="fsvr-lab__cta"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
            >
              Next: {nextAction.title}
              <ArrowRight className="fsvr-lab__nav-icon" aria-hidden="true" />
            </Link>
          ) : null}
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

        <div className="fsvr-lab__answer-key">
          <div className="fsvr-lab__review-label">Answer key — open any question for a color-coded review</div>
          <div className="fsvr-lab__answer-key-grid">
            {orderedQuestions.map((question) => {
              const status = getQuestionStatus(ensureAttemptLog(session, question.id));
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`fsvr-lab__answer-key-num fsvr-lab__answer-key-num--${status}`}
                  onClick={() => setReviewQuestionId(question.id)}
                  aria-label={`Review question ${question.id} (${statusLabel(status)})`}
                >
                  {question.id}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fsvr-lab__review-grid">
          {cards.map(({ question, log }) => {
            const status = getQuestionStatus(log);
            const isOpen = expanded.includes(question.id);
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
                {isOpen ? <div className="fsvr-lab__review-body">{renderBreakdown(question)}</div> : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  const canGoPrevious = session.currentQuestionIndex > 0 && !isSessionComplete;
  // Free navigation: the student may jump to the next argument anytime, finished or not.
  const canGoNext = !isSessionComplete;
  const nextLabel = session.currentQuestionIndex + 1 >= orderedQuestions.length ? 'Finish' : 'Next';

  return (
    <section className="fsvr-lab">
      <div className="fsvr-lab__shell" data-review={isSessionComplete ? 'true' : 'false'}>
        <div className="fsvr-lab__topbar">
          <span
            className={`fsvr-lab__save-status${saveStatus === 'saved' ? ' fsvr-lab__save-status--visible' : ''}`}
            role="status"
            aria-live="polite"
          >
            <span className="fsvr-lab__save-dot" aria-hidden="true" />
            Saved
          </span>
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
              </div>
            </header>

            <article className="fsvr-lab__workspace" key={currentQuestion.id}>
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
