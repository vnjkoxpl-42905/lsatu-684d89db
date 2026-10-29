/** Where each condition sits inside a rule, for the "highlight both conditions" step.
 * Keyed by the learner-facing statement. Each entry lists accepted wordings (separated by " | ") for the
 * sufficient and the necessary condition, as they appear in the rule. Indicators stay out of every span.
 * The first wording in each list is the one shown on "Show me".
 */
const SPANS: Record<string, [sufficient: string, necessary: string]> = {
  'A warranty is valid if the product is registered within 30 days.': ['the product is registered within 30 days', 'A warranty is valid'],
  'Whenever you see lightning, you should expect thunder to follow.': ['you see lightning', 'you should expect thunder to follow'],
  'The gate opens only if the correct code is entered.': ['The gate opens', 'the correct code is entered'],
  'All managers must undergo annual training.': ['managers', 'undergo annual training'],
  'The scholarship applies to any student who maintains a 4.0 GPA.': ['student who maintains a 4.0 GPA', 'The scholarship applies'],
  'You can access the VIP area only when your ID is verified.': ['You can access the VIP area', 'your ID is verified'],
  'Only after the agreement is signed will the project commence.': ['the project commence', 'the agreement is signed'],
  'Members who pay their dues can attend the meeting.': ['Members who pay their dues', 'attend the meeting'],
  'If the alarm sounds, the building should be evacuated immediately.': ['the alarm sounds', 'the building should be evacuated immediately'],
  'Passengers must present a ticket to be allowed to board the train.': ['be allowed to board the train', 'Passengers must present a ticket | present a ticket'],
  'A refund is issued only if the item is returned unopened.': ['A refund is issued', 'the item is returned unopened'],
  'The team goes to the finals if they win the semifinals.': ['they win the semifinals', 'The team goes to the finals'],
  'Every applicant who passes the test will receive an interview call.': ['applicant who passes the test', 'receive an interview call'],
  'You must be over 18 to vote in the club election.': ['vote in the club election', 'You must be over 18 | be over 18'],
  'If you plant trees, you will support the environment.': ['you plant trees', 'you will support the environment | support the environment'],
  'Only if employees complete training do they qualify for promotion.': ['they qualify for promotion | qualify for promotion', 'employees complete training'],
  'Any student who misses a lesson receives notes.': ['student who misses a lesson', 'receives notes'],
  'Houseguests can enter the backyard only when the gate is unlocked.': ['Houseguests can enter the backyard', 'the gate is unlocked'],
  'The only foods that spoil quickly are those without preservatives.': ['foods that spoil quickly', 'those without preservatives'],
  'Servers restart where maintenance is complete.': ['maintenance is complete', 'Servers restart'],
  'Drivers must wear seatbelts to avoid fines.': ['avoid fines', 'Drivers must wear seatbelts | wear seatbelts'],
  'Workers evacuate if the alarm sounds.': ['the alarm sounds', 'Workers evacuate'],
  'Granting a loan requires collateral to be provided.': ['Granting a loan', 'collateral to be provided'],
  'All applications submitted on time will be reviewed.': ['applications submitted on time', 'be reviewed'],
  'Visitors can enter when they show ID.': ['they show ID', 'Visitors can enter'],
  'Errors must always be documented before troubleshooting begins.': ['troubleshooting begins', 'Errors must always be documented | be documented'],
  'The park is accessible only where pathways lead.': ['The park is accessible', 'pathways lead'],
  'Every author who publishes gains recognition.': ['author who publishes', 'gains recognition'],
  'All interns who complete the program are offered full-time positions.': ['interns who complete the program', 'are offered full-time positions | offered full-time positions'],
  'Your grade will be finalized if you submit your report by Friday.': ['you submit your report by Friday', 'Your grade will be finalized | grade will be finalized'],
  'Students exit the building when the final bell rings.': ['the final bell rings', 'Students exit the building'],
  'Every participant who finishes the marathon receives a medal.': ['participant who finishes the marathon', 'receives a medal'],
  'Any device left unattended will power down automatically.': ['device left unattended', 'power down automatically'],
  'Minutes are recorded whenever the committee meets.': ['the committee meets', 'Minutes are recorded'],
  'To qualify for bonuses, employees must exceed sales targets.': ['qualify for bonuses', 'employees must exceed sales targets | exceed sales targets'],
  'Expenditures can occur only if managers approve budgets first.': ['Expenditures can occur', 'managers approve budgets first'],
  'Halting operations temporarily requires system maintenance to be performed.': ['Halting operations temporarily', 'system maintenance to be performed'],
  'Access is granted only when user credentials are verified.': ['Access is granted', 'user credentials are verified'],
  'Servers reboot only where network security protocols permit.': ['Servers reboot', 'network security protocols permit'],
  'Security checks are always conducted before entry.': ['entry | before entry', 'Security checks are always conducted | conducted'],
  'Alarms won’t deactivate on their own if the emergency protocol fails to initiate within one minute.': ['the emergency protocol fails to initiate within one minute', 'Alarms won’t deactivate on their own'],
  'The cluster performs backups only if it detects low storage for two cycles.': ['The cluster performs backups', 'it detects low storage for two cycles'],
  'Reports are published whenever three reviewers call for revision.': ['three reviewers call for revision', 'Reports are published'],
  'Passengers are allowed to board only when documents are verified by both authorities.': ['Passengers are allowed to board', 'documents are verified by both authorities'],
  'Any exposure to extreme temperatures compromises sample integrity.': ['exposure to extreme temperatures', 'compromises sample integrity'],
  'Reimbursement requests can be processed only if employees submit detailed online reports.': ['Reimbursement requests can be processed', 'employees submit detailed online reports'],
  'When safety standards are unmet, inspections occur immediately.': ['safety standards are unmet', 'inspections occur immediately'],
  'Critical software patches are always applied before servers restart.': ['servers restart', 'Critical software patches are always applied | applied'],
  'Your burrito will thaw if you leave it on the counter.': ['you leave it on the counter', 'Your burrito will thaw | burrito will thaw'],
  'Each and every member of the Q continuum is omnipotent.': ['member of the Q continuum', 'is omnipotent | omnipotent'],
  'You will run quickly if there is a bear behind you.': ['there is a bear behind you', 'You will run quickly'],
  'Your disposable income will increase whenever you reduce your expenses.': ['you reduce your expenses', 'Your disposable income will increase'],
  'If you study, you will beat the LSAT.': ['you study', 'you will beat the LSAT | beat the LSAT'],
  'Where there\'s beer, there\'s fun.': ['there\'s beer', 'there\'s fun'],
  'The sun will rise, if you pay your taxes.': ['you pay your taxes', 'The sun will rise'],
  'Whenever it rains, it pours.': ['it rains', 'it pours'],
  'All the King\'s men swore an oath of allegiance.': ['the King\'s men', 'swore an oath of allegiance'],
  'The only monkeys are the ones that live in trees.': ['monkeys', 'the ones that live in trees'],
  'You will become a magician if you drink coffee.': ['you drink coffee', 'You will become a magician'],
  'Every lawyer can read.': ['lawyer', 'can read'],
  'Any computer can do addition.': ['computer', 'can do addition | do addition'],
  'All beavers love to eat maple trees.': ['beavers', 'love to eat maple trees'],
  'We must eat to live.': ['to live | live', 'We must eat | eat'],
  'Only a GPS will reveal where you are.': ['reveal where you are', 'a GPS'],
  'A good party requires alcohol.': ['A good party', 'alcohol'],
  'Expertise requires practice.': ['Expertise', 'practice'],
  'Only fish swim.': ['swim', 'fish'],
  'Ripe mangoes are always soft to the touch.': ['Ripe mangoes', 'soft to the touch'],
  'Food is in the fridge only when Rufus is not around.': ['Food is in the fridge', 'Rufus is not around'],
  'Only the good die young.': ['die young', 'the good'],
  'I would not be able to see Arun if he were in the next room.': ['he were in the next room', 'I would not be able to see Arun'],
  'Amar would not want to learn to ski if he were over 40.': ['he were over 40', 'Amar would not want to learn to ski'],
  'When things cost more, people buy and use less of them.': ['things cost more', 'people buy and use less of them'],
  'Where the judges are independent there will be a good legal system.': ['the judges are independent', 'there will be a good legal system | a good legal system'],
  'All trees are perennial plants with an elongated stem.': ['trees', 'perennial plants with an elongated stem'],
  'Under the stated theory, only pleasure is good.': ['is good | good', 'pleasure'],
  'Every mating ritual can be conceptualized as a game to illuminate the underlying strategies.': ['mating ritual', 'can be conceptualized as a game to illuminate the underlying strategies | be conceptualized as a game to illuminate the underlying strategies'],
  'All Martian gullies are poleward of 30° latitude.': ['Martian gullies', 'poleward of 30° latitude'],
  'When a mix of fresh and dried grass clippings is worked into garden soil, that soil holds water longer.': ['a mix of fresh and dried grass clippings is worked into garden soil', 'that soil holds water longer'],
  'When the sky is clear, the atmospheric pressure is high.': ['the sky is clear', 'the atmospheric pressure is high'],
  'The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.': ['The body of anyone infected by virus X | anyone infected by virus X', 'produce antibodies to fight the virus'],
  'Economic conditions improved only when the policy of free trade had been implemented.': ['Economic conditions improved', 'the policy of free trade had been implemented'],
  'Where a moral duty exists, it supersedes any legal duty and any other kind of duty.': ['a moral duty exists', 'it supersedes any legal duty and any other kind of duty'],
};

