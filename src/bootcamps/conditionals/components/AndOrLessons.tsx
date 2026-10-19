import type { ReactNode } from 'react';
import { ReferenceQuestion } from './ConditionalReferenceSequence';
import { PulseWord, PunchWord } from './ContrapositiveVisuals';
import { AndOrDiagram, AndOrLecture, ContrapositiveDemo, ErrorCards, FourCombos, GroupCheck, PlacementExplorer } from './AndOrVisuals';
import { AndOrQuiz } from './AndOrPractice';
import { libraryExample, negationExamples, passExample, placementExamples } from '../content/andOrItems';
import { contrapositive, group, lit, ruleMistakes, ruleSentence, type Rule } from '../content/andOrLogic';

// Every lesson follows the approved page shape: what it is, why it matters, the film, how to do it, what it is not,
// one habit, and the Pop Quiz. One main example runs through each page, with at most one fresh second example.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

const [idAtom, addressAtom] = libraryExample.atoms;

// ---- 2.1 Both, or at least one ---------------------------------------------------------------------

function BothOrEither() {
  const { atoms, both } = libraryExample;
  return <>
    <Section title="What AND and OR ask for">
      <p className="ct-definition"><strong>AND needs both. OR needs at least one.</strong></p>
      <p>Here is a rule: <strong>A visitor gets a library card if the visitor shows photo ID and proof of address.</strong> The word <em>if</em> covers a group of two things, and <em>and</em> joins them. The group is met only when the visitor shows both.</p>
      <AndOrDiagram atoms={atoms} rule={both}/>
    </Section>
    <Section title="Why the whole group matters">
      <p>A conditional word does not point at one fact. It points at everything it covers. When one member is true it feels like progress, but a group joined by AND is not established until <PulseWord>every member</PulseWord> is.</p>
    </Section>
    <Section title="Watch the lesson">
      <AndOrLecture lessonId="and-or-both-or-either"/>
    </Section>
    <Section title="How to check a group">
      <ol className="ct-moves">
        <li><strong>Step 1: Find the whole group.</strong> Take everything the word <em>if</em> covers.</li>
        <li><strong>Step 2: Name the connector.</strong> AND needs every member. OR needs at least one.</li>
        <li><strong>Step 3: Test each member against the facts.</strong> A member the facts never mention is unknown, not denied.</li>
      </ol>
      <p>Try Step 1 on the library rule.</p>
      <ReferenceQuestion prompt="Which is the complete sufficient side?" options={['The visitor shows photo ID', 'The visitor shows photo ID and proof of address', 'The visitor gets a library card']} correct={1}
        feedback={['That is only one member of the group. The word if covers both things the visitor shows.', 'Both members together are the sufficient side. The group is joined by AND, so it is met only when the visitor shows both.', 'That is what the rule gives. It sits on the other side of the arrow.']}/>
      <p>Now set the facts and watch Step 3. The second column is a <strong>different rule</strong>: the same two facts joined by <em>or</em> instead of <em>and</em>. It asks for less.</p>
      <FourCombos first={idAtom} second={addressAtom} heads={['The library rule: ID and address', 'A different rule: ID or address']}/>
      <p>Plain <em>or</em> in an LSAT rule is not “one or the other but never both.” If a sentence means exactly one, it says so, with words like <em>but not both</em>.</p>
      <p>One fresh rule to test the OR: <strong>A pass is valid if it is stamped or signed.</strong> This pass is both stamped and signed.</p>
      <ReferenceQuestion prompt="Is the group “stamped or signed” established?" options={['Yes, at least one member is true', 'No, an OR allows only one member']} correct={0}
        feedback={['At least one is true, and an OR allows the other to be true as well.', 'An OR does not exclude both. Both members being true still gives at least one.']}/>
    </Section>
    <Section title="What it is not">
      <p>Two look-alikes go wrong. Wrong answer choices use them on purpose.</p>
      <ErrorCards start={{ label: 'The test', text: 'AND needs every member. OR needs at least one.' }} cards={[
        { verdict: 'wrong', how: 'Call the group met after one member.', diagram: <GroupCheck atoms={atoms} side={both.sufficient} facts={{ id: true }}/> },
        { verdict: 'wrong', how: 'Think an OR rejects the case where both are true.', diagram: <GroupCheck atoms={passExample.atoms} side={passExample.rule.sufficient} facts={{ stamped: true, signed: true }}/> },
        { verdict: 'right', how: 'Match the facts to the connector.', diagram: <GroupCheck atoms={atoms} side={both.sufficient} facts={{ id: true, address: true }}/> },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>When a side of a rule holds two or more conditions, say the group out loud first: <strong>both, or at least one?</strong> You do not have to diagram every simple sentence. Mark the group when several conditions have to be tracked at once.</p>
    </Section>
    <AndOrQuiz quizId="and-or-both-or-either"/>
  </>;
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

export function AndOrLesson({ id }: { id: string }) {
  switch (id) {
    case 'and-or-both-or-either': return <BothOrEither/>;
    case 'and-or-either-side': return <EitherSide/>;
    case 'and-or-negate-group': return <NegateGroup/>;
    default: throw new Error(`Unknown And/Or lesson: ${id}`);
  }
}
