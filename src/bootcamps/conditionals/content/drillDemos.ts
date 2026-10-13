/**
 * Instruction-page walkthroughs, one per drill. Each step mirrors a step the
 * drill actually asks for, in the same order, using an example sentence that
 * is not one of the drill's own questions.
 */
export type DemoFrame =
  | { kind: 'pick'; words: string[]; picks: number[]; spans?: [number, number][]; chip: string }
  | { kind: 'type'; lines: { label?: string; text: string }[] }
  | { kind: 'place'; left: string; right: string }
  | { kind: 'choose'; question: string; options: string[]; correct: number };

export type DemoStep = { title: string; caption: string; frame: DemoFrame };
export type DrillDemo = { sentence?: string; steps: DemoStep[] };

const words = (sentence: string) => sentence.split(' ');
function conditionGroups(sentence: string, indicators: number[]): [number, number][] {
  const tokens = words(sentence);
  const boundary = tokens.findIndex(word => word.endsWith(','));
  if (boundary >= 0) return [[indicators.includes(0) ? 1 : 0, boundary], [boundary + 1, tokens.length - 1]];
  if (sentence.startsWith('All pilots')) return [[1, 1], [3, tokens.length - 1]];
  return [[0, indicators[0] - 1], [indicators[indicators.length - 1] + 1, tokens.length - 1]];
}

function contrapositiveDemo(sentence: string, picks: number[], chip: string, one: string, two: string, s1: string, s2: string, ifThen: string, contraWords: string): DrillDemo {
  return { sentence, steps: [
    { title: 'Find the indicators', caption: 'Click each indicator word, then choose its group.', frame: { kind: 'pick', words: words(sentence), picks, chip } },
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words(sentence), picks: words(sentence).map((_, i) => i).filter(i => !picks.includes(i)), spans: conditionGroups(sentence, picks), chip: 'Both conditions marked' } },
    { title: 'Define your symbols', caption: 'Give each condition its own letter, and reuse it.', frame: { kind: 'type', lines: [{ text: `${s1} = ${one.toLowerCase()}` }, { text: `${s2} = ${two.toLowerCase()}` }] } },
    { title: 'Build the diagram', caption: 'Put your letters in the slots: what is enough on the left, what it requires on the right.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: `${s1} → ${s2}` }] } },
    { title: 'Flip and negate', caption: 'Flip the sides, then turn NOT on for both.', frame: { kind: 'type', lines: [{ label: 'Original', text: `${s1} → ${s2}` }, { label: 'Contrapositive', text: `NOT ${s2} → NOT ${s1}` }] } },
    { title: 'Read the original', caption: 'Write the original rule as an if/then sentence.', frame: { kind: 'type', lines: [{ text: ifThen }] } },
    { title: 'Read the contrapositive', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: contraWords }] } },
  ] };
}

