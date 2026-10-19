import type { ReactNode } from 'react';
import { ReferenceQuestion } from './ConditionalReferenceSequence';
import { PulseWord, PunchWord } from './ContrapositiveVisuals';
import { ContrapositiveDemo, ErrorCards, FourCombos, FourForms, PlacementExplorer } from './AndOrVisuals';
import { AndOrQuiz } from './AndOrPractice';
import { negationExamples, andOrLessonAtoms } from '../content/andOrItems';
import type { Atom } from '../content/andOrLogic';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

const [map, compass] = andOrLessonAtoms.hike as readonly Atom[];

// ---- 2.1 Both, or at least one ---------------------------------------------------------------------

function BothOrEither() {
  return <>
    <Section title="What and and or ask for">
      <p className="ct-definition"><strong>AND needs both. OR needs at least one.</strong></p>
      <p>Take a hiker and two facts about that hiker: a map, and a compass. That gives four possible hikers. Set the facts below and watch what each word asks for.</p>
      <FourCombos first={map} second={compass}/>
      <p>Only one hiker has neither, and only one has both. The two middle hikers have exactly one. <strong>AND says yes only to the hiker with both.</strong> <strong>OR says yes to every hiker with at least one,</strong> and that includes the hiker with both. An OR does not push the second one away.</p>
      <p>Plain <em>or</em> in an LSAT rule is not “one or the other but never both.” If a sentence means exactly one, it says so, with words like <em>but not both</em>. Without those words, both is allowed. If the rule needs to rule out both, something else in the passage has to do it.</p>
    </Section>
    <Section title="Why the whole group matters">
      <p>A conditional word does not point at one fact. It points at everything it covers. So when the sentence names two things, the <PulseWord>whole group</PulseWord> sits on that side of the arrow, and you have to treat it as one condition made of members.</p>
      <p>That is why a half-met group trips people. One member is true, and it feels like progress. But a group joined by AND is not met until every member is.</p>
    </Section>
    <Section title="Find the whole side first">
      <ol className="ct-moves">
        <li><strong>Step 1: Find the indicator.</strong> Here that is the word <em>if</em>.</li>
        <li><strong>Step 2: Ask what it covers.</strong> Take the complete side, with its subject, its restrictions, any <em>not</em>, and words like <em>may</em> or <em>must</em>.</li>
        <li><strong>Step 3: Name the connector.</strong> Is the group joined by AND or by OR?</li>
      </ol>
      <p>Try it: <strong>A visitor receives a library card if the visitor shows photo ID and proof of address.</strong></p>
      <ReferenceQuestion prompt="Which is the complete sufficient side?" options={['The visitor shows photo ID', 'The visitor shows photo ID and proof of address', 'The visitor receives a library card']} correct={1}
        feedback={['That is only one member of the group. The word if covers both things the visitor shows.', 'Both members together are the sufficient side. The group is joined by AND, so it is met only when the visitor shows both.', 'That is what the rule gives. It sits on the other side of the arrow.']}/>
      <p>Now test the OR in the same way. <strong>A pass is valid if it is stamped or signed.</strong> This pass is both stamped and signed.</p>
      <ReferenceQuestion prompt="Is the group “stamped or signed” established?" options={['Yes, at least one member is true', 'No, an OR allows only one member']} correct={0}
        feedback={['At least one is true, and an OR allows the other to be true as well.', 'An OR does not exclude both. Both members being true still gives at least one.']}/>
    </Section>
    <Section title="Two ways to get it wrong">
      <ErrorCards start={<>A group is met when the facts match its connector.</>} cards={[
        { verdict: 'wrong', how: 'Treat AND as if either member were enough.', body: <p>Photo ID shown, nothing about proof of address. “The group is met.”</p>, why: 'AND needs every member. One member leaves it unmet.' },
        { verdict: 'wrong', how: 'Treat OR as if only one member may be true.', body: <p>Stamped and signed. “Neither fits, so the group fails.”</p>, why: 'OR needs at least one. Both is allowed.' },
        { verdict: 'right', how: 'Match the facts to the connector.', body: <p>AND: every member. OR: at least one.</p>, why: 'Say it out loud before you decide anything else.' },
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
  return <>
    <Section title="The group can sit on either side">
      <p className="ct-definition"><strong>On the left, the group is enough. On the right, the group is required.</strong></p>
      <p>On the sufficient side, AND means both together are enough, and OR means either one is enough. On the necessary side, AND means the rule guarantees every member, and OR means it guarantees at least one.</p>
    </Section>
    <Section title="Why the side changes the answer">
      <p>The same two words give very different results depending on where they sit. A fact that reaches <PunchWord>one member</PunchWord> of a group on the left may do nothing at all. The same fact on the right can settle the rule. So before you ask what follows, ask <strong>which whole side my facts reach.</strong></p>
    </Section>
    <Section title="Try the four placements">
      <p>Choose a placement, then try the facts under it. Read what the rule gives and what it leaves open.</p>
      <PlacementExplorer/>
      <p>Each group is drawn stacked, with the arrow leaving the whole group rather than one member. Written flat, <em>project AND inspection → regional</em> can look like two loose pieces. Stacked, the arrow plainly leaves both together. That is a readability choice. The logic is the same either way.</p>
    </Section>
    <Section title="Three tempting mistakes">
      <ErrorCards start={<>Rule: (project submitted AND inspection passed) → regional round</>} cards={[
        { verdict: 'wrong', how: 'Split the AND on the left.', body: <p>Project submitted → regional round.</p>, why: 'That gives the project a guarantee the rule never gave. Under this rule, one member alone does not reach the regional round.' },
        { verdict: 'wrong', how: 'Pick one branch of an OR on the right.', body: <p>Volunteer finishes training → gets a badge.</p>, why: 'The rule guarantees a shirt or a badge, at least one. It does not say which, so it does not guarantee a badge.' },
        { verdict: 'right', how: 'Chain only when the whole side is reached.', body: <p>Another rule gives the project. The inspection is still needed.</p>, why: 'A second rule that reaches only one member leaves the other member to be shown.' },
      ]}/>
    </Section>
    <Section title="A habit to keep">
      <p>Mark a group when you have to track several conditions at once. Then test it: which whole side do the facts establish, and which whole side do they deny? Where the answer is neither, the rule gives no additional conclusion from those facts.</p>
    </Section>
    <AndOrQuiz quizId="and-or-either-side"/>
  </>;
}

// ---- 2.3 Deny the whole group -----------------------------------------------------------------------

function NegateGroup() {
  const [brakes, lights] = negationExamples[0].item.atoms;
  return <>
    <Section title="Start with when the group fails">
      <p className="ct-definition"><strong>To deny a group, ask when it fails. Then say that.</strong></p>
      <p>Two things have to be true for a parade float to pass: its brakes, and its lights. Set the facts and compare three statements: both hold, not both, and neither.</p>
      <FourCombos first={brakes} second={lights} mode="opposite"/>
      <p>“Not both” is true in three of the four cases. “Neither” is true in only one. They are different statements, and the denial of <em>both</em> is <strong>not both</strong>, which means at least one is missing. For an OR, the logic runs the other way: it fails only when every member fails, so its denial is <strong>neither</strong>.</p>
    </Section>
    <Section title="Why the connector changes">
      <p>The connector does not change because of a trick. It changes because you are denying the whole group. <PulseWord>Deny AND</PulseWord> and you get <em>at least one is missing</em>, which is an OR of denials. <PulseWord>Deny OR</PulseWord> and you get <em>every one is missing</em>, an AND of denials. A NOT already on a member cancels when you deny it.</p>
    </Section>
    <Section title="Flip, deny, and check">
      <ol className="ct-moves">
        <li><strong>Step 1: Flip the sides.</strong> The right side goes on the left, and the left side goes on the right.</li>
        <li><strong>Step 2: Put NOT on every member.</strong> If a member already has a NOT, the two cancel.</li>
        <li><strong>Step 3: Switch each group’s connector.</strong> AND becomes OR, and OR becomes AND. A single member has no connector to switch.</li>
      </ol>
      <ContrapositiveDemo item={negationExamples[0].item} label="Flip, deny and switch: the parade float"/>
      <p>Now one where a NOT is already there, and the group is on the right:</p>
      <ContrapositiveDemo item={negationExamples[1].item} label="Flip, deny and switch: the pool"/>
      <p>These are the four placements from the last lesson, each with its contrapositive:</p>
      <FourForms/>
    </Section>
    <Section title="Two look-alikes that fail">
      <ErrorCards start={<>Rule: if the brakes pass and the lights work, then the float is approved.</>} cards={[
        { verdict: 'wrong', how: 'Deny every member but keep the AND.', body: <p>If the float is not approved, the brakes do not pass and the lights do not work.</p>, why: 'That says both failed. The rule only tells you at least one did.' },
        { verdict: 'wrong', how: 'Deny the whole rule.', body: <p>The brakes pass, the lights work, and the float is not approved.</p>, why: 'That is not the contrapositive. It says the rule itself is broken.' },
        { verdict: 'right', how: 'Flip, deny each member, switch the connector.', body: <p>If the float is not approved, the brakes do not pass or the lights do not work.</p>, why: 'It says exactly what the rule says, from the other end.' },
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
