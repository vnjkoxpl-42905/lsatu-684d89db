import * as React from 'react';
import { useLoadedPracticeTestAcknowledgment } from '@/hooks/useStudentWorkState';
import { useNavigate, useParams } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { questionBank } from '@/lib/questionLoader';
import { legLabel, practiceTestRaw, practiceTestScaled, hasOutdatedPt118Structure, type PracticeTestRun as Run } from '@/lib/practiceTest';
import { loadAccountPracticeTestRun } from '@/lib/practiceTestStore';
import { TimedWorkClient } from '@/lib/timedWorkClient';
import { loadPracticeTestReview, type PracticeTestLegReview } from '@/lib/practiceTestReview';
import TimedPracticeTestRun from './TimedPracticeTestRun';
import './testing-centre.css';
export function ScoreReport({ run, userId, onExit }: { run: Run; userId: string; onExit: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const reviewReturn = requestedReturn?.split("?")[0] === "/review/to-review" ? requestedReturn : null;
  const legValue = searchParams.get("leg");
  const legParam = Number(legValue);
  const targetLeg = legValue !== null && Number.isSafeInteger(legParam) && legParam >= 0 && legParam < run.legs.length
    ? legParam : null;
  const targetQuestion = searchParams.get("q");
  const { isLoading: questionBankLoading } = useQuestionBank();
  const permissions = useUserPermissions();
  const canOpenDrill = !permissions.loading && (permissions.is_admin || permissions.has_drill_access);
  const { correct, total } = practiceTestRaw(run);
  const scaled = practiceTestScaled(run);
  const unfinished = run.legs.filter((l) => !l.completedAt);
  const [reviews, setReviews] = React.useState<PracticeTestLegReview[] | null>(null);
  const [reviewError, setReviewError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setReviews(null);
    setReviewError(false);
    void loadPracticeTestReview(userId, run)
      .then((value) => { if (!cancelled) setReviews(value); })
      .catch(() => { if (!cancelled) setReviewError(true); });
    return () => { cancelled = true; };
  }, [run, userId]);

  React.useEffect(() => {
    if (!reviews || targetLeg === null || !targetQuestion) return;
    const target = document.getElementById(`pt-review-question-${targetLeg}-${encodeURIComponent(targetQuestion)}`);
    target?.scrollIntoView?.({ block: "start" });
  }, [reviews, targetLeg, targetQuestion]);

  return (
    <div className="testing-panel">
      <h2 className="testing-heading">Score report</h2>
      <div className="testing-score">
        <strong>{scaled}</strong>
        <span>
          estimated score · {correct} of {total} correct
        </span>
      </div>
      {/* Not fine print. This sentence is the difference between a number a
          student can act on and one they will quote at themselves for a week,
          and it sat at 12.5px and 2.10:1 under a 56px figure. */}
      <p className="testing-note testing-note-lead">
        Estimated from a typical modern LSAT curve, not PrepTest {run.pt}'s own
        conversion table. Treat it as a band, not a number.
      </p>

      <div className="testing-shape">
        {run.legs.map((leg, i) => (
          <div
            className="testing-shape-row"
            data-state={leg.completedAt ? "done" : undefined}
            key={`${leg.kind}-${leg.section}`}
          >
            <b>Section {i + 1}</b>
            <span>{legLabel(leg)}</span>
            <em>
              {leg.completedAt
                ? `${leg.correct ?? 0}/${leg.questionCount}`
                : "not finished"}
            </em>
          </div>
        ))}
      </div>

      {unfinished.length > 0 && (
        <p className="testing-note">
          {unfinished.length === 1 ? "One section was" : `${unfinished.length} sections were`}{" "}
          left unfinished, so those questions count against the raw total. The
          estimate is lower than a completed sitting would give you.
        </p>
      )}

      <section className="mt-8" aria-labelledby="exam-question-review">
        <h3 id="exam-question-review" className="text-lg font-semibold">Review each question</h3>
        <p className="testing-note">Open a section to see your first answer, the correct answer, and saved timing.</p>
        {!reviews && !reviewError && <p role="status" className="testing-note">Loading question results…</p>}
        {reviewError && <p role="alert" className="testing-note">Question results could not be loaded. Refresh to try again.</p>}
        {reviews?.map((review) => {
          const section = run.legs[review.legIndex];
          return <details key={review.legIndex} open={targetLeg === review.legIndex || undefined} className="my-3 rounded-lg border border-border bg-background p-4">
            <summary className="cursor-pointer font-semibold">Section {review.legIndex + 1} · {legLabel(section)} · {review.available ? `${review.questions.length} questions` : 'Question detail unavailable'}</summary>
            {!review.available ? <p className="testing-note">This sitting has no saved question detail for this section.</p> :
              <div className="mt-3 grid gap-2">
                {review.questions.map((question) => {
                  const lrContent = section.kind === 'lr' && !questionBankLoading
                    ? questionBank.getQuestion(question.id) : null;
                  return <details key={question.id} id={`pt-review-question-${review.legIndex}-${encodeURIComponent(question.id)}`} open={targetLeg === review.legIndex && targetQuestion === question.id || undefined} className="scroll-mt-6 rounded-md border border-border p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Question {question.number}{question.type ? ` · ${question.type}` : ''}</span>
                    <span className="text-sm">{question.selected === null ? 'Unanswered' : question.correct === true ? 'Correct' : question.correct === false ? 'Missed' : 'Answer saved'}</span>
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <span>Your first answer: <strong>{question.selected ?? 'No answer'}</strong></span>
                    <span>Correct answer: <strong>{question.correctAnswer}</strong></span>
                    {question.timeMs !== null && <span>Time: {Math.round(question.timeMs / 1000)} seconds</span>}
                    {question.flagged === true && <span>Flagged during the section</span>}
                    {question.blindReviewAnswer && <span>Blind review answer: <strong>{question.blindReviewAnswer}</strong></span>}
                  </div>
                  {(lrContent || question.rcContent) && <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                    {lrContent?.stimulus && <p className="whitespace-pre-wrap leading-relaxed">{lrContent.stimulus}</p>}
                    {question.rcContent && <p className="whitespace-pre-wrap leading-relaxed">{question.rcContent.passage}</p>}
                    <p className="font-medium whitespace-pre-wrap">{lrContent?.questionStem ?? question.rcContent?.prompt}</p>
                    <ol className="space-y-2" aria-label={`Question ${question.number} answer choices`}>
                      {(lrContent
                        ? Object.entries(lrContent.answerChoices).map(([letter, text]) => ({ letter, text }))
                        : question.rcContent?.choices ?? []
                      ).map(({ letter, text }) => <li key={letter} className="flex gap-2">
                        <strong>{letter}.</strong><span className="whitespace-pre-wrap">{text}</span>
                      </li>)}
                    </ol>
                  </div>}
                  {canOpenDrill && <a className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline" href={question.href}>
                    {section.kind === 'lr' ? 'Practice this question' : 'Review in RC player'}
                  </a>}
                  {!lrContent && !question.rcContent && !questionBankLoading && <p className="mt-3 text-sm text-muted-foreground">Question text is unavailable for this saved result.</p>}
                </details>})}
              </div>}
          </details>;
        })}
      </section>

      <div className="testing-actions">
        <Button onClick={() => reviewReturn ? navigate(reviewReturn) : onExit()}>{reviewReturn ? "Back to Review" : "Back to Practice Exams"}</Button>
      </div>
    </div>
  );
}


