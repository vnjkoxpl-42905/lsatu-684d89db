import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Check, X } from 'lucide-react';
import { referencePracticeItems } from './ConditionalReferenceSequence';
import { OpeningMixedDrill } from './OpeningMixedDrill';
import { useCourseStep, useCourseStorageScope } from '../courseProgress';
import { Neg } from './ContrapositiveVisuals';
import './staged-reasoning-drill.css';

/**
 * `options` and `correct` use the saved (canonical) order: a saved choice is an
 * index into `options`. `order` only changes where each option is shown, so
 * moving the answer to a different slot never invalidates a saved choice.
 */
type Stage = { name: string; prompt: string; options?: string[]; correct?: number; order?: number[]; explanation: string; model?: string; hints?: string[]; label?: string };
type Item = { sentence: string; stages: Stage[] };
type Answer = { choice: number | null; writing: string; checked: boolean; accepted: boolean };
const empty = (): Answer => ({ choice: null, writing: '', checked: false, accepted: false });
const not = (text: string, negative?: boolean) => negative ? `NOT (${text})` : text;
/** Draws each NOT (...) in an option as the struck idea the lesson uses, with a hidden "not" for screen readers. */
function OptionText({ text }: { text: string }) {
  return <>{text.split(/(NOT \([^)]*\))/g).map((part, index) => part.startsWith('NOT (') ? <Neg key={index}>{part.slice(5, -1)}</Neg> : part)}</>;
}
const RIGHT: Record<string, string> = { 'Find the indicator': 'Right indicator.', 'Find the condition': 'Right condition.', 'Build the diagram': 'Right direction.', 'Flip and negate': 'Right contrapositive.', 'Original rule': 'Right rule.' };
function rightHeading(name: string) { return RIGHT[name] ?? 'Correct.'; }
function choices(name: string, prompt: string, options: string[], correct: number, explanation: string, hints?: string[]): Stage { return { name, prompt, options, correct, explanation, hints }; }
/** Shows the correct option in display slot `slot` by rotating the options; the saved order is unchanged. */
function showCorrectIn(stage: Stage, slot: number): Stage {
  const count = stage.options!.length;
  const shift = (((stage.correct! - slot) % count) + count) % count;
  return { ...stage, order: Array.from({ length: count }, (_, position) => (position + shift) % count) };
}
const FROM_REQUIREMENT = 'That is what the rule requires. Which condition is enough to guarantee it?';
const BACKWARDS = 'That arrow starts from the requirement. Start from the condition that guarantees the result.';
function hintFor(stage: Stage, choice: number) { return stage.hints?.[choice] || 'Not this one. Reread the rule and ask what it guarantees.'; }
function reading(model: string, explanation: string): Stage { return { name: 'Write it in English', prompt: 'Write your diagram as an if/then sentence.', explanation, model, label: 'Your if/then sentence' }; }

/**
 * One fresh everyday sentence per Group 1 indicator. None repeats a lesson example.
 * Every indicator choice is a word from the sentence itself. Each step's feedback
 * talks only about that step: `condition` for the condition step, `direction` for
 * the diagram step.
 */
