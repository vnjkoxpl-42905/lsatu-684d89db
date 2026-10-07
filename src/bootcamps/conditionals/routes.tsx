import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, RotateCcw } from 'lucide-react';
import { conditionalUnits, findConditionalUnit, getConditionalQuestions } from './content';
import { findLegacyConditionalQuestion } from './content/legacyQuestions';
import { DIFFICULTIES, type ConditionalArea, type ConditionalDifficulty, type ConditionalQuestion, type ConditionalUnit } from './content/types';
import { attemptSummary, elapsedSeconds, emptyDraft, markConditionalLessonRead, newRun, nextUncheckedQuestionIndex, reconcileConditionalRun, reviewedConditionalLessonCount, type AnswerDraft, type ConditionalProgress, type ConditionalRun } from './progress';
import { needsExpandedConditionalLessonReview, CONDITIONAL_OPENING_UNIT_IDS } from './openingRevision';
import { useConditionalProgress } from './useConditionalProgress';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';
import { conditionalAssignmentAllowsAction, type ResolvedConditionalAssignment as ConditionalAssignment } from './assignments';
import { ConditionalLessonNote } from './components/ConditionalLessonNote';
import { OpeningCourseNavigation, OpeningCourseScreen, type OpeningCourseUrl } from './components/OpeningCourse';
import { OPENING_COURSE_PATH, openingCourseStep, openingStepAccessUnits } from './openingCoursePath';

const BASE = '/bootcamp/conditionals';
const names: Record<ConditionalArea, string> = { understanding: 'Understand the rule', translation: 'Translate the language', linking: 'Link the rules', inference: 'Draw conclusions', complex: 'Handle complex rules', application: 'Apply to LR', quantifiers: 'Some, most, and all' };

const Context = createContext<ReturnType<typeof useConditionalProgress> | null>(null);
function useCourse() { const value = useContext(Context); if (!value) throw new Error('Conditional course provider is missing'); return value; }

type NextStep = { mode: 'learn' | 'practice'; unitId?: string; label: string; difficulty: ConditionalDifficulty; phase: ConditionalUnit['phase'] };
type PathSelection = { allowedUnits?: string[]; assignmentId?: string; practiceOnly?: boolean; scope: 'course' | 'area' | 'skill' | 'practice'; area?: ConditionalArea; unitId?: string; start?: string; assignedLevel?: boolean; difficulty: ConditionalDifficulty; phase?: ConditionalUnit['phase'] };
const WorkContext = createContext<{ selection: PathSelection; assignments: ConditionalAssignment[]; active?: ConditionalAssignment; isAdmin: boolean } | null>(null);
function useWork() { const value = useContext(WorkContext); if (!value) throw new Error('Conditional work provider missing'); return value; }
function useSelection() { return useWork().selection; }
function selectedUnits(selection: PathSelection) {
  return getCurriculumUnits(conditionalUnits, selection.start).filter(unit => (!selection.allowedUnits || selection.allowedUnits.includes(unit.id)) && (!selection.area || unit.area === selection.area) && (!(selection.scope === 'skill' || selection.scope === 'practice') || !selection.unitId || unit.id === selection.unitId));
}
function assignmentSelection(assignment: ConditionalAssignment): PathSelection {
  const target = assignment.target;
  return { allowedUnits: assignment.unitIds, assignmentId: assignment.id, practiceOnly: assignment.mode === 'practice',
    scope: target.scope === 'skill' ? 'skill' : target.scope === 'area' ? 'area' : target.scope === 'general' ? 'practice' : 'course',
    unitId: target.scope === 'skill' ? target.unitId : undefined,
    area: target.area, phase: target.area === 'quantifiers' ? 'quantifier' : 'conditional', assignedLevel: !!assignment.difficulty, difficulty: assignment.difficulty ?? 'beginner' };
}
function difficultyFrom(params: URLSearchParams): ConditionalDifficulty {
  const value = params.get('pathLevel') ?? params.get('level');
  return DIFFICULTIES.includes(value as ConditionalDifficulty) ? value as ConditionalDifficulty : 'beginner';
}
function pathSelection(params: URLSearchParams, practiceOnly = false): PathSelection {
  const area = params.get('area') as ConditionalArea | null;
  const unitId = params.get('unit') ?? undefined;
  const phase = params.get('phase') === 'quantifier' ? 'quantifier' : 'conditional';
  const explicitPath = params.get('path');
  return { scope: practiceOnly && !explicitPath ? 'practice' : explicitPath === 'course' ? 'course' : explicitPath === 'area' || (!explicitPath && area) ? 'area' : unitId ? 'skill' : 'course',
    area: area ?? undefined, unitId, start: params.get('start') ?? undefined, assignedLevel: explicitPath !== 'course' && (params.has('level') || params.has('pathLevel')), difficulty: difficultyFrom(params), phase };
}
function nextSelectedStep(progress: ConditionalProgress, units: ConditionalUnit[], selection: PathSelection): NextStep | null {
  const selectedUnits = getCurriculumUnits(units, selection.start).filter(unit => (!selection.allowedUnits || selection.allowedUnits.includes(unit.id)) && (!(selection.scope === 'skill' || selection.scope === 'practice') || !selection.unitId || unit.id === selection.unitId) && (!selection.area || unit.area === selection.area) &&
    (selection.scope !== 'practice' || selection.unitId || selection.area || unit.phase === selection.phase));
  for (const unit of selectedUnits) {
    const difficulty = selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit);
    if (selection.scope !== 'practice' && !selection.practiceOnly) {
      if (!progress.lessons[unit.id]) return { mode: 'learn', unitId: unit.id, label: `Learn: ${unit.title}`, difficulty, phase: unit.phase };
      if (!progress.attempts.some(attempt => attempt.questionId === unit.guidedExample.id)) return { mode: 'learn', unitId: unit.id, label: `Guided activity: ${unit.title}`, difficulty, phase: unit.phase };
    }
    if (unit.drills[difficulty].some(question => !progress.attempts.some(attempt => attempt.questionId === question.id && attempt.difficulty === difficulty))) {
      return { mode: 'practice', unitId: unit.id, label: `Skill drill: ${unit.title}`, difficulty, phase: unit.phase };
    }
  }
  return null;
}
function nextStepUrl(next: NextStep, selection: PathSelection) {
  const params = new URLSearchParams({ phase: next.phase });
  if (selection.assignmentId) params.set('assignment', selection.assignmentId);
  if (selection.assignedLevel) params.set('level', next.difficulty);
  if (selection.start) params.set('start', selection.start);
  if (selection.scope === 'course') params.set('path', 'course');
  else if (selection.scope !== 'practice' && !selection.practiceOnly) { params.set('path', selection.scope); if (selection.assignedLevel) params.set('pathLevel', selection.difficulty); }
  if (selection.area) params.set('area', selection.area);
  if (next.unitId) params.set('unit', next.unitId);
  const route = next.mode === 'learn' ? `${BASE}/${next.label.startsWith('Guided activity:') ? 'activities' : 'lessons'}/${next.unitId}` : `${BASE}/practice`;
  return `${route}?${params}`;
}
function pathUrl(selection: PathSelection) {
  const params = new URLSearchParams();
  if (selection.assignmentId) params.set('assignment', selection.assignmentId);
  if (selection.scope === 'skill' && selection.unitId) { params.set('path', 'skill'); params.set('unit', selection.unitId); }
  if (selection.start) params.set('start', selection.start);
  if (selection.area) params.set('area', selection.area);
  if (selection.assignedLevel) params.set('level', selection.difficulty);
  return params.size ? `${BASE}?${params}` : BASE;
}
function RecommendedForward({ selection }: { selection?: PathSelection }) {
  const { savedProgress, status } = useCourse();
  const currentSelection = useSelection();
  const target = selection ?? currentSelection;
  const next = savedProgress ? nextSelectedStep(savedProgress, conditionalUnits, target) : null;
  return <div className="cb-card"><span className="cb-label">Recommended next step</span>
    <h2>{next ? next.label : 'You have worked through the selected steps.'}</h2>
    {status !== 'saved' && <p className="cb-muted">Your next step updates after your latest work is saved.</p>}
    {next ? <Link className="cb-button cb-primary" to={nextStepUrl(next, target)}>Continue: {next.label} <ArrowRight size={16} /></Link>
      : <Link className="cb-button" to={pathUrl(target)}>Return to your work</Link>}
  </div>;
}

