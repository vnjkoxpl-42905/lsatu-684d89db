import { useState } from 'react';
import type { FullCourseLesson as Lesson, FullCourseMedia } from '../content/fullCourseTypes';
import { FullCourseDrill } from './FullCourseDrill';
import { UnlessLesson } from './UnlessLesson';
import { ExclusionLesson } from './ExclusionLesson';
import { NegativeTranslationLesson } from './NegativeTranslationLesson';
import './full-course.css';

function Demonstration({ demo }: { demo: Lesson['demos'][number] }) {
  const [step, setStep] = useState(-1);
  return <section className="fc-demo"><p className="fc-sentence">{demo.sentence}</p>{step >= 0 && <div className="fc-demo-result" aria-live="polite"><p>{demo.steps[step].explanation}</p><p className="fc-diagram">{demo.steps[step].diagram}</p></div>}{step < demo.steps.length - 1 && <button type="button" className="fc-primary" onClick={() => setStep(step + 1)}>{demo.steps[step + 1].label}</button>}{step === demo.steps.length - 1 && demo.readback !== demo.steps[step].explanation && <p className="fc-readback">{demo.readback}</p>}</section>;
}
function LessonFilm({ media }: { media: FullCourseMedia }) {
  const [failed, setFailed] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  return <section className="fc-film"><h2>Watch the lesson</h2>{!failed && <video controls preload="metadata" poster={media.poster} onError={() => setFailed(true)}><source src={media.src} type="video/mp4"/><track kind="captions" src={media.captions} srcLang="en" label="English" default/></video>}{failed ? <><p>The video could not load. The written version is below.</p>{media.transcript.map((sentence, i) => <p key={i}>{sentence}</p>)}</> : <details onToggle={event => setTranscriptOpen(event.currentTarget.open)}><summary>Read the written version</summary>{transcriptOpen && media.transcript.map((sentence, i) => <p key={i}>{sentence}</p>)}</details>}</section>;
}
/** The course host supplies the edition-aware progress store and verified media manifest. */
export function FullCourseLesson({ lesson, courseStepId, media }: { lesson: Lesson; courseStepId?: string; media?: FullCourseMedia }) {
  const targeted = ['exception-language', 'exclusion-language', 'negative-translation'].includes(lesson.id);
  const quiz = <section className="fc-quiz"><h2>Pop Quiz</h2><FullCourseDrill key={lesson.id} courseStepId={courseStepId ?? lesson.id} embeddedSuccessExplanation={targeted ? 'full' : 'first-sentence'} embedded autoStart drill={{ id: lesson.id, title: 'Pop quiz', unitId: lesson.unitId, part: lesson.part, afterLessonId: lesson.id, instructions: [], items: lesson.quiz }}/></section>;
  if (lesson.id === 'exception-language') return <UnlessLesson lesson={lesson} film={media && <LessonFilm media={media}/>} quiz={quiz}/>;
  if (lesson.id === 'exclusion-language') return <ExclusionLesson film={media && <LessonFilm media={media}/>} quiz={quiz}/>;
  if (lesson.id === 'negative-translation') return <NegativeTranslationLesson quiz={quiz}/>;
  const contextHeading = lesson.id === 'exclusion-language' ? 'Not both, not all and cannot' : undefined;
  return <article className="fc-lesson">
    <section className="fc-definition"><h2>What it is</h2>{(contextHeading ? lesson.definition.slice(0, 1) : lesson.definition).map((paragraph, i) => <p key={i}>{paragraph}</p>)}<div className="fc-main-example"><p className="fc-sentence">{lesson.mainExample.sentence}</p><p>{lesson.mainExample.explanation}</p><p className="fc-diagram">{lesson.mainExample.diagram}</p></div>{contextHeading && <details className="fc-context"><summary>{contextHeading}</summary>{lesson.definition.slice(1).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</details>}</section>
    <section><h2>Why it matters</h2><p>{lesson.purpose}</p></section>
    {media && <LessonFilm media={media}/>}
    <section><h2>How to use it</h2><ol className="fc-method">{lesson.steps.map((step, index) => <li key={index}><h3>Step {index + 1}. {step.title.replace(/^Step \d+\.\s*/, '')}</h3><p>{step.body}</p></li>)}</ol>{lesson.demos.map((demo, i) => <Demonstration demo={demo} key={i}/>)}</section>
    <section><h2>What it is not</h2><div className="fc-comparisons">{lesson.mistakes.map((example, i) => <div key={i} className={example.correct ? 'fc-right' : 'fc-wrong'}><strong>{example.correct ? '✓ Right' : '× Wrong'}</strong><p>{example.explanation}</p><p className="fc-diagram">{example.diagram}</p></div>)}</div></section>
    <p className="fc-habit">{lesson.habit}</p>
    {quiz}
  </article>;
}
