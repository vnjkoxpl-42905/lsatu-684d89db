import { ContrapositiveLecture, DoubleNegativeDemo, FlipAndNegateDemo, Neg, PopQuizTitle, PulseWord, PunchWord, RuleDrill, ThreeMoves } from './ContrapositiveVisuals';
import { Children, cloneElement, Fragment, isValidElement, useContext, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Fundamentals, GroupLessons } from './ConditionalOpeningLesson';
import { conditionalReferenceContent, ReferenceQuestion, RuleDiagram, TargetReader, targetExamples, WordFamily } from './ConditionalReferenceSequence';
import { StagedReasoningDrill } from './StagedReasoningDrill';
import { DrillOneExperience, type DrillOneQuestion } from './DrillOneExperience';
import { Link } from 'react-router-dom';
import { CourseFlashcardUrl, flashcardUrl } from './FlashcardTools';
import './must-arrow-note.css';
import './missing-requirement-note.css';
import { MustArrowPractice } from './MustArrowPractice';
import { SufficientConditionFilm } from './SufficientConditionFilm';
import { AndOrLesson } from './AndOrLessons';

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

function groupSections(group: 'group-1' | 'group-2', integratedOverview = false) {
  return sections(GroupLessons({ id: group, integratedOverview }).props.children);
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
  const body = omitTransition ? children.slice(0, -1).map(child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    const retained = Children.toArray(child.props.children).filter(part => !isValidElement<{ className?: string }>(part) || part.props.className !== 'cr-sufficient-bridge');
    return cloneElement(child, undefined, retained);
  }) : children;
  return <section className={`co-section cr-course-section ${source.props.dark ? 'cr-dark' : ''}`} data-reference-source={number}>
    <div className="co-section-heading"><h2>{source.props.title}</h2></div>
    <div className="cr-step-body">{body}</div>
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
    <p>Find the indicator, select the complete condition, place it beside the arrow and check that your diagram keeps the rule's meaning.</p>
  </NoteSection>;
}

function MissingRequirementNote({ integrated = false }: { integrated?: boolean }) {
  const [attempted, setAttempted] = useState(false);
  return <>
    <NoteSection title="What if someone is not a student?">
      <p>Return to the law-school rule:</p>
      <blockquote>If you are enrolled in law school, then you are a student.</blockquote>
      <p>Now you learn that Maya is <strong>not a student</strong>. Think about what enrollment would require before choosing.</p>
      <ReferenceQuestion prompt="Could Maya be enrolled in law school while this rule holds?" options={['Yes, she could still be enrolled.', 'No, she cannot be enrolled.', 'The rule leaves her enrollment unknown.']} correct={1} onAttempt={choice => setAttempted(choice !== null)} feedback={['Enrollment would require Maya to be a student. That conflicts with the fact that she is not a student.', 'If Maya were enrolled, she would have to be a student. She is not a student, so she cannot be enrolled under this rule.', 'This fact settles enrollment. An enrolled person who is not a student would break the rule.']}/>
      {attempted && <div className="cr-discovery-reasoning">
        <h3>The missing requirement rules out enrollment</h3>
        {!integrated && <p>That is the <strong>contrapositive</strong>: <strong>if the necessary condition is false, the sufficient condition must be false too.</strong></p>}
        <p>Being a student is required for enrollment. When that requirement is missing, enrollment is ruled out. We have not added a new rule; this follows from the rule we already had.</p>
        <figure className="cr-contrapositive-pair">
          <figcaption>Two ways to read the same rule</figcaption>
          <p><strong>Original</strong></p><RuleDiagram left="Enrolled in law school" right="Is a student"/>
          <p><strong>Contrapositive</strong></p><RuleDiagram left="Is not a student" right="Not enrolled in law school"/>
        </figure>
        <p>This is different from simply reversing the arrow. <strong>Being a student does not prove enrollment.</strong> A student could be studying history instead. The contrapositive starts with <strong>not being a student</strong>.</p>
      </div>}
    </NoteSection>
    {attempted && !integrated && <ReferenceBody number={7} omitTransition/>}
  </>;
}

function FourRules() {
  return <section className="co-section"><div className="co-section-heading"><PopQuizTitle/></div><RuleDrill/></section>;
}

