import { Children, cloneElement, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Fundamentals, GroupLessons } from './ConditionalOpeningLesson';
import { conditionalReferenceContent, IntegratedItem, referencePracticeItems, ReferenceQuestion, RuleDiagram, TargetReader, targetExamples, WordFamily } from './ConditionalReferenceSequence';
import { CounterexampleLab, NegativeCaseLab } from './CounterexampleLab';
import { StagedReasoningDrill } from './StagedReasoningDrill';
import { PracticeTaskRunner } from './PracticeTaskRunner';
import { DrillOneExperience, type DrillOneQuestion } from './DrillOneExperience';
import { StudyDeck } from './StudyDeck';
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
  return <details className="co-practical-note"><summary>More expressions for the same relationship</summary>
    <p>Use the stated rule: anyone who borrows a locker has a key. These sentences preserve that connection. They do not say every person with a key borrows a locker.</p>
    {family}
  </details>;
}

// Only and only if both mark the requirement, from different places in the sentence.
function OnlyAndOnlyIf() {
  return <NoteSection title="Only and only if can mark the same requirement">
    <div className="cr-language-pair"><p><strong>Only</strong> [people with a key] borrow a locker.</p><p>A person borrows a locker <strong>only if</strong> [they have a key].</p><span>Only and only if identify the necessary condition here.</span></div>
    <p>Both sentences say locker borrowers have a key. In the first, only is at the beginning. In the second, only if is in the middle. Having a key is required in both, so it goes right. Read only if as the whole expression; the if inside it isn't doing the job if does on its own.</p>
    <ReferenceQuestion prompt="A person borrows a locker only if they have a key. Which condition goes on the right?" options={['Borrows a locker', 'Has a key']} correct={1} feedback={['Borrowing is what has the requirement. Ask what a locker borrower must have: a key. Borrowing goes left; having a key goes right.', 'Having a key is required for borrowing. Only if appears in the middle, but it still identifies the necessary condition.']}/>
  </NoteSection>;
}

