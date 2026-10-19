/**
 * Instruction-page walkthroughs, one per drill. Each step mirrors a step the
 * drill actually asks for, in the same order, using an example sentence that
 * is not one of the drill's own questions.
 */
export type DemoFrame =
  | { kind: 'pick'; words: string[]; picks: number[]; chip: string }
  | { kind: 'type'; lines: { label?: string; text: string }[] }
  | { kind: 'place'; left: string; right: string }
  | { kind: 'choose'; question: string; options: string[]; correct: number };

export type DemoStep = { title: string; caption: string; frame: DemoFrame };
export type DrillDemo = { sentence?: string; steps: DemoStep[] };

const words = (sentence: string) => sentence.split(' ');

function contrapositiveDemo(sentence: string, picks: number[], chip: string, one: string, two: string, s1: string, s2: string, ifThen: string, contraWords: string): DrillDemo {
  return { sentence, steps: [
    { title: 'Find the indicators', caption: 'Click each indicator word, then choose its group.', frame: { kind: 'pick', words: words(sentence), picks, chip } },
    { title: 'Shorten the conditions', caption: 'Write a short phrase for each condition. Keep who it concerns, any restriction, and any negative.', frame: { kind: 'type', lines: [{ label: one, text: s1 }, { label: two, text: s2 }] } },
    { title: 'Build the diagram', caption: 'Put the condition that is enough on the left and what it requires on the right.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: `${s1} → ${s2}` }] } },
    { title: 'Reverse and negate', caption: 'Switch the sides, then turn NOT on for both.', frame: { kind: 'type', lines: [{ label: 'Original', text: `${s1} → ${s2}` }, { label: 'Contrapositive', text: `NOT ${s2} → NOT ${s1}` }] } },
    { title: 'Read the original', caption: 'Write the original rule as an if/then sentence.', frame: { kind: 'type', lines: [{ text: ifThen }] } },
    { title: 'Read the contrapositive', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: contraWords }] } },
  ] };
}

