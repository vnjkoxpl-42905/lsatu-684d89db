import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCourseStep } from '../courseProgress';
import { DrillDemo } from './DrillDemo';
import './drill-one.css';

export type DrillOneQuestion = {
  rule: string;
  contextLabel?: string;
  prompt: string;
  options: string[];
  correct: number;
  feedback: string[];
  conditions?: [string, string];
};

<<<<<<< HEAD
type Answer = { selected: number | null; checked: boolean; first: number | null };
/** A finished or abandoned run kept in the saved record when the student starts over. */
export type PastRun = { order: number; answers: Answer[]; seenResults: boolean; endedAt: string };
const blank = (count: number): Answer[] => Array.from({ length: count }, () => ({ selected: null, checked: false, first: null }));
||||||| 64792cc5
type Answer = { selected: number | null; checked: boolean; first: number | null };
=======
type Answer = { selected: number | null; checked: boolean; first: number | null; misses?: number; shown?: boolean };
type RoundResult = { firstCorrect: number; total: number; assisted: number };
const blankAnswer = (): Answer => ({ selected: null, checked: false, first: null });
const fingerprint = (question: DrillOneQuestion) => JSON.stringify(question);
const resolvedAnswer = (answer: Answer, question: DrillOneQuestion) => answer.shown === true || answer.checked && answer.selected === question.correct;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13

/** A decorative paper sculpture. No condition or inference is encoded in its shape. */
function FoldedPaper() {
  return <div className="d1-sculpture" aria-hidden="true"><div className="d1-sculpture-orbit"/><div className="d1-fold d1-fold-back"/><div className="d1-fold d1-fold-middle"/><div className="d1-fold d1-fold-front"><span>01</span></div><div className="d1-sculpture-shadow"/></div>;
}

export function DrillOneEntry({ startUrl, lessonsUrl }: { startUrl: string; lessonsUrl: string }) {
  return <div className="d1-entry">
    <Link className="d1-back" to={lessonsUrl}><ArrowLeft size={16}/>Back to lessons</Link>
    <div className="d1-entry-grid">
      <header data-course-heading className="d1-entry-title"><p className="d1-eyebrow">Conditional reasoning</p><h1>Spot the <em>condition</em></h1><FoldedPaper/></header>
      <section className="d1-entry-instructions" aria-label="Practice instructions"><span className="d1-eyebrow">Your task</span><h2>Decide what the information proves.</h2>
        <ol><li><span>01</span><p>Start with rules and facts. Decide what a rule proves on its own, what a fact adds, and test a claim against a possible case.</p></li><li><span>02</span><p>Recall what sufficient and necessary mean. Read the arrow and decide which condition belongs on each side.</p></li><li><span>03</span><p>Find the indicator words and the complete conditions they introduce. Check each answer. If it isn't right, read the hint and try again.</p></li></ol>
        <DrillDemo drillId="foundation-practice"/>
        <Link className="d1-primary" to={startUrl}>Start practice<ArrowRight size={18}/></Link>
      </section>
    </div>
  </div>;
}

/**
 * Saved Spot the condition state. Answers are stored by question position, so
 * the saved `order` version must match. State saved under an earlier order is
 * moved to the current positions with `legacyOrder` (current index -> saved
 * index) instead of being read against the wrong questions; anything else is
 * ignored rather than mis-mapped.
 */
<<<<<<< HEAD
function pastRuns(value: unknown): PastRun[] {
  return Array.isArray(value) ? keepRuns(value.filter((run): run is PastRun => !!run && typeof run === 'object' && Array.isArray((run as PastRun).answers))) : [];
}
/** Abandoned runs kept besides every completed one. */
const ABANDONED_RUNS_KEPT = 10;
const completedRun = (run: PastRun) => run.seenResults || run.answers.every(answer => answer?.first !== null && answer?.first !== undefined);
/**
 * A completed run is never evicted. Only runs abandoned partway through are
 * capped, keeping the most recent ones, and the original order is kept.
 */