function CompleteConditionNote() {
  return <>
    <NoteSection title="Keep the words that limit the rule">
      <p>Finding <strong>all</strong> or <strong>if</strong> is only the start. Now identify the complete sufficient condition: exactly who or what does this rule cover?</p>
      <blockquote>All <strong>registered guests</strong> receive a wristband.</blockquote>
      <p>All guests? No, <strong>registered guests</strong>. Leaving out registered would give wristbands to people the rule never covered.</p>
      <RuleDiagram left="Guest is registered" right="Guest receives a wristband"/>
    </NoteSection>
    <NoteSection title="Keep the condition together, wherever it appears">
      <blockquote>A report is reviewed <strong>if it is submitted before noon</strong>.</blockquote>
      <p>Ask <strong>“If what?”</strong> The report is submitted before noon. Keep the deadline with submitted, even though this condition comes last in the sentence.</p>
      <RuleDiagram left="Report submitted before noon" right="Report reviewed"/>
      <p>A report submitted at four does not meet that condition. This rule doesn't settle whether it gets reviewed.</p>
      <ReferenceQuestion prompt="Any applicant who submits late pays a fee. Which complete condition goes on the left?" options={['Applicant', 'Applicant submits late', 'Applicant pays a fee']} correct={1} feedback={['Applicant alone includes people who submit on time. Keep who submits late: that is the group this rule covers.', 'Applicant submits late keeps the restriction. The rule guarantees a fee for that applicant.', 'Paying a fee is what follows. The sufficient condition is that the applicant submits late.']}/>
    </NoteSection>
    <NoteSection title="Read the expression in its sentence">
      <p><strong>“We asked if the certificate was valid”</strong> reports what someone asked. It does not state that one condition guarantees another. A familiar word is a clue, not a rule by itself.</p>
      <blockquote><strong>The only people admitted</strong> are members.</blockquote>
      <p>The only what? People admitted. An admitted person must be a member, so <strong>Person admitted → Person is a member</strong>. Keep the whole expression together; the sentence does not promise admission to every member.</p>
      <ReferenceQuestion prompt="The only notebooks kept on this shelf are hardback. Which condition is sufficient?" options={['Notebook is hardback', 'Notebook is kept on this shelf', 'Notebook']} correct={1} feedback={['Being hardback does not guarantee a place on this shelf. The rule tells us about the notebooks kept here.', 'A notebook kept on this shelf must be hardback. Kept on this shelf is the complete sufficient condition.', 'Notebook alone would cover every notebook. Keep the restriction: kept on this shelf.']}/>
      <p>In the next drill, select the complete condition, place it beside the arrow and check that your diagram keeps the sentence's meaning.</p>
    </NoteSection>
  </>;
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
          <figcaption>Two ways to read the same relationship</figcaption>
          <p><strong>Original</strong></p><RuleDiagram left="Enrolled in law school" right="Is a student"/>
          <p><strong>Contrapositive</strong></p><RuleDiagram left="Is not a student" right="Not enrolled in law school"/>
        </figure>
        <p>This is different from simply reversing the arrow. <strong>Being a student does not establish enrollment.</strong> A student could be studying history instead. The contrapositive starts with <strong>not being a student</strong>.</p>
      </div>}
    </NoteSection>
    {attempted && <ReferenceBody number={7} omitTransition/>}
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
    <p className="co-word-guide">Work through all seven expressions. Each one does the same job in a different sentence, and each has its own trap to check. Use Next expression to go in order, or choose any expression to read it again.</p>
    <div className="co-word-tabs" role="group" aria-label="Choose an expression">{expressions.map((section, index) => <button type="button" key={section.props.title} aria-pressed={selected === index} aria-controls={`${id}-${index}`} onClick={() => choose(index)}>{names[index]}{opened.includes(index) && <><span aria-hidden="true"> ✓</span><span className="co-sr-only">, opened</span></>}</button>)}</div>
    <p className="co-kicker" role="status">Expression {selected + 1} of {expressions.length} · {opened.length} of {expressions.length} opened</p>
    {expressions.map((section, index) => <div key={section.props.title} id={`${id}-${index}`} hidden={selected !== index} tabIndex={-1} ref={element => { panels.current[index] = element; }}>{section}</div>)}
    <div className="co-choices">{last
      ? <p>That was the last of the seven expressions. Choose any of them to read it again, or recall them with the cards below.</p>
      : <button type="button" className="co-primary" onClick={() => choose(selected + 1, true)}>Next expression: {names[selected + 1]}</button>}</div>
    {group === 'group-2' && <OnlyAndOnlyIf/>}
    <FamilySupplement group={group}/>
    <NoteSection title="Recall the expressions"><p>Once you've read the seven examples, use these cards to recall them. Explain the relationship before turning each card, then compare the complete ideas and the direction with your answer.</p><StudyDeck group={group}/></NoteSection>
  </>;
}

