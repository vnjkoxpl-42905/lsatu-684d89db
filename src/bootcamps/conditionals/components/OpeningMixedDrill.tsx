import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { DiagramDrills } from '@/features/conditional-refresher/ConditionalIndicatorsRefresher';
import { openingActivityExplanations, openingActivityItems } from '../content/openingActivityItems';
import { completeConditionItems, confirmationItemsByError, equivalenceItems, obligationConfirmationItem, transferItems, type MixedDrillChoiceItem, type MixedDrillError } from '../content/mixedDrillItems';
import { MixedItemCheck, mixedFamilyItems } from './MixedFamilyPractice';
import './opening-mixed-drill.css';

const stages = [
  { title: 'What does the rule cover?', purpose: 'Keep the restriction that tells you which cases the sentence covers.', example: 'Every guest wearing a gold badge receives a voucher.', explanation: 'The rule covers guests wearing a gold badge. Leaving out wearing a gold badge would make a claim about all guests.', instruction: 'Choose the description that keeps the restriction in each sentence.' },
  { title: 'Build the diagram', purpose: 'If the condition on the left is true, what must follow on the right?', example: 'If a parcel has a blue sticker, it has been inspected.', explanation: 'A blue sticker is enough to establish inspection. Inspection is required for a blue-sticker parcel. An inspected parcel could still have no blue sticker.', instruction: 'Choose a side of the arrow, then choose the condition that belongs there. Read the diagram in English before checking.' },
  { title: 'Translate the sentence yourself', purpose: 'Write your own diagram before looking at supplied conditions.', example: 'Only members use the studio.', explanation: 'First decide what the sentence says you need in order to use the studio. Write both conditions and an arrow, then read your diagram as an if/then sentence.', instruction: 'Write your diagram and English version. Compare with the choices only after making that attempt.' },
  { title: 'Does the meaning change?', purpose: 'Different wording can preserve a rule or change what it promises.', example: 'Every parcel in Locker 4 has been scanned.', explanation: 'This tells you something about parcels in Locker 4. It leaves scanned parcels elsewhere possible. Use that distinction when comparing another way of wording a rule.', instruction: 'Compare what each sentence requires. Try a possible case that fits one but would break the other.' },
  { title: 'Try unfamiliar cases', purpose: 'Use the same reasoning with new wording.', example: 'Visitors must wear a badge.', explanation: 'This gives visitors an obligation. It does not tell you whether a visitor actually wore a badge. Permission, requirements and completed actions need different labels.', instruction: 'Read what is stated and choose only what it establishes. Keep qualifications and the strength of the claim.' },
  { title: 'Try the distinction in a new case', purpose: 'Now use the distinctions you revised with different sentences.', example: '', explanation: 'The next questions revisit mistakes from this practice with fresh examples.', instruction: 'Make a new attempt before checking. An answer you reach after feedback is useful practice, but it is different from getting a fresh case right on the first check.' },
];

type Question =
  | { id: string; stage: number; kind: 'choice'; item: MixedDrillChoiceItem }
  | { id: string; stage: number; kind: 'diagram'; item: (typeof openingActivityItems)[number] }
  | { id: string; stage: number; kind: 'independent'; item: (typeof mixedFamilyItems)[number]; itemIndex: number };

const baselineQuestions: Question[] = [
  ...completeConditionItems.map(item => ({ id: item.id, stage: 0, kind: 'choice' as const, item })),
  ...openingActivityItems.map(item => ({ id: item.id, stage: 1, kind: 'diagram' as const, item })),
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
  return <div className="cir-root omd-diagram"><p>Build the original diagram, then read it as an if/then sentence before checking.</p>
    <DiagramDrills items={[question.item]} embedded persistProgress={false} allowContrapositive={false} allowNegation={false} shuffleItems={false} explanations={openingActivityExplanations} feedbackForResult={result => {
      if (result.correct) return `Your diagram keeps ${question.item.left} as sufficient for ${question.item.right}.`;
      const reversed = result.left === question.item.right && result.right === question.item.left;
      if (reversed) return `Your arrow makes ${question.item.right} enough to establish ${question.item.left}. The rule makes ${question.item.left} enough to establish ${question.item.right}, and leaves the reverse open.`;
      return `Your diagram has “${result.left}” on the left and “${result.right}” on the right. Use each condition once: ${question.item.left} on the left, ${question.item.right} on the right. Extra or repeated words change the diagram.`;
    }} onResult={result => {
      if (!result) return onCheck(null);
      const reversed = result.left === question.item.right && result.right === question.item.left;
      onCheck(result.correct, result.correct ? [] : [reversed && question.item.group === 'g2' ? 'requirement' : 'direction']);
    }}/>
  </div>;
}

