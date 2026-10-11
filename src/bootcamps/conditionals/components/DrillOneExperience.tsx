import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import './drill-one.css';

export type DrillOneQuestion = {
  rule: string;
  prompt: string;
  options: string[];
  correct: number;
  feedback: string[];
  conditions?: [string, string];
};

type Answer = { selected: number | null; checked: boolean; first: number | null };

/** A decorative paper sculpture. No condition or inference is encoded in its shape. */
function FoldedPaper() {
  return <div className="d1-sculpture" aria-hidden="true"><div className="d1-sculpture-orbit"/><div className="d1-fold d1-fold-back"/><div className="d1-fold d1-fold-middle"/><div className="d1-fold d1-fold-front"><span>01</span></div><div className="d1-sculpture-shadow"/></div>;
}

export function DrillOneEntry({ startUrl, lessonsUrl }: { startUrl: string; lessonsUrl: string }) {
  return <div className="d1-entry">
    <Link className="d1-back" to={lessonsUrl}><ArrowLeft size={16}/>Back to lessons</Link>
    <div className="d1-entry-grid">
      <header data-course-heading className="d1-entry-title"><p className="d1-eyebrow">Conditional reasoning</p><h1>Drill <em>1</em></h1><FoldedPaper/></header>
      <section className="d1-entry-instructions" aria-label="Practice instructions"><span className="d1-eyebrow">Your task</span><h2>Decide what the information establishes.</h2>
        <ol><li><span>01</span><p>Identify which condition is sufficient and which is necessary.</p></li><li><span>02</span><p>Use the facts given to decide what follows. In the final question, test a proposed conclusion against a possible case.</p></li><li><span>03</span><p>Select your answer, then check it. Read the explanation before continuing.</p></li></ol>
        <Link className="d1-primary" to={startUrl}>Start practice<ArrowRight size={18}/></Link>
      </section>
    </div>
  </div>;
}

