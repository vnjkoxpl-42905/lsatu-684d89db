import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, RotateCcw } from 'lucide-react';
import { conditionalUnits, conditionalResources, findConditionalUnit, getConditionalQuestions } from './content';
import { DIFFICULTIES, type ConditionalArea, type ConditionalDifficulty, type ConditionalQuestion, type ConditionalUnit } from './content/types';
import { attemptSummary, elapsedSeconds, emptyDraft, newRun, recommendNext, type AnswerDraft, type ConditionalProgress, type ConditionalRun } from './progress';
import { useConditionalProgress } from './useConditionalProgress';

const BASE = '/bootcamp/conditionals';
const areas: ConditionalArea[] = ['understanding', 'translation', 'linking', 'inference', 'complex', 'application', 'quantifiers'];
const names: Record<ConditionalArea, string> = { understanding: 'Understand the rule', translation: 'Translate the language', linking: 'Link the rules', inference: 'Draw conclusions', complex: 'Handle complex rules', application: 'Apply to LR', quantifiers: 'Some, most, and all' };
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const Context = createContext<ReturnType<typeof useConditionalProgress> | null>(null);
function useCourse() { const value = useContext(Context); if (!value) throw new Error('Conditional course provider is missing'); return value; }
function practiceUrl(unit?: string, difficulty: ConditionalDifficulty = 'beginner', area?: string) { const params = new URLSearchParams({ level: difficulty }); if (unit) params.set('unit', unit); if (area) params.set('area', area); return `${BASE}/practice?${params}`; }

type NextStep = { mode: 'learn' | 'practice'; unitId?: string; label: string; difficulty: ConditionalDifficulty; phase: ConditionalUnit['phase'] };
type PathSelection = { scope: 'course' | 'area' | 'skill' | 'practice'; area?: ConditionalArea; unitId?: string; difficulty: ConditionalDifficulty; phase?: ConditionalUnit['phase'] };
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
    area: area ?? undefined, unitId, difficulty: difficultyFrom(params), phase };
}
function nextSelectedStep(progress: ConditionalProgress, units: ConditionalUnit[], selection: PathSelection): NextStep | null {
  if (selection.scope === 'course') return recommendNext(progress, units);
  const selectedUnits = units.filter(unit => (!(selection.scope === 'skill' || selection.scope === 'practice') || !selection.unitId || unit.id === selection.unitId) && (!selection.area || unit.area === selection.area) &&
    (selection.scope !== 'practice' || selection.unitId || selection.area || unit.phase === selection.phase));
  for (const unit of selectedUnits) {
    if (selection.scope !== 'practice') {
      if (!progress.lessons[unit.id]) return { mode: 'learn', unitId: unit.id, label: `Learn: ${unit.title}`, difficulty: selection.difficulty, phase: unit.phase };
      if (!progress.attempts.some(attempt => attempt.questionId === unit.guidedExample.id)) return { mode: 'learn', unitId: unit.id, label: `Guided example: ${unit.title}`, difficulty: selection.difficulty, phase: unit.phase };
    }
    if (unit.drills[selection.difficulty].some(question => !progress.attempts.some(attempt => attempt.questionId === question.id && attempt.difficulty === selection.difficulty))) {
      return { mode: 'practice', unitId: unit.id, label: `${titleCase(selection.difficulty)} practice: ${unit.title}`, difficulty: selection.difficulty, phase: unit.phase };
    }
  }
  return null;
}
function nextStepUrl(next: NextStep, selection: PathSelection) {
  const params = new URLSearchParams({ level: next.difficulty, phase: next.phase });
  if (selection.scope === 'course') params.set('path', 'course');
  else if (selection.scope !== 'practice') { params.set('path', selection.scope); params.set('pathLevel', selection.difficulty); }
  if (selection.area) params.set('area', selection.area);
  if (next.unitId) params.set('unit', next.unitId);
  const route = next.mode === 'learn' ? `${BASE}/lessons/${next.unitId}` : `${BASE}/practice`;
  return `${route}?${params}${next.label.startsWith('Guided example:') ? '#guided-example' : ''}`;
}
function pathUrl(selection: PathSelection) {
  const params = new URLSearchParams();
  if (selection.area) params.set('area', selection.area);
  if (selection.scope !== 'course') params.set('level', selection.difficulty);
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
      : <Link className="cb-button" to={pathUrl(target)}>Choose more work on the learning path</Link>}
  </div>;
}

