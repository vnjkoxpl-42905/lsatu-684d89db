import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, Dumbbell, Menu, Sparkles } from 'lucide-react';
import { CourseProgressProvider, useCourseProgress, useDeviceCourseProgress, type CourseProgressStore } from '../courseProgress';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OPENING_COURSE_PATH, openingCourseStep, openingDrillNumber, type OpeningCourseStep } from '../openingCoursePath';
import { OpeningCourseContent } from './OpeningCourseContent';
import { CourseFlashcardUrl, FlashcardTools } from './FlashcardTools';
import { DrillOneEntry } from './DrillOneExperience';
import { mixedDrillStages } from './OpeningMixedDrill';
import { SourceWorksheetDrill } from './SourceWorksheetDrill';
import { getSourceWorksheetDrill } from '../content/sourceWorksheetDrills';
import { getAndOrDrill } from '../content/andOrItems';
import { AndOrDrill } from './AndOrPractice';
import { DrillDemo } from './DrillDemo';
import { fullCourseLessons, fullCourseDrillSets } from '../content/fullCourseContent';
import { FullCourseLesson } from './FullCourseLesson';
import { AndOrLesson } from './AndOrLessons';
import { FullCourseDrill } from './FullCourseDrill';
import { fullCourseMedia } from '../content/fullCourseMedia';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import './opening-course.css';

export type OpeningCourseUrl = (destination: string, run?: boolean) => string;

// Only the expanded edition changes these two historically unscoped draft keys.
// Routes and the local preview construct this suffix from the explicit edition.
function expandedDraftScope(scope?: string) {
  return scope?.endsWith(`:${FULL_CONDITIONAL_EDITION}`) ? scope : undefined;
}

const chapterTitles: Record<number, string> = {
  1: 'Read a conditional',
  2: 'AND, OR and the contrapositive',
  3: 'Group 3 and Group 4',
  4: 'Two-way rules and denying a rule',
  5: 'Use facts and connect rules',
  6: 'Some, most and all',
  7: 'Reason through an argument',
};


export function OpeningCourseNavigation({ view, url, workspaceLinks }: { view: string; url: OpeningCourseUrl; workspaceLinks?: { overview: string; review: string; journal: string; reference: string } }) {
  const [open, setOpen] = useState(false);
  const focusDestination = useRef(false);
  function closeForNavigation() { focusDestination.current = open; setOpen(false); }
  const navigation = <nav aria-label="Conditional course">
    <p>Learn</p><Link aria-current={view === 'overview' || view === 'lessons' || openingCourseStep(view)?.type === 'note' ? 'page' : undefined} to={workspaceLinks?.overview ?? url('lessons')} onClick={closeForNavigation}><BookOpen size={18}/>Course</Link>
    <Link aria-current={view === 'practice' || view === 'labs' || openingCourseStep(view)?.type === 'drill' ? 'page' : undefined} to={url('practice')} onClick={closeForNavigation}><Sparkles size={18}/>Practice drills</Link>
    <p>Resources</p><Link aria-current={view === 'tools' ? 'page' : undefined} to={url('tools')} onClick={closeForNavigation}><Bookmark size={18}/>Flashcards</Link>
    {workspaceLinks && <Link aria-current={view === 'reference' ? 'page' : undefined} to={workspaceLinks.reference} onClick={closeForNavigation}><BookOpen size={18}/>Quick reference</Link>}
  </nav>;
  const classroom = <Link className="oc-classroom-footer" to="/classroom" onClick={closeForNavigation}><ArrowLeft size={15}/>Classroom</Link>;
  return <>
    <aside className="oc-course-rail"><div className="oc-brand">Conditional logic</div>{navigation}{classroom}</aside>
    <div className="oc-mobile-nav"><Link to={workspaceLinks?.overview ?? url('lessons')}>Conditional logic</Link><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button type="button"><Menu size={18}/>Course menu</button></SheetTrigger><SheetContent side="left" className="oc-course-drawer" aria-describedby={undefined} onCloseAutoFocus={event => {
      if (!focusDestination.current) return;
      event.preventDefault();
      focusDestination.current = false;
      requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('.cb-main h1, .oc-course-screen [data-course-heading] h1');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      });
    }}><SheetTitle>Conditional logic</SheetTitle>{navigation}{classroom}</SheetContent></Sheet></div>
  </>;
}

