import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Home, Menu } from 'lucide-react';
import { CardsGlyph, DrillGlyph } from './CourseGlyphs';
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
import { CourseVolume } from './CourseVolume';
import { fullCourseMedia } from '../content/fullCourseMedia';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { LessonSkillLinks, SkillPracticeHub, SkillPracticeLinks } from './SkillPracticeHub';
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


export function OpeningCourseNavigation({ view, url, workspaceLinks, chapters }: { view: string; url: OpeningCourseUrl; workspaceLinks?: { overview: string; review: string; journal: string; reference: string }; chapters?: number[] }) {
  const [open, setOpen] = useState(false);
  const focusDestination = useRef(false);
  function closeForNavigation() { focusDestination.current = open; setOpen(false); }
  const viewStep = openingCourseStep(view);
  const viewPart = viewStep?.type === 'note' ? viewStep.part ?? 1 : undefined;
  const courseOpen = chapterFromView(view) !== undefined || viewPart !== undefined;
  const navigation = <nav aria-label="Conditional course">
    <p>Learn</p>{chapters && chapters.length > 1 ? <>
      <Link aria-current={view === 'home' || view === 'overview' ? 'page' : undefined} to={workspaceLinks?.overview ?? url('home')} onClick={closeForNavigation}><Home size={18}/>Home</Link>
      <details className="oc-nav-course" open={courseOpen || undefined}>
        <summary><BookOpen size={18}/>Chapters<ChevronDown size={16} className="oc-nav-chevron" aria-hidden/></summary>
        <div>{chapters.map(part => <Link key={part} aria-current={view === chapterView(part) || viewPart === part ? 'page' : undefined} to={url(chapterView(part))} onClick={closeForNavigation}><span>Chapter {part}</span>{chapterTitles[part]}</Link>)}</div>
      </details>
    </> : <Link aria-current={view === 'overview' || view === 'lessons' || openingCourseStep(view)?.type === 'note' ? 'page' : undefined} to={workspaceLinks?.overview ?? url('lessons')} onClick={closeForNavigation}><BookOpen size={18}/>Course</Link>}
    <Link aria-current={view === 'centre' ? 'page' : undefined} to={url('centre')} onClick={closeForNavigation}><DrillGlyph size={18}/>Practice centre</Link>
    <Link aria-current={view === 'practice' || view === 'labs' || openingCourseStep(view)?.type === 'drill' ? 'page' : undefined} to={url('practice')} onClick={closeForNavigation}><DrillGlyph size={18}/>Course drills</Link>
    <p>Resources</p><Link aria-current={view === 'tools' ? 'page' : undefined} to={url('tools')} onClick={closeForNavigation}><CardsGlyph size={18}/>Flashcards</Link>
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
    <span className="oc-timeline-node" aria-hidden="true">{drill ? <DrillGlyph size={20}/> : <BookOpen size={20}/>}</span>
    <span className="oc-label">{step.requiredForEditionCompletion === false && 'Optional · '}{drill ? (step.part && step.part >= 3 ? 'Drill' : `Drill ${openingDrillNumber(step.id) ?? ''}`.trim()) : <>Lesson <span>{step.lessonNumber}</span></>}</span><CardStatus saved={saved} drill={drill}/><h3>{step.title}</h3><p>{step.description}</p>
    <div className="oc-card-foot"><Link className="oc-action" to={url(step.id)}>{drill ? <DrillGlyph size={16}/> : <BookOpen size={16}/>} {saved?.status === 'started' ? 'Continue' : saved?.status === 'done' ? (drill ? 'Review drill' : 'Read again') : drill ? 'View drill' : 'Read lesson'}</Link>{count !== undefined && <span className="oc-card-count">{count} questions</span>}</div>
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

/** One line under each chapter title on Home and on the chapter page. */
const chapterSummaries: Record<number, string> = {
  1: 'What a conditional says, how to diagram it, and its contrapositive.',
  2: 'Rules with AND or OR in them, and how to flip them.',
  3: 'Unless, until, without, no and never, translated into conditionals.',
  4: 'Rules that run both ways, and what it takes to deny a rule.',
  5: 'Put a rule to work with a fact, and link rules into chains.',
  6: 'What quantity words claim, and how quantity statements connect.',
  7: 'Use everything so far on the question types the LSAT asks.',
};

export const chapterView = (part: number) => `chapter-${part}`;
export function chapterFromView(view: string) {
  const match = /^chapter-(\d+)$/.exec(view);
  return match ? Number(match[1]) : undefined;
}
const required = (step: OpeningCourseStep) => step.requiredForEditionCompletion !== false;

/** Groups a chapter's drills under the lesson they follow, unless the chapter lists its lessons first and its drills after. */
function chapterGroups(chapter: OpeningCourseStep[]) {
  const groups: { lesson: OpeningCourseStep; drills: OpeningCourseStep[] }[] = [];
  const loose: OpeningCourseStep[] = [];
  for (const step of chapter) {
    if (step.type === 'note') groups.push({ lesson: step, drills: [] });
    else if (groups.length) groups[groups.length - 1].drills.push(step);
    else loose.push(step);
  }
  const interleaved = groups.every(group => group.drills.length <= 2);
  if (interleaved) return { groups, drills: loose };
  return { groups: groups.map(group => ({ lesson: group.lesson, drills: [] })), drills: [...loose, ...groups.flatMap(group => group.drills)] };
}

function ChapterProgress({ steps }: { steps: OpeningCourseStep[] }) {
  const saved = useCourseProgress()?.steps ?? {};
  const counted = steps.filter(required);
  const done = counted.filter(step => saved[step.id]?.status === 'done').length;
  return <div className="oc-chapter-progress"><span className="oc-chapter-progress-rail" aria-hidden><i style={{ width: `${counted.length ? done / counted.length * 100 : 0}%` }}/></span><span>{done} of {counted.length} done</span></div>;
}

/** One segment per lesson (its drills included); a chapter that lists drills after its lessons gets one Drills segment. */
function lessonSegments(chapter: OpeningCourseStep[]) {
  const { groups, drills } = chapterGroups(chapter);
  const segments = groups.map(group => ({ key: group.lesson.id, label: group.lesson.lessonNumber ?? '', steps: [group.lesson, ...group.drills].filter(required) }));
  if (drills.length) segments.push({ key: 'drills', label: 'Drills', steps: drills.filter(required) });
  return segments.filter(segment => segment.steps.length);
}

function VolumeProgress({ chapter, next }: { chapter: OpeningCourseStep[]; next?: OpeningCourseStep }) {
  const saved = useCourseProgress()?.steps ?? {};
  const segments = lessonSegments(chapter);
  const currentKey = segments.find(segment => segment.steps.some(step => saved[step.id]?.status !== 'done'))?.key;
  return <span className="oc-vol-segments" aria-hidden>{segments.map(segment => {
    const done = segment.steps.filter(step => saved[step.id]?.status === 'done').length;
    const state = done === segment.steps.length ? 'done' : segment.key === currentKey && (done > 0 || chapter.some(step => step.id === next?.id)) ? 'current' : 'pending';
    return <i key={segment.key} data-state={state} style={{ '--fill': `${done / segment.steps.length * 100}%` } as CSSProperties}/>;
  })}</span>;
}

function CourseHome({ steps, url }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps ?? {};
  const isDone = (step: OpeningCourseStep) => saved[step.id]?.status === 'done';
  const counted = steps.filter(required);
  const done = counted.filter(isDone).length;
  const nextIndex = steps.findIndex(step => required(step) && !isDone(step));
  const next = nextIndex < 0 ? undefined : steps[nextIndex];
  const then = next ? steps.slice(nextIndex + 1).find(required) : undefined;
  const started = next && saved[next.id]?.status === 'started';
  const parts = [...new Set(steps.map(step => step.part ?? 1))];
  const herePart = next ? next.part ?? 1 : undefined;
  const hereSteps = counted.filter(step => (step.part ?? 1) === herePart);
  const hereDone = hereSteps.filter(isDone).length;
  const pad = (value: number) => String(value).padStart(2, '0');
  const drills = counted.filter(step => step.type === 'drill');
  const drillTotal = drills.length;
  const drillsDone = drills.filter(isDone).length;
  const nextDrill = drills.find(step => !isDone(step));
  return <div className="oc-course-index oc-home">
    <section className="oc-hero" aria-label={next ? 'Next step' : 'Course complete'}>
      <div className="oc-hero-art" aria-hidden/>
      <div className="oc-hero-main">
        <div data-course-heading className="oc-hero-head">
          <h1>Conditional reasoning</h1>
          <p role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={counted.length} aria-valuenow={done} aria-valuetext={`${done} of ${counted.length} steps done`}>{done} of {counted.length} steps done</p>
        </div>
        {next ? <>
          <p className="oc-hero-kicker">{started ? 'Pick up where you left off' : 'Next'}: Chapter {next.part ?? 1}, {next.lessonNumber ? `lesson ${next.lessonNumber}` : 'drill'}</p>
          <h2>{next.title}</h2>
          {next.description && <p className="oc-hero-summary">{next.description}</p>}
          <div className="oc-hero-actions">
            <Link className="oc-hero-go" to={url(next.id, next.type === 'drill' && started)}>{started ? 'Continue' : 'Start'} {next.type === 'drill' ? 'drill' : 'lesson'}<ArrowRight size={17} aria-hidden/></Link>
            {then && <p className="oc-hero-then">Then: <Link to={url(then.id)}>{then.title}</Link></p>}
          </div>
        </> : <>
          <p className="oc-hero-kicker">Course complete</p>
          <h2>Every step is done.</h2>
          <p className="oc-hero-summary">Open any chapter to review a lesson or redo a drill.</p>
        </>}
      </div>
      {next && herePart !== undefined && <Link className="oc-hero-place" to={url(chapterView(herePart))}>
        <span className="oc-hero-place-label">Your place</span>
        <span className="oc-hero-place-count"><strong>{pad(hereDone)}</strong><span>/{pad(hereSteps.length)}</span></span>
        <span className="oc-hero-place-chapter">Chapter {herePart}<span>{chapterTitles[herePart]}</span></span>
      </Link>}
    </section>
    <h2 className="oc-home-section">Chapters</h2>
    <ol className="oc-volumes">
      {parts.map((part, index) => {
        const chapter = counted.filter(step => (step.part ?? 1) === part);
        const doneHere = chapter.filter(isDone).length;
        const complete = chapter.length > 0 && doneHere === chapter.length;
        const here = part === herePart;
        const all = steps.filter(step => (step.part ?? 1) === part);
        const lessonCount = all.filter(step => step.type === 'note').length;
        // Name the next step only where the student has begun, so an untouched chapter reads as a choice, not a queue.
        const chapterNext = doneHere > 0 || here ? chapter.find(step => !isDone(step)) : undefined;
        return <li key={part}>
          <CourseVolume to={url(chapterView(part))} slice={parts.length > 1 ? index / (parts.length - 1) : 0.5} progress={chapter.length ? doneHere / chapter.length : 0} here={here} complete={complete}
            label={`Chapter ${part}: ${chapterTitles[part]}. ${doneHere} of ${chapter.length} steps done${here ? '. You are here' : ''}${chapterNext ? `. Next: ${chapterNext.title}` : ''}`}>
            <span className="oc-vol-num" aria-hidden>{part}</span>
            <span className="oc-vol-text" aria-hidden>
              <span className="oc-vol-label">{here ? 'You are here' : complete ? <><Check size={13}/>Complete</> : `Chapter ${part}`}</span>
              <span className="oc-vol-title">{chapterTitles[part]}</span>
              <VolumeProgress chapter={steps.filter(step => (step.part ?? 1) === part)} next={next}/>
              <span className="oc-vol-meta">{complete ? 'Every lesson and drill done' : chapterNext ? <>Next: {chapterNext.lessonNumber ? `${chapterNext.lessonNumber} ` : 'Drill: '}{chapterNext.title}</> : `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`}</span>
            </span>
          </CourseVolume>
        </li>;
      })}
      <li className="oc-practice">
        <div className="oc-practice-art" aria-hidden/>
        <h3>Practice and review</h3>
        {nextDrill ? <Link className="oc-practice-next" to={url(nextDrill.id)}>
          <span className="oc-practice-next-label">{saved[nextDrill.id]?.status === 'started' ? 'Continue drill' : 'Next drill'} · Chapter {nextDrill.part ?? 1}</span>
          <span className="oc-practice-next-title">{nextDrill.title}</span>
          <ArrowRight size={18} aria-hidden/>
        </Link> : <p className="oc-practice-next oc-practice-next-done">Every drill is done. Redo any of them from the full list.</p>}
        <div className="oc-practice-links">
          <Link to={url('practice')}><DrillGlyph size={20}/><strong>All drills</strong><span>{drillsDone} of {drillTotal} done</span></Link>
          <Link to={url('tools')}><CardsGlyph size={20}/><strong>Flashcards</strong><span>Rules and indicator words</span></Link>
        </div>
      </li>
    </ol>
  </div>;
}

/** Real question count for a drill, from whichever bank authored it. */
function drillQuestionCount(id: string) {
  return (getSourceWorksheetDrill(id) ?? getAndOrDrill(id) ?? fullCourseDrillSets.find(set => set.id === id))?.items.length;
}

/** Status words only where they say something: untouched is the quiet default. */
function QuietStatus({ status }: { status?: string }) {
  if (status === 'done') return <span className="oc-path-status" data-status="done"><Check size={13} aria-hidden/>Done</span>;
  if (status === 'started') return <span className="oc-path-status" data-status="started">In progress</span>;
  return null;
}

const stepAction = (step: OpeningCourseStep, status?: string) => `${status === 'done' ? 'Review' : status === 'started' ? 'Continue' : 'Start'} ${step.type === 'drill' ? 'drill' : `lesson ${step.lessonNumber}`}`;

/**
 * Steps in course order as stations on one line. One step is open as a raised card at a time:
 * the next step by default, any other on click.
 */
function CoursePath({ steps, url, label, laterLabel = 'Later in this chapter' }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; label: string; laterLabel?: string }) {
  const saved = useCourseProgress()?.steps ?? {};
  const next = steps.find(step => required(step) && saved[step.id]?.status !== 'done');
  // The page's hero already starts the next step, so no card opens until the student picks one.
  const [openId, setOpenId] = useState<string | undefined>();
  const nextStarted = next && saved[next.id]?.status === 'started';
  const nextIndex = next ? steps.indexOf(next) : steps.length;
  return <ol className="oc-path" aria-label={label}>{steps.map((step, index) => {
    const status = saved[step.id]?.status;
    const isNext = step.id === next?.id;
    const open = step.id === openId;
    const state = status === 'done' ? 'done' : isNext ? 'next' : index < nextIndex ? 'open' : 'ahead';
    const drill = step.type === 'drill';
    const count = drill ? drillQuestionCount(step.id) : undefined;
    const body = <>
      <span className="oc-path-kicker">{drill ? 'Drill' : `Lesson ${step.lessonNumber}`}{step.requiredForEditionCompletion === false && ' · Optional'}{count ? ` · ${count} questions` : ''}</span>
      <span className="oc-path-title">{step.title}</span>
      {!drill && step.description && <span className="oc-path-summary">{step.description}</span>}
    </>;
    return <li key={step.id} className="oc-path-step" data-kind={step.type} data-state={state}>
      <span className="oc-path-station" aria-hidden>{status === 'done' ? <Check size={drill ? 12 : 16}/> : drill ? <DrillGlyph size={14}/> : step.lessonNumber}</span>
      {open ? <div className="oc-path-next">
        <button type="button" className="oc-path-next-head" aria-expanded="true" onClick={() => setOpenId(undefined)}>
          <span className="oc-path-next-flag">{isNext ? (nextStarted ? 'Pick up here' : 'Start here') : status === 'done' ? 'Done' : status === 'started' ? 'In progress' : index < nextIndex ? 'Not finished' : laterLabel}</span>
          {body}
        </button>
        <Link className="oc-path-next-go" to={url(step.id, drill && status === 'started')}>{stepAction(step, status)}<ArrowRight size={16} aria-hidden/></Link>
      </div> : <button type="button" className="oc-path-row" aria-expanded="false" onClick={() => setOpenId(step.id)}>
        <span className="oc-path-text">{body}</span>
        <QuietStatus status={status}/>
        <ChevronDown size={16} aria-hidden className="oc-path-arrow"/>
      </button>}
    </li>;
  })}</ol>;
}