function ContrapositiveNote() {
  return <>
    <NoteSection title="What a contrapositive is">
      <p>If the sufficient condition happens, the necessary condition <strong>must</strong> happen. The left side of the arrow guarantees the right side.</p>
      <p>The contrapositive is what you know when the right side of the arrow goes missing:</p>
      <p className="ct-definition"><strong>If the <span className="ct-hl">necessary condition</span> is absent, the <span className="ct-hl" data-tone="amber">sufficient condition</span> is absent too.</strong></p>
      <p>Take this rule: <strong>If the ceiling light is on, then the power must be on.</strong> With no power, the light can't be on. No power, no light. As a rule: <strong>If the power is off, then the ceiling light must be off.</strong></p>
    </NoteSection>
    <NoteSection title="You already knew this">
      <p>The contrapositive was inside the original rule the whole time, waiting for you to spot it. That's why the two are <PulseWord>logically equivalent</PulseWord>: if one is true, the other is true, and you can use either. They're <PunchWord>interchangeable!</PunchWord></p>
    </NoteSection>
    <NoteSection title="Watch the lesson">
      <ContrapositiveLecture/>
    </NoteSection>
    <NoteSection title="How to write it">
      <p>Write the rule with an arrow: <strong>Light → Power</strong>. The sufficient condition goes on the left side of the arrow. The necessary condition goes on the right side of the arrow.</p>
      <p>The contrapositive is <strong><Neg>Power</Neg> → <Neg>Light</Neg></strong>. A line through an idea means “not.” You get there in two steps:</p>
      <ol className="ct-moves">
        <li><strong>Step 1: Flip the sides.</strong> The right side goes on the left, and the left side goes on the right.</li>
        <li><strong>Step 2: Negate both.</strong> Put “not” on each idea. If an idea already has a “not,” the two cancel: a double negative turns positive.</li>
      </ol>
      <FlipAndNegateDemo/>
      <p>Same two steps when a side already has a “not.” Watch what happens to it:</p>
      <DoubleNegativeDemo/>
    </NoteSection>
    <NoteSection title="What it is not">
      <p>Two look-alikes fail. Wrong answer choices use them on purpose.</p>
      <ThreeMoves/>
    </NoteSection>
    <NoteSection title="Read it, don't always write it">
      <p>You can read a rule backward without writing anything: go from right to left and put a “not” on everything. Write the contrapositive when it helps you see the rule or connect it to another rule.</p>
    </NoteSection>
  </>;
}

function IndicatorNote({ group, integrated = false }: { group: 'group-1' | 'group-2'; integrated?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [opened, setOpened] = useState<number[]>([0]);
  const [focusPanel, setFocusPanel] = useState(false);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const id = useId();
  const content = groupSections(group, integrated);
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
      ? <p>That was the last of the seven indicators. Choose any of them to read it again, or continue with the complete-condition practice below.</p>
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
    { prompt: "It's Friday. You've read this rule and nothing else. Where will the market be on Saturday?", options: ['In the town hall.', 'Outdoors, as usual.', "The rule alone doesn't settle it."], correct: 2, feedback: ["Check whether you have been told that it will rain on Saturday. A rule about rain is not a weather forecast.", "Nothing says Saturday will be dry. Check whether the rule tells you what happens when it does not rain.", "We have no weather fact for Saturday. The rule puts the market in the town hall if it rains, but does not tell us whether that condition will be met."] },
    { prompt: "Saturday arrives, and it's raining. Now where is the market?", options: ['In the town hall.', 'Still not settled.'], correct: 0, feedback: ["It is raining on Saturday, exactly the case the rule covers. The rule says the market moves into the town hall in that case, so its location is settled.", "Compare the new fact with the full condition: rain on Saturday. Is anything still missing before you can apply the rule?"] },
  ] },
  { rule: 'Every student going on the museum trip has a signed permission slip.', questions: [
    { prompt: 'Which description matches this rule?', options: ['Going on the trip is enough to know a student has a signed slip.', 'Having a signed slip is enough to know a student is going on the trip.', 'Each one is enough to know the other.'], correct: 0, feedback: ["Every student on the museum trip has a signed permission slip. Knowing a student is going therefore proves they have the slip. Having a slip alone does not prove they are going.", "Start with a student who has a signed slip. Could that student stay at school without breaking the rule about students going on the trip?", "To guarantee both directions, the rule would also have to cover every student with a signed slip. Does it say that?"] },
  ] },
  { rule: 'If the café runs out of bread, it closes early.', questions: [
    { prompt: 'Today the café did not run out of bread. Did it close early?', options: ['No. It stayed open until the usual time.', 'Yes. It closed early.', 'Not settled. It could stay open or close early for another reason.'], correct: 2, feedback: ["The rule names one reason for closing early. Does it say running out of bread is the only possible reason?", "The café did not run out of bread. What fact would support your claim that it closed early anyway?", "The café did not run out of bread, so this rule gives us no result for today. Staying open fits; closing early for another reason also fits."] },
  ] },
];

