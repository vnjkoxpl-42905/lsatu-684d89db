import { memo, useCallback, useEffect, useRef, useState } from 'react';
<<<<<<< HEAD
import { DiagramDrills, type DiagramDraft } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
||||||| 64792cc5
import { DiagramDrills } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
=======
import { DiagramDrills, type DiagramAttempt } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
import { openingActivityExplanations, openingActivityItems } from '../content/openingActivityItems';
import { completeConditionItems, confirmationItemsByError, equivalenceItems, obligationConfirmationItem, transferItems, type MixedDrillChoiceItem, type MixedDrillError } from '../content/mixedDrillItems';
<<<<<<< HEAD
import { MixedItemCheck, mixedFamilyItems, type MixedItemDraft } from './MixedFamilyPractice';
||||||| 64792cc5
import { MixedItemCheck, mixedFamilyItems } from './MixedFamilyPractice';
=======
import { MixedItemCheck, mixedFamilyItems, type MixedAttempt } from './MixedFamilyPractice';
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
import { useCourseStep } from '../courseProgress';
import './opening-mixed-drill.css';

const stages = [
  { title: 'What does the rule cover?', purpose: 'Keep the restriction that tells you which cases the rule covers.', example: 'Every camper arriving after dark receives a lantern.', explanation: 'The rule covers campers arriving after dark. Leaving out arriving after dark would make a claim about all campers.', instruction: 'Choose the description that keeps the restriction in each rule.' },
  { title: 'Build the diagram', purpose: 'If the condition on the left is true, what must follow on the right?', example: 'If a parcel has a blue sticker, it has been inspected.', explanation: 'A blue sticker is enough to prove inspection. Inspection is required for a blue-sticker parcel. An inspected parcel could still have no blue sticker.', instruction: 'Choose a side of the arrow, then choose the condition that belongs there. Read the diagram in English before checking.' },
  { title: 'Translate the rule yourself', purpose: 'Write your own diagram before looking at supplied conditions.', example: 'Only members use the studio.', explanation: 'First decide what the rule says you need in order to use the studio. Write both conditions and an arrow, then read your diagram as an if/then sentence.', instruction: 'Write your diagram and English version. Compare with the choices only after making that attempt.' },
  { title: 'Does the meaning change?', purpose: 'Different wording can keep a rule or change what it says.', example: 'Every parcel in Locker 4 has been scanned.', explanation: 'This tells you something about parcels in Locker 4. It leaves scanned parcels elsewhere possible. Use that distinction when comparing another way of wording a rule.', instruction: 'Compare what each rule requires. Try a possible case that fits one but would break the other.' },
  { title: 'Try unfamiliar cases', purpose: 'Use the same reasoning with new wording.', example: 'Visitors must wear a badge.', explanation: 'This gives visitors an obligation. It does not tell you whether a visitor actually wore a badge. Permission, requirements and completed actions need different labels.', instruction: 'Read what is stated and choose only what it proves. Keep qualifications and the strength of the claim.' },
  { title: 'Try the distinction in a new case', purpose: 'Now use the distinctions you revised with different rules.', example: '', explanation: 'The next questions revisit mistakes from this practice with fresh examples.', instruction: 'Make a new attempt before checking. An answer you reach after feedback is useful practice, but it is different from getting a fresh case right on the first check.' },
];

type DiagramItem = (typeof openingActivityItems)[number];
/**
 * The shared refresher items use one-word labels ("dancer", "map"). This drill
 * teaches keeping the complete condition, so it builds with full labels. The
 * item ids, and so saved results, are unchanged.
 */