/** Every drill, grouped by chapter, with the next one raised at the top. */
function PracticePage({ steps, url, recordedPractice }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; recordedPractice?: ReactNode }) {
  const saved = useCourseProgress()?.steps ?? {};
  const drills = steps.filter(step => step.type === 'drill');
  const counted = drills.filter(required);
  const done = counted.filter(step => saved[step.id]?.status === 'done').length;
  const next = counted.find(step => saved[step.id]?.status !== 'done');
  const started = next && saved[next.id]?.status === 'started';
  const parts = [...new Set(drills.map(step => step.part ?? 1))];
  const allParts = [...new Set(steps.map(step => step.part ?? 1))];
  const count = next ? drillQuestionCount(next.id) : undefined;
  const slice = next && allParts.length > 1 ? allParts.indexOf(next.part ?? 1) / (allParts.length - 1) : 0.5;
  return <div className="oc-course-index oc-chapter-page oc-practice-page">
    <section className="oc-chapter-hero oc-practice-hero" style={{ '--slice': slice, '--p': counted.length ? done / counted.length : 0 } as CSSProperties} aria-label="Practice drills">
      <span className="oc-chapter-hero-art" aria-hidden/>
      <div className="oc-chapter-hero-body">
        <div data-course-heading>
          <p className="oc-chapter-hero-label">{done} of {counted.length} drills done</p>
          <h1>Practice drills</h1>
        </div>
        {next ? <>
          <p className="oc-chapter-hero-summary">{started ? 'Pick up where you left off' : 'Next'}: <strong>{next.title}</strong>, Chapter {next.part ?? 1}{count ? `, ${count} questions` : ''}.</p>
          <Link className="oc-hero-go" to={url(next.id, started)}>{started ? 'Continue' : 'Start'} drill<ArrowRight size={17} aria-hidden/></Link>
        </> : <p className="oc-chapter-hero-summary">Every drill is done. Open any of them below to redo it.</p>}
      </div>
    </section>
    {parts.map(part => {
      const chapterDrills = drills.filter(step => (step.part ?? 1) === part);
      return <section key={part} className="oc-practice-chapter" aria-label={`Chapter ${part} drills`}>
        <h2><span>Chapter {part}</span>{chapterTitles[part]}</h2>
        <CoursePath steps={chapterDrills} url={url} label={`Chapter ${part} drills in order`} laterLabel="Later drill"/>
      </section>;
    })}
    {recordedPractice}
  </div>;
}