// Teach placement and reading through the familiar relationship, then require a decision.
function MustArrowNote() {
  return <section className="co-section cr-course-section ma-lesson" data-reference-source={8}>
    <div className="co-section-heading"><h2>Left: sufficient. Right: necessary.</h2></div>
    <div className="cr-step-body">
      <p className="ma-lead">The arrow points from the <strong>sufficient condition</strong> to the <strong>necessary condition</strong>.</p>
      <figure className="ma-example" aria-label="If you are enrolled in law school, you must be a student">
        <figcaption className="ma-read-instruction">Read left to right: <strong>“If the left side is true, the right side must be true.”</strong></figcaption>
        <div className="ma-relationship">
          <div className="ma-condition"><span className="ma-side"><small>Left side</small>Sufficient condition</span><strong>You are enrolled in law school</strong><span className="ma-meaning">Enough to guarantee the right side</span></div>
          <div className="ma-arrow" aria-hidden="true"><span>must</span><svg viewBox="0 0 100 32" fill="none"><path d="M3 16H93M77 3L94 16L77 29" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div className="ma-condition"><span className="ma-side"><small>Right side</small>Necessary condition</span><strong>You are a student</strong><span className="ma-meaning">Required when the left side is true</span></div>
        </div>
      </figure>
      <p>Being enrolled in law school is <strong>enough</strong> to know you are a student. That is why enrollment goes on the <strong>left</strong>. Being a student is <strong>required</strong>, so it goes on the <strong>right</strong>.</p>
      <section className="ma-placement" aria-label="Place and read the conditions">
        <h3>Place the conditions. Then read the arrow.</h3>
        <p>Choose what belongs on each side, then use the same direction with a new rule.</p>
        <p className="ma-compact-note">Put the <strong>condition</strong> beside the arrow, not the indicator word. For example, write “you win the raffle,” not “if.”</p>
        <MustArrowPractice />
      </section>
      <section className="ma-order" aria-label="Two ways to say the same thing">
        <h3>Two ways to say the same thing</h3>
        <div className="cr-language-pair"><p><strong>If</strong> you win the raffle, you get a bicycle.</p><p>You get a bicycle <strong>if</strong> you win the raffle.</p></div>
        <p>Both mean: <strong>You win the raffle → You get a bicycle.</strong> Winning is sufficient, so it goes left, even when it comes last in the sentence.</p>
      </section>
      <p className="ma-takeaway"><strong>The arrow guarantees the right side when the left side is true.</strong> Being a student alone does not prove that you are enrolled in law school.</p>
      <details className="cr-extension ma-reverse"><summary>Why can't we reverse it?</summary><div className="ma-reverse-body"><p>A person could be a history student who is not enrolled in law school. That possibility fits our rule.</p><p>The arrow states a relationship. By itself, it does not tell us that either condition is true, or that one causes the other.</p></div></details>
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
        <li><strong>Direction:</strong> did a similar-looking expression trick you into the wrong side?</li>
        <li><strong>Imagined case:</strong> does your arrow promise something the sentence leaves open?</li>
      </ol>
    </NoteSection>
    <NoteSection title="Check 1: find the whole target, wherever it sits">
      <p>An indicator's <strong>target</strong> is the complete word or phrase it refers to. In “All guests wearing blue badges receive vouchers,” all refers to guests wearing blue badges, not guests alone.</p>
      <p>The target often comes after its indicator. But often isn't always. Try these sentences in order.</p>
      {targetExamples.map(item => <TargetReader item={item} key={item.label}/>)}
      <div className="cr-language-pair"><p>[Having a key] is <strong>required</strong> for borrowing a locker.</p><p>Borrowing a locker <strong>requires</strong> [having a key].</p><span>Having a key is the requirement in both sentences.</span></div>
      <p>The target comes before required in the first sentence and after requires in the second. Having a key still goes right. Neither the closest noun nor the next word is a reliable target rule. Ask which complete idea the sentence calls required, then give that idea its role.</p>
    </NoteSection>
    <NoteSection title="Check 2: keep every qualification">
      <p>Once you have the target, shorten it without losing what limits it. These two sentences test the same habit from opposite sides of the arrow.</p>
      <div className="co-word-comparison">
        <div><blockquote>Any applicant who submits late pays a fee.</blockquote><p>Applicant alone isn't the condition. The sentence is about an applicant who submits late. Drop that restriction and your diagram makes a claim about on-time applicants too.</p></div>
        <div><blockquote>Entry requires a current pass.</blockquote><p>A current pass is required. Has a pass drops current and would include an expired pass. A shorter label should save writing, not change the requirement.</p></div>
      </div>
      <ReferenceQuestion prompt="Any applicant who submits late pays a fee. What goes left?" options={['Applicant', 'Applicant submits late']} correct={1} feedback={['You dropped the late-submission restriction. Applicant alone would cover every applicant, including someone who submits on time. The sufficient idea is applicant submits late.', 'This keeps the complete sufficient idea. The rule covers applicants who submit late, so keep that restriction with the applicant.']}/>
      <ReferenceQuestion prompt="Entry requires a current pass. What goes right?" options={['Has current pass', 'Has any pass']} correct={0} feedback={['This keeps the full requirement. Entry needs a current pass; an expired pass does not meet that requirement.', 'You dropped current from the requirement. Has any pass would include an expired pass, which is not what the sentence requires.']}/>
    </NoteSection>
    <NoteSection title="Check 3: only and the only point to different targets">{onlyComparison.props.children}</NoteSection>
    <NoteSection title="Can, should and must keep their meaning">
      <blockquote>If a visitor registers, the visitor may enter.</blockquote>
      <p>Registration guarantees <strong>permission to enter</strong>. It does not mean the visitor actually enters. Keep “may enter” together on the right.</p>
      <blockquote>If a report contains an error, the editor should correct it.</blockquote>
      <p>The rule tells us what the editor <strong>should do</strong>. It does not establish that the correction happens. A diagram must preserve the obligation instead of turning it into a fact.</p>
      <p>Keep time limits too. <strong>“Before noon”</strong> is not the same as “at some point.” When two ideas form one condition, keep both: <strong>“signed and dated”</strong> is the complete requirement.</p>
    </NoteSection>
    <NoteSection title="Short symbols stand for complete conditions">
      <p>You choose the letters. Write what each one means so a short diagram keeps the whole rule.</p>
      <blockquote>All registered guests receive a wristband.</blockquote>
      <p><strong>R</strong> = guest is registered. <strong>W</strong> = guest receives a wristband.</p>
      <RuleDiagram left="R" right="W"/>
      <p>Read it back: <strong>If a guest is registered, the guest receives a wristband.</strong> R does not mean “guest” alone. Its definition keeps “registered.”</p>
    </NoteSection>
    <NoteSection title="Check 4: try the sentence from the inside">{insideCheck.slice(0, -1)}</NoteSection>
  </>;
}

