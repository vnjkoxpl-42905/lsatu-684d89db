import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Home, Lightbulb, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';


import { DrillVerdict } from '@/bootcamps/main-conclusion/components/DrillVerdict';
import { getNextAction } from '@/bootcamps/main-conclusion/content/introToLrPath';
import {
  CONCLUSION_TYPE_META,
  conclusionTypeMeta,
  ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS,
  type ConclusionType,
  type ConclusionTypeQuestion,
} from '@/bootcamps/main-conclusion/data/reference-drills/conclusionTypeQuestions';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

import './conclusionTypeLab.css';
import { useNativeLabSave } from '@/bootcamps/main-conclusion/hooks/useNativeLabSave';

type CTStatus = 'clean' | 'missed';

interface CTAttempt {
  id: string;
  type: ConclusionType;
  firstPick: ConclusionType | null;
  status: CTStatus;
}

const QUESTIONS = ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS;
const DRILL_ROUTE = '/bootcamp/intro-to-lr/drills/conclusion-type-lab';
const CONCLUSION_TYPE_BOARD: Array<{
  type: ConclusionType;
  family: string;
  className?: string;
}> = [
  { type: 'recommendation', family: 'Action claim', className: 'ctlab__option--recommendation' },
  { type: 'causal', family: 'Explanation claim', className: 'ctlab__option--causal' },
  { type: 'prediction', family: 'Future claim', className: 'ctlab__option--prediction' },
  { type: 'judgment', family: 'Evaluation claim', className: 'ctlab__option--judgment' },
  { type: 'rebuttal', family: 'Pushback claim', className: 'ctlab__option--rebuttal ctlab__option--wide' },
];

function questionNumber(question: ConclusionTypeQuestion) {
  return QUESTIONS.findIndex((item) => item.id === question.id) + 1;
}

function attemptFor(question: ConclusionTypeQuestion, attempts: Record<string, CTAttempt>): CTAttempt | null {
  return attempts[question.id] ?? null;
}

function typeBreakdown(attempts: Record<string, CTAttempt>) {
  return CONCLUSION_TYPE_META.map((meta) => {
    const questions = QUESTIONS.filter((question) => question.answer === meta.value);
    const clean = questions.filter((question) => attempts[question.id]?.status === 'clean').length;
    const missed = questions.filter((question) => attempts[question.id]?.status === 'missed').length;
    return { meta, total: questions.length, clean, missed };
  });
}