const fullDiagramLabels: Record<string, { left: string; right: string }> = {
  d1: { left: 'Mia trains', right: 'Mia qualifies' },
  d2: { left: 'Person is a dancer', right: 'Person stretches' },
  d3: { left: 'Student is admitted', right: 'Student is a senior' },
  d5: { left: 'Person votes', right: 'Person is a member' },
  d6: { left: 'Bridge opens', right: 'Bridge has been inspected' },
  d7: { left: 'There is funding', right: 'There is approval' },
  d8: { left: 'Person is a hiker', right: 'Person brings a map' },
};
export const openingDiagramItems: DiagramItem[] = openingActivityItems.map(item => {
  const labels = fullDiagramLabels[item.id];
  return labels ? { ...item, names: [labels.left, labels.right], left: labels.left, right: labels.right } : item;
});
// Each explanation opens with the readback; the rest is shown after a correct diagram.
const splitExplanation = (text: string) => { const end = text.indexOf('. '); return end < 0 ? { readback: text, rest: '' } : { readback: text.slice(0, end + 1), rest: text.slice(end + 2) }; };
const diagramReadbacks = Object.fromEntries(Object.entries(openingActivityExplanations).map(([id, text]) => [id, splitExplanation(text)]));
const diagramFollowUps: Record<string, string> = Object.fromEntries(Object.entries(diagramReadbacks).map(([id, parts]) => [id, parts.rest]));

type Question =
  | { id: string; stage: number; kind: 'choice'; item: MixedDrillChoiceItem }
  | { id: string; stage: number; kind: 'diagram'; item: DiagramItem }
  | { id: string; stage: number; kind: 'independent'; item: (typeof mixedFamilyItems)[number]; itemIndex: number };

const baselineQuestions: Question[] = [
  ...completeConditionItems.map(item => ({ id: item.id, stage: 0, kind: 'choice' as const, item })),
  ...openingDiagramItems.map(item => ({ id: item.id, stage: 1, kind: 'diagram' as const, item })),
  ...mixedFamilyItems.map((item, itemIndex) => ({ id: `mixed-independent-${itemIndex + 1}`, stage: 2, kind: 'independent' as const, item, itemIndex })),
  ...equivalenceItems.map(item => ({ id: item.id, stage: 3, kind: 'choice' as const, item })),
  ...transferItems.map(item => ({ id: item.id, stage: 4, kind: 'choice' as const, item })),
];

const errorLabels: Record<MixedDrillError, string> = {
  qualification: 'Who or what the rule covers', direction: 'Reading the arrow in the right direction',
  requirement: 'Separating what is enough from what is required', equivalence: 'Comparing the whole meaning',
};
type Result = { firstCorrect: boolean; correct: boolean; errors: MixedDrillError[] };
type ChoiceAttempt = { picked: number | null; checked: boolean };
type Attempt = ChoiceAttempt | MixedAttempt | DiagramAttempt;
type Check = (correct: boolean | null, errors?: MixedDrillError[]) => void;
/** What the student chose, built or wrote for one question, saved so a reload shows their work. */
type ChoiceDraft = { picked: number | null; checked: boolean };
type Response = ChoiceDraft | DiagramDraft | MixedItemDraft;
type SaveDraft = (draft: Response) => void;

const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown) => value === null || isText(value);
/** Reads a saved response back for its question, or nothing when it does not fit that question. */
function readResponse(question: Question, raw: unknown): Response | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  if (question.kind === 'choice') {
    const picked = data.picked;
    if (!(picked === null || (Number.isInteger(picked) && (picked as number) >= 0 && (picked as number) < question.item.options.length)) || typeof data.checked !== 'boolean') return undefined;
    return { picked: picked as number | null, checked: data.checked && picked !== null };
  }
  if (question.kind === 'diagram') {
    if (!Array.isArray(data.left) || !Array.isArray(data.right) || !data.left.every(isText) || !data.right.every(isText)) return undefined;
    const checked = data.checked === true || data.checked === false ? data.checked : null;
    return { left: data.left, right: data.right, side: data.side === 'right' ? 'right' : 'left', checked: checked !== null && data.left.length > 0 && data.right.length > 0 ? checked : null };
  }
  if (!isText(data.diagram) || !isText(data.readback) || !isTextOrNull(data.target) || !isTextOrNull(data.left)) return undefined;
  const comparing = data.comparing === true;
  return { diagram: data.diagram, readback: data.readback, comparing, target: data.target as string | null, left: data.left as string | null, checked: comparing && data.checked === true && data.target !== null && data.left !== null };
}