const freshCases = [
  { rule: 'If it rains on Saturday, the market moves into the town hall.', questions: [
    { prompt: "It's Friday. You've read this rule and nothing else. Where will the market be on Saturday?", options: ['In the town hall.', 'Outdoors, as usual.', "The rule alone doesn't settle it."], correct: 2, feedback: ['You treated the rule as a weather report. It tells you what follows if it rains. Nobody has told you that it will rain.', "You assumed it won't rain. The rule hasn't told you that either, so the market's location is still open.", "The rule describes what would happen if it rains. It's a promise about a possible case, not a report that the case happened."] },
    { prompt: "Saturday arrives, and it's raining. Now where is the market?", options: ['In the town hall.', 'Still not settled.'], correct: 0, feedback: ['Now you have a fact, not just a rule. Rain on Saturday meets the condition, so the rule puts the market in the town hall.', "The fact changes things. The rule covers a rainy Saturday, and that's what we have, so the market's location is settled."] },
  ] },
  { rule: 'Every student going on the museum trip has a signed permission slip.', questions: [
    { prompt: 'Which description matches this rule?', options: ['Going on the trip is enough to know a student has a signed slip.', 'Having a signed slip is enough to know a student is going on the trip.', 'Each one is enough to know the other.'], correct: 0, feedback: ['Pick any student on the trip: the rule says they have a signed slip. Going is enough to establish the slip, and the slip is what every student on the trip is required to have.', "You made the requirement enough. A student could have a signed slip and stay at school with a cold. That student doesn't break the rule.", "The rule gives only one direction. Going on the trip establishes a signed slip. A student with a slip who stays behind fits the rule, so the slip doesn't establish going."] },
  ] },
  { rule: 'If the café runs out of bread, it closes early.', questions: [
    { prompt: 'Today the café did not run out of bread. Did it close early?', options: ['No. It stayed open until the usual time.', 'Yes. It closed early.', 'Not settled. It could stay open or close early for another reason.'], correct: 2, feedback: ['You treated running out of bread as the only reason to close early. The rule gives one reason. A café that closed early because of a power cut would still fit it.', "Nothing here establishes an early closing. The rule tells us what happens when the bread runs out, and today it didn't.", "Given that fact, the rule doesn't settle whether the café closed early. It could have stayed open, or closed early for another reason. Both cases fit the rule."] },
  ] },
];

