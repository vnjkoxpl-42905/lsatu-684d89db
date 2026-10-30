import { describe, expect, it } from 'vitest';
import { COURSE_STEP_REGISTRY, LEGACY_OPENING_COURSE_PATH } from './openingCoursePath';
import { relevantCourseCardLinks } from './courseCardLinks';
import { parseSkillConfig } from './skillPractice';
import { applyConditionalRequirements, PRE_SPLIT_REQUIRED_STEP_IDS } from './courseRequirements';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';

const authorized = applyConditionalRequirements(COURSE_STEP_REGISTRY, { source: 'pre-split-default', revision: 'pre-split-default', requiredStepIds: [...PRE_SPLIT_REQUIRED_STEP_IDS] });
const url = (id: string) => `/opening/${id}?assignment=owned&edition=${FULL_CONDITIONAL_EDITION}`;
const query = (href: string) => new URL(href, 'https://example.test').searchParams;

describe('relevant course card destinations', () => {
  it('maps every actual chapter in both edition-adjusted registries without invented collections',()=>{
    const expected:Record<number,string[]>={1:['foundation','group-1','group-2','indicators','sentence-g1','sentence-g2','sentence-mixed'],2:[],3:['sentence-g3','sentence-g4','sentence-mixed'],4:[],5:[],6:[],7:[]};
    for(const registry of [LEGACY_OPENING_COURSE_PATH,authorized])for(const part of new Set(registry.map(step=>step.part??1))){
      const chapter=registry.filter(step=>(step.part??1)===part);
      expect(relevantCourseCardLinks(chapter,registry,url).map(link=>link.id)).toEqual(expected[part]);
    }
  });
  it('maps actual authorized chapters to real decks and valid sentence-card configs', () => {
    for (const part of new Set(authorized.map(step => step.part))) {
      const chapter = authorized.filter(step => step.part === part);
      const links = relevantCourseCardLinks(chapter, authorized, url);
      if (part! >= 4) expect(links).toEqual([]);
      for (const link of links) {
        const params = query(link.href);
        expect(params.get('assignment')).toBe('owned');
        expect(params.get('edition')).toBe(FULL_CONDITIONAL_EDITION);
        if (link.kind === 'sentence') expect(parseSkillConfig(params, authorized)?.groups).toEqual(link.groups);
        else expect(['foundation', 'group-1', 'group-2', 'indicators']).toContain(params.get('deck'));
      }
    }
  });
  it('gives orientation-only work foundation cards only', () => {
    const orientation = authorized.filter(step => step.unitId === 'orientation');
    expect(relevantCourseCardLinks(orientation, orientation, url).map(link => link.id)).toEqual(['foundation']);
  });
  it('gives group 3 only its sentence cards', () => {
    const group3 = authorized.filter(step => step.unitId === 'group-3');
    const links = relevantCourseCardLinks(group3, group3, url);
    expect(links.map(link => link.id)).toEqual(['sentence-g3']);
    expect(parseSkillConfig(query(links[0].href), group3)?.groups).toEqual(['g3']);
  });
  it('preserves combined sentence review only across the groups in the current scope',()=>{
    const chapter1=authorized.filter(step=>step.part===1);
    const mixed=relevantCourseCardLinks(chapter1,authorized,url).find(link=>link.id==='sentence-mixed')!;
    expect(mixed.groups).toEqual(['g1','g2']);
    expect(parseSkillConfig(query(mixed.href),authorized)?.groups).toEqual(['g1','g2']);
    const all=relevantCourseCardLinks(authorized,authorized,url).find(link=>link.id==='sentence-mixed')!;
    expect(all.groups).toEqual(['g1','g2','g3','g4']);
    const group3=authorized.filter(step=>step.unitId==='group-3');
    expect(relevantCourseCardLinks(group3,group3,url).some(link=>link.id==='sentence-mixed')).toBe(false);
  });
  it('requires both groups for mixed indicators and intersects authorized IDs', () => {
    const one = authorized.filter(step => step.unitId === 'group-1' || step.id === 'sufficient');
    expect(relevantCourseCardLinks(authorized, one, url).some(link => link.id === 'indicators')).toBe(false);
    expect(relevantCourseCardLinks(authorized, [], url)).toEqual([]);
    const first = authorized.filter(step => step.part === 1);
    expect(relevantCourseCardLinks(first, authorized, url).some(link => link.id === 'indicators')).toBe(true);
  });
  it('accepts only relevant authorized note return IDs', () => {
    const note = authorized.find(step => step.id === 'exception-language')!;
    const links = relevantCourseCardLinks([note], authorized, url, note.id);
    expect(links.length).toBeGreaterThan(0);
    expect(query(links[0].href).get('from')).toBe(note.id);
    for (const invalid of ['unknown', 'exception-language-practice', 'sufficient']) {
      expect(relevantCourseCardLinks([note], authorized, url, invalid).every(link => !query(link.href).has('from'))).toBe(true);
    }
  });
});
