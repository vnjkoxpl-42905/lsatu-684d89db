import { useState } from 'react';
import type { ConditionalUnit } from '../content/types';

const cases = [
  { fact: 'The parcel was scanned.', result: 'Its tracking record was updated.', why: 'The fact meets the trigger. Apply the guarantee to this parcel.' },
  { fact: 'Its tracking record was not updated.', result: 'The parcel was not scanned.', why: 'Scanning would require an update. The missing result rules out scanning.' },
  { fact: 'Its tracking record was updated.', result: 'Whether the parcel was scanned remains unknown.', why: 'An update might occur another way. The rule supplies no reverse guarantee.' },
  { fact: 'The parcel was not scanned.', result: 'Whether its tracking record was updated remains unknown.', why: 'The rule only guarantees an update when scanning occurs.' },
];

export function FourCaseExplorer() {
  const [active, setActive] = useState(0);
  return <div className="cn-interaction">
    <p className="cn-label">One unchanged rule</p>
    <p className="cn-statement">If a parcel is scanned, its tracking record is updated.</p>
    <div className="cn-diagram"><span>Parcel scanned</span><span aria-hidden="true">→</span><span>Record updated</span></div>
    <p>Change only the fact. Predict what follows, then select that case.</p>
    <div className="cn-controls">{cases.map((item, index) => <button type="button" key={item.fact} aria-pressed={active === index} onClick={() => setActive(index)}>{item.fact}</button>)}</div>
    <div className="cn-result" aria-live="polite"><p className="cn-label">What follows</p><p><strong>{cases[active].result}</strong></p><p>{cases[active].why}</p></div>
  </div>;
}

const translations: Record<string, { sentence: string; target: string; rule: string; why: string }> = {
  'group-1': { sentence: 'A receipt appears whenever a payment is recorded.', target: 'Whenever what? A payment is recorded.', rule: 'Payment recorded → receipt appears.', why: 'The trigger appears second in the sentence. Its position does not reverse the guarantee.' },
  'group-2': { sentence: 'A current pass is required for entry.', target: 'What is required? A current pass.', rule: 'Entry → current pass.', why: 'The required idea appears before required. Having a pass alone does not guarantee entry.' },
  'group-3': { sentence: 'The lamp does not light unless the battery is charged.', target: 'The two complete ideas are lamp does not light and battery is charged.', rule: 'Battery not charged → lamp does not light. Equivalently: lamp lights → battery charged.', why: 'Keep the existing negative. Negating does not light gives lights when you form the equivalent direction.' },
  'group-4': { sentence: 'No approved sample is unlabelled.', target: 'The excluded pair is approved sample and unlabelled sample.', rule: 'Approved sample → not unlabelled, or labelled.', why: 'Negating unlabelled cancels its existing negative. This does not make every labelled sample approved.' },
};

function TranslationExplorer({ id }: { id: string }) {
  const [step, setStep] = useState(0);
  const item = translations[id];
  return <div className="cn-interaction"><p className="cn-statement">{item.sentence}</p><p>Identify the complete ideas and predict the direction before revealing it.</p>
    <div className="cn-controls"><button type="button" onClick={() => setStep(Math.max(step, 1))}>Find the target</button><button type="button" onClick={() => setStep(2)}>Show the translation</button><button type="button" onClick={() => setStep(0)}>Try again</button></div>
    <div aria-live="polite">{step >= 1 && <p>{item.target}</p>}{step === 2 && <div className="cn-result"><p><strong>{item.rule}</strong></p><p>{item.why}</p></div>}</div>
  </div>;
}

function ChainExplorer() {
  const [fact, setFact] = useState(false);
  return <div className="cn-interaction"><p className="cn-label">Two rules</p><div className="cn-diagram"><span>Calibrated</span><span aria-hidden="true">→</span><span>Registered</span><span aria-hidden="true">→</span><span>Listed</span></div>
    <p>Registered is the exact result-to-trigger match. The rules establish calibrated → listed.</p>
    <div className="cn-controls"><button type="button" aria-pressed={fact} onClick={() => setFact(!fact)}>{fact ? 'Remove the case fact' : 'Add: Meter D is calibrated'}</button></div>
    <div className="cn-result" aria-live="polite"><p><strong>{fact ? 'Meter D is registered and listed.' : 'Every calibrated meter is listed.'}</strong></p><p>{fact ? 'The separate fact activates the chain for D. Both intermediate and final results follow.' : 'This is a new rule. These rules alone do not establish that any calibrated meter exists.'}</p></div>
  </div>;
}

function NoLinkExplorer() {
  const [sharedResult, setSharedResult] = useState(true);
  return <div className="cn-interaction"><p className="cn-label">Compare the arrow positions</p>
    <div className="cn-diagram"><span>Calibrated → registered</span><span>{sharedResult ? 'Inspected → registered' : 'Registered → listed'}</span></div>
    <div className="cn-controls"><button type="button" aria-pressed={sharedResult} onClick={() => setSharedResult(true)}>Both rules end at registered</button><button type="button" aria-pressed={!sharedResult} onClick={() => setSharedResult(false)}>The second begins at registered</button></div>
    <div className="cn-result" aria-live="polite"><p><strong>{sharedResult ? 'No calibrated → inspected link follows.' : 'Calibrated → listed follows.'}</strong></p><p>{sharedResult ? 'Registered is a shared result. A calibrated, uninspected meter can still be registered and fit both rules.' : 'Registered is now a result-to-trigger match. Follow the two forward arrows without reversing either rule.'}</p></div>
  </div>;
}

function WorkedReasoningReveal({ unit }: { unit: ConditionalUnit }) {
  const [shown, setShown] = useState(0);
  return <div className="cn-interaction"><p className="cn-label">Explain the next move</p><p>Use the statements above. Say what the next step establishes and why before revealing it.</p>
    <ol>{unit.workedExample.reasoning.slice(0, shown).map((reason, index) => <li key={index}>{reason}</li>)}</ol>
    <div className="cn-controls"><button type="button" disabled={shown === unit.workedExample.reasoning.length} onClick={() => setShown(shown + 1)}>Reveal next reasoning step</button><button type="button" onClick={() => setShown(0)}>Start again</button></div>
    <div aria-live="polite">{shown === unit.workedExample.reasoning.length && <p className="cn-result"><strong>{unit.workedExample.conclusion}</strong></p>}</div>
    <p className="cn-caption">Compare your explanation with the steps. This exploration does not grade your written reasoning.</p>
  </div>;
}

export function LessonInteraction({ unit }: { unit: ConditionalUnit }) {
  if (translations[unit.id]) return <TranslationExplorer key={unit.id} id={unit.id} />;
  if (['orientation', 'rules-facts', 'sufficient-necessary', 'contraposition', 'triggering'].includes(unit.id)) return <FourCaseExplorer key={unit.id} />;
  if (unit.id === 'no-link') return <NoLinkExplorer />;
  if (unit.area === 'linking') return <ChainExplorer key={unit.id} />;
  return <WorkedReasoningReveal key={unit.id} unit={unit} />;
}