export function ConditionalBootcampRoutes({ userId }: { userId: string }) {
  const course = useConditionalProgress(userId);
  return <Context.Provider value={course}><Routes><Route element={<Shell />}>
    <Route index element={<LearningPath />} />
    <Route path="lessons/:unitId" element={<Lesson />} />
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

function Shell() {
  const { status, error, retry, progress } = useCourse();
  const navigation = [['', 'Learning path'], ['/practice', 'Practice'], ['/reference', 'Reference'], ['/indicators', 'Indicators'], ['/flashcards', 'Flashcards'], ['/simulator', 'Mixed practice'], ['/hard-sentences', 'Hard language'], ['/diagnostics', 'Your progress'], ['/review', 'Review'], ['/journal', 'Journal'], ['/settings', 'Settings']];
  return <div className="cb-shell"><aside className="cb-rail"><Link to="/classroom"><ArrowLeft size={14} style={{ display: 'inline' }} /> Classroom</Link><div className="cb-brand">Conditionals</div><p className="cb-muted">Learn the rule. Show your reasoning. Put it to work.</p><nav aria-label="Conditional bootcamp" className="cb-nav">{navigation.map(([route, label]) => <NavLink key={route} end={route === ''} to={`${BASE}${route}`}>{label}</NavLink>)}</nav></aside><main className="cb-main" id="conditional-main"><div className="cb-save" role="status">{status === 'saved' ? 'Saved to your account' : status === 'loading' ? 'Loading your saved work...' : status === 'saving' ? 'Saving your changes...' : status === 'unsaved' ? 'Changes waiting to save' : 'Changes are not saved'}</div>{error && <div className="cb-error" role="alert"><p>{error}</p>{progress ? <button onClick={() => void retry()}>Retry save</button> : <button onClick={() => window.location.reload()}>Reload saved work</button>}</div>}{progress ? <Outlet /> : !error && <p>Loading your learning path...</p>}</main></div>;
}

function LearningPath() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('area') ?? '';
  const { progress } = useCourse();
  const rawLevel = params.get('level');
  const difficulty: ConditionalDifficulty = DIFFICULTIES.includes(rawLevel as ConditionalDifficulty) ? rawLevel as ConditionalDifficulty : 'beginner';
  const setDifficulty = (level: ConditionalDifficulty) => { const copy = new URLSearchParams(params); copy.set('level', level); setParams(copy); };
  const units = selected ? conditionalUnits.filter(unit => unit.area === selected) : conditionalUnits;
  const selection: PathSelection = { scope: selected ? 'area' : 'course', area: selected ? selected as ConditionalArea : undefined, difficulty };
  return <><span className="cb-label">Your conditional bootcamp</span><h1>Build the skill, one step at a time.</h1><p>Start with what a rule means. Learn how to translate it, link it, and use it in an argument. Each lesson has a guided example and a separate practice set.</p><RecommendedForward selection={selection} /><p className="cb-muted">{selected ? `Work through the selected area with ${difficulty} practice. Lesson review and guided examples come before its practice recommendation.` : "Follow each foundation lesson with Beginner practice, then Medium and Advanced conditionals before quantifiers."} Recommendations use saved reviews and checked attempts, not a mastery lock.</p><div className="cb-card"><h2>Choose your starting point</h2><div className="cb-filters"><label>Skill area<select value={selected} onChange={event => { const copy = new URLSearchParams(params); if (event.target.value) copy.set('area', event.target.value); else copy.delete('area'); copy.delete('unit'); copy.delete('path'); copy.delete('pathLevel'); setParams(copy); }}><option value="">Complete sequence</option>{areas.map(area => <option key={area} value={area}>{names[area]}</option>)}</select></label><label>Practice difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value as ConditionalDifficulty)}>{DIFFICULTIES.map(level => <option key={level} value={level}>{titleCase(level)}</option>)}</select></label></div><Link className="cb-button cb-primary" to={practiceUrl(undefined, difficulty, selected)}>Practice {selected ? names[selected].toLowerCase() : 'all conditional skills'} <ArrowRight size={16} /></Link><p className="cb-muted">Prerequisites guide your choice. Every lesson and difficulty stays accessible. Timing is optional for Medium and Advanced.</p></div>{(['conditional', 'quantifier'] as const).map(phase => {
    const phaseUnits = units.filter(unit => unit.phase === phase);
    if (!phaseUnits.length) return null;
    return <section key={phase}><h2>{phase === 'conditional' ? 'First, handle conditionals' : 'Next, work with quantities'}</h2>{phase === 'quantifier' && <p>Some, most, and all follow conditional reasoning. You can also work on this phase independently.</p>}<div className="cb-grid">{phaseUnits.map(unit => <div key={unit.id} className="cb-card cb-path-step"><span className="cb-step-number">{conditionalUnits.indexOf(unit) + 1}</span><div><span className="cb-label">{names[unit.area]}</span><h3>{unit.title}</h3><p>{unit.goal}</p>{progress.lessons[unit.id] && <p className="cb-muted"><Check size={14} style={{ display: 'inline' }} /> Lesson reviewed</p>}<div className="cb-actions"><Link className="cb-button cb-primary" to={nextStepUrl({ mode: 'learn', unitId: unit.id, difficulty, phase: unit.phase, label: `Learn: ${unit.title}` }, selection)}>Learn</Link><Link className="cb-button" to={nextStepUrl({ mode: 'practice', unitId: unit.id, difficulty, phase: unit.phase, label: `Practice: ${unit.title}` }, selection)}>Practice</Link></div></div></div>)}</div></section>;
  })}<section><h2>Keep using your existing activities</h2><div className="cb-grid">{conditionalResources.map(resource => <div className="cb-card" key={resource.route}><h3>{resource.title}</h3><p>{resource.description}</p><Link className="cb-button" to={resource.route}>Open activity</Link></div>)}</div></section></>;
}

