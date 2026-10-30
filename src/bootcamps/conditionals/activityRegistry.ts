import { CONDITIONAL_QUESTIONS } from '@/features/activity-centre/conditionals/content';
import type { ConditionalDifficulty } from './content/types';
import { findConditionalUnit } from './content';
import type { GroupId } from '@/features/conditional-refresher/content';
import rephrase from '@/features/activity-centre/content/conditional-rephrase.json';

export const CONDITIONAL_ACTIVITIES = [
  { id: 'rephrase', title: 'Conditional Rephrase', purpose: 'Translate sentences, then compare diagrams.' },
  { id: 'linking', title: 'Linking', purpose: 'Connect the rules to reach a conclusion.' },
  { id: 'missing-links', title: 'Missing Links', purpose: 'Supply a rule that makes the conclusion follow.' },
  { id: 'must-be-true', title: 'Must Be True', purpose: 'Find what the rules guarantee.' },
  { id: 'sort', title: 'Sort indicator words', purpose: 'Identify what each indicator tells you to do.' },
  { id: 'diagram', title: 'Diagram practice', purpose: 'Build a conditional and its contrapositive.' },
  { id: 'translate-cards', title: 'Sentence flashcards', purpose: 'Recall a translation and explain it in English.' },
  { id: 'unless', title: 'Unless Drill', purpose: 'Practise the four unless forms.' },
  { id: 'legacy-practice', title: 'Conditional bank practice', purpose: 'Practise a chosen skill and level.' },
  { id: 'guided', title: 'Guided LSAT questions', purpose: 'Apply conditional reasoning to LSAT questions.' },
] as const;
export type ConditionalActivityId = typeof CONDITIONAL_ACTIVITIES[number]['id'];
export const CONDITIONAL_GUIDED_SLUGS = ['w2-04-conditional-logic-easier-set-1', 'w3-12-conditional-logic-easier-set-2', 'w5-02-conditional-logic-easier-set-4', 'w5-09-conditional-logic-medium-set-1', 'w5-13-conditional-logic-medium-set-2', 'w7-04-conditional-logic-medium-set-3', 'w7-08-conditional-logic-medium-set-4', 'w8-04-conditional-logic-medium-set-5', 'w8-02-conditional-logic-medium-set-6', 'w9-05-conditional-logic-harder-set-1', 'w10-01-conditional-logic-harder-set-2', 'w10-05-conditional-logic-harder-set-3', 'w12-03-conditional-logic-harder-set-4'] as const;
export interface ConditionalActivityConfig {
  activity: ConditionalActivityId;
  groups?: GroupId[];
  stage?: 'translate' | 'contrapositive';
  review?: 'all' | 'needs';
  level?: 'all' | 'variables' | 'words';
  timing?: 'progressive' | 'untimed' | 'timed';
  set?: string;
  unit?: string;
  difficulty?: ConditionalDifficulty;
  mode?: 'practice' | 'simulator' | 'hard-sentences';
}
export const CONDITIONAL_ACTIVITY_QUERY_KEYS = ['activity', 'groups', 'stage', 'review', 'level', 'timing', 'set', 'unit', 'difficulty', 'mode'] as const;
const groups: GroupId[] = ['g1', 'g2', 'g3', 'g4'];
const fields: Record<ConditionalActivityId, readonly string[]> = {
  rephrase: ['groups', 'timing'], linking: ['level'], 'missing-links': ['level'], 'must-be-true': ['level'],
  sort: ['groups'], diagram: ['groups', 'stage'], 'translate-cards': ['groups', 'stage', 'review'], unless: [],
  'legacy-practice': ['unit', 'difficulty', 'mode'], guided: ['set'],
};
export function normalizeConditionalActivityConfig(value: unknown): ConditionalActivityConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const activity = raw.activity as ConditionalActivityId;
  if (!CONDITIONAL_ACTIVITIES.some(item => item.id === activity) || Object.keys(raw).some(key => key !== 'activity' && !fields[activity].includes(key))) return null;
  const result: ConditionalActivityConfig = { activity };
  if (fields[activity].includes('groups')) {
    const selected = raw.groups ?? groups;
    if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length || selected.some(group => !groups.includes(group))) return null;
    result.groups = groups.filter(group => selected.includes(group));
    if (activity === 'sort' && result.groups.length < 2) return null;
  }
  for (const [key, choices, fallback] of [
    ['stage', ['translate', 'contrapositive'], 'translate'], ['review', ['all', 'needs'], 'all'],
    ['level', ['all', 'variables', 'words'], 'all'], ['timing', ['progressive', 'untimed', 'timed'], 'progressive'],
    ['difficulty', ['beginner', 'medium', 'advanced'], 'beginner'], ['mode', ['practice', 'simulator', 'hard-sentences'], 'practice'],
  ] as const) if (fields[activity].includes(key)) {
    const selected = raw[key] ?? fallback;
    if (!choices.includes(selected as never)) return null;
    Object.assign(result, { [key]: selected });
  }
  if (activity === 'rephrase' && result.groups!.length !== 4 && result.timing === 'progressive') return null;
  if (activity === 'guided') {
    if (raw.set !== undefined && !CONDITIONAL_GUIDED_SLUGS.includes(raw.set as never)) return null;
    if (raw.set) result.set = raw.set as string;
  }
  if (activity === 'legacy-practice' && raw.unit !== undefined) {
    if (typeof raw.unit !== 'string' || findConditionalUnit(raw.unit)?.phase !== 'conditional') return null;
    result.unit = raw.unit;
  }
  if (result.mode === 'hard-sentences') result.difficulty = 'advanced';
  return result;
}
export function conditionalActivitySearch(config: ConditionalActivityConfig): URLSearchParams {
  const normalized = normalizeConditionalActivityConfig(config);
  if (!normalized) throw new Error('Choose valid settings for this conditional activity.');
  const params = new URLSearchParams();
  Object.keys(normalized).sort().forEach(key => { const value = normalized[key as keyof ConditionalActivityConfig]; if (value !== undefined) params.set(key, Array.isArray(value) ? value.join(',') : value); });
  return params;
}
export function parseConditionalActivitySearch(params: URLSearchParams, activityId?: string): ConditionalActivityConfig | null {
  const raw: Record<string, unknown> = { activity: activityId ?? params.get('activity') };
  for (const key of CONDITIONAL_ACTIVITY_QUERY_KEYS) {
    if (params.getAll(key).length > 1) return null;
    if (params.has(key)) raw[key] = key === 'groups' ? params.get(key)!.split(',') : params.get(key);
  }
  if (activityId && raw.activity !== activityId) return null;
  return normalizeConditionalActivityConfig(raw);
}
export function conditionalActivityDescription(config: ConditionalActivityConfig): string {
  const pieces: string[] = [CONDITIONAL_ACTIVITIES.find(item => item.id === config.activity)!.purpose];
  if (config.groups) pieces.push(config.groups.length === 4 ? 'All four indicator groups.' : `Groups ${config.groups.map(group => group.slice(1)).join(', ')}.`);
  if (config.stage) pieces.push(config.stage === 'contrapositive' ? 'Practise the contrapositive.' : 'Practise the translation.');
  if (config.review === 'needs') pieces.push('Review cards marked Needs work.');
  if (config.level && config.level !== 'all') pieces.push(config.level === 'words' ? 'Use sentences in ordinary English.' : 'Use symbolic rules.');
  if (config.timing) pieces.push(config.timing === 'progressive' ? 'Use the original timing progression.' : config.timing === 'timed' ? 'Use timed practice.' : 'Work without a timer.');
  if (config.set) pieces.push(config.set.replace(/^w\d+-\d+-conditional-logic-/, '').replace(/-/g, ' ') + '.');
  if (config.unit) pieces.push(`${findConditionalUnit(config.unit)!.title}.`);
  if (config.difficulty) pieces.push(`Level ${['beginner', 'medium', 'advanced'].indexOf(config.difficulty) + 1}.`);
  return pieces.join(' ');
}
export function conditionalActivityKey(config: ConditionalActivityConfig): string { return conditionalActivitySearch(config).toString(); }