function CourseCard({ step, url }: { step: OpeningCourseStep; url: OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps[step.id];
  const drill = step.type === 'drill';
  const count = drill ? (getSourceWorksheetDrill(step.id) ?? getAndOrDrill(step.id) ?? fullCourseDrillSets.find(set => set.id === step.id))?.items.length : undefined;
  return <li className={`oc-path-card${drill ? ' oc-drill-card' : ''}`} data-progress={saved?.status ?? 'new'} data-kind={step.type}>
    <span className="oc-timeline-node" aria-hidden="true">{drill ? <Dumbbell size={20}/> : <BookOpen size={20}/>}</span>
    <span className="oc-label">{step.requiredForEditionCompletion === false && 'Optional · '}{drill ? (step.part && step.part >= 3 ? 'Drill' : `Drill ${openingDrillNumber(step.id) ?? ''}`.trim()) : <>Lesson <span>{step.lessonNumber}</span></>}</span><CardStatus saved={saved} drill={drill}/><h3>{step.title}</h3><p>{step.description}</p>
    <div className="oc-card-foot"><Link className="oc-action" to={url(step.id)}>{drill ? <Dumbbell size={16}/> : <BookOpen size={16}/>} {saved?.status === 'started' ? 'Continue' : saved?.status === 'done' ? (drill ? 'Review drill' : 'Read again') : drill ? 'View drill' : 'Read lesson'}</Link>{count !== undefined && <span className="oc-card-count">{count} questions</span>}</div>
  </li>;
}

const drillInstructions: Record<string, { summary: string; heading: string; steps: string[] }> = {
  'sufficient-practice': {
    summary: 'Indicators, conditions and diagrams', heading: 'Find the condition and build the diagram',
    steps: ['Find the indicator that introduces the sufficient condition.', 'Find the complete condition it points to. Keep every word that limits it.', 'Build the diagram: the guarantee goes on the left, what it requires on the right.', 'Write the rule in ordinary English and compare it with our version.'],
  },
  'contrapositive-practice': {
    summary: 'Originals and contrapositives', heading: 'Check the direction and each negation',
    steps: ['Choose the original arrow that keeps both complete conditions.', 'Choose its contrapositive: reverse the sides and negate both conditions. Correct each choice before continuing.', 'Write each form in ordinary English, then compare your wording with the explanation.'],
  },
};

function DrillEntry({ step, url, storageScope }: { step: OpeningCourseStep; url: OpeningCourseUrl; storageScope?: string }) {
  const fullDrill = fullCourseDrillSets.find(set => set.id === step.id);
  if (fullDrill) return <div className="oc-drill-landing"><div className="oc-drill-overview"><Link className="oc-back" to={url('lessons')}><ArrowLeft size={16}/>Back to course</Link><header data-course-heading><h1>{step.title}</h1><p>{step.description}</p></header></div><section className="oc-drill-start" aria-label="Practice instructions"><p className="oc-label">{fullDrill.items.length} questions</p><h2>Make the rule work</h2><ol>{fullDrill.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol><Link className="oc-action" to={url(step.id, true)}>Start practice<ArrowRight size={16}/></Link></section></div>;
  if (getSourceWorksheetDrill(step.id)) return <SourceWorksheetDrill setId={step.id} title={step.title} run={false} startUrl={url(step.id, true)} storageScope={storageScope}/>;
  const andOr = getAndOrDrill(step.id);
  if (andOr) return <div className="oc-drill-landing">
    <div className="oc-drill-overview"><Link className="oc-back" to={url('lessons')}><ArrowLeft size={16}/>Back to course</Link>
      <header data-course-heading><h1>{step.title}</h1><p>{step.description}</p></header>
    </div>
    <section className="oc-drill-start" aria-label="Practice instructions">
      <p className="oc-label">{andOr.items.length} questions</p><h2>One step at a time</h2>
      <ol>{andOr.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
      <DrillDemo drillId={step.id}/>
      <Link className="oc-action" to={url(step.id, true)}>Start practice<ArrowRight size={16}/></Link>
    </section>
  </div>;
  if (step.id === 'foundation-practice') return <DrillOneEntry startUrl={url(step.id, true)} lessonsUrl={url('lessons')}/>;
  if (step.id === 'mixed-practice') return <div className="oc-drill-landing oc-translation-entry">
    <div className="oc-drill-overview">
      <Link className="oc-back oc-entry-back" to={url('lessons')}><ArrowLeft size={16}/>Back to course</Link>
      <header data-course-heading><p className="oc-label">Conditional reasoning</p><h1>{step.title}</h1><p>{step.description}</p></header>
    </div>
    <section className="oc-drill-start" aria-label="Practice instructions">
      <h2>One step at a time</h2>
      <ol>{mixedDrillStages.slice(0, 5).map(stage => <li key={stage.title}><strong>{stage.title}</strong> {stage.instruction}</li>)}</ol>
      <Link className="oc-action oc-start-pulse" to={url(step.id, true)}>Start practice<ArrowRight size={16}/></Link>
    </section>
  </div>;
  const instructions = drillInstructions[step.id];
  return <div className="oc-drill-landing">
    <div className="oc-drill-overview"><Link className="oc-back" to={url('lessons')}><ArrowLeft size={16}/>Back to course</Link>
      <header data-course-heading><h1>{step.title}</h1><p>{step.description}</p></header>
    </div>
    <section className="oc-drill-start" aria-label="Practice instructions">
      <p className="oc-label">{instructions.summary}</p><h2>{instructions.heading}</h2>
      <ol>{instructions.steps.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
      <Link className="oc-action" to={url(step.id, true)}>Start practice<ArrowRight size={16}/></Link>
    </section>
  </div>;
}

function CardStatus({ saved, drill }: { saved?: CourseProgressStore['steps'][string]; drill: boolean }) {
  if (!saved) return <span className="oc-status oc-status-new">Not started</span>;
  if (saved.status === 'done') return <span className="oc-status oc-status-done"><Check size={13} aria-hidden/>Done</span>;
  const partial = drill && saved.total ? <>{Math.min(99, Math.round((saved.done ?? 0) / saved.total * 100))}% complete<span className="oc-status-bar" aria-hidden><i style={{ width: `${Math.min(99, (saved.done ?? 0) / saved.total * 100)}%` }}/></span></> : 'In progress';
  return <span className="oc-status oc-status-started">{partial}</span>;
}

function CourseTracker({ steps }: { steps: OpeningCourseStep[] }) {
  steps = steps.filter(step => step.requiredForEditionCompletion !== false);
  const saved = useCourseProgress()?.steps ?? {};
  const done = steps.filter(step => saved[step.id]?.status === 'done').length;
  const percent = steps.length ? Math.min(done === steps.length ? 100 : 99, Math.round(done / steps.length * 100)) : 0;
  return <div className="oc-tracker" role="group" aria-label="Your progress">
    <div className="oc-tracker-top"><span>Your progress</span><strong>{percent}% <small>complete</small></strong></div>
    <div className="oc-completion-rail" role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}% complete, ${done} of ${steps.length} steps done`}><span style={{ width: `${percent}%` }}/></div>
  </div>;
}

function CourseContinue({ steps, url }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps ?? {};
  const next = steps.find(step => step.requiredForEditionCompletion !== false && saved[step.id]?.status !== 'done');
  if (!next) return null;
  const started = saved[next.id]?.status === 'started';
  return <Link className="oc-action oc-course-continue" to={url(next.id, next.type === 'drill' && started)}>{started ? 'Continue' : 'Start'} {next.type === 'drill' ? 'drill' : `lesson ${next.lessonNumber}`}<span>{next.title}</span><ArrowRight size={16}/></Link>;
}

/** Marks a lesson started on arrival and done once its closing navigation is reached. */
function LessonCompletion({ stepId, canComplete = true }: { stepId: string; canComplete?: boolean }) {
  const store = useCourseProgress();
  const save = store?.save;
  useEffect(() => {
    if (!save) return;
    save(stepId, {});
    if (!canComplete) return;
    const end = document.querySelector('.oc-course-turn');
    if (!end || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { save(stepId, { status: 'done' }); observer.disconnect(); }
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, [save, stepId, canComplete]);
  return null;
}

export function OpeningCourseScreen({ view = 'lessons', run = false, url, steps = OPENING_COURSE_PATH, recordedPractice, storageScope, progressStore }: {
  view?: string; run?: boolean; url: OpeningCourseUrl; steps?: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string; progressStore?: CourseProgressStore;
}) {
  if (!progressStore) return <DeviceCourseScreen key={storageScope ?? 'preview'} view={view} run={run} url={url} steps={steps} recordedPractice={recordedPractice} storageScope={storageScope}/>;
  return <CourseProgressProvider store={progressStore}><CourseScreen key={storageScope ?? progressStore.storageScope} view={view} run={run} url={url} steps={steps} recordedPractice={recordedPractice} storageScope={storageScope}/></CourseProgressProvider>;
}

function DeviceCourseScreen(props: { view: string; run: boolean; url: OpeningCourseUrl; steps: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string }) {
  const device = useDeviceCourseProgress(props.storageScope);
  return <CourseProgressProvider store={device}><CourseScreen {...props}/></CourseProgressProvider>;
}

/** The AND and OR lessons state their definition in the body, so the header carries only the title. */
const FOCUSED_LESSONS = ['and-or-both-or-either', 'and-or-either-condition'];

function CourseScreen({ view, run, url, steps, recordedPractice, storageScope }: {
  view: string; run: boolean; url: OpeningCourseUrl; steps: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string;
}) {
  const current = steps.find(step => step.id === view);
  const progress = useCourseProgress();
  const projected = !!progress?.priorCompletion?.[view];
  const [visited, setVisited] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (current && !projected && (current.type === 'note' || run)) setVisited(prior => prior.includes(view) ? prior : [...prior, view]);
    requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLElement>('[data-course-heading] h1');
      if (heading) heading.tabIndex = -1;
      heading?.focus({ preventScroll: true });
      const arrival = root.current?.querySelector<HTMLElement>(current?.type === 'drill' && run ? '.oc-drill-run-header' : '[data-course-heading]');
      arrival?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    });
  }, [view, run, current, projected]);
  const index = steps.findIndex(step => step.id === view);
  const prior = steps[index - 1];
  const next = steps[index + 1];
  const list = view === 'labs' || view === 'practice' ? steps.filter(step => step.type === 'drill') : steps;
  const isIndex = ['lessons', 'labs', 'practice'].includes(view);
  return <div ref={root} className={`oc-course-screen${view === 'foundation-practice' ? ' d1-screen' : ''}`}>
    {isIndex && <div className="oc-course-index">
      <div data-course-heading><PageHeader noBloom eyebrow={view === 'lessons' ? 'Course' : 'Practice'} title={view === 'lessons' ? 'Conditional reasoning.' : view === 'labs' ? 'Make the move yourself.' : 'Practice the reasoning.'}/></div>
      <CourseTracker steps={list}/>
      {view === 'lessons' && <CourseContinue steps={list} url={url}/>}
      {view === 'practice' && recordedPractice}
      {[...new Set(list.map(step => step.part ?? 1))].map(part => <section className="oc-course-part" key={part} aria-label={`Chapter ${part}`}>
        <h2 className="oc-part-title">Chapter {part} · {chapterTitles[part]}</h2>
        <ol className="oc-course-path">{list.filter(step => (step.part ?? 1) === part).map(step => <CourseCard key={step.id} step={step} url={url}/>)}</ol>
      </section>)}
      {!list.length && <p>No opening lessons are available in this work.</p>}
    </div>}
    {view === 'tools' && <FlashcardTools url={url} storageScope={expandedDraftScope(storageScope ?? progress?.storageScope)} allowed={[...(steps.some(step => step.unitId === 'orientation' || step.unitId === 'sufficient-necessary') ? ['foundation'] : []), ...(steps.some(step => step.unitId === 'group-1' || step.id === 'sufficient') ? ['group-1'] : []), ...(steps.some(step => step.unitId === 'group-2' || step.id === 'necessary') ? ['group-2'] : [])]}/>}
    {projected && current && <section className="oc-course-note" data-course-heading><p className="oc-label">Completed earlier</p><h1>{current.title}</h1><p>Your completed work from the earlier course counts here. Open a new attempt to revise it.</p><button className="oc-action" onClick={() => progress?.resume?.(current.id)}>Resume and revise</button><Link className="oc-back" to={url('lessons')}>Return to course</Link></section>}
    {!projected && current?.type === 'drill' && !run && <DrillEntry step={current} url={url} storageScope={storageScope}/>}
    {!projected && current && (current.type === 'note' || run) && <div className={current.type === 'note' ? 'oc-course-note' : 'oc-drill-run-header'}>
      <div data-course-heading>{current.type === 'note' ? <header className={FOCUSED_LESSONS.includes(current.id) ? 'oc-focused-lesson-header' : 'mb-10'}>
        {current.lessonNumber && <p className="oc-label">Chapter {current.part ?? 1} · Lesson {current.lessonNumber}{current.requiredForEditionCompletion === false && ' · Optional'}</p>}
        <h1 className={FOCUSED_LESSONS.includes(current.id) ? 'oc-focused-lesson-title' : 'font-mc-serif text-ink leading-[0.94] italic text-[clamp(3.1rem,7vw,6rem)] font-medium tracking-[-0.06em]'}>{current.title}</h1>
        {!FOCUSED_LESSONS.includes(current.id) && !fullCourseLessons.some(lesson => lesson.id === current.id) && <p className="font-mc-sans text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">{current.id === 'necessary' ? <strong>{current.description}</strong> : current.description}</p>}
      </header> : <header><p className="oc-label">{openingDrillNumber(current.id) ? `Drill ${openingDrillNumber(current.id)}` : 'Practice'}</p><h1>{current.title}</h1></header>}</div>
      {current.type === 'drill' && <Link className="oc-back oc-drill-back" to={url(view)}>Back to instructions</Link>}
    </div>}
    <div className="oc-course-bodies">{steps.filter(step => visited.includes(step.id) && !progress?.priorCompletion?.[step.id]).map(step => <div key={step.id} hidden={step.id !== view || (step.type === 'drill' && !run)} className={step.id === 'foundation-practice' ? 'oc-course-body d1-body' : 'oc-course-body co-opening cr-sequence'}><CourseFlashcardUrl.Provider value={url}><CourseBody step={step} url={url} storageScope={storageScope ?? progress?.storageScope}/></CourseFlashcardUrl.Provider></div>)}</div>
    {!projected && current?.type === 'note' && !fullCourseLessons.some(lesson => lesson.id === current.id) && <LessonCompletion key={current.id} stepId={current.id}/>}
    {current && (current.type === 'note' || run) && <nav className="oc-course-turn" aria-label="Course navigation">{prior ? <Link to={url(prior.id)}><span>Previous {prior.type === 'note' ? 'lesson' : 'drill'}</span><strong>{prior.title}</strong></Link> : <Link to={url('lessons')}>Course</Link>}{next ? <Link to={url(next.id)}><span>Next {next.type === 'note' ? 'lesson' : 'drill'}</span><strong>{next.title}<ArrowRight size={18}/></strong></Link> : <Link to={url('lessons')}>Return to course<ArrowRight size={18}/></Link>}</nav>}
    {!isIndex && view !== 'tools' && !current && <div className="oc-course-note"><h1>This lesson is not available here.</h1><Link to={url('lessons')}>Return to course</Link></div>}
  </div>;
}

function CourseBody({ step, url, storageScope }: { step: OpeningCourseStep; url: OpeningCourseUrl; storageScope?: string }) {
  if (FOCUSED_LESSONS.includes(step.id)) return <AndOrLesson id={step.id}/>;
  const lesson = fullCourseLessons.find(item => item.id === step.id);
  if (lesson) return <FullCourseLesson lesson={lesson} courseStepId={step.id} media={fullCourseMedia[lesson.id]}/>;
  const drill = fullCourseDrillSets.find(item => item.id === step.id);
  if (drill) return <FullCourseDrill drill={drill} courseStepId={step.id} autoStart/>;
  if (getSourceWorksheetDrill(step.id)) return <SourceWorksheetDrill setId={step.id} run startUrl={url(step.id, true)} storageScope={storageScope}/>;
  if (getAndOrDrill(step.id)) return <AndOrDrill setId={step.id} run startUrl={url(step.id, true)} storageScope={storageScope}/>;
  return <OpeningCourseContent id={step.id} storageScope={expandedDraftScope(storageScope)}/>;
}