function Lesson() {
  const { unitId } = useParams();
  const [params] = useSearchParams();
  const unit = findConditionalUnit(unitId ?? '');
  const { progress, update } = useCourse();
  if (!unit) return <><h1>Lesson not found</h1><Link to={BASE}>Return to the learning path</Link></>;
  const selection = pathSelection(params);
  return <><Link to={pathUrl(selection)}>Learning path</Link><span className="cb-label" style={{ display: 'block', marginTop: 20 }}>{names[unit.area]}</span><h1>{unit.title}</h1><p>{unit.goal}</p>{unit.prerequisites.length > 0 && <p className="cb-muted">Helpful first: {unit.prerequisites.map((id, index) => <span key={id}>{index > 0 && ', '}<Link to={`${BASE}/lessons/${id}`}>{findConditionalUnit(id)?.title ?? id}</Link></span>)}. These are suggestions, not locks.</p>}<section className="cb-card"><h2>Understand the move</h2>{unit.teaching.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{progress.settings.showMethod && <><h3>Your method</h3><ol>{unit.method.map((step, index) => <li key={index}>{step}</li>)}</ol></>}</section><section className="cb-card"><h2>Watch the reasoning</h2><h3>Given</h3><ul>{unit.workedExample.statements.map((text, index) => <li key={index}>{text}</li>)}</ul><h3>Work through it</h3><ol>{unit.workedExample.reasoning.map((text, index) => <li key={index}>{text}</li>)}</ol><div className="cb-result"><strong>Result: </strong>{unit.workedExample.conclusion}</div></section><section id="guided-example" className="cb-card"><h2>Try it with guidance</h2><QuestionRunner forwardSelection={selection} runKey={`guided:${unit.id}`} questions={[{ ...unit.guidedExample, unitId: unit.id, unitTitle: unit.title, difficulty: 'beginner' }]} /></section><section className="cb-card"><h2>Repair this mistake</h2><p>{unit.commonMistake.mistake}</p><div className="cb-reason">{unit.commonMistake.repair}</div></section><div className="cb-actions"><button onClick={() => update(previous => ({ ...previous, lessons: { ...previous.lessons, [unit.id]: new Date().toISOString() } }))}>{progress.lessons[unit.id] ? 'Lesson reviewed' : 'Mark lesson reviewed'}</button>{DIFFICULTIES.map(level => <Link key={level} className="cb-button" to={nextStepUrl({ mode: 'practice', unitId: unit.id, difficulty: level, phase: unit.phase, label: `Practice: ${unit.title}` }, { ...selection, difficulty: level })}>{titleCase(level)} practice</Link>)}</div><p className="cb-muted">Reviewing a lesson records that you read it. Your practice results are recorded separately.</p><RecommendedForward selection={selection} /></>;
}

type PracticeQuestion = ConditionalQuestion & { unitId: string; unitTitle: string; difficulty: ConditionalDifficulty };
function Practice({ simulator = false, hardLanguage = false }: { simulator?: boolean; hardLanguage?: boolean }) {
  const [params, setParams] = useSearchParams();
  const rawLevel = params.get('level');
  const difficulty: ConditionalDifficulty = hardLanguage ? 'advanced' : DIFFICULTIES.includes(rawLevel as ConditionalDifficulty) ? rawLevel as ConditionalDifficulty : 'beginner';
  const unitId = params.get('unit') ?? undefined;
  const area = hardLanguage ? 'translation' : params.get('area') ?? undefined;
  const phase = params.get('phase') === 'quantifier' ? 'quantifier' : 'conditional';
  const questions = getConditionalQuestions({ difficulty, ...(unitId ? { unitId } : {}), ...(area ? { area: area as ConditionalArea } : {}), ...(!unitId && !area ? { phase } : {}) });
  const change = (key: string, value: string) => { const copy = new URLSearchParams(params); if (value) copy.set(key, value); else copy.delete(key); if (key === 'area' || key === 'phase') copy.delete('unit'); setParams(copy); };
  return <><span className="cb-label">{hardLanguage ? 'Advanced translation' : simulator ? 'Mixed practice' : 'Practice on your terms'}</span><h1>{hardLanguage ? 'Keep the meaning in difficult language.' : simulator ? 'Recognize the move without a lesson label.' : 'Choose the skill. Show your work.'}</h1><p>{hardLanguage ? 'These advanced translation items ask you to preserve the complete condition, direction, and scope.' : 'Write or diagram first. Then compare your answer and reasoning with the explanation. Hints and explanations are always available.'}</p><div className="cb-filters">{!hardLanguage && <label>Difficulty<select value={difficulty} onChange={event => change('level', event.target.value)}>{DIFFICULTIES.map(level => <option key={level} value={level}>{titleCase(level)}</option>)}</select></label>}<label>Area<select value={area ?? ''} disabled={hardLanguage} onChange={event => change('area', event.target.value)}><option value="">General practice</option>{areas.map(item => <option key={item} value={item}>{names[item]}</option>)}</select></label><label>Specific skill<select value={unitId ?? ''} onChange={event => change('unit', event.target.value)}><option value="">All skills in selection</option>{conditionalUnits.filter(unit => !area || unit.area === area).map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label>{!area && !unitId && <label>Phase<select value={phase} onChange={event => change('phase', event.target.value)}><option value="conditional">Conditionals</option><option value="quantifier">Quantifiers</option></select></label>}</div>{questions.length ? <div className="cb-card"><QuestionRunner key={`${difficulty}:${unitId ?? area ?? phase}`} runKey={`practice:${difficulty}:${unitId ?? area ?? phase}`} questions={questions} hideSkill={simulator} forwardSelection={{ ...pathSelection(params, true), difficulty, area: area as ConditionalArea | undefined, unitId, phase }} /></div> : <div className="cb-card"><p>No practice items match this selection.</p><Link to={practiceUrl()}>Open beginner general practice</Link></div>}</>;
}

function QuestionRunner({ runKey, questions, hideSkill = false, forwardSelection }: { runKey: string; questions: PracticeQuestion[]; hideSkill?: boolean; forwardSelection?: PathSelection }) {
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
    return <><h2>You finished this set.</h2><p>{summary.correct} correct out of {summary.total} checked answers. {summary.assisted} used a hint or explanation before checking.</p><p>Revisit the reasoning, then try fresh work in another skill or difficulty. Finishing a set does not certify mastery.</p><div className="cb-actions"><Link className="cb-button" to={`${BASE}/review`}>Review your attempts</Link><button onClick={() => replaceRun(() => newRun(questions.map(item => item.id)))}><RotateCcw size={16} /> Repeat this set</button></div><RecommendedForward selection={forwardSelection} /></>;
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
  return <><div className="cb-actions"><span className="cb-label">{run.index + 1} / {run.questionIds.length} · {titleCase(question.difficulty)}</span>{question.difficulty !== 'beginner' && <><button onClick={() => { replaceRun(value => ({ ...value, timerEnabled: true })); setTimerNow(Date.now()); replaceRun(value => value.timerStartedAt ? { ...value, elapsed: elapsedSeconds(value), timerStartedAt: null } : { ...value, timerStartedAt: new Date().toISOString() }); }}><Clock size={16} /> {run.timerStartedAt ? 'Pause timing' : 'Start optional timing'}</button>{run.timerEnabled && <span aria-label="Elapsed time">{Math.floor(elapsedSeconds(run, timerNow) / 60)}:{String(elapsedSeconds(run, timerNow) % 60).padStart(2, '0')}</span>}</>}</div>{!hideSkill && <p className="cb-muted">{question.unitTitle}</p>}<h3>{question.prompt}</h3><label htmlFor={`working-${question.id}`}>Write your diagram or reasoning first. Arrows such as A → B are welcome.</label><textarea id={`working-${question.id}`} value={draft.working} onChange={event => changeDraft({ working: event.target.value })} placeholder="What is given? What follows? Show the direction and each step." /><p className="cb-muted">Your written work is saved for comparison. It is not automatically graded.</p>{draft.working.trim() || draft.revealed ? <div className="cb-options" role="group" aria-label="Answer choices">{question.options.map((option, index) => <button key={index} aria-pressed={draft.choice === index} disabled={draft.checked} onClick={() => changeDraft({ choice: index })}>{String.fromCharCode(65 + index)}. {option}</button>)}</div> : <p className="cb-muted">Add your reasoning to see the answer choices, or open the explanation if you need help getting started.</p>}<div className="cb-actions"><button onClick={() => changeDraft({ hint: true })}>Get a hint</button><button onClick={() => changeDraft({ revealed: true })}>Show worked explanation</button><button className="cb-primary" disabled={draft.choice === null || draft.checked} onClick={checkAnswer}>{draft.checked ? 'Answer checked' : 'Check answer'}</button></div>{draft.hint && <div className="cb-reason"><strong>Hint: </strong>{question.hint}</div>}{draft.revealed && <div className="cb-result">{draft.checked && <h3>{draft.choice === question.answerIndex ? 'Your choice is correct.' : 'Review the reasoning.'}</h3>}<p><strong>Answer: </strong>{question.options[question.answerIndex]}</p><ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol><p>{question.explanation}</p><p className="cb-muted">Compare your written work with these steps. A matching choice alone does not show whether your diagram was right.</p></div>}{draft.checked && <button className="cb-primary" onClick={() => replaceRun(value => ({ ...value, index: value.index + 1, finished: value.index + 1 >= value.questionIds.length, elapsed: elapsedSeconds(value), timerStartedAt: value.timerStartedAt && value.index + 1 < value.questionIds.length ? new Date().toISOString() : null }))}>{run.index + 1 === run.questionIds.length ? 'Finish set' : 'Next question'} <ArrowRight size={16} /></button>}</>;
}

function Reference({ indicators = false }: { indicators?: boolean }) {
  const units = indicators ? conditionalUnits.filter(unit => /group [1-4]/i.test(unit.title)) : conditionalUnits;
  return <><span className="cb-label">Keep the reasoning close</span><h1>{indicators ? 'Four language groups. One direction to preserve.' : 'Your conditional reference.'}</h1><p>{indicators ? 'An indicator helps identify the relation. Preserve the complete condition and check what the sentence actually says.' : 'Review the method, a worked example, and the mistake to avoid. Open the lesson or practice the exact skill.'}</p>{units.map(unit => <section className="cb-card" key={unit.id}><h2>{unit.title}</h2><p>{unit.goal}</p><ol>{unit.method.map((step, index) => <li key={index}>{step}</li>)}</ol><div className="cb-reason"><p>{unit.workedExample.statements.join(' ')}</p><strong>{unit.workedExample.conclusion}</strong></div><p><strong>Watch for: </strong>{unit.commonMistake.mistake}</p><p>{unit.commonMistake.repair}</p><div className="cb-actions"><Link className="cb-button" to={`${BASE}/lessons/${unit.id}`}>Full lesson</Link><Link className="cb-button" to={practiceUrl(unit.id)}>Practice this skill</Link></div></section>)}</>;
}

function Flashcards() {
  const [area, setArea] = useState('');
  const [level, setLevel] = useState<ConditionalDifficulty>('beginner');
  const questions = getConditionalQuestions({ difficulty: level, ...(area ? { area: area as ConditionalArea } : { phase: 'conditional' as const }) });
  return <><span className="cb-label">Recall before reveal</span><h1>Produce the rule before you recognize it.</h1><p>Write your answer, then reveal the explanation and compare. A checked choice records correctness separately from any hint or early reveal.</p><div className="cb-filters"><label>Area<select value={area} onChange={event => setArea(event.target.value)}><option value="">Conditionals, mixed</option>{areas.map(item => <option key={item} value={item}>{names[item]}</option>)}</select></label><label>Difficulty<select value={level} onChange={event => setLevel(event.target.value as ConditionalDifficulty)}>{DIFFICULTIES.map(item => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label></div><div className="cb-card"><QuestionRunner key={`${area}:${level}`} runKey={`flashcards:${area || 'conditional'}:${level}`} questions={questions} forwardSelection={{ scope: 'practice', area: area ? area as ConditionalArea : undefined, difficulty: level, phase: 'conditional' }} /></div></>;
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
    return <article className="cb-card" key={attempt.id}><span className="cb-label">{titleCase(attempt.difficulty)} · {attempt.correct ? 'Correct with assistance' : 'Missed choice'}</span><h2>{unit?.title ?? attempt.unitId}</h2>{question ? <><p>{question.prompt}</p><p><strong>Your answer: </strong>{attempt.choice === null ? 'No choice' : question.options[attempt.choice]}</p><p><strong>Your working: </strong>{attempt.working || 'No written work saved'}</p><div className="cb-result"><strong>Answer: </strong>{question.options[question.answerIndex]}<ol>{question.reasoningSteps.map((step, index) => <li key={index}>{step}</li>)}</ol><p>{question.explanation}</p></div></> : <p>The authored question is unavailable. Your attempt remains recorded.</p>}<Link className="cb-button" to={practiceUrl(attempt.unitId, attempt.difficulty)}>Practice the skill again</Link></article>;
  }) : <div className="cb-card"><p>No missed or assisted attempts yet. Work through a guided example or a practice set to start your review record.</p><Link to={BASE}>Open the learning path</Link></div>)}</>;
}

function Journal() {
  const { progress, update } = useCourse();
  return <><span className="cb-label">Make the correction reusable</span><h1>Your reasoning journal.</h1><p>Record the rule you misread, why your first move failed, and what you will check next time. Your account keeps these notes.</p><label htmlFor="conditional-journal">My conditional notes</label><textarea id="conditional-journal" style={{ minHeight: 360 }} value={progress.journal} onChange={event => update(previous => ({ ...previous, journal: event.target.value }))} placeholder="I read... I first concluded... The rule actually requires... Next time I will check..." /></>;
}
function Settings() {
  const { progress, update } = useCourse();
  return <><h1>Choose how you study.</h1><div className="cb-card"><label><input type="checkbox" checked={progress.settings.showMethod} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, showMethod: event.target.checked } }))} /> Show the method checklist in each lesson</label><p>The reference always keeps the complete method. Each Medium or Advanced run has its own optional stopwatch, with no time penalty or locked advancement.</p><Link className="cb-button" to={`${BASE}/reference`}><BookOpen size={16} /> Open reference</Link></div></>;
}
