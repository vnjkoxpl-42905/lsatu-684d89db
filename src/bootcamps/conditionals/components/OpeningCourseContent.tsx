import { Children, cloneElement, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Fundamentals, GroupLessons } from './ConditionalOpeningLesson';
import { conditionalReferenceContent, IncrementalWriter, IntegratedItem, referencePracticeItems, ReferenceQuestion, RuleDiagram, TargetReader, targetExamples, WordFamily } from './ConditionalReferenceSequence';
import { CounterexampleLab, NegativeCaseLab } from './CounterexampleLab';
import { OpeningMixedDrill } from './OpeningMixedDrill';
import { PracticeTaskRunner } from './PracticeTaskRunner';
import { StudyDeck } from './StudyDeck';

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

// The raffle note sits before the families: arrow meaning, sides, one diagram and a moved if-clause.
function MustArrowNote() {
  return <section className="co-section cr-course-section" data-reference-source={8}>
    <div className="co-section-heading"><h2>Give the relationship a shorter form</h2></div>
    <div className="cr-step-body">
      <p>Put the sufficient condition on the <strong>left</strong>, the necessary condition on the <strong>right</strong>, and a <strong>must arrow</strong> between them.</p>
      <RuleDiagram left="Sufficient: enough" right="Necessary: required"/>
      <p>Read the arrow as <strong>must</strong>: if the left condition is true, the right condition must be true too. It does not mean the left caused the right, or that the right happens later.</p>
      <p>The diagram holds the <strong>complete conditions</strong>, not the indicator word. An indicator helps you find a condition's job. Once you've found that job, place the whole condition on its side of the arrow.</p>
      <h3>Build the raffle diagram one step at a time</h3>
      <p>First find the indicator, then draw the arrow, place the complete idea it refers to, and fill the other side.</p>
      <IncrementalWriter/>
      <h3>The sentence can move. The roles stay the same.</h3>
      <p>Compare these two versions of our raffle rule. The indicator is bold; the complete idea it refers to is in brackets.</p>
      <div className="cr-language-pair"><p><strong>If</strong> [you win the raffle], you get a bicycle.</p><p>You get a bicycle <strong>if</strong> [you win the raffle].</p><span>If identifies the sufficient condition in both sentences.</span></div>
      <p>In the second sentence, if appears in the middle. Its condition comes last, but winning is still enough to establish getting a bicycle. Don't let the first phrase in English choose the first side of your diagram.</p>
      <ReferenceQuestion prompt="You get a bicycle if you win the raffle. Which diagram preserves this sentence?" options={['Get bicycle → Win', 'Win → Get bicycle']} correct={1} feedback={['You let sentence order choose the arrow. The if-clause still makes winning enough for getting a bicycle.', 'The sufficient condition is still winning. Where it appears in the sentence does not change what it establishes.']}/>
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

function FoundationPractice() {
  const anchor = sections(reference(1).props.children).find(child => child.type === ReferenceQuestion);
  if (!anchor) throw new Error('Missing approved raffle retrieval question');
  const fresh = sections(Fundamentals().props.children).find(section => section.props.title === 'Enough does not mean the only way');
  if (!fresh) throw new Error('Missing approved fresh sufficient-condition check');
  const freshContent = Children.toArray(fresh.props.children);
  const freshCheck = freshContent[freshContent.length - 1];
  const freshTitles = [['Distinguish a rule from a fact', 'Use the new fact'], ['Identify enough and required'], ['Keep other reasons possible']];
  const tasks = [
    { title: 'Separate the rule from the fact', content: <NoteSection title="Separate the rule from the fact"><blockquote>If you win the raffle, you get a bicycle.</blockquote><p>Start with the rule you know. Decide what the rule itself establishes before any fact arrives.</p>{anchor}</NoteSection> },
    ...freshCases.flatMap((item, caseIndex) => item.questions.map((question, questionIndex) => ({ title: freshTitles[caseIndex][questionIndex], content: <NoteSection title={freshTitles[caseIndex][questionIndex]}><blockquote>{item.rule}</blockquote><ReferenceQuestion {...question}/></NoteSection> }))),
    { title: 'Enough does not mean the only way', content: <NoteSection title="Enough does not mean the only way">{freshCheck}</NoteSection> },
    { title: 'Test the limit with a possible case', content: <NoteSection title="Test the limit with a possible case"><ReferenceQuestion prompt="Someone claims that getting a bicycle proves you won the raffle. Which possible case fits our rule but disproves that claim?" options={['You win and get a bicycle.', 'You do not win, but get a bicycle as a gift.', 'You win and never get a bicycle.']} correct={1} feedback={['This fits both the rule and the claim. It does not show why the claim adds something.', 'The rule promises a bicycle to a winner. It does not exclude a bicycle received as a gift without winning, so this case fits the rule and disproves the claim.', 'Winning without getting a bicycle breaks the original rule. We need a case that keeps the rule true.']}/></NoteSection> },
  ];
  return <PracticeTaskRunner rounds={[{ title: 'Enough, required, or still open?', tasks }]}/>;
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
    case 'necessary': return <><ReferenceBody number={4} omitTransition/><ReferenceQuestion prompt="You get a bicycle. Does that establish that you won the raffle?" options={['Yes. Getting a bicycle proves winning.', 'No. You could get a bicycle without winning.']} correct={1} feedback={['You made the required result enough to establish winning. The rule does not say winning is the only way to get a bicycle.', 'You could buy a bicycle or receive one as a gift. Neither possibility breaks the rule, which only tells us what must follow if you win.']}/></>;
    case 'must-arrow': return <><MustArrowNote/><NoteSection title="Recall enough and required"><p>Use these new examples to check the roles and their direction.</p><StudyDeck group="foundation"/></NoteSection></>;
    case 'sufficient-words': return <IndicatorNote group="group-1"/>;
    case 'necessary-words': return <><IndicatorNote group="group-2"/><PermissionBoundary/></>;
    case 'whole-meaning': return <WholeMeaningNote/>;
    case 'missing-requirement': return <><ReferenceBody number={6}/><ReferenceBody number={7} omitTransition/></>;
    case 'contrapositive': return <><ReferenceBody number={9}/><details className="co-practical-note"><summary>Practical questions about diagramming</summary><ReferenceBody number={10} omitTransition/></details><NoteSection title="Two possible rooms, one limit"><NegativeCaseLab/></NoteSection><CompatibleCasesRecap/></>;
    case 'foundation-practice': return <FoundationPractice/>;
    case 'sufficient-practice': return <SufficientPractice/>;
    case 'mixed-practice': return <OpeningMixedDrill/>;
    case 'contrapositive-practice': return <ContrapositivePractice/>;
    default: throw new Error(`Unknown opening course content: ${id}`);
  }
}

/** Article body only. Course routes own titles, navigation and completion. */
export function OpeningCourseContent({ id }: { id: string }) {
  return <div className="co-opening cr-sequence opening-course-content"><Content key={id} id={id}/></div>;
}
