import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Home, Menu } from 'lucide-react';
import { CardsGlyph, DrillGlyph } from './CourseGlyphs';
import { CourseProgressProvider, useCourseProgress, useDeviceCourseProgress, type CourseProgressStore } from '../courseProgress';
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
import { ConditionalFilters } from './ConditionalFilters';
import { parseCourseListFilters, filterCourseSteps, courseChapterProgress, courseStepStatus, courseStepLink, courseListUrl, type CourseListFilters } from '../courseNavigation';
import { relevantCourseCardLinks } from '../courseCardLinks';
import { CourseBrowseHeader, CourseBrowseNavigation } from './CourseBrowseNavigation';
import { courseBrowseUrl } from '../courseBrowse';
import './opening-course.css';
import './course-browse-list.css';

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

function CourseIndexFilters({ steps, url, destination, filters, content = true, browseKind }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; destination: string; filters: CourseListFilters; content?: boolean; browseKind?: CourseListFilters['content'] }) {
  const navigate = useNavigate();
  if (!steps.length) return null;
  const parts = [...new Set(steps.map(step => step.part ?? 1))];
  const change = (patch: Partial<CourseListFilters>) => {
    const next = { ...filters, ...patch, ...(!content ? { content: browseKind ?? 'all' as const } : {}) };
    const target = browseKind && 'chapter' in patch ? patch.chapter ? chapterView(patch.chapter) : browseKind === 'drills' ? 'practice' : 'lessons' : destination.startsWith('chapter-') && 'chapter' in patch ? patch.chapter ? chapterView(patch.chapter) : 'lessons' : destination;
    navigate(courseListUrl(url, target, next));
  };
  const active = [filters.chapter, filters.status !== 'all', content && filters.content !== 'all'].filter(Boolean).length;
  return <ConditionalFilters summary={browseKind ? filters.status === 'all' ? 'All progress' : filters.status === 'completed' ? 'Completed' : filters.status === 'in-progress' ? 'In progress' : 'Not started' : active ? `${active} active` : 'All available work'} className="oc-index-filters">
    <label>Chapter<select value={filters.chapter ?? ''} onChange={event => change({ chapter: event.target.value ? Number(event.target.value) : undefined })}><option value="">All chapters</option>{parts.map(part => <option key={part} value={part}>Chapter {part}: {chapterTitles[part]}</option>)}</select></label>
    {content && <label>Show<select value={filters.content} onChange={event => change({ content: event.target.value as CourseListFilters['content'] })}><option value="all">Lessons and drills</option><option value="lessons">Lessons</option><option value="drills">Drills</option></select></label>}
    <label>Progress<select value={filters.status} onChange={event => change({ status: event.target.value as CourseListFilters['status'] })}><option value="all">All progress</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
    <button type="button" className="oc-filter-reset" onClick={() => navigate(courseListUrl(url, destination, browseKind ? { chapter:filters.chapter, content:browseKind } : {}))}>Reset filters</button>
  </ConditionalFilters>;
}

function EmptyCourseList({ url, destination, availableCount, resetHref }: { url: OpeningCourseUrl; destination: string; availableCount: number; resetHref?:string }) {
  if (!availableCount) return <div className="oc-index-empty" role="status"><p>No work is available in this assignment.</p></div>;
  return <div className="oc-index-empty" role="status"><p>No work matches these filters.</p><Link to={resetHref ?? courseListUrl(url, destination)}>Reset filters</Link></div>;
}

