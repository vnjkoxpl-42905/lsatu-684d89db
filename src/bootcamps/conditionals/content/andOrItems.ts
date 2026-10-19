import { group, lit, type Atom } from './andOrLogic';
import type { AndOrItem } from './andOrTasks';

/**
 * Chapter 2 practice and Pop Quiz items. Each item is typed structure (see andOrLogic.ts).
 * Answers, wrong options, hints and logical checks are derived from it; `why` is the only
 * authored explanation. Original examples only: nothing here adapts third-party questions.
 */
const A = (id: string, short: string, yes: string, no: string): Atom => ({ id, short, yes, no });

export interface AndOrDrillSet { id: string; title: string; description: string; instructions: string[]; items: AndOrItem[] }

// ---- Practice 1: Check the whole group -------------------------------------------------

const meaning: AndOrItem[] = [
  { id: 'ao-meaning-1', statement: 'A student gets a seat in the pottery workshop if the student registers and pays the fee.',
    atoms: [A('reg', 'Registers', 'the student registers', 'the student does not register'), A('fee', 'Pays fee', 'the student pays the fee', 'the student does not pay the fee'), A('seat', 'Gets a seat', 'the student gets a seat', 'the student does not get a seat')],
    rule: { sufficient: group('and', lit('reg'), lit('fee')), necessary: group('and', lit('seat')) },
    task: { kind: 'status', side: 'sufficient', facts: { reg: true } },
    why: 'Registering is one member of the group, and AND needs both members. The facts say nothing about the fee, so the group is not settled yet.' },
  { id: 'ao-meaning-2', statement: 'A guest gets a free cookie if the guest follows the shop’s page or joins its mailing list.',
    atoms: [A('follows', 'Follows page', 'the guest follows the shop’s page', 'the guest does not follow the shop’s page'), A('joins', 'Joins list', 'the guest joins the mailing list', 'the guest does not join the mailing list'), A('cookie', 'Free cookie', 'the guest gets a free cookie', 'the guest does not get a free cookie')],
    rule: { sufficient: group('or', lit('follows'), lit('joins')), necessary: group('and', lit('cookie')) },
    task: { kind: 'status', side: 'sufficient', facts: { follows: true, joins: true } },
    why: 'OR needs at least one member, and this guest has both. An OR allows that, so the group is established.' },
  { id: 'ao-meaning-3', statement: 'A kayak is ready to rent out if its life jacket and its paddle are both returned.',
    atoms: [A('jacket', 'Jacket back', 'the life jacket is returned', 'the life jacket is not returned'), A('paddle', 'Paddle back', 'the paddle is returned', 'the paddle is not returned'), A('ready', 'Ready to rent', 'the kayak is ready to rent out', 'the kayak is not ready to rent out')],
    rule: { sufficient: group('and', lit('jacket'), lit('paddle')), necessary: group('and', lit('ready')) },
    task: { kind: 'status', side: 'sufficient', facts: { jacket: false } },
    why: 'AND needs both. The jacket is missing, so the group fails whatever happened to the paddle.' },
  { id: 'ao-meaning-4', statement: 'A guest gets a printed receipt if the guest pays in cash or pays by card.',
    atoms: [A('cash', 'Pays cash', 'the guest pays in cash', 'the guest does not pay in cash'), A('card', 'Pays by card', 'the guest pays by card', 'the guest does not pay by card'), A('receipt', 'Printed receipt', 'the guest gets a printed receipt', 'the guest does not get a printed receipt')],
    rule: { sufficient: group('or', lit('cash'), lit('card')), necessary: group('and', lit('receipt')) },
    task: { kind: 'status', side: 'sufficient', facts: { cash: false } },
    why: 'No cash payment does not end the OR. A card payment could still make the group true, and the facts do not say.' },
  { id: 'ao-meaning-5', statement: 'Ines gets into the museum if she takes the bus or takes the train.',
    atoms: [A('bus', 'Takes bus', 'Ines takes the bus', 'Ines does not take the bus'), A('train', 'Takes train', 'Ines takes the train', 'Ines does not take the train'), A('museum', 'Gets in', 'Ines gets into the museum', 'Ines does not get into the museum')],
    rule: { sufficient: group('or', lit('bus'), lit('train')), necessary: group('and', lit('museum')) },
    task: { kind: 'status', side: 'sufficient', facts: { bus: false, train: false } },
    why: 'An OR fails only when every member fails. Both are denied here, so nothing establishes the group.' },
  { id: 'ao-meaning-6', statement: 'Anyone who works the lab shift must wear goggles, gloves and a coat.',
    atoms: [A('shift', 'Works the shift', 'the person works the lab shift', 'the person does not work the lab shift'), A('goggles', 'Goggles', 'the person wears goggles', 'the person does not wear goggles'), A('gloves', 'Gloves', 'the person wears gloves', 'the person does not wear gloves'), A('coat', 'Coat', 'the person wears a coat', 'the person does not wear a coat')],
    rule: { sufficient: group('and', lit('shift')), necessary: group('and', lit('goggles'), lit('gloves'), lit('coat')) },
    task: { kind: 'status', side: 'necessary', facts: { goggles: true, gloves: true } },
    why: 'The requirement is the whole group of three. Goggles and gloves are met, but nobody has said anything about the coat, so the requirement is not yet established.' },
];