// Recall the definitions, apply the arrow, then distinguish indicators from conditions.
const foundationConceptQuestions: DrillOneQuestion[] = [
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a necessary condition?', options: ['A requirement that must be met, but might not be enough on its own.', 'Something that always guarantees the other condition.', 'Something that usually happens afterward.'], correct: 0, feedback: ['Necessary means required. Meeting the requirement does not, by itself, establish that the other condition is true.', 'That describes sufficiency. A requirement can also be sufficient, but being necessary alone does not establish that.', 'Necessity is a requirement, not a prediction about timing. It must hold whenever the condition that requires it holds.'] },
  { contextLabel: 'Concept', rule: 'Sufficient and necessary conditions', prompt: 'What is a sufficient condition?', options: ['The only possible way for another condition to be true.', 'Something that makes another condition more likely.', 'Something that guarantees another condition when it is true.'], correct: 2, feedback: ['The only possible way describes a necessary condition: it would be required. Sufficient means enough, without claiming it is the only way.', 'A conditional guarantee is stronger than likelihood. The other condition must be true whenever the sufficient condition is true.', 'Sufficient means enough. Once it is true, the rule guarantees the necessary condition.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'Which condition belongs on the left side of this arrow?', options: ['The necessary condition.', 'The sufficient condition.', 'Whichever condition appears first in the sentence.'], correct: 1, feedback: ['The necessary condition is B, on the right. A is enough to establish B.', 'A is the sufficient condition. If A is true, B must be true.', 'Sentence position can change. Place the sufficient condition on the left even if it appears last in the sentence.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'What does the condition on the right side represent?', options: ['A fact that has already happened.', 'A condition that guarantees A.', 'A requirement that must hold whenever A holds.'], correct: 2, feedback: ['The arrow alone does not tell us that B is actually true. It tells us B must be true if A is true.', 'This reverses the arrow. A guarantees B; the rule does not say B guarantees A.', 'B is necessary for A. A cannot be true while B is false.'] },
  { contextLabel: 'Diagram', rule: 'A → B', prompt: 'How do you read this arrow?', options: ['If A is true, B must be true.', 'If B is true, A must be true.', 'A happens first and causes B to happen.'], correct: 0, feedback: ['Read from left to right. The truth of A guarantees the truth of B.', 'That reads against the arrow. B might be true without A being true.', 'The arrow gives a guarantee, not a timeline or a cause. A and B may be true at the same time.'], conditions: ['A', 'B'] },
  { rule: 'If a painting is in the permanent collection, it has an inventory number.', prompt: 'The trigger is the sufficient condition. When it is true, the other condition must be true. This does not mean it causes the other condition or happens first. Which complete condition is the trigger here?', options: ['The painting has an inventory number.', 'The painting is in the permanent collection.', 'The word “if.”'], correct: 1, feedback: ['Having an inventory number is the required condition. The rule guarantees it for a painting in the permanent collection.', 'Being in the permanent collection is enough to establish an inventory number. Trigger describes that logical role, not a cause or an earlier event.', 'If is an indicator. The complete condition it introduces is that the painting is in the permanent collection.'], conditions: ['Painting is in the permanent collection', 'Painting has an inventory number'] },
  { rule: 'If a book is on the reserved shelf, it has a reservation card.', prompt: 'The required outcome is the necessary condition: what must be true when the sufficient condition holds. Which condition is the required outcome here?', options: ['The book has a reservation card.', 'The book is on the reserved shelf.', 'Someone places the book on the shelf later.'], correct: 0, feedback: ['The reservation card is necessary. A book on that shelf must have one; outcome here does not mean an event that happens later.', 'Being on the shelf is the sufficient condition. It establishes the card, not the other way around.', 'The rule says nothing about a later action. It requires a reservation card for any book on the reserved shelf.'], conditions: ['Book is on the reserved shelf', 'Book has a reservation card'] },
  { rule: 'If a parcel is marked fragile, it is packed with padding.', prompt: 'Which complete condition goes on the left?', options: ['If.', 'The parcel is packed with padding.', 'The parcel is marked fragile.'], correct: 2, feedback: ['If helps identify the condition, but is not itself a condition. Write the complete idea it introduces.', 'Padding is required for a parcel marked fragile, so it goes on the right.', 'Being marked fragile guarantees padding under this rule. That complete condition goes on the left.'], conditions: ['Parcel is marked fragile', 'Parcel is packed with padding'] },
  { rule: 'If an application is approved, it has a reference number.', prompt: 'Which complete condition goes on the right?', options: ['The application is approved.', 'The application has a reference number.', 'The word “if.”'], correct: 1, feedback: ['Approval is enough to establish the reference number, so approval goes on the left.', 'Having a reference number is required for an approved application. It goes on the right.', 'If is an indicator, not the required condition. The required idea is that the application has a reference number.'], conditions: ['Application is approved', 'Application has a reference number'] },
  { rule: 'A visitor receives a badge if the visitor signs in.', prompt: 'Which diagram preserves this rule?', options: ['Visitor receives a badge → Visitor signs in', 'Visitor signs in → Visitor receives a badge', 'Both directions are guaranteed.'], correct: 1, feedback: ['This reverses the guarantee. The sentence gives a badge to someone who signs in, not a sign-in to everyone with a badge.', 'If introduces signing in, even at the end of the sentence. Signing in is sufficient and goes left.', 'The sentence guarantees only one direction. It does not exclude a visitor who receives a badge another way.'], conditions: ['Visitor signs in', 'Visitor receives a badge'] },
  { rule: 'If a member books a room, the member must have an active account.', prompt: 'Which word identifies the sufficient condition here?', options: ['If.', 'Must.', 'Both words identify the sufficient condition.'], correct: 0, feedback: ['If introduces the sufficient condition: the member books a room. Must expresses the requirement that follows from it.', 'Must tells us what is required: having an active account. If identifies the booking condition that guarantees it.', 'The words have different jobs. If identifies the sufficient condition; must makes the necessary condition explicit.'], conditions: ['Member books a room', 'Member has an active account'] },
  { rule: 'Every volunteer wearing a green badge must have completed training.', prompt: 'Which word acts as the sufficient-condition indicator?', options: ['Must.', 'Wearing.', 'Every.'], correct: 2, feedback: ['Must expresses the required condition: completed training. Every identifies the group for which that requirement holds.', 'Wearing helps define which volunteers the rule covers. Every is the word that applies the guarantee to that entire group.', 'Every covers all volunteers wearing a green badge. That qualified group is sufficient to establish the training that must have been completed.'], conditions: ['Volunteer wears a green badge', 'Volunteer has completed training'] },
  { rule: 'Every parcel weighing more than ten kilograms has a handling label.', prompt: 'Which complete condition belongs on the left?', options: ['The item is a parcel.', 'The item is a parcel weighing more than ten kilograms.', 'The item has a handling label.'], correct: 1, feedback: ['Parcel alone drops the weight restriction. The rule does not promise a handling label for every parcel.', 'Keep the weight restriction. The rule guarantees a handling label for every parcel weighing more than ten kilograms.', 'Having a handling label is the required condition, so it goes on the right.'], conditions: ['Parcel weighs more than ten kilograms', 'Parcel has a handling label'] },
  { rule: 'A document is archived only if it has a catalogue number.', prompt: 'Which expression identifies the requirement?', options: ['Only if.', 'If, taken on its own.', 'Archived.'], correct: 0, feedback: ['Read only if as one expression. It identifies having a catalogue number as necessary for being archived.', 'The word only changes the expression. Only if identifies a requirement, not a sufficient condition.', 'Archived is part of the condition: the document is archived. Only if identifies what that condition requires.'], conditions: ['Document is archived', 'Document has a catalogue number'] },
  { rule: 'A researcher enters the reading room only if the researcher has a visitor permit.', prompt: 'Which diagram matches this sentence?', options: ['Has a visitor permit → Enters the reading room', 'Only if → Has a visitor permit', 'Enters the reading room → Has a visitor permit'], correct: 2, feedback: ['This makes the requirement sufficient. A researcher could have a visitor permit without entering the reading room.', 'Only if is an indicator, not a condition. Put the complete ideas on the two sides of the arrow.', 'Entering the reading room requires a visitor permit. Entry goes left; having the required permit goes right.'], conditions: ['Researcher enters the reading room', 'Researcher has a visitor permit'] },
  { rule: 'Filing a claim requires a signed form.', prompt: 'What is the necessary condition?', options: ['Filing a claim.', 'Having a signed form.', 'Having any form, even an unsigned one.'], correct: 1, feedback: ['Filing is what has the requirement. Ask what filing requires: a signed form.', 'A signed form is required for filing a claim. Having one alone does not establish that someone files a claim.', 'Signed is part of the requirement. Dropping it would wrongly include an unsigned form.'], conditions: ['Person files a claim', 'Person has a signed form'] },
  { rule: 'Every completed registration requires a paid deposit.', prompt: 'Which word identifies the necessary condition?', options: ['Every.', 'Paid.', 'Requires.'], correct: 2, feedback: ['Every identifies the sufficient group: completed registrations. Requires identifies what each one must have.', 'Paid limits which deposit counts. It is part of the condition, not the word expressing the requirement.', 'Requires identifies a paid deposit as necessary. Every completed registration must have one, but a paid deposit alone does not establish completion.'], conditions: ['Registration is complete', 'Registration has a paid deposit'] },
];

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
  const foundationPracticeQuestions = [...foundationConceptQuestions, ...questions.map((question, index) => ({ ...question, conditions: conditions[index] }))];
  return <DrillOneExperience key={foundationPracticeQuestions.length} questions={foundationPracticeQuestions}/>;
}

