import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, RotateCcw } from 'lucide-react';
import { conditionalUnits, conditionalResources, findConditionalUnit, getConditionalQuestions } from './content';
import { DIFFICULTIES, type ConditionalArea, type ConditionalDifficulty, type ConditionalQuestion, type ConditionalUnit } from './content/types';
import { attemptSummary, elapsedSeconds, emptyDraft, newRun, type AnswerDraft, type ConditionalProgress, type ConditionalRun } from './progress';
import { useConditionalProgress } from './useConditionalProgress';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';

const BASE = '/bootcamp/conditionals';
const names: Record<ConditionalArea, string> = { understanding: 'Understand the rule', translation: 'Translate the language', linking: 'Link the rules', inference: 'Draw conclusions', complex: 'Handle complex rules', application: 'Apply to LR', quantifiers: 'Some, most, and all' };
const levelLabel = (value: ConditionalDifficulty) => `Level ${DIFFICULTIES.indexOf(value) + 1}`;
const indicatorStages: Record<string, string> = {
  'group-1': 'Group 1: Sufficient-condition indicators',
  'group-2': 'Group 2: Necessary-condition indicators',
  'group-3': 'Group 3: Negate the sufficient condition',
  'group-4': 'Group 4: Negate the necessary condition',
};
/** Presentation groups follow the authored sequence, including repeated areas. */
function teachingStages(units: ConditionalUnit[]) {
  const stages: { key: string; title: string; units: ConditionalUnit[] }[] = [];
  for (const unit of units) {
    const key = indicatorStages[unit.id] ? unit.id : unit.area;
    const previous = stages[stages.length - 1];
    if (previous?.key === key) previous.units.push(unit);
    else stages.push({ key, title: indicatorStages[unit.id] ?? names[unit.area], units: [unit] });
  }
  return stages;
}

const Context = createContext<ReturnType<typeof useConditionalProgress> | null>(null);
function useCourse() { const value = useContext(Context); if (!value) throw new Error('Conditional course provider is missing'); return value; }
function practiceUrl(unit?: string, difficulty: ConditionalDifficulty = 'beginner', area?: string) { const params = new URLSearchParams({ level: difficulty }); if (unit) params.set('unit', unit); if (area) params.set('area', area); return `${BASE}/practice?${params}`; }

type NextStep = { mode: 'learn' | 'practice'; unitId?: string; label: string; difficulty: ConditionalDifficulty; phase: ConditionalUnit['phase'] };
type PathSelection = { scope: 'course' | 'area' | 'skill' | 'practice'; area?: ConditionalArea; unitId?: string; start?: string; assignedLevel?: boolean; difficulty: ConditionalDifficulty; phase?: ConditionalUnit['phase'] };
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
  const selectedUnits = getCurriculumUnits(units, selection.start).filter(unit => (!(selection.scope === 'skill' || selection.scope === 'practice') || !selection.unitId || unit.id === selection.unitId) && (!selection.area || unit.area === selection.area) &&
    (selection.scope !== 'practice' || selection.unitId || selection.area || unit.phase === selection.phase));
  for (const unit of selectedUnits) {
    const difficulty = selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit);
    if (selection.scope !== 'practice') {
      if (!progress.lessons[unit.id]) return { mode: 'learn', unitId: unit.id, label: `Learn: ${unit.title}`, difficulty, phase: unit.phase };
      if (!progress.attempts.some(attempt => attempt.questionId === unit.guidedExample.id)) return { mode: 'learn', unitId: unit.id, label: `Guided activity: ${unit.title}`, difficulty, phase: unit.phase };
    }
    if (unit.drills[difficulty].some(question => !progress.attempts.some(attempt => attempt.questionId === question.id && attempt.difficulty === difficulty))) {
      return { mode: 'practice', unitId: unit.id, label: `${levelLabel(difficulty)} skill drill: ${unit.title}`, difficulty, phase: unit.phase };
    }
  }
  return null;
}
function nextStepUrl(next: NextStep, selection: PathSelection) {
  const params = new URLSearchParams({ phase: next.phase });
  if (selection.assignedLevel) params.set('level', next.difficulty);
  if (selection.start) params.set('start', selection.start);
  if (selection.scope === 'course') params.set('path', 'course');
  else if (selection.scope !== 'practice') { params.set('path', selection.scope); if (selection.assignedLevel) params.set('pathLevel', selection.difficulty); }
  if (selection.area) params.set('area', selection.area);
  if (next.unitId) params.set('unit', next.unitId);
  const route = next.mode === 'learn' ? `${BASE}/${next.label.startsWith('Guided activity:') ? 'activities' : 'lessons'}/${next.unitId}` : `${BASE}/practice`;
  return `${route}?${params}`;
}
function pathUrl(selection: PathSelection) {
  const params = new URLSearchParams();
  if (selection.scope === 'skill' && selection.unitId) { params.set('path', 'skill'); params.set('unit', selection.unitId); }
  if (selection.start) params.set('start', selection.start);
  if (selection.area) params.set('area', selection.area);
  if (selection.assignedLevel) params.set('level', selection.difficulty);
  return params.size ? `${BASE}?${params}` : BASE;
}
function RecommendedForward({ selection }: { selection?: PathSelection }) {
  const { savedProgress, status } = useCourse();
  const [params] = useSearchParams();
  const location = useLocation();
  const target = selection ?? pathSelection(params, /\/(practice|simulator|hard-sentences)$/.test(location.pathname));
  const next = savedProgress ? nextSelectedStep(savedProgress, conditionalUnits, target) : null;
  return <div className="cb-card"><span className="cb-label">Recommended next step</span>
    <h2>{next ? next.label : 'You have worked through the selected steps.'}</h2>
    {status !== 'saved' && <p className="cb-muted">Your recommendation updates after your latest work is saved.</p>}
    {next ? <Link className="cb-button cb-primary" to={nextStepUrl(next, target)}>Continue: {next.label} <ArrowRight size={16} /></Link>
      : <Link className="cb-button" to={pathUrl(target)}>Return to your curriculum</Link>}
  </div>;
}

