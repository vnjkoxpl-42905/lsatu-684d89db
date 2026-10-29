/**
 * Production Progress presenter. The directory keeps its design-prototype name so
 * history and tests stay attached; ProgressPage.tsx is the real-data container and
 * the DEV harness (preview.tsx) mounts this same component with demonstration data.
 * Everything under `DEV` below is excluded from the production bundle.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, CircleHelp, Layers3, RefreshCw, RotateCcw, Star, X } from 'lucide-react';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import type { GradedQuestionAnswer, ProgressArea, ProgressCoverage, ProgressWindow } from '@/lib/firstAnswerProgress';
import type { HistoryAnswer, TopicAccuracy } from '@/lib/firstAnswerDetails';
import { filterProgressHistory, type HistorySort } from '@/lib/progressHistory';
import { torontoDayKey, torontoExactTime, torontoExactTimeYear, torontoLongDate, torontoMediumDate, torontoShortDate } from '@/lib/torontoTime';
import { answerLabel, buildPracticeBuckets, buildPrototypeModel, questionLabel, readableMode, readableSource, recommendedTopic, topicLabel, type PrototypeModel } from './model';
import './progress-prototype.css';

const DEV = import.meta.env.DEV;
export const VARIANTS = ['desk', 'explorer', 'timeline'] as const;
export type ProgressVariant = typeof VARIANTS[number];
const variantNames: Record<ProgressVariant, string> = { desk: 'Study desk', explorer: 'Type explorer', timeline: 'Practice timeline' };
export type ProgressView = 'overview' | 'types' | 'history';
type ResultFilter = 'all' | 'missed' | 'correct';
export interface PrototypeProps {
  answers: GradedQuestionAnswer[];
  coverage: ProgressCoverage;
  asOf: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** DEV harness only: marks demonstration data. */
  demo?: boolean;
  /** Real Progress route: fixed desk composition, no demo or comparison chrome. */
  production?: boolean;
  /** Production view, derived from the route. The harness keeps its own. */
  view?: ProgressView;
  /** Validated window and setter from the container. Absent in the harness. */
  window?: ProgressWindow;
  onWindowChange?: (window: ProgressWindow) => void;
  /** Time of the last successful read (ms). */
  checkedAt?: number | null;
  fetching?: boolean;
  /** A failed refresh while earlier answers are still shown. */
  refreshError?: string | null;
  onRefresh?: () => void;
}
interface WorkspaceProps {
  model: PrototypeModel;
  area: ProgressArea;
  setArea: (area: ProgressArea) => void;
  selectedTopic: string | null;
  selectTopic: (topic: string) => void;
  openQuestion: (question: HistoryAnswer) => void;
  evidenceRequest: number;
  recentLimit?: number;
  requestEvidence: () => void;
}
const sampleText = (n: number) => n < 3 ? 'More answers needed for a percentage.' : n < 10 ? 'Small sample. Keep the question count in mind.' : 'Each question counts once.';
const HISTORY_KEYS = ['historyArea', 'historyResult', 'historyAnswer', 'historySource', 'historyMode', 'historyTopic', 'historySearch', 'historySort'] as const;

function Segments<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  return <LayoutGroup id={id}><div className="pp-segments" role="group" aria-label={label}>
    {options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      {value === option.value && <motion.span className="pp-selection-plate" layoutId="selection" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 36 }} />}
      <span>{option.label}</span>
    </button>)}
  </div></LayoutGroup>;
}

function SubjectControl({ area, setArea }: Pick<WorkspaceProps, 'area' | 'setArea'>) {
  return <Segments label="Subject" value={area} onChange={setArea} options={[{ value: 'LR', label: 'Logical Reasoning' }, { value: 'RC', label: 'Reading Comp.' }]} />;
}

function Outcome({ answer }: { answer: HistoryAnswer }) {
  return <span className={`pp-outcome ${answer.correct ? 'is-correct' : 'is-missed'}`}><span aria-hidden="true">{answer.correct ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}</span>{answer.correct ? 'Correct' : 'Missed'}</span>;
}