// ---- Practice 2: Read the rule with a group in it ----------------------------------------

const placement: AndOrItem[] = [
  { id: 'ao-placement-1', statement: 'A band is booked for the festival if the contract is signed and the deposit is paid.',
    atoms: [A('contract', 'Contract signed', 'the contract is signed', 'the contract is not signed'), A('deposit', 'Deposit paid', 'the deposit is paid', 'the deposit is not paid'), A('booked', 'Band booked', 'the band is booked', 'the band is not booked')],
    rule: { sufficient: group('and', lit('contract'), lit('deposit')), necessary: group('and', lit('booked')) },
    task: { kind: 'settles', facts: { contract: true }, target: lit('booked') },
    why: 'The two together are enough. The contract alone is not, and no fact supplies the deposit, so this rule does not reach the booking.' },
  { id: 'ao-placement-2', statement: 'A rider gets a discount if the rider shows a student card or a senior card.',
    atoms: [A('student', 'Student card', 'the rider shows a student card', 'the rider does not show a student card'), A('senior', 'Senior card', 'the rider shows a senior card', 'the rider does not show a senior card'), A('discount', 'Discount', 'the rider gets a discount', 'the rider does not get a discount')],
    rule: { sufficient: group('or', lit('student'), lit('senior')), necessary: group('and', lit('discount')) },
    task: { kind: 'settles', facts: { senior: true }, target: lit('discount') },
    why: 'Either card is enough on its own. The senior card is shown, so the discount follows.' },
  { id: 'ao-placement-3', statement: 'Every chef who wins the contest gets a trophy and a cookbook deal.',
    atoms: [A('win', 'Wins contest', 'the chef wins the contest', 'the chef does not win the contest'), A('trophy', 'Trophy', 'the chef gets a trophy', 'the chef does not get a trophy'), A('deal', 'Cookbook deal', 'the chef gets a cookbook deal', 'the chef does not get a cookbook deal')],
    rule: { sufficient: group('and', lit('win')), necessary: group('and', lit('trophy'), lit('deal')) },
    task: { kind: 'settles', facts: { win: true }, target: lit('deal') },
    why: 'The requirement is the whole group. Winning brings every member with it, including the cookbook deal.' },
  { id: 'ao-placement-4', statement: 'Every player selected for the team gets a locker or a parking spot.',
    atoms: [A('selected', 'Selected', 'the player is selected for the team', 'the player is not selected for the team'), A('locker', 'Locker', 'the player gets a locker', 'the player does not get a locker'), A('spot', 'Parking spot', 'the player gets a parking spot', 'the player does not get a parking spot')],
    rule: { sufficient: group('and', lit('selected')), necessary: group('or', lit('locker'), lit('spot')) },
    task: { kind: 'settles', facts: { selected: true }, target: lit('spot') },
    why: 'The rule guarantees at least one of the two. It does not say which, so the parking spot could be true or only the locker could be.' },
  { id: 'ao-placement-5', statement: 'Every guest who checks in early gets a free drink or a snack.',
    atoms: [A('early', 'Checks in early', 'the guest checks in early', 'the guest does not check in early'), A('drink', 'Free drink', 'the guest gets a free drink', 'the guest does not get a free drink'), A('snack', 'Snack', 'the guest gets a snack', 'the guest does not get a snack')],
    rule: { sufficient: group('and', lit('early')), necessary: group('or', lit('drink'), lit('snack')) },
    task: { kind: 'settles', facts: { early: true, drink: false }, target: lit('snack') },
    why: 'The rule guarantees at least one of the two. The drink is ruled out, so the snack is the one that is left.' },
  { id: 'ao-placement-6', statement: 'A trip is booked if the form is submitted and the deposit is paid.',
    atoms: [A('form', 'Form submitted', 'the form is submitted', 'the form is not submitted'), A('deposit', 'Deposit paid', 'the deposit is paid', 'the deposit is not paid'), A('booked', 'Trip booked', 'the trip is booked', 'the trip is not booked'), A('waiver', 'Waiver signed', 'the waiver is signed', 'the waiver is not signed')],
    rule: { sufficient: group('and', lit('form'), lit('deposit')), necessary: group('and', lit('booked')) },
    alsoHolds: [{ statement: 'Every signed waiver comes with a submitted form.', rule: { sufficient: group('and', lit('waiver')), necessary: group('and', lit('form')) } }],
    task: { kind: 'settles', facts: { waiver: true }, target: lit('booked') },
    why: 'The waiver rule reaches the form and stops there. The booking rule still needs the deposit, and nothing supplies it.' },
];