export function ConditionalBootcampRoutes({ userId, isAdmin = false, assignments = [] }: { userId: string; isAdmin?: boolean; assignments?: ConditionalAssignment[] }) {
  const course = useConditionalProgress(userId);
  const [params] = useSearchParams();
  const location = useLocation();
  const pathUnit = location.pathname.match(/\/(?:lessons|activities)\/([^/]+)/)?.[1];
  const openingStep = openingCourseStep(location.pathname.match(/\/opening\/([^/]+)/)?.[1]);
  const requestedUnit = openingStep?.unitId ?? pathUnit ?? params.get('unit');
  const requestedAction = openingStep ? openingStep.type === 'note' ? 'lesson' : 'guided' : location.pathname.includes('/lessons/') ? 'lesson' : location.pathname.includes('/activities/') ? 'guided' : 'practice';
  const matching = requestedUnit ? assignments.find(item => (openingStep ? openingStepAccessUnits(openingStep) : [requestedUnit]).some(unitId => conditionalAssignmentAllowsAction(item, { unitId, action: requestedAction, difficulty: params.has('level') ? difficultyFrom(params) : item.difficulty ?? getCurriculumDifficulty(unitId) }))) : undefined;
  const active = params.has('assignment') ? assignments.find(item => item.id === params.get('assignment')) : matching ?? assignments[0];
  const selection = isAdmin ? pathSelection(params, /\/(practice|simulator|hard-sentences)$/.test(location.pathname)) : active ? assignmentSelection(active) : { scope: 'course' as const, allowedUnits: [], difficulty: 'beginner' as const };
  return <Context.Provider value={course}><WorkContext.Provider value={{ selection, assignments, active, isAdmin }}><Routes><Route element={<Shell />}>
    <Route index element={<LearningPath />} />
    <Route path="lessons" element={<OpeningCourseRoute view="lessons"/>} />
    <Route path="opening/:stepId" element={<OpeningCourseRoute/>} />
    <Route path="opening-practice" element={<OpeningCourseRoute view="practice"/>} />
    <Route path="opening-labs" element={<OpeningCourseRoute view="labs"/>} />
    <Route path="opening-tools" element={<OpeningCourseRoute view="tools"/>} />
    <Route path="lessons/:unitId" element={<ActionGate action="lesson"><Lesson /></ActionGate>} />
    <Route path="activities/:unitId" element={<ActionGate action="guided"><GuidedActivity /></ActionGate>} />
    <Route path="practice" element={<ActionGate action="practice"><Practice /></ActionGate>} />
    <Route path="simulator" element={<ActionGate action="practice"><Practice simulator /></ActionGate>} />
    <Route path="hard-sentences" element={<ActionGate action="practice"><Practice hardLanguage /></ActionGate>} />
    <Route path="reference" element={<Reference />} />
    <Route path="indicators" element={<Reference indicators />} />
    <Route path="flashcards" element={<ActionGate action="practice"><Flashcards /></ActionGate>} />
    <Route path="diagnostics" element={<Diagnostics />} />
    <Route path="review" element={<Diagnostics review />} />
    <Route path="journal" element={<Journal />} />
    <Route path="settings" element={<Settings />} />
    <Route path="*" element={<Navigate to={BASE} replace />} />
  </Route></Routes></WorkContext.Provider></Context.Provider>;
}
function ActionGate({ action, children }: { action: 'lesson' | 'guided' | 'practice'; children: React.ReactNode }) {
  const { isAdmin, active, selection } = useWork();
  const { unitId } = useParams();
  const [params] = useSearchParams();
  const requestedUnit = unitId ?? params.get('unit');
  const explicitLevel = params.get('level');
  const location = useLocation();
  const requestedDifficulty = location.pathname.endsWith('/hard-sentences') ? 'advanced' : explicitLevel ? difficultyFrom(params) : active?.difficulty ?? getCurriculumDifficulty(requestedUnit ?? '');
  const permitted = !!active && (requestedUnit
    ? conditionalAssignmentAllowsAction(active, { unitId: requestedUnit, action, difficulty: requestedDifficulty })
    : action === 'practice' && active.mode === 'practice' && (active.target.scope === 'skill' || active.target.scope === 'area' || active.target.scope === 'general') &&
      (!params.get('area') || params.get('area') === active.target.area) && (!explicitLevel || explicitLevel === active.difficulty) &&
      (!location.pathname.endsWith('/hard-sentences') || active.difficulty === 'advanced'));

  return isAdmin || permitted ? <>{children}</> : <div className="cb-card"><h1>This activity is not available here.</h1><Link className="cb-button" to={pathUrl(selection)}>Return to your work</Link></div>;
}