type IndicatorItem = { word: string; sentence: string; left: string; right: string; partial?: string; readback: string; condition: string; direction: string; indicators: string[]; indicatorHints: Record<string, string> };
const quoted = (word: string) => `“${word.charAt(0).toUpperCase()}${word.slice(1)}”`;
const RESULT_WORD = (pick: string, what: string) => `${quoted(pick)} belongs to the result: ${what}. Look for the word that introduces the condition that is enough.`;
const CONDITION_WORD = (pick: string) => `${quoted(pick)} is part of the condition itself. Look for the word that introduces that whole condition.`;
const PART_OF_GROUP = (pick: string) => `${quoted(pick)} is part of the group the rule covers. Look for the word that tells you the rule applies to that whole group.`;
const PARTIAL = 'That drops part of the condition. Keep every word that limits it.';
const indicatorItems: IndicatorItem[] = [
  { word: 'if', sentence: 'Mia takes the bus if it is raining.', left: 'It is raining', right: 'Mia takes the bus', readback: 'If it is raining, then Mia takes the bus.',
    condition: 'If what? It is raining. That whole clause is the condition.',
    direction: "The condition comes last in the sentence, but rain is enough to put Mia on the bus, so it goes on the left. Seeing Mia on the bus doesn't prove it is raining. She could take the bus on a dry day too.",
    indicators: ['if', 'raining', 'takes'], indicatorHints: { raining: CONDITION_WORD('raining'), takes: RESULT_WORD('takes', 'what Mia does') } },
  { word: 'when', sentence: 'When the kettle boils, it clicks off.', left: 'Kettle boils', right: 'Kettle clicks off', readback: 'If the kettle boils, then it clicks off.',
    condition: 'When what? The kettle boils. That is the complete condition.',
    direction: "Boiling is enough for the click, so it goes on the left. A click alone doesn't prove the water boiled. Someone could switch the kettle off by hand.",
    indicators: ['clicks', 'when', 'boils'], indicatorHints: { clicks: RESULT_WORD('clicks', 'what the kettle does'), boils: CONDITION_WORD('boils') } },
  { word: 'whenever', sentence: 'Whenever Sam bakes bread, the kitchen smells of yeast.', left: 'Sam bakes bread', right: 'Kitchen smells of yeast', readback: 'If Sam bakes bread, then the kitchen smells of yeast.',
    condition: 'Whenever what? Sam bakes bread. That is the complete condition.',
    direction: "Every time Sam bakes, the kitchen smells of yeast, so baking goes on the left. The smell alone doesn't prove Sam baked. Someone else could be making pizza dough.",
    indicators: ['bakes', 'smells', 'whenever'], indicatorHints: { bakes: CONDITION_WORD('bakes'), smells: RESULT_WORD('smells', 'what happens in the kitchen') } },
  { word: 'where', sentence: 'Where the sidewalk is icy, the city spreads salt.', left: 'Sidewalk is icy', right: 'City spreads salt there', readback: 'If a sidewalk is icy, then the city spreads salt there.',
    condition: 'Where what? The sidewalk is icy. That is the complete condition.',
    direction: "Ice on a stretch of sidewalk is enough for salt there, so it goes on the left. Salt alone doesn't prove the sidewalk was icy. The city might salt a dry stretch before a storm.",
    indicators: ['where', 'spreads', 'icy'], indicatorHints: { spreads: RESULT_WORD('spreads', 'what the city does'), icy: CONDITION_WORD('icy') } },
  { word: 'all', sentence: 'All dogs at the park must be on a leash.', left: 'Dog is at the park', right: 'Dog must be on a leash', partial: 'Dog', readback: 'If a dog is at the park, then it must be on a leash.',
    condition: 'All what? Dogs at the park. Keep at the park. The rule says nothing about dogs at home.',
    direction: "Being a dog at the park is enough to know the dog must be on a leash, so it goes on the left. A dog on a leash could be anywhere, so the leash doesn't prove the dog is at the park.",
    indicators: ['must', 'all', 'park'], indicatorHints: { must: '“Must” is in this rule, but it marks what is required: being on a leash. Look for the word that introduces the group the rule covers.', park: PART_OF_GROUP('park') } },
  { word: 'every', sentence: 'Every guest at the wedding gets a slice of cake.', left: 'Guest at the wedding', right: 'Gets a slice of cake', partial: 'Guest', readback: 'If someone is a guest at the wedding, then that person gets a slice of cake.',
    condition: 'Every what? Guest at the wedding. Keep at the wedding, or the rule would cover guests at any party.',
    direction: "Each guest at the wedding gets cake, so being a guest there goes on the left. Someone holding a slice could be a waiter, so the cake doesn't prove that person is a guest.",
    indicators: ['gets', 'wedding', 'every'], indicatorHints: { gets: RESULT_WORD('gets', 'what each guest receives'), wedding: PART_OF_GROUP('wedding') } },
  { word: 'each', sentence: 'Each player on the team gets a numbered jersey.', left: 'Player on the team', right: 'Gets a numbered jersey', partial: 'Player', readback: 'If someone is a player on the team, then that person gets a numbered jersey.',
    condition: 'Each what? Player on the team. Keep on the team, or the rule would cover players anywhere.',
    direction: "Every single player on the team gets a numbered jersey, so being on the team goes on the left. A fan can buy a numbered jersey too, so the jersey doesn't prove someone plays.",
    indicators: ['each', 'team', 'gets'], indicatorHints: { team: PART_OF_GROUP('team'), gets: RESULT_WORD('gets', 'what each player receives') } },
  { word: 'any', sentence: 'Any car parked in the fire lane gets towed.', left: 'Car parked in the fire lane', right: 'Car gets towed', partial: 'Car is parked', readback: 'If a car is parked in the fire lane, then it gets towed.',
    condition: 'Any what? Car parked in the fire lane. Keep in the fire lane. The rule is not about every parked car.',
    direction: "Parking in the fire lane is enough for a tow, so it goes on the left. A towed car could have been parked somewhere else, so towing doesn't prove the fire lane.",
    indicators: ['parked', 'any', 'towed'], indicatorHints: { parked: PART_OF_GROUP('parked'), towed: RESULT_WORD('towed', 'what happens to the car') } },
  { word: 'the only', sentence: 'The only shoes allowed on the gym floor are sneakers.', left: 'Shoes allowed on the gym floor', right: 'Shoes are sneakers', partial: 'Shoes', readback: 'If shoes are allowed on the gym floor, then they are sneakers.',
    condition: 'The only what? Shoes allowed on the gym floor. That whole group is the condition.',
    direction: "Every pair allowed on the gym floor is a pair of sneakers, so being allowed goes on the left. The rule doesn't say every pair of sneakers is allowed. Muddy sneakers could still be kept off the floor.",
    indicators: ['only', 'the only', 'allowed'], indicatorHints: { only: 'Only on its own marks a requirement. Here it comes right after “the,” and the whole phrase does a different job. Read the two words together.', allowed: '“Allowed” is part of the group the rule covers. Look for the phrase that introduces that whole group.' } },
  { word: 'people who', sentence: 'People who order the lunch special get a free drink.', left: 'Person orders the lunch special', right: 'Person gets a free drink', readback: 'If a person orders the lunch special, then that person gets a free drink.',
    condition: 'People who what? Order the lunch special. That is the complete condition.',
    direction: "Ordering the special is enough for a free drink, so it goes on the left. A free drink doesn't prove someone ordered the special. It could be a birthday treat.",
    indicators: ['people who', 'order', 'free'], indicatorHints: { order: '“Order” is part of the group the rule covers: what those people do. Look for the words that introduce that whole group.', free: '“Free” describes the drink, which is the result. Look for the words that introduce the group the rule covers.' } },
];

