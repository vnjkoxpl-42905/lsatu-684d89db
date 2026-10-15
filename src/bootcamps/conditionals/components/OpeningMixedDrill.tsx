import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { DiagramDrills } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
import { openingActivityExplanations, openingActivityItems } from '../content/openingActivityItems';
import { completeConditionItems, confirmationItemsByError, equivalenceItems, obligationConfirmationItem, transferItems, type MixedDrillChoiceItem, type MixedDrillError } from '../content/mixedDrillItems';
import { MixedItemCheck, mixedFamilyItems } from './MixedFamilyPractice';
import { useCourseStep } from '../courseProgress';
import './opening-mixed-drill.css';

export const mixedDrillStages = [
  { title: 'What does the rule cover?', purpose: 'Keep the restriction that tells you which cases the rule covers.', example: 'Every guest wearing a gold badge receives a voucher.', explanation: 'The rule covers guests wearing a gold badge. Leaving out wearing a gold badge would make a claim about all guests.', instruction: 'Choose the description that keeps the restriction in each rule.' },
  { title: 'Build the diagram', purpose: 'If the condition on the left is true, what must follow on the right?', example: 'If a parcel has a blue sticker, it has been inspected.', explanation: 'A blue sticker is enough to prove inspection. Inspection is required for a blue-sticker parcel. An inspected parcel could still have no blue sticker.', instruction: 'Choose a side of the arrow, then choose the condition that belongs there. Read the diagram in English before checking.' },
  { title: 'Translate the rule yourself', purpose: 'Write your own diagram before looking at supplied conditions.', example: 'Only members use the studio.', explanation: 'First decide what the rule says you need in order to use the studio. Write both conditions and an arrow, then read your diagram as an if/then sentence.', instruction: 'Write your diagram and English version. Compare with the choices only after making that attempt.' },
  { title: 'Does the meaning change?', purpose: 'Different wording can keep a rule or change what it promises.', example: 'Every parcel in Locker 4 has been scanned.', explanation: 'This tells you something about parcels in Locker 4. It leaves scanned parcels elsewhere possible. Use that distinction when comparing another way of wording a rule.', instruction: 'Compare what each rule requires. Try a possible case that fits one but would break the other.' },
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
type Check = (correct: boolean | null, errors?: MixedDrillError[]) => void;

function confirmationQuestions(results: Record<string, Result>): Question[] {
  const errors = [...new Set(baselineQuestions.flatMap(item => results[item.id]?.errors ?? []))];
  return errors.flatMap(error => {
    const items = error === 'equivalence' && results['mixed-transfer-4']?.errors.includes('equivalence') ? [obligationConfirmationItem] : confirmationItemsByError[error].slice(0, 1);
    return items.map(item => ({ id: item.id, stage: 5, kind: 'choice' as const, item }));
  });
}

function ChoiceQuestion({ item, onCheck }: { item: MixedDrillChoiceItem; onCheck: Check }) {
  const [picked, setPicked] = useState<number | null>(null);
  const firstAnswer = useRef<HTMLButtonElement>(null);
  const [checked, setChecked] = useState(false);
  return <div className="omd-question">
    <blockquote>{item.sentence}</blockquote><h3>{item.prompt}</h3>
    <div className="omd-options" role="group" aria-label="Answer choices">{item.options.map((option, index) => <button ref={index === 0 ? firstAnswer : undefined} type="button" key={option} aria-pressed={picked === index} onClick={() => { setPicked(index); setChecked(false); onCheck(null); }}>{option}</button>)}</div>
    <button type="button" className="omd-primary" disabled={picked === null} onClick={() => { setChecked(true); onCheck(picked === item.correct, picked === item.correct ? [] : [item.errorByOption?.[picked] ?? item.skill]); }}>Check answer</button>
    <div role="status" aria-atomic="true" className={checked ? 'omd-feedback' : undefined} data-correct={checked ? picked === item.correct : undefined}>{checked && <><p>{item.feedback[picked]}</p>
      {picked !== item.correct && <button type="button" onClick={() => { setChecked(false); setPicked(null); onCheck(null); firstAnswer.current?.focus(); }}>Try this question again</button>}
    </>}</div>
  </div>;
}

function DrillQuestion({ question, onCheck }: { question: Question; onCheck: Check }) {
  if (question.kind === 'choice') return <ChoiceQuestion item={question.item} onCheck={onCheck}/>;
  if (question.kind === 'independent') return <MixedItemCheck item={question.item} index={question.itemIndex} embedded onChecked={() => undefined} onResult={result => {
    if (!result) return onCheck(null);
    const errors: MixedDrillError[] = [];
    if (!result.targetCorrect) errors.push(result.targetIncomplete ? 'qualification' : 'direction');
    if (!result.sideCorrect) errors.push(question.item.family === 'necessary' ? 'requirement' : 'direction');
    onCheck(result.targetCorrect && result.sideCorrect, errors);
  }}/>;
  return <DiagramQuestion item={question.item} onCheck={onCheck}/>;
}

/** Hint only on a wrong diagram; the full diagram and explanation appear once it is right. */
function DiagramQuestion({ item, onCheck }: { item: DiagramItem; onCheck: Check }) {
  const [solved, setSolved] = useState<boolean | null>(null);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return <div className="cir-root omd-diagram" data-result={solved === null ? undefined : solved ? 'right' : 'wrong'}>
    <DiagramDrills items={[item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={solved ? diagramFollowUps : {}} feedbackForResult={result => {
      if (result.correct) return `Right. Read it back: ${diagramReadbacks[item.id]?.readback ?? `If ${item.left.toLowerCase()}, then ${item.right.toLowerCase()}.`}`;
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

const RetainedQuestion = memo(function RetainedQuestion({ question, record }: {
  question: Question;
  record: (id: string, correct: boolean | null, errors?: MixedDrillError[]) => void;
}) {
  return <DrillQuestion question={question} onCheck={(correct, errors) => record(question.id, correct, errors)}/>;
});

const confirmationPool: MixedDrillChoiceItem[] = [...Object.values(confirmationItemsByError).flat(), obligationConfirmationItem];
type MixedState = { questions: Question[]; current: number; visited: string[]; results: Record<string, Result>; finished: boolean };
/** Rebuilds a saved run. Anything that no longer matches the current question set starts fresh. */
function restoreMixed(state: unknown): MixedState | null {
  const data = state as { questionIds?: unknown; current?: unknown; visited?: unknown; results?: unknown; finished?: unknown } | undefined;
  if (!data || !Array.isArray(data.questionIds) || !data.results || typeof data.results !== 'object') return null;
  const ids = data.questionIds as unknown[];
  if (ids.length < baselineQuestions.length || baselineQuestions.some((question, index) => ids[index] !== question.id)) return null;
  const extra = ids.slice(baselineQuestions.length).map(id => confirmationPool.find(item => item.id === id));
  if (extra.some(item => !item)) return null;
  const questions: Question[] = [...baselineQuestions, ...extra.map(item => ({ id: item!.id, stage: 5, kind: 'choice' as const, item: item! }))];
  const results: Record<string, Result> = {};
  for (const [id, raw] of Object.entries(data.results as Record<string, Partial<Result>>)) {
    if (raw && typeof raw.firstCorrect === 'boolean' && typeof raw.correct === 'boolean' && Array.isArray(raw.errors)) results[id] = { firstCorrect: raw.firstCorrect, correct: raw.correct, errors: raw.errors.filter((error): error is MixedDrillError => error in errorLabels) };
  }
  const current = Number.isInteger(data.current) && (data.current as number) >= 0 && (data.current as number) < questions.length ? data.current as number : 0;
  const visited = Array.isArray(data.visited) ? (data.visited as unknown[]).filter((id): id is string => questions.some(question => question.id === id)) : [];
  return { questions, current, visited: visited.length ? visited : [questions[current].id], results, finished: data.finished === true };
}

export function OpeningMixedDrill({ stepId }: { stepId?: string } = {}) {
  const course = useCourseStep(stepId);
  const saveStep = course?.record;
  const [restored] = useState(() => restoreMixed(course?.saved?.state));
  const [questions, setQuestions] = useState<Question[]>(restored?.questions ?? baselineQuestions);
  const [current, setCurrent] = useState(restored?.current ?? 0);
  const [visited, setVisited] = useState(restored?.visited ?? [baselineQuestions[0].id]);
  const [results, setResults] = useState<Record<string, Result>>(restored?.results ?? {});
  const [finished, setFinished] = useState(restored?.finished ?? false);
  useEffect(() => {
    saveStep?.({ state: { questionIds: questions.map(question => question.id), current, visited, results, finished }, done: baselineQuestions.filter(question => results[question.id]).length, total: baselineQuestions.length, ...(finished ? { status: 'done' as const } : {}) });
  }, [saveStep, questions, current, visited, results, finished]);
  const heading = useRef<HTMLHeadingElement>(null);
  const runner = useRef<HTMLElement>(null);
  const question = questions[current];
  const stage = mixedDrillStages[question.stage];
  const lastPosition = useRef({ current, finished });
  useEffect(() => {
    if (lastPosition.current.current === current && lastPosition.current.finished === finished) return;
    lastPosition.current = { current, finished };
    heading.current?.focus({ preventScroll: true });
    runner.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [current, finished]);

  const record = useCallback((id: string, correct: boolean | null, errors: MixedDrillError[] = []) => {
    setResults(previous => {
      const old = previous[id];
      if (correct === null) return old ? { ...previous, [id]: { ...old, correct: false } } : previous;
      return { ...previous, [id]: old ? { ...old, correct, errors: [...new Set([...old.errors, ...errors])] } : { firstCorrect: correct, correct, errors } };
    });
  }, []);
  function move(index: number) {
    setCurrent(index);
    setVisited(previous => previous.includes(questions[index].id) ? previous : [...previous, questions[index].id]);
  }
  const pendingConfirmations = questions.length === baselineQuestions.length ? confirmationQuestions(results) : [];
  function next() {
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
      <p>When you return to a sentence, read your diagram back in English. Keep every restriction, and ask whether your arrow promises more than the rule does.</p>
      <button type="button" className="omd-primary" onClick={() => { setFinished(false); move(0); }}>Review my answers</button>
    </div>
    <div hidden={finished}>
    <div className="omd-progress-heading"><p>{question.stage < 5 ? `Stage ${question.stage + 1} of 5` : `${baselineQuestions.length} main questions completed`}</p><p>{question.stage < 5 ? `Question ${current + 1} of ${baselineQuestions.length}` : `Fresh check ${current - baselineQuestions.length + 1} of ${questions.length - baselineQuestions.length}`}</p></div>
    <div className="omd-progress" role="progressbar" aria-label={question.stage < 5 ? 'Main questions completed' : 'Fresh checks completed'} aria-valuemin={0} aria-valuemax={question.stage < 5 ? baselineQuestions.length : questions.length - baselineQuestions.length} aria-valuenow={questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length}><span style={{ width: `${questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length / (question.stage < 5 ? baselineQuestions.length : questions.length - baselineQuestions.length) * 100}%` }}/></div>
    <h2 ref={!finished ? heading : undefined} tabIndex={-1}>{stage.title}</h2>
    </div>
    {questions.filter(item => visited.includes(item.id)).map(item => <div key={item.id} hidden={finished || item.id !== question.id} data-mixed-question={item.id}><RetainedQuestion question={item} record={record}/></div>)}
    {!finished && <nav className="omd-navigation" aria-label="Practice questions"><button type="button" disabled={current === 0} onClick={() => move(current - 1)}>Previous question</button><button type="button" className="omd-primary" disabled={!results[question.id]?.correct} onClick={next}>{current === questions.length - 1 ? (question.stage === 5 ? 'Finish practice' : pendingConfirmations.length ? 'Try a fresh case' : 'Review practice') : 'Next question'}</button></nav>}
  </section>;
}