function actionUrl(unit: ConditionalUnit, action: 'lesson' | 'guided' | 'practice' | 'repair', selection: PathSelection) {
  const params = new URLSearchParams();
  if (selection.assignmentId) params.set('assignment', selection.assignmentId);
  if (selection.assignedLevel) params.set('level', selection.difficulty);
  if (selection.start) params.set('start', selection.start);
  if (selection.area) params.set('area', selection.area);
  params.set('path', selection.scope === 'practice' ? 'skill' : selection.scope);
  if (selection.assignedLevel && selection.scope !== 'course') params.set('pathLevel', selection.difficulty);
  if (action === 'practice' || selection.scope === 'skill') params.set('unit', unit.id);
  const route = action === 'practice' ? 'practice' : action === 'guided' ? `activities/${unit.id}` : `lessons/${unit.id}`;
  return `${BASE}/${route}?${params}${action === 'repair' ? '#repair' : ''}`;
}
function UnitActions({ unit, selection }: { unit: ConditionalUnit; selection: PathSelection }) {
  if (selection.practiceOnly) return null;
  return <nav className="cb-unit-actions" aria-label={`${unit.title} actions`}>
    {([['lesson', '1. Learn'], ['guided', '2. Guided activity'], ['practice', '3. Skill drill'], ['repair', '4. Review the move']] as const).map(([action, label]) => <Link key={action} to={actionUrl(unit, action, selection)}>{label}</Link>)}
  </nav>;
}
function courseUrl(search: string): OpeningCourseUrl {
  return (destination, run = false) => {
    const params = new URLSearchParams(search);
    params.delete('run');
    if (run) params.set('run', '1');
    const route = destination === 'lessons' ? 'lessons' : destination === 'practice' ? 'opening-practice' : destination === 'labs' ? 'opening-labs' : destination === 'tools' ? 'opening-tools' : `opening/${destination}`;
    const query = params.toString();
    return `${BASE}/${route}${query ? `?${query}` : ''}`;
  };
}

function OpeningCourseRoute({ view: surface }: { view?: string }) {
  const { stepId } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const { isAdmin, active, selection } = useWork();
  const steps = OPENING_COURSE_PATH.filter(step => isAdmin || !!active && openingStepAccessUnits(step).some(unitId => conditionalAssignmentAllowsAction(active, {
    unitId, action: step.type === 'note' ? 'lesson' : 'guided', difficulty: active.difficulty ?? getCurriculumDifficulty(unitId),
  })));
  const units = selectedUnits(selection).filter(unit => CONDITIONAL_OPENING_UNIT_IDS.some(id => id === unit.id));
  const recordedPractice = <section className="cb-card"><h2>Your assigned skill drills</h2><p>These drills record your responses and reasoning in your existing work.</p><div className="cb-actions">{units.filter(unit => isAdmin || !!active && conditionalAssignmentAllowsAction(active, { unitId: unit.id, action: 'practice', difficulty: active.difficulty ?? getCurriculumDifficulty(unit) })).map(unit => <Link key={unit.id} className="cb-button" to={actionUrl(unit, 'practice', selection)}>{unit.title}<ArrowRight size={16}/></Link>)}</div></section>;
  return <OpeningCourseScreen view={surface ?? stepId} run={params.get('run') === '1'} url={courseUrl(location.search)} steps={steps} recordedPractice={recordedPractice}/>;
}