export const sufficientStagedItems: Item[] = [
  ...indicatorItems.map((item, index) => {
    const ideas = [item.left, item.right, ...(item.partial ? [item.partial] : [])];
    const options = [...ideas.slice(index % ideas.length), ...ideas.slice(0, index % ideas.length)];
    const hint = (option: string) => option === item.left ? '' : option === item.partial ? PARTIAL : `${FROM_REQUIREMENT} Ask: ${item.word} what?`;
    // Steps 1 and 2 confirm only their own step; the full explanation waits for the direction step.
    const found = item.why.slice(0, item.why.indexOf('. ') + 1);
    return { sentence: item.sentence, stages: [
      choices('Find the indicator', 'Which indicator introduces the sufficient condition?', item.indicators, item.indicators.indexOf(item.word), `“${item.word}” is the indicator. Next, find the complete condition it points to.`, item.indicators.map(word => word === item.word ? '' : item.indicatorHints[word])),
      choices('Find the condition', `What complete condition does “${item.word}” identify?`, options, options.indexOf(item.left), item.condition, options.map(hint)),
      choices('Build the diagram', 'Which direction keeps the original rule?', index % 2 ? [`${item.right} → ${item.left}`, `${item.left} → ${item.right}`] : [`${item.left} → ${item.right}`, `${item.right} → ${item.left}`], index % 2, item.direction, index % 2 ? [BACKWARDS, ''] : ['', BACKWARDS]),
      reading(item.readback, 'Compare the condition on each side. Keep every restriction and do not turn the requirement into a guarantee.'),
    ] };
  }),
  { sentence: 'A package ships the same day if it is ordered before 2 p.m.', stages: [choices('Keep the condition', 'Which condition is enough for same-day shipping?', ['Package is ordered', 'Package is ordered before 2 p.m.', 'Package ships the same day'], 1, 'Before 2 p.m. limits the rule. A package ordered at five does not meet the condition.', [PARTIAL, '', 'That is the result. Which condition guarantees it?']), choices('Keep the meaning', 'Which sentence says the same thing?', ['If a package ships the same day, it was ordered before 2 p.m.', 'If a package is ordered before 2 p.m., it ships the same day.'], 1, 'Ordering before 2 p.m. is sufficient. Same-day shipping alone does not prove when the order came in.', ['That rule starts from the shipping. Start from what guarantees the shipping.', ''])] },
  { sentence: 'The only cookies left in the jar are oatmeal.', stages: [choices('Build the diagram', 'Which diagram keeps the rule?', ['Cookie is oatmeal → Cookie is left in the jar', 'Cookie is left in the jar → Cookie is oatmeal'], 1, 'Every cookie left in the jar is oatmeal. An oatmeal cookie can still be on a plate.', [BACKWARDS + ' The only what? Cookies left in the jar.', '']), reading('If a cookie is left in the jar, it is oatmeal.', 'The only cookies left in the jar names the group the rule covers.')] },
  { sentence: 'Every key on the red ring opens a classroom.', stages: [choices('Build a case', 'Someone claims every key that opens a classroom is on the red ring. Which key fits our rule but disproves that claim?', ['On the red ring; opens a classroom', 'Not on the red ring; opens a classroom', 'On the red ring; opens no classroom', 'Not on the red ring; opens no classroom'], 1, 'A classroom key on another ring fits our rule. It shows the claim is wrong without breaking the rule.', ['That key agrees with the claim. You need a classroom key the claim gets wrong.', '', 'That key breaks our rule. Every key on the red ring opens a classroom.', 'That key opens no classroom, so the claim says nothing about it.']), { name: 'Explain the limit', prompt: 'Why does your key disprove the claim but keep our rule true?', model: 'The rule says every key on the red ring opens a classroom. It does not say every key that opens a classroom is on the red ring.', explanation: 'Your example is a possible case, not a claim that this key actually exists.' }] },
];