export function keepRuns(runs: PastRun[]): PastRun[] {
  const abandoned = runs.filter(run => !completedRun(run));
  const dropped = new Set(abandoned.slice(0, Math.max(0, abandoned.length - ABANDONED_RUNS_KEPT)));
  return runs.filter(run => !dropped.has(run));
}
function restoreDrillOne(state: unknown, count: number, order: number, legacyOrder?: Record<number, number[]>): { current: number; answers: Answer[]; finished: boolean; seenResults: boolean; history: PastRun[] } | null {
  const data = state as { order?: unknown; current?: unknown; answers?: unknown; finished?: unknown; seenResults?: unknown; history?: unknown } | undefined;
||||||| 64792cc5
function restoreDrillOne(state: unknown, count: number, order: number, legacyOrder?: Record<number, number[]>): { current: number; answers: Answer[]; finished: boolean; seenResults: boolean } | null {
  const data = state as { order?: unknown; current?: unknown; answers?: unknown; finished?: unknown; seenResults?: unknown } | undefined;
=======
function restoreDrillOne(state: unknown, questions: DrillOneQuestion[], order: number, legacyOrder?: Record<number, number[]>): { current: number; answers: Answer[]; finished: boolean; seenResults: boolean; history: RoundResult[] } | null {
  const count = questions.length;
  const data = state as { order?: unknown; current?: unknown; answers?: unknown; finished?: unknown; seenResults?: unknown; fingerprints?: unknown; history?: unknown } | undefined;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  if (!data || !Array.isArray(data.answers) || data.answers.length !== count) return null;
  const history = pastRuns(data.history);
  const index = (value: unknown) => value === null || (Number.isInteger(value) && (value as number) >= 0);
  if (!data.answers.every(a => a && typeof a === 'object' && index(a.selected) && index(a.first) && typeof a.checked === 'boolean' && (a.misses === undefined || Number.isInteger(a.misses) && a.misses >= 0) && (a.shown === undefined || typeof a.shown === 'boolean'))) return null;
  const savedOrder = Number.isInteger(data.order) ? data.order as number : 1;
  const saved = data.answers as Answer[];
  const savedCurrent = Number.isInteger(data.current) && (data.current as number) >= 0 && (data.current as number) < count ? data.current as number : 0;
<<<<<<< HEAD
  if (savedOrder === order) return { current: savedCurrent, answers: saved, finished: data.finished === true, seenResults: data.seenResults === true, history };
  const map = legacyOrder?.[savedOrder];
||||||| 64792cc5
  if (savedOrder === order) return { current: savedCurrent, answers: saved, finished: data.finished === true, seenResults: data.seenResults === true };
  const map = legacyOrder?.[savedOrder];
=======
  const map = savedOrder === order ? saved.map((_, position) => position) : legacyOrder?.[savedOrder];
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  if (!map || map.length !== count || new Set(map).size !== count || map.some(position => !Number.isInteger(position) || position < 0 || position >= count)) return null;
<<<<<<< HEAD
  return { current: Math.max(0, map.indexOf(savedCurrent)), answers: map.map(position => saved[position]), finished: data.finished === true, seenResults: data.seenResults === true, history };
||||||| 64792cc5
  return { current: Math.max(0, map.indexOf(savedCurrent)), answers: map.map(position => saved[position]), finished: data.finished === true, seenResults: data.seenResults === true };
=======
  const answers = map.map((position, currentIndex) => {
    const answer = saved[position];
    if (answer.selected !== null && answer.selected >= questions[currentIndex].options.length || answer.first !== null && answer.first >= questions[currentIndex].options.length) return blankAnswer();
    if (Array.isArray(data.fingerprints) && data.fingerprints[position] !== fingerprint(questions[currentIndex])) return blankAnswer();
    return answer;
  });
  const complete = answers.every((answer, index) => resolvedAnswer(answer, questions[index]));
  const history = Array.isArray(data.history) ? data.history.filter((round): round is RoundResult => !!round && Number.isInteger(round.firstCorrect) && round.firstCorrect >= 0 && Number.isInteger(round.total) && round.total >= round.firstCorrect && Number.isInteger(round.assisted) && round.assisted >= 0 && round.assisted <= round.total) : [];
  return { current: Math.max(0, map.indexOf(savedCurrent)), answers, finished: complete && data.finished === true, seenResults: complete && data.seenResults === true, history };
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
}

export function DrillOneExperience({ questions, order = 1, legacyOrder }: { questions: DrillOneQuestion[]; order?: number; legacyOrder?: Record<number, number[]> }) {
  const questionSignature = JSON.stringify(questions);
  const course = useCourseStep('foundation-practice');
  const record = course?.record;
<<<<<<< HEAD
  const savedState = course?.saved?.state;
  const [restored] = useState(() => restoreDrillOne(savedState, questions.length, order, legacyOrder));
||||||| 64792cc5
  const [restored] = useState(() => restoreDrillOne(course?.saved?.state, questions.length, order, legacyOrder));
=======
  const [restored] = useState(() => restoreDrillOne(course?.saved?.state, questions, order, legacyOrder));
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const [current, setCurrent] = useState(restored?.current ?? 0);
<<<<<<< HEAD
  const [answers, setAnswers] = useState<Answer[]>(() => restored?.answers ?? blank(questions.length));
||||||| 64792cc5
  const [answers, setAnswers] = useState<Answer[]>(() => restored?.answers ?? questions.map(() => ({ selected: null, checked: false, first: null })));
=======
  const [answers, setAnswers] = useState<Answer[]>(() => restored?.answers ?? questions.map(blankAnswer));
  const [history, setHistory] = useState<RoundResult[]>(restored?.history ?? []);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const [finished, setFinished] = useState(restored?.finished ?? false);
  const [seenResults, setSeenResults] = useState(restored?.seenResults ?? false);
  const [history, setHistory] = useState<PastRun[]>(restored?.history ?? []);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const restartButton = useRef<HTMLButtonElement>(null);
  const confirmHeading = useRef<HTMLHeadingElement>(null);
  // The account can finish loading after the drill opens. Until the student does
  // something here, take the saved run instead of starting them from question 1.
  const touched = useRef(false);
  const written = useRef<unknown>(savedState);
  useEffect(() => {
    if (touched.current || !savedState || savedState === written.current) return;
    written.current = savedState;
    const late = restoreDrillOne(savedState, questions.length, order, legacyOrder);
    if (!late) return;
    setCurrent(late.current); setAnswers(late.answers); setFinished(late.finished); setSeenResults(late.seenResults); setHistory(late.history);
  }, [savedState, questions.length, order, legacyOrder]);
  const [focusOnArrival, setFocusOnArrival] = useState(false);
  const [focusAnswer, setFocusAnswer] = useState<'feedback' | 'option' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const id = useId();
  const question = questions[current];
  const answer = answers[current];
  // A wrong answer gets a hint for the chosen option only; nothing reveals the key until it is answered correctly.
  const solved = answer.checked && answer.selected === question.correct;
  const resolved = solved || answer.shown === true;
  const answered = answers.filter((item, index) => resolvedAnswer(item, questions[index])).length;
  const completion = Math.round(answered / questions.length * 100);
  const correctFirst = answers.filter((item, index) => item.first === questions[index].correct).length;
  useEffect(() => {
<<<<<<< HEAD
    const state = { order, current, answers, finished, seenResults, ...(history.length ? { history } : {}) };
    written.current = state;
    record?.({ state, done: answers.filter(item => item.first !== null).length, total: questions.length, ...(seenResults ? { status: 'done' as const } : {}) });
  }, [record, order, current, answers, finished, seenResults, history, questions.length]);
  useEffect(() => { if (confirmingRestart) confirmHeading.current?.focus({ preventScroll: true }); }, [confirmingRestart]);
||||||| 64792cc5
    record?.({ state: { order, current, answers, finished, seenResults }, done: answers.filter(item => item.first !== null).length, total: questions.length, ...(seenResults ? { status: 'done' as const } : {}) });
  }, [record, order, current, answers, finished, seenResults, questions.length]);
=======
    record?.({ state: { order, fingerprints: questions.map(fingerprint), current, answers, finished, seenResults, history }, done: answered, total: questions.length, ...(seenResults && answered === questions.length ? { status: 'done' as const } : {}) });
  }, [record, order, current, answers, finished, seenResults, history, questionSignature, answered]);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const missed = answers.flatMap((item, index) => item.first !== null && item.first !== questions[index].correct ? [index] : []);

  useEffect(() => {
    if (!focusOnArrival) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    setFocusOnArrival(false);
  }, [current, finished, focusOnArrival]);

  useEffect(() => {
    if (focusAnswer === 'feedback') feedbackHeading.current?.focus({ preventScroll: true });
    if (focusAnswer === 'option') firstOption.current?.focus({ preventScroll: true });
    if (focusAnswer) setFocusAnswer(null);
  }, [focusAnswer]);

  function updateAnswer(update: Partial<Answer>) {
    touched.current = true;
    setAnswers(previous => previous.map((item, index) => index === current ? { ...item, ...update } : item));
  }
  function go(index: number) { touched.current = true; setCurrent(index); setFinished(false); setFocusOnArrival(true); }
  function checkAnswer() {
    if (answer.selected === null) return;
    updateAnswer({ checked: true, first: answer.first ?? answer.selected, misses: (answer.misses ?? 0) + (answer.selected === question.correct ? 0 : 1) });
    setFocusAnswer('feedback');
  }