// Recall the definitions, apply the arrow, then distinguish indicators from conditions.
const foundationConceptQuestions: DrillOneQuestion[] = [
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a necessary condition?', options: ['A requirement that must be met, but might not be enough on its own.', 'Something that always guarantees the other condition.', 'Something that usually happens afterward.'], correct: 0, feedback: ["A necessary condition is required whenever the condition that needs it is true. Meeting the requirement might not be enough to prove that other condition.", "You chose a guarantee. Ask whether being required, by itself, makes a condition enough to prove the condition that requires it.", "A requirement need not happen later. Ask what must be true whenever the condition that requires it is true."] },
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a sufficient condition?', options: ['The only possible way for another condition to be true.', 'Something that makes another condition more likely.', 'Something that guarantees another condition when it is true.'], correct: 2, feedback: ["Enough does not mean the only way. Could a condition guarantee a result even if another condition could also guarantee it?", "More likely still leaves room for the result to be false. Is that strong enough for a sufficient condition?", "A sufficient condition is enough to guarantee another condition. Whenever it is true, the guaranteed condition must also be true. It need not be the only way."] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'Which condition belongs on the left side of this arrow?', options: ['The necessary condition.', 'The sufficient condition.', 'Whichever condition appears first in the rule.'], correct: 1, feedback: ["In A → B, B is required whenever A is true. Does that put the requirement on the left or the right?", "A goes on the left because A is enough to guarantee B. That makes A the sufficient condition.", "The English sentence can put its conditions in either order. What matters in A → B is which condition guarantees which."] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'What does the condition on the right side represent?', options: ['A fact that has already happened.', 'A condition that guarantees A.', 'A requirement that must hold whenever A holds.'], correct: 2, feedback: ["A → B does not assert that either condition happened. Look for what it requires if A is true.", "This choice starts with B and tries to prove A. Which direction does the displayed arrow guarantee?", "B is the requirement on the right. If A is true, B must be true too, so A cannot be true while B is false."] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'How do you read this arrow?', options: ['If A is true, B must be true.', 'If B is true, A must be true.', 'A happens first and causes B to happen.'], correct: 0, feedback: ["A → B means that if A is true, B must be true. The arrow gives that guarantee without saying that A causes B or happens first.", "This reading starts from B. Compare that direction with where the arrow starts and points.", "The arrow says nothing about causes or which event happens first. Look for the answer that states only what A guarantees."], conditions: ['A', 'B'] },
  { rule: 'If a painting is in the permanent collection, it has an inventory number.', prompt: 'The sufficient condition is the one that is enough: when it is true, the other condition must be true. It does not have to cause the other condition or happen first. Which complete condition is sufficient here?', options: ['The painting has an inventory number.', 'The painting is in the permanent collection.', 'The word “if.”'], correct: 1, feedback: ["The inventory number is what the painting is guaranteed to have. Ask which complete condition is enough to reach that result.", "Take a painting in the permanent collection. The rule says it has an inventory number. Being in the permanent collection is therefore sufficient to prove the number, regardless of timing or cause.", "The word if points to a condition. What complete idea follows it in this sentence?"], conditions: ['Painting is in the permanent collection', 'Painting has an inventory number'] },
  { rule: 'If a book is on the reserved shelf, it has a reservation card.', prompt: 'The necessary condition is what must be true when the sufficient condition holds. Which condition is necessary here?', options: ['The book has a reservation card.', 'The book is on the reserved shelf.', 'Someone places the book on the shelf later.'], correct: 0, feedback: ["A book on the reserved shelf must have a reservation card. Having that card is therefore necessary for being on the shelf. The rule does not say the card alone puts a book there.", "Start with a book on the reserved shelf. What does the rule require that book to have?", "The sentence gives no later event. Check what it requires of a book while that book is on the reserved shelf."], conditions: ['Book is on the reserved shelf', 'Book has a reservation card'] },
  { rule: 'If a parcel is marked fragile, it is packed with padding.', prompt: 'Which complete condition goes on the left?', options: ['If.', 'The parcel is packed with padding.', 'The parcel is marked fragile.'], correct: 2, feedback: ["If is a word that identifies a condition. The diagram needs the complete idea the word introduces.", "Packed with padding is the result the rule guarantees. Which complete condition is enough to guarantee that result?", "A parcel marked fragile must be packed with padding. Being marked fragile is the sufficient condition, so that complete idea goes on the left."], conditions: ['Parcel is marked fragile', 'Parcel is packed with padding'] },
  { rule: 'If an application is approved, it has a reference number.', prompt: 'Which complete condition goes on the right?', options: ['The application is approved.', 'The application has a reference number.', 'The word “if.”'], correct: 1, feedback: ["Approval is the condition that guarantees something else here. The right side needs what every approved application must have.", "An approved application must have a reference number. Having a reference number is the required condition, so it goes on the right.", "If identifies a condition, but is not itself a condition. What complete idea is required whenever an application is approved?"], conditions: ['Application is approved', 'Application has a reference number'] },
  { rule: 'A visitor receives a badge if the visitor signs in.', prompt: 'Which diagram keeps this rule?', options: ['Visitor receives a badge → Visitor signs in', 'Visitor signs in → Visitor receives a badge', 'Both directions are guaranteed.'], correct: 1, feedback: ["This diagram would make a badge prove that the visitor signed in. Does the sentence rule out someone receiving a badge another way?", "The word if introduces the visitor signing in, even though that comes last in the sentence. Signing in guarantees receiving a badge, so signing in goes left and receiving a badge goes right.", "To guarantee both directions, a badge would also have to prove that the visitor signed in. Check whether the sentence gives that extra guarantee."], conditions: ['Visitor signs in', 'Visitor receives a badge'] },
  { rule: 'If a member books a room, the member must have an active account.', prompt: 'Which word identifies the sufficient condition here?', options: ['If.', 'Must.', 'Both words identify the sufficient condition.'], correct: 0, feedback: ["If introduces the member booking a room, which is enough to require an active account. Must identifies what that member is required to have.", "Must marks a requirement. Look for the word introducing the situation in which that requirement applies.", "One word introduces booking a room; the other marks the active-account requirement. Do those words identify the same role?"], conditions: ['Member books a room', 'Member has an active account'] },
  { rule: 'Every volunteer wearing a green badge must have completed training.', prompt: 'Which word acts as the sufficient-condition indicator?', options: ['Must.', 'Wearing.', 'Every.'], correct: 2, feedback: ["Must marks the training requirement. Which word tells you that the rule covers the whole group of volunteers wearing green badges?", "Wearing helps describe which volunteers are covered. Look for the word applying the rule to all of those volunteers.", "Every applies the rule to all volunteers wearing a green badge. For any volunteer in that group, completed training is guaranteed. That is why every identifies the sufficient condition."], conditions: ['Volunteer wears a green badge', 'Volunteer has completed training'] },
  { rule: 'Every parcel weighing more than ten kilograms has a handling label.', prompt: 'Which complete condition belongs on the left?', options: ['The item is a parcel.', 'The item is a parcel weighing more than ten kilograms.', 'The item has a handling label.'], correct: 1, feedback: ["This would include parcels weighing ten kilograms or less. Does the rule guarantee a handling label for those parcels?", "Keep weighing more than ten kilograms with parcel. Every parcel meeting that full condition has a handling label, so the complete condition belongs on the left.", "A handling label is what the rule guarantees for the covered parcels. Look for the full description of the parcels that guarantee it."], conditions: ['Parcel weighs more than ten kilograms', 'Parcel has a handling label'] },
  { rule: 'A document is archived only if it has a catalogue number.', prompt: 'Which indicator introduces the requirement?', options: ['Only if.', 'If, taken on its own.', 'Archived.'], correct: 0, feedback: ["Only if identifies the requirement: the document has a catalogue number. A document cannot be archived without one, so read only if together as one indicator.", "The word immediately before if changes its meaning. Read the two words together before deciding which condition they introduce.", "Archived describes what happens to the document. Look for the phrase that tells you what archiving requires."], conditions: ['Document is archived', 'Document has a catalogue number'] },
  { rule: 'A researcher enters the reading room only if the researcher has a visitor permit.', prompt: 'Which diagram matches this rule?', options: ['Has a visitor permit → Enters the reading room', 'Only if → Has a visitor permit', 'Enters the reading room → Has a visitor permit'], correct: 2, feedback: ["This diagram makes a permit enough to prove entry. Could a researcher have a permit and never enter without breaking the sentence?", "Only if identifies a condition, but is not itself one. Both sides of the diagram need complete ideas about the researcher.", "A researcher cannot enter the reading room without a visitor permit. Entry therefore goes left and having a visitor permit goes right. The permit alone does not prove entry."], conditions: ['Researcher enters the reading room', 'Researcher has a visitor permit'] },
  { rule: 'Filing a claim requires a signed form.', prompt: 'What is the necessary condition?', options: ['Filing a claim.', 'Having a signed form.', 'Having any form, even an unsigned one.'], correct: 1, feedback: ["Filing is the action with a requirement. Ask what must be available for someone to file.", "Filing a claim requires a signed form. Having that signed form is the necessary condition. Someone could have the form and never file, so the form alone is not enough.", "The rule requires more than a form. Which word in the sentence excludes an unsigned one?"], conditions: ['Person files a claim', 'Person has a signed form'] },
  { rule: 'Every completed registration requires a paid deposit.', prompt: 'Which word identifies the necessary condition?', options: ['Every.', 'Paid.', 'Requires.'], correct: 2, feedback: ["Every introduces completed registrations, the cases this rule covers. Look for the word saying what each completed registration must have.", "Paid tells you which kind of deposit counts. Which word makes that deposit a requirement?", "Requires identifies a paid deposit as necessary for a completed registration. Every completed registration must have one. A paid deposit alone does not prove the registration is complete."], conditions: ['Registration is complete', 'Registration has a paid deposit'] },
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
    { ...anchorQuestion.props, rule: 'If you win the raffle, you get a bicycle.', feedback: ["The sentence starts with a condition: if you win. Does it also report that the win actually happened?", "The rule tells you what follows from winning: you get a bicycle. It never says you actually win, so winning needs a separate fact."] },
    ...freshCases.flatMap(item => item.questions.map(question => ({ ...question, rule: item.rule }))),
    { ...freshCheck.props, rule: 'Every delivery marked collected has a pickup receipt.', prompt: 'What is sufficient here?', feedback: ["A delivery marked collected must have a pickup receipt. That label is enough to prove the receipt exists; a receipt alone does not prove the delivery is marked collected.", "The question asks what is enough to prove the receipt exists. You chose the receipt itself. Which delivery does the rule say must have one?"] },
    { rule: 'If you win the raffle, you get a bicycle.', prompt: 'Someone claims that getting a bicycle proves you won the raffle. Which possible case fits our rule but disproves that claim?', options: ['You win and get a bicycle.', 'You do not win, but get a bicycle as a gift.', 'You win and never get a bicycle.'], correct: 1, feedback: ["Winning and getting a bicycle fits the rule. But does that case challenge the claim that getting a bicycle proves a win?", "You get a bicycle as a gift without winning. That keeps the original rule true, since it only says what winners get. It disproves the added claim because you get a bicycle without a win.", "Check the original rule first: can someone win and receive no bicycle while that rule stays true?"] },
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

// The legacy translation note remains available, while its distinct teaching
// belongs beside the concept it develops in the main lesson sequence.
function WholeMeaningSections({ titles }: { titles: string[] }) {
  return <>{sections(WholeMeaningNote().props.children).filter(section => titles.includes(section.props.title ?? '')).map(section => cloneElement(section, { key: section.props.title, title: section.props.title?.replace(/^Check \d: /, '') }))}</>;
}

function IndicatorFlashcards({ group, from }: { group: 'group-1' | 'group-2'; from: 'sufficient' | 'necessary' }) {
  const url = useContext(CourseFlashcardUrl);
  if (!url) return null;
  return <Link className="oc-action" to={flashcardUrl(url, group, undefined, from)}>Go to flashcards</Link>;
}

function SufficientNote() {
  return <>
    <ReferenceBody number={2} omitTransition/>
    <IndicatorNote group="group-1" integrated/>
    {groupSection('group-1', 'condition-practice')}
    {groupSection('group-1', 'Keep the whole condition')}
    <CompleteConditionNote/>
    <IndicatorFlashcards group="group-1" from="sufficient"/>
  </>;
}

function NecessaryNote() {
  const scope = sections(WholeMeaningNote().props.children).find(section => section.props.title === 'Can, should and must keep their meaning');
  const onlyComparison = groupSection('group-2', 'Compare only with the only');
  const onlyCheck = Children.toArray(onlyComparison.props.children).find(child => isValidElement<{ prompt?: string }>(child) && child.props.prompt === 'Only registered guests receive wristbands. What follows from receiving a wristband?');
  return <>
    <ReferenceBody number={4} omitTransition/>
    <IndicatorNote group="group-2" integrated/>
    {groupSection('group-2', 'condition-practice')}
    {groupSection('group-2', 'Keep the whole condition')}
    <WholeMeaningSections titles={['Check 1: find the whole group, wherever it sits']}/>
    <NoteSection title="Only limits who receives a wristband">{onlyCheck}</NoteSection>
    {scope && <NoteSection title="Keep time limits and every part of the requirement">{Children.toArray(scope.props.children).slice(-1)}</NoteSection>}
    <PermissionBoundary/>
    <IndicatorFlashcards group="group-2" from="necessary"/>
  </>;
}

function CombinedContrapositiveNote() {
  const [openedLawSchoolExample, setOpenedLawSchoolExample] = useState(false);
  return <>
    <MissingRequirementNote integrated/>
    <ContrapositiveNote/>
    <details className="co-practical-note" onToggle={event => { if (event.currentTarget.open) setOpenedLawSchoolExample(true); }}>
      <summary>See the law-school example</summary>
      {openedLawSchoolExample && <SufficientConditionFilm ariaLabel="Law-school rule video examples"/>}
    </details>
    <FourRules/>
  </>;
}

function PermissionBoundary() {
  const boundary = sections(conditionalReferenceContent().props.children).find(section => section.props['data-reference-boundary'] !== undefined);
  if (!boundary) throw new Error('Missing approved permission and instruction boundary');
  return <NoteSection title="Keep permission and instructions distinct"><p>A conditional can give permission or an instruction. Keep that strength instead of turning it into a report of what someone did.</p>{Children.toArray(boundary.props.children).slice(3)}</NoteSection>;
}

function Content({ id, storageScope }: { id: string; storageScope?: string }) {
  switch (id) {
    case 'meaning': return <ReferenceBody number={1} omitTransition/>;
    case 'sufficient': return <SufficientNote/>;
    case 'necessary': return <NecessaryNote/>;
    case 'must-arrow': return <><MustArrowNote/><WholeMeaningSections titles={['Short symbols stand for complete conditions', 'Check 4: try the rule from the inside']}/></>;
    case 'sufficient-words': return <><IndicatorNote group="group-1"/><CompleteConditionNote/></>;
    case 'necessary-words': return <><IndicatorNote group="group-2"/><PermissionBoundary/></>;
    case 'whole-meaning': return <WholeMeaningNote/>;
    case 'missing-requirement': return <MissingRequirementNote/>;
    case 'contrapositive': return <CombinedContrapositiveNote/>;
    case 'and-or-both-or-either':
    case 'and-or-either-condition':
    case 'and-or-either-side':
    case 'and-or-negate-group': return <AndOrLesson id={id}/>;
    case 'foundation-practice': return <FoundationPractice/>;
    case 'sufficient-practice': return <StagedReasoningDrill storageScope={storageScope} mode="sufficient"/>;
    case 'mixed-practice': return <StagedReasoningDrill storageScope={storageScope} mode="mixed"/>;
    case 'contrapositive-practice': return <StagedReasoningDrill storageScope={storageScope} mode="contrapositive"/>;
    default: throw new Error(`Unknown opening course content: ${id}`);
  }
}

/** Article body only. Course routes own titles, navigation and completion. */
export function OpeningCourseContent({ id, storageScope }: { id: string; storageScope?: string }) {
  return <div className={id === 'foundation-practice' ? 'opening-course-content' : 'co-opening cr-sequence opening-course-content'}><Content key={`${storageScope ?? "legacy"}:${id}`} id={id} storageScope={storageScope}/></div>;
}