export function ConditionalBootcampRoutes({ userId }: { userId: string }) {
  const course = useConditionalProgress(userId);
  return <Context.Provider value={course}><Routes><Route element={<Shell />}>
    <Route index element={<LearningPath />} />
    <Route path="lessons/:unitId" element={<Lesson />} />
    <Route path="activities/:unitId" element={<GuidedActivity />} />
    <Route path="practice" element={<Practice />} />
    <Route path="simulator" element={<Practice simulator />} />
    <Route path="hard-sentences" element={<Practice hardLanguage />} />
    <Route path="reference" element={<Reference />} />
    <Route path="indicators" element={<Reference indicators />} />
    <Route path="flashcards" element={<Flashcards />} />
    <Route path="diagnostics" element={<Diagnostics />} />
    <Route path="review" element={<Diagnostics review />} />
    <Route path="journal" element={<Journal />} />
    <Route path="settings" element={<Settings />} />
    <Route path="*" element={<Navigate to={BASE} replace />} />
  </Route></Routes></Context.Provider>;
}

function unitSelection(params: URLSearchParams, unit: ConditionalUnit): PathSelection {
  const selection = pathSelection(params);
  return { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(unit) };
}
function actionUrl(unit: ConditionalUnit, action: 'lesson' | 'guided' | 'practice' | 'repair', selection: PathSelection) {
  const params = new URLSearchParams();
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
  return <nav className="cb-unit-actions" aria-label={`${unit.title} actions`}>
    {([['lesson', '1. Learn'], ['guided', '2. Guided activity'], ['practice', `3. Skill drill · ${levelLabel(selection.difficulty)}`], ['repair', '4. Review the move']] as const).map(([action, label]) => <Link key={action} to={actionUrl(unit, action, selection)}>{label}</Link>)}
  </nav>;
}
function Shell() {
  const { status, error, retry, progress } = useCourse();
  const [params] = useSearchParams();
  const location = useLocation();
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(() => window.matchMedia ? window.matchMedia('(min-width: 641px)').matches : true);
  const currentId = location.pathname.match(/\/(?:lessons|activities)\/([^/]+)/)?.[1] ?? params.get('unit');
  const current = findConditionalUnit(currentId ?? '');
  const selection = pathSelection(params);
  const units = getCurriculumUnits(conditionalUnits, selection.start).filter(unit => (!selection.area || unit.area === selection.area) && (selection.scope !== 'skill' || !selection.unitId || unit.id === selection.unitId));
  const navigation = [['', 'Curriculum'], ['/review', 'Review attempts'], ['/diagnostics', 'Your progress'], ['/journal', 'Journal'], ['/settings', 'Settings']];
  return <div className="cb-shell"><aside className="cb-rail"><Link to="/classroom"><ArrowLeft size={14} style={{ display: 'inline' }} /> Classroom</Link><div className="cb-brand">Conditionals</div><p className="cb-muted">Understand each rule. Check what follows.</p><nav aria-label="Conditional bootcamp" className="cb-nav">{navigation.map(([route, label]) => <NavLink key={route} end={route === ''} to={route ? `${BASE}${route}${location.search}` : pathUrl(selection)}>{label}</NavLink>)}</nav><details className="cb-curriculum-rail" open={railOpen} onToggle={event => setRailOpen(event.currentTarget.open)}><summary>Teaching sequence</summary>{teachingStages(units).map((stage, stageIndex) => <section key={`${stage.key}:${stageIndex}`}><h3>{stage.title}</h3>{stage.units.map(unit => <div key={unit.id}><Link aria-current={currentId === unit.id ? 'step' : undefined} to={actionUrl(unit, 'lesson', unitSelection(params, unit))}>{progress?.lessons[unit.id] ? <Check size={12} /> : <span>{conditionalUnits.indexOf(unit) + 1}</span>}{unit.title}</Link>{currentId === unit.id && <UnitActions unit={unit} selection={unitSelection(params, unit)} />}</div>)}</section>)}</details></aside><main className="cb-main" id="conditional-main"><header className="cb-workspace-bar"><span className="cb-label">Conditional reasoning workspace</span><button onClick={() => setReferenceOpen(true)}><BookOpen size={16} /> Open reference</button><div className="cb-save" role="status">{status === 'saved' ? 'Saved to your account' : status === 'loading' ? 'Loading your saved work...' : status === 'saving' ? 'Saving your changes...' : status === 'unsaved' ? 'Changes waiting to save' : 'Changes are not saved'}</div></header>{error && <div className="cb-error" role="alert"><p>{error}</p>{progress ? <button onClick={() => void retry()}>Retry save</button> : <button onClick={() => window.location.reload()}>Reload saved work</button>}</div>}{progress ? <Outlet /> : !error && <p>Loading your learning path...</p>}</main><Dialog open={referenceOpen} onOpenChange={setReferenceOpen}><DialogContent className="mc-bootcamp conditional-bootcamp cb-reference-dialog" aria-describedby={undefined}><DialogTitle>{current?.title ?? 'Keep the reasoning close'}</DialogTitle>{current ? <><ol>{current.method.map(step => <li key={step}>{step}</li>)}</ol><p>{current.commonMistake.repair}</p><div className="cb-result">{current.workedExample.conclusion}</div></> : <p>Open a skill to keep its method and common mistake beside your work.</p>}<Link to={`${BASE}/reference${location.search}`} onClick={() => setReferenceOpen(false)}>Complete reference</Link><p><Link to={`${BASE}/indicators${location.search}`} onClick={() => setReferenceOpen(false)}>Groups 1–4 indicator reference</Link></p></DialogContent></Dialog></div>;
}
function LearningPath() {
  const [params] = useSearchParams();
  const { progress } = useCourse();
  const selection = pathSelection(params);
  const units = getCurriculumUnits(conditionalUnits, selection.start).filter(unit => (!selection.area || unit.area === selection.area) && (selection.scope !== 'skill' || !selection.unitId || unit.id === selection.unitId));
  return <><PageHeader className="cb-page-header" eyebrow="Your conditional curriculum" title="Conditional Logic" description="A conditional tells you what follows if a condition is met. Learn to translate that relationship, take its contrapositive, and link it with other rules." /><RecommendedForward selection={selection} /><p className="cb-muted">Learn the move, try it with guidance, complete its skill drill, then review how it works. Saved reviews and checked attempts record work completed. They do not certify mastery.</p>{(['conditional', 'quantifier'] as const).map(phase => {
    const phaseUnits = units.filter(unit => unit.phase === phase);
    if (!phaseUnits.length) return null;
    return <section key={phase}><h2>{phase === 'conditional' ? 'First, handle conditionals' : 'Next, work with quantities'}</h2>{phase === 'quantifier' && <p>After conditional rules, examine what some, most, and all establish and which conclusions they support.</p>}<div className="cb-sequence">{teachingStages(phaseUnits).map((stage, stageIndex) => <section key={`${stage.key}:${stageIndex}`} aria-label={stage.title}><h3>{stage.title}</h3>{stage.units.map(unit => { const target = unitSelection(params, unit); return <article key={unit.id} className="cb-card cb-path-step"><span className="cb-step-number">{conditionalUnits.indexOf(unit) + 1}</span><div><span className="cb-label">{names[unit.area]} · {levelLabel(target.difficulty)} activity</span><h3>{unit.title}</h3><p>{unit.goal}</p>{progress.lessons[unit.id] && <p className="cb-muted"><Check size={14} style={{ display: 'inline' }} /> Lesson reviewed</p>}<UnitActions unit={unit} selection={target} /></div></article>; })}</section>)}</div></section>;
  })}</>;
}
function StageResources({ unit }: { unit: ConditionalUnit }) {
  const resources = conditionalResources.filter(resource => unit.area === 'translation' ? /indicator|practice worlds/i.test(resource.title) : unit.area === 'application' ? /medium|advanced|practice worlds/i.test(resource.title) : unit.area === 'linking' ? /introductory|practice worlds/i.test(resource.title) : false);
  return resources.length ? <section className="cb-card"><h2>Put this move to work</h2><p>Use the existing Activity Center and guided drills for additional application. These resources cover broader conditional work.</p>{resources.map(resource => <p key={resource.route}><Link className="cb-button" to={resource.route}>{resource.title}</Link></p>)}</section> : null;
}
function Lesson() {
  const { unitId } = useParams();
  const [params] = useSearchParams();
  const unit = findConditionalUnit(unitId ?? '');
  const { progress, update } = useCourse();
  if (!unit) return <><h1>Lesson not found</h1><Link to={BASE}>Return to the learning path</Link></>;
  const selection = unitSelection(params, unit);
  const index = conditionalUnits.indexOf(unit);
  const previous = conditionalUnits[index - 1];
  const canGoBack = previous && (!selection.start || index > conditionalUnits.findIndex(item => item.id === selection.start));
  return <><Link to={pathUrl(selection)}>Curriculum</Link><PageHeader className="cb-page-header" eyebrow={`${indicatorStages[unit.id] ?? names[unit.area]} · Lesson ${index + 1}`} title={unit.title} description={unit.goal} /><UnitActions unit={unit} selection={selection} /><nav className="cb-toc" aria-label="In this lesson"><a href="#understand">Understand the move</a><a href="#worked-reasoning">Watch the reasoning</a><a href="#repair">Repair the mistake</a></nav>{unit.prerequisites.length > 0 && <p className="cb-muted">Helpful first: {unit.prerequisites.map((id, n) => <span key={id}>{n > 0 && ', '}<Link to={actionUrl(findConditionalUnit(id)!, 'lesson', selection)}>{findConditionalUnit(id)?.title ?? id}</Link></span>)}.</p>}<section id="understand" className="cb-card"><h2>Understand the move</h2>{unit.teaching.map((paragraph, n) => <p key={n}>{paragraph}</p>)}{progress.settings.showMethod && <><h3>Your method</h3><ol>{unit.method.map((step, n) => <li key={n}>{step}</li>)}</ol></>}</section><section id="worked-reasoning" className="cb-card"><h2>Watch the reasoning</h2><h3>Given</h3><ul>{unit.workedExample.statements.map((text, n) => <li key={n}>{text}</li>)}</ul><h3>Work through it</h3><ol>{unit.workedExample.reasoning.map((text, n) => <li key={n}>{text}</li>)}</ol><div className="cb-result"><strong>Result: </strong>{unit.workedExample.conclusion}</div></section><section id="repair" className="cb-card"><h2>Repair this mistake</h2><p>{unit.commonMistake.mistake}</p><div className="cb-reason">{unit.commonMistake.repair}</div></section><div className="cb-actions"><button onClick={() => update(prior => ({ ...prior, lessons: { ...prior.lessons, [unit.id]: new Date().toISOString() } }))}>{progress.lessons[unit.id] ? 'Lesson reviewed' : 'Mark lesson reviewed'}</button><Link className="cb-button cb-primary" to={actionUrl(unit, 'guided', selection)}>Next action: guided activity <ArrowRight size={16} /></Link>{canGoBack && <Link className="cb-button" to={actionUrl(previous, 'lesson', { ...selection, difficulty: selection.assignedLevel ? selection.difficulty : getCurriculumDifficulty(previous) })}>Previous lesson: {previous.title}</Link>}</div><p className="cb-muted">Reviewing a lesson records that you read it. Practice results are recorded separately.</p><StageResources unit={unit} /><RecommendedForward selection={selection} /></>;
}
function GuidedActivity() {
  const { unitId } = useParams();
  const [params] = useSearchParams();
  const unit = findConditionalUnit(unitId ?? '');
  if (!unit) return <><h1>Activity not found</h1><Link to={BASE}>Return to your curriculum</Link></>;
  const selection = unitSelection(params, unit);
  return <><PageHeader className="cb-page-header" eyebrow="Guided reasoning activity" title={`${unit.title}: make the move yourself.`} description={unit.goal} /><UnitActions unit={unit} selection={selection} /><div className="cb-card"><h2>Identify. Build. Test. Repair.</h2><p>Use the method to produce your reasoning before judging an answer. Keep the reference open when you need it.</p><QuestionRunner guidedMethod={unit.method} forwardSelection={selection} runKey={`guided:${unit.id}`} questions={[{ ...unit.guidedExample, unitId: unit.id, unitTitle: unit.title, difficulty: 'beginner' }]} /></div><Link className="cb-button" to={actionUrl(unit, 'lesson', selection)}><ArrowLeft size={16} /> Previous action: lesson</Link><Link className="cb-button cb-primary" to={actionUrl(unit, 'practice', selection)}>Next action: {levelLabel(selection.difficulty)} skill drill <ArrowRight size={16} /></Link></>;
}

