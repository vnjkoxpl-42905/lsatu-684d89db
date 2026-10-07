import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Dumbbell, Menu, Sparkles } from 'lucide-react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OPENING_COURSE_PATH, openingCourseStep, type OpeningCourseStep } from '../openingCoursePath';
import { OpeningCourseContent } from './OpeningCourseContent';
import { StudyDeck } from './StudyDeck';
import './opening-course.css';

export type OpeningCourseUrl = (destination: string, run?: boolean) => string;

const practiceSaveNotice = "Practice answers aren't saved to your account. Reloading or leaving the course clears them.";

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
  return <li className="oc-path-card"><span className="oc-label">{step.type}</span><h2>{step.title}</h2><p>{step.description}</p><Link className="oc-action" to={url(step.id)}>{step.type === 'note' ? <BookOpen size={16}/> : <Dumbbell size={16}/>} {step.type === 'note' ? 'Read lesson' : 'View drill'}<ArrowRight size={16}/></Link></li>;
}

const drillInstructions: Record<string, { summary: string; heading: string; steps: string[] }> = {
  'foundation-practice': {
    summary: 'Fresh rules and cases', heading: 'Decide what follows',
    steps: ['Read the rule and the facts supplied with it.', 'Decide what follows, what is required, and what the information leaves open.', 'Check the explanation. If your answer needs changing, try the case again.'],
  },
  'sufficient-practice': {
    summary: 'Condition targets and diagrams', heading: 'Find the whole sufficient condition',
    steps: ['Find the complete idea the sufficient expression refers to.', 'Put that condition on the left and the required condition on the right. Read the arrow back in English.', 'Check your work, then build a possible case that shows why the reverse does not follow.'],
  },
  'contrapositive-practice': {
    summary: 'Originals and contrapositives', heading: 'Keep both diagrams tied to the sentence',
    steps: ['Identify the indicator and both complete conditions, including any negatives.', 'Build the original diagram. Reverse the sides and negate both conditions to form its contrapositive.', 'Read both diagrams in English before checking. Use the explanation to repair any change in meaning.'],
  },
};

function DrillEntry({ step, url }: { step: OpeningCourseStep; url: OpeningCourseUrl }) {
  if (step.id === 'mixed-practice') return <div className="oc-drill-landing oc-translation-entry">
    <div className="oc-drill-overview">
      <Link className="oc-back oc-entry-back" to={url('lessons')}><ArrowLeft size={16}/>Back to lessons</Link>
      <header data-course-heading><p className="oc-label">Conditional reasoning</p><h1>{step.title}</h1><p>{step.description}</p></header>
    </div>
    <section className="oc-drill-start" aria-label="Practice instructions">
      <h2>One step at a time</h2>
      <p>Before each section, we'll show you what to look for. Then you'll put it into practice.</p>
      <Link className="oc-action oc-start-pulse" to={url(step.id, true)}>Start practice<ArrowRight size={16}/></Link>
      <p className="oc-save-scope">{practiceSaveNotice}</p>
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

export function OpeningCourseScreen({ view = 'lessons', run = false, url, steps = OPENING_COURSE_PATH, recordedPractice }: {
  view?: string; run?: boolean; url: OpeningCourseUrl; steps?: OpeningCourseStep[]; recordedPractice?: ReactNode;
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
  return <div ref={root} className="oc-course-screen">
    {isIndex && <div className="oc-course-index">
      <div data-course-heading><PageHeader noBloom eyebrow={view === 'lessons' ? 'Introduction' : 'Practice'} title={view === 'lessons' ? 'Conditional reasoning.' : view === 'labs' ? 'Make the move yourself.' : 'Practice the reasoning.'} description={view === 'lessons' ? 'Learn one idea, use it, then build on it. The drills between lessons give you a chance to test the meaning before moving on.' : 'Make an attempt before reading the explanation. Name the mistake, repair it and try again.'}/></div>
      {view === 'practice' && recordedPractice}
      <ol className="oc-course-path">{list.map(step => <CourseCard key={step.id} step={step} url={url}/>)}</ol>
      {!list.length && <p>No opening lessons are available in this work.</p>}
    </div>}
    {view === 'tools' && <div className="oc-course-note">
      <div data-course-heading><PageHeader noBloom eyebrow="Tools" title="Recall before you turn." description="Say the relationship in your own words. Turn the card to compare your reasoning."/></div>
      <div className="co-opening">{steps.some(step => step.unitId === 'orientation' || step.unitId === 'sufficient-necessary') && <><h2>Enough and required</h2><StudyDeck group="foundation"/></>}{steps.some(step => step.unitId === 'group-1') && <><h2>Sufficient-condition words</h2><StudyDeck group="group-1"/></>}{steps.some(step => step.unitId === 'group-2') && <><h2>Necessary-condition words</h2><StudyDeck group="group-2"/></>}{!steps.length && <p>No flashcards are available in this work.</p>}</div>
    </div>}
    {current?.type === 'drill' && !run && <DrillEntry step={current} url={url}/>}
    {current && (current.type === 'note' || run) && <div className={current.type === 'note' ? 'oc-course-note' : 'oc-drill-run-header'}>
      <div data-course-heading>{current.type === 'note' ? <header className="mb-10">
        <h1 className="font-mc-serif text-ink leading-[0.94] italic text-[clamp(3.1rem,7vw,6rem)] font-medium tracking-[-0.06em]">{current.title}</h1>
        <p className="font-mc-sans text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">{current.description}</p>
      </header> : <header><p className="oc-label">Practice</p><h1>{current.title}</h1></header>}</div>
      {current.type === 'drill' && <Link className="oc-back oc-drill-back" to={url(view)}><ArrowLeft size={16}/>Back to instructions</Link>}
      {current.id === 'mixed-practice' && <p className="oc-save-scope">{practiceSaveNotice}</p>}
    </div>}
    <div className="oc-course-bodies">{steps.filter(step => visited.includes(step.id)).map(step => <div key={step.id} hidden={step.id !== view || (step.type === 'drill' && !run)} className="oc-course-body co-opening cr-sequence"><OpeningCourseContent id={step.id}/></div>)}</div>
    {current && (current.type === 'note' || run) && <nav className="oc-course-turn" aria-label="Course navigation">{prior ? <Link to={url(prior.id)}><span>Previous {prior.type === 'note' ? 'lesson' : 'drill'}</span><strong>{prior.title}</strong></Link> : <Link to={url('lessons')}>All lessons</Link>}{next ? <Link to={url(next.id)}><span>Next {next.type === 'note' ? 'lesson' : 'drill'}</span><strong>{next.title}<ArrowRight size={18}/></strong></Link> : <Link to={url('lessons')}>Return to lessons<ArrowRight size={18}/></Link>}</nav>}
    {!isIndex && view !== 'tools' && !current && <div className="oc-course-note"><h1>This lesson is not available here.</h1><Link to={url('lessons')}>Return to lessons</Link></div>}
  </div>;
}
