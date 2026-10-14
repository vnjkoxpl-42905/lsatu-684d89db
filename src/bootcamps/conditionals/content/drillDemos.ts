/**
 * Instruction-page walkthroughs, one per drill. Each step mirrors a step the drill actually asks for, in the
 * same order, using a fresh example sentence that is not one of the drill's own questions and is not shared
 * with any other drill. Readbacks keep the rule's modal words (may, must, required to).
 */
export type DemoFrame =
  | { kind: 'pick'; words: string[]; picks: number[]; spans?: [number, number][]; chip: string }
  | { kind: 'type'; lines: { label?: string; text: string }[] }
  | { kind: 'place'; left: string; right: string }
  | { kind: 'choose'; question: string; options: string[]; correct: number };

/** action: what the student is shown, for "Step 2. Click here to ...". Defaults to the title, lowercased. */
export type DemoStep = { title: string; caption: string; frame: DemoFrame; action?: string };
export type DrillDemo = { sentence?: string; steps: DemoStep[] };

export const demoAction = (step: DemoStep) => step.action ?? step.title.charAt(0).toLowerCase() + step.title.slice(1);

const words = (sentence: string) => sentence.split(' ');
const conditionPicks = (sentence: string, indicators: number[]) => words(sentence).map((_, i) => i).filter(i => !indicators.includes(i));
/** The two highlighted conditions as word ranges: picks split where they skip a word or where a clause ends in a comma. */
function conditionSpans(sentence: string, picks: number[]): [number, number][] {
  const tokens = words(sentence);
  const spans: [number, number][] = [];
  for (const index of picks) {
    const last = spans[spans.length - 1];
    if (last && last[1] === index - 1 && !tokens[index - 1].endsWith(',')) last[1] = index;
    else spans.push([index, index]);
  }
  return spans;
}

type Contrapositive = {
  sentence: string; indicators: number[]; chip: string;
  sufficient: string; necessary: string; s1: string; s2: string; ifThen: string; contraWords: string;
};
function contrapositiveDemo({ sentence, indicators, chip, sufficient, necessary, s1, s2, ifThen, contraWords }: Contrapositive): DrillDemo {
  return { sentence, steps: [
    { title: 'Find the indicators', caption: 'Click each indicator word, then choose its group.', frame: { kind: 'pick', words: words(sentence), picks: indicators, chip } },
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words(sentence), picks: conditionPicks(sentence, indicators), spans: conditionSpans(sentence, conditionPicks(sentence, indicators)), chip: 'Both conditions marked' } },
    { title: 'Define your symbols', action: 'give each condition a letter', caption: 'Give each condition its own letter. The letter stands for the whole condition.', frame: { kind: 'type', lines: [{ text: `${s1} = ${sufficient}` }, { text: `${s2} = ${necessary}` }] } },
    { title: 'Build the diagram', caption: 'Put the sufficient condition on the left and the necessary condition on the right.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: `${s1} → ${s2}` }] } },
    { title: 'Flip and negate', action: 'flip the sides and negate both', caption: 'Flip the sides, then turn NOT on for both.', frame: { kind: 'type', lines: [{ label: 'Original', text: `${s1} → ${s2}` }, { label: 'Contrapositive', text: `NOT ${s2} → NOT ${s1}` }] } },
    { title: 'Read the original', action: 'write the original as an if/then sentence', caption: 'Write the original rule as an if/then sentence.', frame: { kind: 'type', lines: [{ text: ifThen }] } },
    { title: 'Read the contrapositive', action: 'write the contrapositive in plain words', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: contraWords }] } },
  ] };
}

