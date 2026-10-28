import type { OpeningCourseStep } from './openingCoursePath';
import type { OpeningCourseUrl } from './components/OpeningCourse';
import type { GroupId } from '@/features/conditional-refresher/content';

export const SKILL_QUERY_KEYS = ['activity', 'groups', 'stage', 'review', 'item', 'round', 'from', 'deck', 'card'] as const;
export function clearSkillQuery(params: URLSearchParams) { SKILL_QUERY_KEYS.forEach(key => params.delete(key)); return params; }
export type SkillKind = 'sort' | 'translate-cards' | 'diagram' | 'unless' | 'missing-links';
export interface SkillConfig { kind: SkillKind; groups: GroupId[]; stage: 'translate' | 'contrapositive'; review: 'all' | 'needs'; from?: string; itemId?: string; round?: number }
export const GROUP_ORDER: GroupId[] = ['g1', 'g2', 'g3', 'g4'];
export function allowedSkillGroups(steps: OpeningCourseStep[]): GroupId[] {
  return GROUP_ORDER.filter(group => steps.some(step => group === 'g1' ? step.unitId === 'group-1' || step.id === 'sufficient'
    : group === 'g2' ? step.unitId === 'group-2' || step.id === 'necessary'
    : step.unitId === (group === 'g3' ? 'group-3' : 'group-4')));
}
export function skillKindAllowed(kind: SkillKind, steps: OpeningCourseStep[]) {
  const groups = allowedSkillGroups(steps);
  if (kind === 'unless') return groups.includes('g3');
  if (kind === 'missing-links') return steps.some(step => step.id === 'missing-bridges');
  return kind === 'sort' ? groups.length > 1 : groups.length > 0;
}
export function parseSkillConfig(params: URLSearchParams, steps: OpeningCourseStep[]): SkillConfig | null {
  const kind = params.get('activity') as SkillKind;
  if (!['sort', 'translate-cards', 'diagram', 'unless', 'missing-links'].includes(kind) || !skillKindAllowed(kind, steps)) return null;
  const allowed = allowedSkillGroups(steps);
  const groups = params.has('groups') ? params.get('groups')!.split(',') as GroupId[] : allowed;
  if (!groups.length && !['missing-links'].includes(kind) || new Set(groups).size !== groups.length || groups.some(group => !allowed.includes(group))) return null;
  if (kind === 'sort' && groups.length < 2) return null;
  const stage = params.get('stage') ?? 'translate';
  const review = params.get('review') ?? 'all';
  const from = params.get('from') ?? undefined;
  const round = params.has('round') ? Number(params.get('round')) : undefined;
  if (!['translate', 'contrapositive'].includes(stage) || !['all', 'needs'].includes(review)
    || from && !steps.some(step => step.type === 'note' && step.id === from)
    || round !== undefined && (!Number.isInteger(round) || round < 1 || round > 3)) return null;
  return { kind, groups: GROUP_ORDER.filter(group => groups.includes(group)), stage: stage as SkillConfig['stage'], review: review as SkillConfig['review'], from, itemId: params.get('item') ?? undefined, round };
}
export function skillPracticeUrl(url: OpeningCourseUrl, config: Partial<SkillConfig> & Pick<SkillConfig, 'kind'>) {
  const [path, query = ''] = url(config.kind === 'translate-cards' ? 'tools' : 'practice').split('?');
  const params = clearSkillQuery(new URLSearchParams(query));
  params.set('activity', config.kind);
  if (config.groups?.length) params.set('groups', GROUP_ORDER.filter(group => config.groups!.includes(group)).join(','));
  if (config.stage) params.set('stage', config.stage);
  if (config.review) params.set('review', config.review);
  if (config.from) params.set('from', config.from);
  if (config.itemId) params.set('item', config.itemId);
  if (config.round) params.set('round', String(config.round));
  params.delete('run');
  return `${path}?${params}`;
}

export function lessonSkillGroup(id: string): GroupId | undefined {
  return id === 'sufficient' ? 'g1' : id === 'necessary' ? 'g2' : id === 'exception-language' ? 'g3' : id === 'exclusion-language' ? 'g4' : undefined;
}