export const drillDemos: Record<string, DrillDemo> = {
  'foundation-practice': { steps: [
    { title: 'Rules and facts', caption: 'Decide what a rule and a fact prove together.', frame: { kind: 'choose', question: 'Rule: If the store is open, its lights are on. Fact: The store is open. What follows?', options: ['The lights are on.', 'Not settled.'], correct: 0 } },
    { title: 'Sufficient and necessary', caption: 'Decide which condition is enough and which is required.', frame: { kind: 'choose', question: 'If the store is open, its lights are on. Which condition is sufficient?', options: ['The store is open', 'The lights are on'], correct: 0 } },
    { title: 'Indicator words', caption: 'Find the word that tells you the rule is conditional.', frame: { kind: 'choose', question: 'Only staff may enter the kitchen. Which word is the indicator?', options: ['staff', 'Only', 'enter'], correct: 1 } },
  ] },
  'sufficient-practice': { sentence: 'Any bike left overnight is moved to the shed.', steps: [
    { title: 'Find the indicator', caption: 'Choose the word that signals a conditional relationship.', frame: { kind: 'choose', question: 'Which word indicates a conditional relationship?', options: ['moved', 'Any', 'shed'], correct: 1 } },
    { title: 'Find the condition', caption: 'Choose the complete condition the indicator points to.', frame: { kind: 'choose', question: 'What complete condition does “Any” identify?', options: ['A bike', 'A bike is left overnight'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Choose the diagram that represents the original rule.', frame: { kind: 'choose', question: 'Which diagram represents the original rule?', options: ['Left overnight → Moved to shed', 'Moved to shed → Left overnight'], correct: 0 } },
    { title: 'Write it in English', caption: 'Rewrite this conditional as if/then.', frame: { kind: 'type', lines: [{ label: 'Your rewrite', text: 'If a bike is left overnight, then it is moved to the shed.' }] } },
  ] },
  'contrapositive-practice': { sentence: 'If the oven is on, the fan runs.', steps: [
    { title: 'Original rule', caption: 'Choose the diagram that keeps the original rule.', frame: { kind: 'choose', question: 'Which original diagram keeps the complete conditions?', options: ['Oven on → Fan runs', 'Fan runs → Oven on'], correct: 0 } },
    { title: 'Reverse and negate', caption: 'Choose the contrapositive: switch the sides and negate both.', frame: { kind: 'choose', question: 'Which diagram is the contrapositive?', options: ['Fan runs → Oven on', 'NOT (Fan runs) → NOT (Oven on)'], correct: 1 } },
    { title: 'Write it in English', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: 'If the fan does not run, then the oven is not on.' }] } },
  ] },
  'mixed-practice': { steps: [
    { title: 'What does the rule cover?', caption: 'Keep the words that limit who the rule covers.', frame: { kind: 'choose', question: 'Every runner wearing a red bib gets water first. Who does the rule cover?', options: ['Every runner', 'Runners wearing a red bib'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Put the condition that is enough on the left.', frame: { kind: 'place', left: 'Runner wears a red bib', right: 'Gets water first' } },
    { title: 'Translate it yourself', caption: 'Write your own diagram before seeing ours.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'Red bib → Water first' }] } },
    { title: 'Does the meaning change?', caption: 'Compare two wordings and decide whether they say the same thing.', frame: { kind: 'choose', question: 'Does “Only runners in red bibs get water first” say the same thing?', options: ['Yes, same rule', 'No, it changes the rule'], correct: 1 } },
    { title: 'Try unfamiliar cases', caption: 'Use the same reasoning on new wording.', frame: { kind: 'choose', question: 'Guests must sign in. What does this tell you?', options: ['Every guest did sign in', 'Signing in is required of every guest'], correct: 1 } },
  ] },
  'and-or-meaning-practice': { sentence: 'A bike is ready to ride if the tires are full and the chain is oiled.', steps: [
    { title: 'Read the facts', caption: 'Check each member of the group against the facts. AND needs every member.', frame: { kind: 'choose', question: 'The tires are full. Nothing is said about the chain. Do the facts establish the whole group?', options: ['Yes, established', 'No, ruled out', 'Not settled yet'], correct: 2 } },
    { title: 'Try an OR', caption: 'OR needs at least one member, and both is allowed.', frame: { kind: 'choose', question: 'Group: the tires are full or the chain is oiled. Both are true. Established?', options: ['Yes, at least one is true', 'No, an OR allows only one'], correct: 0 } },
  ] },
  'and-or-placement-practice': { sentence: 'A ticket scans if the barcode is clear or the number is typed in.', steps: [
    { title: 'Find the group', caption: 'Say which side of the rule holds the group, and whether it is AND or OR.', frame: { kind: 'place', left: 'Barcode clear OR number typed in', right: 'Ticket scans' } },
    { title: 'Decide what the facts settle', caption: 'A fact that reaches one member may settle the rule, or may leave it open.', frame: { kind: 'choose', question: 'The number is typed in. Does the ticket scan?', options: ['It must scan', 'It cannot scan', 'It could be either'], correct: 0 } },
  ] },
  'and-or-whole-group-practice': { sentence: 'A lamp works if the bulb is fitted and the switch is on.', steps: [
    { title: 'Say when the group fails', caption: 'A group fails differently from how it holds. Choose the statement true exactly when it fails.', frame: { kind: 'choose', question: 'Which is the opposite of: the bulb is fitted and the switch is on?', options: ['The bulb is not fitted or the switch is off', 'The bulb is not fitted and the switch is off', 'The bulb is fitted or the switch is off'], correct: 0 } },
  ] },
  'and-or-transfer-practice': { sentence: 'A room is booked if the form is sent and the fee is paid.', steps: [
    { title: 'Shorten the conditions', caption: 'Write a short phrase for each condition. Keep who it concerns, any restriction, and any negative.', frame: { kind: 'type', lines: [{ label: 'The form is sent', text: 'Form sent' }, { label: 'The fee is paid', text: 'Fee paid' }, { label: 'The room is booked', text: 'Room booked' }] } },
    { title: 'Build the diagram', caption: 'Put the group that is enough on the left and what it requires on the right.', frame: { kind: 'place', left: 'Form sent AND fee paid', right: 'Room booked' } },
    { title: 'Flip it', caption: 'Switch the sides, put NOT on every member, and change the group’s connector.', frame: { kind: 'choose', question: 'Which is the contrapositive?', options: ['If the room is not booked, the form is not sent or the fee is not paid', 'If the room is not booked, the form is not sent and the fee is not paid'], correct: 0 } },
  ] },
  'source-intro-identify': { sentence: 'You can board only if you have a ticket.', steps: [
    { title: 'Find the indicators', caption: 'Click each word of the indicator, then choose its group.', frame: { kind: 'pick', words: words('You can board only if you have a ticket.'), picks: [3, 4], chip: 'Group 2: necessary' } },
  ] },
  'source-roles': { sentence: 'Every member who pays dues can vote.', steps: [
    { title: 'Build the diagram', caption: 'Place the condition that is enough on the left and what it requires on the right.', frame: { kind: 'place', left: 'A member pays dues', right: 'That member can vote' } },
  ] },
  'source-intro-diagrams': { sentence: 'If the store is open, the lights are on.', steps: [
    { title: 'Shorten the conditions', caption: 'Use short phrases that keep the complete meaning.', frame: { kind: 'type', lines: [{ label: 'The store is open', text: 'Store open' }, { label: 'The lights are on', text: 'Lights on' }] } },
    { title: 'Build the diagram', caption: 'Put the condition that is enough on the left and what it requires on the right.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'Store open → Lights on' }] } },
  ] },
  'source-rephrase': { sentence: 'Only members may use the pool.', steps: [
    { title: 'Rewrite the rule', caption: 'Rewrite the rule as an if/then sentence without changing its meaning.', frame: { kind: 'type', lines: [{ label: 'Your if/then', text: 'If a person uses the pool, then that person is a member.' }] } },
    { title: 'Find the indicators', caption: 'Click the indicator, then choose its group.', frame: { kind: 'pick', words: words('Only members may use the pool.'), picks: [0], chip: 'Group 2: necessary' } },
    { title: 'Build the diagram', caption: 'Place the condition that is enough on the left.', frame: { kind: 'place', left: 'Uses the pool', right: 'Is a member' } },
  ] },
  'source-intro-diagrams-contrapositive': contrapositiveDemo('Whenever the alarm rings, the doors lock.', [0], 'Group 1: sufficient', 'The alarm rings', 'The doors lock', 'Alarm rings', 'Doors lock', 'If the alarm rings, then the doors lock.', 'If the doors do not lock, then the alarm did not ring.'),
  'source-rephrase-contrapositive': contrapositiveDemo('You may enter only if you are on the list.', [3, 4], 'Group 2: necessary', 'You enter', 'You are on the list', 'Enter', 'On the list', 'If you enter, then you are on the list.', 'If you are not on the list, then you may not enter.'),
  'source-full-translation': contrapositiveDemo('The game is cancelled if it rains.', [4], 'Group 1: sufficient', 'It rains', 'The game is cancelled', 'Rain', 'Game cancelled', 'If it rains, then the game is cancelled.', 'If the game is not cancelled, then it did not rain.'),
  'source-independent': contrapositiveDemo('All pilots must pass a vision test.', [0, 2], 'All: Group 1 · must: Group 2', 'A person is a pilot', 'That person passes a vision test', 'Pilot', 'Passes vision test', 'If a person is a pilot, then that person passes a vision test.', 'If a person does not pass a vision test, then that person is not a pilot.'),
};