function Shell() {
  const { status, error, retry, progress } = useCourse();
  const selection = useSelection();
  const location = useLocation();
  const [params] = useSearchParams();
  const [referenceOpen, setReferenceOpen] = useState(false);
  const currentId = location.pathname.match(/\/(?:lessons|activities)\/([^/]+)/)?.[1] ?? params.get('unit');
  const current = selectedUnits(selection).find(unit => unit.id === currentId);
  const courseView = location.pathname.includes('/opening/') ? location.pathname.split('/opening/')[1] : location.pathname.endsWith('/opening-practice') ? 'practice' : location.pathname.endsWith('/opening-labs') ? 'labs' : location.pathname.endsWith('/opening-tools') ? 'tools' : 'lessons';
  const openingSurface = /^\/(?:lessons\/?|opening\/[^/]+\/?|opening-(?:practice|labs|tools)\/?)$/.test(location.pathname.slice(BASE.length));
  const saveMessages = {
    saved: openingSurface ? 'Assigned work saved to your account' : 'Saved to your account',
    loading: openingSurface ? 'Loading your saved assigned work...' : 'Loading your saved work...',
    saving: openingSurface ? 'Saving your assigned work...' : 'Saving your changes...',
    unsaved: openingSurface ? 'Assigned work waiting to save' : 'Changes waiting to save',
    error: openingSurface ? 'Assigned work is not saved' : 'Changes are not saved',
  };
  return <div className="cb-shell oc-workspace"><OpeningCourseNavigation view={courseView} url={courseUrl(location.search)}/>
    <main className="cb-main" id="conditional-main"><header className="cb-workspace-bar"><Link to={pathUrl(selection)}>Assigned work</Link><Link to={`${BASE}/review${location.search}`}>Review attempts</Link><Link to={`${BASE}/journal${location.search}`}>Journal</Link><button onClick={() => setReferenceOpen(true)}><BookOpen size={16} /> Open reference</button><div className="cb-save" role="status">{saveMessages[status]}</div></header>{error && <div className="cb-error" role="alert"><p>{error}</p>{progress ? <button onClick={() => void retry()}>Retry save</button> : <button onClick={() => window.location.reload()}>Reload saved work</button>}</div>}{progress ? <Outlet /> : !error && <p>Loading your work...</p>}</main><Dialog open={referenceOpen} onOpenChange={setReferenceOpen}><DialogContent className="mc-bootcamp conditional-bootcamp cb-reference-dialog" aria-describedby={undefined}><DialogTitle>{current?.title ?? 'Keep the reasoning close'}</DialogTitle>{current ? <><ol>{current.method.map(step => <li key={step}>{step}</li>)}</ol><p>{current.commonMistake.repair}</p><div className="cb-result">{current.workedExample.conclusion}</div></> : <p>Open a skill to keep its method and common mistake beside your work.</p>}<Link to={`${BASE}/reference${location.search}`} onClick={() => setReferenceOpen(false)}>Complete reference</Link></DialogContent></Dialog></div>;
}

function LearningPath() {
  const location = useLocation();
  const { selection, active, assignments, isAdmin } = useWork();
  const { savedProgress } = useCourse();
  const next = savedProgress ? nextSelectedStep(savedProgress, conditionalUnits, selection) : null;
  if (!isAdmin && !active) return <div className="cb-card"><h1>No conditional work is available yet.</h1><Link to="/classroom">Back to Classroom</Link></div>;
  const unit = next?.unitId ? findConditionalUnit(next.unitId) : undefined;
  const entryParams = new URLSearchParams(location.search);
  if (selection.assignmentId) entryParams.set('assignment', selection.assignmentId);
  return <><section className="cb-current-work"><span className="cb-label">Conditional Logic</span><h1>{unit?.title ?? 'You finished this work.'}</h1><p>{unit?.goal ?? 'Return to your attempts to review the reasoning, or revisit this work.'}</p>{next && <Link className="cb-button cb-primary" to={next.mode === 'learn' && !next.label.startsWith('Guided') && CONDITIONAL_OPENING_UNIT_IDS.some(id => id === next.unitId) ? courseUrl(entryParams.toString())('lessons') : nextStepUrl(next, selection)}>{next.mode === 'practice' ? 'Continue practice' : next.label.startsWith('Guided') ? 'Continue activity' : 'Begin lesson'} <ArrowRight size={16} /></Link>}{!next && <Link className="cb-button" to={`${BASE}/review${selection.assignmentId ? `?assignment=${selection.assignmentId}` : ''}`}>Review your attempts</Link>}</section>{assignments.length > 1 && !isAdmin && <section className="cb-other-work"><h2>Your other work</h2>{assignments.filter(item => item.id !== active?.id).map(item => <p key={item.id}><Link to={`${BASE}?assignment=${encodeURIComponent(item.id)}`}>{item.title}</Link></p>)}</section>}</>;
}