function GroupPractice({ group }: { group: 'group-1' | 'group-2' }) {
  const meaningCheck = groupSection(group, 'Check the meaning, not just the word');
  return <>
    {groupSection(group, 'condition-practice')}
    {groupSection(group, 'From sentence to diagram')}
    {group === 'group-1' && groupSection(group, 'Read the only as a complete expression')}
    {cloneElement(meaningCheck, {}, Children.toArray(meaningCheck.props.children).slice(0, -1))}
    <details className="co-practical-note"><summary>More sentences to recall and explain</summary>{groupSection(group, 'Say the rule without the clues')}</details>
  </>;
}

function PermissionBoundary() {
  const boundary = sections(conditionalReferenceContent().props.children).find(section => section.props['data-reference-boundary'] !== undefined);
  if (!boundary) throw new Error('Missing approved permission and instruction boundary');
  return <NoteSection title="Keep permission and instructions distinct"><p>A conditional can give permission or an instruction. Preserve that strength instead of turning it into a report of what someone did.</p>{Children.toArray(boundary.props.children).slice(3)}</NoteSection>;
}

function CompatibleCasesRecap() {
  return <NoteSection title="Three combinations fit. One breaks the rule.">
    <blockquote>If you win the raffle, you get a bicycle.</blockquote>
    <p>The rule requires a bicycle when you win. Let's compare all four possible combinations. These are possible cases, not a claim that any of them happened.</p>
    <table className="co-combination-table">
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


function groupPracticeTasks(group: 'group-1' | 'group-2') {
  const content = sections(GroupPractice({ group }).props.children);
  const recall = content[content.length - 1];
  return content.slice(0, -1).map((item, index, items) => ({
    title: item.props.title ?? 'Read the whole rule',
    content: <>{item}{index === items.length - 1 && recall}</>,
  }));
}

function SufficientPractice() {
  return <PracticeTaskRunner rounds={[{ title: 'Build the sufficient side', tasks: [
    ...groupPracticeTasks('group-1'),
    { title: 'Build a case that proves the limit', content: <NoteSection title="Build a case that proves the limit"><CounterexampleLab/></NoteSection> },
  ] }]}/>;
}

function ContrapositivePractice() {
  const [current, setCurrent] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(() => referencePracticeItems.map(() => false));
  return <NoteSection title="Build an original and its contrapositive">
    <p>For each sentence, identify the indicator and both complete conditions. Choose the original diagram, then its contrapositive. Read both back before checking. If an answer needs revision, inspect the direction, qualifications and negation, then retry.</p>
    <p className="co-kicker" role="status">Sentence {current + 1} of {referencePracticeItems.length}</p>
    {referencePracticeItems.map((item, index) => <div key={item.sentence} hidden={current !== index} data-course-practice-item={index + 1}><IntegratedItem item={item} number={index + 1} onChecked={value => setChecked(previous => previous.map((old, itemIndex) => itemIndex === index ? value : old))}/></div>)}
    <div className="co-choices"><button type="button" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous sentence</button><button type="button" disabled={current === referencePracticeItems.length - 1 || !checked[current]} onClick={() => setCurrent(current + 1)}>Next sentence</button></div>
    <p>Moving between sentences keeps your choices and feedback.</p>
  </NoteSection>;
}

function Content({ id }: { id: string }) {
  switch (id) {
    case 'meaning': return <ReferenceBody number={1} omitTransition/>;
    case 'sufficient': return <ReferenceBody number={2} omitTransition/>;
    case 'necessary': return <ReferenceBody number={4} omitTransition/>;
    case 'must-arrow': return <MustArrowNote/>;
    case 'sufficient-words': return <CompleteConditionNote/>;
    case 'necessary-words': return <><IndicatorNote group="group-2"/><PermissionBoundary/></>;
    case 'whole-meaning': return <WholeMeaningNote/>;
    case 'missing-requirement': return <MissingRequirementNote/>;
    case 'contrapositive': return <><ReferenceBody number={9}/><WholeConditionNegation/><details className="co-practical-note"><summary>Practical questions about diagramming</summary><ReferenceBody number={10} omitTransition/></details><NoteSection title="Two possible rooms, one limit"><NegativeCaseLab/></NoteSection><CompatibleCasesRecap/></>;
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