export const drillDemos: Record<string, DrillDemo> = {
  'foundation-practice': { steps: [
    { title: 'Rules and facts', action: 'see a rule and a fact together', caption: 'Decide what a rule and a fact prove together.', frame: { kind: 'choose', question: 'Rule: If the store is open, its lights are on. Fact: The store is open. What follows?', options: ['The lights are on.', 'Not settled.'], correct: 0 } },
    { title: 'Sufficient and necessary', action: 'sort the sufficient and necessary conditions', caption: 'Decide which condition is enough and which is required.', frame: { kind: 'choose', question: 'If the store is open, its lights are on. Which condition is sufficient?', options: ['The store is open', 'The lights are on'], correct: 0 } },
    { title: 'Indicator words', action: 'find the indicator word', caption: 'Find the word that tells you the rule is conditional.', frame: { kind: 'choose', question: 'Only staff may enter the kitchen. Which word is the indicator?', options: ['staff', 'Only', 'enter'], correct: 1 } },
  ] },
  'sufficient-practice': { sentence: 'Any bike left overnight is moved to the shed.', steps: [
    { title: 'Find the indicator', caption: 'Choose the word that introduces what is enough.', frame: { kind: 'choose', question: 'Which indicator introduces the sufficient condition?', options: ['moved', 'Any', 'shed'], correct: 1 } },
    { title: 'Find the condition', caption: 'Choose the complete condition the indicator points to.', frame: { kind: 'choose', question: 'What complete condition does “Any” identify?', options: ['A bike', 'A bike is left overnight'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Choose the direction that keeps the rule.', frame: { kind: 'choose', question: 'Which diagram keeps the rule?', options: ['Left overnight → Moved to shed', 'Moved to shed → Left overnight'], correct: 0 } },
    { title: 'Write it in English', action: 'write it as an if/then sentence', caption: 'Write your diagram as an if/then sentence, then compare it with ours.', frame: { kind: 'type', lines: [{ label: 'Your if/then sentence', text: 'If a bike is left overnight, then it is moved to the shed.' }] } },
  ] },
  'contrapositive-practice': { sentence: 'If the oven is on, the fan runs.', steps: [
    { title: 'Original rule', action: 'choose the original diagram', caption: 'Choose the diagram that keeps the original rule.', frame: { kind: 'choose', question: 'Which original diagram keeps the complete conditions?', options: ['Oven on → Fan runs', 'Fan runs → Oven on'], correct: 0 } },
    { title: 'Flip and negate', action: 'choose the contrapositive', caption: 'Choose the contrapositive: flip the sides and negate both.', frame: { kind: 'choose', question: 'Which diagram is the contrapositive?', options: ['Fan runs → Oven on', 'NOT (Fan runs) → NOT (Oven on)'], correct: 1 } },
    { title: 'Write it in English', action: 'write the contrapositive in plain words', caption: 'Write the contrapositive in plain words.', frame: { kind: 'type', lines: [{ text: 'If the fan does not run, then the oven is not on.' }] } },
  ] },
  'mixed-practice': { steps: [
    { title: 'What does the rule cover?', action: 'see who the rule covers', caption: 'Keep the words that limit who the rule covers.', frame: { kind: 'choose', question: 'Every runner wearing a red bib gets water first. Who does the rule cover?', options: ['Every runner', 'Runners wearing a red bib'], correct: 1 } },
    { title: 'Build the diagram', caption: 'Put the condition that is enough on the left.', frame: { kind: 'place', left: 'Runner wears a red bib', right: 'Gets water first' } },
    { title: 'Translate it yourself', caption: 'Write your own diagram before seeing ours.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'Red bib → Water first' }] } },
    { title: 'Does the meaning change?', action: 'compare two wordings', caption: 'Compare two wordings and decide whether they say the same thing.', frame: { kind: 'choose', question: 'Does “Only runners in red bibs get water first” say the same thing?', options: ['Yes, same rule', 'No, it changes the rule'], correct: 1 } },
    { title: 'Try unfamiliar cases', action: 'try an unfamiliar case', caption: 'Use the same reasoning on new wording.', frame: { kind: 'choose', question: 'Guests must sign in. What does this tell you?', options: ['Every guest did sign in', 'Signing in is required of every guest'], correct: 1 } },
  ] },
  // Drill 2: indicators, then both conditions.
  'source-intro-identify': { sentence: 'The kettle whistles only if the water is boiling.', steps: [
    { title: 'Find the indicators', caption: 'Click each word of the indicator, then choose its group.', frame: { kind: 'pick', words: words('The kettle whistles only if the water is boiling.'), picks: [3, 4], chip: 'only if: Group 2, necessary' } },
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('The kettle whistles only if the water is boiling.'), picks: [0, 1, 2, 5, 6, 7, 8], spans: [[0, 2], [5, 8]], chip: 'Both conditions marked' } },
  ] },
  // Drill 3: both conditions, then their sides of the arrow.
  'source-roles': { sentence: 'Any tomato picked green ripens on the windowsill.', steps: [
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('Any tomato picked green ripens on the windowsill.'), picks: [1, 2, 3, 4, 5, 6, 7], spans: [[1, 3], [4, 7]], chip: 'Both conditions marked' } },
    { title: 'Build the diagram', caption: 'Put the sufficient condition on the left and the necessary condition on the right.', frame: { kind: 'place', left: 'the tomato is picked green', right: 'the tomato ripens on the windowsill' } },
  ] },
  // Drill 4: conditions, letters, diagram.
  'source-intro-diagrams': { sentence: 'If the river floods, the bridge closes.', steps: [
    { title: 'Highlight both conditions', caption: 'Click the first and last word of each condition. Leave the indicator out.', frame: { kind: 'pick', words: words('If the river floods, the bridge closes.'), picks: [1, 2, 3, 4, 5, 6], spans: [[1, 3], [4, 6]], chip: 'Both conditions marked' } },
    { title: 'Define your symbols', action: 'give each condition a letter', caption: 'Give each condition its own letter. The letter stands for the whole condition.', frame: { kind: 'type', lines: [{ text: 'F = the river floods' }, { text: 'B = the bridge closes' }] } },
    { title: 'Build the diagram', caption: 'Use your letters: the sufficient condition on the left, the necessary condition on the right.', frame: { kind: 'type', lines: [{ label: 'Your diagram', text: 'F → B' }] } },
  ] },
  // Drill 5: write it first, then indicators and the diagram. The readback keeps "may".
  'source-rephrase': { sentence: 'Only licensed drivers may rent a car.', steps: [
    { title: 'Rewrite the rule', action: 'rewrite the rule as if/then', caption: 'Rewrite the rule as an if/then sentence without changing its meaning. Keep may.', frame: { kind: 'type', lines: [{ label: 'Your if/then', text: 'If a person may rent a car, then that person is a licensed driver.' }] } },
    { title: 'Find the indicators', caption: 'Click the indicator, then choose its group.', frame: { kind: 'pick', words: words('Only licensed drivers may rent a car.'), picks: [0], chip: 'Only: Group 2, necessary' } },
    { title: 'Build the diagram', caption: 'Put the sufficient condition on the left and the necessary condition on the right.', frame: { kind: 'place', left: 'the person may rent a car', right: 'the person is a licensed driver' } },
  ] },
  // Revisit Drill 4.
  'source-intro-diagrams-contrapositive': contrapositiveDemo({ sentence: 'Whenever the tide is high, the harbor path is closed.', indicators: [0], chip: 'Whenever: Group 1, sufficient', sufficient: 'the tide is high', necessary: 'the harbor path is closed', s1: 'T', s2: 'H', ifThen: 'If the tide is high, then the harbor path is closed.', contraWords: 'If the harbor path is not closed, then the tide is not high.' }),
  // Revisit Drill 5. The contrapositive keeps "may".
  'source-rephrase-contrapositive': contrapositiveDemo({ sentence: 'Hikers may camp here only if they carry a permit.', indicators: [4, 5], chip: 'only if: Group 2, necessary', sufficient: 'the hiker may camp here', necessary: 'the hiker carries a permit', s1: 'C', s2: 'P', ifThen: 'If a hiker may camp here, then that hiker carries a permit.', contraWords: 'If a hiker does not carry a permit, then that hiker may not camp here.' }),
  // Drill 6.
  'source-full-translation': contrapositiveDemo({ sentence: 'The museum closes early if the heating fails.', indicators: [4], chip: 'if: Group 1, sufficient', sufficient: 'the heating fails', necessary: 'the museum closes early', s1: 'H', s2: 'M', ifThen: 'If the heating fails, then the museum closes early.', contraWords: 'If the museum does not close early, then the heating did not fail.' }),
  // Drill 7. The readbacks keep "required to".
  'source-independent': contrapositiveDemo({ sentence: 'All lifeguards must hold a first aid certificate.', indicators: [0, 2], chip: 'All: Group 1 · must: Group 2', sufficient: 'the person is a lifeguard', necessary: 'the person is required to hold a first aid certificate', s1: 'L', s2: 'F', ifThen: 'If a person is a lifeguard, then that person is required to hold a first aid certificate.', contraWords: 'If a person is not required to hold a first aid certificate, then that person is not a lifeguard.' }),
};