type PracticeQuestion = ConditionalQuestion & { unitId: string; unitTitle: string; difficulty: ConditionalDifficulty };
function Practice({ simulator = false, hardLanguage = false }: { simulator?: boolean; hardLanguage?: boolean }) {
  const [params] = useSearchParams();
  const unitId = params.get('unit') ?? undefined;
  const unit = findConditionalUnit(unitId ?? '');
  const selection = unit ? unitSelection(params, unit) : pathSelection(params, true);
  const difficulty = hardLanguage ? 'advanced' : selection.difficulty;
  const area = hardLanguage ? 'translation' : params.get('area') ?? undefined;
  const phase = params.get('phase') === 'quantifier' ? 'quantifier' : 'conditional';
  const questions = getConditionalQuestions({ difficulty, ...(unitId ? { unitId } : {}), ...(area ? { area: area as ConditionalArea } : {}), ...(!unitId && !area ? { phase } : {}) });
  return <><span className="cb-label">{levelLabel(difficulty)} · {simulator ? 'Mixed application' : 'Skill drill'}</span><h1>{unit ? unit.title : area ? names[area as ConditionalArea] : 'Put your conditional reasoning to work.'}</h1><p>Write or diagram first. Then check the answer and repair your reasoning. Use a hint or worked explanation when you need help.</p>{unit && <UnitActions unit={unit} selection={selection} />}{questions.length ? <div className="cb-card"><QuestionRunner key={`${difficulty}:${unitId ?? area ?? phase}`} runKey={`practice:${difficulty}:${unitId ?? area ?? phase}`} questions={questions} hideSkill={simulator} forwardSelection={{ ...selection, difficulty, area: area as ConditionalArea | undefined, unitId, phase }} /></div> : <div className="cb-card"><p>This practice set is unavailable. Return to the curriculum to open the lesson or activity.</p><Link to={pathUrl(selection)}>Return to your curriculum</Link></div>}</>;
}