function EvidenceRows({ model, answers, openQuestion, limit = 6 }: { model: PrototypeModel; answers: HistoryAnswer[]; openQuestion: WorkspaceProps['openQuestion']; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  // Identity follows the records, not the array reference, so a re-render keeps an opened list open.
  const answerIdentity = JSON.stringify(answers.map((answer) => answer.attemptId));
  useEffect(() => setExpanded(false), [answerIdentity]);
  const shown = expanded ? answers : answers.slice(0, limit);
  return <>
    <ul className="pp-evidence-list">{shown.map((answer) => <li key={answer.attemptId}>
      <button type="button" onClick={() => openQuestion(answer)} className="pp-evidence-row">
        <span><strong>{questionLabel(answer.questionKey)}</strong><small>{torontoDayKey(answer.gradedAt)} · {answerLabel(model, answer)}</small></span>
        <Outcome answer={answer} /><ChevronRight size={16} aria-hidden="true" />
      </button>
    </li>)}</ul>
    {!answers.length && <p className="pp-empty">No saved answers match this view.</p>}
    {answers.length > limit && <button className="pp-text-action" type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer answers' : `Show all ${answers.length} answers`}<ChevronDown size={15} aria-hidden="true" /></button>}
  </>;
}

function TopicRows({ model, selectedTopic, selectTopic, compact = false }: Pick<WorkspaceProps, 'model' | 'selectedTopic' | 'selectTopic'> & { compact?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  if (model.areaPartial.LR || model.areaUnavailable.LR) return <p className="pp-empty">Question-type results are unavailable until all LR answer sources can be checked.</p>;
  const recommended = recommendedTopic(model)?.topic;
  const rows = compact && !showAll ? model.topics.filter((row, index) => index < 5 || row.topic === selectedTopic) : model.topics;
  return <div className="pp-topic-rows">{rows.map((row) => <button type="button" className={`pp-topic-row ${row.topic === selectedTopic ? 'is-selected' : ''}`} key={row.topic} onClick={() => selectTopic(row.topic)} aria-pressed={row.topic === selectedTopic}>
    <span className="pp-topic-name">{row.topic}<small>{row.denominator} first {row.denominator === 1 ? 'answer' : 'answers'}{row.topic === recommended && <b className="pp-flag"><Star size={11} aria-hidden="true" />Look here first</b>}</small></span>
    <span className="pp-topic-bar" aria-hidden="true"><span style={{ width: `${100 * row.correct / row.denominator}%` }} /><i className="pp-topic-missed" style={{ width: `${100 * (row.denominator - row.correct) / row.denominator}%` }} /></span>
    <span className="pp-topic-stat"><strong>{row.percent === null ? `${row.correct} of ${row.denominator}` : `${row.percent}%`}</strong><small>{row.percent === null ? 'correct (small sample)' : `${row.correct} of ${row.denominator} correct`}</small></span>
    <ChevronRight size={16} aria-hidden="true" />
  </button>)}{!rows.length && <p className="pp-empty">Your saved LR question types will appear here after you practise.</p>}{compact && model.topics.length > 5 && <button type="button" className="pp-text-action" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer types' : `Show all ${model.topics.length} types`}<ChevronDown size={15} aria-hidden="true" /></button>}</div>;
}

function TopicEvidence({ model, selectedTopic, openQuestion, evidenceRequest }: Pick<WorkspaceProps, 'model' | 'selectedTopic' | 'openQuestion' | 'evidenceRequest'>) {
  const row = model.topics.find((topic) => topic.topic === selectedTopic);
  return <section className="pp-panel pp-evidence-panel" aria-label="Question-type evidence">
    <div className="pp-panel-heading"><div><span className="pp-kicker">The questions behind the result</span><h3>{row?.topic ?? 'Choose a question type'}</h3></div><Layers3 size={22} aria-hidden="true" /></div>
    {model.areaPartial.LR || model.areaUnavailable.LR ? <p className="pp-empty">Complete LR history is needed before showing question-type accuracy.</p> : row ? <EvidenceReview key={`${row.topic}-${model.window}-${model.asOf}-${row.correct}-${row.denominator}-${evidenceRequest}`} row={row} model={model} openQuestion={openQuestion} /> : <p className="pp-empty">Select a row to see the questions included in its result.</p>}
  </section>;
}

function EvidenceReview({ row, model, openQuestion, resultLabel = 'Question-type result' }: { row: TopicAccuracy; model: PrototypeModel; openQuestion: WorkspaceProps['openQuestion']; resultLabel?: string }) {
  // Missed answers first when there are any; otherwise everything. Filtering never changes the denominator.
  const [filter, setFilter] = useState<ResultFilter>(row.correct < row.denominator ? 'missed' : 'all');
  const ids = new Set(row.evidenceAttemptIds);
  const evidence = model.history.filter((answer) => ids.has(answer.attemptId));
  const missed = row.denominator - row.correct;
  const filtered = evidence.filter((answer) => filter === 'all' || (filter === 'correct' ? answer.correct : !answer.correct));
  return <>
    <div className="pp-evidence-summary"><strong>{row.percent === null ? `${row.correct} of ${row.denominator}` : `${row.percent}%`}</strong><p>{row.correct} correct · {missed} missed<br /><span>{row.denominator} distinct first answers. {sampleText(row.denominator)}</span></p></div>
    {row.topic === 'Unclassified' && <p className="pp-footnote">These records have no recognized question-type label. They remain part of LR accuracy.</p>}
    <div className="pp-evidence-distribution" role="img" aria-label={`${row.correct} correct and ${missed} missed of ${row.denominator} first answers`}><span style={{ flex: row.correct }} /><span style={{ flex: missed }} /></div>
    <div className="pp-evidence-tokens" role="group" aria-label="First-answer evidence tokens">{evidence.slice(0, 24).reverse().map((answer) => <button type="button" key={answer.attemptId} className={answer.correct ? 'is-correct' : 'is-missed'} onClick={() => openQuestion(answer)} aria-label={`Inspect ${questionLabel(answer.questionKey)}, ${answer.correct ? 'correct' : 'missed'}, ${torontoDayKey(answer.gradedAt)}`}><span aria-hidden="true">{answer.correct ? <Check size={15} /> : <X size={15} />}</span></button>)}</div>
    <p className="pp-footnote">{evidence.length > 24 ? 'Latest 24 first answers, oldest to newest. All records are listed below.' : 'First answers, oldest to newest. Select a tile to inspect it.'}</p>
    <div className="pp-evidence-filters"><Segments<ResultFilter> label={resultLabel} value={filter} onChange={setFilter} options={[{ value: 'missed', label: `Missed ${missed}` }, { value: 'correct', label: `Correct ${row.correct}` }, { value: 'all', label: `All ${row.denominator}` }]} /></div>
    <p className="pp-evidence-count" role="status">Showing {filtered.length} {filter === 'all' ? 'first answers' : `${filter} first answers`} of {row.denominator}. Accuracy above stays the same.</p>
    <EvidenceRows model={model} answers={filtered} openQuestion={openQuestion} />
  </>;
}

function PracticeVolume(props: Pick<WorkspaceProps, 'model' | 'area' | 'openQuestion'> & Partial<Pick<WorkspaceProps, 'setArea'>>) {
  return <section className="pp-panel pp-practice-chart" aria-label="First-answer volume">{props.setArea && <SubjectControl area={props.area} setArea={props.setArea} />}<PracticeVolumeChart key={`${props.model.window}-${props.area}-${props.model.asOf}`} {...props} /></section>;
}

function PracticeVolumeChart({ model, area, openQuestion }: Pick<WorkspaceProps, 'model' | 'area' | 'openQuestion'> & Partial<Pick<WorkspaceProps, 'setArea'>>) {
  const buckets = useMemo(() => buildPracticeBuckets(model, area), [model, area]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = buckets.find((bucket) => bucket.id === selectedId);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.answers.length));
  return <>
    <div className="pp-panel-heading"><div><span className="pp-kicker">Your practice record · {area}</span><h3>First answers over time</h3><p>Question counts, not an improvement score. Select an interval to inspect its answers.</p></div></div>
    {!buckets.length ? <p className="pp-empty">This chart needs complete answer sources.</p> : <>
      <div className="pp-volume-bars" role="group" aria-label="Practice intervals">{buckets.map((bucket) => <button className="pp-volume-bar" key={bucket.id} type="button" aria-pressed={selectedId === bucket.id} aria-label={`${torontoExactTimeYear(bucket.start)} to ${torontoExactTimeYear(bucket.end)}, ${bucket === buckets[buckets.length - 1] ? 'end included' : 'end belongs to next interval'}: ${bucket.correct} correct, ${bucket.missed} missed first answers`} onClick={() => setSelectedId(selectedId === bucket.id ? null : bucket.id)}>
        <strong>{bucket.answers.length}</strong><span className="pp-volume-stack" aria-hidden="true"><span className="pp-volume-missed" style={{ height: 112 * bucket.missed / max }} /><span className="pp-volume-correct" style={{ height: 112 * bucket.correct / max }} /></span><span className="pp-volume-label">{model.window === 'all' ? torontoMediumDate(bucket.start) : torontoShortDate(bucket.start)}</span>
      </button>)}</div>
      <p className="pp-chart-key"><span><i className="pp-key-correct" />Correct</span><span><i className="pp-key-missed" />Missed</span><span>{model.progress[area].denominator} first answers</span></p>
      <p className="pp-footnote">{model.window === 'all' ? 'Earliest first answer to ' : 'Period ends '}{torontoDayKey(model.asOf)}. Intervals have equal duration and can share a calendar date. Select a bar for exact Toronto times. {sampleText(model.progress[area].denominator)}</p>
      {selected && <div className="pp-bucket-detail"><h3>{torontoDayKey(selected.start)} to {torontoDayKey(selected.end)}</h3><p className="pp-footnote">{torontoExactTimeYear(selected.start)} to {torontoExactTimeYear(selected.end)}. {selected === buckets[buckets.length - 1] ? 'Period end included.' : 'The end time belongs to the next interval.'}</p><p className="pp-evidence-count" role="status">{selected.correct} correct · {selected.missed} missed. This interval is separate from question-type filters.</p><EvidenceRows model={model} answers={selected.answers} openQuestion={openQuestion} /></div>}
    </>}
  </>;
}

function SubjectSummary({ model, area }: Pick<WorkspaceProps, 'model' | 'area'>) {
  const result = model.progress[area];
  const unavailable = model.areaPartial[area] || model.areaUnavailable[area];
  return <div className={`pp-subject-summary ${area === 'RC' ? 'is-rc' : ''}`}>
    <span className="pp-kicker">First-answer accuracy · {area}</span>
    <div className="pp-summary-line"><strong className="pp-big-number">{unavailable ? 'Unavailable' : result.percent === null ? `${result.correct} of ${result.denominator}` : <>{result.percent}<span>%</span></>}</strong>
      {!unavailable && <p><b>{result.correct} correct</b><br />of {result.denominator} first answers</p>}</div>
    <p className="pp-summary-note">{unavailable ? 'Accuracy is withheld while saved sources are unavailable.' : sampleText(result.denominator)}</p>
  </div>;
}

function AnswerMosaic({ model, area, openQuestion, recentLimit = 24 }: Pick<WorkspaceProps, 'model' | 'area' | 'openQuestion' | 'recentLimit'>) {
  const first = model.history.filter((answer) => answer.area === area && answer.isFirst).slice(0, recentLimit);
  const unavailable = model.areaPartial[area] || model.areaUnavailable[area];
  return <section className="pp-mosaic-block" aria-label="Recent first answers">
    <div className="pp-inline-heading"><h3>Your recent first answers</h3><span>Newest first</span></div>
    {unavailable ? <p className="pp-empty">This view needs complete answer sources.</p> : <>
      <div className={`pp-mosaic ${area === 'RC' ? 'is-rc' : ''}`}>{first.map((answer) => <button key={answer.attemptId} type="button" className={answer.correct ? 'is-correct' : 'is-missed'} onClick={() => openQuestion(answer)} aria-label={`${questionLabel(answer.questionKey)}, ${answer.correct ? 'correct' : 'missed'}, ${torontoDayKey(answer.gradedAt)}`} title={`${questionLabel(answer.questionKey)} · ${answer.correct ? 'Correct' : 'Missed'}`}><span aria-hidden="true">{answer.correct ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}</span></button>)}</div>
      {!first.length && <p className="pp-empty">No first answers in this period. Your next saved practice will start this record.</p>}
      {!!first.length && <p className="pp-chart-key"><span><i className="pp-key-correct" />Correct</span><span><i className="pp-key-missed" />Missed</span><span>Latest {first.length} in this period</span></p>}
    </>}
  </section>;
}

function FocusCard({ model, area, selectTopic, requestEvidence }: Pick<WorkspaceProps, 'model' | 'area' | 'selectTopic' | 'requestEvidence'>) {
  const focus = area === 'LR' ? recommendedTopic(model) : null;
  const incomplete = model.areaPartial[area] || model.areaUnavailable[area];
  const result = model.progress[area];
  const missed = focus ? focus.denominator - focus.correct : result.denominator - result.correct;
  const hasEvidence = area === 'RC' ? !incomplete && result.denominator > 0 : !!focus;
  const heading = focus?.topic ?? (incomplete ? `${area} history is incomplete` : area === 'RC' && hasEvidence ? missed ? 'Your missed RC answers' : 'No RC misses this period' : 'Build your practice record');
  return <aside className="pp-focus-panel" aria-label="Where to look first">
    <span className="pp-kicker">Where to look first · {area}</span>
    <h2>{heading}</h2>
    {hasEvidence
      ? <p className="pp-focus-figure"><strong>{missed} of {focus?.denominator ?? result.denominator}</strong> first answers missed</p>
      : <p>{incomplete ? `Some saved ${area} answers are unavailable. Complete history is needed before suggesting questions to inspect.` : 'As you answer new questions, you can trace each result back to the questions behind it.'}</p>}
    {hasEvidence && <button className="pp-button pp-button-light" type="button" onClick={() => focus ? selectTopic(focus.topic) : requestEvidence()}>{missed ? 'Inspect missed answers' : 'Inspect answers'}<ArrowUpRight size={18} /></button>}
    <small>{hasEvidence ? 'A place to start looking, not a measure of mastery.' : 'No recommendation yet.'}</small>
  </aside>;
}

function RcEvidence({ model, openQuestion, evidenceRequest }: Pick<WorkspaceProps, 'model' | 'openQuestion' | 'evidenceRequest'>) {
  const result = model.progress.RC;
  const row: TopicAccuracy = { topic: 'Reading Comprehension', correct: result.correct, denominator: result.denominator, percent: result.percent, evidenceAttemptIds: model.history.filter((answer) => answer.area === 'RC' && answer.isFirst).map((answer) => answer.attemptId) };
  return <section className="pp-panel pp-evidence-panel" aria-label="RC answer evidence"><div className="pp-panel-heading"><div><span className="pp-kicker">The questions behind the result</span><h3>Reading Comprehension</h3><p>Saved RC first answers. Repeats are in History.</p></div><Layers3 size={22} aria-hidden="true" /></div>
    {model.areaPartial.RC || model.areaUnavailable.RC ? <p className="pp-empty">Complete RC history is needed before showing accuracy.</p> : result.denominator ? <EvidenceReview key={`RC-${model.window}-${model.asOf}-${evidenceRequest}`} row={row} model={model} openQuestion={openQuestion} resultLabel="RC answer result" /> : <p className="pp-empty">No RC first answers in this period. Your next completed RC practice will start this record.</p>}
  </section>;
}

function StudyDesk(props: WorkspaceProps) {
  const { model, area, setArea, selectTopic } = props;
  return <div className="pp-desk">
    <div className="pp-desk-lead"><section className="pp-panel pp-performance"><SubjectControl area={area} setArea={setArea} /><SubjectSummary model={model} area={area} /><AnswerMosaic {...props} /></section>
      <FocusCard {...props} />
    </div>
    {area === 'RC' ? <div className="pp-desk-rc"><RcEvidence {...props} /></div> : <div className="pp-desk-bottom"><section className="pp-panel pp-desk-types"><div className="pp-panel-heading"><div><h2>Question types</h2><p>Logical Reasoning · first answers only · most missed first</p></div></div><label className="pp-mobile-topic-select">Choose a question type<select aria-label="Overview question type" value={props.selectedTopic ?? ''} onChange={(event) => selectTopic(event.target.value)} disabled={model.areaPartial.LR || model.areaUnavailable.LR || !model.topics.length}>{!model.topics.length && <option value="">No question types yet</option>}{model.topics.map((row) => <option key={row.topic} value={row.topic}>{row.topic} · {row.denominator - row.correct} of {row.denominator} missed</option>)}</select></label><TopicRows {...props} compact /></section><TopicEvidence {...props} /></div>}
    <PracticeVolume model={model} area={area} openQuestion={props.openQuestion} />
  </div>;
}

function TypeExplorer(props: WorkspaceProps) {
  return <div className="pp-explorer">
    <section className="pp-type-index"><div className="pp-panel-heading"><div><span className="pp-kicker">Logical Reasoning</span><h2>Find the pattern.</h2><p>Choose a question type. See what went into the result.</p></div></div><TopicRows {...props} /><p className="pp-footnote">RC answers are included in Overview and History. These records do not have comparable RC topic labels.</p></section>
    <div className="pp-explorer-evidence"><section className="pp-panel pp-explorer-summary"><div><SubjectSummary model={props.model} area="LR" /></div><div className="pp-mini-total"><strong>{props.model.topics.filter((row) => row.topic !== 'Unclassified').length}</strong><span>LR question types<br />in this period</span></div></section><TopicEvidence {...props} /></div>
  </div>;
}

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;

function PracticeHistory({ model, openQuestion, notebook = false }: Pick<WorkspaceProps, 'model' | 'openQuestion'> & { notebook?: boolean }) {
  const [params, setParams] = useSearchParams();
  // The URL is the contract (legacy redirects and Insights links write these keys); every write replaces.
  const area = oneOf(params.get('historyArea'), ['all', 'LR', 'RC'] as const, 'all');
  const result = oneOf(params.get('historyResult'), ['all', 'correct', 'missed'] as const, 'all');
  const answer = oneOf(params.get('historyAnswer'), ['all', 'first', 'repeat'] as const, 'all');
  const source = params.get('historySource') || 'all';
  const mode = params.get('historyMode') || 'all';
  const topic = params.get('historyTopic') || 'all';
  const search = params.get('historySearch') || '';
  const sort = oneOf(params.get('historySort'), ['newest', 'oldest', 'question', 'source'] as const, 'newest') as HistorySort;
  const [visibleDates, setVisibleDates] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(() => !globalThis.matchMedia?.('(max-width: 560px)').matches);
  useEffect(() => {
    const media = globalThis.matchMedia?.('(max-width: 560px)');
    if (!media) return;
    const changed = () => setFiltersOpen(!media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => setVisibleDates(20), [area, result, answer, source, mode, topic, search, sort, model.window, model.asOf]);
  const setFilter = (key: typeof HISTORY_KEYS[number], value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (!value || value === 'all' || (key === 'historySort' && value === 'newest')) next.delete(key);
    else next.set(key, value);
    return next;
  }, { replace: true });
  const reset = () => setParams((current) => { const next = new URLSearchParams(current); HISTORY_KEYS.forEach((key) => next.delete(key)); return next; }, { replace: true });
  const history = useMemo(() => filterProgressHistory(model.history, { area, result, answer, source, mode, topic, search, sort }), [model.history, area, result, answer, source, mode, topic, search, sort]);
  const options = (field: 'source' | 'mode' | 'topic') => [...new Set(model.history.map((row) => row[field]).filter((value): value is string => !!value))].sort();
  const labelOf = (field: 'source' | 'mode' | 'topic', value: string) => field === 'source' ? readableSource(value) : field === 'mode' ? readableMode(value) : value;
  const active = [
    area !== 'all' && area, result !== 'all' && (result === 'missed' ? 'Missed' : 'Correct'),
    answer !== 'all' && (answer === 'first' ? 'First answers' : 'Repeats'),
    source !== 'all' && labelOf('source', source), mode !== 'all' && labelOf('mode', mode), topic !== 'all' && topic,
    search.trim() && `“${search.trim()}”`, sort !== 'newest' && { oldest: 'Oldest first', question: 'By question', source: 'By source' }[sort],
  ].filter(Boolean) as string[];
  const grouped = sort === 'newest' || sort === 'oldest';
  const groups = useMemo(() => {
    const byDay = new Map<string, HistoryAnswer[]>();
    for (const row of history) { const key = torontoDayKey(row.gradedAt); byDay.set(key, [...(byDay.get(key) ?? []), row]); }
    return [...byDay.entries()];
  }, [history]);
  const select = (field: 'source' | 'mode' | 'topic', label: string, value: string) => <label className="pp-select-label">{label}<select aria-label={`History ${field}`} value={value} onChange={(event) => setFilter(`history${field[0].toUpperCase()}${field.slice(1)}` as typeof HISTORY_KEYS[number], event.target.value)}><option value="all">All</option>{value !== 'all' && !options(field).includes(value) && <option value={value}>{labelOf(field, value)} (no rows in this period)</option>}{options(field).map((item) => <option key={item} value={item}>{labelOf(field, item)}</option>)}</select></label>;
  return <section className={`pp-history ${notebook ? 'pp-notebook' : 'pp-panel'}`} aria-label="Practice history">
    <div className="pp-panel-heading"><div><span className="pp-kicker">Your saved practice · Toronto time</span><h2>{notebook ? 'Every answer has a story.' : 'Answer history'}</h2><p>First answers and repeats, clearly separated. Repeats do not change first-answer accuracy.</p></div><span className="pp-count" role="status">{history.length} {history.length === 1 ? 'answer' : 'answers'}</span></div>
    <details className="pp-history-filter-toggle" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}><summary>Filters<span>{active.length ? active.join(' · ') : 'None'}</span><ChevronDown size={15} aria-hidden="true" /></summary><div className="pp-history-toolbar">
      <Segments<ResultFilter> label="Answer result" value={result} onChange={(value) => setFilter('historyResult', value)} options={[{ value: 'all', label: 'All results' }, { value: 'missed', label: 'Missed' }, { value: 'correct', label: 'Correct' }]} />
      <Segments<'all' | 'first' | 'repeat'> label="Attempt type" value={answer} onChange={(value) => setFilter('historyAnswer', value)} options={[{ value: 'all', label: 'All attempts' }, { value: 'first', label: 'First answers' }, { value: 'repeat', label: 'Repeats' }]} />
      <label className="pp-select-label">Subject<select aria-label="History area" value={area} onChange={(event) => setFilter('historyArea', event.target.value)}><option value="all">LR + RC</option><option value="LR">LR</option><option value="RC">RC</option></select></label>
      {select('mode', 'Practice type', mode)}{select('source', 'Source', source)}{select('topic', 'Question type', topic)}
      <label className="pp-select-label">Order<select aria-label="History order" value={sort} onChange={(event) => setFilter('historySort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="question">Question order</option><option value="source">Source order</option></select></label>
      <input aria-label="Find a saved answer" type="search" placeholder="Find a question or type" value={search} onChange={(event) => setFilter('historySearch', event.target.value)} />
      <button type="button" className="pp-text-action" disabled={!active.length} onClick={reset}><RotateCcw size={14} aria-hidden="true" />Reset filters</button>
    </div></details>
    {!!active.length && <p className="pp-active-filters" aria-label="Active filters">{active.map((item) => <span key={item}>{item}</span>)}</p>}
    {!!model.progress.coverage.missingSources.length && <p className="pp-notice">This is the available history. Missing sources may contain earlier answers, so first/repeat labels are provisional.</p>}
    {grouped
      ? <div className="pp-day-groups">{groups.slice(0, visibleDates).map(([day, answers], index) => <details key={day} open={index < (notebook ? 2 : 1)} className="pp-day-group"><summary><span className="pp-day-mark" aria-hidden="true" /><strong>{day}</strong><span>{answers.length} {answers.length === 1 ? 'answer' : 'answers'}</span><ChevronDown size={16} aria-hidden="true" /></summary><div><EvidenceRows model={model} answers={answers} openQuestion={openQuestion} /></div></details>)}</div>
      : <div className="pp-flat-list"><EvidenceRows model={model} answers={history} openQuestion={openQuestion} limit={40} /></div>}
    {!history.length && <p className="pp-empty">No answers match these filters.</p>}
    {grouped && groups.length > visibleDates && <button className="pp-text-action" type="button" onClick={() => setVisibleDates((count) => count + 20)}>Show older practice dates <ChevronDown size={15} aria-hidden="true" /></button>}
  </section>;
}

function PracticeTimeline(props: WorkspaceProps) {
  return <div className="pp-timeline-layout"><PracticeHistory model={props.model} openQuestion={props.openQuestion} notebook /><aside className="pp-timeline-aside"><PracticeVolume model={props.model} area={props.area} openQuestion={props.openQuestion} setArea={props.setArea} /><div className="pp-panel pp-period-sheet"><span className="pp-kicker">The period at a glance</span><SubjectSummary model={props.model} area="LR" /><div className="pp-period-rc"><SubjectSummary model={props.model} area="RC" /></div><p className="pp-footnote">{props.model.progress.repeatCount} repeat answers are in history, outside first-answer accuracy.</p></div><section className="pp-inset-note"><CircleHelp size={20} aria-hidden="true" /><h3>What counts here?</h3><p>Saved graded answers from supported LR drills, completed LR sections, and completed RC work. Full PrepTests count once completed.</p></section></aside></div>;
}

function QuestionChronology({ model, question }: { model: PrototypeModel; question: HistoryAnswer }) {
  const attempts = model.allAnswers.filter((answer) => answer.questionKey === question.questionKey);
  const provisional = model.areaPartial[question.area] || model.areaUnavailable[question.area];
  return <div className="pp-chronology"><h3>{attempts.length} {provisional ? 'available ' : ''}saved {attempts.length === 1 ? 'answer' : 'answers'} to this question</h3><p className="pp-footnote">Includes records outside the selected period. {provisional ? 'Sources are incomplete. First and repeat labels are provisional.' : 'The first saved answer determines accuracy. Repeats do not change it.'}</p>
    <ol className="pp-attempt-path">{attempts.map((answer, index) => <li key={answer.attemptId} className={answer.attemptId === question.attemptId ? 'is-selected' : ''}><span><strong>{index === 0 ? (provisional ? 'First available answer' : 'First answer') : `Repeat ${index}`}</strong><time dateTime={answer.gradedAt} title={torontoExactTime(answer.gradedAt)}>{torontoDayKey(answer.gradedAt)}</time></span><Outcome answer={{ ...answer, isFirst: index === 0 }} />{answer.attemptId === question.attemptId && <small className="pp-selected-mark">Selected</small>}</li>)}</ol>
  </div>;
}

function PeriodSelect({ window, setWindow }: { window: ProgressWindow; setWindow: (window: ProgressWindow) => void }) {
  return <label className="pp-select-label">Period<select aria-label="Progress period" value={String(window)} onChange={(event) => setWindow(event.target.value === 'all' ? 'all' : Number(event.target.value) as ProgressWindow)}>{[7, 14, 21, 30].map((days) => <option key={days} value={days}>Last {days} days</option>)}<option value="all">All time</option></select></label>;
}

export default function ProgressPrototype(props: PrototypeProps) {
  const production = !!props.production;
  const [params, setParams] = useSearchParams();
  const ownWindow = useProgressWindow(false);
  const [window, setWindow] = props.window ? [props.window, props.onWindowChange ?? ownWindow[1]] as const : ownWindow;
  // Comparison designs exist only in the DEV harness; production is always the desk.
  const variant: ProgressVariant = DEV && !production && VARIANTS.includes(params.get('variant') as ProgressVariant) ? params.get('variant') as ProgressVariant : 'desk';
  const [area, setArea] = useState<ProgressArea>('LR');
  const [topic, setTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState<HistoryAnswer | null>(null);
  const [localView, setLocalView] = useState<ProgressView>('overview');
  const view = production ? props.view ?? 'overview' : localView;
  const inspectorRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [evidenceRequest, setEvidenceRequest] = useState(0);
  const reduceMotion = useReducedMotion();
  const model = useMemo(() => buildPrototypeModel(props.answers, props.coverage, window, props.asOf), [props.answers, props.coverage, window, props.asOf]);
  useEffect(() => { setLocalView('overview'); }, [variant]);
  useEffect(() => { if (!production) rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'auto' }); }, [production, variant, view]);
  const defaultTopic = recommendedTopic(model)?.topic ?? model.topics.find((row) => row.topic !== 'Unclassified')?.topic ?? model.topics[0]?.topic ?? null;
  const selectedTopic = model.topics.some((row) => row.topic === topic) ? topic : defaultTopic;
  const moveVariant = (offset: number) => setParams((current) => { const next = new URLSearchParams(current); next.set('variant', VARIANTS[(VARIANTS.indexOf(variant) + offset + VARIANTS.length) % VARIANTS.length]); return next; }, { replace: true });
  useEffect(() => {
    if (!DEV || production) return;
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key) || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"],[role="combobox"]'))) return;
      event.preventDefault(); moveVariant(event.key === 'ArrowRight' ? 1 : -1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });
  const historyContext = view === 'history' ? JSON.stringify(HISTORY_KEYS.map((key) => params.get(key))) : '';
  useEffect(() => {
    if (inspectorRef.current?.contains(document.activeElement)) rootRef.current?.querySelector<HTMLSelectElement>('[aria-label="Progress period"]')?.focus();
    setQuestion(null);
    openerRef.current = null;
  }, [window, props.answers, props.asOf, view, variant, area, historyContext]);
  useEffect(() => { if (question) inspectorRef.current?.focus(); }, [question?.attemptId]);
  useEffect(() => { if (evidenceRequest) rootRef.current?.querySelector('.pp-evidence-panel')?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }, [evidenceRequest, reduceMotion]);
  const selectTopic = (value: string) => { setTopic(value); setQuestion(null); setEvidenceRequest((count) => count + 1); };
  const openQuestion = (value: HistoryAnswer) => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setQuestion(value); };
  const closeQuestion = () => { setQuestion(null); if (openerRef.current?.isConnected) openerRef.current.focus(); else rootRef.current?.querySelector<HTMLSelectElement>('[aria-label="Progress period"]')?.focus(); };
  const workspace: WorkspaceProps = { model, area, setArea, selectedTopic, selectTopic, openQuestion, evidenceRequest, recentLimit: production ? 12 : 24, requestEvidence: () => setEvidenceRequest((count) => count + 1) };
  const unavailable = model.areaUnavailable.LR && model.areaUnavailable.RC;
  return <div ref={rootRef} data-progress-release={production ? 'progress-evidence-20261028' : undefined} className={`progress-lab pp-variant-${variant}${production ? ' is-production' : ''}`}>
    {DEV && !production && <div className="pp-prototype-notice"><span><span className="pp-live-dot" />{props.demo ? 'Design preview · demonstration data' : 'Design preview · your saved answers'}</span><span>Nothing is saved here</span></div>}
    <div className="pp-page-toolbar">
      {production
        ? <p className="pp-purpose"><strong>See the questions behind your results.</strong> First answers count once. <Link to="/review/to-review">Open Review</Link> to work through questions.</p>
        : <Segments<ProgressView> label="Progress view" value={localView} onChange={setLocalView} options={[{ value: 'overview', label: 'Overview' }, { value: 'types', label: 'Question types' }, { value: 'history', label: 'History' }]} />}
      <div className="pp-toolbar-controls"><PeriodSelect window={window} setWindow={setWindow} />
        {production && <div className="pp-checked"><span role="status">{props.fetching ? 'Checking your saved answers…' : props.checkedAt ? `Checked ${torontoExactTime(props.checkedAt)}` : ''}</span>{props.onRefresh && <button type="button" className="pp-text-action" onClick={props.onRefresh} disabled={props.fetching}><RefreshCw size={14} aria-hidden="true" />Refresh</button>}</div>}
      </div>
    </div>
    {production && props.refreshError && <p className="pp-notice" role="alert">{props.refreshError}{props.checkedAt ? ` Showing answers checked ${torontoExactTime(props.checkedAt)}.` : ''}</p>}
    {props.loading ? <div className="pp-panel pp-loading" role="status"><h2>Loading your saved answers</h2><p>Checking the questions behind your results.</p><div /><div /><div /></div> : props.error || unavailable ? <div className="pp-panel" role="alert"><h2>Saved answers are unavailable</h2><p>{props.error ?? 'No accuracy has been calculated. Try again when the answer sources are available.'}</p>{props.onRetry && <button className="pp-button" onClick={props.onRetry} type="button"><RotateCcw size={16} />Try again</button>}</div> : <>
      {!!props.coverage.missingSources.length && <p className="pp-notice" role="status">Some answer sources could not load. Affected accuracy and review suggestions are withheld.</p>}
      {view === 'types' ? <TypeExplorer {...workspace} /> : view === 'history' ? <PracticeHistory model={model} openQuestion={openQuestion} /> : variant === 'desk' ? <StudyDesk {...workspace} /> : variant === 'explorer' ? <TypeExplorer {...workspace} /> : <PracticeTimeline {...workspace} />}
      {question && <section className="pp-question-inspector pp-panel" role="region" aria-label="Saved answer detail" tabIndex={-1} ref={inspectorRef}>
        <div className="pp-panel-heading"><div><span className="pp-kicker">Saved answer detail</span><h2>{questionLabel(question.questionKey)}</h2></div><button type="button" className="pp-close" aria-label="Close saved answer detail" onClick={closeQuestion}>Close</button></div>
        <div className="pp-record-detail"><Outcome answer={question} /><span>{answerLabel(model, question)}</span><span title={torontoExactTime(question.gradedAt)}>{torontoDayKey(question.gradedAt)}</span><span>{readableMode(question.mode)}</span></div><p>{question.area === 'LR' ? topicLabel(question.topic) : 'Reading Comprehension'}</p><QuestionChronology model={model} question={question} />
        <p className="pp-footnote">Progress shows the record. <Link to="/review/to-review">Review</Link> is the workspace for working through questions; it does not open this exact question from here.</p>
      </section>}
      <details className="pp-method"><summary>How these results are calculated<ChevronDown size={15} aria-hidden="true" /></summary><p>Each question counts once, from its first saved graded answer across your history. The date filter applies to that first answer. Repeats appear in History but do not change first-answer accuracy. Lessons and assignment completion are separate from these practice results. Questions with fewer than three first answers in a group show counts without a percentage.</p><p>Period ends {torontoLongDate(props.asOf)}. All dates and times are Toronto time. Results use the same answer ledger throughout this page.</p></details>
    </>}
    {DEV && !production && <div className="pp-switcher" aria-label="Design comparison"><button type="button" onClick={() => moveVariant(-1)} aria-label="Previous design"><ArrowLeft size={18} /></button><span><small>Compare designs · {VARIANTS.indexOf(variant) + 1} / 3</small><strong>{variantNames[variant]}</strong></span><button type="button" onClick={() => moveVariant(1)} aria-label="Next design"><ArrowRight size={18} /></button></div>}
  </div>;
}