/** Dispatch before any old runner effect mounts. Legacy sittings are read-only. */
export default function PracticeTestRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const { user } = useAuth();
  const ownerId = user?.id;
  const navigate = useNavigate();
  const [run, setRun] = React.useState<Run | null>();
  const [protectedRun, setProtectedRun] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [revision, reload] = React.useReducer(n => n + 1, 0);
  useLoadedPracticeTestAcknowledgment(run?.pt,!!run && !protectedRun && !error,ownerId);
  React.useEffect(() => {
    let active = true;
    setRun(undefined); setProtectedRun(false); setError(null);
    if (!ownerId || !runId) { setRun(null); return; }
    void (async () => {
      // An unacknowledged create may have no account row yet. Its retained UUID is the recovery door.
      const pending = new TimedWorkClient(ownerId, runId).readPending();
      if (pending) { if (active) setProtectedRun(true); return; }
      const loaded = await loadAccountPracticeTestRun(ownerId, runId);
      if (active) { setProtectedRun(loaded?.timedContractVersion === 1); setRun(loaded); }
    })().catch(e => { if (active) { setError(e instanceof Error ? e.message : 'Could not load this exam.'); setRun(null); } });
    return () => { active = false; };
  }, [ownerId, runId, revision]);
  if (protectedRun && user && runId) return <TimedPracticeTestRun key={`${user.id}:${runId}`} ownerId={user.id} runId={runId} />;
  if (run === undefined) return <p role="status">Loading your practice test…</p>;
  if (run?.status === 'complete' && run.timedContractVersion == null && !hasOutdatedPt118Structure(run)) return <ScoreReport run={run} userId={user!.id} onExit={() => navigate('/testing')} />;
  return <><h1 className="classroom-title">{run ? `Practice Test ${run.pt}` : 'Practice test unavailable'}</h1>
    <p className="testing-lede" role={error ? 'alert' : undefined}>{error ?? (run ? 'This earlier sitting remains saved. Start a new practice test to use the account-backed clock and section saves.' : 'This exam was not found in your account.')}</p>
    {error && <Button onClick={reload}>Retry loading account</Button>}
    <Button onClick={() => navigate('/testing')}>Back to Practice Exams</Button></>;
}