const SIGNS = 'That changes the negations. Keep each condition exactly as the rule states it.';
const NO_NEGATE = 'You flipped the sides but did not negate them. A contrapositive also negates both.';
const NO_FLIP = 'You negated both sides but kept their order. A contrapositive also flips them.';
/**
 * Saved choices index the options in the order below, so that order stays as it
 * is. `showCorrectIn` moves the answer to a different slot from item to item and
 * from the first step to the second.
 */
export const contrapositiveStagedItems: Item[] = referencePracticeItems.map((item, index) => {
  const left = not(item.left, item.leftNegated), right = not(item.right, item.rightNegated);
  const notLeft = not(item.left, !item.leftNegated), notRight = not(item.right, !item.rightNegated);
  return { sentence: item.sentence, stages: [
    showCorrectIn(choices('Original rule', 'Which original arrow keeps the complete conditions?', index % 2 ? [`${right} → ${left}`, `${left} → ${right}`, `${notLeft} → ${notRight}`] : [`${left} → ${right}`, `${right} → ${left}`, `${notLeft} → ${notRight}`], index % 2, item.why, index % 2 ? [BACKWARDS, '', SIGNS] : ['', BACKWARDS, SIGNS]), index % 3),
    showCorrectIn(choices('Flip and negate', 'Which diagram is the contrapositive?', index % 2 ? [`${notRight} → ${notLeft}`, `${right} → ${left}`, `${notLeft} → ${notRight}`] : [`${right} → ${left}`, `${notRight} → ${notLeft}`, `${notLeft} → ${notRight}`], index % 2 ? 0 : 1, `The contrapositive is logically equivalent to the rule. If the right side of the original arrow is not true, the left side can't be true either.${item.leftNegated || item.rightNegated ? ' Negating a side that already says not removes that not.' : ''}`, index % 2 ? ['', NO_NEGATE, NO_FLIP] : [NO_NEGATE, '', NO_FLIP]), (index + 2) % 3),
    // A sentence already in if/then form would only be copied back word for word.
    ...(item.readback === item.sentence ? [] : [reading(item.readback, 'Compare the condition on each side. Keep every restriction, and keep the arrow pointing the same way as the rule.')]),
    { name: 'Read the contrapositive', prompt: 'Now write the contrapositive in ordinary English.', model: item.contraReadback, explanation: item.contraWhy, label: 'Your if/then sentence' },
  ] };
});

