import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, Dumbbell, Menu, Sparkles } from 'lucide-react';
import { CourseProgressProvider, useCourseProgress, useDeviceCourseProgress, type CourseProgressStore } from '../courseProgress';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OPENING_COURSE_PATH, openingCourseStep, type OpeningCourseStep } from '../openingCoursePath';
import { OpeningCourseContent } from './OpeningCourseContent';
import { CourseFlashcardUrl, FlashcardTools } from './FlashcardTools';
import { DrillOneEntry } from './DrillOneExperience';
import { mixedDrillStages } from './OpeningMixedDrill';
import { SourceWorksheetDrill } from './SourceWorksheetDrill';
import { getSourceWorksheetDrill } from '../content/sourceWorksheetDrills';
import './opening-course.css';

export type OpeningCourseUrl = (destination: string, run?: boolean) => string;


export function OpeningCourseNavigation({ view, url }: { view: string; url: OpeningCourseUrl }) {
  const [open, setOpen] = useState(false);
  const focusDestination = useRef(false);
  function closeForNavigation() { focusDestination.current = open; setOpen(false); }
  const navigation = <nav aria-label="Conditional course">
    <p>Intro path</p><Link aria-current={view === 'lessons' || !!openingCourseStep(view) ? 'page' : undefined} to={url('lessons')} onClick={closeForNavigation}><BookOpen size={18}/>Lessons</Link>
    <p>Practice</p><Link aria-current={view === 'practice' ? 'page' : undefined} to={url('practice')} onClick={closeForNavigation}><Sparkles size={18}/>Practice Drills</Link>
    <Link aria-current={view === 'labs' ? 'page' : undefined} to={url('labs')} onClick={closeForNavigation}><Dumbbell size={18}/>Drill Lab</Link>
    <p>Tools</p><Link aria-current={view === 'tools' ? 'page' : undefined} to={url('tools')} onClick={closeForNavigation}><Bookmark size={18}/>Flashcards</Link>
  </nav>;
  return <>
    <aside className="oc-course-rail"><Link className="oc-back" to="/classroom"><ArrowLeft size={15}/>Classroom</Link><div className="oc-brand">Conditional logic</div>{navigation}</aside>
    <div className="oc-mobile-nav"><Link to={url('lessons')}>Conditional logic</Link><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button type="button"><Menu size={18}/>Course menu</button></SheetTrigger><SheetContent side="left" className="oc-course-drawer" aria-describedby={undefined} onCloseAutoFocus={event => {
      if (!focusDestination.current) return;
      event.preventDefault();
      focusDestination.current = false;
      requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('.oc-course-screen [data-course-heading] h1');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      });
    }}><SheetTitle>Conditional logic</SheetTitle>{navigation}</SheetContent></Sheet></div>
  </>;
}