export type ConditionRole = 'sufficient' | 'necessary';
export type SpanCheck = { correct: boolean; roles: (ConditionRole | null)[]; hint: string };

const norm = (word: string) => word.replace(/’/g, "'").replace(/[^\p{L}\p{N}'-]/gu, '').toLowerCase();
const words = (text: string) => text.split(/\s+/).map(norm).filter(Boolean);
// A dropped article, modal or "to" at the edges is not a miss: the learner still found the condition.
const LEADING = new Set(['a', 'an', 'the', 'to', 'will', 'can', 'must', 'should', 'is', 'are']);
function core(list: string[]) {
  let start = 0;
  while (start < list.length - 1 && LEADING.has(list[start])) start += 1;
  let end = list.length;
  if (end - start > 1 && list[end - 1] === 'to') end -= 1;
  return list.slice(start, end).join(' ');
}
const accepted = (entry: string) => entry.split('|').map(text => core(words(text)));

export const hasConditionSpans = (statement: string) => statement in SPANS;
export function conditionAnswer(statement: string, role: ConditionRole): string {
  const entry = SPANS[statement]?.[role === 'sufficient' ? 0 : 1] ?? '';
  return entry.split('|')[0].trim();
}
/** Tokens match how the screen splits the rule: on whitespace, punctuation left attached. */
export function spanText(statement: string, span: number[]): string {
  const tokens = statement.split(/\s+/);
  return tokens.slice(span[0], span[1] + 1).join(' ').replace(/^[^\p{L}\p{N}]+/u, '').replace(/[.,;:!?]+$/, '');
}
export function roleOfSpan(statement: string, span: number[]): ConditionRole | null {
  const entry = SPANS[statement];
  if (!entry) return null;
  const tokens = statement.split(/\s+/);
  const picked = core(tokens.slice(span[0], span[1] + 1).map(norm).filter(Boolean));
  if (accepted(entry[0]).includes(picked)) return 'sufficient';
  if (accepted(entry[1]).includes(picked)) return 'necessary';
  return null;
}
export function checkConditionSpans(statement: string, spans: number[][]): SpanCheck {
  const roles = spans.map(span => roleOfSpan(statement, span));
  if (spans.length < 2) return { correct: false, roles, hint: 'Highlight both conditions. Click the first word of a condition, then its last word.' };
  if (roles.some(role => !role)) return { correct: false, roles, hint: 'One highlight is not a complete condition. Include every restriction, such as “within 30 days,” and leave the indicator out.' };
  if (roles[0] === roles[1]) return { correct: false, roles, hint: 'Both highlights are the same condition. The rule has two different ones.' };
  return { correct: true, roles, hint: '' };
}

/** Test hook: every authored wording must be found in its rule, without overlap. */
export function spanEntries() { return Object.entries(SPANS); }
export function locateWording(statement: string, wording: string): [number, number] | null {
  const tokens = statement.split(/\s+/).map(norm);
  const target = words(wording);
  for (let start = 0; start + target.length <= tokens.length; start += 1) {
    const slice = tokens.slice(start, start + target.length);
    if (slice.every((word, i) => word === target[i])) return [start, start + target.length - 1];
  }
  return null;
}
