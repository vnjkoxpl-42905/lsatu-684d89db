import { useId, useState } from 'react';

type Card = { question: string; answer: string };
// Reviewed derivatives of NotebookLM cards, 2026-10-02. See the vault asset
// manifest and REVIEW.md for source IDs, raw originals and corrections.
const cards: Record<string, Card[]> = {
  orientation: [
    { question: 'What does a conditional statement tell you?', answer: 'If one condition is true, the other has to be true too. The statement gives you that connection; it does not establish that either condition actually occurs. A matching fact can let you use the rule for a particular case.' },
    { question: 'Every locker marked reserved has a name card. Locker 12 is marked reserved. What do we know?', answer: 'Locker 12 has a name card. The rule covers every reserved locker, and the fact tells us Locker 12 belongs to that group. That matching condition is why the conclusion follows.' },
    { question: 'Every locker marked reserved has a name card. Locker 9 has a name card. Is it necessarily marked reserved?', answer: 'No. The sentence tells us what every reserved locker has. It has not restricted name cards to reserved lockers. Locker 9 could be reserved or unreserved; its name card alone leaves that question open.' },
    { question: 'Why do conditionals matter when evaluating an argument?', answer: 'They help you check what you can conclude from the information you have. A rule might tell you that every reserved locker has a name card. That lets you infer a name card from a reservation. A name card alone does not prove a reservation; the rule never said only reserved lockers have them.' },
  ],
  'sufficient-necessary': [
    { question: 'What does sufficient mean?', answer: 'Enough to establish the other condition under this rule. Once the sufficient condition is met, the rule gives you the necessary condition. Enough does not mean it is the only possible way for the other condition to be true.' },
    { question: "If you win the raffle, you get a bicycle. Does getting a bicycle prove that you won?", answer: "No. You could buy a bicycle or receive one as a gift without winning. The rule tells us what winning establishes; it does not make winning the only way to get a bicycle." },
    { question: "What does necessary mean?", answer: "Required whenever the sufficient condition holds. In Win the raffle → Get a bicycle, getting one is the result required whenever you win. It does not mean you need to own a bicycle before entering." },
    { question: 'If a requirement is met, does that prove the other condition happened?', answer: 'No. A requirement may be present while the other condition remains unknown. Entry requires a pass, but a person could have a pass and stay outside. The rule has not turned the pass into a guarantee of entry.' },
  ],
  'group-1': [
    { question: 'A student receives feedback if the student revises the essay. Write the rule.', answer: 'Revises essay → Receives feedback. If refers to revising, even though that clause appears last. The sentence gives feedback to each student who revises. Feedback alone does not establish that the student revised.' },
    { question: 'Any applicant who submits late pays a fee. Why is “Applicant → Pays fee” too broad?', answer: 'It drops the late-submission restriction. Applicant alone would include someone who submitted on time, whom the sentence does not cover. Keep the complete rule: Applicant submits late → Pays fee.' },
    { question: 'Every student who registers early receives a discount. Write the rule.', answer: 'Student registers early → Receives discount. Every refers to students who register early. Early registration is part of the sufficient condition, so keep it when you shorten the idea.' },
    { question: 'A fee is paid by any applicant who submits late. Write the rule.', answer: 'Applicant submits late → Pays fee. Any still refers to late-submitting applicants. Moving that phrase later does not change its sufficient role. Read the arrow as: if an applicant submits late, that applicant pays a fee.' },
  ],
  'group-2': [
    { question: 'A permit is required for construction. Write the rule.', answer: 'Construction → Has permit. What is required? The permit, even though it appears before required. The sentence makes it necessary for construction, not enough to establish that construction occurs.' },
    { question: 'Why not automatically take the words immediately after the indicator?', answer: 'The complete target can appear before or after the expression. In a permit is required for construction, the permit is the requirement. Ask what the indicator refers to, then check your diagram against the meaning of the whole sentence.' },
    { question: 'A finalist must attend the interview. Maya attended. Does that prove she is a finalist?', answer: 'No. The rule gives finalists an obligation; it does not say only finalists attend. Actual attendance is also different from being required to attend. The fact about Maya does not establish finalist status.' },
    { question: 'A garden light switches on only when its sensor detects darkness. Write the rule.', answer: 'Light switches on → Sensor detects darkness. Only when makes darkness detection required for switching on. The sentence has not said detection is enough, so knowing the sensor detects darkness alone would leave the light unknown.' },
  ],
};

function Recall({ items }: { items: Card[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const answerId = useId();
  const item = items[index];
  return <div className="co-flash">
    <p className="co-kicker">Review · {index + 1} of {items.length}</p>
    <div className={`co-flash-face ${revealed ? 'co-flipped' : ''}`}>
      <strong>{item.question}</strong><span>Answer in your own words, then compare.</span>
      <div id={answerId} aria-live="polite">{revealed && <p>{item.answer}</p>}</div>
    </div>
    <div className="co-choices">
      <button type="button" aria-expanded={revealed} aria-controls={answerId} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide recall explanation' : 'Reveal recall explanation'}</button>
      <button type="button" disabled={index === 0} onClick={() => { setIndex(index - 1); setRevealed(false); }}>Previous example</button>
      <button type="button" onClick={() => { setIndex((index + 1) % items.length); setRevealed(false); }}>{index === items.length - 1 ? 'Start these again' : 'Next example'}</button>
    </div>
  </div>;
}

export function ConditionalOpeningMedia({ unitId }: { unitId: string }) {
  // Group lessons already have seven original sentence-to-rule recall cards.
  // Their final meaning check closes the lesson without repeating a second deck.
  if (unitId === 'group-1' || unitId === 'group-2') return null;
  const items = cards[unitId];
  if (!items) return null;
  return <section id="co-return-to-the-relationship" className="co-section" data-toc data-toc-title="Return to the relationship">
    <h2>Return to the relationship</h2>
    <p>Try these before moving on. Say what the rule gives you and explain why.</p>
    <Recall key={unitId} items={items}/>
    {unitId === 'sufficient-necessary' && <details className="co-media-summary">
      <summary>See the relationships together</summary>
      <figure className="co-relationship-overview">
        <h3>If you win the raffle, you get a bicycle.</h3>
        <div className="co-overview-roles"><div><strong>Win the raffle</strong><span>Sufficient: enough</span></div><b aria-hidden="true">→</b><span className="co-sr-only">implies</span><div><strong>Get a bicycle</strong><span>Necessary: required</span></div></div>
        <div className="co-overview-set">
          <svg viewBox="0 0 600 250" role="img" aria-labelledby="co-order-overview-title co-order-overview-desc">
            <title id="co-order-overview-title">Winning is sufficient. Getting a bicycle is necessary.</title>
            <desc id="co-order-overview-desc">Raffle winners are within the group of people who get a bicycle. Getting a bicycle alone does not establish winning. The drawing shows possible outcomes, not how many people actually win.</desc>
            <rect x="10" y="10" width="580" height="230" rx="24" className="co-overview-packed-fill"/>
            <rect x="40" y="78" width="285" height="132" rx="18" className="co-overview-ready-fill"/>
          </svg>
          <span className="co-overview-packed-label">People who get a bicycle</span><span className="co-overview-ready-label">Raffle winners</span>
        </div>
        <p>Getting a bicycle alone: winning remains unknown.</p>
        <figcaption>Read the arrow in its stated direction. You could get a bicycle as a gift without winning.</figcaption>
      </figure>
    </details>}
  </section>;
}