const RetainedQuestion = memo(function RetainedQuestion({ question, record }: {
  question: Question;
  record: (id: string, correct: boolean | null, errors?: MixedDrillError[]) => void;
}) {
  return <DrillQuestion question={question} onCheck={(correct, errors) => record(question.id, correct, errors)}/>;
});

export function OpeningMixedDrill() {
  const [questions, setQuestions] = useState<Question[]>(baselineQuestions);
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState([baselineQuestions[0].id]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [finished, setFinished] = useState(false);
  const [introducedStages, setIntroducedStages] = useState<number[]>([]);
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
      <p>You answered {firstCorrect} of 24 correctly on your first try. You corrected {corrected} after checking the explanation.</p>
      <p>This result covers your answer choices and the diagrams you built with the supplied words. Your written translations are for you to compare with the examples.</p>
      {!!confirmations.length && <><h3>How the new sentences went</h3><ul>{confirmations.map(item => <li key={item.id}>{item.id === obligationConfirmationItem.id ? 'What is required and what actually happened' : item.kind === 'choice' && errorLabels[item.item.skill]}: {results[item.id]?.firstCorrect ? 'you answered the new question correctly on your first try' : 'you corrected the new question after checking the explanation. Give this another try with a different sentence'}.</li>)}</ul></>}
      <p>When you return to a sentence, read your diagram back in English. Keep every restriction, and ask whether your arrow promises more than the sentence does.</p>
      <button type="button" className="omd-primary" onClick={() => { setFinished(false); move(0); }}>Review my answers</button>
    </div>
    <div className="omd-introduction" hidden={!showIntroduction}>
      <h2 ref={showIntroduction ? heading : undefined} tabIndex={-1}>{stage.title}</h2>
      <p>{stage.purpose}</p>
      {stage.example && <blockquote>{stage.example}</blockquote>}
      <p>{stage.explanation}</p><p>{stage.instruction}</p>
      <button type="button" className="omd-primary" onClick={() => setIntroducedStages(previous => [...previous, question.stage])}>{question.stage === 0 ? 'Begin practice' : 'Continue'}</button>
    </div>
    <div hidden={finished || showIntroduction}>
    <div className="omd-progress-heading"><p>{question.stage < 5 ? `Stage ${question.stage + 1} of 5` : '24 main questions completed'}</p><p>{question.stage < 5 ? `Question ${current + 1} of 24` : `Fresh check ${current - 23} of ${questions.length - 24}`}</p></div>
    <div className="omd-progress" role="progressbar" aria-label={question.stage < 5 ? 'Main questions completed' : 'Fresh checks completed'} aria-valuemin={0} aria-valuemax={question.stage < 5 ? 24 : questions.length - 24} aria-valuenow={questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length}><span style={{ width: `${questions.filter(item => (item.stage === 5) === (question.stage === 5) && results[item.id]?.correct).length / (question.stage < 5 ? 24 : questions.length - 24) * 100}%` }}/></div>
    <h2 ref={!finished && !showIntroduction ? heading : undefined} tabIndex={-1}>{stage.title}</h2><p className="omd-purpose">{stage.purpose}</p>
    </div>
    {questions.filter(item => visited.includes(item.id)).map(item => <div key={item.id} hidden={finished || showIntroduction || item.id !== question.id} data-mixed-question={item.id}><RetainedQuestion question={item} record={record}/></div>)}
    {!finished && !showIntroduction && <nav className="omd-navigation" aria-label="Practice questions"><button type="button" disabled={current === 0} onClick={() => move(current - 1)}>Previous question</button><button type="button" className="omd-primary" disabled={!results[question.id]?.correct} onClick={next}>{current === questions.length - 1 ? (question.stage === 5 ? 'Finish practice' : pendingConfirmations.length ? 'Try a fresh case' : 'Review practice') : 'Next question'}</button></nav>}
  </section>;
}