function confirmationQuestions(results: Record<string, Result>): Question[] {
  const errors = [...new Set(baselineQuestions.flatMap(item => results[item.id]?.errors ?? []))];
  return errors.flatMap(error => {
    const obligationMiss = error === 'equivalence' && results['mixed-transfer-4']?.errors.includes('equivalence');
    const ruleComparisonMiss = equivalenceItems.some(item => results[item.id]?.errors.includes('equivalence'));
    const items = obligationMiss ? [...(ruleComparisonMiss ? confirmationItemsByError.equivalence.slice(0, 1) : []), obligationConfirmationItem] : confirmationItemsByError[error].slice(0, 1);
    return items.map(item => ({ id: item.id, stage: 5, kind: 'choice' as const, item }));
  });
}

<<<<<<< HEAD
function ChoiceQuestion({ item, onCheck, draft, onDraft }: { item: MixedDrillChoiceItem; onCheck: Check; draft?: ChoiceDraft; onDraft?: SaveDraft }) {
  const [picked, setPicked] = useState<number | null>(draft?.picked ?? null);
||||||| 64792cc5
function ChoiceQuestion({ item, onCheck }: { item: MixedDrillChoiceItem; onCheck: Check }) {
  const [picked, setPicked] = useState<number | null>(null);
=======
function ChoiceQuestion({ item, onCheck, initialAttempt, onAttempt }: { item: MixedDrillChoiceItem; onCheck: Check; initialAttempt?: ChoiceAttempt; onAttempt: (attempt: Attempt) => void }) {
  const [picked, setPicked] = useState<number | null>(initialAttempt?.picked ?? null);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const firstAnswer = useRef<HTMLButtonElement>(null);
<<<<<<< HEAD
  const [checked, setChecked] = useState(draft?.checked ?? false);
  const draftChanged = useRef(onDraft);
  draftChanged.current = onDraft;
  const firstDraft = useRef(true);
  useEffect(() => { if (firstDraft.current) { firstDraft.current = false; return; } draftChanged.current?.({ picked, checked }); }, [picked, checked]);
||||||| 64792cc5
  const [checked, setChecked] = useState(false);
=======
  const [checked, setChecked] = useState(initialAttempt?.checked ?? false);
  useEffect(() => { onAttempt({ picked, checked }); }, [picked, checked, onAttempt]);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  return <div className="omd-question">
    <blockquote>{item.sentence}</blockquote><h3>{item.prompt}</h3>
    <div className="omd-options" role="group" aria-label="Answer choices">{item.options.map((option, index) => <button ref={index === 0 ? firstAnswer : undefined} type="button" key={option} aria-pressed={picked === index} onClick={() => { setPicked(index); setChecked(false); onCheck(null); }}>{option}</button>)}</div>
    <button type="button" className="omd-primary" disabled={picked === null} onClick={() => { setChecked(true); onCheck(picked === item.correct, picked === item.correct ? [] : [item.errorByOption?.[picked] ?? item.skill]); }}>Check answer</button>
    <div role="status" aria-atomic="true" className={checked ? 'omd-feedback' : undefined} data-correct={checked ? picked === item.correct : undefined}>{checked && <><p>{item.feedback[picked]}</p>
      {picked !== item.correct && <button type="button" onClick={() => { setChecked(false); setPicked(null); onCheck(null); firstAnswer.current?.focus(); }}>Try this question again</button>}
    </>}</div>
  </div>;
}

<<<<<<< HEAD
function DrillQuestion({ question, onCheck, draft, onDraft }: { question: Question; onCheck: Check; draft?: Response; onDraft?: SaveDraft }) {
  if (question.kind === 'choice') return <ChoiceQuestion item={question.item} onCheck={onCheck} draft={draft as ChoiceDraft | undefined} onDraft={onDraft}/>;
  if (question.kind === 'independent') return <MixedItemCheck item={question.item} index={question.itemIndex} embedded initialDraft={draft as MixedItemDraft | undefined} onDraft={onDraft} onChecked={() => undefined} onResult={result => {
||||||| 64792cc5
function DrillQuestion({ question, onCheck }: { question: Question; onCheck: Check }) {
  if (question.kind === 'choice') return <ChoiceQuestion item={question.item} onCheck={onCheck}/>;
  if (question.kind === 'independent') return <MixedItemCheck item={question.item} index={question.itemIndex} embedded onChecked={() => undefined} onResult={result => {
=======
function DrillQuestion({ question, onCheck, initialAttempt, onAttempt }: { question: Question; onCheck: Check; initialAttempt?: Attempt; onAttempt: (attempt: Attempt) => void }) {
  if (question.kind === 'choice') return <ChoiceQuestion item={question.item} onCheck={onCheck} initialAttempt={initialAttempt as ChoiceAttempt} onAttempt={onAttempt}/>;
  if (question.kind === 'independent') return <MixedItemCheck initialAttempt={initialAttempt as MixedAttempt} onAttempt={onAttempt} item={question.item} index={question.itemIndex} embedded onChecked={() => undefined} onResult={result => {
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
    if (!result) return onCheck(null);
    const errors: MixedDrillError[] = [];
    if (!result.targetCorrect) errors.push(result.targetIncomplete ? 'qualification' : question.item.family === 'necessary' ? 'requirement' : 'direction');
    if (!result.sideCorrect) errors.push(question.item.family === 'necessary' ? 'requirement' : 'direction');
    onCheck(result.targetCorrect && result.sideCorrect, errors);
  }}/>;
<<<<<<< HEAD
  return <DiagramQuestion item={question.item} onCheck={onCheck} draft={draft as DiagramDraft | undefined} onDraft={onDraft}/>;
||||||| 64792cc5
  return <DiagramQuestion item={question.item} onCheck={onCheck}/>;
=======
  return <DiagramQuestion item={question.item} onCheck={onCheck} initialAttempt={initialAttempt as DiagramAttempt} onAttempt={onAttempt}/>;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
}

/** Hint only on a wrong diagram; the full diagram and explanation appear once it is right. */
<<<<<<< HEAD
function DiagramQuestion({ item, onCheck, draft, onDraft }: { item: DiagramItem; onCheck: Check; draft?: DiagramDraft; onDraft?: SaveDraft }) {
  const [solved, setSolved] = useState<boolean | null>(draft?.checked ?? null);
||||||| 64792cc5
function DiagramQuestion({ item, onCheck }: { item: DiagramItem; onCheck: Check }) {
  const [solved, setSolved] = useState<boolean | null>(null);
=======
function DiagramQuestion({ item, onCheck, initialAttempt, onAttempt }: { item: DiagramItem; onCheck: Check; initialAttempt?: DiagramAttempt; onAttempt: (attempt: Attempt) => void }) {
  const [solved, setSolved] = useState<boolean | null>(initialAttempt?.checked ?? null);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return <div className="cir-root omd-diagram" data-result={solved === null ? undefined : solved ? 'right' : 'wrong'}><p>Build the original diagram, then read it as an if/then sentence before checking.</p>
<<<<<<< HEAD
    <DiagramDrills items={[item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={solved ? diagramFollowUps : {}} initialDraft={draft} onDraft={onDraft} feedbackForResult={result => {
||||||| 64792cc5
    <DiagramDrills items={[item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={solved ? diagramFollowUps : {}} feedbackForResult={result => {
      if (result.correct) return `Right. Read it back: ${diagramReadbacks[item.id]?.readback ?? `If ${item.left.toLowerCase()}, then ${item.right.toLowerCase()}.`}`;
=======
    <DiagramDrills initialAttempt={initialAttempt} onAttempt={onAttempt} items={[item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={solved ? diagramFollowUps : {}} feedbackForResult={result => {
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
      if (result.correct) return `Correct. Read it back: ${diagramReadbacks[item.id]?.readback ?? `If ${item.left.toLowerCase()}, then ${item.right.toLowerCase()}.`}`;
      const reversed = same(result.left, item.right) && same(result.right, item.left);
      if (reversed) return 'Check which condition is enough to prove the other.';
      return 'Use each condition once, one on each side. Extra or repeated words change the diagram. Check which condition is enough to prove the other.';
    }} onResult={result => {
      setSolved(result ? result.correct : null);
      if (!result) return onCheck(null);
      const reversed = same(result.left, item.right) && same(result.right, item.left);
      onCheck(result.correct, result.correct ? [] : [reversed && item.group === 'g2' ? 'requirement' : 'direction']);
    }}/>
  </div>;
}

<<<<<<< HEAD
const RetainedQuestion = memo(function RetainedQuestion({ question, record, draft, saveDraft }: {
||||||| 64792cc5
const RetainedQuestion = memo(function RetainedQuestion({ question, record }: {
=======
const RetainedQuestion = memo(function RetainedQuestion({ question, record, initialAttempt, recordAttempt }: {
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  question: Question;
  record: (id: string, correct: boolean | null, errors?: MixedDrillError[]) => void;
<<<<<<< HEAD
  draft?: Response;
  saveDraft: (id: string, draft: Response) => void;
||||||| 64792cc5
=======
  initialAttempt?: Attempt;
  recordAttempt: (id: string, attempt: Attempt) => void;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
}) {
<<<<<<< HEAD
  return <DrillQuestion question={question} draft={draft} onDraft={next => saveDraft(question.id, next)} onCheck={(correct, errors) => record(question.id, correct, errors)}/>;
||||||| 64792cc5
  return <DrillQuestion question={question} onCheck={(correct, errors) => record(question.id, correct, errors)}/>;
=======
  const onAttempt = useCallback((attempt: Attempt) => recordAttempt(question.id, attempt), [question.id, recordAttempt]);
  return <DrillQuestion question={question} initialAttempt={initialAttempt} onAttempt={onAttempt} onCheck={(correct, errors) => record(question.id, correct, errors)}/>;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
});

const confirmationPool: MixedDrillChoiceItem[] = [...Object.values(confirmationItemsByError).flat(), obligationConfirmationItem];
<<<<<<< HEAD
type MixedState = { questions: Question[]; current: number; visited: string[]; results: Record<string, Result>; responses: Record<string, Response>; finished: boolean; introducedStages: number[] };
/**
 * Rebuilds a saved run. Anything that no longer matches the current question set
 * starts fresh. Runs saved before responses were stored still open, with their
 * results and no restored work.
 */
||||||| 64792cc5
type MixedState = { questions: Question[]; current: number; visited: string[]; results: Record<string, Result>; finished: boolean; introducedStages: number[] };
/** Rebuilds a saved run. Anything that no longer matches the current question set starts fresh. */
=======
const questionFingerprint = JSON.stringify(baselineQuestions);
type MixedState = { archived: unknown[]; attempts: Record<string, Attempt>; questions: Question[]; current: number; visited: string[]; results: Record<string, Result>; finished: boolean; introducedStages: number[] };
/** Rebuilds a saved run. Anything that no longer matches the current question set starts fresh. */
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
function restoreMixed(state: unknown): MixedState | null {
<<<<<<< HEAD
  const data = state as { questionIds?: unknown; current?: unknown; visited?: unknown; results?: unknown; responses?: unknown; finished?: unknown; introducedStages?: unknown } | undefined;
||||||| 64792cc5
  const data = state as { questionIds?: unknown; current?: unknown; visited?: unknown; results?: unknown; finished?: unknown; introducedStages?: unknown } | undefined;
=======
  const data = state as { archived?: unknown[]; fingerprint?: unknown; attempts?: Record<string, Attempt>; questionIds?: unknown; current?: unknown; visited?: unknown; results?: unknown; finished?: unknown; introducedStages?: unknown } | undefined;
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  if (!data || !Array.isArray(data.questionIds) || !data.results || typeof data.results !== 'object') return null;
  const currentContent = data.fingerprint === questionFingerprint;
  const archived = [...(Array.isArray(data.archived) ? data.archived : []), ...(!currentContent ? [{ ...data, archived: undefined }] : [])].slice(-3);
  const ids = data.questionIds as unknown[];
  if (ids.length < baselineQuestions.length || baselineQuestions.some((question, index) => ids[index] !== question.id)) return null;
  const extra = ids.slice(baselineQuestions.length).map(id => confirmationPool.find(item => item.id === id));
  if (extra.some(item => !item)) return null;
  const questions: Question[] = [...baselineQuestions, ...extra.map(item => ({ id: item!.id, stage: 5, kind: 'choice' as const, item: item! }))];
  const attempts: Record<string, Attempt> = {};
  if (currentContent && data.attempts && typeof data.attempts === 'object') for (const question of questions) {
    const raw = data.attempts[question.id] as Record<string, unknown> | undefined;
    if (!raw || typeof raw.checked !== 'boolean' && raw.checked !== null) continue;
    if (question.kind === 'choice' && (raw.picked === null || Number.isInteger(raw.picked) && Number(raw.picked) >= 0 && Number(raw.picked) < question.item.options.length) && typeof raw.checked === 'boolean') attempts[question.id] = raw as ChoiceAttempt;
    if (question.kind === 'diagram' && Array.isArray(raw.left) && Array.isArray(raw.right) && [...raw.left, ...raw.right].every(token => typeof token === 'string') && (raw.side === 'left' || raw.side === 'right')) attempts[question.id] = raw as DiagramAttempt;
    if (question.kind === 'independent' && typeof raw.draftDiagram === 'string' && typeof raw.draftReadback === 'string' && typeof raw.comparing === 'boolean' && typeof raw.checked === 'boolean' && (raw.target === null || typeof raw.target === 'string') && (raw.left === null || typeof raw.left === 'string')) attempts[question.id] = raw as MixedAttempt;
  }
  const results: Record<string, Result> = {};
  for (const [id, raw] of Object.entries(data.results as Record<string, Partial<Result>>)) {
    if (currentContent && attempts[id] && questions.some(question => question.id === id) && raw && typeof raw.firstCorrect === 'boolean' && typeof raw.correct === 'boolean' && Array.isArray(raw.errors)) results[id] = { firstCorrect: raw.firstCorrect, correct: raw.correct, errors: raw.errors.filter((error): error is MixedDrillError => error in errorLabels) };
  }
  const savedCurrent = Number.isInteger(data.current) && (data.current as number) >= 0 && (data.current as number) < questions.length ? data.current as number : 0;
  const firstUnfinished = questions.findIndex(question => !results[question.id]?.correct);
  const current = firstUnfinished < 0 ? savedCurrent : Math.min(savedCurrent, firstUnfinished);
  const visited = Array.isArray(data.visited) ? (data.visited as unknown[]).filter((id): id is string => questions.some(question => question.id === id)) : [];
  const introducedStages = Array.isArray(data.introducedStages) ? (data.introducedStages as unknown[]).filter((value): value is number => Number.isInteger(value)) : [];
<<<<<<< HEAD
  const responses: Record<string, Response> = {};
  if (data.responses && typeof data.responses === 'object') for (const question of questions) {
    const response = readResponse(question, (data.responses as Record<string, unknown>)[question.id]);
    if (response) responses[question.id] = response;
  }
  return { questions, current, visited: visited.length ? visited : [questions[current].id], results, responses, finished: data.finished === true, introducedStages };
||||||| 64792cc5
  return { questions, current, visited: visited.length ? visited : [questions[current].id], results, finished: data.finished === true, introducedStages };
=======
  return { archived, attempts, questions, current, visited: visited.length ? visited : [questions[current].id], results, finished: data.finished === true && questions.every(question => results[question.id]?.correct), introducedStages };
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
}

export function OpeningMixedDrill({ stepId }: { stepId?: string } = {}) {
  const course = useCourseStep(stepId);
  const saveStep = course?.record;
<<<<<<< HEAD
  const savedState = course?.saved?.state;
  const [restored] = useState(() => restoreMixed(savedState));
||||||| 64792cc5
  const [restored] = useState(() => restoreMixed(course?.saved?.state));
=======
  const [restored] = useState(() => restoreMixed(course?.saved?.state));
  const [attempts, setAttempts] = useState<Record<string, Attempt>>(restored?.attempts ?? {});
  const recordAttempt = useCallback((id: string, attempt: Attempt) => setAttempts(previous => ({ ...previous, [id]: attempt })), []);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const [questions, setQuestions] = useState<Question[]>(restored?.questions ?? baselineQuestions);
  const [current, setCurrent] = useState(restored?.current ?? 0);
  const [visited, setVisited] = useState(restored?.visited ?? [baselineQuestions[0].id]);
  const [results, setResults] = useState<Record<string, Result>>(restored?.results ?? {});
  const [responses, setResponses] = useState<Record<string, Response>>(restored?.responses ?? {});
  // Bumped when a late account copy replaces the run, so each question reopens with its saved work.
  const [generation, setGeneration] = useState(0);
  const [finished, setFinished] = useState(restored?.finished ?? false);
  const [introducedStages, setIntroducedStages] = useState<number[]>(restored?.introducedStages ?? []);
  // The account can finish loading after the drill opens. Until the student does
  // something here, take the saved run instead of starting them from the beginning.
  const touched = useRef(false);
  const written = useRef<unknown>(savedState);
  useEffect(() => {
<<<<<<< HEAD
    if (touched.current || !savedState || savedState === written.current) return;
    written.current = savedState;
    const late = restoreMixed(savedState);
    if (!late) return;
    setQuestions(late.questions); setCurrent(late.current); setVisited(late.visited); setResults(late.results); setResponses(late.responses); setFinished(late.finished); setIntroducedStages(late.introducedStages); setGeneration(value => value + 1);
  }, [savedState]);
  useEffect(() => {
    const state = { questionIds: questions.map(question => question.id), current, visited, results, responses, finished, introducedStages };
    written.current = state;
    saveStep?.({ state, done: baselineQuestions.filter(question => results[question.id]).length, total: baselineQuestions.length, ...(finished ? { status: 'done' as const } : {}) });
  }, [saveStep, questions, current, visited, results, responses, finished, introducedStages]);
||||||| 64792cc5
    saveStep?.({ state: { questionIds: questions.map(question => question.id), current, visited, results, finished, introducedStages }, done: baselineQuestions.filter(question => results[question.id]).length, total: baselineQuestions.length, ...(finished ? { status: 'done' as const } : {}) });
  }, [saveStep, questions, current, visited, results, finished, introducedStages]);
=======
    saveStep?.({ state: { archived: restored?.archived ?? [], fingerprint: questionFingerprint, attempts, questionIds: questions.map(question => question.id), current, visited, results, finished, introducedStages }, done: questions.filter(question => results[question.id]?.correct).length, total: questions.length, status: finished ? 'done' : 'started' });
  }, [saveStep, questions, current, visited, results, finished, introducedStages, attempts]);
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
  const heading = useRef<HTMLHeadingElement>(null);
  const runner = useRef<HTMLElement>(null);
  const question = questions[current];
  const stage = stages[question.stage];
  const showIntroduction = !finished && !introducedStages.includes(question.stage);
  const lastPosition = useRef({ current, finished, showIntroduction });
  useEffect(() => {
    if (lastPosition.current.current === current && lastPosition.current.finished === finished && lastPosition.current.showIntroduction === showIntroduction) return;
    lastPosition.current = { current, finished, showIntroduction };
    heading.current?.focus({ preventScroll: true });
    runner.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [current, finished, showIntroduction]);

  const record = useCallback((id: string, correct: boolean | null, errors: MixedDrillError[] = []) => {
    touched.current = true;
    setResults(previous => {
      const old = previous[id];
      if (correct === null) return old ? { ...previous, [id]: { ...old, correct: false } } : previous;
      return { ...previous, [id]: old ? { ...old, correct, errors: [...new Set([...old.errors, ...errors])] } : { firstCorrect: correct, correct, errors } };
    });
  }, []);
  const saveDraft = useCallback((id: string, draft: Response) => {
    touched.current = true;
    setResponses(previous => ({ ...previous, [id]: draft }));
  }, []);
  function move(index: number) {
    touched.current = true;
    setCurrent(index);
    setVisited(previous => previous.includes(questions[index].id) ? previous : [...previous, questions[index].id]);
  }
  const pendingConfirmations = questions.length === baselineQuestions.length ? confirmationQuestions(results) : [];
  function next() {
    touched.current = true;
    if (current + 1 < questions.length) return move(current + 1);
    if (questions.length === baselineQuestions.length) {
      const confirmations = pendingConfirmations;
      if (confirmations.length) {
        setQuestions(previous => [...previous, ...confirmations]);
        setVisited(previous => [...previous, confirmations[0].id]);
        setCurrent(current + 1);
        return;
      }
    }
    const unfinished = questions.findIndex(item => !results[item.id]?.correct);
    if (unfinished >= 0) return move(unfinished);
    setFinished(true);
  }

  const firstCorrect = baselineQuestions.filter(item => results[item.id]?.firstCorrect).length;
  const corrected = baselineQuestions.filter(item => results[item.id]?.firstCorrect === false && results[item.id]?.correct).length;
  const confirmations = questions.filter(item => item.stage === 5);
  return <section ref={runner} className="omd-runner" aria-label="Conditional translation practice">
    <div className="omd-summary" hidden={!finished}><h2 ref={finished ? heading : undefined} tabIndex={-1}>Review your practice</h2>
      <p>You answered {firstCorrect} of {baselineQuestions.length} correctly on your first try. You corrected {corrected} after checking the explanation.</p>
      <p>This result covers your answer choices and the diagrams you built with the supplied words. Your written translations are for you to compare with the examples.</p>
      {!!confirmations.length && <><h3>How the new sentences went</h3><ul>{confirmations.map(item => <li key={item.id}>{item.id === obligationConfirmationItem.id ? 'What is required and what actually happened' : item.kind === 'choice' && errorLabels[item.item.skill]}: {results[item.id]?.firstCorrect ? 'you answered the new question correctly on your first try' : 'you corrected the new question after checking the explanation. Give this another try with a different sentence'}.</li>)}</ul></>}
      <p>When you return to a sentence, read your diagram back in English. Keep every restriction, and ask whether your arrow says more than the rule does.</p>
      <button type="button" className="omd-primary" onClick={() => { setFinished(false); move(0); }}>Review my answers</button>
    </div>
    <div className="omd-introduction" hidden={!showIntroduction}>
      <h2 ref={showIntroduction ? heading : undefined} tabIndex={-1}>{stage.title}</h2>
      <p>{stage.purpose}</p>
      {stage.example && <blockquote>{stage.example}</blockquote>}
      <p>{stage.explanation}</p><p>{stage.instruction}</p>
      <button type="button" className="omd-primary" onClick={() => { touched.current = true; setIntroducedStages(previous => [...previous, question.stage]); }}>{question.stage === 0 ? 'Begin practice' : 'Continue'}</button>
    </div>
    <div hidden={finished || showIntroduction}>
    <div className="omd-progress-heading"><p>{question.stage < 5 ? `Stage ${question.stage + 1} of 5` : `${baselineQuestions.length} main questions completed`}</p><p>{question.stage < 5 ? `Question ${current + 1} of ${baselineQuestions.length}` : `Fresh check ${current - baselineQuestions.length + 1} of ${questions.length - baselineQuestions.length}`}</p></div>
    <div className="omd-progress" role="progressbar" aria-label={question.stage < 5 ? 'Main questions completed' : 'Fresh checks completed'} aria-valuemin={0} aria-valuemax={question.stage < 5 ? baselineQuestions.length : questions.length - baselineQuestions.length} aria-valuenow={questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length}><span style={{ width: `${questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length / (question.stage < 5 ? baselineQuestions.length : questions.length - baselineQuestions.length) * 100}%` }}/></div>
    <h2 ref={!finished && !showIntroduction ? heading : undefined} tabIndex={-1}>{stage.title}</h2><p className="omd-purpose">{stage.purpose}</p>
    </div>
<<<<<<< HEAD
    {questions.filter(item => visited.includes(item.id)).map(item => <div key={`${generation}-${item.id}`} hidden={finished || showIntroduction || item.id !== question.id} data-mixed-question={item.id}><RetainedQuestion question={item} record={record} draft={responses[item.id]} saveDraft={saveDraft}/></div>)}
||||||| 64792cc5
    {questions.filter(item => visited.includes(item.id)).map(item => <div key={item.id} hidden={finished || showIntroduction || item.id !== question.id} data-mixed-question={item.id}><RetainedQuestion question={item} record={record}/></div>)}
=======
    {questions.filter(item => visited.includes(item.id)).map(item => <div key={item.id} hidden={finished || showIntroduction || item.id !== question.id} data-mixed-question={item.id}><RetainedQuestion question={item} record={record} initialAttempt={restored?.attempts[item.id]} recordAttempt={recordAttempt}/></div>)}
>>>>>>> origin/claude/conditional-four-situations-2026-10-13
    {!finished && !showIntroduction && <nav className="omd-navigation" aria-label="Practice questions"><button type="button" disabled={current === 0} onClick={() => move(current - 1)}>Previous question</button><button type="button" className="omd-primary" disabled={!results[question.id]?.correct} onClick={next}>{current === questions.length - 1 ? (question.stage === 5 ? 'Finish practice' : pendingConfirmations.length ? 'Try a fresh case' : 'Review practice') : 'Next question'}</button></nav>}
  </section>;
}
