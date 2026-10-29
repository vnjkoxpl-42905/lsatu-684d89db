import { describe, expect, it } from 'vitest';
import { allowedSkillGroups, clearSkillQuery, parseSkillConfig, skillPracticeUrl } from './skillPractice';
import { COURSE_STEP_REGISTRY } from './openingCoursePath';
import { flashcardUrl } from './components/FlashcardTools';

const only = (unit: string) => COURSE_STEP_REGISTRY.filter(step => step.unitId === unit);
const url = (view: string) => `/course/${view}?assignment=grant-A&edition=full-conditionals-v3&activity=sort&groups=g1,g2&from=sufficient&deck=group-1&card=if`;
describe('Supplementary course practice links', () => {
  it('retains course identity while replacing stale activity settings', () => {
    const linked = new URL(skillPracticeUrl(url, { kind: 'diagram', groups: ['g3'], from: 'exception-language' }), 'https://example.test');
    expect(linked.searchParams.get('assignment')).toBe('grant-A');
    expect(linked.searchParams.get('edition')).toBe('full-conditionals-v3');
    expect(linked.searchParams.get('activity')).toBe('diagram');
    expect(linked.searchParams.get('groups')).toBe('g3');
    expect(linked.searchParams.has('deck')).toBe(false);
    expect(linked.searchParams.has('card')).toBe(false);
  });
  it('removes all owned activity parameters when returning to a lesson', () => {
    const params = clearSkillQuery(new URLSearchParams('assignment=A&edition=full-conditionals-v3&activity=diagram&groups=g3&stage=contrapositive&review=needs&item=d10&round=2&from=exception-language&deck=group-1&card=if'));
    expect(params.toString()).toBe('assignment=A&edition=full-conditionals-v3');
  });
  it('writes a specific existing deck and card after clearing other modes', () => {
    const linked = new URL(flashcardUrl(url, 'group-2', 'only', 'necessary'), 'https://example.test');
    expect(linked.searchParams.get('deck')).toBe('group-2');
    expect(linked.searchParams.get('card')).toBe('only');
    expect(linked.searchParams.has('activity')).toBe(false);
    expect(linked.searchParams.get('assignment')).toBe('grant-A');
  });
  it('does not offer Group 1/2 to a Group 3-only grant', () => {
    const steps = only('group-3');
    expect(allowedSkillGroups(steps)).toEqual(['g3']);
    expect(parseSkillConfig(new URLSearchParams('activity=diagram&groups=g3'), steps)?.groups).toEqual(['g3']);
    expect(parseSkillConfig(new URLSearchParams('activity=diagram&groups=g1'), steps)).toBeNull();
    expect(parseSkillConfig(new URLSearchParams('activity=sort&groups=g3'), steps)).toBeNull();
    expect(parseSkillConfig(new URLSearchParams('activity=missing-links'), steps)).toBeNull();
  });
  it('fails closed for altered settings, unauthorized origin and malformed rounds', () => {
    for (const query of ['activity=oops', 'activity=diagram&stage=fast', 'activity=diagram&groups=g1,g1', 'activity=diagram&groups=all', 'activity=diagram&from=https://evil.test', 'activity=missing-links&round=1.5', 'activity=missing-links&round=0', 'activity=diagram&review=hidden']) expect(parseSkillConfig(new URLSearchParams(query), COURSE_STEP_REGISTRY)).toBeNull();
  });
  it('supports a Missing Links-only context without unrelated group access', () => {
    expect(parseSkillConfig(new URLSearchParams('activity=missing-links&round=3'), only('sufficient-assumption'))).toMatchObject({ kind: 'missing-links', round: 3, groups: [] });
  });
});