// ---- Practice 3: Say the opposite of the group ----------------------------------------

const wholeGroup: AndOrItem[] = [
  { id: 'ao-group-1', statement: 'A trophy is awarded if the team wins its match and the captain signs the sheet.',
    atoms: [A('win', 'Wins match', 'the team wins its match', 'the team does not win its match'), A('sign', 'Captain signs', 'the captain signs the sheet', 'the captain does not sign the sheet'), A('trophy', 'Trophy awarded', 'a trophy is awarded', 'a trophy is not awarded')],
    rule: { sufficient: group('and', lit('win'), lit('sign')), necessary: group('and', lit('trophy')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 1,
    why: 'Both together make the group true. It fails when at least one is missing: the team does not win, or the captain does not sign. “Not both” is not the same as “neither.”' },
  { id: 'ao-group-2', statement: 'A route is closed if the bridge is flooded or the road is blocked.',
    atoms: [A('flood', 'Bridge flooded', 'the bridge is flooded', 'the bridge is not flooded'), A('block', 'Road blocked', 'the road is blocked', 'the road is not blocked'), A('closed', 'Route closed', 'the route is closed', 'the route is not closed')],
    rule: { sufficient: group('or', lit('flood'), lit('block')), necessary: group('and', lit('closed')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 2,
    why: 'One member is enough to make the group true, so the group fails only when both fail: the bridge is not flooded and the road is not blocked.' },
  { id: 'ao-group-3', statement: 'A package ships if the label is printed and the address is not missing.',
    atoms: [A('label', 'Label printed', 'the label is printed', 'the label is not printed'), A('missing', 'Address missing', 'the address is missing', 'the address is not missing'), A('ships', 'Ships', 'the package ships', 'the package does not ship')],
    rule: { sufficient: group('and', lit('label'), lit('missing', true)), necessary: group('and', lit('ships')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 0,
    why: 'The group fails when the label is not printed or the address is missing. The “not” already on “not missing” cancels, so the address member comes back positive.' },
  { id: 'ao-group-4', statement: 'A visitor is let in if the visitor has a pass or does not carry a bag.',
    atoms: [A('pass', 'Has a pass', 'the visitor has a pass', 'the visitor has no pass'), A('bag', 'Carries a bag', 'the visitor carries a bag', 'the visitor does not carry a bag'), A('in', 'Let in', 'the visitor is let in', 'the visitor is not let in')],
    rule: { sufficient: group('or', lit('pass'), lit('bag', true)), necessary: group('and', lit('in')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 1,
    why: 'The group fails only when both members fail: the visitor has no pass and does carry a bag. Denying “does not carry a bag” gives “carries a bag.”' },
  { id: 'ao-group-5', statement: 'Anyone who enters the bake-off must bring a recipe, a dish and an entry fee.',
    atoms: [A('enter', 'Enters', 'the person enters the bake-off', 'the person does not enter the bake-off'), A('recipe', 'Recipe', 'the person brings a recipe', 'the person does not bring a recipe'), A('dish', 'Dish', 'the person brings a dish', 'the person does not bring a dish'), A('entryFee', 'Entry fee', 'the person brings an entry fee', 'the person does not bring an entry fee')],
    rule: { sufficient: group('and', lit('enter')), necessary: group('and', lit('recipe'), lit('dish'), lit('entryFee')) },
    task: { kind: 'negate', side: 'necessary' }, answerAt: 2,
    why: 'The requirement fails when any one of the three is missing: no recipe, or no dish, or no entry fee.' },
  { id: 'ao-group-6', statement: 'A late notice is sent if the form is late, the form is unsigned, or the fee is unpaid.',
    atoms: [A('late', 'Form late', 'the form is late', 'the form is not late'), A('signed', 'Form signed', 'the form is signed', 'the form is unsigned'), A('paid', 'Fee paid', 'the fee is paid', 'the fee is unpaid'), A('notice', 'Notice sent', 'a late notice is sent', 'a late notice is not sent')],
    rule: { sufficient: group('or', lit('late'), lit('signed', true), lit('paid', true)), necessary: group('and', lit('notice')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 0,
    why: 'The group fails only when all three members fail: the form is not late, the form is signed, and the fee is paid. The two “unsigned” and “unpaid” members flip back to positive.' },
];

// ---- Practice 4: Diagram it and flip it ---------------------------------------------------

const transfer: AndOrItem[] = [
  { id: 'ao-transfer-1', statement: 'A hiker is cleared to start the summit trail if the weather is clear and the permit is valid.',
    atoms: [A('clear', 'Weather clear', 'the weather is clear', 'the weather is not clear'), A('permit', 'Permit valid', 'the permit is valid', 'the permit is not valid'), A('cleared', 'Cleared to start', 'the hiker is cleared to start', 'the hiker is not cleared to start')],
    rule: { sufficient: group('and', lit('clear'), lit('permit')), necessary: group('and', lit('cleared')) },
    task: { kind: 'contrapositive' }, answerAt: 2,
    why: 'Start from the denied requirement: the hiker is not cleared. Then the whole trigger cannot have been met, and a group of two joined by AND fails when at least one is missing.' },
  { id: 'ao-transfer-2', statement: 'If the library lets a visitor stay late, then the visitor has a late pass or is not a minor.',
    atoms: [A('late', 'Stays late', 'the visitor stays late', 'the visitor does not stay late'), A('pass', 'Late pass', 'the visitor has a late pass', 'the visitor has no late pass'), A('minor', 'Is a minor', 'the visitor is a minor', 'the visitor is not a minor')],
    rule: { sufficient: group('and', lit('late')), necessary: group('or', lit('pass'), lit('minor', true)) },
    task: { kind: 'contrapositive' }, answerAt: 0,
    why: 'Deny the requirement as a whole: no late pass and a minor. The “not a minor” member loses its “not” when it is negated.' },
  { id: 'ao-transfer-3', statement: 'A student gets a seat on the field trip if the permission slip is signed or a parent attends.',
    atoms: [A('slip', 'Slip signed', 'the permission slip is signed', 'the permission slip is not signed'), A('parent', 'Parent attends', 'a parent attends', 'no parent attends'), A('seat', 'Gets a seat', 'the student gets a seat', 'the student does not get a seat')],
    rule: { sufficient: group('or', lit('slip'), lit('parent')), necessary: group('and', lit('seat')) },
    task: { kind: 'build', withContrapositive: true },
    why: 'Either member is enough, so they are joined by OR on the left. The contrapositive starts from no seat. An OR fails only when both members fail, so it becomes AND.' },
  { id: 'ao-transfer-4', statement: 'A parcel is accepted for same-day delivery if it is labeled, paid for and under the weight limit.',
    atoms: [A('labeled', 'Labeled', 'the parcel is labeled', 'the parcel is not labeled'), A('paid', 'Paid for', 'the parcel is paid for', 'the parcel is not paid for'), A('light', 'Under weight limit', 'the parcel is under the weight limit', 'the parcel is over the weight limit'), A('accepted', 'Accepted', 'the parcel is accepted for same-day delivery', 'the parcel is not accepted for same-day delivery')],
    rule: { sufficient: group('and', lit('labeled'), lit('paid'), lit('light')), necessary: group('and', lit('accepted')) },
    task: { kind: 'contrapositive' }, answerAt: 1,
    why: 'A parcel that is not accepted cannot have met all three. At least one is missing: not labeled, or not paid for, or over the limit.' },
  { id: 'ao-transfer-5', statement: 'If a swimmer is allowed in the deep end, then the swimmer passed the test and is not wearing floaties.',
    atoms: [A('deep', 'Allowed in deep end', 'the swimmer is allowed in the deep end', 'the swimmer is not allowed in the deep end'), A('test', 'Passed test', 'the swimmer passed the test', 'the swimmer did not pass the test'), A('floaties', 'Wearing floaties', 'the swimmer is wearing floaties', 'the swimmer is not wearing floaties')],
    rule: { sufficient: group('and', lit('deep')), necessary: group('and', lit('test'), lit('floaties', true)) },
    task: { kind: 'build', withContrapositive: true },
    why: 'The requirement is two things: passing the test and not wearing floaties. The contrapositive denies that group, so it becomes OR, and “not wearing floaties” turns into “wearing floaties.”' },
  { id: 'ao-transfer-6', statement: 'A booth opens if the generator runs or the grid is on.',
    atoms: [A('gen', 'Generator runs', 'the generator runs', 'the generator does not run'), A('grid', 'Grid on', 'the grid is on', 'the grid is off'), A('open', 'Booth opens', 'the booth opens', 'the booth does not open')],
    rule: { sufficient: group('or', lit('gen'), lit('grid')), necessary: group('and', lit('open')) },
    task: { kind: 'settles', facts: { open: false }, target: lit('gen') },
    why: 'Either power source alone would have opened the booth. It did not open, so neither can be running. The contrapositive says both fail.' },
];

export const andOrDrills: AndOrDrillSet[] = [
  { id: 'and-or-meaning-practice', title: 'Check the whole group', description: 'Decide whether the facts establish a group joined by AND or by OR. Keep every member in view.',
    instructions: ['Read the rule and the facts.', 'Decide whether the facts establish the whole group, rule it out, or leave it open. A member the facts never mention is not denied.', 'If your answer misses, read the hint and try again. You can ask to see the answer after a second miss.'], items: meaning },
  { id: 'and-or-placement-practice', title: 'Read the rule with a group in it', description: 'Find which side the group is on, then decide what the rules and facts settle.',
    instructions: ['Find the group and the side of the rule it sits on.', 'Decide whether the rules and facts make the condition true, make it false, or leave it open.', 'A fact can reach one member of a group and leave the rest to be shown.'], items: placement },
  { id: 'and-or-whole-group-practice', title: 'Say the opposite of the group', description: 'Choose the statement that denies a whole group, member by member.',
    instructions: ['Read the group and picture a case where it fails.', 'Choose the statement that is true in exactly the cases where the group fails.', 'Some members already carry a “not.” Deny them carefully.'], items: wholeGroup },
  { id: 'and-or-transfer-practice', title: 'Diagram it and flip it', description: 'Build the diagram, take the contrapositive, and use it on fresh rules.',
    instructions: ['Some questions ask you to choose the contrapositive. Others ask you to build the diagram yourself from short versions of the conditions you write.', 'When you build, place every condition, set each connector, and mark each NOT.', 'Your short versions are drafts for your own use. The check is on the arrangement, not on your wording.'], items: transfer },
];

export function getAndOrDrill(id?: string): AndOrDrillSet | undefined {
  return andOrDrills.find(set => set.id === id);
}

// ---- Pop Quizzes (lesson 2.1 to 2.3) -------------------------------------------------------

const quiz1: AndOrItem[] = [
  { id: 'ao-quiz-1-1', statement: 'The slide opens when the lifeguard is on duty and the water is clear.',
    atoms: [A('guard', 'Lifeguard on duty', 'the lifeguard is on duty', 'the lifeguard is not on duty'), A('water', 'Water clear', 'the water is clear', 'the water is not clear'), A('slide', 'Slide opens', 'the slide opens', 'the slide does not open')],
    rule: { sufficient: group('and', lit('guard'), lit('water')), necessary: group('and', lit('slide')) },
    task: { kind: 'status', side: 'sufficient', facts: { guard: true } },
    why: 'The lifeguard is half of the group. AND needs the water to be clear too, and nobody has said so.' },
  { id: 'ao-quiz-1-2', statement: 'An order ships free if it weighs over five kilos or it costs over fifty dollars.',
    atoms: [A('heavy', 'Over five kilos', 'the order weighs over five kilos', 'the order weighs five kilos or less'), A('costly', 'Over fifty dollars', 'the order costs over fifty dollars', 'the order costs fifty dollars or less'), A('free', 'Ships free', 'the order ships free', 'the order does not ship free')],
    rule: { sufficient: group('or', lit('heavy'), lit('costly')), necessary: group('and', lit('free')) },
    task: { kind: 'status', side: 'sufficient', facts: { heavy: false, costly: true } },
    why: 'OR needs one member, and the cost qualifies. The weight does not matter once one member is met.' },
  { id: 'ao-quiz-1-3', statement: 'The club trip runs if at least ten people sign up and a bus is booked.',
    atoms: [A('ten', 'Ten sign up', 'at least ten people sign up', 'fewer than ten people sign up'), A('bus', 'Bus booked', 'a bus is booked', 'no bus is booked'), A('runs', 'Trip runs', 'the club trip runs', 'the club trip does not run')],
    rule: { sufficient: group('and', lit('ten'), lit('bus')), necessary: group('and', lit('runs')) },
    task: { kind: 'status', side: 'sufficient', facts: { ten: false } },
    why: 'Fewer than ten sign up, so one member of the AND is gone. The group cannot be established.' },
  { id: 'ao-quiz-1-4', statement: 'A table is held if the guest confirms by email or confirms by phone.',
    atoms: [A('email', 'Email confirm', 'the guest confirms by email', 'the guest does not confirm by email'), A('phone', 'Phone confirm', 'the guest confirms by phone', 'the guest does not confirm by phone'), A('held', 'Table held', 'the table is held', 'the table is not held')],
    rule: { sufficient: group('or', lit('email'), lit('phone')), necessary: group('and', lit('held')) },
    task: { kind: 'status', side: 'sufficient', facts: { email: false, phone: false } },
    why: 'Both members are denied, and an OR fails only when every member fails. The group is not established.' },
];

const quiz2: AndOrItem[] = [
  { id: 'ao-quiz-2-1', statement: 'A card is activated if the card is signed and the phone number is verified.',
    atoms: [A('signed', 'Card signed', 'the card is signed', 'the card is not signed'), A('verified', 'Number verified', 'the phone number is verified', 'the phone number is not verified'), A('active', 'Card activated', 'the card is activated', 'the card is not activated')],
    rule: { sufficient: group('and', lit('signed'), lit('verified')), necessary: group('and', lit('active')) },
    task: { kind: 'settles', facts: { signed: true }, target: lit('active') },
    why: 'Both together are enough. Signing alone is not, so this rule does not settle the activation.' },
  { id: 'ao-quiz-2-2', statement: 'A coupon is accepted if it is printed or shown on a phone.',
    atoms: [A('printed', 'Printed', 'the coupon is printed', 'the coupon is not printed'), A('phone', 'On a phone', 'the coupon is shown on a phone', 'the coupon is not shown on a phone'), A('accepted', 'Accepted', 'the coupon is accepted', 'the coupon is not accepted')],
    rule: { sufficient: group('or', lit('printed'), lit('phone')), necessary: group('and', lit('accepted')) },
    task: { kind: 'settles', facts: { printed: true }, target: lit('accepted') },
    why: 'Either way is enough on its own. The coupon is printed, so it is accepted.' },
  { id: 'ao-quiz-2-3', statement: 'Every player on the roster has a jersey and a locker.',
    atoms: [A('roster', 'On the roster', 'the player is on the roster', 'the player is not on the roster'), A('jersey', 'Jersey', 'the player has a jersey', 'the player has no jersey'), A('locker', 'Locker', 'the player has a locker', 'the player has no locker')],
    rule: { sufficient: group('and', lit('roster')), necessary: group('and', lit('jersey'), lit('locker')) },
    task: { kind: 'settles', facts: { roster: true }, target: lit('locker') },
    why: 'The requirement is the whole group. A player on the roster has every member of it, the locker included.' },
  { id: 'ao-quiz-2-4', statement: 'Every order over fifty dollars ships free or comes with a gift.',
    atoms: [A('over', 'Over fifty dollars', 'the order is over fifty dollars', 'the order is fifty dollars or less'), A('free', 'Ships free', 'the order ships free', 'the order does not ship free'), A('gift', 'Gift', 'the order comes with a gift', 'the order comes with no gift')],
    rule: { sufficient: group('and', lit('over')), necessary: group('or', lit('free'), lit('gift')) },
    task: { kind: 'settles', facts: { over: true }, target: lit('free') },
    why: 'The rule guarantees at least one of the two. It does not say which, so free shipping could be true or only the gift could be.' },
];

const quiz3: AndOrItem[] = [
  { id: 'ao-quiz-3-1', statement: 'A report is accepted if it is on time and complete.',
    atoms: [A('ontime', 'On time', 'the report is on time', 'the report is late'), A('complete', 'Complete', 'the report is complete', 'the report is incomplete'), A('accepted', 'Accepted', 'the report is accepted', 'the report is not accepted')],
    rule: { sufficient: group('and', lit('ontime'), lit('complete')), necessary: group('and', lit('accepted')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 2,
    why: 'The group fails when at least one member fails: the report is late or incomplete.' },
  { id: 'ao-quiz-3-2', statement: 'A ticket is refunded if the event is cancelled or the event is moved.',
    atoms: [A('cancelled', 'Cancelled', 'the event is cancelled', 'the event is not cancelled'), A('moved', 'Moved', 'the event is moved', 'the event is not moved'), A('refund', 'Refunded', 'the ticket is refunded', 'the ticket is not refunded')],
    rule: { sufficient: group('or', lit('cancelled'), lit('moved')), necessary: group('and', lit('refund')) },
    task: { kind: 'negate', side: 'sufficient' }, answerAt: 0,
    why: 'The group fails only when both members fail: the event is not cancelled and not moved.' },
  { id: 'ao-quiz-3-3', statement: 'A student joins the choir if the student auditions and attends rehearsal.',
    atoms: [A('audition', 'Auditions', 'the student auditions', 'the student does not audition'), A('rehearsal', 'Attends rehearsal', 'the student attends rehearsal', 'the student does not attend rehearsal'), A('choir', 'Joins the choir', 'the student joins the choir', 'the student does not join the choir')],
    rule: { sufficient: group('and', lit('audition'), lit('rehearsal')), necessary: group('and', lit('choir')) },
    task: { kind: 'contrapositive' }, answerAt: 1,
    why: 'No choir means the whole trigger was not met, so at least one member is missing: no audition, or no rehearsal.' },
  { id: 'ao-quiz-3-4', statement: 'If a tent is approved for the campsite, then it is waterproof or it has a rain cover.',
    atoms: [A('approved', 'Approved', 'the tent is approved', 'the tent is not approved'), A('waterproof', 'Waterproof', 'the tent is waterproof', 'the tent is not waterproof'), A('cover', 'Rain cover', 'the tent has a rain cover', 'the tent has no rain cover')],
    rule: { sufficient: group('and', lit('approved')), necessary: group('or', lit('waterproof'), lit('cover')) },
    task: { kind: 'contrapositive' }, answerAt: 0,
    why: 'Deny the whole requirement: not waterproof and no rain cover. Then the tent cannot be approved.' },
];

export const andOrQuizzes: Record<string, AndOrItem[]> = { 'and-or-both-or-either': quiz1, 'and-or-either-side': quiz2, 'and-or-negate-group': quiz3 };

// ---- Worked examples carried through the lessons (never used as practice items) -------------

const gym: Atom[] = [A('map', 'Map', 'the hiker has a map', 'the hiker has no map'), A('compass', 'Compass', 'the hiker has a compass', 'the hiker has no compass')];
export const andOrLessonAtoms = { hike: gym } as const;

export const placementExamples: { id: string; label: string; item: AndOrItem; probes: { fact: Record<string, boolean>; label: string }[] }[] = [
  { id: 'both-trigger', label: 'Both together are enough',
    item: { id: 'ex-both-trigger', statement: 'A team qualifies for the regional round if it submits a project and passes inspection.',
      atoms: [A('project', 'Submits project', 'the team submits a project', 'the team does not submit a project'), A('inspection', 'Passes inspection', 'the team passes inspection', 'the team does not pass inspection'), A('regional', 'Regional round', 'the team qualifies for the regional round', 'the team does not qualify for the regional round')],
      rule: { sufficient: group('and', lit('project'), lit('inspection')), necessary: group('and', lit('regional')) }, task: { kind: 'settles', facts: {}, target: lit('regional') }, why: '' },
    probes: [{ label: 'Project submitted', fact: { project: true } }, { label: 'Project submitted and inspection passed', fact: { project: true, inspection: true } }] },
  { id: 'either-trigger', label: 'Either one is enough',
    item: { id: 'ex-either-trigger', statement: 'A student gets extra time if a doctor’s note or an accommodation letter is on file.',
      atoms: [A('note', 'Doctor’s note', 'a doctor’s note is on file', 'no doctor’s note is on file'), A('letter', 'Accommodation letter', 'an accommodation letter is on file', 'no accommodation letter is on file'), A('time', 'Extra time', 'the student gets extra time', 'the student does not get extra time')],
      rule: { sufficient: group('or', lit('note'), lit('letter')), necessary: group('and', lit('time')) }, task: { kind: 'settles', facts: {}, target: lit('time') }, why: '' },
    probes: [{ label: 'Only the note is on file', fact: { note: true, letter: false } }, { label: 'Only the letter is on file', fact: { note: false, letter: true } }, { label: 'Neither is on file', fact: { note: false, letter: false } }] },
  { id: 'both-required', label: 'Every member is required',
    item: { id: 'ex-both-required', statement: 'Every admitted applicant receives a scholarship and a housing offer.',
      atoms: [A('admitted', 'Admitted', 'the applicant is admitted', 'the applicant is not admitted'), A('scholarship', 'Scholarship', 'the applicant receives a scholarship', 'the applicant does not receive a scholarship'), A('housing', 'Housing offer', 'the applicant receives a housing offer', 'the applicant does not receive a housing offer')],
      rule: { sufficient: group('and', lit('admitted')), necessary: group('and', lit('scholarship'), lit('housing')) }, task: { kind: 'settles', facts: {}, target: lit('housing') }, why: '' },
    probes: [{ label: 'Admitted', fact: { admitted: true } }, { label: 'No housing offer', fact: { housing: false } }] },
  { id: 'one-required', label: 'At least one is required',
    item: { id: 'ex-one-required', statement: 'Every volunteer who finishes training gets a shirt or a badge.',
      atoms: [A('trained', 'Finishes training', 'the volunteer finishes training', 'the volunteer does not finish training'), A('shirt', 'Shirt', 'the volunteer gets a shirt', 'the volunteer gets no shirt'), A('badge', 'Badge', 'the volunteer gets a badge', 'the volunteer gets no badge')],
      rule: { sufficient: group('and', lit('trained')), necessary: group('or', lit('shirt'), lit('badge')) }, task: { kind: 'settles', facts: {}, target: lit('badge') }, why: '' },
    probes: [{ label: 'Finished training', fact: { trained: true } }, { label: 'Finished training, got no shirt', fact: { trained: true, shirt: false } }] },
];

export const negationExamples: { id: string; item: AndOrItem }[] = [
  { id: 'float', item: { id: 'ex-float', statement: 'A parade float is approved if its brakes pass and its lights work.',
    atoms: [A('brakes', 'Brakes pass', 'the brakes pass', 'the brakes do not pass'), A('lights', 'Lights work', 'the lights work', 'the lights do not work'), A('approved', 'Float approved', 'the float is approved', 'the float is not approved')],
    rule: { sufficient: group('and', lit('brakes'), lit('lights')), necessary: group('and', lit('approved')) }, task: { kind: 'contrapositive' }, why: '' } },
  { id: 'pool', item: { id: 'ex-pool', statement: 'If the pool is open to swimmers, then the lifeguard is on duty or the pool is not crowded.',
    atoms: [A('open', 'Pool open', 'the pool is open to swimmers', 'the pool is closed to swimmers'), A('guard', 'Lifeguard on duty', 'the lifeguard is on duty', 'the lifeguard is not on duty'), A('crowded', 'Pool crowded', 'the pool is crowded', 'the pool is not crowded')],
    rule: { sufficient: group('and', lit('open')), necessary: group('or', lit('guard'), lit('crowded', true)) }, task: { kind: 'contrapositive' }, why: '' } },
  { id: 'orfloat', item: { id: 'ex-or', statement: 'A tablet counts as charged if it is plugged in or the battery pack is attached.',
    atoms: [A('plug', 'Plugged in', 'the tablet is plugged in', 'the tablet is not plugged in'), A('pack', 'Battery pack', 'the battery pack is attached', 'the battery pack is not attached'), A('charged', 'Counts as charged', 'the tablet counts as charged', 'the tablet does not count as charged')],
    rule: { sufficient: group('or', lit('plug'), lit('pack')), necessary: group('and', lit('charged')) }, task: { kind: 'contrapositive' }, why: '' } },
];