function Lesson() {
  const { unitId } = useParams();
  const location = useLocation();
  const { selection } = useWork();
  const unit = findConditionalUnit(unitId ?? '');
  const { progress, update } = useCourse();
  useEffect(() => {
    if (unit && location.hash === '#repair') document.getElementById('repair')?.scrollIntoView({ block: 'start' });
  }, [unit, location.hash, location.key]);
  if (!unit) return <h1>Lesson not found</h1>;
  const target = { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit) };
  const units = selectedUnits(selection);
  const previous = units[units.indexOf(unit) - 1];
  return <ConditionalLessonNote unit={unit} reviewed={!!progress.lessons[unit.id] && !needsExpandedConditionalLessonReview(progress.lessons, unit.id)} onComplete={() => update(prior => markConditionalLessonRead(prior, unit.id))} continueHref={actionUrl(unit, 'guided', target)} previousHref={previous ? actionUrl(previous, 'lesson', target) : undefined} />;
}

function GuidedActivity() {
  const { unitId } = useParams();
  const unit = findConditionalUnit(unitId ?? '');
  const activeSelection = useSelection();
  if (!unit) return <><h1>Activity not found</h1><Link to={BASE}>Return to your work</Link></>;
  const selection = { ...activeSelection, difficulty: activeSelection.assignedLevel ? activeSelection.difficulty : getCurriculumDifficulty(unit) };
  return <><PageHeader className="cb-page-header" eyebrow="Guided reasoning activity" title={`${unit.title}: make the move yourself.`} description={unit.goal} /><UnitActions unit={unit} selection={selection} /><div className="cb-card"><h2>Identify. Build. Test. Repair.</h2><p>Use the method to produce your reasoning before judging an answer. Keep the reference open when you need it.</p><QuestionRunner guidedMethod={unit.method} forwardSelection={selection} runKey={`guided:${unit.id}`} questions={[{ ...unit.guidedExample, unitId: unit.id, unitTitle: unit.title, difficulty: 'beginner' }]} /></div><Link className="cb-button" to={actionUrl(unit, 'lesson', selection)}><ArrowLeft size={16} /> Previous action: lesson</Link><Link className="cb-button cb-primary" to={actionUrl(unit, 'practice', selection)}>Next action: skill drill <ArrowRight size={16} /></Link></>;
}

type PracticeQuestion = ConditionalQuestion & { unitId: string; unitTitle: string; difficulty: ConditionalDifficulty };
function ExpandedLessonReview({ questions, selection }: { questions: PracticeQuestion[]; selection: PathSelection }) {
  const { progress } = useCourse();
  const { active, isAdmin } = useWork();
  if (selection.practiceOnly) return null;
  const unitIds = new Set(questions.map(question => question.unitId));
  const units = conditionalUnits.filter(unit => unitIds.has(unit.id) && CONDITIONAL_OPENING_UNIT_IDS.some(id => id === unit.id)
    && needsExpandedConditionalLessonReview(progress.lessons, unit.id)
    && (isAdmin || (active && conditionalAssignmentAllowsAction(active, { unitId: unit.id, action: 'lesson', difficulty: selection.difficulty }))));
  return units.length ? <div className="cb-actions">{units.map(unit => <Link key={unit.id} className="cb-button" to={actionUrl(unit, 'lesson', selection)}>Review expanded lesson: {unit.title}</Link>)}</div> : null;
}
function Practice({ simulator = false, hardLanguage = false }: { simulator?: boolean; hardLanguage?: boolean }) {
  const [params] = useSearchParams();
  const activeWork = useSelection();
  const unitId = params.get('unit') ?? activeWork.unitId;
  const unit = findConditionalUnit(unitId ?? '');
  const activeSelection = useSelection();
  const selection = unit ? { ...activeSelection, difficulty: activeSelection.assignedLevel ? activeSelection.difficulty : getCurriculumDifficulty(unit) } : activeSelection;
  const difficulty = hardLanguage ? 'advanced' : selection.difficulty;
  const area = selection.area ?? (hardLanguage ? 'translation' : undefined);
  const phase = selection.phase ?? 'conditional';
  const questions = getConditionalQuestions({ difficulty, ...(unitId ? { unitId } : {}), ...(area ? { area: area as ConditionalArea } : {}), ...(!unitId && !area ? { phase } : {}) }).filter(question => !selection.allowedUnits || selection.allowedUnits.includes(question.unitId));
  return <><span className="cb-label">{simulator ? 'Mixed application' : 'Skill drill'}</span><h1>{unit ? unit.title : area ? names[area as ConditionalArea] : 'Put your conditional reasoning to work.'}</h1><p>Write or diagram first. Then check the answer and repair your reasoning. Use a hint or worked explanation when you need help.</p>{unit && <UnitActions unit={unit} selection={selection} />}{questions.length ? <div className="cb-card"><QuestionRunner key={`${difficulty}:${unitId ?? area ?? phase}`} runKey={`practice:${difficulty}:${unitId ?? area ?? phase}`} questions={questions} hideSkill={simulator} forwardSelection={{ ...selection, difficulty, area: area as ConditionalArea | undefined, unitId, phase }} /></div> : <div className="cb-card"><p>This practice set is unavailable. Return to your work to open the lesson or activity.</p><Link to={pathUrl(selection)}>Return to your work</Link></div>}</>;
}

function nextAvailableQuestionIndex(run: ConditionalRun, questions: PracticeQuestion[], attempts: ConditionalProgress['attempts'], after = -1): number {
  const availableIds = new Set(questions.map(question => question.id));
  const questionIds = run.questionIds.filter(id => availableIds.has(id));
  const visibleAfter = questionIds.filter(id => run.questionIds.indexOf(id) <= after).length - 1;
  const index = nextUncheckedQuestionIndex({ ...run, questionIds }, attempts, visibleAfter);
  return index < 0 ? -1 : run.questionIds.indexOf(questionIds[index]);
}