export function ConclusionTypeLab() {
  const { user } = useAuth();
  return <OwnedConclusionTypeLab key={user?.id ?? 'signed-out'} ownerId={user?.id} />;
}
function OwnedConclusionTypeLab({ ownerId }: { ownerId?: string }) {
  const { markDrillComplete, loadError, retryLoad } = useModuleProgress(ownerId);
  const accountSave = useNativeLabSave('conclusion-type', ownerId);
  const [completionError, setCompletionError] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<ConclusionType | null>(null);
  const [attempts, setAttempts] = useState<Record<string, CTAttempt>>({});
  const [finished, setFinished] = useState(false);
  const [reviewQuestionId, setReviewQuestionId] = useState<string | null>(null);
  const teachRef = useRef<HTMLDivElement>(null);

  const question = QUESTIONS[index];
  const attempt = attemptFor(question, attempts);
  const submitted = Boolean(attempt);
  const correctCount = Object.values(attempts).filter((item) => item.status === 'clean').length;
  const answeredCount = Object.keys(attempts).length;
  const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);
  const isLast = index === QUESTIONS.length - 1;

  useEffect(() => {
    setPicked(attempt?.firstPick ?? null);
  }, [attempt?.firstPick, question.id]);

  useEffect(() => {
    if (submitted && teachRef.current) teachRef.current.focus();
  }, [submitted, question.id]);

  const breakdown = useMemo(() => typeBreakdown(attempts), [attempts]);

  async function submit() {
    if (!picked || submitted || accountSave.saving) return;
    if (!await accountSave.save(question.id, picked, picked === question.answer)) return;
    setAttempts((current) => ({
      ...current,
      [question.id]: {
        id: question.id,
        type: question.answer,
        firstPick: picked,
        status: picked === question.answer ? 'clean' : 'missed',
      },
    }));
  }

  async function advance() {
    if (!submitted || accountSave.blocked || completing || !accountSave.isCurrent()) return;
    if (isLast) {
      setCompleting(true); setCompletionError(false);
      try { await markDrillComplete?.('MC-DRL-CT'); if (accountSave.isCurrent()) setFinished(true); }
      catch { if (accountSave.isCurrent()) setCompletionError(true); }
      finally { setCompleting(false); }
      return;
    }
    setIndex((current) => current + 1);
  }

  function previous() {
    if (accountSave.blocked || completing) return;
    setIndex((current) => Math.max(0, current - 1));
  }

  function restart() {
    if (!accountSave.restart()) return;
    setIndex(0);
    setPicked(null);
    setAttempts({});
    setFinished(false);
    setReviewQuestionId(null);
  }

  function openReviewQuestion(id: string) {
    setReviewQuestionId(id);
  }

  if (loadError) return <div role="alert"><p>{loadError}</p><button className="min-h-11 underline" onClick={retryLoad}>Try again</button></div>;
  if (finished) {
    return (
      <section className="ctlab">
        <div className="ctlab__shell ctlab__shell--review">
          <TopBar />
          {reviewQuestionId ? (
            <QuestionReview questionId={reviewQuestionId} attempts={attempts} onBack={() => setReviewQuestionId(null)} />
          ) : (
            <SessionReview
              attempts={attempts}
              correctCount={correctCount}
              breakdown={breakdown}
              onRerun={restart}
              onOpenQuestion={openReviewQuestion}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="ctlab">
      <div className="ctlab__shell">
        <TopBar />

        <header className="ctlab__header">
          <div className="ctlab__header-row">
            <p className="ctlab__eyebrow">Conclusion Type Lab</p>
            <p className="ctlab__counter">
              {index + 1} / {QUESTIONS.length} · {correctCount} right
            </p>
          </div>
          <h1>Name the kind of claim the author is making</h1>
          <div className="ctlab__progress" aria-label={`${progressPercent}% complete`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </header>

        <article className="ctlab__question" key={question.id}>
          <StimulusCard question={question} />

          <section className="ctlab__type-board" aria-labelledby="ctlab-type-board-title">
            <div className="ctlab__type-board-header">
              <p className="ctlab__eyebrow" id="ctlab-type-board-title">
                Choose the claim family
              </p>
            </div>

            <div className="ctlab__options" role="radiogroup" aria-labelledby="ctlab-type-board-title">
              {CONCLUSION_TYPE_BOARD.map(({ type, family, className }) => {
                const meta = conclusionTypeMeta(type);
                const isPicked = picked === meta.value;
                const showCorrect = submitted && meta.value === question.answer;
                const showWrongPick = submitted && attempt?.firstPick === meta.value && meta.value !== question.answer;
                return (
                  <button
                    key={meta.value}
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={submitted || accountSave.blocked}
                    onClick={() => setPicked((current) => (current === meta.value ? null : meta.value))}
                    className={cn(
                      'ctlab__option',
                      className,
                      isPicked && !submitted && 'ctlab__option--selected',
                      showCorrect && 'ctlab__option--correct',
                      showWrongPick && 'ctlab__option--wrong',
                      submitted && !showCorrect && !showWrongPick && 'ctlab__option--dimmed',
                    )}
                  >
                    <span className="ctlab__option-copy">
                      <span className="ctlab__option-family">{family}</span>
                      <strong>{meta.label}</strong>
                      <small>{meta.blurb}</small>
                      <span className="ctlab__option-weakness">{meta.weaknessSignature}</span>
                    </span>
                    {showCorrect ? <CheckCircle2 aria-label="Correct type" /> : null}
                    {showWrongPick ? <XCircle aria-label="Your first pick" /> : null}

                  </button>
                );
              })}
            </div>
          </section>

          {submitted && attempt ? <TeachBlock refEl={teachRef} question={question} attempt={attempt} /> : null}
          {accountSave.saving && <p role="status">Saving your answer…</p>}
          {accountSave.error && <div role="alert"><p>{accountSave.error}</p><button className="ctlab__button" onClick={() => void submit()}>Try saving again</button></div>}
          {completionError && <p role="alert">Completion could not be saved. Your saved answers remain available. Try finishing again.</p>}

          <footer className="ctlab__footer">
            <button type="button" className="ctlab__button ctlab__button--secondary" onClick={previous} disabled={index === 0 || accountSave.blocked || completing}>
              <ArrowLeft aria-hidden="true" />
              Previous
            </button>
            {!submitted ? (
              <button type="button" className="ctlab__button" onClick={submit} disabled={!picked || accountSave.blocked}>
                Reveal the type
              </button>
            ) : (
              <button type="button" className="ctlab__button" onClick={advance} disabled={accountSave.blocked || completing}>
                {isLast ? 'Finish drill' : 'Next question'}
                <ArrowRight aria-hidden="true" />
              </button>
            )}
          </footer>
        </article>
      </div>
    </section>
  );
}

function TopBar() {
  return (
    <div className="ctlab__topbar">
      <Link to={DRILL_ROUTE} className="ctlab__home">
        <Home aria-hidden="true" />
        Back to Drill Page
      </Link>
    </div>
  );
}

function StimulusCard({ question }: { question: ConclusionTypeQuestion }) {
  return (
    <section className="ctlab__stimulus">
      <p className="ctlab__eyebrow">Read first</p>
      <p className="ctlab__stimulus-text">{question.stimulus}</p>
      <div className="ctlab__conclusion">
        <p className="ctlab__eyebrow">The conclusion</p>
        <p>{question.conclusion}</p>
      </div>
    </section>
  );
}

const ENCOURAGEMENTS_CORRECT = [
  'Nice — keep that reflex going.',
  'Locked in. On to the next one.',
  'That is the pattern. Ride it.',
  'Clean read. Keep stacking them.',
];

const ENCOURAGEMENTS_MISS = [
  'Shake it off — one more read and it clicks.',
  'Close look this time. You have got this.',
  'No worries — this is exactly how the reflex builds.',
  'Reset, re-read the conclusion, keep moving.',
];

function pickEncouragement(pool: string[], seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

function TeachBlock({
  question,
  attempt,
  refEl,
}: {
  question: ConclusionTypeQuestion;
  attempt: CTAttempt;
  refEl: RefObject<HTMLDivElement>;
}) {
  const isCorrect = attempt.status === 'clean';
  const answerMeta = conclusionTypeMeta(question.answer);
  const pickedMeta = attempt.firstPick ? conclusionTypeMeta(attempt.firstPick) : null;
  const encouragement = pickEncouragement(
    isCorrect ? ENCOURAGEMENTS_CORRECT : ENCOURAGEMENTS_MISS,
    question.id,
  );

  useEffect(() => {
    if (!isCorrect) return;
    const end = Date.now() + 500;
    const colors = ['#2f9e64', '#c89f4d', '#6476c8', '#f6e2b6'];
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        startVelocity: 45,
        origin: { x: 0.15, y: 0.75 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        startVelocity: 45,
        origin: { x: 0.85, y: 0.75 },
        colors,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [isCorrect, question.id]);

  return (
    <div
      ref={refEl}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className={cn(
        'ctlab__teach',
        isCorrect ? 'ctlab__teach--correct' : 'ctlab__teach--wrong',
      )}
    >
      <div className={cn('ctlab__verdict', isCorrect ? 'ctlab__verdict--correct' : 'ctlab__verdict--wrong')}>
        <div className="ctlab__verdict-icon" aria-hidden="true">
          {isCorrect ? <CheckCircle2 /> : <XCircle />}
        </div>
        <div className="ctlab__verdict-copy">
          <p className="ctlab__verdict-headline">
            {isCorrect ? (
              <>
                <Sparkles aria-hidden="true" /> Correct — you named it!
              </>
            ) : (
              <>Not quite — this one is a {answerMeta.label}.</>
            )}
          </p>
          <p className="ctlab__verdict-sub">{encouragement}</p>
        </div>
      </div>

      {!isCorrect && pickedMeta ? (
        <div className="ctlab__hint">
          <div className="ctlab__hint-icon" aria-hidden="true">
            <Lightbulb />
          </div>
          <div>
            <p className="ctlab__eyebrow">Hint</p>
            <p>
              You picked <strong>{pickedMeta.label}</strong>, which {pickedMeta.blurb.toLowerCase()} Re-read the
              conclusion — it actually {answerMeta.blurb.toLowerCase()} That is the tell for a{' '}
              <strong>{answerMeta.label}</strong>.
            </p>
          </div>
        </div>
      ) : null}

      <p className="ctlab__teach-why">{question.whyType}</p>
      <div className="ctlab__weakness">
        <p className="ctlab__eyebrow">Predictable weakness</p>
        <p>{question.weakness}</p>
      </div>
    </div>
  );
}


function SessionReview({
  attempts,
  correctCount,
  breakdown,
  onRerun,
  onOpenQuestion,
}: {
  attempts: Record<string, CTAttempt>;
  correctCount: number;
  breakdown: ReturnType<typeof typeBreakdown>;
  onRerun: () => void;
  onOpenQuestion: (id: string) => void;
}) {
  const cleanPercent = Math.round((correctCount / QUESTIONS.length) * 100);
  const appeared = breakdown.filter((row) => row.total > 0);
  const strongest = [...appeared].sort((left, right) => left.missed - right.missed)[0];
  const weakest = [...appeared].sort((left, right) => right.missed - left.missed)[0];
  const noMisses = appeared.every(row => row.missed === 0);
  const verdictItems = QUESTIONS.map((question) => ({
    id: question.id,
    ok: attempts[question.id]?.status === 'clean',
    prompt: question.conclusion,
  }));

  const nextAction = getNextAction(DRILL_ROUTE);

  return (
    <section className="ctlab__review">
      <DrillVerdict
        label="Conclusion Type Lab"
        correct={correctCount}
        total={QUESTIONS.length}
        calibrationThreshold={0.8}
        calibratedLead="You can name the type on sight. Once you can name it, you already know the weakness to look for. That reflex is what carries into the harder question types."
        repeatLead="A few types are still slipping past you. Re-run the set and slow down on the ones you missed below, then name the predictable weakness each type carries."
        nextStep="Next: head back to the path and keep building toward the full Main Conclusion drill."
        items={verdictItems}
        onRerun={onRerun}
        nextActionRoute={nextAction?.route}
        nextActionLabel={nextAction ? `Next: ${nextAction.title}` : undefined}
        nextActionState={nextAction?.linkState}
      />

      <div className="ctlab__review-grid">
        <div className="ctlab__review-card">
          <p className="ctlab__review-label">Clean first-try</p>
          <div className="ctlab__kpi">
            <span>{correctCount}</span> / {QUESTIONS.length}
          </div>
          <div className="ctlab__progress">
            <span style={{ width: `${cleanPercent}%` }} />
          </div>
          <p>{cleanPercent}% solved cleanly.</p>
        </div>

        <div className="ctlab__review-card">
          <p className="ctlab__review-label">Where it slipped</p>
          <div className="ctlab__type-list">
            {breakdown.map(({ meta, clean, missed, total }) => (
              <div key={meta.value} className="ctlab__type-row">
                <div>
                  <strong>{meta.label}</strong>
                  <span>{meta.weaknessSignature}</span>
                </div>
                <p>
                  {missed} miss{missed === 1 ? '' : 'es'} · {clean}/{total} clean
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ctlab__callouts">
        <div className="ctlab__callout ctlab__callout--strong">
          <p className="ctlab__review-label">Strongest type</p>
          <p>{noMisses ? 'Every type in this sitting was solved cleanly.' : `${strongest?.meta.label ?? 'None'} cost you the fewest misses this set.`}</p>
        </div>
        <div className="ctlab__callout ctlab__callout--weak">
          <p className="ctlab__review-label">Start here</p>
          <p>{noMisses ? 'No missed types in this sitting. Continue along the path or use the answer key to explain your reasoning.' : `${weakest?.meta.label ?? 'None'} collected the most misses. Review that weakness signature first.`}</p>
        </div>
      </div>

      <div className="ctlab__answer-key">
        <p className="ctlab__review-label">Answer key</p>
        <div className="ctlab__answer-key-grid">
          {QUESTIONS.map((question) => {
            const status = attempts[question.id]?.status ?? 'missed';
            return (
              <button
                key={question.id}
                type="button"
                className={cn('ctlab__answer-cell', `ctlab__answer-cell--${status}`)}
                onClick={() => onOpenQuestion(question.id)}
                aria-label={`Review question ${questionNumber(question)} (${status})`}
              >
                {questionNumber(question)}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="ctlab__button ctlab__review-rerun" onClick={onRerun}>
        <RotateCcw aria-hidden="true" />
        Run it again
      </button>
    </section>
  );
}

function QuestionReview({
  questionId,
  attempts,
  onBack,
}: {
  questionId: string;
  attempts: Record<string, CTAttempt>;
  onBack: () => void;
}) {
  const question = QUESTIONS.find((item) => item.id === questionId) ?? QUESTIONS[0];
  const attempt = attempts[question.id];
  const answerMeta = conclusionTypeMeta(question.answer);

  return (
    <section className="ctlab__single-review">
      <button type="button" className="ctlab__back-button" onClick={onBack}>
        <ChevronLeft aria-hidden="true" />
        Answer key
      </button>
      <div>
        <p className="ctlab__eyebrow">Answer key · Q{questionNumber(question)}</p>
        <h1>{answerMeta.label}</h1>
      </div>
      <StimulusCard question={question} />
      <div className="ctlab__teach ctlab__teach--review">
        <p className={cn('ctlab__result', attempt?.status === 'clean' ? 'ctlab__result--correct' : 'ctlab__result--warning')}>
          {attempt?.status === 'clean' ? 'Clean first try' : `First pick: ${attempt?.firstPick ? conclusionTypeMeta(attempt.firstPick).label : 'No pick'}`}
        </p>
        <p>{question.whyType}</p>
        <div className="ctlab__weakness">
          <p className="ctlab__eyebrow">Predictable weakness</p>
          <p>{question.weakness}</p>
        </div>
      </div>
    </section>
  );
}
