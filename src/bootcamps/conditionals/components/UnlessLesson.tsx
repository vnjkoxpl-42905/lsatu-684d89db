import type { ReactNode } from 'react';
import type { FullCourseLesson as Lesson } from '../content/fullCourseTypes';
import { ReferenceQuestion } from './ConditionalReferenceSequence';

/** Lesson 3.1. One sentence carries the reasoning from meaning to both translations to what stays open;
 *  then the existing negative, without and until each get their own worked example. */
function Rule({ left, right }: { left: string; right: string }) {
  return <p className="fc-diagram fc-u-rule"><span>{left}</span><span aria-label="then">→</span><span>{right}</span></p>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="fc-u-section"><h2>{title}</h2>{children}</section>;
}
function Move({ label, children }: { label: string; children: ReactNode }) {
  return <li><span className="fc-u-move">{label}</span><div>{children}</div></li>;
}
function Proposal({ left, right, status, children }: { left: string; right: string; status: 'same' | 'no'; children: ReactNode }) {
  return <div className={status === 'same' ? 'fc-right' : 'fc-wrong'}><Rule left={left} right={right}/><strong>{status === 'same' ? 'Same rule, other choice' : 'Does not follow from this rule'}</strong>{children}</div>;
}

export function UnlessLesson({ film, quiz }: { lesson: Lesson; film: ReactNode; quiz: ReactNode }) {
  return <article className="fc-lesson fc-unless">
    <section className="fc-definition">
      <h2>One method for unless, until and without</h2>
      <p className="fc-u-method">Find the two complete ideas. Choose either one and negate it. That negated idea is the sufficient condition, the if side. Leave the other idea unchanged on the then side.</p>
      <p>We will work through one sentence from start to finish before changing anything.</p>
      <p className="fc-sentence">The game is played unless it rains.</p>
    </section>

    <Section title="Start with what the sentence says">
      <p>Before any diagram, read it as plain English.</p>
      <ReferenceQuestion prompt="Suppose it does not rain. According to the sentence, what must happen?" options={['The game is played', 'The game is not played', 'We cannot tell']} correct={0} feedback={[
        'The only thing that could stop the game is rain. With no rain, the game is played. Now let’s show how the method gets us there.',
        'The sentence says the opposite. Rain is the one exception, and here there is no rain, so nothing stops the game.',
        'The sentence does settle this case. With no rain, the exception never happens, so the game is played.']}/>
    </Section>

    <Section title="Find the two complete ideas">
      <p>Unless links two ideas. Write each one as a full statement, not a single word.</p>
      <div className="fc-u-pair"><div><span>First idea</span><strong>The game is played.</strong></div><div><span>Second idea</span><strong>It rains.</strong></div></div>
      <p>Keep the whole idea. “The game” is not something you can negate. “The game is played” is: its negation is “the game is not played.”</p>
      <p>Unless does not have to sit in the middle. “Unless it rains, the game is played” links the same two ideas and translates the same way.</p>
    </Section>

    <Section title="Choose one idea and negate it">
      <p>Choose <strong>it rains</strong>.</p>
      <ReferenceQuestion prompt="What is the negation of “it rains”?" options={['It does not rain', 'The game is not played', 'It always rains']} correct={0} feedback={[
        'Yes. Negating an idea says that it is not true. Nothing else changes.',
        'That negates the other idea. We chose “it rains,” so that is the one we negate. The game stays as it is.',
        'That makes a stronger claim, not the opposite one. The negation of “it rains” is simply “it does not rain.”']}/>
    </Section>

    <Section title="Build the rule and read it back">
      <ol className="fc-u-moves">
        <Move label="Negated idea, the if side"><p><strong>It does not rain</strong> is the sufficient condition.</p></Move>
        <Move label="Other idea, unchanged"><p><strong>The game is played</strong> goes on the then side exactly as written.</p></Move>
      </ol>
      <Rule left="Does not rain" right="Game is played"/>
      <p className="fc-readback">Read it back: if it does not rain, the game is played.</p>
      <p>That matches what we understood from the sentence before we drew anything.</p>
    </Section>

    <Section title="What if we choose the other idea?">
      <p>Keep the same sentence. This time, choose <strong>the game is played</strong>. Its negation is <strong>the game is not played</strong>, so that becomes the sufficient condition. Leave <strong>it rains</strong> unchanged.</p>
      <Rule left="Game is not played" right="It rains"/>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Choose this idea</th><th scope="col">Negate it</th><th scope="col">Result</th></tr></thead><tbody>
        <tr><td>It rains.</td><td>It does not rain.</td><td>Does not rain → game is played</td></tr>
        <tr><td>The game is played.</td><td>The game is not played.</td><td>Game is not played → it rains</td></tr>
      </tbody></table></div>
      <p>Why do both work? The first rule says that with no rain, there must be a game. So if there is no game, it cannot also be a day without rain. It must have rained.</p>
      <p><strong>Both versions rule out the same situation: no rain and no game.</strong> They are contrapositives of each other. Choosing the other idea changes how we write the rule, not what it means.</p>
    </Section>

    {film}

    <Section title="What the rule leaves open">
      <p>Here is what each fact tells you, using only this rule.</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Suppose we know</th><th scope="col">What follows</th></tr></thead><tbody>
        <tr><td>It does not rain.</td><td>The game is played.</td></tr>
        <tr><td>The game is not played.</td><td>It rains.</td></tr>
        <tr><td>It rains.</td><td>We cannot tell whether the game is played.</td></tr>
        <tr><td>The game is played.</td><td>We cannot tell whether it rains.</td></tr>
      </tbody></table></div>
      <p>The rows that say “we cannot tell” are where most mistakes happen. You might expect rain to cancel the game. That is a normal expectation, but it is not part of this rule. The rule guarantees a game when there is no rain. It never says what rain guarantees.</p>
      <div className="fc-comparisons">
        <Proposal left="It rains" right="Game is not played" status="no"><p>This makes rain enough to cancel the game. The sentence never says that. A game in the rain is still possible.</p></Proposal>
        <Proposal left="Game is played" right="Does not rain" status="no"><p>This reverses the rule. Knowing the game was played does not tell you the weather. The game could have gone ahead in the rain.</p></Proposal>
        <Proposal left="Game is not played" right="It rains" status="same"><p>This is the translation you get by choosing the game instead of the rain. It says the same thing as the first rule.</p></Proposal>
      </div>
    </Section>

    <Section title="When an idea already contains not">
      <p className="fc-sentence">The store does not open unless the manager arrives.</p>
      <div className="fc-u-pair"><div><span>First idea</span><strong>The store does not open.</strong></div><div><span>Second idea</span><strong>The manager arrives.</strong></div></div>
      <p>Choose <strong>the store does not open</strong>. Negating that whole idea gives <strong>the store opens</strong>. Keep the manager’s arrival unchanged.</p>
      <Rule left="Store opens" right="Manager arrives"/>
      <p>So the manager’s arrival is required for the store to open. If you choose the manager’s arrival instead, you get the other version:</p>
      <Rule left="Manager does not arrive" right="Store does not open"/>
      <p><strong>Negating an idea does not always mean adding not.</strong> When the idea already says “does not open,” its negation is “opens.”</p>
    </Section>

    <Section title="Without: name the second idea in full">
      <p className="fc-sentence">Visitors are not admitted without a ticket.</p>
      <p>Here one idea is a clause and the other is only a noun. Turn the noun into a full statement before you do anything else.</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Wording in the sentence</th><th scope="col">Complete idea</th></tr></thead><tbody>
        <tr><td>Visitors are not admitted</td><td>The visitor is not admitted.</td></tr>
        <tr><td>a ticket</td><td>The visitor has a ticket.</td></tr>
      </tbody></table></div>
      <p>Without is the link, like unless. The second idea is “the visitor has a ticket,” not “without a ticket.” Choose <strong>the visitor is not admitted</strong>, negate it to <strong>the visitor is admitted</strong>, and keep the ticket unchanged.</p>
      <Rule left="Visitor is admitted" right="Visitor has a ticket"/>
      <p>The other choice gives:</p>
      <Rule left="Visitor has no ticket" right="Visitor is not admitted"/>
      <p>A ticket is required for admission. Having one does not, by itself, guarantee that you get in.</p>
    </Section>

    <Section title="Until: keep the timing">
      <p className="fc-sentence">The lab does not open until the inspection is complete.</p>
      <p>Until marks a point in time. The translation has to keep that timing. Choose <strong>the lab does not open</strong> and negate it: <strong>the lab opens</strong>. Then the inspection must be complete by then.</p>
      <Rule left="Lab opens" right="Inspection complete by then"/>
      <p>The other choice gives:</p>
      <Rule left="Inspection not complete yet" right="Lab has not opened yet"/>
      <p>While the inspection is unfinished, the lab stays closed. Finishing the inspection does not, from this rule alone, mean the lab opens right away. The words “yet” and “by then” carry the timing.</p>
    </Section>

    <Section title="Read the whole sentence">
      <p>These words do not always state a rule. Compare:</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Sentence</th><th scope="col">What it tells us</th></tr></thead><tbody>
        <tr><td>Visitors are not admitted without a ticket.</td><td>A requirement for every visitor.</td></tr>
        <tr><td>Leah left without her coat.</td><td>What happened to Leah once. It sets no rule about anyone without a coat.</td></tr>
      </tbody></table></div>
      <p>Except can work like unless when it introduces a full clause. “The display stays lit except when its timer is off” gives: if the timer is not off, the display stays lit. It does not say the display goes dark when the timer is off.</p>
    </Section>

    <p className="fc-habit">Find the two complete ideas. Choose one, negate it, and make it the sufficient condition. Keep the other unchanged. Then read the rule back in English and check that it still says what the sentence says.</p>
    {quiz}
  </article>;
}