/**
 * The device copy belongs to one account. The dev preview keeps the original
 * unscoped key; a signed-in student only ever reads and writes the key carrying
 * their own user id, so a record left on a shared device by someone else is never
 * read into, or copied to, another account.
 */
export function stagedStorageKey(scope: string, mode: 'sufficient' | 'contrapositive') {
  return scope === 'preview' ? `conditional-staged-v1:${mode}` : `conditional-staged-v1:${scope}:${mode}`;
}

export function StagedReasoningDrill({ mode, storageScope }: { mode: 'sufficient' | 'contrapositive' | 'mixed'; storageScope?: string }) {
  const courseScope = useCourseStorageScope();
  const scope = storageScope ?? courseScope;
  if (mode === 'mixed') return <div className="sr-mixed"><OpeningMixedDrill stepId="mixed-practice"/></div>;
  return <StagedRun key={`${scope}-${mode}`} stepId={`${mode}-practice`} storageKey={stagedStorageKey(scope, mode)} items={mode === 'sufficient' ? sufficientStagedItems : contrapositiveStagedItems}/>;
}

/**
 * What a saved answer depends on: the sentence, and for each step how many
 * options it has and which one is correct (or that it is written). Rewording an
 * explanation or an option keeps the saved answers; changing a sentence or a key
 * only drops the answers for that question.
 */
function signatures(items: Item[]) {
  return items.map(item => `${item.sentence}|${item.stages.map(stage => stage.options ? `${stage.options.length}:${stage.correct}` : 'w').join(',')}`);
}
/**
 * Records saved before signatures were stored carry a whole-content fingerprint.
 * These are the item sets committed before 2026-10-13, so their answers are matched
 * question by question instead of being set aside.
 */
