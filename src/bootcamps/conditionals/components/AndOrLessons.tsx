import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ReferenceQuestion } from './ConditionalReferenceSequence';
import { PulseWord, PunchWord } from './ContrapositiveVisuals';
import { AndOrDiagram, AndOrLecture, ContrapositiveDemo, ErrorCards, FourCombos, GroupCheck, PlacementExplorer } from './AndOrVisuals';
import { AndOrQuiz } from './AndOrPractice';
import { libraryExample, negationExamples, placementExamples } from '../content/andOrItems';
import { contrapositive, group, lit, ruleMistakes, ruleSentence, type Rule } from '../content/andOrLogic';

// Every lesson follows the approved page shape: what it is, why it matters, the film, how to do it, what it is not,
// one habit, and the Pop Quiz. One main example runs through each page, with at most one fresh second example.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

// ---- 2.1 Both, or at least one ---------------------------------------------------------------------

function BothOrEither({ onLastPageChange }: { onLastPageChange?: (ready: boolean) => void }) {
  const { atoms, both } = libraryExample;
  const either: Rule = { ...both, sufficient: group('or', lit('id'), lit('address')) };
  const [page, setPage] = useState(0);
  const [visitedQuiz, setVisitedQuiz] = useState(false);
  const [facts, setFacts] = useState({ id: true, address: false });
  const heading = useRef<HTMLHeadingElement>(null);
  const names = ['AND', 'OR', 'The contrapositive'];
  useEffect(() => { onLastPageChange?.(page === 2); }, [page, onLastPageChange]);
  function go(next: number) {
    setPage(next);
    if (next === 2) setVisitedQuiz(true);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <div className="ao-reading">
    <header className="ao-reading-header">
      <p aria-live="polite">Page {page + 1} of 3</p>
      <h2 ref={heading} tabIndex={-1}>{names[page]}</h2>
    </header>
    {page < 2 && <section aria-label={page === 0 ? 'AND means both' : 'OR means one or both'}>
      <p className="ao-reading-definition"><strong>{page === 0 ? 'AND means BOTH conditions.' : 'OR means ONE OR BOTH conditions.'}</strong></p>
      <p>{page === 0 ? 'A visitor gets a library card if the visitor shows photo ID and proof of address.' : 'Now change the rule: a visitor gets a library card if the visitor shows photo ID or proof of address.'}</p>
      <AndOrDiagram atoms={atoms} rule={page === 0 ? both : either}/>
      <p>{page === 0 ? 'Photo ID alone does not establish this group. Proof of address alone does not establish it either. Both together establish the group, so this rule guarantees a library card.' : 'Photo ID establishes this group. Proof of address establishes it too. Showing both still meets the rule: OR does not exclude the second condition.'}</p>
      <ol className="ct-moves">
        <li><strong>Step 1: Find the whole group.</strong> Keep photo ID and proof of address together on the sufficient side.</li>
        <li><strong>Step 2: Check the facts against the connector.</strong> {page === 0 ? 'For AND, establish both conditions.' : 'For OR, establish one or both conditions.'} An unknown condition has not been denied.</li>
      </ol>
      <p>Change the facts. Does the whole group hold?</p>
      <div className="ao-reading-controls" role="group" aria-label="Set the visitor’s documents">
        <button type="button" aria-pressed={facts.id} onClick={() => setFacts(f => ({...f,id:!f.id}))}>Photo ID: {facts.id ? 'shown' : 'not shown'}</button>
        <button type="button" aria-pressed={facts.address} onClick={() => setFacts(f => ({...f,address:!f.address}))}>Proof of address: {facts.address ? 'shown' : 'not shown'}</button>
      </div>
      <GroupCheck atoms={atoms} side={page === 0 ? both.sufficient : either.sufficient} facts={facts}/>
      {page === 0 ? <ReferenceQuestion prompt="Photo ID is shown. Nothing is said about proof of address. Is the AND group established?" options={['Yes, photo ID is enough','Not yet; proof of address is still unknown']} correct={1} feedback={['The AND rule needs both documents. One document is only part of its sufficient condition.','The group is not established yet. Unknown proof of address does not mean proof of address is absent.']}/> : <>
        <p><strong>Mistaken claim: “Both makes an OR false.”</strong> Both actually meets the OR because at least one condition is true.</p>
        <ReferenceQuestion prompt="A pass is valid if stamped or signed. This pass is both stamped and signed. Is its sufficient group established?" options={['Yes, one or both is enough','No, OR allows only one']} correct={0} feedback={['Both is allowed. The pass meets the rule’s sufficient condition.','Plain OR allows both. Only wording such as but not both excludes that case.']}/>
      </>}
    </section>}
    <div hidden={page !== 2}>
      <section aria-label="Negate the whole group">
        <p><strong>When taking the contrapositive, reverse the sides. Negate every condition and switch AND to OR, or OR to AND.</strong></p>
        <p>First see what it means to deny each whole group:</p>
        <dl className="ao-reading-transformations">
          <div><dt>Photo ID AND proof of address</dt><dd>no photo ID OR no proof of address</dd><dd>At least one condition is absent.</dd></div>
          <div><dt>Photo ID OR proof of address</dt><dd>no photo ID AND no proof of address</dd><dd>Both conditions are absent.</dd></div>
        </dl>
        <p>Now use that denial in the whole library rule. The original says showing both documents guarantees a card.</p>
        <ContrapositiveDemo item={{ id: 'library-contrapositive-demo', statement: 'A visitor gets a library card if the visitor shows photo ID and proof of address.', atoms, rule: both, task: { kind: 'contrapositive' }, why: 'Without a card, at least one document must be absent.' }} label="The library rule: reverse, negate and switch"/>
        <p><strong>If a visitor does not get a library card, then the visitor did not show photo ID or did not show proof of address.</strong> At least one document must be missing; it need not be both.</p>
        <p>Lesson 2.3 develops this process with different group positions and conditions that already contain a negative.</p>
      </section>
      <Section title="Watch the recap"><AndOrLecture lessonId="and-or-both-or-either"/></Section>
      <Section title="A habit to keep"><p>Say what the whole group needs before applying the rule. For its contrapositive, deny the whole group rather than changing only the connector.</p></Section>
      {visitedQuiz && <AndOrQuiz quizId="and-or-both-or-either"/>}
    </div>
    <nav className="ao-reading-nav" aria-label="Lesson pages">
      <button type="button" disabled={page === 0} onClick={() => go(page-1)}>Previous page</button>
      <span>{names[page]}</span>
      <button type="button" disabled={page === 2} onClick={() => go(page+1)}>Next page</button>
    </nav>
  </div>;
}

// ---- 2.2 Where the group sits -----------------------------------------------------------------------

function EitherSide() {
  const round = placementExamples[0].item;
  const wrongLeft: Rule = { sufficient: group('and', lit('project')), necessary: group('and', lit('regional')) };
  const laptopItem = placementExamples[3].item;
  const wrongRight: Rule = { sufficient: group('and', lit('regional')), necessary: group('and', lit('laptop')) };
  return <>
    <Section title="The group can sit on either side">
      <p className="ct-definition"><strong>On the left, the group is enough. On the right, the group is required.</strong></p>
      <p>Take a regional round: <strong>A team is in the regional round if it submits a project and passes inspection.</strong> The group sits on the left, joined by AND, so both together are enough.</p>
      <AndOrDiagram atoms={round.atoms} rule={round.rule}/>
      <p>On the right, a group works the other way. AND means the rule guarantees every member. OR means it guarantees at least one.</p>
    </Section>
    <Section title="Why the side changes the answer">
      <p>The same two words give different results depending on where they sit. A fact that reaches only <PunchWord>one member</PunchWord> of an AND group on the left does not establish the group. A project alone gives no additional conclusion about whether a team is in the regional round. So before you ask what follows, ask <strong>which whole side my facts reach.</strong></p>
    </Section>
    <Section title="Watch the lesson">
      <AndOrLecture lessonId="and-or-either-side"/>
    </Section>
    <Section title="How to test a rule with a group in it">
      <ol className="ct-moves">
        <li><strong>Step 1: Find the whole group.</strong> Take everything the indicator covers on its side.</li>
        <li><strong>Step 2: Name the side it sits on.</strong> Left means the group is enough. Right means the group is required.</li>
        <li><strong>Step 3: Test your facts against the whole group.</strong> Do they establish it, rule it out, or leave it open?</li>
      </ol>
      <p>Below are four <strong>different rules</strong> about the same regional round. Choose a rule, then click a fact. Read what the rule gives and what it leaves open.</p>
      <PlacementExplorer/>
      <p>Each group is drawn stacked, with the arrow leaving the whole group rather than one member. That is a readability choice. The logic is the same either way.</p>
    </Section>
    <Section title="What it is not">
      <p>Two look-alikes go wrong, and one habit keeps you out of both.</p>
      <ErrorCards start={{ text: ruleSentence(round.atoms, round.rule) }} cards={[
        { verdict: 'wrong', how: 'Let one member of the AND stand in for the whole group.', diagram: <AndOrDiagram atoms={round.atoms} rule={wrongLeft} origin={round.rule}/> },
        { verdict: 'wrong', how: 'Pick one branch of an OR on the right.', diagram: <>
          <p className="ao-slim-cap">The rule</p><AndOrDiagram atoms={laptopItem.atoms} rule={laptopItem.rule}/>
          <p className="ao-slim-cap">The wrong reading</p><AndOrDiagram atoms={laptopItem.atoms} rule={wrongRight} origin={laptopItem.rule}/>
        </> },
        { verdict: 'right', how: 'Going forward through the rule, wait until the whole left side is established.', diagram: <GroupCheck atoms={round.atoms} side={round.rule.sufficient} facts={{ project: true, inspection: true }}/> },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>Mark a group when you have to track several conditions at once. Then test it: which whole side do the facts establish, and which whole side do they deny? Where the answer is neither, there is no additional conclusion under this rule.</p>
    </Section>
    <AndOrQuiz quizId="and-or-either-side"/>
  </>;
}

// ---- 2.3 Deny the whole group -----------------------------------------------------------------------

function NegateGroup() {
  const float = negationExamples[0].item;
  const [brakes, lights] = float.atoms;
  const mistakes = ruleMistakes(float.rule);
  const reverse = mistakes.find(mistake => mistake.kind === 'converse')!.rule;
  const keeps = mistakes.find(mistake => mistake.kind === 'keeps-connector')!.rule;
  return <>
    <Section title="Start with when the group fails">
      <p className="ct-definition"><strong>To deny a group, ask when it fails. Then say that.</strong></p>
      <p>Here is a rule: <strong>A parade float is approved if its brakes pass and its lights work.</strong> That group fails when at least one member is missing: the brakes do not pass, or the lights do not work.</p>
    </Section>
    <Section title="Why the connector changes">
      <p>The connector does not change because of a trick. It changes because you are denying the whole group. <PulseWord>Deny AND</PulseWord> and you get at least one is missing, an OR of denials. <PulseWord>Deny OR</PulseWord> and you get every one is missing, an AND of denials.</p>
      <p>For the contrapositive, reverse the sides and negate both complete sides. Within a group, negate every condition and switch AND to OR, or OR to AND. This switch expresses the denial of the whole group.</p>
    </Section>
    <Section title="Watch the lesson">
      <AndOrLecture lessonId="and-or-negate-group"/>
    </Section>
    <Section title="How to flip a rule with a group">
      <p>First, see when the float group fails. Set the facts and compare three statements: both hold, not both, and neither.</p>
      <FourCombos first={brakes} second={lights} mode="opposite"/>
      <p>“Not both” is true in three of the four cases. “Neither” is true in only one. They are different statements, and the denial of <em>both</em> is <strong>not both</strong>. For an OR the logic runs the other way: it fails only when every member fails, so its denial is <strong>neither</strong>.</p>
      <ol className="ct-moves">
        <li><strong>Step 1: Flip the sides.</strong> The right side goes on the left, and the left side goes on the right.</li>
        <li><strong>Step 2: Put NOT on every member.</strong> If a member already has a NOT, the two cancel.</li>
        <li><strong>Step 3: Switch each group’s connector.</strong> AND becomes OR, and OR becomes AND. A single member has no connector to switch.</li>
      </ol>
      <ContrapositiveDemo item={float} label="Flip, deny and switch: the parade float"/>
      <p>Now a fresh rule where a NOT is already there, and the group is on the right:</p>
      <ContrapositiveDemo item={negationExamples[1].item} label="Flip, deny and switch: the pool"/>
    </Section>
    <Section title="What it is not">
      <p>Two look-alikes fail. Wrong answer choices use them on purpose.</p>
      <ErrorCards start={{ text: ruleSentence(float.atoms, float.rule) }} cards={[
        { verdict: 'wrong', how: 'Flip the sides and change nothing else.', diagram: <AndOrDiagram atoms={float.atoms} rule={reverse} origin={float.rule}/> },
        { verdict: 'wrong', how: 'Deny every member but keep the AND.', diagram: <AndOrDiagram atoms={float.atoms} rule={keeps} origin={float.rule}/> },
        { verdict: 'right', how: 'Flip, deny each member, switch the connector.', diagram: <AndOrDiagram atoms={float.atoms} rule={contrapositive(float.rule)} origin={float.rule}/> },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>You do not need to write the contrapositive of every rule. Write it when a requirement is denied, or when a chain needs it. When you do, look at each group and ask when it fails.</p>
    </Section>
    <AndOrQuiz quizId="and-or-negate-group"/>
  </>;
}

export function AndOrLesson({ id, onLastPageChange }: { id: string; onLastPageChange?: (ready: boolean) => void }) {
  switch (id) {
    case 'and-or-both-or-either': return <BothOrEither onLastPageChange={onLastPageChange}/>;
    case 'and-or-either-side': return <EitherSide/>;
    case 'and-or-negate-group': return <NegateGroup/>;
    default: throw new Error(`Unknown And/Or lesson: ${id}`);
  }
}
