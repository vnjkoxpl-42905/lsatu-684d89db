import { ContrapositiveGuessCard } from './ContrapositiveGuessCard';
import { Children, cloneElement, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Fundamentals, GroupLessons } from './ConditionalOpeningLesson';
import { conditionalReferenceContent, ReferenceQuestion, RuleDiagram, TargetReader, targetExamples, WordFamily } from './ConditionalReferenceSequence';
import { NegativeCaseLab } from './CounterexampleLab';
import { StagedReasoningDrill } from './StagedReasoningDrill';
import { DrillOneExperience, type DrillOneQuestion } from './DrillOneExperience';
import './must-arrow-note.css';
import './missing-requirement-note.css';
import { MustArrowPractice } from './MustArrowPractice';

type ContentSection = ReactElement<{ id?: string; number?: number; title?: string; children?: ReactNode; dark?: boolean; 'data-reference-boundary'?: boolean }>;

// Compose the approved source sections directly. Their stateful exercises are
// mounted by React; the former reader-page renderer is never invoked here.
function sections(children: ReactNode): ContentSection[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<ContentSection['props']>(child)) return [];
    return child.type === Fragment ? sections(child.props.children) : [child];
  });
}

function reference(number: number): ContentSection {
  const section = sections(conditionalReferenceContent().props.children).find(item => item.props.number === number);
  if (!section) throw new Error(`Missing approved conditional reference section ${number}`);
  return section;
}

function groupSections(group: 'group-1' | 'group-2') {
  return sections(GroupLessons({ id: group }).props.children);
}

