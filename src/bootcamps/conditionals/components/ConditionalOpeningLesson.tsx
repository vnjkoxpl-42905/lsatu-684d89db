import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LessonPages, flattenLessonPages } from './LessonPages';
import { StudyDeck } from './StudyDeck';
import { CounterexampleLab, RuleComparisonLab } from './CounterexampleLab';
import { ConditionalOpeningMedia } from './ConditionalOpeningMedia';
import { GROUPS } from '@/features/conditional-refresher/content';
import type { ConditionalLessonNoteProps } from './ConditionalLessonNote';
import './opening.css';
import { conditionalReferencePages } from './ConditionalReferenceSequence';
import './opening-polish.css';

export const hasOpeningLesson = (id: string) => ['orientation', 'sufficient-necessary', 'group-1', 'group-2'].includes(id);
function Section({ title, children, dark = false, expressionNumber, id }: { title: string; children: ReactNode; dark?: boolean; expressionNumber?: number; id?: string }) {
  const tocTitle = title.includes(':') ? title.split(':')[0] : ({
    'Which reports does this rule cover?': 'Reports covered by the rule',
    'What kind of pass does entry require?': 'The pass entry requires',
    'Try the sentence from the inside': 'Personalized If/Then',
    'A guarantee is stronger than a tendency': 'Guarantees and wording',
    'Having a requirement does not guarantee the result': 'Requirement or guarantee?',
    'Try the same reasoning with a new rule': 'Try a new rule',
    'Say the rule without the clues': 'Recall the rule',
  }[title] || title);
  return <section id={id || `co-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={`co-section ${dark ? 'co-dark' : ''} ${expressionNumber ? 'co-expression-section' : ''}`} data-toc data-toc-title={tocTitle}>
    <div className="co-section-heading">{expressionNumber && <span className="co-expression-number" aria-hidden="true">{String(expressionNumber).padStart(2, '0')}</span>}<h2>{title}</h2></div>{children}
  </section>;
}
function Arrow({ left, right }: { left: string; right: string }) {
  return <div className="co-arrow"><span>{left}</span><b aria-hidden="true">→</b><span className="co-sr-only">implies</span><span>{right}</span></div>;
}
function ThinkPause({ prompt, children }: { prompt: string; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const answerId = useId();
  return <div className="co-think-pause"><h3 id={`${answerId}-prompt`}>{prompt}</h3><button type="button" className="co-primary" aria-describedby={`${answerId}-prompt`} aria-expanded={revealed} aria-controls={answerId} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide the reasoning' : 'Show the reasoning'}</button><div id={answerId} aria-live="polite">{revealed && <div className="co-pause-answer">{children}</div>}</div></div>;
}
function Check({ prompt, options, correct, feedback }: { prompt: string; options: string[]; correct: number; feedback: string[] }) {
  const [choice, setChoice] = useState<number | null>(null);
  if (!Array.isArray(feedback) || feedback.length !== options.length || feedback.some(message => typeof message !== 'string' || !message.trim())) {
    throw new Error(`Every answer choice needs an explanation: ${prompt}`);
  }
  return <div className="co-check"><p className="co-kicker">Try it</p><h3>{prompt}</h3><div className="co-choices">{options.map((option, i) => <button key={option} type="button" aria-pressed={choice === i} onClick={() => setChoice(i)}>{option}</button>)}</div><div role="status">{choice !== null && <div className={`co-feedback ${choice === correct ? 'co-correct' : ''}`} ><span className="co-answer-state">{choice === correct ? 'Correct.' : 'Not quite.'}</span><strong>Your choice: {options[choice]}</strong><p>{feedback[choice]}</p></div>}</div></div>;
}
function GateExplorer() {
  const [fact, setFact] = useState<'win' | 'bicycle'>('win');
  return <div className="co-gate"><p className="co-kicker">Enough and required</p><Arrow left="Win the raffle" right="Get a bicycle"/><div className="co-choices"><button aria-pressed={fact === 'win'} onClick={() => setFact('win')}>You win the raffle</button><button aria-pressed={fact === 'bicycle'} onClick={() => setFact('bicycle')}>You get a bicycle</button></div><div className="co-gate-track"><div className={fact === 'win' ? 'co-lit' : ''}>Win the raffle<span>Sufficient: enough</span></div><b aria-hidden="true">→</b><span className="co-sr-only">implies</span><div className="co-lit">Get a bicycle<span>Necessary: required</span></div></div><p role="status">{fact === 'win' ? 'You get a bicycle because the rule gives you that result if you win.' : 'You get a bicycle. Winning remains unknown: you could have bought it or received it as a gift instead.'}</p></div>;
}
type Translation = { word: string; sentence: string; target: string; other: string; left: string; right: string; why: string; readback: string };
type MappedTranslation = Translation & { sentenceTarget: string };
type DiagramTranslation = MappedTranslation & { reversedPromise: string };

export function orderedConditionalIdeas(item: Pick<Translation, 'sentence' | 'target' | 'other'>): [string, string] {
  let hash = 2166136261;
  for (const character of item.sentence) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const reverseOrder = ((hash ^ (hash >>> 16)) >>> 0) % 2 === 1;
  return reverseOrder ? [item.other, item.target] : [item.target, item.other];
}

export const translationExamples: Record<string, MappedTranslation[]> = {
  'group-1': [
    { word: 'if', sentence: 'A report is reviewed if it is submitted before noon.', sentenceTarget: 'it is submitted before noon', target: 'Submitted before noon', other: 'Reviewed', left: 'Submitted before noon', right: 'Reviewed', why: 'If what? Submission before noon. The sufficient clause comes second, but it still goes left.', readback: 'If a report is submitted before noon, then it is reviewed.' },
    { word: 'when', sentence: 'When the alarm sounds, the staff evacuate.', sentenceTarget: 'the alarm sounds', target: 'Alarm sounds', other: 'Staff evacuate', left: 'Alarm sounds', right: 'Staff evacuate', why: 'When what? The alarm sounds. The rule says every alarm brings an evacuation.', readback: 'If the alarm sounds, then the staff evacuate.' },
    { word: 'where', sentence: 'Where a station is available, the service operates.', sentenceTarget: 'a station is available', target: 'Station available', other: 'Service operates', left: 'Station available', right: 'Service operates', why: 'Where what? A station is available. This rule makes station availability enough for service.', readback: 'If a station is available at a location, then the service operates there.' },
    { word: 'all', sentence: 'All registered guests receive a wristband.', sentenceTarget: 'registered guests', target: 'Registered guest', other: 'Receives wristband', left: 'Registered guest', right: 'Receives wristband', why: 'All what? Registered guests. Keep registered; guest alone does not meet the whole condition.', readback: 'If someone is a registered guest, then that person receives a wristband.' },
    { word: 'the only', sentence: 'The only vehicles permitted inside are electric vehicles.', sentenceTarget: 'vehicles permitted inside', target: 'Vehicle permitted inside', other: 'Electric vehicle', left: 'Vehicle permitted inside', right: 'Electric vehicle', why: 'The only what? Vehicles permitted inside. Every permitted vehicle must be electric. Electric alone is not enough for admission.', readback: 'If a vehicle is permitted inside, then it is electric.' },
    { word: 'every', sentence: 'Every finalist receives an invitation.', sentenceTarget: 'finalist', target: 'Finalist', other: 'Receives invitation', left: 'Finalist', right: 'Receives invitation', why: 'Every what? Finalist. The rule covers each finalist without an exception.', readback: 'If someone is a finalist, then that person receives an invitation.' },
    { word: 'any', sentence: 'Any applicant who submits late pays a fee.', sentenceTarget: 'applicant who submits late', target: 'Applicant submits late', other: 'Pays fee', left: 'Applicant submits late', right: 'Pays fee', why: 'Any what? An applicant who submits late. Do not drop the late-submission limit.', readback: 'If an applicant submits late, then that applicant pays a fee.' },
  ],
  'group-2': [
    { word: 'only', sentence: 'Only members are admitted.', sentenceTarget: 'members', target: 'Member', other: 'Admitted', left: 'Admitted', right: 'Member', why: 'Only what? Members. Admission requires membership. A member who remains outside also fits the sentence.', readback: 'If someone is admitted, then that person is a member.' },
    { word: 'only if', sentence: 'A student graduates only if the student completes the project.', sentenceTarget: 'the student completes the project', target: 'Completes project', other: 'Graduates', left: 'Graduates', right: 'Completes project', why: 'Only if what? The project is completed. Graduation requires that completion.', readback: 'If a student graduates, then that student has completed the project.' },
    { word: 'only when', sentence: 'A review occurs only when a complaint is filed.', sentenceTarget: 'a complaint is filed', target: 'Complaint filed', other: 'Review occurs', left: 'Review occurs', right: 'Complaint filed', why: 'Only when what? A complaint is filed. A review needs that complaint. Nothing says every complaint produces a review.', readback: 'If a review occurs, then a complaint has been filed.' },
    { word: 'only where', sentence: 'The service operates only where a station is available.', sentenceTarget: 'a station is available', target: 'Station available', other: 'Service operates', left: 'Service operates', right: 'Station available', why: 'Only where what? A station is available. Availability is required wherever this service operates.', readback: 'If the service operates at a location, then a station is available there.' },
    { word: 'always', sentence: 'A finalist always receives an invitation.', sentenceTarget: 'receives an invitation', target: 'Receives invitation', other: 'Finalist', left: 'Finalist', right: 'Receives invitation', why: 'What does the sentence promise every finalist? An invitation. Every finalist receives one. There are no exceptions in this sentence.', readback: 'If someone is a finalist, then that person receives an invitation.' },
    { word: 'requires', sentence: 'Entry requires a current pass.', sentenceTarget: 'a current pass', target: 'Has current pass', other: 'Enters', left: 'Enters', right: 'Has current pass', why: 'Requires what? A current pass. Keep current; an expired pass does not meet the condition.', readback: 'If someone enters, then that person has a current pass.' },
    { word: 'must', sentence: 'A finalist must attend the interview.', sentenceTarget: 'attend the interview', target: 'Required to attend interview', other: 'Finalist', left: 'Finalist', right: 'Required to attend interview', why: 'Must what? Attend the interview. This sentence states a requirement. It does not establish that every finalist complied.', readback: 'If someone is a finalist, then that person is required to attend the interview.' },
  ],
};

// Separate original transfer examples. These do not repeat the solved indicator lab.
export const diagramExamples: Record<string, DiagramTranslation[]> = {
  "group-1": [
    {
      "word": "if",
      "sentence": "A kitchen timer rings if its countdown reaches zero.",
      "sentenceTarget": "its countdown reaches zero",
      "target": "Countdown reaches zero",
      "other": "Timer rings",
      "left": "Countdown reaches zero",
      "right": "Timer rings",
      "readback": "If the countdown reaches zero, then the kitchen timer rings.",
      "why": "This sentence gives a ring whenever its countdown reaches zero. That makes reaching zero the starting condition. A ring alone doesn't establish that the countdown reached zero, since another reason for ringing would also fit the sentence.",
      "reversedPromise": "A ring for another reason would fit this rule. Your reverse arrow rules that out: it says every ring proves the countdown reached zero. The sentence only guarantees a ring when the countdown reaches zero."
    },
    {
      "word": "when",
      "sentence": "When a library reservation is confirmed, a confirmation email is sent.",
      "sentenceTarget": "a library reservation is confirmed",
      "target": "Reservation confirmed",
      "other": "Confirmation email sent",
      "left": "Reservation confirmed",
      "right": "Confirmation email sent",
      "readback": "If a library reservation is confirmed, then a confirmation email is sent.",
      "why": "A confirmed library reservation gets a confirmation email. That makes confirmation the starting condition. The sentence has not said that every confirmation email establishes a confirmed library reservation.",
      "reversedPromise": "An email sent without a confirmed reservation has not been ruled out. Starting with the email would make confirmation certain, but the sentence only tells us what confirmed reservations receive."
    },
    {
      "word": "where",
      "sentence": "Where a trail has a steep drop, a guardrail is installed.",
      "sentenceTarget": "a trail has a steep drop",
      "target": "Trail has steep drop",
      "other": "Guardrail installed",
      "left": "Trail has steep drop",
      "right": "Guardrail installed",
      "readback": "If a trail has a steep drop, then a guardrail is installed there.",
      "why": "Look at the place the sentence covers: a trail with a steep drop. A guardrail is installed there. A guardrail alone doesn't prove the drop is steep, since guardrails haven't been restricted to those spots.",
      "reversedPromise": "A guardrail beside a gentle slope would fit the sentence too. Guardrail \u2192 Steep drop would exclude that possibility. The original rule tells us about steep drops, not every place a guardrail can stand."
    },
    {
      "word": "all",
      "sentence": "All mugs sold in the blue display come with lids.",
      "sentenceTarget": "mugs sold in the blue display",
      "target": "Mug sold in blue display",
      "other": "Comes with lid",
      "left": "Mug sold in blue display",
      "right": "Comes with lid",
      "readback": "If a mug is sold in the blue display, then it comes with a lid.",
      "why": "All refers to mugs sold in the blue display, not to every mug in the shop. That whole group comes with lids. A lid alone doesn't put a mug in the blue display.",
      "reversedPromise": "A lidded mug from another display would fit this rule. Your arrow would put that mug in the blue display. The sentence tells us what blue-display mugs come with; it hasn't restricted lids to them."
    },
    {
      "word": "the only",
      "sentence": "The only recipes printed in this booklet are vegetarian recipes.",
      "sentenceTarget": "recipes printed in this booklet",
      "target": "Recipe printed in booklet",
      "other": "Vegetarian recipe",
      "left": "Recipe printed in booklet",
      "right": "Vegetarian recipe",
      "readback": "If a recipe is printed in this booklet, then it is vegetarian.",
      "why": "Pick a recipe printed in this booklet. The sentence tells you it is vegetarian. It hasn't promised a place in the booklet to every vegetarian recipe, so being printed there is the starting condition.",
      "reversedPromise": "A vegetarian recipe could be missing from the booklet. Nothing here requires every vegetarian recipe to be printed. Your reverse arrow adds that promise of a place in the booklet."
    },
    {
      "word": "every",
      "sentence": "Every jacket stored in the front closet has a hanger.",
      "sentenceTarget": "jacket stored in the front closet",
      "target": "Jacket stored in front closet",
      "other": "Has hanger",
      "left": "Jacket stored in front closet",
      "right": "Has hanger",
      "readback": "If a jacket is stored in the front closet, then it has a hanger.",
      "why": "The front-closet location is part of the condition. A jacket stored there has a hanger. Seeing a jacket on a hanger doesn't tell you where it is stored.",
      "reversedPromise": "A jacket hanging in the back closet doesn't break this rule. A hanger proves neither closet. Starting from the hanger would make the front-closet location certain without that connection."
    },
    {
      "word": "any",
      "sentence": "Any sandwich ordered without cheese gets a green wrapper.",
      "sentenceTarget": "sandwich ordered without cheese",
      "target": "Sandwich ordered without cheese",
      "other": "Gets green wrapper",
      "left": "Sandwich ordered without cheese",
      "right": "Gets green wrapper",
      "readback": "If a sandwich is ordered without cheese, then it gets a green wrapper.",
      "why": "The rule concerns sandwiches ordered without cheese. Those orders get green wrappers. Keep without cheese with the sandwich; a green wrapper alone doesn't tell us whether the sandwich was ordered without cheese.",
      "reversedPromise": "A sandwich ordered with cheese could also get a green wrapper. The sentence hasn't reserved those wrappers for cheese-free orders. Your arrow makes that restriction even though the original doesn't."
    }
  ],
  "group-2": [
    {
      "word": "only",
      "sentence": "Only guests with a booking receive a room key.",
      "sentenceTarget": "guests with a booking",
      "target": "Guest has booking",
      "other": "Receives room key",
      "left": "Receives room key",
      "right": "Guest has booking",
      "readback": "If a guest receives a room key, then that guest has a booking.",
      "why": "A room key tells you the guest has a booking because only limits keys to those guests. Nothing says every guest with a booking receives a key, so a booking alone leaves that question open.",
      "reversedPromise": "A guest could have a booking without receiving a key. That meets the requirement without establishing the result. Booking \u2192 Receives key would promise a key to every booked guest."
    },
    {
      "word": "only if",
      "sentence": "A printer releases a document only if its job has been approved.",
      "sentenceTarget": "its job has been approved",
      "target": "Job approved",
      "other": "Printer releases document",
      "left": "Printer releases document",
      "right": "Job approved",
      "readback": "If a printer releases a document, then its job has been approved.",
      "why": "The printer needs an approved job to release the document. Release therefore establishes approval. A job that is approved but unreleased would fit the sentence too.",
      "reversedPromise": "An approved job could remain unreleased. The rule requires approval for release; it doesn't guarantee release for every approved job. Your arrow would make approval enough."
    },
    {
      "word": "only when",
      "sentence": "The fountain runs only when its pump is switched on.",
      "sentenceTarget": "its pump is switched on",
      "target": "Pump switched on",
      "other": "Fountain runs",
      "left": "Fountain runs",
      "right": "Pump switched on",
      "readback": "If the fountain runs, then its pump is switched on.",
      "why": "If the fountain is running, its pump is switched on. That's what only when requires. The pump could be on while the fountain isn't running; nothing in the sentence rules that out.",
      "reversedPromise": "The pump could be on while the fountain isn't running. That fits the stated requirement. Your arrow would exclude it by turning the pump's switched-on state into a guarantee of running."
    },
    {
      "word": "only where",
      "sentence": "A delivery van stops only where parking is permitted.",
      "sentenceTarget": "parking is permitted",
      "target": "Parking permitted",
      "other": "Delivery van stops",
      "left": "Delivery van stops",
      "right": "Parking permitted",
      "readback": "If a delivery van stops at a location, then parking is permitted there.",
      "why": "A van stopping at a location tells us parking is permitted there. Permission at another location would not meet this condition. Nor does parking permission by itself establish that the van stops.",
      "reversedPromise": "Parking could be permitted somewhere the van never stops. The sentence hasn't promised a stop at every permitted location. Starting from permission would add exactly that promise."
    },
    {
      "word": "always",
      "sentence": "A reserved desk always has a name tag.",
      "sentenceTarget": "has a name tag",
      "target": "Has name tag",
      "other": "Reserved desk",
      "left": "Reserved desk",
      "right": "Has name tag",
      "readback": "If a desk is reserved, then it has a name tag.",
      "why": "Every reserved desk has a name tag. Always gives the tag that required role; it doesn't restrict name tags to reserved desks. Finding a tag alone leaves reservation unknown.",
      "reversedPromise": "An unreserved desk could also have a name tag. That leaves every reserved desk tagged, as the rule requires. Your reverse arrow would make every tag proof of a reservation."
    },
    {
      "word": "requires",
      "sentence": "Borrowing a telescope requires a signed checkout form.",
      "sentenceTarget": "a signed checkout form",
      "target": "Has signed checkout form",
      "other": "Borrows telescope",
      "left": "Borrows telescope",
      "right": "Has signed checkout form",
      "readback": "If someone borrows a telescope, then that person has a signed checkout form.",
      "why": "Borrowing the telescope needs a signed checkout form. Signed belongs in the requirement, so an unsigned form would not preserve the sentence. Having the signed form alone doesn't prove the telescope was borrowed.",
      "reversedPromise": "Someone could sign a checkout form without borrowing the telescope. The sentence hasn't ruled that out. Your arrow would turn the signed form into proof of borrowing instead of keeping it a requirement."
    },
    {
      "word": "must",
      "sentence": "A visitor using the workshop must wear safety glasses.",
      "sentenceTarget": "wear safety glasses",
      "target": "Required to wear safety glasses",
      "other": "Visitor uses workshop",
      "left": "Visitor uses workshop",
      "right": "Required to wear safety glasses",
      "readback": "If a visitor uses the workshop, then that visitor is required to wear safety glasses.",
      "why": "Using the workshop gives the visitor an obligation to wear safety glasses. It does not supply a fact proving the visitor wore them. Required to wear safety glasses preserves the claim that must makes here.",
      "reversedPromise": "A visitor in another room could have the same safety-glasses obligation. The sentence doesn't restrict that obligation to workshop users. Your arrow would make the obligation proof that the visitor uses the workshop."
    }
  ]
};
export const flashcardExamples: Record<string, Translation[]> = {
  "group-1": [
    {
      "word": "if",
      "sentence": "An oven light comes on if the door is opened.",
      "target": "Door opened",
      "other": "Oven light comes on",
      "left": "Door opened",
      "right": "Oven light comes on",
      "readback": "If the oven door is opened, then its light comes on.",
      "why": "The sentence gives you the oven light coming on when the door is opened. The if-clause supplies that starting condition even though it comes last. The light being on alone doesn't establish why it came on."
    },
    {
      "word": "when",
      "sentence": "When a parcel reaches the pickup shelf, its status changes.",
      "target": "Parcel reaches pickup shelf",
      "other": "Status changes",
      "left": "Parcel reaches pickup shelf",
      "right": "Status changes",
      "readback": "If a parcel reaches the pickup shelf, then its status changes.",
      "why": "The parcel reaching the pickup shelf is the event that gives us a status change. A change by itself wouldn't establish arrival there; the sentence hasn't said that is the only way the status can change."
    },
    {
      "word": "where",
      "sentence": "Where a garden bed contains seedlings, a shade cover is installed.",
      "target": "Garden bed contains seedlings",
      "other": "Shade cover installed",
      "left": "Garden bed contains seedlings",
      "right": "Shade cover installed",
      "readback": "If a garden bed contains seedlings, then a shade cover is installed over it.",
      "why": "The rule covers a bed containing seedlings. A shade cover is installed over that same bed. Finding a cover over a bed doesn't establish seedlings, since the sentence hasn't restricted covers to those beds."
    },
    {
      "word": "all",
      "sentence": "All notebooks sold in this pack have numbered pages.",
      "target": "Notebook sold in pack",
      "other": "Has numbered pages",
      "left": "Notebook sold in pack",
      "right": "Has numbered pages",
      "readback": "If a notebook is sold in this pack, then it has numbered pages.",
      "why": "Every notebook in this pack has numbered pages. Keep sold in this pack with the notebook; numbered pages alone don't tell you which pack it came from."
    },
    {
      "word": "the only",
      "sentence": "The only photographs displayed in the hallway are black-and-white photographs.",
      "target": "Photograph displayed in hallway",
      "other": "Black-and-white photograph",
      "left": "Photograph displayed in hallway",
      "right": "Black-and-white photograph",
      "readback": "If a photograph is displayed in the hallway, then it is black-and-white.",
      "why": "The only points to photographs displayed in the hallway. Any photograph displayed there has to be black-and-white. Being black-and-white alone doesn't establish that a photograph is on that wall."
    },
    {
      "word": "every",
      "sentence": "Every repaired bicycle receives an inspection sticker.",
      "target": "Repaired bicycle",
      "other": "Receives inspection sticker",
      "left": "Repaired bicycle",
      "right": "Receives inspection sticker",
      "readback": "If a bicycle has been repaired, then it receives an inspection sticker.",
      "why": "Choose a repaired bicycle and this rule gives it an inspection sticker. The sentence covers each repaired bicycle; it hasn't told us a sticker can only be given after a repair."
    },
    {
      "word": "any",
      "sentence": "Any ticket purchased at the station includes a printed receipt.",
      "target": "Ticket purchased at station",
      "other": "Includes printed receipt",
      "left": "Ticket purchased at station",
      "right": "Includes printed receipt",
      "readback": "If a ticket is purchased at the station, then it includes a printed receipt.",
      "why": "Any refers to a ticket purchased at the station. That whole condition gives you a printed receipt. Dropping at the station would extend the promise to tickets bought elsewhere."
    }
  ],
  "group-2": [
    {
      "word": "only",
      "sentence": "Only adults rent the power tools.",
      "target": "Adult",
      "other": "Rents power tool",
      "left": "Rents power tool",
      "right": "Adult",
      "readback": "If someone rents a power tool, then that person is an adult.",
      "why": "Only limits power-tool rentals to adults. If someone rents a power tool, the sentence establishes that they're an adult. Being an adult alone doesn't establish that they rent one."
    },
    {
      "word": "only if",
      "sentence": "An app saves a recording only if storage space is available.",
      "target": "Storage space available",
      "other": "App saves recording",
      "left": "App saves recording",
      "right": "Storage space available",
      "readback": "If the app saves a recording, then storage space is available.",
      "why": "Saving the recording requires available storage space. Only if names that requirement. Space could be available with no recording saved, so availability alone doesn't give us saving."
    },
    {
      "word": "only when",
      "sentence": "The porch light switches on only when its sensor detects movement.",
      "target": "Sensor detects movement",
      "other": "Porch light switches on",
      "left": "Porch light switches on",
      "right": "Sensor detects movement",
      "readback": "If the porch light switches on, then its sensor detects movement.",
      "why": "Only when limits the porch light switching on to occasions when its sensor detects movement. If the light switches on, we know movement is detected. Detection alone leaves the light unknown because the sentence doesn't say every detection switches it on."
    },
    {
      "word": "only where",
      "sentence": "The shuttle picks up riders only where there is a marked stop.",
      "target": "Marked stop present",
      "other": "Shuttle picks up riders",
      "left": "Shuttle picks up riders",
      "right": "Marked stop present",
      "readback": "If the shuttle picks up riders at a location, then there is a marked stop there.",
      "why": "Where the shuttle picks up riders, a marked stop has to be present. Keep the pickup and stop at the same location. A marked stop alone doesn't promise that the shuttle picks anyone up there."
    },
    {
      "word": "always",
      "sentence": "A returned rental bike always has a return record.",
      "target": "Has return record",
      "other": "Returned rental bike",
      "left": "Returned rental bike",
      "right": "Has return record",
      "readback": "If a rental bike has been returned, then it has a return record.",
      "why": "Every returned rental bike has a return record, so a return establishes the record. That's why the record belongs on the right. The sentence doesn't tell us that every bike with a return record has been returned."
    },
    {
      "word": "requires",
      "sentence": "Joining the pottery class requires a registration form.",
      "target": "Has registration form",
      "other": "Joins pottery class",
      "left": "Joins pottery class",
      "right": "Has registration form",
      "readback": "If someone joins the pottery class, then that person has a registration form.",
      "why": "What does joining the pottery class require? A registration form. The sentence makes the form necessary for joining, but someone could have a form without joining the class."
    },
    {
      "word": "must",
      "sentence": "A cyclist entering the track must wear a helmet.",
      "target": "Required to wear helmet",
      "other": "Cyclist enters track",
      "left": "Cyclist enters track",
      "right": "Required to wear helmet",
      "readback": "If a cyclist enters the track, then that cyclist is required to wear a helmet.",
      "why": "Entering the track gives the cyclist a requirement to wear a helmet. It doesn't establish compliance. Keep required to wear helmet in the diagram so the stated obligation remains an obligation."
    }
  ]
};
function TargetSentence({ item, marked }: { item: MappedTranslation; marked: boolean }) {
  const figure = useRef<HTMLElement>(null);
  const sentence = useRef<HTMLQuoteElement>(null);
  const indicator = useRef<HTMLElement>(null);
  const target = useRef<HTMLElement>(null);
  const [connector, setConnector] = useState<string | null>(null);
  const indicatorStart = item.sentence.toLowerCase().indexOf(item.word.toLowerCase());
  const targetStart = item.sentence.indexOf(item.sentenceTarget);
  if (indicatorStart < 0 || targetStart < 0) throw new Error(`Missing authored sentence span: ${item.sentence}`);
  const spans = [
    { start: indicatorStart, end: indicatorStart + item.word.length, kind: 'indicator' },
    { start: targetStart, end: targetStart + item.sentenceTarget.length, kind: 'target' },
  ].sort((a, b) => a.start - b.start);
  if (spans[0].end > spans[1].start) throw new Error(`Overlapping authored sentence spans: ${item.sentence}`);

  useLayoutEffect(() => {
    if (!marked) { setConnector(null); return; }
    const update = () => {
      if (!figure.current || !sentence.current || !indicator.current || !target.current) return;
      const origin = figure.current.getBoundingClientRect();
      const firstRects = indicator.current.getClientRects();
      const targetRects = target.current.getClientRects();
      const first = firstRects[firstRects.length - 1];
      const last = targetRects[targetRects.length - 1];
      if (!first?.width || !last?.width) return;
      const x1 = (first.left + first.right) / 2 - origin.left;
      const x2 = (last.left + last.right) / 2 - origin.left;
      // Project both marked spans into a dedicated rail below the whole sentence.
      // Starting under an early line could otherwise cross a later wrapped clause.
      const railTop = sentence.current.getBoundingClientRect().bottom - origin.top + 10;
      const baseline = railTop + 28;
      setConnector(`M ${x1} ${railTop} V ${baseline} H ${x2} V ${railTop}`);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (figure.current) observer?.observe(figure.current);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, [item.sentence, marked]);

  if (!marked) return <blockquote>{item.sentence}</blockquote>;
  return <figure className="co-target-sentence" ref={figure}>
    <blockquote ref={sentence}>{item.sentence.slice(0, spans[0].start)}
      <mark className={`co-sentence-${spans[0].kind}`} ref={spans[0].kind === 'indicator' ? indicator : target}>{item.sentence.slice(spans[0].start, spans[0].end)}</mark>
      {item.sentence.slice(spans[0].end, spans[1].start)}
      <mark className={`co-sentence-${spans[1].kind}`} ref={spans[1].kind === 'indicator' ? indicator : target}>{item.sentence.slice(spans[1].start, spans[1].end)}</mark>
      {item.sentence.slice(spans[1].end)}
    </blockquote>
    {connector && <svg className="co-target-connector" aria-hidden="true"><path d={connector}/></svg>}
    <figcaption><span>Expression: <strong>{item.word}</strong></span><span>Complete target: <strong>{item.target}</strong></span></figcaption>
  </figure>;
}

function TranslationLab({ id }: { id: string }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [diagram, setDiagram] = useState(false);
  const item = translationExamples[id][index];
  return <div className="co-lab"><p className="co-kicker">Which words does the expression refer to?</p><div className="co-word-tabs" role="group" aria-label="Indicator examples">{translationExamples[id].map((e, i) => <button key={e.word} aria-pressed={i === index} onClick={() => { setIndex(i); setChoice(null); setDiagram(false); }}>{e.word}</button>)}</div><TargetSentence item={item} marked={choice === item.target}/><p>What is <strong>{item.word}</strong> referring to?</p><div className="co-choices">{orderedConditionalIdeas(item).map(value => <button key={value} aria-pressed={choice === value} onClick={() => { setChoice(value); setDiagram(false); }}>{value}</button>)}</div><div role="status">{choice && <div className={`co-feedback ${choice === item.target ? 'co-correct' : ''}`}><span className="co-answer-state">{choice === item.target ? 'Correct target.' : 'Not quite.'}</span><strong>{choice === item.target ? 'You have the complete target.' : 'You chose the other condition.'}</strong>{choice !== item.target && <p>You chose {choice}, but {item.word} refers to {item.target}. {id === 'group-1' ? 'You selected the result rather than the complete sufficient idea.' : 'You selected the condition that needs the requirement rather than the required idea.'}</p>}<p>{item.why}</p>{choice === item.target && <button className="co-primary" onClick={() => setDiagram(true)}>Show the {id === 'group-1' ? 'sufficient condition on the left' : 'requirement on the right'}</button>}</div>}</div>{diagram && <Arrow left={item.left} right={item.right}/>}</div>;
}
function Flashcards({ id }: { id: string }) {
  const cards = flashcardExamples[id];
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const faceId = useId();
  const card = cards[index];
  return <div className="co-flash"><p className="co-kicker">Recall before revealing · {index + 1} / {cards.length}</p>
    <div className={`co-flash-face ${back ? 'co-flipped' : ''}`}><strong>{card.sentence}</strong><span>Say the complete rule, then compare.</span><div id={faceId} aria-live="polite">{back && <><strong>{card.readback}</strong><p>{card.why}</p></>}</div></div>
    <div className="co-choices"><button aria-expanded={back} aria-controls={faceId} onClick={() => setBack(!back)}>{back ? 'Hide answer' : 'Reveal answer'}</button><button disabled={index === 0} onClick={() => { setIndex(index - 1); setBack(false); }}>Previous sentence</button><button onClick={() => { setIndex((index + 1) % cards.length); setBack(false); }}>{index === cards.length - 1 ? 'Start again' : 'Next sentence'}</button></div><p className="co-small">These examples help you recall the relationship. Your attached drill gives you separate questions.</p></div>;
}
function DirectionSwitch() {
  const [only, setOnly] = useState(false);
  return <div className="co-switch"><div className="co-choices"><button aria-pressed={!only} onClick={() => setOnly(false)}>if</button><button aria-pressed={only} onClick={() => setOnly(true)}>only if</button></div><blockquote>A student enters <mark>{only ? 'only if' : 'if'}</mark> the student has a pass.</blockquote><Arrow left={only ? 'Enters' : 'Has pass'} right={only ? 'Has pass' : 'Enters'}/><p role="status">{only ? 'The pass is required. Having one does not establish entry.' : 'This sentence guarantees entry for a student who has a pass.'}</p></div>;
}
function DiagramBuilder({ id }: { id: string }) {
  const items = diagramExamples[id];
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const item = items[index];
  return <div className="co-lab"><p className="co-kicker">Build the diagram</p><TargetSentence item={item} marked={checked && left === item.left}/><p>Both complete ideas are below. Choose the sufficient condition, the one that gives you enough to establish the other. It belongs on the left of the arrow.</p><div className="co-choices">{orderedConditionalIdeas(item).map(value => <button key={value} aria-pressed={left === value} onClick={() => { setLeft(value); setChecked(false); }}>{value}</button>)}</div>{left && <><Arrow left={left} right={left === item.target ? item.other : item.target}/><button className="co-primary" onClick={() => setChecked(true)}>Check my diagram</button></>}<div role="status">{checked && <div className={`co-feedback ${left === item.left ? 'co-correct' : ''}`}><strong>{left === item.left ? 'Your arrow preserves the relationship.' : 'Your arrow reverses this relationship.'}</strong>{left !== item.left && <p>{item.reversedPromise}</p>}<p>{item.why}</p><p>{item.readback}</p><button onClick={() => { setIndex((index + 1) % items.length); setLeft(null); setChecked(false); }}>{index === items.length - 1 ? 'Practice these again' : 'Next sentence'}</button></div>}</div></div>;
}
type IndicatorExplanation = {
  title: string;
  paragraphs: string[];
  prompt: string;
  reasoning: string[];
  after?: string[];
  check?: { prompt: string; options: string[]; correct: number; feedback: string[] };
};

const indicatorExplanations: Record<string, IndicatorExplanation[]> = {
  'group-1': [
    {
      title: 'If: the starting condition can come last',
      paragraphs: [
        "Read the if-clause first: the report is submitted before noon. The sentence makes that enough for review. Every report meeting that condition is reviewed.",
        "The target of if is the complete idea submitted before noon. It appears second in the sentence, but it still has the sufficient role. Moving a clause doesn't change what guarantees what.",
      ],
      prompt: 'Which fact lets you establish review: submission before noon, or review itself?',
      reasoning: [
        "Submission before noon. That's the condition the rule makes enough for review. Start there and the sentence gives you the other condition.",
        "Starting from review instead would make a new promise about submission time. The original sentence hasn't told us that every reviewed report arrived before noon.",
      ],
      after: [
        "If can do another job. In The archivist asked if the drawer was locked, the sentence reports a question. You can read asked if as asked whether. It doesn't say a locked drawer guarantees an inquiry, or that an inquiry proves the drawer is locked.",
        "We've been told the archivist asked the question. We haven't been given its answer. There is no conditional rule to draw here, so read what the whole sentence says before treating if as a direction instruction.",
      ],
      check: {
        prompt: 'The archivist asked if the drawer was locked. What has the sentence established?',
        options: ['A locked drawer guarantees an inquiry.', 'The drawer was locked.', 'The archivist asked whether the drawer was locked.'],
        correct: 2,
        feedback: [
          'You changed a report of a question into a rule about locked drawers. Asked if tells us what the archivist asked, not what every locked drawer guarantees.',
          "You treated the question as if it supplied its own answer. The sentence establishes that the archivist asked whether the drawer was locked; it doesn't tell us that it was locked.",
          'This preserves the inquiry. Asked if means asked whether here. The sentence tells us a question was asked while leaving its answer open.',
        ],
      },
    },
    {
      title: 'When: an occasion can supply enough information',
      paragraphs: [
        "In this stated rule, the alarm sounding is enough for the staff to evacuate. When refers to that complete event. We're taking the sentence as an exceptionless relationship, rather than predicting what staff usually do.",
        "The staff evacuate when the alarm sounds expresses the same connection. The starting condition can appear after the result without changing its job.",
        "Whenever can express the same recurring relationship: Whenever the alarm sounds, the staff evacuate. Each alarm gives us evacuation in that sentence. It still doesn't tell us that every evacuation follows an alarm.",
      ],
      prompt: 'The staff are evacuating. Does this rule establish that the alarm sounded?',
      reasoning: [
        "No. The sentence tells us what follows when the alarm sounds. It hasn't said that an alarm is the only possible reason for evacuation.",
        "Staff evacuating for another reason would fit the rule. The alarm gives us evacuation; evacuation alone doesn't settle the alarm question.",
      ],
      after: [
        "Now compare When I checked the gallery, a lamp was on. That reports what was true on one visit. It hasn't said checking the gallery always makes a lamp come on, or that a lamp is on every time someone checks.",
        "When can introduce a rule or a reported occasion. Ask whether the whole sentence gives us what holds whenever the condition is met, or tells us what happened on one particular visit. That meaning comes before the diagram.",
      ],
      check: {
        prompt: 'Which sentence gives a conditional rule rather than reporting one occasion?',
        options: ['When I checked the gallery, a lamp was on.', 'Whenever the alarm sounds, the staff evacuate.'],
        correct: 1,
        feedback: [
          "You treated one reported visit as a promise about every visit. The lamp was on when the speaker checked, but the sentence doesn't establish a recurring connection between checking and the lamp.",
          'Whenever states the recurring connection here: each time the alarm sounds, the staff evacuate. That supplies an exceptionless rule in this sentence; the gallery sentence reports one occasion.',
        ],
      },
    },
    {
      title: 'Where: keep the location attached',
      paragraphs: [
        "The sentence tells us about a location where a station is available. At that location, availability is enough for the service to operate. Where refers to the station being available, not to service in some unrelated place.",
        "Keep the location the same on both sides. A short label can save writing, but it still needs to refer to the place the sentence concerns.",
      ],
      prompt: 'A station is available at North Square. What does the rule establish about North Square?',
      reasoning: [
        "The service operates there. The fact puts North Square in the locations covered by this rule.",
        "Read the diagram as: if a station is available at a location, the service operates there. This fact doesn't give us a conclusion about another square whose station status we don't know.",
      ],
    },
    {
      title: 'All: name the complete group',
      paragraphs: [
        "The statement covers each registered guest. Once you know someone is a registered guest, you can conclude that person receives a wristband.",
        "Registered matters. The target of all is the complete group registered guests, so the sufficient condition includes registration. The rule doesn't tell us about every guest regardless of registration.",
      ],
      prompt: "Nora is a guest, but we don't know whether she's registered. Does this rule settle her wristband status?",
      reasoning: [
        "No. The fact doesn't yet put Nora in the complete group the rule covers. She could be registered, but we haven't been told that.",
        "Keep registered in your label. Guest → Receives wristband would extend the rule to people the original sentence hasn't covered.",
      ],
    },
    {
      title: 'The only: read the whole expression',
      paragraphs: [
        "The sentence limits the vehicles permitted inside. Every vehicle in that group has to be electric. Start by asking the only what? The target is vehicles permitted inside, not electric vehicles.",
        "Knowing a vehicle is permitted inside is therefore enough to establish that it is electric. The expression's complete target has the sufficient role.",
      ],
      prompt: 'You learn that a vehicle was permitted inside. What does the sentence tell you about it?',
      reasoning: [
        "It is electric. The rule covers every permitted vehicle, including this one.",
        "The sentence hasn't promised that every electric vehicle is permitted inside. An electric vehicle that is not permitted inside would fit the rule. Whether a vehicle actually enters is a separate question.",
      ],
      after: [
        "This is why the only belongs with our sufficient expressions: the complete group it introduces gives us the starting condition. Read it as a whole expression. We'll compare it with only once we've learned the other group.",
      ],
    },
    {
      title: 'Every: each qualifying case gets the result',
      paragraphs: [
        "Every gives finalist status the same sufficient job that all gave registered-guest status. Pick any person who is a finalist and the sentence settles the invitation question for that person.",
        "The statement doesn't tell us who the finalists are. It tells us what has to be true of each one. A separate fact about a person can let us use that connection.",
      ],
      prompt: 'Someone receives an invitation. Have we established that they are a finalist?',
      reasoning: [
        "No. Every finalist receives one, but the sentence hasn't restricted invitations to finalists.",
        "The rule starts from finalists. It tells you what each finalist gets, not who else might get an invitation. The direction comes from which people the sentence covers, not from which condition seems most important.",
      ],
    },
    {
      title: 'Any: keep the restriction with the person',
      paragraphs: [
        "Any covers each applicant who meets the stated restriction. The complete sufficient idea is that the person is an applicant who submits late. Applicant alone doesn't capture it.",
        "A fee is paid by any applicant who submits late moves the target later in the sentence. It still tells us what follows for late-submitting applicants. Locate what any refers to rather than using sentence position as a placement instruction.",
      ],
      prompt: 'Which label preserves the sufficient condition: Applicant, or Applicant submits late?',
      reasoning: [
        "Applicant submits late. The rule makes that whole condition enough for a fee.",
        "Leaving out submits late changes the statement. It would make every applicant pay a fee, including someone who submitted on time, even though the original sentence hasn't said that.",
      ],
    },
  ],
  'group-2': [
    {
      title: 'Only: find who the result is limited to',
      paragraphs: [
        "Admission is limited to members. If someone is admitted, the sentence tells us they're a member. Only refers to members, and membership has the necessary role.",
        "Ask what the restriction allows you to conclude. Admission tells you membership is present. Membership by itself leaves admission unknown.",
      ],
      prompt: 'Leon is a member. Does this sentence promise that Leon is admitted?',
      reasoning: [
        "No. Membership is required, but a member could remain outside without breaking this rule.",
        "Admitted → Member preserves the restriction on admission. Member → Admitted would add a promise about every member that the sentence hasn't made.",
      ],
      after: [
        "Compare The only people admitted are members. That also tells us every admitted person is a member. The only points to admitted people, the sufficient target. Only members are admitted points to members, the necessary target. Different grammatical targets; the same complete relationship.",
      ],
    },
    {
      title: 'Only if: a condition that must be met',
      paragraphs: [
        "The student needs to complete the project for graduation. Only if makes project completion a requirement; it doesn't make completion a promise of graduation.",
        "The target is the complete condition completes the project. If graduation occurs, that condition has to be met. That is why it belongs on the required side.",
      ],
      prompt: 'If my project is completed, does the sentence establish that I graduate?',
      reasoning: [
        "No. I could complete the project without graduating. The sentence hasn't said completion is the only requirement, or that every student who completes the project graduates.",
        "Graduates → Completes project preserves what graduation requires. Reversing that arrow would turn the requirement into a guarantee.",
      ],
      after: [
        "Watch what changes when only is added to if below. One sentence makes a pass enough for entry. The other requires a pass for entry. Compare what each one lets you conclude from having a pass.",
      ],
    },
    {
      title: 'Only when: an occasion that is required',
      paragraphs: [
        "The sentence restricts reviews to occasions with a filed complaint. A review needs a complaint. Nothing says every complaint produces a review.",
        "Only when a complaint is filed does a review occur moves the required condition to the front. It keeps the same relationship. Find what the sentence requires rather than assuming the first condition goes left.",
      ],
      prompt: 'A complaint has been filed. Does that alone establish that a review occurs?',
      reasoning: [
        "No. A filed complaint with no review fits the sentence. The statement restricts reviews to occasions with a filed complaint; it doesn't say every complaint produces one.",
        "Review occurs → Complaint filed keeps the required occasion on the right. If we learn that a review occurs, this rule lets us conclude a complaint was filed.",
      ],
    },
    {
      title: 'Only where: keep the requirement at the same place',
      paragraphs: [
        "The service needs a station wherever it operates. Only where points to station availability as the requirement.",
        "Compare the Group 1 sentence: Where a station is available, the service operates. That made availability enough. This sentence requires availability for operation. Adding only changes the direction even though both sentences mention the same ideas.",
      ],
      prompt: 'The service operates at South Square. What must be true there?',
      reasoning: [
        "A station is available there. Operation at South Square meets the condition the rule tells us about, so availability is required at that same location.",
        "A station somewhere else wouldn't satisfy this requirement. Read the diagram as: if the service operates at a location, a station is available there.",
      ],
    },
    {
      title: 'Always: identify what holds in every covered case',
      paragraphs: [
        "Read the subject before deciding what always does. This sentence tells us that receiving an invitation holds in every case of someone being a finalist.",
        "Every finalist receives an invitation, so receiving one is necessary for finalist status. Always modifies receives an invitation. A familiar word helps only after we understand its job in the whole sentence.",
      ],
      prompt: 'What is guaranteed here: an invitation for a finalist, or finalist status for anyone invited?',
      reasoning: [
        "An invitation for a finalist. The sentence gives one to every person who meets that condition.",
        "Always hasn't told us that invitations go only to finalists. The invitation belongs on the right as the result each finalist must receive; starting from it would reverse the relationship.",
      ],
    },
    {
      title: 'Requires: the target can come before the word',
      paragraphs: [
        "What does entry require? A current pass. That complete idea is necessary. A pass that has expired doesn't meet the condition the sentence gives us.",
        "Now move the requirement: A current pass is required for entry. The pass comes before required, but its role hasn't changed. Automatically taking the words after the indicator would point you toward entry and reverse the rule.",
      ],
      prompt: 'How would you diagram: A current pass is required for entry?',
      reasoning: [
        "Enters → Has current pass. If someone enters, the required pass is present. The target is a current pass, wherever that phrase appears in the sentence.",
        "Having the pass still doesn't guarantee entry. Someone could keep one in a drawer and never enter. Required means needed for the other condition, not enough to establish that it happened.",
      ],
    },
    {
      title: 'Must: preserve an obligation as an obligation',
      paragraphs: [
        "Here must states what finalists are required to do. If someone is a finalist, that person has an obligation to attend the interview.",
        "The sentence hasn't supplied a fact proving that every finalist complied. Keep required to in the complete target so that your diagram preserves the difference between an obligation and a completed action.",
      ],
      prompt: 'Maya is a finalist. Which follows: she is required to attend, or she actually attended?',
      reasoning: [
        "She is required to attend. Maya is a finalist, and the sentence gives every finalist that obligation.",
        "Actual attendance would need information about what Maya did. Finalist → Attends interview would quietly turn the stated requirement into proof of compliance.",
      ],
      after: [
        "Shortening a label should save writing while preserving the claim. Required to attend interview is longer than attends interview, but here those extra words are doing necessary work.",
      ],
    },
  ],
};

function IndicatorSections({ id }: { id: string }) {
  return <>{indicatorExplanations[id].map((lesson, index) => {
    const item = translationExamples[id][index];
    return <Section key={item.word} title={lesson.title} expressionNumber={index + 1}>
      <blockquote>{item.sentence}</blockquote>
      {lesson.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {id === 'group-2' && item.word === 'only if' && <>
        <p>Try reading the sentence as though it concerns you. Imagine that you graduate and ask what you now have to know about your project. Then try starting from project completion and see whether the sentence settles graduation.</p>
        <p>This is a <strong>Personalized If/Then</strong>. Put yourself in the proposed starting condition, then check what the original sentence requires you to know. We're checking its meaning, not predicting what usually happens to graduates.</p>
        <ThinkPause prompt="If I graduate, what must be true of my project?">
          <p>I've completed it. The sentence requires project completion for anyone who graduates, including me in this imagined case.</p>
          <p>Graduates → Completes project matches that reading. Now try the reverse below.</p>
        </ThinkPause>
      </>}
      <ThinkPause prompt={lesson.prompt}>
        {lesson.reasoning.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <Arrow left={item.left} right={item.right}/>
        <p className="co-readback">{item.readback}</p>
      </ThinkPause>
      {lesson.after?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {lesson.check && <Check {...lesson.check}/>}
      {item.word === 'always' && <div className="co-word-comparison"><div><blockquote>A finalist always receives an invitation.</blockquote><p>Start with a finalist. An invitation follows.</p></div><div><blockquote>A person receiving an invitation is always a finalist.</blockquote><p>Start with an invitation recipient. Finalist status follows. Changing the subject changed the rule, even though both sentences contain always.</p></div></div>}
      {id === 'group-2' && item.word === 'only if' && <DirectionSwitch/>}
    </Section>;
  })}</>;
}

export function Fundamentals() {
  return <>
      <Section title="Sufficient means enough">
        <p>Winning the raffle is enough to know you get a bicycle. That makes winning <strong>sufficient</strong> for getting one under this rule. Sufficient means enough.</p>
        <blockquote>If you win the raffle, you get a bicycle.</blockquote>
        <p>The rule already tells you what follows if you win. We call winning the <strong>sufficient condition</strong>. Here, sufficient means enough to establish getting a bicycle under this particular rule.</p>
        <ThinkPause prompt="You win the raffle. Do you need another fact to know you get a bicycle?">
          <p>No. Winning meets the condition the rule tells us about. The rule and that fact are enough to establish that you get a bicycle.</p>
          <p>This does not make winning the only possible way to get a bicycle. It gives us one way to settle that question.</p>
        </ThinkPause>
      </Section>
      <Section title="Enough does not mean the only way">
        <p>Suppose you do not win. We no longer have the fact that allowed us to use the rule in its stated direction. But that does not settle whether you get a bicycle.</p>
        <ThinkPause prompt="You do not win the raffle. Could you still get a bicycle?">
          <p>Yes. You could buy a bicycle or receive one as a gift. You could also not get one. Neither possibility creates a winner who fails to get a bicycle, so both fit the rule.</p>
          <p>The sentence gives us one condition that settles whether you get a bicycle. It has not said winning is the only route. When that sufficient condition is absent, the other condition may still be true.</p>
        </ThinkPause>
        <p>Use a new rule to check whether you can recognize what is enough.</p>
        <Check prompt="Every delivery marked collected has a pickup receipt. What is sufficient here?" options={['Marked collected', 'Has a pickup receipt']} correct={0} feedback={['Marked collected is enough to establish a pickup receipt. The rule tells us what is true of every delivery with that label.', 'You chose the required result. The sentence gives a receipt to every delivery marked collected; it does not say every delivery with a receipt has that label.']}/>
      </Section>
      <Section title="Necessary means required">
        <p>Now look at the other condition in the same rule. If you win, you have to get a bicycle. Getting one is the required result. That makes getting a bicycle <strong>necessary</strong> whenever you win.</p>
        <p>We call getting a bicycle the <strong>necessary condition</strong>. Necessary means required. Here it is a required result of winning, not a task you must complete before entering the raffle.</p>
        <p>Ask “required for what?” Here, required whenever you win, under this rule. The relationship gives the word its meaning. The word necessary does not tell you which event happens first.</p>
        <ThinkPause prompt="Which result does winning require under this rule?">
          <p>You have to get a bicycle. Otherwise you would win without getting one, which the sentence rules out.</p>
          <p>Winning is enough to establish getting a bicycle, and getting a bicycle is required whenever you win. Those are two views of the same relationship.</p>
        </ThinkPause>
        <div className="co-role-pair"><div><h3>Sufficient</h3><p>Win the raffle: enough to establish getting a bicycle.</p><strong>Goes left</strong></div><div><h3>Necessary</h3><p>Get a bicycle: required whenever you win.</p><strong>Goes right</strong></div></div>
        <p>Now compare what each starting fact tells us. Keep the same rule while you switch between winning and getting a bicycle.</p>
        <GateExplorer/>
      </Section>
      <Section title="Having a requirement does not guarantee the result">
        <p>Let's use a different requirement.</p>
        <blockquote>Entering the archive requires a pass.</blockquote>
        <p>The sentence tells us what someone needs for entry: a pass. If someone enters the archive, they have that pass. That's why has a pass belongs on the required side.</p>
        <Arrow left="Enters the archive" right="Has a pass"/>
        <ThinkPause prompt="Mina has a pass. Does this sentence establish that she entered the archive?">
          <p>No. Mina could have a pass and remain outside. The rule tells us what entry requires; it doesn't tell us that every person with a pass enters.</p>
          <p>Necessary doesn't mean enough. A requirement can be present while the other condition remains unknown. To conclude Mina entered, we'd need information establishing that additional connection.</p>
        </ThinkPause>
        <Check prompt="Every finalist receives an invitation. Which requirement does this sentence establish?" options={['Receiving an invitation is necessary for being a finalist.', 'Being a finalist is necessary for receiving an invitation.']} correct={0} feedback={['The sentence gives an invitation to every finalist. That makes receiving one required for finalist status; it does not restrict invitations to finalists.', "You reversed the requirement. Your choice would mean anyone receiving an invitation has to be a finalist. The sentence allows someone who isn't a finalist to receive an invitation too."]}/>
      </Section>
      <Section title="Try the sentence from the inside">
        <p>We can check a proposed arrow by imagining a case in which its left side is true. Read the original sentence and ask what you now have to know about that same case. Your answer should match the right side of the arrow.</p>
        <p>This is a <strong>Personalized If/Then</strong>. Read the rule as if it concerns you or something of yours. The point is to test what the sentence guarantees, not guess what usually happens.</p>
        <blockquote>If you win the raffle, you get a bicycle.</blockquote>
        <p>For this rule, imagine yourself in the raffle. Keep the same raffle and the same bicycle outcome in mind on both sides.</p>
        <ThinkPause prompt="If I win the raffle, what do I know?">
          <p>I get a bicycle. The rule covers the case in which I win. Win the raffle → Get a bicycle matches what the sentence tells me.</p>
        </ThinkPause>
        <ThinkPause prompt="If I get a bicycle, must I have won the raffle?">
          <p>No. I could get a bicycle without winning by buying one or receiving a gift. That fits the rule because it does not create a winner who fails to get a bicycle.</p>
          <p>Get a bicycle → Win the raffle would make every bicycle receipt proof of winning. The sentence does not give me that direction. Trying both readings lets me catch the reverse instead of accepting an arrow just because it looks familiar.</p>
        </ThinkPause>
      </Section>
      <Section title="Read the roles in the relationship">
        <p>In <strong>Win the raffle → Get a bicycle</strong>, the left condition is sufficient for the right: it is enough to establish it. The right condition is necessary for the left: it is required whenever the left holds.</p>
        <p>These names describe roles in this rule. A different sentence could give the same idea a different role. Don't ask whether a pass is sufficient or necessary by itself. Ask what the complete sentence says having the pass does.</p>
        <p>The next two groups give us ways to recognize these roles in varied wording. We'll keep returning to the meaning because an indicator can only help if you know what complete idea it refers to.</p>
      </Section>
  </>;
}

export function GroupLessons({ id }: { id: string }) {
  const group = GROUPS.find(item => item.id === (id === 'group-1' ? 'g1' : 'g2'))!;
  const first = id === 'group-1';
  return <>
    <Section title={first ? 'Find the sufficient idea' : 'Find what is required'}>
      <p>{first
        ? "A sufficient condition gives you enough information to establish the other condition. Group 1 helps you recognize that job in several kinds of sentence. For example, all registered guests covers the registered guests. It doesn't cover every guest who happens to be nearby. We'll check which people or situations each expression includes."
        : "A necessary condition is something the other condition requires. Group 2 helps us recognize what must be true when that other condition holds. The requirement belongs on the right because the left condition cannot hold without it. Having the requirement, though, leaves the left condition unknown unless something else settles it."}</p>
      <div className="co-vocabulary">{group.words.map(word => <span key={word}>{word}</span>)}</div>
      <p>An <strong>indicator</strong> is an expression that helps us recognize the relationship. Its <strong>target</strong> is the complete idea it refers to. For example, in “All registered guests receive a wristband,” the target of all is registered guests. Leaving out registered would make the rule apply to guests it never covered.</p>
      <p>Before looking for a word, ask what the sentence says. Does it give a rule, cover every member of a group, promise a result, or name something required? Each can tell us that if one condition holds, another must hold. A sentence about what usually happens leaves room for exceptions; a conditional rule makes its consequence certain whenever its sufficient condition holds.</p>
      <p>Read the arrow as <strong>must</strong>. The sufficient condition goes on the left. The necessary condition goes on the right. If the left condition is true, the right condition must be true too. The arrow doesn't say which event happened first, and it doesn't establish that one event caused the other.</p>
    </Section>
    <Section title={first ? 'Different wording can make the same rule' : 'Read it as a requirement'}>
      {first ? <>
        <p>Suppose a studio has this rule: every painting with a silver seal has been inspected. Having the seal is enough to establish inspection. Let's keep that meaning and change the wording.</p>
        <div className="co-word-comparison"><div><blockquote>If a painting has a silver seal, it has been inspected.</blockquote><p>If what? It has a silver seal. That complete idea goes on the left.</p></div><div><blockquote>A painting has been inspected whenever it has a silver seal.</blockquote><p>Whenever what? It has a silver seal. The sufficient condition comes later in this sentence, but it still goes on the left.</p></div></div>
        <Arrow left="Has silver seal" right="Has been inspected"/>
        <p>The indicator can appear at the beginning or in the middle. Sentence position doesn't choose the side of the arrow. Find the idea the expression refers to, then ask what the sentence tells you if that idea is true.</p>
        <ThinkPause prompt="Each painting with a silver seal has been inspected. Did changing every to each change the rule?">
          <p>No. Each still covers every painting with that seal. A painting with the seal that hadn't been inspected would break either statement. Keep has silver seal on the left and has been inspected on the right.</p>
        </ThinkPause>
        <p>Some wording presents a rule: <strong>if, when, whenever</strong>. Some covers a whole group: <strong>all, each, any, every</strong>. Read each in its sentence. Any in “Do you have any paint?” asks a question; it doesn't give us a rule.</p>
        <p>Other sentences promise an outcome: “A silver seal ensures the painting has been inspected” or “A silver seal implies the painting has been inspected.” Here, the promised outcome is inspection. Ensures and implies express the arrow between the two complete ideas. Leads to, will, and always can also express a definite result in a rule, but the word alone doesn't settle the meaning. “The studio will open tomorrow” gives us no sufficient condition to put on the left.</p>
        <p>Try the next sentences by imagining the condition each one covers. If you know a guest is registered, what follows? If you know a report arrived before noon, what follows? Each expression will help us find that starting condition.</p>
      </> : <>
        <p>A useful way to read the whole rule is: <strong>the left condition requires the right condition</strong>. Suppose borrowing a studio camera requires a current membership. What is required for borrowing? A current membership. That's the necessary condition.</p>
        <div className="co-word-comparison"><div><blockquote>Borrowing a studio camera requires a current membership.</blockquote><p>Requires names what borrowing needs: a current membership. An expired membership would not meet that requirement.</p></div><div><blockquote>A current membership is required to borrow a studio camera.</blockquote><p>The same required idea now comes first. Moving it in the sentence hasn't changed what borrowing requires.</p></div></div>
        <Arrow left="Borrows studio camera" right="Has current membership"/>
        <ThinkPause prompt="Mina has a current membership. Does this rule tell us she borrowed a camera?">
          <p>No. Membership is something borrowing requires. Mina could have the membership and never borrow a camera. The rule tells us what we need if she borrows; having what she needs doesn't tell us she did.</p>
        </ThinkPause>
        <p>Notice the meaning shared by <strong>requires, necessitates, depends on,</strong> and <strong>relies on</strong> when they express a strict requirement. If borrowing depends on having a current membership, borrowing still requires membership. “Depends partly on” may describe an influence instead, so read the whole claim before treating it as a conditional.</p>
        <p>You may also hear the requirement as “In order to borrow a camera, you must have a current membership.” The goal is borrowing; the required condition is membership. “Only people with a current membership borrow a camera” and “You borrow a camera only if you have a current membership” keep membership required. Neither tells us that every member borrows one.</p>
        <Check prompt="Using the recording booth depends on having a reservation. What belongs on the right?" options={['Uses recording booth', 'Has a reservation']} correct={1} feedback={['Using the booth is what needs the reservation. Putting use on the right would make a reservation enough to establish that someone used the booth, which the sentence never says.', 'A reservation is required for using the booth, so it belongs on the right. Having a reservation still leaves open whether the person uses it.']}/>
        <p>You won't always see a familiar word. Find what the sentence says is required <strong>for the other condition</strong>. Then check that your arrow keeps that requirement on the right.</p>
      </>}
    </Section>
    {IndicatorSections({ id })}
    <Section id="condition-practice" title={first ? 'Which reports does this rule cover?' : 'What kind of pass does entry require?'}>
      {first ? <>
        <blockquote>A report is reviewed if it is submitted before noon.</blockquote>
        <p>If what? If the report is submitted before noon. Keep before noon with submitted. A report arriving at four in the afternoon does not meet the condition this sentence gives us.</p>
        <p>Now suppose the report does arrive before noon. We know it is reviewed. Submission before noon is enough to establish review, so that condition belongs on the left of our arrow.</p>
      </> : <>
        <blockquote>Entry requires a current pass.</blockquote>
        <p>What does entry require? A current pass. Current matters: an expired pass would not meet the requirement. Requires refers to that complete requirement, even if we rewrite the sentence as “A current pass is required for entry.”</p>
        <p>Suppose someone enters. Under this rule, that person has a current pass. That puts entry on the left and the required pass on the right. Someone with a current pass could still stay outside.</p>
      </>}
      <p>This is the <strong>What Test</strong>: ask what the expression refers to, and answer with the words that make the condition complete. All what? Registered guests. Only if what? A parent signs the consent form. Guest alone drops registration; a parent alone drops the signature.</p>
      <p>Try that question on each sentence below. When your answer includes the complete condition, the sentence will highlight its words. Then show the diagram and ask what you would know if its left condition were true. The right condition should be exactly what the sentence lets you conclude.</p>
      <TranslationLab id={id}/>
    </Section>
    <Section title="Keep the whole condition" dark>
      <blockquote>{first ? 'Any applicant who submits late pays a fee.' : 'Entry requires a current pass.'}</blockquote>
      <p>{first
        ? "Applicant alone isn't the condition. The sentence is about an applicant who submits late. Keep that restriction when you shorten the idea; otherwise your diagram would make a claim about on-time applicants too."
        : "A current pass is required. Has a pass drops current and would include an expired pass. Shortening a label should save writing while preserving what the sentence requires."}</p>
      <Check prompt={first ? 'What goes left in this rule?' : 'What goes right in this rule?'} options={first ? ['Applicant', 'Applicant submits late'] : ['Has current pass', 'Has any pass']} correct={first ? 1 : 0} feedback={first
        ? ['You dropped the late-submission restriction. Applicant alone would cover every applicant, including someone who submits on time. The sufficient idea is applicant submits late.', 'This keeps the complete sufficient idea. The rule covers applicants who submit late, so keep that restriction with the applicant.']
        : ['This keeps the full requirement. Entry needs a current pass; an expired pass does not meet that requirement.', 'You dropped current from the requirement. Has any pass would include an expired pass, which is not what the sentence requires.']}/>
    </Section>
    <Section title={first ? 'Read the only as a complete expression' : 'Compare only with the only'}>
      {first ? <>
        <blockquote>The only people admitted are members.</blockquote>
        <p>The only what? The only people admitted. The complete target is admitted people. If someone is admitted, the sentence tells us they're a member.</p>
        <Arrow left="Admitted" right="Member"/>
        <p>A member who stays outside fits this rule. Nothing says every member is admitted. Check that your diagram keeps that possibility open.</p>
        <Check prompt="The only notebooks kept on this shelf are hardback. Which diagram preserves the rule?" options={['Hardback → Kept on shelf', 'Kept on shelf → Hardback']} correct={1} feedback={['You made being hardback enough for a place on the shelf. The sentence limits the notebooks kept there; it does not put every hardback notebook on this shelf.', 'A notebook kept on this shelf has to be hardback. A hardback notebook on another shelf would also fit the rule, so this direction keeps what the sentence actually says.']}/>
      </> : <>
        <p>Try the distinction on the raffle rule we already understand. The wording changes, but winning still tells us that you get a bicycle.</p>
        <div className="co-word-comparison"><div><blockquote>Only people who get a bicycle win this raffle.</blockquote><p>Only refers to people who get a bicycle. Getting one is required whenever someone wins, so get a bicycle goes right.</p></div><div><blockquote>The only people who win this raffle are people who get a bicycle.</blockquote><p>The only refers to people who win. Winning is enough to establish getting a bicycle, so win the raffle goes left.</p></div></div>
        <Arrow left="Win the raffle" right="Get a bicycle"/>
        <p>Both sentences preserve the same direction. Someone who gets a bicycle as a gift without winning fits both. Neither sentence makes getting a bicycle enough to establish winning.</p>
        <Check prompt="Only registered guests receive wristbands. What follows from receiving a wristband?" options={['The person is a registered guest.', 'Nothing about registration.']} correct={0} feedback={['Only limits wristbands to registered guests, so receiving one establishes that the person is registered.', 'You treated the sentence like all registered guests receive wristbands. Only restricts who receives one, so the wristband does establish that the person is a registered guest.']}/>
      </>}
    </Section>
    <Section title="From sentence to diagram">
      <p>You have seen the expressions with help. Now use a new sentence. Identify both complete ideas, choose the sufficient one for the left, and check whether your diagram says what the sentence says.</p>
      <p>If you know the meaning but hesitate over the arrow, imagine the left condition is true. Does the sentence then require the right condition? Read the whole relationship in English. If it makes a promise the original didn't make, change the direction.</p>
      <DiagramBuilder id={id}/>
      <details className="co-practical-note"><summary>Why write a diagram when I understand the sentence?</summary><p>For one short sentence, you may be able to hold the connection in your head. Here, writing it makes your direction and complete conditions visible so you can check them. If your first diagram doesn't match the meaning, find the exact phrase you misread and revise that part.</p></details>
    </Section>
    <Section title="Say the rule without the clues">
      <p>Read the new sentence and explain its direction before revealing. If you hesitate, ask what the indicator refers to, then try the proposed relationship in ordinary English. Compare your explanation with the one that appears.</p>
      <Flashcards id={id}/>
    </Section>
    <Section title="Check the meaning, not just the word">
      <Check prompt={first ? 'A report is reviewed if submitted before noon. Which is the same rule?' : 'A student graduates only if the project is completed. Which is the same rule?'} options={first ? ['If reviewed, it was submitted before noon.', 'If submitted before noon, it is reviewed.'] : ['If the student graduates, the project was completed.', 'If the project is completed, the student graduates.']} correct={first ? 1 : 0} feedback={first
        ? ['You reversed the if relationship. Submission before noon is enough for review; the sentence has not said review proves when the report was submitted.', 'This preserves the if-clause as the sufficient condition. Submission before noon gives us review even though it appears second in the original sentence.']
        : ['This preserves project completion as a requirement for graduation. It does not turn completing the project into a promise of graduation.', 'You turned the only-if requirement into a guarantee. Graduation requires completion, but the sentence allows a completed project without graduation.']}/>
      <p>The guided practice asks you to write your reasoning with the method beside you. Then the attached drill gives you fresh questions. Use the explanation to inspect the direction and complete conditions, not only whether you chose the same answer.</p>
    </Section>
  </>;
}

function OpeningFigure({ unitId }: { unitId: string }) {
  if (unitId === 'orientation') return <figure className="co-hero-figure co-meaning-figure">
    <p className="co-kicker">What follows if a condition is true</p>
    <p className="co-hero-sentence">What would we know <strong>if</strong> this were true?</p>
    <div className="co-hypothetical-tag">A situation to imagine</div>
    <figcaption>A conditional tells us what must be true if the first condition is true. It doesn't tell us that the first condition actually is true.</figcaption>
  </figure>;
  if (unitId === 'sufficient-necessary') return <figure className="co-hero-figure co-roles-figure">
    <p className="co-kicker">Two views of one rule</p>
    <p className="co-hero-rule">If you win the raffle, you get a bicycle.</p>
    <div className="co-role-compass"><div><span>Enough</span><strong>Win the raffle</strong><small>Establishes getting a bicycle</small></div><div><span>Required</span><strong>Get a bicycle</strong><small>The result winning requires</small></div></div>
    <figcaption>One condition is enough. The other is required by that same rule.</figcaption>
  </figure>;
  if (unitId === 'group-1') return <figure className="co-hero-figure co-sufficient-figure">
    <p className="co-kicker">Read the complete idea</p>
    <p className="co-hero-sentence">A report is reviewed <mark>if</mark> <strong>it is submitted before noon.</strong></p>
    <div className="co-hero-target"><span>What is enough for review?</span><strong>Submission before noon</strong></div>
    <figcaption>The sufficient condition can come last in the sentence.</figcaption>
  </figure>;
  return <figure className="co-hero-figure co-required-figure">
    <p className="co-kicker">Read what the sentence needs</p>
    <p className="co-hero-sentence">Entry requires a <strong>current pass.</strong></p>
    <div className="co-pass-figure"><span>Required for entry</span><strong>A current pass</strong><small>An expired pass won't meet this requirement.</small></div>
    <figcaption>Having the pass alone doesn't establish entry.</figcaption>
  </figure>;
}

function OpeningLessonBody({ unit, onComplete, continueHref, continueLabel = 'Continue to guided practice', previousHref, reviewed }: ConditionalLessonNoteProps) {
  const group = unit.id === 'group-1' || unit.id === 'group-2';
  const orientation = unit.id === 'orientation';
  const title = group ? unit.id === 'group-1' ? 'Group 1: what is enough?' : 'Group 2: what is required?' : orientation ? 'What Are Conditionals?' : 'What is enough? What is required?';
  const repairTitle = orientation ? "Don't turn a rule into a case fact" : unit.id === 'sufficient-necessary' ? "Don't turn a requirement into a guarantee" : unit.id === 'group-1' ? 'Keep the direction and the whole condition' : 'Keep requirements and completed actions distinct';
  const subtitle = orientation
    ? "A conditional tells us that if one thing is true, something else has to be true too. Let's see what we can conclude from a rule, and what we still don't know."
    : group ? unit.id === 'group-1'
      ? 'These expressions can point to the sufficient idea. Read what each one says before deciding which complete condition belongs on the left.'
      : 'These expressions can identify a requirement. Find the complete idea the sentence says you need, then check what its presence does and does not prove.'
    : "The same rule gives its two conditions different jobs. Let's take each one seriously before giving it a place in the diagram.";
  return <div className="conditional-note co-opening">
    <header className={'co-hero ' + (orientation ? 'co-intro-hero' : '')}>
      <div className="co-hero-copy"><p className="co-kicker">Conditional logic</p><h1>{title}</h1><p>{subtitle}</p>
      <a href="#co-reading">{orientation ? 'Start with the meaning' : 'Begin reading'} <span aria-hidden="true">↓</span></a></div>
      <OpeningFigure unitId={unit.id}/>
    </header>
    <article id="co-reading">
      <LessonPages pages={[
        ...(orientation ? conditionalReferencePages() : flattenLessonPages(group ? GroupLessons({ id: unit.id }) : Fundamentals())),
        ...(!orientation && !group ? [{ title: 'Recall the relationship', content: <Section title="Recall the relationship"><p>Leave the examples behind for a moment. Say your answer before turning the card, then compare the reasoning.</p><StudyDeck group="foundation"/></Section> }] : group ? [{ title: 'Recall the expressions', content: <Section title="Recall the expressions"><p>These sentences change the wording and the situation. Explain the complete relationship before turning each card.</p><StudyDeck group={unit.id}/></Section> }] : []),
        ...(!group ? [{ title: 'Return to the relationship', content: <ConditionalOpeningMedia unitId={unit.id}/> }] : []),
        ...(orientation ? [{ title: 'Build a case that proves the limit', content: <Section title="Build a case that proves the limit"><CounterexampleLab/></Section> }] : unit.id === 'group-2' ? [{ title: 'Keep the rule while the words change', content: <Section title="Keep the rule while the words change"><RuleComparisonLab/></Section> }] : []),
        { title: repairTitle, content: <Section id="repair" title={repairTitle}><div className="co-word-comparison"><div><h3>The tempting move</h3><p>{unit.commonMistake.mistake}</p></div><div><h3>Read the sentence again</h3><p>{unit.commonMistake.repair}</p></div></div></Section> },
      ]}>

      <footer className="co-footer">
        <p>{reviewed ? 'You marked this lesson as read. You can return to the examples whenever you need.' : 'Marking this lesson as read records review. Your practice gives you a chance to use the reasoning yourself.'}</p>
        <div className="co-choices">{previousHref && <Link to={previousHref}>Previous lesson</Link>}<button type="button" onClick={onComplete}>{reviewed ? 'Lesson read' : 'Mark lesson as read'}</button><Link className="co-primary" to={continueHref}>{continueLabel} <span aria-hidden="true">→</span></Link></div>
      </footer>
      </LessonPages>
    </article>
  </div>;
}

export function ConditionalOpeningLesson(props: ConditionalLessonNoteProps) {
  return <OpeningLessonBody key={props.unit.id} {...props}/>;
}
