import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { ReferenceQuestion } from './ConditionalReferenceSequence';
import { PulseWord, PunchWord } from './ContrapositiveVisuals';
import { AndOrDiagram, AndOrLecture, ContrapositiveDemo, ErrorCards, FourCombos, GroupCheck, PlacementExplorer } from './AndOrVisuals';
import { AndOrQuiz } from './AndOrPractice';
import { libraryExample, negationExamples, placementExamples } from '../content/andOrItems';
import { contrapositive, group, lit, ruleMistakes, ruleSentence, type Atom, type Rule } from '../content/andOrLogic';

// Every lesson follows the approved page shape: what it is, why it matters, the film, how to do it, what it is not,
// one habit, and the Pop Quiz. One main example runs through each page, with at most one fresh second example.

function Section({ title, label, children }: { title: string; label?: string; children: ReactNode }) {
  return <section className="co-section" aria-label={label}><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

// ---- 2.1 AND and 2.2 OR ---------------------------------------------------------------------

function ScenarioChart({ connector }: { connector: 'AND' | 'OR' }) {
  const scenarios = [[true,true],[true,false],[false,true],[false,false]];
  return <div className="ao-scenario-scroll"><table className="ao-scenario-chart">
    <caption>Does this meet the {connector} condition?</caption>
    <thead><tr><th scope="col">Photo ID</th><th scope="col">Proof of address</th><th scope="col">{connector} condition</th></tr></thead>
    <tbody>{scenarios.map(([id,address])=>{
      const met=connector==='AND' ? id&&address : id||address;
      return <tr key={`${id}-${address}`}><td>{id?'Shown':'Not shown'}</td><td>{address?'Shown':'Not shown'}</td><td><span className="ao-scenario-result" data-met={met}><span aria-hidden="true">{met?'✓':'×'}</span>{met?'Met':'Not met'}</span></td></tr>;
    })}</tbody>
  </table></div>;
}

const libraryAtoms = (() => {
  const shortNames: Record<string, string> = { id: 'Photo ID shown', address: 'Address proof shown', card: 'Gets card' };
  return libraryExample.atoms.map(atom => ({ ...atom, short: shortNames[atom.id] ?? atom.short }));
})();

function GroupMeaning({ connector, film }: { connector: 'AND' | 'OR'; film?: ReactNode }) {
  const isAnd = connector === 'AND';
  const rule = isAnd ? libraryExample.both : libraryExample.either;
  return <div className="ao-reading">
    {isAnd && <Section title="What AND is" label="What AND is">
      <p className="ao-plain">AND joins two things and says <strong>both of them are true</strong>.</p>
      <p>Not just the first. Not just the second. <strong>Both</strong>. If either one is missing, the AND is not met.</p>
    </Section>}
    <Section title={isAnd ? 'What AND does' : 'What OR does'} label={isAnd ? 'AND means both' : 'OR means one or both'}>
      <div className="ct-definition ao-definition">
        <p className="ao-definition-lead">{isAnd ? 'AND conjoins two conditions.' : 'OR joins two conditions.'}</p>
        <dl>
          <div><dt>In the sufficient condition</dt><dd>{isAnd ? 'The necessary condition follows only when both conditions are met.' : 'The necessary condition follows when either condition is met, or both.'}</dd></div>
          <div><dt>In the necessary condition</dt><dd>{isAnd ? 'Both conditions follow together.' : 'At least one of the two conditions follows, and possibly both.'}</dd></div>
        </dl>
      </div>
      <p>{isAnd ? 'Here is a rule: ' : 'Here is a different rule: '}<strong>{isAnd ? 'A visitor gets a library card if the visitor shows photo ID and proof of address.' : 'A visitor gets a library card if the visitor shows photo ID or proof of address.'}</strong></p>
      <p>{isAnd
        ? 'The word “and” puts both documents on the left side. Neither document is the trigger by itself. Each is half of it. Photo ID alone does not guarantee a card, and proof of address alone does not either. Show both, and the card is guaranteed.'
        : 'The word “or” gives the visitor two routes to a card. Photo ID alone guarantees a card. Proof of address alone guarantees a card. A visitor who shows both also gets one, because OR does not shut out the second condition.'}</p>
      <AndOrDiagram atoms={libraryAtoms} rule={rule}/>
    </Section>
    <Section title={isAnd ? 'Why one fact is not enough' : 'Why one fact is enough'}>
      <p>{isAnd
        ? 'Answer choices often take one half of an AND and treat it as the whole trigger. If you see the and, you know a single fact never sets this rule off.'
        : 'Answer choices often treat OR as if it needed both, or as if both broke the rule. If you see the or, you know one fact is enough, and two facts are fine.'}</p>
    </Section>
    {film}
    <Section title="Write the diagram" label="Write the diagram">
      <ol className="ct-moves">
        <li><strong>Find what is enough and what follows.</strong> Showing {isAnd ? 'both documents' : 'either document'} is enough. Getting a card is the result, so it goes on the right.</li>
        <li><strong>Shorten each condition.</strong> Write “Photo ID shown”, “Address proof shown” and “Gets card”. Keep the meaning, including any restriction or negative.</li>
        <li><strong>Stack the two conditions on the same side.</strong> Put {isAnd ? 'a + between them to mean AND' : '“or” between them'}. Draw the horizontal arrow level with {isAnd ? 'the + sign' : 'the word “or”'}, pointing to the result.</li>
      </ol>
      <div className="ao-wrong-right">
        <p><span>Wrong</span>{isAnd ? 'Photo ID by itself guarantees a card.' : 'A visitor needs both documents to get a card under this rule.'}</p>
        <p><span>Right</span>{isAnd ? 'Photo ID and proof of address together guarantee a card.' : 'Either document guarantees a card. Both documents also qualify.'}</p>
      </div>
      <p>{isAnd ? 'The + joins the two conditions. Do not draw a separate arrow from photo ID alone: that would say it is enough by itself.' : 'The “or” means either condition is enough. Do not replace it with +: that would wrongly require both documents.'}</p>
    </Section>
    <Section title="Check every case">
      <ScenarioChart connector={connector}/>
      <p>“Not met” means these facts do not guarantee a library card under this rule. The visitor might still get a card; the rule does not say this is the only way.</p>
    </Section>
    <Section title="When would the rule be broken?" label="When would the rule be broken?">
      <p>{isAnd ? 'A visitor shows both documents but does not get a card. That breaks this conditional: its sufficient condition is met, but its necessary condition is false.' : 'A visitor shows photo ID but does not get a card. That breaks this conditional too. One document meets the OR condition, so the card must follow.'}</p>
      <p>{isAnd ? 'A different visitor shows photo ID and no proof of address. The AND condition is not met. This visitor could get a card through another route, or could leave without one. Either case fits this rule.' : 'A different visitor shows neither document. The OR condition is not met. This visitor could get a card through another route, or could leave without one. Either case fits this rule.'}</p>
      {isAnd ? <ReferenceQuestion prompt="Photo ID is shown. Nothing is said about proof of address. Do we know that both conditions are met?" options={['Yes, photo ID is enough','Not yet; proof of address is still unknown']} correct={1} feedback={['The AND rule needs both documents. One document is only part of its sufficient condition.','We do not know whether both conditions are met. Unknown proof of address does not mean proof of address is absent.']}/> : <>
        <ReferenceQuestion prompt="A pass is valid if stamped or signed. This pass is both stamped and signed. Does this pass meet the OR condition?" options={['Yes, one or both is enough','No, OR allows only one']} correct={0} feedback={['Both is allowed. The pass meets the rule’s sufficient condition.','Plain OR allows both. Only wording such as but not both excludes that case.']}/>
      </>}
    </Section>
  </div>;
}

function AndMeaning() {
  return <>
    <GroupMeaning connector="AND" film={<Section title="Watch the lesson"><AndOrLecture lessonId="and-or-both-or-either"/></Section>}/>
    <Section title="A habit to keep"><p>When you see AND, check that the facts give you both conditions. One condition by itself does not meet the AND condition, so the rule guarantees nothing yet.</p></Section>
    <AndOrQuiz quizId="and-or-both-or-either"/>
  </>;
}

// Lesson 2.2 teaches OR as inclusion: at least one of the pair, possibly both, written as
// "if not one, then the other". Original example; the method follows Joshua's approved source reading.
const studyAtoms: Atom[] = [
  { id: 'sat', short: 'Studies Saturday', yes: 'Mia studies on Saturday', no: 'Mia does not study on Saturday' },
  { id: 'sun', short: 'Studies Sunday', yes: 'Mia studies on Sunday', no: 'Mia does not study on Sunday' },
];
const orFromSaturday: Rule = { sufficient: group('and', lit('sat', true)), necessary: group('and', lit('sun')) };
const orFromSunday: Rule = { sufficient: group('and', lit('sun', true)), necessary: group('and', lit('sat')) };

/** The four possible weekends as tiles: which days Mia studies, and whether the OR statement allows it. */
function InclusionCases() {
  const cases: { sat: boolean; sun: boolean; label: string }[] = [
    { sat: true, sun: false, label: 'Saturday only' },
    { sat: false, sun: true, label: 'Sunday only' },
    { sat: true, sun: true, label: 'Both days' },
    { sat: false, sun: false, label: 'Neither day' },
  ];
  const day = (name: string, on: boolean) => <span className="ao-case-day" data-on={on}>{on ? <Check size={14} aria-hidden/> : <X size={14} aria-hidden/>}{name}</span>;
  return <ul className="ao-cases" aria-label="Every weekend Mia could have">
    {cases.map(c => {
      const ok = c.sat || c.sun;
      return <li key={c.label} className="ao-case" data-ok={ok} aria-label={`${c.label}: ${ok ? 'allowed' : 'ruled out'}`}>
        <span className="ao-case-label">{c.label}</span>
        <span className="ao-case-days">{day('Sat', c.sat)}{day('Sun', c.sun)}</span>
        <span className="ao-case-verdict">{ok ? <Check size={15} aria-hidden/> : <X size={15} aria-hidden/>}{ok ? 'Allowed' : 'Ruled out'}</span>
      </li>;
    })}
  </ul>;
}

function OrMeaning() {
  return <>
    <div className="ao-reading">
      <Section title="What OR is" label="OR means one or both">
        <p className="ao-plain">OR is an <strong>inclusion</strong> word. It joins two things and says <strong>at least one of them is true</strong>.</p>
        <p>It can be the first. It can be the second. It can be both. The only thing OR rules out is <strong>neither</strong>.</p>
        <p>Here is a statement: <strong>Mia will study on Saturday or on Sunday.</strong> Mia studies on at least one of those days, and maybe both.</p>
      </Section>
      <Section title="What OR does">
        <div className="ct-definition ao-definition">
          <p className="ao-definition-lead">OR includes at least one.</p>
          <dl>
            <div><dt>It requires</dt><dd>At least one of the two is true.</dd></div>
            <div><dt>It allows</dt><dd>Both. OR never limits you to just one.</dd></div>
            <div><dt>It becomes</dt><dd>If one is not true, the other must be.</dd></div>
          </dl>
        </div>
      </Section>
      <Section title="Walk through it" label="Inclusion breakdown">
        <ol className="ao-breakdown">
          <li><span>Ask the question</span><p>What fact would <strong>force</strong> Mia to study on a particular day?</p></li>
          <li><span>Take one half away</span><p>Suppose Mia <strong>did not study on Saturday</strong>. She still has to study on at least one day, and only Sunday is left. So <strong>she studies on Sunday</strong>.</p></li>
          <li><span>Write the rule</span><p>That gives the if/then: <strong>if Mia does not study on Saturday, then she studies on Sunday.</strong> The missing half goes on the left; the other half follows on the right.</p></li>
        </ol>
        <AndOrDiagram atoms={studyAtoms} rule={orFromSaturday}/>
      </Section>
      <Section title="Check it">
        <InclusionCases/>
        <p className="ao-takeaway">Only <strong>skipping both</strong> is ruled out. And the reverse gives you nothing: learning that Mia <strong>studied on Saturday</strong> says <strong>nothing about Sunday</strong>.</p>
      </Section>
      <Section title="Watch the lesson"><AndOrLecture lessonId="and-or-either-condition"/></Section>
      <Section title="Write the diagram" label="Write the diagram">
        <ol className="ct-moves">
          <li><strong>Negate one half.</strong> Put it in the sufficient condition: “Does not study Saturday.”</li>
          <li><strong>Keep the other half exactly as it is.</strong> Put it in the necessary condition: “Studies Sunday.”</li>
          <li><strong>Start with either half.</strong> Negating Sunday instead gives the rule below. It is the contrapositive of the first rule, so the two say the same thing.</li>
        </ol>
        <AndOrDiagram atoms={studyAtoms} rule={orFromSunday}/>
        <div className="ao-wrong-right">
          <p><span>Wrong</span>If Mia studies on Saturday, she does not study on Sunday.</p>
          <p><span>Right</span>If Mia does not study on Saturday, she studies on Sunday.</p>
        </div>
        <p>The wrong version reads OR as “only one.” Nothing in the statement stops Mia from studying on both days.</p>
      </Section>
      <Section title="OR inside a longer rule" label="When would the rule be broken?">
        <p>OR also sits inside if/then rules: <strong>A visitor gets a library card if the visitor shows photo ID or proof of address.</strong> Here the OR is in the sufficient condition, so either document is enough for a card, and so are both. When an OR is in the necessary condition, at least one of the two follows.</p>
        <AndOrDiagram atoms={libraryAtoms} rule={libraryExample.either}/>
        <p>That rule is broken only when a visitor shows a document and still gets no card. A visitor who shows neither document breaks nothing: the rule says nothing about that visitor.</p>
        <ReferenceQuestion prompt="A pass is valid if stamped or signed. This pass is both stamped and signed. Does this pass meet the OR condition?" options={['Yes, one or both is enough','No, OR allows only one']} correct={0} feedback={['Both is allowed. The pass meets the rule’s sufficient condition.','Plain OR allows both. Only wording such as but not both excludes that case.']}/>
      </Section>
    </div>
    <Section title="A habit to keep"><p>When you see OR, ask what happens if one half is missing: the other half must be there. Never conclude which one is true, and never rule out both.</p></Section>
    <AndOrQuiz quizId="and-or-either-condition"/>
  </>;
}

// ---- 2.3 Where the group sits -----------------------------------------------------------------------

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
      <p>The same two words give different results depending on where they sit. A fact that reaches only <PunchWord>one member</PunchWord> of an AND group on the left does not establish the group. A project alone gives no additional conclusion about whether a team is in the regional round. So before you ask what follows, ask <strong>whether the sufficient condition is met.</strong></p>
    </Section>
    <Section title="Watch the lesson">
      <AndOrLecture lessonId="and-or-either-side"/>
    </Section>
    <Section title="How to test a rule with a group in it">
      <ol className="ct-moves">
        <li><strong>Step 1: Find the connected conditions.</strong> Take everything the indicator covers on its side.</li>
        <li><strong>Step 2: Name the side it sits on.</strong> Left means the group is enough. Right means the group is required.</li>
        <li><strong>Step 3: Check the facts against those conditions.</strong> Do they establish it, rule it out, or leave it open?</li>
      </ol>
      <p>Below are four <strong>different rules</strong> about the same regional round. Choose a rule, then click a fact. Read what the rule gives and what it leaves open.</p>
      <PlacementExplorer/>
      <p>Write the connected conditions vertically, with + for AND or or for OR between them. Draw the arrow level with the + sign or the word or, on either side. That makes clear which conditions it connects.</p>
    </Section>
    <Section title="What it is not">
      <p>Two look-alikes go wrong, and one habit keeps you out of both.</p>
      <ErrorCards start={{ text: ruleSentence(round.atoms, round.rule) }} cards={[
        { verdict: 'wrong', how: 'Treat one AND condition as sufficient by itself.', diagram: <AndOrDiagram atoms={round.atoms} rule={wrongLeft} origin={round.rule}/> },
        { verdict: 'wrong', how: 'Pick one branch of an OR on the right.', diagram: <>
          <p className="ao-slim-cap">The rule</p><AndOrDiagram atoms={laptopItem.atoms} rule={laptopItem.rule}/>
          <p className="ao-slim-cap">The wrong reading</p><AndOrDiagram atoms={laptopItem.atoms} rule={wrongRight} origin={laptopItem.rule}/>
        </> },
        { verdict: 'right', how: 'Going forward through the rule, establish the sufficient condition first.', diagram: <GroupCheck atoms={round.atoms} side={round.rule.sufficient} facts={{ project: true, inspection: true }}/> },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>Mark a group when you have to track several conditions at once. Then test it: do the facts establish the sufficient condition or rule out the necessary condition? Where the answer is neither, there is no additional conclusion under this rule.</p>
    </Section>
    <AndOrQuiz quizId="and-or-either-side"/>
  </>;
}

// ---- 2.4 Contrapositives with AND and OR -----------------------------------------------------------------------

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
    <Section title="Why AND and OR change">
      <p>AND changes to OR, and OR changes to AND, because you are denying that those conditions hold together. <PulseWord>Deny AND</PulseWord> and you get at least one is missing, an OR of denials. <PulseWord>Deny OR</PulseWord> and you get every one is missing, an AND of denials.</p>
      <p>For the contrapositive, reverse the sides and negate both complete sides. Within a group, negate every condition and switch AND to OR, or OR to AND. This switch expresses the denial of the connected conditions.</p>
    </Section>
    <Section title="Watch the lesson">
      <AndOrLecture lessonId="and-or-negate-group"/>
    </Section>
    <Section title="How to flip a rule with a group">
      <p>See when the float group fails. Set the facts and compare three statements: both hold, not both, and neither.</p>
      <FourCombos first={brakes} second={lights} mode="opposite"/>
      <p>“Not both” is true in three of the four cases. “Neither” is true in only one. They are different statements, and the denial of <em>both</em> is <strong>not both</strong>. For an OR the logic runs the other way: it fails only when every member fails, so its denial is <strong>neither</strong>.</p>
      <ol className="ct-moves">
        <li><strong>Step 1: Flip the sides.</strong> The right side goes on the left, and the left side goes on the right.</li>
        <li><strong>Step 2: Put NOT on every member.</strong> If a member already has a NOT, the two cancel.</li>
        <li><strong>Step 3: Switch AND and OR.</strong> AND becomes OR, and OR becomes AND. A single condition has no AND or OR to change.</li>
      </ol>
      <p>Here is the switch on its own, using the library documents from Lessons 2.1 and 2.2:</p>
      <dl className="ao-reading-transformations">
        <div><dt>Photo ID AND proof of address</dt><dd>no photo ID OR no proof of address</dd><dd><strong>Not both:</strong> at least one condition is absent.</dd></div>
        <div><dt>Photo ID OR proof of address</dt><dd>no photo ID AND no proof of address</dd><dd><strong>Neither:</strong> both conditions are absent.</dd></div>
      </dl>
      <p>Now use that denial in the library rule from Lesson 2.1. The original says showing both documents guarantees a card.</p>
      <ContrapositiveDemo item={{ id: 'library-contrapositive-demo', statement: 'A visitor gets a library card if the visitor shows photo ID and proof of address.', atoms: libraryAtoms, rule: libraryExample.both, task: { kind: 'contrapositive' }, why: 'Without a card, at least one document must be absent.' }} label="The library rule: reverse, negate and switch"/>
      <p>At least one document must be missing; it need not be both.</p>
      <p>Compare the OR rule from Lesson 2.2: showing either document is enough for a card. Without a card, neither document can have been shown. If one had been shown, this rule would require a card.</p>
      <ContrapositiveDemo item={{ id: 'library-or-contrapositive-demo', statement: 'A visitor gets a library card if the visitor shows photo ID or proof of address.', atoms: libraryAtoms, rule: libraryExample.either, task: { kind: 'contrapositive' }, why: 'Without a card, neither document can have been shown.' }} label="The OR library rule: reverse, negate and switch"/>
      <p>Both documents must be absent. Switching or to + without reversing the sides and negating each condition gives the wrong rule.</p>
      <p>Back to the parade float:</p>
      <ContrapositiveDemo item={float} label="Flip, deny and switch: the parade float"/>
      <p>Now a fresh rule where a NOT is already there, and the group is on the right:</p>
      <ContrapositiveDemo item={negationExamples[1].item} label="Flip, deny and switch: the pool"/>
    </Section>
    <Section title="What it is not">
      <p>Two look-alikes fail. Wrong answer choices use them on purpose.</p>
      <ErrorCards start={{ text: ruleSentence(float.atoms, float.rule) }} cards={[
        { verdict: 'wrong', how: 'Flip the sides and change nothing else.', diagram: <AndOrDiagram atoms={float.atoms} rule={reverse} origin={float.rule}/> },
        { verdict: 'wrong', how: 'Deny every member but keep the AND.', diagram: <AndOrDiagram atoms={float.atoms} rule={keeps} origin={float.rule}/> },
        { verdict: 'right', how: 'Flip the sides, deny each condition, switch AND and OR.', diagram: <AndOrDiagram atoms={float.atoms} rule={contrapositive(float.rule)} origin={float.rule}/> },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>You do not need to write the contrapositive of every rule. Write it when a requirement is denied, or when a chain needs it. When you do, look at each group and ask when it fails.</p>
    </Section>
    <AndOrQuiz quizId="and-or-negate-group"/>
  </>;
}

export function AndOrLesson({ id }: { id: string }) {
  switch (id) {
    case 'and-or-both-or-either': return <AndMeaning/>;
    case 'and-or-either-condition': return <OrMeaning/>;
    case 'and-or-either-side': return <EitherSide/>;
    case 'and-or-negate-group': return <NegateGroup/>;
    default: throw new Error(`Unknown And/Or lesson: ${id}`);
  }
}