<<<<<<< HEAD
  function showResults() { touched.current = true; setSeenResults(true); setFinished(true); setFocusOnArrival(true); }
  /** Clears this drill's answers for a fresh attempt. The finished run stays in the saved record, and the course keeps the drill marked done. */
  function startOver() {
    touched.current = true;
    if (answers.some(item => item.first !== null)) setHistory(previous => keepRuns([...previous, { order, answers, seenResults, endedAt: new Date().toISOString() }]));
    setAnswers(blank(questions.length)); setSeenResults(false); setConfirmingRestart(false);
    go(0);
  }
  function cancelRestart() { setConfirmingRestart(false); requestAnimationFrame(() => restartButton.current?.focus()); }
||||||| 64792cc5
  function showResults() { setSeenResults(true); setFinished(true); setFocusOnArrival(true); }
=======
  function showResults() { if (answered !== questions.length) return; setSeenResults(true); setFinished(true); setFocusOnArrival(true); }
  function restart() {
    setHistory(previous => [...previous, { firstCorrect: correctFirst, total: questions.length, assisted: answers.filter(item => item.shown).length }]);
    setAnswers(questions.map(blankAnswer)); setCurrent(0); setFinished(false); setSeenResults(false); setFocusOnArrival(true);
  }
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  function tryAgain() {
    updateAnswer({ selected: null, checked: false });
    setFocusAnswer('option');
  }

  return <section className="d1-experience" aria-label="Spot the condition questions">
    <div className="d1-progress-summary">
      <div><span className="d1-eyebrow">Your progress</span><p>{answered === 0 ? 'Ready to begin' : answered === questions.length ? 'Practice complete' : 'Keep going'}</p></div>
      <div className="d1-progress-value" aria-hidden="true"><strong>{completion}<span>%</span></strong><span>complete</span></div>
    </div>
    <div className="d1-progress-track" role="progressbar" aria-label="Questions completed" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={questions.length} aria-valuetext={`${completion}% complete. ${answered} of ${questions.length} questions solved or reviewed with help.`}><span style={{ width: `${answered / questions.length * 100}%` }}/></div>
    {finished ? <div className="d1-completion">
      <div className="d1-completion-mark" aria-hidden="true"><Check size={32}/></div>
      <p className="d1-eyebrow">You worked through every question</p><h2 ref={heading} tabIndex={-1}>Spot the condition complete.</h2>
      <p className="d1-result"><strong>{correctFirst}</strong> of {questions.length} correct on your first attempt.</p>
      {answers.some(item => item.shown) && <p>{answers.filter(item => item.shown).length} reviewed with Show me.</p>}
      {history.length > 0 && <p>Earlier rounds: {history.map((round, index) => `Round ${index + 1}: ${round.firstCorrect} of ${round.total} correct first time, ${round.assisted} with Show me`).join('; ')}.</p>}
      <button type="button" className="d1-retry" onClick={restart}><RotateCcw size={15}/>Start a new round</button>
      <p className="d1-completion-copy">{missed.length ? 'Return to the questions you missed and compare the explanation with your original reasoning.' : 'Every first answer was correct. You can review any question before moving on.'}</p>
      <div className="d1-review-list" aria-label="Review questions">{questions.map((item, index) => <button type="button" key={index} onClick={() => go(index)}><span>Question {index + 1}</span><span>{answers[index].first === item.correct ? 'Correct first attempt' : 'Review reasoning'}<ArrowRight size={16}/></span></button>)}</div>
      <div className="d1-restart">{confirmingRestart ? <div className="d1-restart-confirm" role="group" aria-labelledby={`${id}-restart`}>
        <h3 id={`${id}-restart`} ref={confirmHeading} tabIndex={-1}>Start Spot the condition again?</h3>
        <p>This clears your answers to all {questions.length} questions so you can try them fresh. The drill stays marked as done.</p>
        <div className="d1-restart-actions"><button type="button" className="d1-primary" onClick={startOver}>Yes, start over</button><button type="button" className="d1-retry" onClick={cancelRestart}>Keep my answers</button></div>
      </div> : <button ref={restartButton} type="button" className="d1-retry" onClick={() => setConfirmingRestart(true)}><RotateCcw size={15}/>Start over</button>}</div>
    </div> : <div key={current} className="d1-question-scene" data-practice-task={current + 1}>
      <div className="d1-rule-panel">
        <div className="d1-rule-top"><span className="d1-eyebrow">{question.contextLabel ?? 'Given rule'}</span><span className="d1-rule-number" aria-hidden="true">{String(current + 1).padStart(2, '0')}</span></div>
        <blockquote>{question.rule}</blockquote>
        {resolved && question.conditions && <figure className="d1-relation"><figcaption>Read the rule left to right</figcaption><div className="d1-relation-pair"><div><span>Sufficient</span><strong>{question.conditions[0]}</strong></div><span className="d1-relation-arrow" aria-hidden="true">→</span><span className="d1-sr-only">requires</span><div><span>Necessary</span><strong>{question.conditions[1]}</strong></div></div><p>If the left condition is true, the right condition must be true.</p></figure>}
        <div className="d1-rule-foot" aria-hidden="true"><span/><span/><span/></div>
      </div>
      <div className="d1-question-body">
        <p className="d1-question-position">Question {current + 1} of {questions.length}</p>
        <h2 id={`${id}-question`} ref={heading} tabIndex={-1}>{question.prompt}</h2>
        <div className="d1-options" role="group" aria-labelledby={`${id}-question`}>{question.options.map((option, index) => {
          const selected = answer.selected === index;
          return <button ref={index === 0 ? firstOption : undefined} type="button" key={option} className="d1-option" aria-pressed={selected} disabled={answer.checked || answer.shown} data-selected={selected} data-correct={solved && selected} data-incorrect={answer.checked && selected && !solved} onClick={() => updateAnswer({ selected: index })}><span className="d1-option-letter" aria-hidden="true">{solved && selected ? <Check size={17}/> : String.fromCharCode(65 + index)}</span><span>{option}</span>{solved && selected && <span className="d1-sr-only">Correct answer</span>}</button>;
        })}</div>
        <div className="d1-feedback-region">{answer.checked && answer.selected !== null && <div className="d1-feedback" data-correct={answer.selected === question.correct}><h3 ref={feedbackHeading} tabIndex={-1} aria-describedby={`${id}-explanation${solved && question.conditions ? ` ${id}-readback` : ''}`} className="d1-feedback-title"><span className="d1-feedback-dot"/>{solved ? 'Correct.' : 'Not quite.'}</h3><p id={`${id}-explanation`}>{question.feedback[answer.selected]}</p>{solved && question.conditions && <p id={`${id}-readback`} className="d1-sr-only">The diagram places “{question.conditions[0]}” on the left as the sufficient condition and “{question.conditions[1]}” on the right as the necessary condition. If the left condition is true, the right condition must be true.</p>}</div>}</div>
        {answer.shown && <div className="d1-feedback"><h3 ref={feedbackHeading} tabIndex={-1}>Worked explanation</h3><p>Answer: {question.options[question.correct]}</p><p>{question.feedback[question.correct]}</p><p>This question was reviewed with help. Your first answer stays recorded.</p></div>}
        <div className="d1-answer-actions">{answer.checked ? (!resolved && <button type="button" className="d1-retry" onClick={tryAgain}><RotateCcw size={15}/>Try again</button>) : !answer.shown && <><p>Select one answer.</p><button type="button" className="d1-primary" disabled={answer.selected === null} onClick={checkAnswer}>Check answer<ArrowRight size={17}/></button></>}{!resolved && (answer.misses ?? 0) >= 2 && <button type="button" className="d1-retry" onClick={() => { updateAnswer({ shown: true }); setFocusAnswer('feedback'); }}>Show me</button>}{seenResults && <button type="button" className={`d1-retry${answer.checked ? '' : ' d1-return-results'}`} onClick={showResults}>Back to results<ArrowRight size={15}/></button>}</div>
      </div>
    </div>}
    {!finished && <nav className="d1-navigation" aria-label="Question navigation"><button type="button" className="d1-previous" disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous question</button><button type="button" className="d1-next" disabled={!resolved} onClick={() => { if (current === questions.length - 1) showResults(); else go(current + 1); }}>{current === questions.length - 1 ? 'See results' : 'Next question'}<ArrowRight size={17}/></button></nav>}
  </section>;
}