const LEGACY_SIGNATURES: Record<string, string[]> = {
  'v2:22920:a6gqce': [
    'Mia takes the bus if it is raining.|3:0,2:0,2:0,w',
    'When the kettle boils, it clicks off.|3:1,2:1,2:1,w',
    'Whenever Sam bakes bread, the kitchen smells of yeast.|3:2,2:0,2:0,w',
    'Where the sidewalk is icy, the city spreads salt.|3:0,2:1,2:1,w',
    'All dogs at the park must be on a leash.|3:1,3:2,2:0,w',
    'Every guest at the wedding gets a slice of cake.|3:2,3:1,2:1,w',
    'Each player on the team gets a numbered jersey.|3:0,3:0,2:0,w',
    'Any car parked in the fire lane gets towed.|3:1,3:2,2:1,w',
    'The only shoes allowed on the gym floor are sneakers.|3:1,3:1,2:0,w',
    'People who order the lunch special get a free drink.|3:0,2:1,2:1,w',
    'A package ships the same day if it is ordered before 2 p.m.|3:1,2:1',
    'The only cookies left in the jar are oatmeal.|2:1,w',
    'Every key on the red ring opens a classroom.|4:1,w',
  ],
  'v2:17050:1wsh5v3': [
    'If a parcel has a red tracking tag, its sender has paid for tracking.|3:0,3:1,w',
    'Every applicant who submits by Friday receives a confirmation.|3:1,3:0,w,w',
    'A document is stored in the archive only if it has a catalogue number.|3:0,3:1,w,w',
    'A backup copy is required for a file to be deleted.|3:1,3:0,w,w',
    'Only guests with prepaid tickets enter the balcony.|3:0,3:1,w,w',
    'The only recipes printed on the weekly menu are vegan recipes.|3:1,3:0,w,w',
    'If a parcel has not cleared customs, it stays in the holding room.|3:0,3:1,w',
    'If the display is active, its status light is not red.|3:1,3:0,w',
    'If a room is not reserved, its door is not locked.|3:0,3:1,w',
  ],
};
type Archived = { fingerprint?: unknown; signatures?: unknown; index?: unknown; step?: unknown; answers: unknown };
type Restored = { index: number; step: number; answers: Record<string, Answer>; archived: Archived[] };
function savedSignatures(data: { signatures?: unknown; fingerprint?: unknown }, items: Item[]): string[] | null {
  if (Array.isArray(data.signatures) && data.signatures.every(value => typeof value === 'string')) return data.signatures as string[];
  if (data.fingerprint === JSON.stringify(items)) return signatures(items);
  if (typeof data.fingerprint === 'string' && LEGACY_SIGNATURES[data.fingerprint]) return LEGACY_SIGNATURES[data.fingerprint];
  return null;
}
/**
 * Answers are keyed by question and step position. An answer is kept only when
 * its question is still the same question. Anything that cannot be kept stays in
 * the saved record under `archived` rather than being deleted. Nothing is evicted.
 */
function restore(storageKey: string, items: Item[], accountState?: unknown): Restored {
  const fallback: Restored = { index: 0, step: 0, answers: {}, archived: [] };
  try {
    const data = (accountState ?? JSON.parse(localStorage.getItem(storageKey) ?? 'null'));
    if (!data || typeof data !== 'object') return fallback;
    let archived: Archived[] = Array.isArray(data.archived) ? data.archived : [];
    if (!data.answers || typeof data.answers !== 'object') return { ...fallback, archived };
    const saved = savedSignatures(data, items);
    const current = signatures(items);
    const same = (i: number) => !!saved && saved[i] === current[i];
    const answers: Record<string, Answer> = {};
    let dropped = false;
    for (const [key, value] of Object.entries(data.answers)) {
      const a = value as Answer;
      const [i, s] = key.split(':').map(Number);
      if (!same(i)) { dropped = true; continue; }
      if (!items[i]?.stages[s] || !a || typeof a.writing !== 'string' || !(a.choice === null || Number.isInteger(a.choice)) || typeof a.checked !== 'boolean' || typeof a.accepted !== 'boolean') continue;
      const stage = items[i].stages[s];
      if (a.choice !== null && (!stage.options || a.choice < 0 || a.choice >= stage.options.length)) continue;
      const checked = a.checked;
      answers[key] = { ...a, checked, accepted: checked && a.accepted && (stage.options ? a.choice === stage.correct : !!a.writing.trim()) };
    }
    if (dropped) archived = [...archived, { fingerprint: data.fingerprint, ...(saved ? { signatures: saved } : {}), index: data.index, step: data.step, answers: data.answers }];
    if (!saved) return { ...fallback, archived };
    const index = Number.isInteger(data.index) && data.index >= 0 && data.index < items.length ? data.index : 0;
    const step = Number.isInteger(data.step) && data.step >= 0 && data.step < items[index].stages.length ? data.step : 0;
    const firstUnfinished = items[index].stages.findIndex((_, s) => !answers[`${index}:${s}`]?.accepted);
    return { index, step: firstUnfinished < 0 ? step : Math.min(step, firstUnfinished), answers, archived };
  } catch { return fallback; }
}