function groupSection(group: 'group-1' | 'group-2', title: string) {
  const section = groupSections(group).find(item => item.props.id === title || item.props.title === title);
  if (!section) throw new Error(`Missing approved conditional section: ${title}`);
  const sectionId = `course-${group}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return cloneElement(section, { key: sectionId, id: sectionId });
}

function NoteSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

function ReferenceBody({ number, omitTransition = false }: { number: number; omitTransition?: boolean }) {
  const source = reference(number);
  const children = Children.toArray(source.props.children);
  // These source sections end in navigation prose for the former ordering.
  // The course shell now owns transitions; the teaching stays in its source.
  return <section className={`co-section cr-course-section ${source.props.dark ? 'cr-dark' : ''}`} data-reference-source={number}>
    <div className="co-section-heading"><h2>{source.props.title}</h2></div>
    <div className="cr-step-body">{omitTransition ? children.slice(0, -1) : children}</div>
  </section>;
}

function FamilySupplement({ group }: { group: 'group-1' | 'group-2' }) {
  const source = reference(group === 'group-1' ? 3 : 5);
  const family = sections(source.props.children).find(child => child.type === WordFamily);
  if (!family) throw new Error(`Missing approved ${group} supplementary family`);
  return <details className="co-practical-note"><summary>More indicators for the same rule</summary>
    <p>Use the stated rule: anyone who borrows a locker has a key. These rules keep that connection. They do not say every person with a key borrows a locker.</p>
    {family}
  </details>;
}

// Only and only if both mark the requirement, from different places in the rule.
function OnlyAndOnlyIf() {
  return <NoteSection title="Only and only if can mark the same requirement">
    <div className="cr-language-pair"><p><strong>Only</strong> [people with a key] borrow a locker.</p><p>A person borrows a locker <strong>only if</strong> [they have a key].</p><span>Only and only if identify the necessary condition here.</span></div>
    <p>Both sentences say locker borrowers have a key. In the first, only is at the beginning. In the second, only if is in the middle. Having a key is required in both, so it goes right. Read only if as the whole phrase; the if inside it isn't doing the job if does on its own.</p>
    <ReferenceQuestion prompt="A person borrows a locker only if they have a key. Which condition goes on the right?" options={['Borrows a locker', 'Has a key']} correct={1} feedback={['Borrowing is what has the requirement. Ask what a locker borrower must have: a key. Borrowing goes left; having a key goes right.', 'Having a key is required for borrowing. Only if appears in the middle, but it still identifies the necessary condition.']}/>
  </NoteSection>;
}

// Only after is tested in Drills 2 and 5, so it is taught with the other Group 2 words.
function OnlyAfter() {
  return <NoteSection title="Only after also marks a requirement">
    <blockquote>The pharmacy fills a prescription <strong>only after</strong> a doctor signs it.</blockquote>
    <p>Use the What Test: ask what the indicator refers to. <strong>Only after what?</strong> A doctor signs it. That signature is required before the pharmacy fills the prescription, so it goes right.</p>
    <RuleDiagram left="Pharmacy fills the prescription" right="A doctor has signed it"/>
    <p>Read it as: if the pharmacy fills a prescription, a doctor has signed it. The word after tells you the order of events in the rule. The arrow still reads as must, not as a timeline.</p>
    <ReferenceQuestion prompt="A doctor has signed Ana's prescription. Does this rule prove the pharmacy fills it?" options={['Yes. The signature is enough.', 'No. Whether it gets filled is still open.']} correct={1} feedback={['The signature is what filling requires. Could a doctor sign a prescription that Ana never brings to the pharmacy? The rule would allow that.', 'The signature is required, not enough. The rule tells you what every filled prescription has. It does not say every signed one gets filled.']}/>
  </NoteSection>;
}

// Follows the Group 1 indicator note, whose if, all and any sections already
// teach the report, registered-guest and late-applicant sentences.
function CompleteConditionNote() {
  return <NoteSection title="Keep the whole phrase before you place it">
    <blockquote><strong>The only people admitted</strong> are members.</blockquote>
    <p>The only what? People admitted. An admitted person must be a member, so <strong>Person admitted → Person is a member</strong>. Keep the whole phrase together; the rule does not promise admission to every member.</p>
    <ReferenceQuestion prompt="The only notebooks kept on this shelf are hardback. Which condition is sufficient?" options={['Notebook is hardback', 'Notebook is kept on this shelf', 'Notebook']} correct={1} feedback={['Being hardback does not guarantee a place on this shelf. The rule tells us about the notebooks kept here.', 'A notebook kept on this shelf must be hardback. Kept on this shelf is the complete sufficient condition.', 'Notebook alone would cover every notebook. Keep the restriction: kept on this shelf.']}/>
    <p>In the next drill, find the indicator, select the complete condition, place it beside the arrow and check that your diagram keeps the rule's meaning.</p>
  </NoteSection>;
}

function MissingRequirementNote() {
  const [attempted, setAttempted] = useState(false);
  return <>
    <NoteSection title="What if someone is not a student?">
      <p>Keep the rule from the last lesson:</p>
      <blockquote>If you are enrolled in law school, then you are a student.</blockquote>
      <p>Now you learn that Maya is <strong>not a student</strong>. Think about what enrollment would require before choosing.</p>
      <ReferenceQuestion prompt="Could Maya be enrolled in law school while this rule holds?" options={['Yes, she could still be enrolled.', 'No, she cannot be enrolled.', 'The rule leaves her enrollment unknown.']} correct={1} onAttempt={choice => setAttempted(choice !== null)} feedback={['Enrollment would require Maya to be a student. That conflicts with the fact that she is not a student.', 'If Maya were enrolled, she would have to be a student. She is not a student, so she cannot be enrolled under this rule.', 'This fact settles enrollment. An enrolled person who is not a student would break the rule.']}/>
      {attempted && <div className="cr-discovery-reasoning">
        <h3>The missing requirement rules out enrollment</h3>
        <p>That is the <strong>contrapositive</strong>: <strong>if the necessary condition is false, the sufficient condition must be false too.</strong></p>
        <p>Being a student is required for enrollment. When that requirement is missing, enrollment is ruled out. We have not added a new rule; this follows from the rule we already had.</p>
        <figure className="cr-contrapositive-pair">
          <figcaption>Two ways to read the same rule</figcaption>
          <p><strong>Original</strong></p><RuleDiagram left="Enrolled in law school" right="Is a student"/>
          <p><strong>Contrapositive</strong></p><RuleDiagram left="Is not a student" right="Not enrolled in law school"/>
        </figure>
        <p>This is different from simply reversing the arrow. <strong>Being a student does not prove enrollment.</strong> A student could be studying history instead. The contrapositive starts with <strong>not being a student</strong>.</p>
      </div>}
    </NoteSection>
    {attempted && <ReferenceBody number={7} omitTransition/>}
  </>;
}

function ContrapositiveNote() {
  return <>
    <NoteSection title="Something hiding inside every rule">
      <p>So far, you know this about a rule: <strong>if the condition on the left side of the arrow is true, the condition on the right side must be true.</strong> That holds every time. Keep it in mind for a thought experiment.</p>
      <ContrapositiveGuessCard
        story={<><p>Imagine you hate the cold. <strong>If your coat is on, you're going outside.</strong> Going outside is the only reason you ever put your coat on. Every single time the coat is on, you're headed out the door.</p><RuleDiagram left="Coat on" right="Going outside"/></>}
        question={<p>Now imagine you are <strong>not</strong> going outside. What do you know about your coat?</p>}
        answer={<><p><strong>Your coat is not on.</strong></p><p>You're not going outside, so the requirement for wearing the coat is missing. Could the coat be on? No. If it were on, you'd be headed out the door. You're not, so it isn't.</p><p className="cg-remember"><strong>Remember:</strong> if the right side of the arrow is missing, the left side is missing too. This is the contrapositive.</p></>}
      />
      <p>You didn't need a new rule to get that answer. It was sitting inside the original rule, waiting to be recognized.</p>
      <p>The original and the contrapositive are <strong>logically equivalent</strong>. They say exactly the same thing. If one is true, the other is true, and the other way around. You can use either one. They're interchangeable.</p>
      <figure className="cr-contrapositive-pair">
        <figcaption>One rule, said two ways</figcaption>
        <p><strong>Original.</strong> The left side of the arrow is true, so the right side is true.</p><RuleDiagram left="Left side" right="Right side"/>
        <p><strong>Contrapositive.</strong> The right side of the arrow is false, so the left side is false.</p><RuleDiagram left="Right side is false" right="Left side is false"/>
      </figure>
    </NoteSection>
    <NoteSection title="Say it out loud once more">
      <p>Here is another one: <strong>If the ceiling light is on, then the power is on.</strong></p>
      <p>So if the light is on, it needs power. It has to have power for the light to come on. The power is completely necessary. What if there's no power? Then the light doesn't have what it needs. It can't be on.</p>
      <p>Power sits on the right side of the arrow. When the right side is missing, the left side can't happen.</p>
      <table className="co-combination-table ct-compare">
        <caption>What the rule tells you, and when</caption>
        <thead><tr><th scope="col">Situation</th><th scope="col">What has to happen?</th><th scope="col">If the light is on, then the power is on</th></tr></thead>
        <tbody>
          <tr><td>Left side true</td><td>The right side must be true.</td><td>The light is on, so the power must be on.</td></tr>
          <tr><td>Right side false</td><td>The left side can't be true.</td><td>There's no power, so the light can't be on.</td></tr>
          <tr><td>Left side false</td><td>Nothing.</td><td>The light is off. The power could be on or off. We don't know.</td></tr>
          <tr><td>Right side true</td><td>Nothing.</td><td>The power is on. The light could be on or off. We don't know.</td></tr>
        </tbody>
      </table>
      <p>The first two rows are the two situations that make the rule do something. In the last two, the rule settles nothing, and you need other information.</p>
    </NoteSection>
    <NoteSection title="How to write it">
      <p>Write the rule with an arrow: <strong>Light → Power</strong>. The sufficient condition goes on the left side of the arrow. The necessary condition goes on the right side.</p>
      <p>Now the contrapositive: <strong>~Power → ~Light</strong>. The ~ is a squiggle. Read it as “not.”</p>
      <table className="co-combination-table ct-compare">
        <caption>Original and contrapositive</caption>
        <thead><tr><th scope="col">Original</th><th scope="col">Contrapositive</th></tr></thead>
        <tbody>
          <tr><td>C → D</td><td>~D → ~C</td></tr>
          <tr><td>M → ~N</td><td>N → ~M</td></tr>
          <tr><td>~G → H</td><td>~H → G</td></tr>
          <tr><td>~S → ~T</td><td>T → S</td></tr>
        </tbody>
      </table>
      <p>Once you have the original written down, flip and negate to get the contrapositive.</p>
      <ol className="ct-moves">
        <li><strong>Write the rule as a diagram.</strong></li>
        <li><strong>Flip the sides.</strong> The right side goes on the left, and the left side goes on the right.</li>
        <li><strong>Put “not” on both.</strong> If a side already has a “not,” the “not” comes off.</li>
        <li><strong>Read it back in plain English.</strong> Check it against the rule.</li>
      </ol>
      <p>Read it back: if there's no power, the light is not on. Does the rule say that? It does. That check catches most mistakes.</p>
    </NoteSection>
    <NoteSection title="What it is not">
      <p>Two other moves look like the contrapositive. Each one does only half the work.</p>
      <table className="co-combination-table ct-compare">
        <caption>Three ways to change Light → Power</caption>
        <thead><tr><th scope="col">What you do</th><th scope="col">What you get</th><th scope="col">Do you know it's true?</th></tr></thead>
        <tbody>
          <tr><td>Flip the sides only. This is the reverse.</td><td>Power → Light</td><td>No. The power can be on with the light off.</td></tr>
          <tr><td>Add “not” only. This is the inverse.</td><td>~Light → ~Power</td><td>No. A light that's off doesn't mean the power is off.</td></tr>
          <tr><td>Flip the sides and add “not” to both. This is the contrapositive.</td><td>~Power → ~Light</td><td>Yes. It says the same thing as the original.</td></tr>
        </tbody>
      </table>
      <p>Wrong answer choices use the reverse and the inverse on purpose. Each one is a single move away from the right answer.</p>
    </NoteSection>
    <NoteSection title="Read it, don't always write it">
      <p>Every rule can be read two ways.</p>
      <ul className="ct-list">
        <li>Forward, from left to right.</li>
        <li>Backward, from right to left, putting a “not” on everything as you go. That reads the contrapositive without writing it.</li>
      </ul>
      <p>You don't need to write the contrapositive for every rule. If you can write it, you can already read it, and extra notation just adds noise. Write it when it helps you see the rule more clearly, or when you need to connect it to another rule.</p>
      <p>The drills in this lesson ask you to write it anyway. That shows you can find it. Once your contrapositives match the answer key, you'll be ready to just read them.</p>
    </NoteSection>
    <NoteSection title="Why it matters">
      <p>The LSAT often gives you a rule one way and then uses it the other way. You'll see the contrapositive as a conclusion, as an answer choice, or as one link in a chain. Since it says the same thing as the rule, you can treat the two as one fact.</p>
      <blockquote>If the ceiling light is on, then the power is on. So if the power is off, the ceiling light is not on.</blockquote>
      <p>The second sentence isn't new information. It's the first sentence turned around. A student who doesn't see that treats it as a leap. A student who does sees a rule they already had.</p>
      <ReferenceQuestion prompt="Rule: If a visitor enters the lab, the visitor has a badge. Which is the contrapositive?" options={['If a visitor has a badge, the visitor enters the lab.', 'If a visitor does not enter the lab, the visitor has no badge.', 'If a visitor has no badge, the visitor does not enter the lab.']} correct={2} feedback={['This only flips the sides. That is the reverse. A badge could be required without being enough.', 'This only adds “not.” Staying out of the lab leaves the badge question open.', 'Right. No badge, no entry. The sides flipped and both conditions got a “not.”']}/>
    </NoteSection>
  </>;
}

function IndicatorNote({ group }: { group: 'group-1' | 'group-2' }) {
  const [selected, setSelected] = useState(0);
  const [opened, setOpened] = useState<number[]>([0]);
  const [focusPanel, setFocusPanel] = useState(false);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();
  const content = groupSections(group);
  const expressions = content.slice(2, 9);
  const names = expressions.map(section => section.props.title?.split(':')[0]);
  useEffect(() => {
    if (!focusPanel) return;
    panels.current[selected]?.focus();
    setFocusPanel(false);
  }, [focusPanel, selected]);
  const choose = (index: number, moveFocus = false) => {
    setSelected(index);
    setOpened(previous => previous.includes(index) ? previous : [...previous, index]);
    setFocusPanel(moveFocus);
  };
  const last = selected === expressions.length - 1;
  // Two introductions and the seven complete expression explanations belong
  // together in one concept note, not nine separate navigation destinations.
  return <>{content.slice(0, 2)}
    <p className="co-word-guide">Work through all seven indicators. Each one does the same job in a different sentence, and each has its own trap to check. Use Next indicator to go in order, or choose any indicator to read it again.</p>
    <div className="co-word-tabs" role="group" aria-label="Choose an indicator">{expressions.map((section, index) => <button type="button" key={section.props.title} aria-pressed={selected === index} aria-controls={`${id}-${index}`} onClick={() => choose(index)}>{names[index]}{opened.includes(index) && <><span aria-hidden="true"> ✓</span><span className="co-sr-only">, opened</span></>}</button>)}</div>
    <p className="co-kicker" role="status">Indicator {selected + 1} of {expressions.length} · {opened.length} of {expressions.length} opened</p>
    {expressions.map((section, index) => <div key={section.props.title} id={`${id}-${index}`} hidden={selected !== index} tabIndex={-1} ref={element => { panels.current[index] = element; }}>{section}</div>)}
    <div className="co-choices">{last
      ? <p>That was the last of the seven indicators. Choose any of them to read it again, or recall them with the cards below.</p>
      : <button type="button" className="co-primary" onClick={() => choose(selected + 1, true)}>Next indicator: {names[selected + 1]}</button>}</div>
    {group === 'group-2' && <><OnlyAndOnlyIf/><OnlyAfter/></>}
    <FamilySupplement group={group}/>
  </>;
}

// Teach placement and reading through the familiar relationship, then require a decision.
function MustArrowNote() {
  return <section className="co-section cr-course-section ma-lesson" data-reference-source={8}>
    <div className="co-section-heading"><h2>What the arrow says</h2></div>
    <div className="cr-step-body">
      <p className="ma-lead">An arrow joins the two conditions in a rule. It says one thing: <strong>if the condition on the left is true, the condition on the right must be true.</strong></p>
      <figure className="ma-example" aria-label="If you are enrolled in law school, you must be a student">
        <figcaption className="ma-read-instruction">Read it as a sentence: <strong>“If you are enrolled in law school, then you must be a student.”</strong></figcaption>
        <div className="ma-relationship">
          <div className="ma-condition"><span className="ma-side"><small>Left side</small>Sufficient condition</span><strong>You are enrolled in law school</strong><span className="ma-meaning">Enough to guarantee the right side</span></div>
          <div className="ma-arrow" aria-hidden="true"><span>must</span><svg viewBox="0 0 100 32" fill="none"><path d="M3 16H93M77 3L94 16L77 29" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div className="ma-condition"><span className="ma-side"><small>Right side</small>Necessary condition</span><strong>You are a student</strong><span className="ma-meaning">Required when the left side is true</span></div>
        </div>
      </figure>
      <p>Being enrolled in law school is <strong>enough</strong> to know you are a student. That is why enrollment goes on the <strong>left</strong>. Being a student is <strong>required</strong> for enrollment, so it goes on the <strong>right</strong>. The arrow points from what is enough to what is required.</p>
      <section className="ma-where" aria-label="Where to start reading">
        <h3>Start at the left</h3>
        <p>A rule begins where the arrow begins. Say “if” and read the left condition. Then say “then” and read the right one: <strong>If you are enrolled in law school, then you are a student.</strong></p>
        <p>Reading from the right says something else. “You are a student, so you are enrolled” is not what this rule says. The arrow only runs one way, and you start at its tail.</p>
      </section>
      <section className="ma-purpose" aria-label="What the arrow is for">
        <h3>What the arrow is for</h3>
        <p>A rule can take a full sentence to say. The arrow shows what it promises in one line, so you can test a fact against it without rereading the sentence.</p>
        <ul>
          <li>You learn the <strong>left</strong> side is true. The right side must be true too.</li>
          <li>You learn the <strong>right</strong> side is true. The left side stays open.</li>
        </ul>
        <p>This matters on the LSAT because arguments turn on which way a rule runs. A conclusion that follows the arrow is supported. A conclusion that runs against it needs something the rule never gave you.</p>
      </section>
      <section className="ma-placement" aria-label="Place and read the conditions">
        <h3>Place the conditions. Then read the arrow.</h3>
        <p>Choose what belongs on each side, then use the same direction with a new rule.</p>
        <p className="ma-compact-note">Put the <strong>condition</strong> beside the arrow, not the indicator word. For example, write “you win the raffle,” not “if.”</p>
        <MustArrowPractice />
      </section>
      <section className="ma-order" aria-label="Two ways to say the same thing">
        <h3>Two ways to say the same thing</h3>
        <div className="cr-language-pair"><p><strong>If</strong> you win the raffle, you get a bicycle.</p><p>You get a bicycle <strong>if</strong> you win the raffle.</p></div>
        <p>Both mean: <strong>You win the raffle → You get a bicycle.</strong> Winning is sufficient, so it goes left, even when it comes last in the rule.</p>
      </section>
      <p className="ma-takeaway"><strong>The arrow guarantees the right side when the left side is true.</strong> Being a student alone does not prove that you are enrolled in law school.</p>
      <details className="cr-extension ma-reverse"><summary>Why can't we reverse it?</summary><div className="ma-reverse-body"><p>A person could be a history student who is not enrolled in law school. That possibility fits our rule.</p><p>The arrow states a rule. By itself, it does not tell us that either condition is true, or that one causes the other.</p></div></details>
    </div>
  </section>;
}

// One translation process, checked four ways, instead of five restarted lessons.
function WholeMeaningNote() {
  const onlyComparison = groupSection('group-2', 'Compare only with the only');
  const insideCheck = Children.toArray(reference(12).props.children);
  return <>
    <NoteSection title="Check a translation four ways">
      <p>A diagram can point the right way and still say the wrong thing. Each check below catches a different slip in the same translation process.</p>
      <ol>
        <li><strong>Target:</strong> did you find the whole idea the indicator refers to, wherever it sits?</li>
        <li><strong>Qualification:</strong> did your short label keep every restriction?</li>
        <li><strong>Direction:</strong> did a similar-looking indicator trick you into the wrong side?</li>
        <li><strong>Imagined case:</strong> does your arrow promise something the rule leaves open?</li>
      </ol>
    </NoteSection>
    <NoteSection title="Check 1: find the whole group, wherever it sits">
      <p>An indicator's <strong>target</strong> is the complete word or phrase it refers to. In “All guests wearing blue badges receive vouchers,” all refers to guests wearing blue badges, not guests alone.</p>
      <p>The group often comes after its indicator. But often isn't always. Try these rules in order.</p>
      {targetExamples.map(item => <TargetReader item={item} key={item.label}/>)}
      <div className="cr-language-pair"><p>[Having a key] is <strong>required</strong> for borrowing a locker.</p><p>Borrowing a locker <strong>requires</strong> [having a key].</p><span>Having a key is the requirement in both sentences.</span></div>
      <p>The group comes before required in the first sentence and after requires in the second. Having a key still goes right. Neither the closest noun nor the next word is a reliable group rule. Ask which complete idea the rule calls required, then give that idea its role.</p>
    </NoteSection>
    <NoteSection title="Check 2: keep every qualification">
      <p>Once you have the group, shorten it without losing what limits it. These two sentences test the same habit from opposite sides of the arrow.</p>
      <div className="co-word-comparison">
        <div><blockquote>Any applicant who submits late pays a fee.</blockquote><p>Applicant alone isn't the condition. The rule is about an applicant who submits late. Drop that restriction and your diagram makes a claim about on-time applicants too.</p></div>
        <div><blockquote>Entry requires a current pass.</blockquote><p>A current pass is required. Has a pass drops current and would include an expired pass. A shorter label should save writing, not change the requirement.</p></div>
      </div>
      <ReferenceQuestion prompt="Any applicant who submits late pays a fee. What goes left?" options={['Applicant', 'Applicant submits late']} correct={1} feedback={['You dropped the late-submission restriction. Applicant alone would cover every applicant, including someone who submits on time. The sufficient idea is applicant submits late.', 'This keeps the complete sufficient idea. The rule covers applicants who submit late, so keep that restriction with the applicant.']}/>
      <ReferenceQuestion prompt="Entry requires a current pass. What goes right?" options={['Has current pass', 'Has any pass']} correct={0} feedback={['This keeps the full requirement. Entry needs a current pass; an expired pass does not meet that requirement.', 'You dropped current from the requirement. Has any pass would include an expired pass, which is not what the rule requires.']}/>
    </NoteSection>
    <NoteSection title="Check 3: only and the only point to different groups">{onlyComparison.props.children}</NoteSection>
    <NoteSection title="Can, should and must keep their meaning">
      <blockquote>If a visitor registers, the visitor may enter.</blockquote>
      <p>Registration guarantees <strong>permission to enter</strong>. It does not mean the visitor actually enters. Keep “may enter” together on the right.</p>
      <blockquote>If a report contains an error, the editor should correct it.</blockquote>
      <p>The rule tells us what the editor <strong>should do</strong>. It does not prove that the correction happens. A diagram must keep the obligation instead of turning it into a fact.</p>
      <p>Keep time limits too. <strong>“Before noon”</strong> is not the same as “at some point.” When two ideas form one condition, keep both: <strong>“signed and dated”</strong> is the complete requirement.</p>
    </NoteSection>
    <NoteSection title="Short symbols stand for complete conditions">
      <p>You choose the letters. Write what each one means so a short diagram keeps the whole rule.</p>
      <blockquote>All registered guests receive a wristband.</blockquote>
      <p><strong>R</strong> = guest is registered. <strong>W</strong> = guest receives a wristband.</p>
      <RuleDiagram left="R" right="W"/>
      <p>Read it back: <strong>If a guest is registered, the guest receives a wristband.</strong> R does not mean “guest” alone. Its definition keeps “registered.”</p>
    </NoteSection>
    <NoteSection title="Check 4: try the rule from the inside">{insideCheck.slice(0, -1)}</NoteSection>
  </>;
}

const freshCases = [
  { rule: 'If it rains on Saturday, the market moves into the town hall.', questions: [
    { prompt: "It's Friday. You've read this rule and nothing else. Where will the market be on Saturday?", options: ['In the town hall.', 'Outdoors, as usual.', "The rule alone doesn't settle it."], correct: 2, feedback: ['You treated the rule as a weather report. It tells you what follows if it rains. Nobody has told you that it will rain.', "You assumed it won't rain. The rule hasn't told you that either, so the market's location is still open.", "The rule describes what would happen if it rains. It's a promise about a possible case, not a report that the case happened."] },
    { prompt: "Saturday arrives, and it's raining. Now where is the market?", options: ['In the town hall.', 'Still not settled.'], correct: 0, feedback: ['Now you have a fact, not just a rule. Rain on Saturday meets the condition, so the rule puts the market in the town hall.', "The fact changes things. The rule covers a rainy Saturday, and that's what we have, so the market's location is settled."] },
  ] },
  { rule: 'Every student going on the museum trip has a signed permission slip.', questions: [
    { prompt: 'Which description matches this rule?', options: ['Going on the trip is enough to know a student has a signed slip.', 'Having a signed slip is enough to know a student is going on the trip.', 'Each one is enough to know the other.'], correct: 0, feedback: ['Pick any student on the trip: the rule says they have a signed slip. Going is enough to prove the slip, and the slip is what every student on the trip is required to have.', "You made the requirement enough. A student could have a signed slip and stay at school with a cold. That student doesn't break the rule.", "The rule gives only one direction. Going on the trip proves a signed slip. A student with a slip who stays behind fits the rule, so the slip doesn't prove going."] },
  ] },
  { rule: 'If the café runs out of bread, it closes early.', questions: [
    { prompt: 'Today the café did not run out of bread. Did it close early?', options: ['No. It stayed open until the usual time.', 'Yes. It closed early.', 'Not settled. It could stay open or close early for another reason.'], correct: 2, feedback: ['You treated running out of bread as the only reason to close early. The rule gives one reason. A café that closed early because of a power cut would still fit it.', "Nothing here proves an early closing. The rule tells us what happens when the bread runs out, and today it didn't.", "Given that fact, the rule doesn't settle whether the café closed early. It could have stayed open, or closed early for another reason. Both cases fit the rule."] },
  ] },
];

// Recall the definitions, apply the arrow, then distinguish indicators from conditions.
const foundationConceptQuestions: DrillOneQuestion[] = [
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a necessary condition?', options: ['A requirement that must be met, but might not be enough on its own.', 'Something that always guarantees the other condition.', 'Something that usually happens afterward.'], correct: 0, feedback: ['Necessary means required. Meeting the requirement does not, by itself, prove that the other condition is true.', 'That describes sufficiency. A requirement can also be sufficient, but being necessary alone does not prove that.', 'Necessity is a requirement, not a prediction about timing. It must hold whenever the condition that requires it holds.'] },
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a sufficient condition?', options: ['The only possible way for another condition to be true.', 'Something that makes another condition more likely.', 'Something that guarantees another condition when it is true.'], correct: 2, feedback: ['The only possible way describes a necessary condition: it would be required. Sufficient means enough, without claiming it is the only way.', 'A conditional guarantee is stronger than likelihood. The other condition must be true whenever the sufficient condition is true.', 'Sufficient means enough. Once it is true, the rule guarantees the necessary condition.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'Which condition belongs on the left side of this arrow?', options: ['The necessary condition.', 'The sufficient condition.', 'Whichever condition appears first in the rule.'], correct: 1, feedback: ['The necessary condition is the one on the right: what must be true. Which role does the condition on the left play?', 'A is the sufficient condition. If A is true, B must be true.', 'Sentence position can change. Place the sufficient condition on the left even if it appears last in the rule.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'What does the condition on the right side represent?', options: ['A fact that has already happened.', 'A condition that guarantees A.', 'A requirement that must hold whenever A holds.'], correct: 2, feedback: ['The arrow alone does not tell us that B is actually true. It tells us B must be true if A is true.', 'This reverses the arrow. A guarantees B; the rule does not say B guarantees A.', 'B is necessary for A. A cannot be true while B is false.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'How do you read this arrow?', options: ['If A is true, B must be true.', 'If B is true, A must be true.', 'A happens first and causes B to happen.'], correct: 0, feedback: ['Read from left to right. The truth of A guarantees the truth of B.', 'That reads against the arrow. B might be true without A being true.', 'The arrow gives a guarantee, not a timeline or a cause. A and B may be true at the same time.'], conditions: ['A', 'B'] },
  { rule: 'If a painting is in the permanent collection, it has an inventory number.', prompt: 'The sufficient condition is the one that is enough: when it is true, the other condition must be true. It does not have to cause the other condition or happen first. Which complete condition is sufficient here?', options: ['The painting has an inventory number.', 'The painting is in the permanent collection.', 'The word “if.”'], correct: 1, feedback: ['An inventory number is what the rule says a painting must have. That makes it the necessary condition. Look for the condition that is enough to prove it.', 'Being in the permanent collection is enough to prove an inventory number. Sufficient describes that logical role, not a cause or an earlier event.', 'If is an indicator, not a condition. Look for the complete idea it introduces.'], conditions: ['Painting is in the permanent collection', 'Painting has an inventory number'] },
  { rule: 'If a book is on the reserved shelf, it has a reservation card.', prompt: 'The necessary condition is what must be true when the sufficient condition holds. Which condition is necessary here?', options: ['The book has a reservation card.', 'The book is on the reserved shelf.', 'Someone places the book on the shelf later.'], correct: 0, feedback: ['The reservation card is necessary. A book on that shelf must have one. Necessary here does not mean an event that happens later.', 'Being on the reserved shelf is what if introduces, so it is the condition that is enough. Look for what the rule says a book on that shelf must have.', 'The rule says nothing about a later action. Look for what the rule says every book on the reserved shelf already has.'], conditions: ['Book is on the reserved shelf', 'Book has a reservation card'] },
  { rule: 'If a parcel is marked fragile, it is packed with padding.', prompt: 'Which complete condition goes on the left?', options: ['If.', 'The parcel is packed with padding.', 'The parcel is marked fragile.'], correct: 2, feedback: ['If helps identify the condition, but is not itself a condition. Write the complete idea it introduces.', 'Padding is required for a parcel marked fragile, so it goes on the right.', 'Being marked fragile guarantees padding under this rule. That complete condition goes on the left.'], conditions: ['Parcel is marked fragile', 'Parcel is packed with padding'] },
  { rule: 'If an application is approved, it has a reference number.', prompt: 'Which complete condition goes on the right?', options: ['The application is approved.', 'The application has a reference number.', 'The word “if.”'], correct: 1, feedback: ['Approval is what if introduces. That makes it the condition that is enough, and the right side holds what it requires.', 'Having a reference number is required for an approved application. It goes on the right.', 'If is an indicator, not a condition. Put a complete idea beside the arrow.'], conditions: ['Application is approved', 'Application has a reference number'] },
  { rule: 'A visitor receives a badge if the visitor signs in.', prompt: 'Which diagram keeps this rule?', options: ['Visitor receives a badge → Visitor signs in', 'Visitor signs in → Visitor receives a badge', 'Both directions are guaranteed.'], correct: 1, feedback: ['This reverses the guarantee. The rule gives a badge to someone who signs in, not a sign-in to everyone with a badge.', 'If introduces signing in, even at the end of the rule. Signing in is sufficient and goes left.', 'The rule guarantees only one direction. It does not exclude a visitor who receives a badge another way.'], conditions: ['Visitor signs in', 'Visitor receives a badge'] },
  { rule: 'If a member books a room, the member must have an active account.', prompt: 'Which word identifies the sufficient condition here?', options: ['If.', 'Must.', 'Both words identify the sufficient condition.'], correct: 0, feedback: ['If introduces the sufficient condition: the member books a room. Must expresses the requirement that follows from it.', 'Must tells us what is required: having an active account. Look for the word that introduces the condition that is enough.', 'The two words have different jobs. Only one of them introduces what is enough; the other marks what is required.'], conditions: ['Member books a room', 'Member has an active account'] },
  { rule: 'Every volunteer wearing a green badge must have completed training.', prompt: 'Which word acts as the sufficient-condition indicator?', options: ['Must.', 'Wearing.', 'Every.'], correct: 2, feedback: ['Must marks what is required: completed training. Look for the word that introduces the group the rule covers.', 'Wearing is part of the condition itself: it describes which volunteers the rule covers. An indicator is the word that tells you the rule applies to that whole group.', 'Every covers all volunteers wearing a green badge. That qualified group is sufficient to prove the training that must have been completed.'], conditions: ['Volunteer wears a green badge', 'Volunteer has completed training'] },
  { rule: 'Every parcel weighing more than ten kilograms has a handling label.', prompt: 'Which complete condition belongs on the left?', options: ['The item is a parcel.', 'The item is a parcel weighing more than ten kilograms.', 'The item has a handling label.'], correct: 1, feedback: ['Parcel alone drops the weight restriction. The rule does not promise a handling label for every parcel.', 'Keep the weight restriction. The rule guarantees a handling label for every parcel weighing more than ten kilograms.', 'Having a handling label is the required condition, so it goes on the right.'], conditions: ['Parcel weighs more than ten kilograms', 'Parcel has a handling label'] },
  { rule: 'A document is archived only if it has a catalogue number.', prompt: 'Which indicator introduces the requirement?', options: ['Only if.', 'If, taken on its own.', 'Archived.'], correct: 0, feedback: ['Read only if as one phrase. It identifies having a catalogue number as necessary for being archived.', 'If on its own would introduce what is enough. Here if does not stand alone. Read it together with the word right before it.', 'Archived is part of a condition: the document is archived. It is not an indicator. Look for the phrase that tells you what archiving requires.'], conditions: ['Document is archived', 'Document has a catalogue number'] },
  { rule: 'A researcher enters the reading room only if the researcher has a visitor permit.', prompt: 'Which diagram matches this rule?', options: ['Has a visitor permit → Enters the reading room', 'Only if → Has a visitor permit', 'Enters the reading room → Has a visitor permit'], correct: 2, feedback: ['This arrow starts from having a permit. Could a researcher have a permit and still never enter the reading room? If so, the permit is not enough to prove entry.', 'Only if is an indicator, not a condition. Put the complete ideas on the two sides of the arrow.', 'Entering the reading room requires a visitor permit. Entry goes left; having the required permit goes right.'], conditions: ['Researcher enters the reading room', 'Researcher has a visitor permit'] },
  { rule: 'Filing a claim requires a signed form.', prompt: 'What is the necessary condition?', options: ['Filing a claim.', 'Having a signed form.', 'Having any form, even an unsigned one.'], correct: 1, feedback: ['Filing is what has the requirement. Ask what filing requires: a signed form.', 'A signed form is required for filing a claim. Having one alone does not prove that someone files a claim.', 'Signed is part of the requirement. Dropping it would wrongly include an unsigned form.'], conditions: ['Person files a claim', 'Person has a signed form'] },
  { rule: 'Every completed registration requires a paid deposit.', prompt: 'Which word identifies the necessary condition?', options: ['Every.', 'Paid.', 'Requires.'], correct: 2, feedback: ['Every introduces the group the rule covers: completed registrations. That is the sufficient side. Look for the word that tells you what each one must have.', 'Paid limits which deposit counts. It is part of the condition, not the word expressing the requirement.', 'Requires identifies a paid deposit as necessary. Every completed registration must have one, but a paid deposit alone does not prove completion.'], conditions: ['Registration is complete', 'Registration has a paid deposit'] },
];

/**
 * Spot the condition saves answers by position. Order 1 put the concept and
 * indicator questions first and the rule-vs-fact questions last; order 2 puts
 * the rule-vs-fact questions first. Map each current position to its order 1
 * position so earlier answers stay with the question they answered.
 */
const FOUNDATION_ORDER = 2;
function foundationLegacyOrder(conceptCount: number, ruleCount: number): Record<number, number[]> {
  return { 1: [...Array.from({ length: ruleCount }, (_, index) => conceptCount + index), ...Array.from({ length: conceptCount }, (_, index) => index)] };
}

function FoundationPractice() {
  const anchor = sections(reference(1).props.children).find(child => child.type === ReferenceQuestion);
  if (!anchor) throw new Error('Missing approved raffle retrieval question');
  const fresh = sections(Fundamentals().props.children).find(section => section.props.title === 'Enough does not mean the only way');
  if (!fresh) throw new Error('Missing approved fresh sufficient-condition check');
  const freshContent = Children.toArray(fresh.props.children);
  const freshCheck = freshContent[freshContent.length - 1];
  if (!isValidElement<DrillOneQuestion>(freshCheck)) throw new Error('Missing approved delivery question');
  const anchorQuestion = anchor as ReactElement<DrillOneQuestion>;
  const questions: DrillOneQuestion[] = [
    { ...anchorQuestion.props, rule: 'If you win the raffle, you get a bicycle.' },
    ...freshCases.flatMap(item => item.questions.map(question => ({ ...question, rule: item.rule }))),
    { ...freshCheck.props, rule: 'Every delivery marked collected has a pickup receipt.', prompt: 'What is sufficient here?' },
    { rule: 'If you win the raffle, you get a bicycle.', prompt: 'Someone claims that getting a bicycle proves you won the raffle. Which possible case fits our rule but disproves that claim?', options: ['You win and get a bicycle.', 'You do not win, but get a bicycle as a gift.', 'You win and never get a bicycle.'], correct: 1, feedback: ['This fits both the rule and the claim, so it cannot disprove the claim. We need a case where the rule holds but the claim does not.', 'The rule promises a bicycle to a winner. It does not exclude a bicycle received as a gift without winning, so this case fits the rule and disproves the claim.', 'Winning without getting a bicycle breaks the original rule. We need a case that keeps the rule true.'] },
  ];
  const conditions: Array<[string, string]> = [
    ['You win the raffle', 'You get a bicycle'],
    ['It rains on Saturday', 'The market moves into the town hall'],
    ['It rains on Saturday', 'The market moves into the town hall'],
    ['A student goes on the museum trip', 'That student has a signed permission slip'],
    ['The café runs out of bread', 'The café closes early'],
    ['A delivery is marked collected', 'That delivery has a pickup receipt'],
    ['You win the raffle', 'You get a bicycle'],
  ];
  const ruleAndFact = questions.map((question, index) => ({ ...question, conditions: conditions[index] }));
  // Order 2: rule-vs-fact questions, then the five concept checks, then indicators.
  const foundationPracticeQuestions = [...ruleAndFact, ...foundationConceptQuestions];
  return <DrillOneExperience key={foundationPracticeQuestions.length} questions={foundationPracticeQuestions} order={FOUNDATION_ORDER} legacyOrder={foundationLegacyOrder(foundationConceptQuestions.length, ruleAndFact.length)}/>;
}

function PermissionBoundary() {
  const boundary = sections(conditionalReferenceContent().props.children).find(section => section.props['data-reference-boundary'] !== undefined);
  if (!boundary) throw new Error('Missing approved permission and instruction boundary');
  return <NoteSection title="Keep permission and instructions distinct"><p>A conditional can give permission or an instruction. Keep that strength instead of turning it into a report of what someone did.</p>{Children.toArray(boundary.props.children).slice(3)}</NoteSection>;
}

function CompatibleCasesRecap() {
  return <NoteSection title="Three combinations fit. One breaks the rule.">
    <blockquote>If you win the raffle, you get a bicycle.</blockquote>
    <p>The rule requires a bicycle when you win. Let's compare all four possible combinations. These are possible cases, not a claim that any of them happened.</p>
    <table className="co-combination-table ct-compare">
      <caption>Possible cases under the raffle rule</caption>
      <thead><tr><th scope="col">Win the raffle?</th><th scope="col">Get a bicycle?</th><th scope="col">Fits the rule?</th></tr></thead>
      <tbody>
        <tr><td>Yes</td><td>Yes</td><td>Yes. The required result is present.</td></tr>
        <tr><td>No</td><td>Yes</td><td>Yes. The rule allows a bicycle without a win.</td></tr>
        <tr><td>No</td><td>No</td><td>Yes. With no win, the rule settles nothing about a bicycle.</td></tr>
        <tr><td>Yes</td><td>No</td><td><strong>No. This is the single violation.</strong></td></tr>
      </tbody>
    </table>
    <p>A conditional is broken when its sufficient condition is present and its necessary condition is absent. That's why no bicycle rules out a win: a winner without a bicycle would be the forbidden combination.</p>
  </NoteSection>;
}

function WholeConditionNegation() {
  return <NoteSection title="Negate the whole condition">
    <p>To negate a condition, describe what makes <strong>that complete claim false</strong>. Adding “not” to one convenient word can change the claim.</p>
    <ReferenceQuestion prompt="A form is signed and dated. What makes that complete condition false?" options={['It is missing a signature, a date, or both.', 'It has neither a signature nor a date.']} correct={0} feedback={['One missing part is enough. Not both does not require both to be missing.', 'That is one way to fail, but not the only way. A signed form with no date also fails the complete condition.']}/>
    <ReferenceQuestion prompt="Every covered duty is superseded. What is the negation?" options={['No covered duty is superseded.', 'At least one covered duty is not superseded.']} correct={1} feedback={['None is stronger than needed. One duty that is not superseded already makes every false.', 'Not every means at least one exception. It does not mean none.']}/>
    <ReferenceQuestion prompt="An evaluator with current authorization signs the form. What makes this false?" options={['One evaluator does not sign.', 'No evaluator with current authorization signs.']} correct={1} feedback={['Another authorized evaluator might sign. One person failing does not rule out a qualifying signer.', 'Keep the qualification. The negation rules out every signer who meets it, not just one evaluator.']}/>
    <p><strong>Numbers need the same care.</strong> If a condition means “at least three reviewers request revision,” its negation is “fewer than three do.” If it means “exactly three,” the negation is “not exactly three.” Never silently change the numerical meaning.</p>
    <p>When a condition is long, define a symbol for the <strong>whole condition</strong> and write NOT with that symbol. Then explain what its falsity means in ordinary words.</p>
  </NoteSection>;
}


function Content({ id }: { id: string }) {
  switch (id) {
    case 'meaning': return <ReferenceBody number={1} omitTransition/>;
    case 'sufficient': return <ReferenceBody number={2} omitTransition/>;
    case 'necessary': return <ReferenceBody number={4} omitTransition/>;
    case 'must-arrow': return <MustArrowNote/>;
    case 'sufficient-words': return <><IndicatorNote group="group-1"/><CompleteConditionNote/></>;
    case 'necessary-words': return <><IndicatorNote group="group-2"/><PermissionBoundary/></>;
    case 'whole-meaning': return <WholeMeaningNote/>;
    case 'missing-requirement': return <MissingRequirementNote/>;
    case 'contrapositive': return <><ContrapositiveNote/><ReferenceBody number={9}/><WholeConditionNegation/><details className="co-practical-note"><summary>Practical questions about diagramming</summary><ReferenceBody number={10} omitTransition/></details><NoteSection title="Two possible rooms, one limit"><NegativeCaseLab/></NoteSection><CompatibleCasesRecap/></>;
    case 'foundation-practice': return <FoundationPractice/>;
    case 'sufficient-practice': return <StagedReasoningDrill mode="sufficient"/>;
    case 'mixed-practice': return <StagedReasoningDrill mode="mixed"/>;
    case 'contrapositive-practice': return <StagedReasoningDrill mode="contrapositive"/>;
    default: throw new Error(`Unknown opening course content: ${id}`);
  }
}

/** Article body only. Course routes own titles, navigation and completion. */
export function OpeningCourseContent({ id }: { id: string }) {
  return <div className={id === 'foundation-practice' ? 'opening-course-content' : 'co-opening cr-sequence opening-course-content'}><Content key={id} id={id}/></div>;
}