function CourseHome({ steps, url }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl }) {
  const [params] = useSearchParams();
  const filters = parseCourseListFilters(params, steps);
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
    <section className="oc-hero" aria-label={!counted.length ? 'Optional course work' : next ? 'Next step' : 'Course complete'}>
      <div className="oc-hero-art" aria-hidden/>
      <div className="oc-hero-main">
        <div data-course-heading className="oc-hero-head">
          <h1>Conditional reasoning</h1>
          {counted.length ? <p role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={counted.length} aria-valuenow={done} aria-valuetext={`${done} of ${counted.length} steps done`}>{done} of {counted.length} steps done</p> : <p>Optional · No required steps</p>}
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
          <p className="oc-hero-kicker">{counted.length ? 'Course complete' : 'Optional practice'}</p>
          <h2>{counted.length ? 'Every step is done.' : 'Choose what to work on.'}</h2>
          <p className="oc-hero-summary">{counted.length ? 'Open any chapter to review a lesson or redo a drill.' : 'Open a chapter to choose a lesson or drill. This work has no required steps.'}</p>
        </>}
      </div>
      {next && herePart !== undefined && <Link className="oc-hero-place" to={url(chapterView(herePart))}>
        <span className="oc-hero-place-label">Your place</span>
        <span className="oc-hero-place-count"><strong>{pad(hereDone)}</strong><span>/{pad(hereSteps.length)}</span></span>
        <span className="oc-hero-place-chapter">Chapter {herePart}<span>{chapterTitles[herePart]}</span></span>
      </Link>}
    </section>
    <nav className="oc-home-shortcuts" aria-label="Browse the bootcamp"><Link to={courseListUrl(url, 'lessons', { content:'lessons' })}>All lessons</Link><Link to={url('practice')}>All course drills</Link><Link to={url('centre')}>Practice centre</Link><Link to={url('tools')}>All flashcards</Link></nav>
    <div className="oc-home-section-row"><h2 className="oc-home-section">Chapters</h2><CourseIndexFilters steps={steps} url={url} destination="home" filters={filters} content={false}/></div>
    <ol className="oc-volumes">
      {parts.filter(part => (!filters.chapter || part === filters.chapter) && (filters.status === 'all' || courseChapterProgress(steps.filter(step => (step.part ?? 1) === part), saved).status === filters.status)).map((part) => {
        const index = parts.indexOf(part);
        const chapter = counted.filter(step => (step.part ?? 1) === part);
        const doneHere = chapter.filter(isDone).length;
        const complete = chapter.length > 0 && doneHere === chapter.length;
        const here = part === herePart;
        const all = steps.filter(step => (step.part ?? 1) === part);
        const lessonCount = all.filter(step => step.type === 'note').length;
        // Name the next step only where the student has begun, so an untouched chapter reads as a choice, not a queue.
        const chapterNext = doneHere > 0 || here ? chapter.find(step => !isDone(step)) : undefined;
        const summary = courseChapterProgress(all, saved);
        const cards = relevantCourseCardLinks(all, steps, url);
        return <li key={part} className="oc-topic-card" aria-label={`Chapter ${part}: ${chapterTitles[part]}`}>
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
          <div className="oc-topic-work">
            <p className="oc-topic-counts">{summary.lessonsDone} of {summary.lessonTotal} required lessons · {summary.drillsDone} of {summary.drillTotal} required drills</p>
            {summary.requiredTotal > 0 ? <div className="oc-topic-progress" role="progressbar" aria-label={`Chapter ${part} completion`} aria-valuemin={0} aria-valuemax={summary.requiredTotal} aria-valuenow={summary.requiredDone} aria-valuetext={`${summary.requiredDone} of ${summary.requiredTotal} required steps completed`}><span style={{ width:`${summary.percent}%` }}/></div> : <p className="oc-topic-counts">Optional · No required steps</p>}
            <nav className="oc-topic-actions" aria-label={`Chapter ${part} activities`}>
              {all.some(step => step.type === 'note') && <Link aria-label={`Chapter ${part}: ${chapterTitles[part]} lessons`} to={courseListUrl(url, chapterView(part), { chapter:part, content:'lessons' })}>Lessons<ArrowRight size={14} aria-hidden/></Link>}
              {all.some(step => step.type === 'drill') && <Link aria-label={`Chapter ${part}: ${chapterTitles[part]} drills`} to={courseListUrl(url, chapterView(part), { chapter:part, content:'drills' })}>Drills<ArrowRight size={14} aria-hidden/></Link>}
              {cards.length > 0 && <Link aria-label={`Chapter ${part}: ${chapterTitles[part]} flashcards`} to={courseBrowseUrl(url, 'flashcards', part)}>Flashcards<ArrowRight size={14} aria-hidden/></Link>}
            </nav>
            {lessonCount > 0 && <details className="oc-topic-lessons"><summary>Lesson progress<span>{all.filter(step => step.type === 'note' && saved[step.id]?.status === 'done').length} of {lessonCount}</span></summary><ol>{all.filter(step => step.type === 'note').map(lesson => <li key={lesson.id}><Link to={courseStepLink(lesson, saved[lesson.id], url).href}><span>{lesson.lessonNumber} {lesson.title}{!required(lesson) && ' · Optional'}</span><span className="oc-lesson-state" data-status={courseStepStatus(saved[lesson.id])}>{courseStepStatus(saved[lesson.id]) === 'completed' ? <><Check size={13} aria-hidden/>Completed</> : courseStepStatus(saved[lesson.id]) === 'in-progress' ? 'In progress' : 'Not started'}</span></Link></li>)}</ol></details>}
          </div>
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
          <Link to={url('centre')}><DrillGlyph size={20}/><strong>Practice centre</strong><span>All conditional activities</span></Link>
          <Link to={url('practice')}><DrillGlyph size={20}/><strong>All drills</strong><span>{drillsDone} of {drillTotal} done</span></Link>
          <Link to={url('tools')}><CardsGlyph size={20}/><strong>Flashcards</strong><span>Rules and indicator words</span></Link>
        </div>
      </li>
    </ol>
    {!parts.some(part => (!filters.chapter || part === filters.chapter) && (filters.status === 'all' || courseChapterProgress(steps.filter(step => (step.part ?? 1) === part), saved).status === filters.status)) && <EmptyCourseList url={url} destination="home" availableCount={steps.length}/>}
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

/** Direct destinations in course order, with saved status and context announced separately. */
function CoursePath({ steps, url, label, browse = false }: { steps: OpeningCourseStep[]; url: OpeningCourseUrl; label: string; browse?: boolean }) {
  const pathId = useId();
  const saved = useCourseProgress()?.steps ?? {};
  const next = steps.find(step => required(step) && saved[step.id]?.status !== 'done');
  return <ol className={`oc-path${browse ? " oc-browse-list" : ""}`} aria-label={label}>{steps.map(step => {
    const status = saved[step.id]?.status;
    const drill = step.type === 'drill';
    const count = drill ? drillQuestionCount(step.id) : undefined;
    const target = courseStepLink(step, saved[step.id], url);
    const detailsId = `${pathId}-${step.id}-details`;
    const descriptionId = `${pathId}-${step.id}-description`;
    const statusId = `${pathId}-${step.id}-status`;
    return <li key={step.id} className="oc-path-step" data-kind={step.type} data-state={status === 'done' ? 'done' : step.id === next?.id ? 'next' : 'ahead'}>
      <span className="oc-path-station" aria-hidden>{status === 'done' ? <Check size={drill ? 12 : 16}/> : drill ? <DrillGlyph size={14}/> : step.lessonNumber}</span>
      <Link className="oc-path-row" to={target.href} aria-label={`${target.label}: ${step.title}`} aria-describedby={[detailsId, step.description ? descriptionId : '', statusId].filter(Boolean).join(' ')}>
        <span className="oc-path-text"><span id={detailsId} className="oc-path-kicker">{drill ? `Drill${openingDrillNumber(step.id) ? ` ${openingDrillNumber(step.id)}` : ''}` : `Lesson ${step.lessonNumber}`}{!required(step) && ' · Optional'}{count ? ` · ${count} questions` : ''}</span><span className="oc-path-title">{step.title}</span>{step.description && <span id={descriptionId} className="oc-path-summary">{step.description}</span>}</span>
        <span id={statusId}>{status === 'done' || status === 'started' ? drill && status === 'started' && saved[step.id]?.total ? <span className="oc-path-status">{Math.min(99, Math.round((saved[step.id]?.done ?? 0) / saved[step.id]!.total! * 100))}% complete</span> : <QuietStatus status={status}/> : <span className={browse ? 'oc-path-status' : 'sr-only'}>Not started</span>}</span>{browse && <span className="oc-browse-row-action" aria-hidden>{target.label.split(' ')[0]}</span>}<ArrowRight size={16} aria-hidden className="oc-path-arrow"/>
      </Link>
    </li>;
  })}</ol>;
}

function BrowseProgress({ steps, chapter }: { steps:OpeningCourseStep[]; chapter?:number }) {
  const saved = useCourseProgress()?.steps ?? {};
  const summary = courseChapterProgress(steps, saved);
  const name = chapter ? `Chapter ${chapter} completion` : 'Course completion';
  return <div className="oc-browse-summary" role="group" aria-label={name}>
    <span>{chapter ? 'Chapter progress' : 'Course progress'} · {summary.requiredTotal ? <>{summary.requiredDone} of {summary.requiredTotal} required steps done <strong>{summary.percent}% complete</strong></> : 'Optional · No required steps'}</span>
    {summary.requiredTotal > 0 && <div className="oc-topic-progress" role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.percent} aria-valuetext={`${summary.percent}% complete, ${summary.requiredDone} of ${summary.requiredTotal} steps done`}><span style={{width:`${summary.percent}%`}}/></div>}
  </div>;
}

function BrowseNext({ steps, url, kind }: { steps:OpeningCourseStep[]; url:OpeningCourseUrl; kind:CourseListFilters['content'] }) {
  const saved = useCourseProgress()?.steps ?? {};
  if (!steps.length) return null;
  const counted = steps.filter(required);
  const next = counted.find(step => saved[step.id]?.status !== 'done');
  const noun = kind === 'lessons' ? 'lessons' : kind === 'drills' ? 'drills' : 'steps';
  if (!counted.length) return <p className="oc-browse-finished">No required {noun} in this view. The work below is optional.</p>;
  if (!next) return <p className="oc-browse-finished">All required {noun} in this view are complete. Choose one below to review.</p>;
  const target = courseStepLink(next, saved[next.id], url);
  return <Link className="oc-browse-continue" to={target.href}><span><span className="oc-browse-next-label">Next {next.type === 'note' ? 'lesson' : 'drill'}</span><strong>{next.title}</strong></span><span className="oc-browse-next-action">{target.label}<ArrowRight size={16} aria-hidden/></span></Link>;
}

/** The same chapter scope and list treatment for every type of course work. */
function CourseBrowsePage({ steps, url, chapter, kind, status, recordedPractice }: { steps:OpeningCourseStep[]; url:OpeningCourseUrl; chapter?:number; kind:CourseListFilters['content']; status:CourseListFilters['status']; recordedPractice?:ReactNode }) {
  const saved = useCourseProgress()?.steps ?? {};
  const chapterSteps = chapter ? steps.filter(step => (step.part ?? 1) === chapter) : steps;
  const scope = chapterSteps.filter(step => kind === 'all' || step.type === (kind === 'lessons' ? 'note' : 'drill'));
  const filters = { chapter,content:kind,status };
  const visible = filterCourseSteps(scope,saved,filters);
  const title = chapter ? chapterTitles[chapter] : kind === 'drills' ? 'Drills' : kind === 'lessons' ? 'Lessons' : 'Lessons and drills';
  const destination = chapter ? chapterView(chapter) : kind === 'drills' ? 'practice' : 'lessons';
  const noun = kind === 'lessons' ? 'lessons' : kind === 'drills' ? 'drills' : 'steps';
  const description = kind === 'lessons' ? 'Read the lesson, then switch to Drills to practise the skill.' : kind === 'drills' ? 'Choose an exercise and put the rule to work.' : 'Lessons and drills in course order.';
  const parts = [...new Set(visible.map(step => step.part ?? 1))];
  return <div className="oc-course-index oc-browse">
    <Link className="oc-back" to={url('home')}><ArrowLeft size={15} aria-hidden/>Home</Link>
    <section aria-label={chapter ? `Chapter ${chapter}` : kind === 'drills' ? 'Practice drills' : 'Lessons'}>
      <CourseBrowseHeader title={title} eyebrow={chapter ? `Chapter ${chapter}` : undefined} description={description}/>
      <BrowseProgress steps={chapterSteps} chapter={chapter}/>
      <div className="oc-browse-toolbar"><CourseBrowseNavigation url={url} chapter={chapter} active={kind}/><CourseIndexFilters steps={steps.filter(step => kind === 'all' || step.type === (kind === 'lessons' ? 'note' : 'drill'))} url={url} destination={destination} filters={filters} content={false} browseKind={kind}/></div>
      <BrowseNext steps={scope} url={url} kind={kind}/>
    </section>
    <p className="oc-browse-results" role="status">{visible.length} {noun}{status !== 'all' ? ` · ${status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In progress' : 'Not started'}` : ''}</p>
    {chapter ? <CoursePath browse steps={visible} url={url} label={`Chapter ${chapter} in order`}/> : parts.map(part => <section key={part} className="oc-browse-chapter" aria-label={`Chapter ${part}${kind === 'drills' ? ' drills' : ''}`}><h2><span className="oc-browse-chapter-number">Chapter {part}</span>{chapterTitles[part]}</h2><CoursePath browse steps={visible.filter(step => (step.part ?? 1) === part)} url={url} label={`Chapter ${part} ${noun} in order`}/></section>)}
    {!visible.length && (!scope.length && chapterSteps.length ? <p className="oc-index-empty" role="status">No {noun} are available in this view. Choose another type of work above.</p> : <EmptyCourseList url={url} destination={destination} availableCount={scope.length} resetHref={courseListUrl(url,destination,{chapter,content:kind})}/>)}
    {kind === 'drills' && recordedPractice}
  </div>;
}

function PracticePage({ steps, url, recordedPractice }: { steps:OpeningCourseStep[]; url:OpeningCourseUrl; recordedPractice?:ReactNode }) {
  const [params] = useSearchParams();
  const filters = parseCourseListFilters(params,steps);
  return <CourseBrowsePage steps={steps} url={url} chapter={filters.chapter} kind="drills" status={filters.status} recordedPractice={recordedPractice}/>;
}

function ChapterPage({ part, steps, url }: { part:number; steps:OpeningCourseStep[]; url:OpeningCourseUrl }) {
  const [params] = useSearchParams();
  const filters = parseCourseListFilters(params,steps);
  if (!steps.some(step => (step.part ?? 1) === part)) return <div className="oc-course-note" data-course-heading><h1>This chapter is not available here.</h1><Link to={url('home')}>Return home</Link></div>;
  const kind = params.get('courseContent') === 'all' ? 'all' : filters.content === 'drills' ? 'drills' : 'lessons';
  return <CourseBrowsePage steps={steps} url={url} chapter={part} kind={kind} status={filters.status}/>;
}

function CourseLessonIndex({ steps, url }: { steps:OpeningCourseStep[]; url:OpeningCourseUrl; view:string }) {
  const [params] = useSearchParams();
  const filters = parseCourseListFilters(params,steps);
  return <CourseBrowsePage steps={steps} url={url} chapter={filters.chapter} kind="lessons" status={filters.status}/>;
}

function RelatedCourseWork({ current, steps, url }: { current:OpeningCourseStep; steps:OpeningCourseStep[]; url:OpeningCourseUrl }) {
  const saved = useCourseProgress()?.steps ?? {};
  const drills = current.type === 'note' ? steps.filter(step => step.type === 'drill' && step.unitId === current.unitId && step.part === current.part) : [];
  const cards = relevantCourseCardLinks([current], steps, url, current.type === 'note' ? current.id : undefined);
  return <nav className="oc-related-work" aria-label="This topic"><Link to={courseListUrl(url, chapterView(current.part ?? 1), { chapter:current.part ?? 1, content:current.type === 'note' ? 'lessons' : 'drills' })}>Chapter {current.part ?? 1} {current.type === 'note' ? 'lessons' : 'drills'}</Link>{drills.map(drill => <Link key={drill.id} to={courseStepLink(drill,saved[drill.id],url).href}>{drill.title}</Link>)}{cards.length > 0 && <Link to={courseBrowseUrl(url, 'flashcards', current.part ?? 1, current.type === 'note' ? current.id : undefined)}>Flashcards for this topic</Link>}</nav>;
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
    {view === 'practice' && !skillActivity && <><PracticePage steps={steps} url={url} recordedPractice={recordedPractice}/><SkillPracticeLinks steps={steps} url={url} excludeCards/></>}
    {isIndex && view !== 'home' && view !== 'practice' && chapterPart === undefined && <CourseLessonIndex steps={list} url={url} view={view}/>}
    {view === 'tools' && !skillActivity && <><FlashcardTools url={url} authorizedSteps={steps} storageScope={storageScope ?? progress?.storageScope} allowed={[...(steps.some(step => step.unitId === 'orientation' || step.unitId === 'sufficient-necessary') ? ['foundation'] : []), ...(steps.some(step => step.unitId === 'group-1' || step.id === 'sufficient') ? ['group-1'] : []), ...(steps.some(step => step.unitId === 'group-2' || step.id === 'necessary') ? ['group-2'] : [])]}/></>}
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
    {current && (current.type === 'note' || !run) && <RelatedCourseWork current={current} steps={steps} url={url}/>}
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