export function DrillOneExperience({ questions }: { questions: DrillOneQuestion[] }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(() => ({ selected: null, checked: false, first: null })));
  const [finished, setFinished] = useState(false);
  const [seenResults, setSeenResults] = useState(false);
  const [focusOnArrival, setFocusOnArrival] = useState(false);
  const [focusAnswer, setFocusAnswer] = useState<'feedback' | 'option' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const id = useId();
  const question = questions[current];
  const answer = answers[current];
  const answered = answers.filter(item => item.first !== null).length;
  const correctFirst = answers.filter((item, index) => item.first === questions[index].correct).length;
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
    setAnswers(previous => previous.map((item, index) => index === current ? { ...item, ...update } : item));
  }
  function go(index: number) { setCurrent(index); setFinished(false); setFocusOnArrival(true); }
  function checkAnswer() {
    if (answer.selected === null) return;
    updateAnswer({ checked: true, first: answer.first ?? answer.selected });
    setFocusAnswer('feedback');
  }
  function showResults() { setSeenResults(true); setFinished(true); setFocusOnArrival(true); }
  function tryAgain() {
    updateAnswer({ selected: null, checked: false });
    setFocusAnswer('option');
  }

  return <section className="d1-experience" aria-label="Drill 1 questions">
    <div className="d1-progress-header"><span className="d1-eyebrow">{finished ? 'Practice complete' : 'Your progress'}</span><span>{answered} answered <span aria-hidden="true">/</span> {questions.length - answered} remaining</span></div>
    <div className="d1-progress" role="progressbar" aria-label="Questions answered" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={questions.length} aria-valuetext={`${answered} answered, ${questions.length - answered} remaining`}>{questions.map((_, index) => <span key={index} data-answered={answers[index].first !== null} data-current={!finished && current === index}/>)}</div>
    {finished ? <div className="d1-completion">
      <div className="d1-completion-mark" aria-hidden="true"><Check size={32}/></div>
      <p className="d1-eyebrow">You worked through every question</p><h2 ref={heading} tabIndex={-1}>Drill 1 complete.</h2>
      <p className="d1-result"><strong>{correctFirst}</strong> of {questions.length} correct on your first attempt.</p>
      <p className="d1-completion-copy">{missed.length ? 'Return to the questions you missed and compare the explanation with your original reasoning.' : 'Every first answer was correct. You can review any question before moving on.'}</p>
      <div className="d1-review-list" aria-label="Review questions">{questions.map((item, index) => <button type="button" key={item.prompt} onClick={() => go(index)}><span>Question {index + 1}</span><span>{answers[index].first === item.correct ? 'Correct first attempt' : 'Review reasoning'}<ArrowRight size={16}/></span></button>)}</div>
      <p className="d1-save">These results stay in this practice session. They are not saved to your account.</p>
    </div> : <div key={current} className="d1-question-scene" data-practice-task={current + 1}>
      <div className="d1-rule-panel">
        <div className="d1-rule-top"><span className="d1-eyebrow">Given rule</span><span className="d1-rule-number" aria-hidden="true">{String(current + 1).padStart(2, '0')}</span></div>
        <blockquote>{question.rule}</blockquote>
        {answer.checked && question.conditions && <figure className="d1-relation"><figcaption>Read the rule left to right</figcaption><div className="d1-relation-pair"><div><span>Sufficient</span><strong>{question.conditions[0]}</strong></div><span className="d1-relation-arrow" aria-hidden="true">→</span><span className="d1-sr-only">requires</span><div><span>Necessary</span><strong>{question.conditions[1]}</strong></div></div><p>If the left condition is true, the right condition must be true.</p></figure>}
        <div className="d1-rule-foot" aria-hidden="true"><span/><span/><span/></div>
      </div>
      <div className="d1-question-body">
        <p className="d1-question-position">Question {current + 1} of {questions.length}</p>
        <h2 id={`${id}-question`} ref={heading} tabIndex={-1}>{question.prompt}</h2>
        <div className="d1-options" role="group" aria-labelledby={`${id}-question`}>{question.options.map((option, index) => {
          const selected = answer.selected === index;
          return <button ref={index === 0 ? firstOption : undefined} type="button" key={option} className="d1-option" aria-pressed={selected} disabled={answer.checked} data-selected={selected} data-correct={answer.checked && index === question.correct} data-incorrect={answer.checked && selected && index !== question.correct} onClick={() => updateAnswer({ selected: index })}><span className="d1-option-letter" aria-hidden="true">{answer.checked && index === question.correct ? <Check size={17}/> : String.fromCharCode(65 + index)}</span><span>{option}</span>{answer.checked && index === question.correct && <span className="d1-sr-only">Correct answer</span>}</button>;
        })}</div>
        <div className="d1-feedback-region">{answer.checked && answer.selected !== null && <div className="d1-feedback" data-correct={answer.selected === question.correct}><h3 ref={feedbackHeading} tabIndex={-1} aria-describedby={`${id}-explanation${question.conditions ? ` ${id}-readback` : ''}`} className="d1-feedback-title"><span className="d1-feedback-dot"/>{answer.selected === question.correct ? 'Correct.' : 'Not quite.'}</h3><p id={`${id}-explanation`}>{question.feedback[answer.selected]}</p>{question.conditions && <p id={`${id}-readback`} className="d1-sr-only">The diagram places “{question.conditions[0]}” on the left as the sufficient condition and “{question.conditions[1]}” on the right as the necessary condition. If the left condition is true, the right condition must be true.</p>}{answer.selected !== question.correct && <p className="d1-correct-answer">The correct answer is marked above.</p>}</div>}</div>
        <div className="d1-answer-actions">{answer.checked ? <button type="button" className="d1-retry" onClick={tryAgain}><RotateCcw size={15}/>Try again</button> : <><p>Select one answer.</p><button type="button" className="d1-primary" disabled={answer.selected === null} onClick={checkAnswer}>Check answer<ArrowRight size={17}/></button></>}{seenResults && <button type="button" className={`d1-retry${answer.checked ? '' : ' d1-return-results'}`} onClick={showResults}>Back to results<ArrowRight size={15}/></button>}</div>
      </div>
    </div>}
    {!finished && <nav className="d1-navigation" aria-label="Question navigation"><button type="button" className="d1-previous" disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous question</button><button type="button" className="d1-next" disabled={!answer.checked} onClick={() => { if (current === questions.length - 1) showResults(); else go(current + 1); }}>{current === questions.length - 1 ? 'See results' : 'Next question'}<ArrowRight size={17}/></button></nav>}
  </section>;
}
