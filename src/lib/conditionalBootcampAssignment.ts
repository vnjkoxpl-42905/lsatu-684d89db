import type { ConditionalArea, ConditionalDifficulty } from '@/bootcamps/conditionals/content/types';

export interface ConditionalAssignmentTarget {
  scope: 'course' | 'stage' | 'area' | 'skill' | 'general';
  mode: 'learn' | 'practice';
  difficulty: ConditionalDifficulty;
  unitId?: string;
  area?: ConditionalArea;
  /** Unmarked stage grants keep their original membership. New grants use this teaching order. */
  curriculumVersion?: 2;
}
export const DEFAULT_CONDITIONAL_TARGET: ConditionalAssignmentTarget = {
  scope: 'course', mode: 'learn', difficulty: 'beginner',
};
export const CONDITIONAL_AREAS: { id: ConditionalArea; title: string }[] = [
  { id: 'understanding', title: 'Understanding rules' },
  { id: 'translation', title: 'Translating language' },
  { id: 'linking', title: 'Connecting rules' },
  { id: 'inference', title: 'Using rules with facts' },
  { id: 'complex', title: 'Complex conditionals' },
  { id: 'application', title: 'Logical Reasoning applications' },
  { id: 'quantifiers', title: 'Quantifier reasoning' },
];
export function conditionalTargetKey(target: ConditionalAssignmentTarget = DEFAULT_CONDITIONAL_TARGET): string {
  if (target.scope === 'course') return 'course';
  if (target.scope === 'stage') return target.curriculumVersion === 2 ? `stage:v2:${target.unitId}` : `stage:${target.unitId}`;
  return [target.scope, target.scope === 'skill' ? target.unitId : target.scope === 'area' ? target.area : 'conditional',
    target.scope === 'general' ? 'practice' : target.mode, target.difficulty].join(':');
}
export async function resolveConditionalAssignment(target: ConditionalAssignmentTarget = DEFAULT_CONDITIONAL_TARGET) {
  if (!['course', 'stage', 'area', 'skill', 'general'].includes(target.scope) ||
      !['learn', 'practice'].includes(target.mode) ||
      !['beginner', 'medium', 'advanced'].includes(target.difficulty) ||
      (target.curriculumVersion !== undefined && target.curriculumVersion !== 2)) {
    throw new Error('Choose a valid conditional scope, learning mode and difficulty.');
  }
  const base = '/bootcamp/conditionals';
  if (target.scope === 'course') return {
    route: base, title: 'Conditional Logic Bootcamp',
    description: 'The teaching sequence from the beginning, with activity levels set at each stage. Quantifiers follow conditionals.',
    target: { ...DEFAULT_CONDITIONAL_TARGET }, key: 'course',
  };
  if (target.scope === 'stage') {
    const { findConditionalUnit } = await import('@/bootcamps/conditionals/content');
    const unit = findConditionalUnit(target.unitId);
    if (!unit) throw new Error('Choose an existing conditional starting stage.');
    const normalized: ConditionalAssignmentTarget = { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: unit.id,
      ...(target.curriculumVersion === 2 ? { curriculumVersion: 2 } : {}) };
    return {
      route: `${base}?${new URLSearchParams({ start: unit.id })}`,
      title: `Conditional curriculum: start with ${unit.title}`,
      description: 'Start at the assigned skill and continue through the curriculum. Each activity has its own level.',
      target: normalized, key: conditionalTargetKey(normalized),
    };
  }
  const params = new URLSearchParams({ level: target.difficulty });
  let label = 'General conditional practice';
  if (target.scope === 'skill') {
    const { findConditionalUnit } = await import('@/bootcamps/conditionals/content');
    const unit = findConditionalUnit(target.unitId);
    if (!unit) throw new Error('Choose an existing conditional skill.');
    label = unit.title;
    params.set('unit', unit.id);
  } else if (target.scope === 'area') {
    const area = CONDITIONAL_AREAS.find(option => option.id === target.area);
    if (!area) throw new Error('Choose an existing conditional area.');
    label = area.title;
    params.set('area', area.id);
  } else params.set('phase', 'conditional');
  const mode = target.scope === 'general' ? 'practice' : target.mode;
  const route = mode === 'practice' ? `${base}/practice?${params}` : target.scope === 'skill'
    ? `${base}/lessons/${encodeURIComponent(target.unitId!)}?${params}` : `${base}?${params}`;
  return {
    route, title: `${label}: ${mode === 'learn' ? 'learning and practice' : 'practice'}`,
    description: mode === 'learn' ? 'Teaching, guided activities and practice.' : 'Practice with explanations and optional hints.',
    target: { scope: target.scope, mode, difficulty: target.difficulty,
      ...(target.scope === 'skill' ? { unitId: target.unitId } : {}), ...(target.scope === 'area' ? { area: target.area } : {}) } as ConditionalAssignmentTarget,
    key: conditionalTargetKey({ ...target, mode }),
  };
}

/** Normalize only exact former generated copy; teacher-written wording stays intact. */
export function conditionalAssignmentDisplayCopy(
  target: ConditionalAssignmentTarget,
  generated: { title: string; description: string },
  stored: { title?: string | null; description?: string | null },
) {
  const previousTitles = new Set<string>();
  let previousDescription: string | undefined;
  const formerUnitTitles: Record<string, string[]> = {
    orientation: ['Find the Guarantee'],
    'sufficient-necessary': ['Enough to Guarantee, Required to Follow'],
    'group-1': ['Group 1: Identify What Guarantees What'],
    'group-2': ['Group 2: Keep the Requirement on the Right'],
  };
  const formerLabels = target.unitId ? formerUnitTitles[target.unitId] ?? [] : [];
  if (['skill', 'area', 'general'].includes(target.scope)) {
    const mode = target.scope === 'general' ? 'practice' : target.mode;
    const suffix = mode === 'learn' ? 'learning and practice' : 'practice';
    const label = generated.title.slice(0, -(`: ${suffix}`.length));
    const level = `Level ${['beginner', 'medium', 'advanced'].indexOf(target.difficulty) + 1}`;
    previousTitles.add(`${label}: ${level} ${suffix}`);
    if (target.scope === 'skill') {
      for (const formerLabel of formerLabels) {
        previousTitles.add(`${formerLabel}: ${level} ${suffix}`);
        previousTitles.add(`${formerLabel}: ${suffix}`);
      }
    }
    previousDescription = mode === 'learn'
      ? `Teaching, guided activities and assigned ${level.toLowerCase()} practice.`
      : `Assigned ${level.toLowerCase()} practice with explanations and optional hints.`;
  } else if (target.scope === 'stage') {
    for (const formerLabel of formerLabels) previousTitles.add(`Conditional curriculum: start with ${formerLabel}`);
  }
  return {
    title: !stored.title || previousTitles.has(stored.title) ? generated.title : stored.title,
    description: !stored.description || stored.description === previousDescription ? generated.description : stored.description,
  };
}