function QuestionRunner({ runKey, questions, hideSkill = false, forwardSelection, guidedMethod }: { runKey: string; questions: PracticeQuestion[]; hideSkill?: boolean; forwardSelection?: PathSelection; guidedMethod?: string[] }) {
  const { progress, update } = useCourse();
  const selection = useSelection();
  const assignmentId = (forwardSelection ?? selection).assignmentId;
  const assignmentRunKey = `${runKey}:${assignmentId ? `assignment:${encodeURIComponent(assignmentId)}` : 'repeat'}`;
  const activeRunKey = progress.runs[assignmentRunKey] ? assignmentRunKey : runKey;
  const run = progress.runs[activeRunKey];
  const [timerNow, setTimerNow] = useState(Date.now());
  useEffect(() => {
    if (run && reconcileConditionalRun(run, questions, progress.attempts) === run) return;
    update(previous => {
      const savedRun = previous.runs[activeRunKey];
      const nextRun = savedRun ? reconcileConditionalRun(savedRun, questions, previous.attempts) : newRun(questions.map(question => question.id));
      return nextRun === savedRun ? previous : { ...previous, runs: { ...previous.runs, [activeRunKey]: nextRun } };
    });
  }, [run, activeRunKey, questions, progress.attempts, update]);
  const replaceRun = (transform: (value: ConditionalRun) => ConditionalRun) => update(previous => ({ ...previous, runs: { ...previous.runs, [activeRunKey]: transform(previous.runs[activeRunKey]) } }));
  const startAssignmentSet = () => update(previous => {
    const priorAssignmentRun = previous.runs[assignmentRunKey];
    return { ...previous, runs: { ...previous.runs,
      ...(priorAssignmentRun ? { [`${assignmentRunKey}:history:${priorAssignmentRun.id}`]: priorAssignmentRun } : {}),
      [assignmentRunKey]: newRun(questions.map(question => question.id)) } };
  });
  const timerStartedAt = run?.timerStartedAt;
  useEffect(() => {
    if (!timerStartedAt) return;
    const timer = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [timerStartedAt]);
  if (!run) return <p>Preparing your practice...</p>;
  if (reconcileConditionalRun(run, questions, progress.attempts) !== run) return <p>Preparing your practice...</p>;
  const availableIds = new Set(questions.map(question => question.id));
  const visibleIds = run.questionIds.filter(id => availableIds.has(id));
  const currentIndex = run.finished ? -1 : availableIds.has(run.questionIds[run.index]) ? run.index : nextAvailableQuestionIndex(run, questions, progress.attempts);
  const question = questions.find(item => item.id === run.questionIds[currentIndex]);
  const activeIds = new Set(visibleIds);
  const attempts = progress.attempts.filter(item => item.id.startsWith(`${run.id}:`) && activeIds.has(item.questionId));
  const expandedLessonReview = !guidedMethod && <ExpandedLessonReview questions={questions} selection={forwardSelection ?? selection} />;
  if (!question) {
    const summary = attemptSummary(attempts);
    return <>{expandedLessonReview}<h2>{visibleIds.length ? 'You finished this set.' : 'This assignment has a different practice set.'}</h2><p>{summary.correct} correct out of {summary.total} checked answers. {summary.assisted} used a hint or explanation before checking.</p><p>Revisit the reasoning, then continue with the next activity. Finishing a set does not certify mastery. Your previous written work and attempts stay saved when you start another set.</p><div className="cb-actions"><Link className="cb-button" to={`${BASE}/review${pathUrl(forwardSelection ?? pathSelection(new URLSearchParams())).replace(BASE, '')}`}>Review your attempts</Link><button onClick={startAssignmentSet}><RotateCcw size={16} /> {assignmentId ? "Start this assignment's set" : 'Repeat this set'}</button></div><RecommendedForward selection={forwardSelection} /></>;
  }
  const draft = run.drafts[question.id] ?? emptyDraft();
  const nextIndex = nextAvailableQuestionIndex(run, questions, progress.attempts, currentIndex);
  const advance = () => update(previous => {
    const currentRun = previous.runs[activeRunKey];
    const nextAvailable = nextAvailableQuestionIndex(currentRun, questions, previous.attempts, currentIndex);
    const index = nextAvailable >= 0 ? nextAvailable : nextUncheckedQuestionIndex(currentRun, previous.attempts);
    return { ...previous, runs: { ...previous.runs, [activeRunKey]: { ...currentRun, index: index < 0 ? currentRun.questionIds.length : index, finished: index < 0, elapsed: elapsedSeconds(currentRun), timerStartedAt: currentRun.timerStartedAt && nextAvailable >= 0 ? new Date().toISOString() : null } } };
  });
  const changeDraft = (patch: Partial<AnswerDraft>) => replaceRun(value => ({ ...value, index: currentIndex, drafts: { ...value.drafts, [question.id]: { ...(value.drafts[question.id] ?? emptyDraft()), ...patch } } }));
  const checkAnswer = () => update(previous => {
    const currentRun = previous.runs[activeRunKey];
    const currentDraft = currentRun.drafts[question.id] ?? emptyDraft();
    if (currentDraft.checked || currentDraft.choice === null) return previous;
    const attempt = { id: `${currentRun.id}:${question.id}`, questionId: question.id, unitId: question.unitId, difficulty: question.difficulty, choice: currentDraft.choice, correct: currentDraft.choice === question.answerIndex, hint: currentDraft.hint, explanationBeforeCheck: currentDraft.revealed, working: currentDraft.working, checkedAt: new Date().toISOString() };
    return { ...previous, attempts: [...previous.attempts, attempt], runs: { ...previous.runs, [activeRunKey]: { ...currentRun, index: currentIndex, drafts: { ...currentRun.drafts, [question.id]: { ...currentDraft, checked: true, revealed: true } } } } };
  });
  return <>{expandedLessonReview}<div className="cb-actions"><span className="cb-label">{visibleIds.indexOf(question.id) + 1} / {visibleIds.length} · {guidedMethod ? 'Guided activity' : "Skill drill"}</span>{question.difficulty !== 'beginner' && <><button onClick={() => { replaceRun(value => ({ ...value, timerEnabled: true })); setTimerNow(Date.now()); replaceRun(value => value.timerStartedAt ? { ...value, elapsed: elapsedSeconds(value), timerStartedAt: null } : { ...value, timerStartedAt: new Date().toISOString() }); }}><Clock size={16} /> {run.timerStartedAt ? 'Pause timing' : 'Start optional timing'}</button>{run.timerEnabled && <span aria-label="Elapsed time">{Math.floor(elapsedSeconds(run, timerNow) / 60)}:{String(elapsedSeconds(run, timerNow) % 60).padStart(2, '0')}</span>}</>}</div>{!hideSkill && <p className="cb-muted">{question.unitTitle}</p>}<h3>{question.prompt}</h3>{guidedMethod && <div className="cb-reason"><h4>Build your response in these steps</h4><ol>{guidedMethod.map(step => <li key={step}>{step}</li>)}</ol><p>Identify the conditions. Draw the relationship. Test what follows, then explain why the tempting alternative fails.</p></div>}<label htmlFor={`working-${question.id}`}>Write your diagram or reasoning first. Arrows such as A → B are welcome.</label><textarea id={`working-${question.id}`} value={draft.working} onChange={event => changeDraft({ working: event.target.value })} placeholder="What is given? What follows? Show the direction and each step." /><p className="cb-muted">Your written work is saved for comparison. It is not automatically graded.</p>{draft.working.trim() || draft.revealed ? <div className="cb-options" role="group" aria-label="Answer choices">{question.options.map((option, index) => <button key={index} aria-pressed={draft.choice === index} disabled={draft.checked} onClick={() => changeDraft({ choice: index })}>{String.fromCharCode(65 + index)}. {option}</button>)}</div> : <p className="cb-muted">Add your reasoning to see the answer choices, or open the explanation if you need help getting started.</p>}<div className="cb-actions"><button onClick={() => changeDraft({ hint: true })}>Get a hint</button><button onClick={() => changeDraft({ revealed: true })}>Show worked explanation</button><button className="cb-primary" disabled={draft.choice === null || draft.checked} onClick={checkAnswer}>{draft.checked ? 'Answer checked' : 'Check answer'}</button></div>{draft.hint && <div className="cb-reason"><strong>Hint: </strong>{question.hint}</div>}{draft.revealed && <div className="cb-result">{draft.checked && <h3>{draft.choice === question.answerIndex ? 'Your choice is correct.' : 'Review the reasoning.'}</h3>}<p><strong>Answer: </strong>{question.options[question.answerIndex]}</p><ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol>{question.explanation !== question.reasoningSteps.join(' ') && <p>{question.explanation}</p>}<p className="cb-muted">Compare your written work with these steps. A matching choice alone does not show whether your diagram was right.</p></div>}{draft.checked && <button className="cb-primary" onClick={advance}>{nextIndex < 0 ? 'Finish set' : 'Next question'} <ArrowRight size={16} /></button>}</>;
}

function Reference({ indicators = false }: { indicators?: boolean }) {
  const selection = useSelection();
  const scoped = selectedUnits(selection);
  const units = indicators ? scoped.filter(unit => /group [1-4]/i.test(unit.title)) : scoped;
  return <><span className="cb-label">Keep the reasoning close</span><h1>{indicators ? 'Four language groups. One direction to preserve.' : 'Your conditional reference.'}</h1><p>{indicators ? 'An indicator helps identify the relation. Preserve the complete condition and check what the sentence actually says.' : 'Review the method, a worked example, and the mistake to avoid. Open the lesson or practice the exact skill.'}</p>{units.map(unit => <section className="cb-card" key={unit.id}><h2>{unit.title}</h2><p>{unit.goal}</p><ol>{unit.method.map((step, index) => <li key={index}>{step}</li>)}</ol><div className="cb-reason"><p>{unit.workedExample.statements.join(' ')}</p><strong>{unit.workedExample.conclusion}</strong></div><p><strong>Watch for: </strong>{unit.commonMistake.mistake}</p><p>{unit.commonMistake.repair}</p><div className="cb-actions">{!selection.practiceOnly && <Link className="cb-button" to={actionUrl(unit, 'lesson', { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit) })}>Full lesson</Link>}<Link className="cb-button" to={actionUrl(unit, 'practice', { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit) })}>Practice this skill</Link></div></section>)}</>;
}