export const drillDemos: Record<string, DrillDemo> = {
  'foundation-practice': { steps: [
    { title: 'Rules and facts', caption: 'Decide what a rule and a fact prove together.', frame: { kind: 'choose', question: 'Rule: If the store is open, its lights are on. Fact: The store is open. What follows?', options: ['The lights are on.', 'Not settled.'], correct: 0 } },
    { title: 'Sufficient and necessary', caption: 'Decide which condition is enough and which is required.', frame: { kind: 'choose', question: 'If the store is open, its lights are on. Which condition is sufficient?', options: ['The store is open', 'The lights are on'], correct: 0 } },
    { title: 'Indicator words', caption: 'Find the word that tells you the rule is conditional.', frame: { kind: 'choose', question: 'Every runner on the team gets a jersey. Which word is the indicator?', options: ['runner', 'Every', 'jersey'], correct: 1 } },
  ] },
  'sufficient-practice': { sentence: 'Any bike left overnight is moved to the shed.', steps: [
    { title: 'Find the indicator', caption: 'Choose the word that introduces what is enough.', frame: { kind: 'choose', question: 'Which indicator introduces the sufficient condition?', options: ['moved', 'Any', 'shed'], correct: 1 } },
    { title: 'Find the condition', caption: 'Choose the complete condition the indicator points to.', frame: { kind: 'choose', question: 'What complete condition does “Any” identify?', options: ['A bike', 'A bike is left overnight'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Choose the direction that keeps the rule.', frame: { kind: 'choose', question: 'Which diagram keeps the rule?', options: ['Left overnight → Moved to shed', 'Moved to shed → Left overnight'], correct: 0 } },
    { title: 'Write it in English', caption: 'Write your diagram as an if/then sentence, then compare it with ours.', frame: { kind: 'type', lines: [{ label: 'Your if/then sentence', text: 'If a bike is left overnight, then it is moved to the shed.' }] } },
  ] },
  'contrapositive-practice': { sentence: 'If the oven is on, the fan runs.', steps: [
    { title: 'Original rule', caption: 'Choose the diagram that keeps the original rule.', frame: { kind: 'choose', question: 'Which original diagram keeps the complete conditions?', options: ['Oven on → Fan runs', 'Fan runs → Oven on'], correct: 0 } },
    { title: 'Flip and negate', caption: 'Choose the contrapositive: switch the sides and negate both.', frame: { kind: 'choose', question: 'Which diagram is the contrapositive?', options: ['Fan runs → Oven on', 'NOT (Fan runs) → NOT (Oven on)'], correct: 1 } },
    { title: 'Write it in English', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: 'If the fan does not run, then the oven is not on.' }] } },
  ] },
  'mixed-practice': { steps: [
    { title: 'What does the rule cover?', caption: 'Keep the words that limit who the rule covers.', frame: { kind: 'choose', question: 'Every runner wearing a red bib gets water first. Who does the rule cover?', options: ['Every runner', 'Runners wearing a red bib'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Put the condition that is enough on the left.', frame: { kind: 'place', left: 'Runner wears a red bib', right: 'Gets water first' } },
    { title: 'Translate it yourself', caption: 'Write your own diagram before seeing ours.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'Red bib → Water first' }] } },
    { title: 'Does the meaning change?', caption: 'Compare two wordings and decide whether they say the same thing.', frame: { kind: 'choose', question: 'Does “Only runners in red bibs get water first” say the same thing?', options: ['Yes, same rule', 'No, it changes the rule'], correct: 1 } },
    { title: 'Try unfamiliar cases', caption: 'Use the same reasoning on new wording.', frame: { kind: 'choose', question: 'Guests must sign in. What does this tell you?', options: ['Every guest did sign in', 'Signing in is required of every guest'], correct: 1 } },
  ] },
  'source-intro-identify': { sentence: 'The ferry leaves only if the captain is aboard.', steps: [
    { title: 'Find the indicators', caption: 'Click each word of the indicator, then choose its group.', frame: { kind: 'pick', words: words('The ferry leaves only if the captain is aboard.'), picks: [3, 4], chip: 'Group 2: necessary' } },
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('The ferry leaves only if the captain is aboard.'), picks: [0, 1, 2, 5, 6, 7, 8], spans: [[0, 2], [5, 8]], chip: 'Both conditions marked' } },
  ] },
  'source-roles': { sentence: 'Every hiker who reaches the summit gets a badge.', steps: [
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('Every hiker who reaches the summit gets a badge.'), picks: [1, 2, 3, 4, 5, 6, 7, 8], spans: [[1, 5], [6, 8]], chip: 'Both conditions marked' } },
    { title: 'Build the diagram', caption: 'Place the condition that is enough on the left and what it requires on the right.', frame: { kind: 'place', left: 'A hiker reaches the summit', right: 'That hiker gets a badge' } },
  ] },
  'source-intro-diagrams': { sentence: 'If the bakery is closed, its ovens are off.', steps: [
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('If the bakery is closed, its ovens are off.'), picks: [1, 2, 3, 4, 5, 6, 7, 8], spans: [[1, 4], [5, 8]], chip: 'Both conditions marked' } },
    { title: 'Define your symbols', caption: 'Give each condition its own letter.', frame: { kind: 'type', lines: [{ text: 'C = the bakery is closed' }, { text: 'O = its ovens are off' }] } },
    { title: 'Build the diagram', caption: 'Put your letters in the slots: what is enough on the left.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'C → O' }] } },
  ] },
  'source-rephrase': { sentence: 'Only members may use the pool.', steps: [
    { title: 'Rewrite the rule', caption: 'Rewrite the rule as an if/then sentence without changing its meaning.', frame: { kind: 'type', lines: [{ label: 'Your if/then', text: 'If a person may use the pool, then that person is a member.' }] } },
    { title: 'Find the indicators', caption: 'Click the indicator, then choose its group.', frame: { kind: 'pick', words: words('Only members may use the pool.'), picks: [0], chip: 'Group 2: necessary' } },
    { title: 'Build the diagram', caption: 'Place the condition that is enough on the left.', frame: { kind: 'place', left: 'May use the pool', right: 'Is a member' } },
  ] },
  'source-intro-diagrams-contrapositive': contrapositiveDemo('Whenever the kettle boils, the light switches off.', [0], 'Group 1: sufficient', 'The kettle boils', 'The light switches off', 'K', 'L', 'If the kettle boils, then the light switches off.', 'If the light does not switch off, then the kettle did not boil.'),
  'source-rephrase-contrapositive': contrapositiveDemo('You may enter only if you are on the list.', [3, 4], 'Group 2: necessary', 'You may enter', 'You are on the list', 'E', 'L', 'If you may enter, then you are on the list.', 'If you are not on the list, then you may not enter.'),
  'source-full-translation': contrapositiveDemo('The game is cancelled if it rains.', [4], 'Group 1: sufficient', 'It rains', 'The game is cancelled', 'R', 'C', 'If it rains, then the game is cancelled.', 'If the game is not cancelled, then it did not rain.'),
  'source-independent': contrapositiveDemo('All pilots must pass a vision test.', [0, 2], 'All: Group 1 · must: Group 2', 'A person is a pilot', 'That person is required to pass a vision test', 'P', 'V', 'If a person is a pilot, then that person is required to pass a vision test.', 'If a person is not required to pass a vision test, then that person is not a pilot.'),
};