/** Authored order IDs are stable. Tags describe the indicator operation, not
 * the position or wording of the category label. Advanced items retain their
 * indicator tags but are deliberately excluded from introductory group rounds. */
export const REPHRASE_BASIC_GROUP_ORDERS: Record<GroupId, readonly number[]> = {
  g1: [1, 3, 5, 6, 7, 8, 9, 38, 40, 41, 43],
  g2: [2, 4, 10, 11, 12, 13, 14, 15, 16, 17, 39, 42, 44, 45, 49, 50, 51, 55, 60, 61],
  g3: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 35, 36, 37, 52, 53, 54, 59],
  g4: [30, 31, 32, 33, 34, 46, 47],
};
export const REPHRASE_ADVANCED_ITEMS: readonly { order: number; topic: 'two-way rule' | 'compound condition' | 'linked rules'; groups: readonly GroupId[] }[] = [
  { order: 48, topic: 'two-way rule', groups: ['g1', 'g2'] },
  { order: 56, topic: 'compound condition', groups: ['g3'] },
  { order: 57, topic: 'compound condition', groups: ['g1'] },
  { order: 58, topic: 'compound condition', groups: ['g3'] },
  { order: 62, topic: 'linked rules', groups: ['g1', 'g2'] },
];
export function conditionalActivitySelection(config: ConditionalActivityConfig) {
  if (['linking', 'missing-links', 'must-be-true'].includes(config.activity)) { const mode = config.activity === 'missing-links' ? 'missing-link' : config.activity; return { selectedQuestionIds: CONDITIONAL_QUESTIONS.filter(item => item.mode === mode && (config.level === 'all' || !config.level || item.level === config.level)).map(item => item.id) }; }
  if (config.activity !== 'rephrase') return {};
  const selected = config.groups ?? groups;
  const included = new Set(selected.flatMap(group => [...REPHRASE_BASIC_GROUP_ORDERS[group]]));
  return { selectedItemOrders: selected.length === 4 ? undefined : rephrase.items.filter(item => included.has(item.order)).map(item => item.order), selectionLabel: selected.length === 4 ? 'All 62 sentences, including compound conditions, two-way rules and linked rules' : `${selected.map(group => `Group ${group.slice(1)}`).join(', ')}: single-rule practice; advanced and mixed items are excluded`, timing: config.timing };
}
/** Structural input keeps the registry independent of assignment reader implementation. */
export function conditionalActivityAllowed(grant: { target: { scope: string; activityId?: string; activitySettings?: unknown; difficulty?: string }; unitIds: string[] }, config: ConditionalActivityConfig): boolean {
  const normalized = normalizeConditionalActivityConfig(config);
  if (!normalized) return false;
  const target = grant.target;
  if (target.scope === 'course') return true;
  if (target.scope === 'activity') {
    const permitted = normalizeConditionalActivityConfig({ activity: target.activityId, ...(target.activitySettings as object ?? {}) });
    return !!permitted && conditionalActivityKey(permitted) === conditionalActivityKey(normalized);
  }
  if (normalized.activity === 'guided') return false;
  if (normalized.activity === 'legacy-practice') return !!normalized.unit && grant.unitIds.includes(normalized.unit) && normalized.difficulty === target.difficulty;
  if (target.scope === 'general') return false;
  const needed = normalized.groups?.map(group => `group-${group.slice(1)}`) ?? (normalized.activity === 'unless' ? ['group-3'] : normalized.activity === 'linking' ? ['direct-linking'] : normalized.activity === 'missing-links' ? ['sufficient-assumption'] : normalized.activity === 'must-be-true' ? ['mbt'] : []);
  if (normalized.activity === 'rephrase' && normalized.groups?.length === 4) needed.push('and-or', 'de-morgan', 'biconditionals', 'direct-linking');
  return needed.length > 0 && needed.every(unit => grant.unitIds.includes(unit));
}