function Flashcards() {
  const selection = useSelection();
  const area = selection.area;
  const level = selection.difficulty;
  const questions = getConditionalQuestions({ difficulty: level, ...(selection.unitId ? { unitId: selection.unitId } : {}), ...(area ? { area } : { phase: 'conditional' as const }) }).filter(question => !selection.allowedUnits || selection.allowedUnits.includes(question.unitId));
  return <><span className="cb-label">Recall before reveal</span><h1>Produce the rule before you recognize it.</h1><p>Write your answer, then reveal the explanation and compare. Hints and early reveals are recorded separately from correctness.</p><div className="cb-card"><QuestionRunner key={`${area}:${level}`} runKey={`flashcards:${selection.unitId ?? area ?? 'conditional'}:${level}`} questions={questions} forwardSelection={selection} /></div></>;
}

function Diagnostics({ review = false }: { review?: boolean }) {
  const { savedProgress } = useCourse();
  const selection = useSelection();
  const progress = savedProgress ? { ...savedProgress, lessons: Object.fromEntries(Object.entries(savedProgress.lessons).filter(([id]) => !selection.allowedUnits || selection.allowedUnits.includes(id))), attempts: savedProgress.attempts.filter(attempt => (!selection.allowedUnits || selection.allowedUnits.includes(attempt.unitId)) && (!selection.assignedLevel || attempt.difficulty === selection.difficulty)) } : null;
  if (!progress) return <p>Loading your recorded attempts...</p>;
  const summary = attemptSummary(progress.attempts);
  const misses = progress.attempts.filter(attempt => !attempt.correct || attempt.hint || attempt.explanationBeforeCheck);
  return <><span className="cb-label">Based on your saved work</span><h1>{review ? 'Return to the reasoning.' : 'See what your practice shows.'}</h1><p>Correctness, assistance, and lesson review tell different stories. These are your recorded attempts, not a placement score or an automatic mastery label.</p><div className="cb-card cb-summary"><div><strong>{summary.total}</strong>Checked answers</div><div><strong>{summary.correct}</strong>Correct choices</div><div><strong>{summary.assisted}</strong>Assisted answers</div><div><strong>{reviewedConditionalLessonCount(progress.lessons)}</strong>Lessons reviewed</div></div>{!review && <div className="cb-scroll"><table className="cb-table"><thead><tr><th>Skill</th><th>Checked</th><th>Correct</th><th>Assisted</th><th>Work on it</th></tr></thead><tbody>{selectedUnits(selection).map(unit => { const stats = attemptSummary(progress.attempts.filter(item => item.unitId === unit.id)); return <tr key={unit.id}><td>{unit.title}</td><td>{stats.total}</td><td>{stats.correct}</td><td>{stats.assisted}</td><td><Link to={actionUrl(unit, 'practice', { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit) })}>Practice</Link></td></tr>; })}</tbody></table></div>}{review && (misses.length ? [...misses].reverse().map(attempt => {
    const unit = findConditionalUnit(attempt.unitId);
    const question = (unit?.guidedExample.id === attempt.questionId ? unit.guidedExample : unit?.drills[attempt.difficulty].find(item => item.id === attempt.questionId)) ?? findLegacyConditionalQuestion(attempt.questionId);
    return <article className="cb-card" key={attempt.id}><span className="cb-label">{attempt.correct ? 'Correct with assistance' : 'Missed choice'}</span><h2>{unit?.title ?? attempt.unitId}</h2>{question ? <><p>{question.prompt}</p><p><strong>Your answer: </strong>{attempt.choice === null ? 'No choice' : question.options[attempt.choice]}</p><p><strong>Your working: </strong>{attempt.working || 'No written work saved'}</p><div className="cb-result"><strong>Answer: </strong>{question.options[question.answerIndex]}<ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol>{question.explanation !== question.reasoningSteps.join(' ') && <p>{question.explanation}</p>}</div></> : <p>The authored question is unavailable. Your attempt remains recorded.</p>}<Link className="cb-button" to={unit ? actionUrl(unit, 'practice', { ...selection, difficulty: attempt.difficulty }) : pathUrl(selection)}>Practice the skill again</Link></article>;
  }) : <div className="cb-card"><p>No missed or assisted attempts yet. Work through a guided example or a practice set to start your review record.</p><Link to={BASE}>Open the learning path</Link></div>)}</>;
}

function Journal() {
  const { progress, update } = useCourse();
  return <><span className="cb-label">Make the correction reusable</span><h1>Your reasoning journal.</h1><p>Record the rule you misread, why your first move failed, and what you will check next time. Your account keeps these notes.</p><label htmlFor="conditional-journal">My conditional notes</label><textarea id="conditional-journal" style={{ minHeight: 360 }} value={progress.journal} onChange={event => update(previous => ({ ...previous, journal: event.target.value }))} placeholder="I read... I first concluded... The rule actually requires... Next time I will check..." /></>;
}
function Settings() {
  const { progress, update } = useCourse();
  return <><h1>Choose how you study.</h1><div className="cb-card"><label><input type="checkbox" checked={progress.settings.showMethod} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, showMethod: event.target.checked } }))} /> Show the method checklist in each lesson</label><p>The reference always keeps the complete method. Each assigned medium or advanced run has its own optional stopwatch, with no time penalty or locked advancement.</p><Link className="cb-button" to={`${BASE}/reference`}><BookOpen size={16} /> Open reference</Link></div></>;
}