function StagedRun({ items, storageKey, stepId }: { items: Item[]; storageKey: string; stepId?: string }) {
  const course = useCourseStep(stepId);
  const record = course?.record;
  // Inside the course the account is the only record: a device copy left by anyone else is never read in or overwritten.
  const account = !!course;
  const accountState = course?.saved?.state;
  const [initial] = useState(() => restore(storageKey, items, account ? accountState ?? {} : undefined));
  const [index, setIndex] = useState(initial.index);
  const [step, setStep] = useState(initial.step);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial.answers);
  const [archived, setArchived] = useState(initial.archived);
  const [storageFailed, setStorageFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  // The account can finish loading after this drill opens. Until the student does
  // something here, take the account's saved run over this device's copy.
  const touched = useRef(false);
  const written = useRef<unknown>(accountState);
  useEffect(() => {
    if (touched.current || !accountState || accountState === written.current) return;
    written.current = accountState;
    const restored = restore(storageKey, items, accountState);
    setIndex(restored.index); setStep(restored.step); setAnswers(restored.answers); setArchived(restored.archived); setFinished(false);
  }, [accountState, storageKey, items]);
  const item = items[index], stage = item.stages[step], key = `${index}:${step}`;
  const answer = answers[key] ?? empty();
  const objective = !!stage.options;
  const correct = answer.choice === stage.correct;
  const completed = items.filter((q, i) => q.stages.every((_, s) => answers[`${i}:${s}`]?.accepted)).length;
  function update(patch: Partial<Answer>) { touched.current = true; setAnswers(old => {
    const next = { ...old, [key]: { ...(old[key] ?? empty()), ...patch } };
    if (patch.accepted === false) for (let s = step + 1; s < item.stages.length; s++) {
      const later = `${index}:${s}`;
      if (next[later]) next[later] = { ...next[later], checked: false, accepted: false };
    }
    return next;
  }); }
  useEffect(() => {
    const snapshot = { index, step, answers, signatures: signatures(items), ...(archived.length ? { archived } : {}) };
    written.current = snapshot;
    record?.({ state: snapshot, done: completed, total: items.length, ...(completed === items.length ? { status: 'done' as const } : {}) });
    try { if (!account) localStorage.setItem(storageKey, JSON.stringify(snapshot)); setStorageFailed(false); } catch { setStorageFailed(!record); }
  }, [index, step, answers, items, storageKey, record, completed, archived, account]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, index, finished]);
  useEffect(() => { if (!answer.checked) return; const el = feedback.current; el?.focus({ preventScroll: true }); el?.scrollIntoView?.({ behavior: matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }, [answer.checked]);
  function move(i: number) { touched.current = true; setIndex(i); setStep(0); setFinished(false); }
  /** Step back one step; from a question's first step, land on the last step of the previous question. */
  function previous() { touched.current = true; if (step) return setStep(step - 1); setIndex(index - 1); setStep(items[index - 1].stages.length - 1); setFinished(false); }
  function next() { touched.current = true; if (step < item.stages.length - 1) setStep(step + 1); else if (index < items.length - 1) move(index + 1); else {
    // Results wait for every objective step: an unfinished question is reopened instead.
    const unfinished = items.findIndex((q, i) => q.stages.some((_, s) => !answers[`${i}:${s}`]?.accepted));
    if (unfinished >= 0) { setIndex(unfinished); setStep(items[unfinished].stages.findIndex((_, s) => !answers[`${unfinished}:${s}`]?.accepted)); }
    else setFinished(true);
  } }
  const shown = stage.options ? stage.order ?? stage.options.map((_, i) => i) : [];
  return <section className="sr-run" aria-label="Step-by-step reasoning practice">
    {storageFailed && <p role="status" className="sr-storage-error">Your browser could not save this practice. Keep this page open to retain your work.</p>}
    <header className="sr-header"><span>YOUR PROGRESS</span><strong>{Math.round(completed / items.length * 100)}<small>%</small></strong><div role="progressbar" aria-label="Questions completed" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={items.length}><i style={{ width: `${completed / items.length * 100}%` }}/></div></header>
    {finished ? <div className="sr-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>You worked through the set.</h2><p>{completed} of {items.length} questions completed. Your written explanations were self-reviewed, not automatically graded.</p><div className="sr-review">{items.map((q, i) => <button key={i} onClick={() => move(i)}>Question {i + 1}</button>)}</div></div> : <>
    <div className="sr-scene"><aside className="sr-statement"><p className="sr-counter" aria-label={`Question ${index + 1} of ${items.length}`}><b key={index}>{String(index + 1).padStart(2, '0')}</b><small>/ {items.length}</small></p><blockquote>{item.sentence}</blockquote><dl className="sr-legend"><div><dt>Sufficient</dt><dd>enough to guarantee the result</dd></div><div><dt>Necessary</dt><dd>required for the result</dd></div></dl></aside>
    <div className="sr-work"><ol className="sr-stages" aria-label="Steps for this rule" style={{ '--sr-p': step / Math.max(1, item.stages.length - 1) } as React.CSSProperties}>{item.stages.map((s, i) => <li key={i} aria-current={step === i ? 'step' : undefined} data-done={answers[`${index}:${i}`]?.accepted}><span>{answers[`${index}:${i}`]?.accepted ? <Check size={13}/> : i + 1}</span>{s.name}</li>)}</ol>
    <div className="sr-active" key={key}><p className="sr-step-label">STEP {step + 1} OF {item.stages.length}</p><h2 ref={heading} tabIndex={-1}>{stage.prompt}</h2>
    {objective ? <div className="sr-options" role="group" aria-label="Answer choices">{shown.map((choice, position) => { const option = stage.options![choice]; return <button key={choice} type="button" aria-pressed={answer.choice === choice} data-state={answer.checked ? (answer.choice === choice ? (correct ? 'right' : 'wrong') : 'dim') : undefined} disabled={answer.checked} onClick={() => update({ choice, checked: false, accepted: false })}><span aria-hidden="true">{answer.checked && answer.choice === choice ? (correct ? <Check size={14}/> : <X size={14}/>) : String.fromCharCode(65 + position)}</span><span className="sr-option-text"><OptionText text={option}/></span></button>; })}</div> : <label className="sr-writing">{stage.label ?? 'Your explanation'}<textarea rows={4} value={answer.writing} disabled={answer.checked} onChange={e => update({ writing: e.target.value, accepted: false })}/></label>}
    {!answer.checked ? <button type="button" className="sr-primary" disabled={objective ? answer.choice === null : !answer.writing.trim()} onClick={() => update({ checked: true, accepted: objective && correct })}>{objective ? 'Check this step' : stage.label ? 'Compare my sentence' : 'Compare my explanation'}</button> : <div className="sr-feedback" data-result={objective ? (correct ? 'right' : 'wrong') : 'compare'} role="status"><h3 ref={feedback} tabIndex={-1}>{objective && (correct ? <Check size={20} aria-hidden/> : <X size={20} aria-hidden/>)}{objective ? correct ? rightHeading(stage.name) : 'Not quite. Try again.' : 'Compare the meaning.'}</h3>{stage.model && <p className="sr-model"><strong className="sr-model-label">Our version:</strong> {stage.model}</p>}<p>{objective && !correct && answer.choice !== null ? hintFor(stage, answer.choice) : stage.explanation}</p>{!objective && <button type="button" className="sr-self-check" aria-pressed={answer.accepted} onClick={() => update({ accepted: !answer.accepted })}><Check size={16}/>I compared the direction and complete conditions</button>}<div className="sr-feedback-actions">{answer.accepted && <button type="button" className="sr-continue" onClick={next}>Continue</button>}<button type="button" className="sr-text" onClick={() => update({ checked: false, accepted: false })}>{objective && !correct ? 'Try again' : 'Revise my answer'}</button></div></div>}
    </div></div></div>
    <nav className="sr-navigation" aria-label="Practice navigation"><button type="button" disabled={index === 0 && step === 0} onClick={previous}>Previous</button><button type="button" className="sr-primary" disabled={!answer.accepted} onClick={next}>{step < item.stages.length - 1 ? 'Next step' : index < items.length - 1 ? 'Next question' : 'Review this set'}</button></nav></>}
  </section>;
}
