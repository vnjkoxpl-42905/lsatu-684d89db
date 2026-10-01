import type { ConditionalArea, ConditionalDifficulty } from '@/bootcamps/conditionals/content/types';

export interface ConditionalAssignmentTarget {
  scope: 'course' | 'area' | 'skill' | 'general';
  mode: 'learn' | 'practice';
  difficulty: ConditionalDifficulty;
  unitId?: string;
  area?: ConditionalArea;
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
  return [target.scope, target.scope === 'skill' ? target.unitId : target.scope === 'area' ? target.area : 'conditional',
    target.scope === 'general' ? 'practice' : target.mode, target.difficulty].join(':');
}
export async function resolveConditionalAssignment(target: ConditionalAssignmentTarget = DEFAULT_CONDITIONAL_TARGET) {
  if (!['course', 'area', 'skill', 'general'].includes(target.scope) ||
      !['learn', 'practice'].includes(target.mode) ||
      !['beginner', 'medium', 'advanced'].includes(target.difficulty)) {
    throw new Error('Choose a valid conditional scope, learning mode and difficulty.');
  }
  const base = '/bootcamp/conditionals';
  if (target.scope === 'course') return {
    route: base, title: 'Conditional Logic Bootcamp',
    description: 'The foundation path, followed by Medium and Advanced practice. Quantifiers follow conditionals.',
    target: { ...DEFAULT_CONDITIONAL_TARGET }, key: 'course',
  };
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
  const difficultyTitle = target.difficulty[0].toUpperCase() + target.difficulty.slice(1);
  return {
    route, title: `${label}: ${difficultyTitle} ${mode === 'learn' ? 'learning and practice' : 'practice'}`,
    description: mode === 'learn' ? `Teaching, worked examples and focused ${target.difficulty} practice. Harder practice names its prerequisites.` : `Focused ${target.difficulty} practice with explanations and optional hints.`,
    target: { scope: target.scope, mode, difficulty: target.difficulty,
      ...(target.scope === 'skill' ? { unitId: target.unitId } : {}), ...(target.scope === 'area' ? { area: target.area } : {}) } as ConditionalAssignmentTarget,
    key: conditionalTargetKey({ ...target, mode }),
  };
}