function QuestionRunner({ runKey, questions, hideSkill = false, forwardSelection, guidedMethod }: { runKey: string; questions: PracticeQuestion[]; hideSkill?: boolean; forwardSelection?: PathSelection; guidedMethod?: string[] }) {
  const { progress, update } = useCourse();
  const run = progress.runs[runKey];
  const [timerNow, setTimerNow] = useState(Date.now());
  useEffect(() => {
    if (!run) update(previous => previous.runs[runKey] ? previous : { ...previous, runs: { ...previous.runs, [runKey]: newRun(questions.map(question => question.id)) } });
  }, [run, runKey, questions, update]);
  const replaceRun = (transform: (value: ConditionalRun) => ConditionalRun) => update(previous => ({ ...previous, runs: { ...previous.runs, [runKey]: transform(previous.runs[runKey]) } }));
  const timerStartedAt = run?.timerStartedAt;
  useEffect(() => {
    if (!timerStartedAt) return;
    const timer = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [timerStartedAt]);
  if (!run) return <p>Preparing your practice...</p>;
  const question = questions.find(item => item.id === run.questionIds[run.index]);
  if (!question && !run.finished) return <><p>The saved question is no longer in this set. Your earlier attempts remain in progress.</p><button onClick={() => replaceRun(() => newRun(questions.map(item => item.id)))}>Start the current set</button></>;
  const attempts = progress.attempts.filter(item => item.id.startsWith(`${run.id}:`));
  if (run.finished) {
    const summary = attemptSummary(attempts);
    return <><h2>You finished this set.</h2><p>{summary.correct} correct out of {summary.total} checked answers. {summary.assisted} used a hint or explanation before checking.</p><p>Revisit the reasoning, then continue with the next activity. Finishing a set does not certify mastery.</p><div className="cb-actions"><Link className="cb-button" to={`${BASE}/review${pathUrl(forwardSelection ?? pathSelection(new URLSearchParams())).replace(BASE, '')}`}>Review your attempts</Link><button onClick={() => replaceRun(() => newRun(questions.map(item => item.id)))}><RotateCcw size={16} /> Repeat this set</button></div><RecommendedForward selection={forwardSelection} /></>;
  }
  const draft = run.drafts[question.id] ?? emptyDraft();
  const changeDraft = (patch: Partial<AnswerDraft>) => replaceRun(value => ({ ...value, drafts: { ...value.drafts, [question.id]: { ...(value.drafts[question.id] ?? emptyDraft()), ...patch } } }));
  const checkAnswer = () => update(previous => {
    const currentRun = previous.runs[runKey];
    const currentDraft = currentRun.drafts[question.id] ?? emptyDraft();
    if (currentDraft.checked || currentDraft.choice === null) return previous;
    const attempt = { id: `${currentRun.id}:${question.id}`, questionId: question.id, unitId: question.unitId, difficulty: question.difficulty, choice: currentDraft.choice, correct: currentDraft.choice === question.answerIndex, hint: currentDraft.hint, explanationBeforeCheck: currentDraft.revealed, working: currentDraft.working, checkedAt: new Date().toISOString() };
    return { ...previous, attempts: [...previous.attempts, attempt], runs: { ...previous.runs, [runKey]: { ...currentRun, drafts: { ...currentRun.drafts, [question.id]: { ...currentDraft, checked: true, revealed: true } } } } };
  });
  return <><div className="cb-actions"><span className="cb-label">{run.index + 1} / {run.questionIds.length} · {guidedMethod ? 'Guided activity' : levelLabel(question.difficulty)}</span>{question.difficulty !== 'beginner' && <><button onClick={() => { replaceRun(value => ({ ...value, timerEnabled: true })); setTimerNow(Date.now()); replaceRun(value => value.timerStartedAt ? { ...value, elapsed: elapsedSeconds(value), timerStartedAt: null } : { ...value, timerStartedAt: new Date().toISOString() }); }}><Clock size={16} /> {run.timerStartedAt ? 'Pause timing' : 'Start optional timing'}</button>{run.timerEnabled && <span aria-label="Elapsed time">{Math.floor(elapsedSeconds(run, timerNow) / 60)}:{String(elapsedSeconds(run, timerNow) % 60).padStart(2, '0')}</span>}</>}</div>{!hideSkill && <p className="cb-muted">{question.unitTitle}</p>}<h3>{question.prompt}</h3>{guidedMethod && <div className="cb-reason"><h4>Build your response in these steps</h4><ol>{guidedMethod.map(step => <li key={step}>{step}</li>)}</ol><p>Identify the conditions. Draw the relationship. Test what follows, then explain why the tempting alternative fails.</p></div>}<label htmlFor={`working-${question.id}`}>Write your diagram or reasoning first. Arrows such as A → B are welcome.</label><textarea id={`working-${question.id}`} value={draft.working} onChange={event => changeDraft({ working: event.target.value })} placeholder="What is given? What follows? Show the direction and each step." /><p className="cb-muted">Your written work is saved for comparison. It is not automatically graded.</p>{draft.working.trim() || draft.revealed ? <div className="cb-options" role="group" aria-label="Answer choices">{question.options.map((option, index) => <button key={index} aria-pressed={draft.choice === index} disabled={draft.checked} onClick={() => changeDraft({ choice: index })}>{String.fromCharCode(65 + index)}. {option}</button>)}</div> : <p className="cb-muted">Add your reasoning to see the answer choices, or open the explanation if you need help getting started.</p>}<div className="cb-actions"><button onClick={() => changeDraft({ hint: true })}>Get a hint</button><button onClick={() => changeDraft({ revealed: true })}>Show worked explanation</button><button className="cb-primary" disabled={draft.choice === null || draft.checked} onClick={checkAnswer}>{draft.checked ? 'Answer checked' : 'Check answer'}</button></div>{draft.hint && <div className="cb-reason"><strong>Hint: </strong>{question.hint}</div>}{draft.revealed && <div className="cb-result">{draft.checked && <h3>{draft.choice === question.answerIndex ? 'Your choice is correct.' : 'Review the reasoning.'}</h3>}<p><strong>Answer: </strong>{question.options[question.answerIndex]}</p><ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol><p>{question.explanation}</p><p className="cb-muted">Compare your written work with these steps. A matching choice alone does not show whether your diagram was right.</p></div>}{draft.checked && <button className="cb-primary" onClick={() => replaceRun(value => ({ ...value, index: value.index + 1, finished: value.index + 1 >= value.questionIds.length, elapsed: elapsedSeconds(value), timerStartedAt: value.timerStartedAt && value.index + 1 < value.questionIds.length ? new Date().toISOString() : null }))}>{run.index + 1 === run.questionIds.length ? 'Finish set' : 'Next question'} <ArrowRight size={16} /></button>}</>;
}

function Reference({ indicators = false }: { indicators?: boolean }) {
  const [params] = useSearchParams();
  const units = indicators ? conditionalUnits.filter(unit => /group [1-4]/i.test(unit.title)) : conditionalUnits;
  return <><span className="cb-label">Keep the reasoning close</span><h1>{indicators ? 'Four language groups. One direction to preserve.' : 'Your conditional reference.'}</h1><p>{indicators ? 'An indicator helps identify the relation. Preserve the complete condition and check what the sentence actually says.' : 'Review the method, a worked example, and the mistake to avoid. Open the lesson or practice the exact skill.'}</p>{units.map(unit => <section className="cb-card" key={unit.id}><h2>{unit.title}</h2><p>{unit.goal}</p><ol>{unit.method.map((step, index) => <li key={index}>{step}</li>)}</ol><div className="cb-reason"><p>{unit.workedExample.statements.join(' ')}</p><strong>{unit.workedExample.conclusion}</strong></div><p><strong>Watch for: </strong>{unit.commonMistake.mistake}</p><p>{unit.commonMistake.repair}</p><div className="cb-actions"><Link className="cb-button" to={actionUrl(unit, 'lesson', unitSelection(params, unit))}>Full lesson</Link><Link className="cb-button" to={actionUrl(unit, 'practice', unitSelection(params, unit))}>Practice this skill</Link></div></section>)}</>;
}

function Flashcards() {
  const [params] = useSearchParams();
  const selection = pathSelection(params, true);
  const area = selection.area;
  const level = selection.difficulty;
  const questions = getConditionalQuestions({ difficulty: level, ...(selection.unitId ? { unitId: selection.unitId } : {}), ...(area ? { area } : { phase: 'conditional' as const }) });
  return <><span className="cb-label">Recall before reveal · {levelLabel(level)}</span><h1>Produce the rule before you recognize it.</h1><p>Write your answer, then reveal the explanation and compare. Hints and early reveals are recorded separately from correctness.</p><div className="cb-card"><QuestionRunner key={`${area}:${level}`} runKey={`flashcards:${selection.unitId ?? area ?? 'conditional'}:${level}`} questions={questions} forwardSelection={selection} /></div></>;
}

function Diagnostics({ review = false }: { review?: boolean }) {
  const { savedProgress } = useCourse();
  const progress = savedProgress;
  if (!progress) return <p>Loading your recorded attempts...</p>;
  const summary = attemptSummary(progress.attempts);
  const misses = progress.attempts.filter(attempt => !attempt.correct || attempt.hint || attempt.explanationBeforeCheck);
  return <><span className="cb-label">Based on your saved work</span><h1>{review ? 'Return to the reasoning.' : 'See what your practice shows.'}</h1><p>Correctness, assistance, and lesson review tell different stories. These are your recorded attempts, not a placement score or an automatic mastery label.</p><div className="cb-card cb-summary"><div><strong>{summary.total}</strong>Checked answers</div><div><strong>{summary.correct}</strong>Correct choices</div><div><strong>{summary.assisted}</strong>Assisted answers</div><div><strong>{Object.keys(progress.lessons).length}</strong>Lessons reviewed</div></div>{!review && <div className="cb-scroll"><table className="cb-table"><thead><tr><th>Skill</th><th>Checked</th><th>Correct</th><th>Assisted</th><th>Work on it</th></tr></thead><tbody>{conditionalUnits.map(unit => { const stats = attemptSummary(progress.attempts.filter(item => item.unitId === unit.id)); return <tr key={unit.id}><td>{unit.title}</td><td>{stats.total}</td><td>{stats.correct}</td><td>{stats.assisted}</td><td><Link to={practiceUrl(unit.id)}>Practice</Link></td></tr>; })}</tbody></table></div>}{review && (misses.length ? [...misses].reverse().map(attempt => {
    const unit = findConditionalUnit(attempt.unitId);
    const question = unit?.guidedExample.id === attempt.questionId ? unit.guidedExample : unit?.drills[attempt.difficulty].find(item => item.id === attempt.questionId);
    return <article className="cb-card" key={attempt.id}><span className="cb-label">{levelLabel(attempt.difficulty)} · {attempt.correct ? 'Correct with assistance' : 'Missed choice'}</span><h2>{unit?.title ?? attempt.unitId}</h2>{question ? <><p>{question.prompt}</p><p><strong>Your answer: </strong>{attempt.choice === null ? 'No choice' : question.options[attempt.choice]}</p><p><strong>Your working: </strong>{attempt.working || 'No written work saved'}</p><div className="cb-result"><strong>Answer: </strong>{question.options[question.answerIndex]}<ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol><p>{question.explanation}</p></div></> : <p>The authored question is unavailable. Your attempt remains recorded.</p>}<Link className="cb-button" to={practiceUrl(attempt.unitId, attempt.difficulty)}>Practice the skill again</Link></article>;
  }) : <div className="cb-card"><p>No missed or assisted attempts yet. Work through a guided example or a practice set to start your review record.</p><Link to={BASE}>Open the learning path</Link></div>)}</>;
}

function Journal() {
  const { progress, update } = useCourse();
  return <><span className="cb-label">Make the correction reusable</span><h1>Your reasoning journal.</h1><p>Record the rule you misread, why your first move failed, and what you will check next time. Your account keeps these notes.</p><label htmlFor="conditional-journal">My conditional notes</label><textarea id="conditional-journal" style={{ minHeight: 360 }} value={progress.journal} onChange={event => update(previous => ({ ...previous, journal: event.target.value }))} placeholder="I read... I first concluded... The rule actually requires... Next time I will check..." /></>;
}
function Settings() {
  const { progress, update } = useCourse();
  return <><h1>Choose how you study.</h1><div className="cb-card"><label><input type="checkbox" checked={progress.settings.showMethod} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, showMethod: event.target.checked } }))} /> Show the method checklist in each lesson</label><p>The reference always keeps the complete method. Each Level 2 or Level 3 run has its own optional stopwatch, with no time penalty or locked advancement.</p><Link className="cb-button" to={`${BASE}/reference`}><BookOpen size={16} /> Open reference</Link></div></>;
}
