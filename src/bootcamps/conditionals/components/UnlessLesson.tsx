import { useId, useRef, useState, type ReactNode } from 'react';
import type { FullCourseLesson as Lesson } from '../content/fullCourseTypes';

/** Lesson 3.1, built on Joshua's "Either idea works" panel (Group3_Either_Idea, 2026-10-27).
 *  One sentence carries the reasoning from meaning to both translations to what stays open; then the
 *  existing negative, without and until each use the same word-and-strike notation. */

function Idea({ children, not = false }: { children: string; not?: boolean }) {
  return <span className="fc-u-idea" data-negated={not}>{not && <span className="fc-u-sr">not </span>}{children}</span>;
}
function Formula({ left, right, label }: { left: ReactNode; right: ReactNode; label: string }) {
  return <p className="fc-u-formula" role="img" aria-label={label}><span aria-hidden="true">{left}</span><span className="fc-u-arrow" aria-hidden="true">→</span><span aria-hidden="true">{right}</span></p>;
}
function Key({ children }: { children: ReactNode }) {
  return <p className="fc-u-key">{children}</p>;
}
// Scoped to this lesson so its word notation does not change other lessons' questions.
function Question({ prompt, options, correct, feedback }: { prompt: string; options: ReactNode[]; correct: number; feedback: string[] }) {
  const [choice, setChoice] = useState<number | null>(null);
  const id = useId();
  const first = useRef<HTMLButtonElement>(null);
  return <div className="fc-u-question"><h3 id={id}>{prompt}</h3><div className="fc-u-answers" role="group" aria-labelledby={id}>
    {options.map((option, index) => <button key={index} ref={index === 0 ? first : undefined} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{option}</button>)}
  </div><div role="status" aria-live="polite">{choice !== null && <div className="fc-u-feedback" data-correct={choice === correct}><strong>{choice === correct ? 'Correct.' : 'Not quite.'}</strong><p>{feedback[choice]}</p></div>}</div>
    {choice !== null && <button type="button" className="fc-u-reset" onClick={() => { setChoice(null); first.current?.focus(); }}>Try again</button>}
  </div>;
}
function Section({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return <section className="fc-u-section">{kicker && <p className="fc-u-overline">{kicker}</p>}<h2>{title}</h2>{children}</section>;
}
function Proposal({ children, status, formula }: { children: ReactNode; status: 'same' | 'no'; formula: ReactNode }) {
  return <div className={status === 'same' ? 'fc-right' : 'fc-wrong'}>{formula}<strong>{status === 'same' ? 'Same rule, other choice' : 'Does not follow from this rule'}</strong>{children}</div>;
}

type Path = { id: 'rain' | 'game'; choose: string; word: string; other: string; label: string; english: ReactNode };
const PATHS: Path[] = [
  { id: 'rain', choose: 'Choose “it rains”', word: 'Rains', other: 'Played', label: 'If it does not rain, then the game is played', english: <><b>If</b> it does <b>not</b> rain, <b>then</b> the game is played.</> },
  { id: 'game', choose: 'Choose “the game is played”', word: 'Played', other: 'Rains', label: 'If the game is not played, then it rains', english: <><b>If</b> the game is <b>not</b> played, <b>then</b> it rains.</> },
];

function EitherIdea() {
  const [chosen, setChosen] = useState<Path['id']>('rain');
  const current = PATHS.find(path => path.id === chosen)!;
  return <>
    <p className="fc-u-sentence"><span className={chosen === 'game' ? 'fc-u-marked' : undefined}>The game is played</span> <b>unless</b> <span className={chosen === 'rain' ? 'fc-u-marked' : undefined}>it rains</span>.</p>
    <p>Pick one idea for the if side. Negate it. Keep the other for the then side, unchanged.</p>
    <div className="fc-u-paths">{PATHS.map(path => <div className="fc-u-path" key={path.id} data-selected={chosen === path.id}>
      <button type="button" className="fc-u-choose" aria-pressed={chosen === path.id} onClick={() => setChosen(path.id)}><span>{path.choose}</span><span className="fc-u-choice-mark" aria-hidden="true">{chosen === path.id ? '✓' : '○'}</span></button>
      <p className="fc-u-changed">Negate the chosen idea: <Idea>{path.word}</Idea> becomes <Idea not>{path.word}</Idea>.</p>
      <Formula left={<Idea not>{path.word}</Idea>} right={<Idea>{path.other}</Idea>} label={path.label}/>
      <p className="fc-u-english">{path.english}</p>
      <p className="fc-u-trace">The negated idea goes on the if side. <strong>{path.other} stays unchanged</strong> on the then side.</p>
    </div>)}</div>
    <p className="fc-u-note" aria-live="polite">Both are correct. <strong>Only {current.word} changed. {current.other} was left alone.</strong> The two rules are contrapositives: each is what you get by reversing and negating the other.</p>
  </>;
}

export function UnlessLesson({ film, quiz }: { lesson: Lesson; film: ReactNode; quiz: ReactNode }) {
  return <article className="fc-lesson fc-unless">
    <section className="fc-u-hero">
      <p className="fc-u-eyebrow"><span>Group 3</span><span>Unless · Until · Without</span></p>
      <h2><span className="fc-u-ifnot">If <strong>not</strong></span> <span className="fc-u-dots">…</span> then <span className="fc-u-dots">…</span></h2>
      <p className="fc-u-rule">Choose either idea. Negate it. Make it sufficient.</p>
      <p className="fc-u-clarifier">Only the chosen idea changes. The other stays exactly as stated. “If not” reminds you to negate the idea you chose. If it already contains “not,” negating it removes that negative.</p>
    </section>

    <Section kicker="Start with the sentence" title="What does it say?">
      <p className="fc-u-sentence">The game is played <b>unless</b> it rains.</p>
      <p>Before any diagram, read it as plain English.</p>
      <Question prompt="Suppose it does not rain. According to the sentence, what must happen?" options={['The game is played', 'The game is not played', 'We cannot tell']} correct={0} feedback={[
        'With no rain, the game is played. That is what the sentence guarantees. Now let’s see how the method gets there.',
        'Look at the exception after “unless.” Has that exception happened here? Read the sentence again with no rain.',
        'The sentence does settle the case where there is no rain. Reread what it promises when the exception does not happen.']}/>
    </Section>

    <Section title="Find the two complete ideas">
      <p>Unless links two ideas. Write each one as a full statement, then give it a short name.</p>
      <div className="fc-u-pair"><div><Idea>Played</Idea><strong>The game is played.</strong></div><div><Idea>Rains</Idea><strong>It rains.</strong></div></div>
      <p>Each short name stands for the whole statement. <Idea>Played</Idea> means “the game is played.” Crossing it out, <Idea not>Played</Idea>, means “the game is not played.” The line means NOT.</p>
      <p>Keep the whole idea in mind. You are negating “the game is played,” not the noun “game.”</p>
      <p>Unless does not have to sit in the middle. “Unless it rains, the game is played” links the same two ideas and translates the same way.</p>
    </Section>

    <Section title="Negate one idea">
      <Question prompt="What is the negation of “it rains”?" options={[<><Idea not>Rains</Idea>: it does not rain</>, <><Idea not>Played</Idea>: the game is not played</>, 'It always rains']} correct={0} feedback={[
        'Yes. Negating an idea says that it is not true. Nothing else changes.',
        'That negates the other idea. We chose “it rains.” Keep your attention on that statement and try again.',
        'That makes a stronger claim. Negating “it rains” says that the statement is not true. Try again without adding “always.”']}/>
    </Section>

    <Section kicker="Two correct starting choices" title="Either idea works">
      <EitherIdea/>
      <p>Why do both work? The first rule says that with no rain, there must be a game. So if there is no game, it cannot have been a day without rain. It rains.</p>
      <p><strong>Both versions rule out the same situation: no rain and no game.</strong> Choosing the other idea changes how you write the rule, not what it means.</p>
    </Section>

    {film}

    <Section title="What the rule leaves open">
      <p>Here is what each fact tells you, using only this rule.</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Suppose we know</th><th scope="col">What follows</th></tr></thead><tbody>
        <tr><td><Idea not>Rains</Idea><span className="fc-u-readback">It does not rain.</span></td><td><Idea>Played</Idea><span className="fc-u-readback">The game is played.</span></td></tr>
        <tr><td><Idea not>Played</Idea><span className="fc-u-readback">The game is not played.</span></td><td><Idea>Rains</Idea><span className="fc-u-readback">It rains.</span></td></tr>
        <tr><td><Idea>Rains</Idea><span className="fc-u-readback">It rains.</span></td><td>We cannot tell whether the game is played.</td></tr>
        <tr><td><Idea>Played</Idea><span className="fc-u-readback">The game is played.</span></td><td>We cannot tell whether it rains.</td></tr>
      </tbody></table></div>
      <p>The rows that say “we cannot tell” are where most mistakes happen. You might expect rain to cancel the game. That is a normal expectation, but it is not part of this rule. The rule guarantees a game when there is no rain. It never says what rain guarantees.</p>
      <div className="fc-comparisons">
        <Proposal status="no" formula={<Formula left={<Idea>Rains</Idea>} right={<Idea not>Played</Idea>} label="If it rains, then the game is not played"/>}><p>This makes rain enough to cancel the game. The sentence never says that. A game in the rain is still possible.</p></Proposal>
        <Proposal status="no" formula={<Formula left={<Idea>Played</Idea>} right={<Idea not>Rains</Idea>} label="If the game is played, then it does not rain"/>}><p>This reverses the rule. Knowing the game was played does not tell you the weather. The game could have gone ahead in the rain.</p></Proposal>
        <Proposal status="same" formula={<Formula left={<Idea not>Played</Idea>} right={<Idea>Rains</Idea>} label="If the game is not played, then it rains"/>}><p>This is the translation you get by choosing “the game is played” instead of “it rains.” It says the same thing as “if it does not rain, then the game is played.”</p></Proposal>
      </div>
    </Section>

    <Section kicker="One important detail" title="What if an idea already has “not”?">
      <p className="fc-u-sentence">The store does <b>not</b> open <b>unless</b> the manager arrives.</p>
      <Key><Idea>Opens</Idea> = the store opens · <Idea>Arrives</Idea> = the manager arrives</Key>
      <div className="fc-u-lines">
        <div><Formula left={<Idea not>Arrives</Idea>} right={<Idea not>Opens</Idea>} label="If the manager does not arrive, then the store does not open"/><p>Choose “the manager arrives” and negate it. The other idea, <Idea not>Opens</Idea>, keeps its original negative.</p></div>
        <div><Formula left={<Idea>Opens</Idea>} right={<Idea>Arrives</Idea>} label="If the store opens, then the manager arrives"/><p>Choose “the store does not open,” <Idea not>Opens</Idea>, and negate it. That gives <Idea>Opens</Idea>. <Idea>Arrives</Idea> stays unchanged.</p></div>
      </div>
      <p>So the manager’s arrival is required for the store to open. <strong>Negating an idea does not always mean adding not.</strong> When the idea already says “does not open,” its negation is “opens.” Negating a crossed-out idea removes the line.</p>
    </Section>

    <Section title="Without: name the second idea in full">
      <p className="fc-u-sentence">Visitors are not admitted <b>without</b> a ticket.</p>
      <Key><Idea>Admitted</Idea> = the visitor is admitted · <Idea>Ticket</Idea> = the visitor has a ticket</Key>
      <p>Here one idea is a clause and the other is only a noun. Turn the noun into a full statement before you do anything else.</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Wording in the sentence</th><th scope="col">Complete idea</th></tr></thead><tbody>
        <tr><td>Visitors are not admitted</td><td><Idea not>Admitted</Idea>: the visitor is not admitted.</td></tr>
        <tr><td>a ticket</td><td><Idea>Ticket</Idea>: the visitor has a ticket.</td></tr>
      </tbody></table></div>
      <p>Without is the link, like unless. The second idea is “the visitor has a ticket,” not “without a ticket.”</p>
      <div className="fc-u-lines">
        <div><Formula left={<Idea>Admitted</Idea>} right={<Idea>Ticket</Idea>} label="If the visitor is admitted, then the visitor has a ticket"/><p>Choose “the visitor is not admitted” and negate it to <Idea>Admitted</Idea>, “the visitor is admitted.” <Idea>Ticket</Idea> stays unchanged.</p></div>
        <div><Formula left={<Idea not>Ticket</Idea>} right={<Idea not>Admitted</Idea>} label="If the visitor does not have a ticket, then the visitor is not admitted"/><p>Choose “the visitor has a ticket” and negate it to <Idea not>Ticket</Idea>. <Idea not>Admitted</Idea> keeps its original negative.</p></div>
      </div>
      <p>A ticket is required for admission. Having one does not, by itself, guarantee that you get in.</p>
    </Section>

    <Section title="Until: keep the timing">
      <p className="fc-u-sentence">The lab does not open <b>until</b> the inspection is complete.</p>
      <Key><Idea>Opens</Idea> = the lab opens · <Idea>Complete</Idea> = the inspection is complete</Key>
      <p>Until marks a point in time, so the translation has to keep that timing.</p>
      <div className="fc-u-lines">
        <div><Formula left={<Idea>Opens</Idea>} right={<Idea>Complete</Idea>} label="If the lab opens, then the inspection is complete by then"/><p>Choose “the lab does not open” and negate it: the lab opens. Then the inspection is complete <strong>by then</strong>.</p></div>
        <div><Formula left={<Idea not>Complete</Idea>} right={<Idea not>Opens</Idea>} label="If the inspection is not complete yet, then the lab has not opened yet"/><p>Choose “the inspection is complete” and negate it: the inspection is not complete <strong>yet</strong>. Then the lab has not opened yet.</p></div>
      </div>
      <p>While the inspection is unfinished, the lab stays closed. Finishing the inspection does not, from this rule alone, mean the lab opens right away.</p>
    </Section>

    <Section title="Read the whole sentence">
      <p>These words do not always state a rule. Compare:</p>
      <div className="fc-u-table-wrap"><table className="fc-u-table"><thead><tr><th scope="col">Sentence</th><th scope="col">What it tells us</th></tr></thead><tbody>
        <tr><td>Visitors are not admitted without a ticket.</td><td>A requirement for every visitor.</td></tr>
        <tr><td>Leah left without her coat.</td><td>What happened to Leah once. It sets no rule about anyone without a coat.</td></tr>
      </tbody></table></div>
      <p>You have used this method before. OR, from lesson 2.2, works the same way: “Mia studies on Saturday or Sunday” becomes “if Mia does not study on Saturday, then she studies on Sunday.” Keep the complete ideas when you read the short names.</p>
      <p>Except can work like unless when it introduces a full clause. “The display stays lit except when its timer is off” gives: if the timer is not off, the display stays lit. It does not say the display goes dark when the timer is off.</p>
    </Section>

    <p className="fc-habit">Find the two complete ideas. Choose either one, negate it, and make it sufficient. Keep the other exactly as stated. Then read the rule back in English and check that it still says what the sentence says.</p>
    {quiz}
  </article>;
}