function ChapterPage({ part, steps, url }: { part: number; steps: OpeningCourseStep[]; url: OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps ?? {};
  const chapter = steps.filter(step => (step.part ?? 1) === part);
  if (!chapter.length) return <div className="oc-course-note" data-course-heading><h1>This chapter is not available here.</h1><Link to={url('home')}>Return home</Link></div>;
  const parts = [...new Set(steps.map(step => step.part ?? 1))];
  const slice = parts.length > 1 ? parts.indexOf(part) / (parts.length - 1) : 0.5;
  const counted = chapter.filter(required);
  const doneCount = counted.filter(step => saved[step.id]?.status === 'done').length;
  const next = chapter.find(step => required(step) && saved[step.id]?.status !== 'done');
  const nextStarted = next && saved[next.id]?.status === 'started';

  return <div className="oc-course-index oc-chapter-page">
    <Link className="oc-back oc-chapter-back" to={url('home')}><ArrowLeft size={15} aria-hidden/>Home</Link>
    <section className="oc-chapter-hero" style={{ '--slice': slice, '--p': counted.length ? doneCount / counted.length : 0 } as CSSProperties} aria-label={`Chapter ${part}`}>
      <span className="oc-chapter-hero-art" aria-hidden/>
      <span className="oc-chapter-hero-num" aria-hidden>{part}</span>
      <div className="oc-chapter-hero-body">
        <div data-course-heading>
          <p className="oc-chapter-hero-label">Chapter {part}</p>
          <h1>{chapterTitles[part]}</h1>
        </div>
        {chapterSummaries[part] && <p className="oc-chapter-hero-summary">{chapterSummaries[part]}</p>}
        <div className="oc-chapter-hero-progress"><VolumeProgress chapter={chapter} next={next}/><span>{doneCount === counted.length ? 'Every lesson and drill done' : `${doneCount} of ${counted.length} done`}</span></div>
        {next && <Link className="oc-hero-go" to={url(next.id, next.type === 'drill' && nextStarted)}>{stepAction(next, saved[next.id]?.status)}<ArrowRight size={17} aria-hidden/></Link>}
      </div>
    </section>
    <CoursePath steps={chapter} url={url} label={`Chapter ${part} in order`}/>
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

/** Lessons 2.1 and 2.2 render straight from the AND/OR lesson module. Every lesson shares one header. */
const FOCUSED_LESSONS = ['and-or-both-or-either', 'and-or-either-condition'];

function CourseScreen({ view, run, url, steps, recordedPractice, storageScope }: {
  view: string; run: boolean; url: OpeningCourseUrl; steps: OpeningCourseStep[]; recordedPractice?: ReactNode; storageScope?: string;
}) {
  const [params] = useSearchParams();
  const skillActivity = (view === 'practice' || view === 'tools') && params.has('activity');
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
  const chapterPart = chapterFromView(view);
  const allParts = [...new Set(steps.map(step => step.part ?? 1))];
  const chapterCount = allParts.length;
  const isIndex = ['lessons', 'labs', 'practice', 'home'].includes(view) || chapterPart !== undefined;
  return <div ref={root} className={`oc-course-screen${view === 'foundation-practice' ? ' d1-screen' : ''}`}>
    {view === 'home' && <CourseHome steps={steps} url={url}/>}
    {chapterPart !== undefined && <ChapterPage key={chapterPart} part={chapterPart} steps={steps} url={url}/>}
    {skillActivity && <SkillPracticeHub steps={steps} url={url} storageScope={storageScope ?? progress?.storageScope}/>}
    {view === 'practice' && !skillActivity && <><PracticePage steps={steps} url={url} recordedPractice={recordedPractice}/><SkillPracticeLinks steps={steps} url={url}/></>}
    {isIndex && view !== 'home' && view !== 'practice' && chapterPart === undefined && <div className="oc-course-index">
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
    {view === 'tools' && !skillActivity && <><FlashcardTools url={url} storageScope={storageScope ?? progress?.storageScope ?? 'anonymous'} allowed={[...(steps.some(step => step.unitId === 'orientation' || step.unitId === 'sufficient-necessary') ? ['foundation'] : []), ...(steps.some(step => step.unitId === 'group-1' || step.id === 'sufficient') ? ['group-1'] : []), ...(steps.some(step => step.unitId === 'group-2' || step.id === 'necessary') ? ['group-2'] : [])]}/><SkillPracticeLinks steps={steps} url={url} cardsOnly/></>}
    {projected && current && <section className="oc-course-note" data-course-heading><p className="oc-label">Completed earlier</p><h1>{current.title}</h1><p>Your completed work from the earlier course counts here. Open a new attempt to revise it.</p><button className="oc-action" onClick={() => progress?.resume?.(current.id)}>Resume and revise</button><Link className="oc-back" to={url('lessons')}>Return to course</Link></section>}
    {!projected && current?.type === 'drill' && !run && <DrillEntry step={current} url={url} storageScope={storageScope}/>}
    {!projected && current && (current.type === 'note' || run) && <div className={current.type === 'note' ? 'oc-course-note' : 'oc-drill-run-header'}>
      <div data-course-heading>{current.type === 'note' ? <header className="mb-10">
        {current.lessonNumber && <p className={chapterCount > 1 ? 'oc-label oc-crumb' : 'oc-label'}>{chapterCount > 1
          ? <><Link to={url(chapterView(current.part ?? 1))}>Chapter {current.part ?? 1}: {chapterTitles[current.part ?? 1]}</Link><span aria-hidden>›</span></>
          : `Chapter ${current.part ?? 1} · `}Lesson {current.lessonNumber}{current.requiredForEditionCompletion === false && ' · Optional'}</p>}
        <h1 className="font-mc-serif text-ink leading-[0.94] italic text-[clamp(3.1rem,7vw,6rem)] font-medium tracking-[-0.06em]">{current.title}</h1>
        <p className="font-mc-sans text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">{current.id === 'necessary' ? <strong>{current.description}</strong> : current.description}</p>
      </header> : <header><p className="oc-label">{openingDrillNumber(current.id) ? `Drill ${openingDrillNumber(current.id)}` : 'Practice'}</p><h1>{current.title}</h1></header>}</div>
      {current.type === 'drill' && <Link className="oc-back oc-drill-back" to={url(view)}>Back to instructions</Link>}
    </div>}
    <div className="oc-course-bodies">{steps.filter(step => visited.includes(step.id) && !progress?.priorCompletion?.[step.id]).map(step => <div key={step.id} hidden={step.id !== view || (step.type === 'drill' && !run)} className={step.id === 'foundation-practice' ? 'oc-course-body d1-body' : 'oc-course-body co-opening cr-sequence'}><CourseFlashcardUrl.Provider value={url}><CourseBody step={step} url={url} storageScope={storageScope ?? progress?.storageScope}/></CourseFlashcardUrl.Provider></div>)}</div>
    {!projected && current?.type === 'note' && <LessonSkillLinks lessonId={current.id} steps={steps} url={url}/>}
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