function CourseCard({ step, url }: { step: OpeningCourseStep; url: OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps[step.id];
  const drill = step.type === 'drill';
  const count = drill ? getSourceWorksheetDrill(step.id)?.items.length : undefined;
  const number = step.title.match(/^(Revisit )?Drill (\d+)/);
  return <li className={`oc-path-card${drill ? ' oc-drill-card' : ''}`} data-progress={saved?.status ?? 'new'}>
    {number && <span className="oc-card-num" aria-hidden="true">{number[2].padStart(2, '0')}</span>}
    <span className="oc-label">{number?.[1] ? 'Revisit' : drill ? 'Drill' : 'Lesson'}</span><CardStatus saved={saved} drill={drill}/><h2>{step.title}</h2><p>{step.description}</p>
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
  if (getSourceWorksheetDrill(step.id)) return <SourceWorksheetDrill setId={step.id} title={step.title} run={false} startUrl={url(step.id, true)} storageScope={storageScope}/>;
  if (step.id === 'foundation-practice') return <DrillOneEntry startUrl={url(step.id, true)} lessonsUrl={url('lessons')}/>;
  if (step.id === 'mixed-practice') return <div className="oc-drill-landing oc-translation-entry">
    <div className="oc-drill-overview">
      <Link className="oc-back oc-entry-back" to={url('lessons')}><ArrowLeft size={16}/>Back to lessons</Link>
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
    <div className="oc-drill-overview"><Link className="oc-back" to={url('lessons')}><ArrowLeft size={16}/>Back to lessons</Link>
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
  const partial = drill && saved.total ? <>{saved.done ?? 0} / {saved.total}<span className="oc-status-bar" aria-hidden><i style={{ width: `${(saved.done ?? 0) / saved.total * 100}%` }}/></span></> : 'In progress';
  return <span className="oc-status oc-status-started">{partial}</span>;
}

function CourseTracker({ steps }: { steps: OpeningCourseStep[] }) {
  const saved = useCourseProgress()?.steps ?? {};
  const done = steps.filter(step => saved[step.id]?.status === 'done').length;
  return <div className="oc-tracker" role="group" aria-label="Your progress">
    <div className="oc-tracker-top"><span>Your progress</span><strong>{done} <small>of {steps.length} done</small></strong></div>
    <div className="oc-tracker-steps">{steps.map(step => <i key={step.id} data-progress={saved[step.id]?.status ?? 'new'} data-type={step.type} title={step.title}/>)}</div>
  </div>;
}

/** Marks a lesson started on arrival and done once its closing navigation is reached. */
function LessonCompletion({ stepId }: { stepId: string }) {
  const store = useCourseProgress();
  const save = store?.save;
  useEffect(() => {
    if (!save) return;
    save(stepId, {});
    const end = document.querySelector('.oc-course-turn');
    if (!end || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { save(stepId, { status: 'done' }); observer.disconnect(); }
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, [save, stepId]);
  return null;
}

export function OpeningCourseScreen({ view = 'lessons', run = false, url, steps = OPENING_COURSE_PATH, recordedPractice, storageScope, progressStore }: {
  view?: string; run?: boolean; url: OpeningCourseUrl; steps?: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string; progressStore?: CourseProgressStore;
}) {
  const device = useDeviceCourseProgress(storageScope);
  return <CourseProgressProvider store={progressStore ?? device}><CourseScreen view={view} run={run} url={url} steps={steps} recordedPractice={recordedPractice} storageScope={storageScope}/></CourseProgressProvider>;
}

function CourseScreen({ view, run, url, steps, recordedPractice, storageScope }: {
  view: string; run: boolean; url: OpeningCourseUrl; steps: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string;
}) {
  const current = steps.find(step => step.id === view);
  const [visited, setVisited] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (current && (current.type === 'note' || run)) setVisited(prior => prior.includes(view) ? prior : [...prior, view]);
    requestAnimationFrame(() => {
      const heading = root.current?.querySelector<HTMLElement>('[data-course-heading] h1');
      if (heading) heading.tabIndex = -1;
      heading?.focus({ preventScroll: true });
      const arrival = root.current?.querySelector<HTMLElement>(current?.type === 'drill' && run ? '.oc-drill-run-header' : '[data-course-heading]');
      arrival?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    });
  }, [view, run, current]);
  const index = steps.findIndex(step => step.id === view);
  const prior = steps[index - 1];
  const next = steps[index + 1];
  const list = view === 'labs' || view === 'practice' ? steps.filter(step => step.type === 'drill') : steps;
  const isIndex = ['lessons', 'labs', 'practice'].includes(view);
  return <div ref={root} className={`oc-course-screen${view === 'foundation-practice' ? ' d1-screen' : ''}`}>
    {isIndex && <div className="oc-course-index">
      <div data-course-heading><PageHeader noBloom eyebrow={view === 'lessons' ? 'Introduction' : 'Practice'} title={view === 'lessons' ? 'Conditional reasoning.' : view === 'labs' ? 'Make the move yourself.' : 'Practice the reasoning.'}/></div>
      <CourseTracker steps={list}/>
      {view === 'practice' && recordedPractice}
      <ol className="oc-course-path">{list.map(step => <CourseCard key={step.id} step={step} url={url}/>)}</ol>
      {!list.length && <p>No opening lessons are available in this work.</p>}
    </div>}
    {view === 'tools' && <FlashcardTools url={url} allowed={[...(steps.some(step => step.unitId === 'orientation' || step.unitId === 'sufficient-necessary') ? ['foundation'] : []), ...(steps.some(step => step.unitId === 'group-1') ? ['group-1'] : []), ...(steps.some(step => step.unitId === 'group-2') ? ['group-2'] : [])]}/>}
    {current?.type === 'drill' && !run && <DrillEntry step={current} url={url} storageScope={storageScope}/>}
    {current && (current.type === 'note' || run) && <div className={current.type === 'note' ? 'oc-course-note' : 'oc-drill-run-header'}>
      <div data-course-heading>{current.type === 'note' ? <header className="mb-10">
        <h1 className="font-mc-serif text-ink leading-[0.94] italic text-[clamp(3.1rem,7vw,6rem)] font-medium tracking-[-0.06em]">{current.title}</h1>
        <p className="font-mc-sans text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">{current.id === 'necessary' ? <strong>{current.description}</strong> : current.description}</p>
      </header> : <header><p className="oc-label">Practice</p><h1>{current.title}</h1></header>}</div>
      {current.type === 'drill' && <Link className="oc-back oc-drill-back" to={url(view)}>Back to instructions</Link>}
    </div>}
    <div className="oc-course-bodies">{steps.filter(step => visited.includes(step.id)).map(step => <div key={step.id} hidden={step.id !== view || (step.type === 'drill' && !run)} className={step.id === 'foundation-practice' ? 'oc-course-body d1-body' : 'oc-course-body co-opening cr-sequence'}><CourseFlashcardUrl.Provider value={url}>{getSourceWorksheetDrill(step.id) ? <SourceWorksheetDrill setId={step.id} run startUrl={url(step.id, true)} storageScope={storageScope}/> : <OpeningCourseContent id={step.id}/>}</CourseFlashcardUrl.Provider></div>)}</div>
    {current?.type === 'note' && <LessonCompletion key={current.id} stepId={current.id}/>}
    {current && (current.type === 'note' || run) && <nav className="oc-course-turn" aria-label="Course navigation">{prior ? <Link to={url(prior.id)}><span>Previous {prior.type === 'note' ? 'lesson' : 'drill'}</span><strong>{prior.title}</strong></Link> : <Link to={url('lessons')}>All lessons</Link>}{next ? <Link to={url(next.id)}><span>Next {next.type === 'note' ? 'lesson' : 'drill'}</span><strong>{next.title}<ArrowRight size={18}/></strong></Link> : <Link to={url('lessons')}>Return to lessons<ArrowRight size={18}/></Link>}</nav>}
    {!isIndex && view !== 'tools' && !current && <div className="oc-course-note"><h1>This lesson is not available here.</h1><Link to={url('lessons')}>Return to lessons</Link></div>}
  </div>;
}
