import { describe, expect, it } from 'vitest';
import { fullCourseDrillSets, fullCourseLessons, fullCourseSourceCoverage } from './fullCourseContent';
import { checkResponse, evaluate, valuations } from './fullCourseLogic';
import { atom, not } from './fullCourseItems';

describe('expanded curriculum dependencies and productive coverage',()=>{
  it('tests a fresh majority-plus-exclusion gap with a minority counterexample',()=>{
    const item=fullCourseDrillSets.find(s=>s.id==='quantity-gaps-practice')!.items.find(i=>i.id==='quantity-gaps-transfer-6')!;
    expect(item.prompt).toContain('No trained person works the night shift');
    const trained={people:true,trained:true,listed:false};
    expect(checkResponse(item,{kind:'quantity-case',members:[trained,trained,trained,{people:true,trained:false,listed:true}]}).correct).toBe(true);
    expect(checkResponse(item,{kind:'quantity-case',members:[trained,trained,trained,trained]}).correct).toBe(false);
  });
  it('applies a whole-candidate negation to actual argument premises without assuming its conclusion',()=>{
    const bank=fullCourseDrillSets.find(s=>s.id==='necessary-assumptions-practice')!.items;
    const required=bank.find(i=>i.id==='necessary-assumptions-negation-test-required')!;
    const broad=bank.find(i=>i.id==='necessary-assumptions-negation-test-overbroad')!;
    expect(required.kind).toBe('case'); expect(broad.kind).toBe('case');
    if(required.kind!=='case'||broad.kind!=='case') return;
    const denials=valuations([...required.premises,required.target]).filter(v=>required.premises.every(p=>evaluate(p,v))&&!evaluate(required.target,v));
    expect(denials).toHaveLength(3);
    expect(denials.every(v=>v.third===false && v.fourth===true)).toBe(true);
    expect(checkResponse(required,{kind:'case',values:{first:true,second:false,third:false,fourth:true}}).correct).toBe(true);
    expect(checkResponse(required,{kind:'case',values:{first:true,second:false,third:true,fourth:true}}).correct).toBe(false);
    const surviving=valuations([...broad.premises,broad.target]).filter(v=>broad.premises.every(p=>evaluate(p,v))&&!evaluate(broad.target,v));
    expect(surviving).toHaveLength(1);
    expect(surviving[0]).toEqual({first:true,second:true,third:true,fourth:false});
    expect(checkResponse(broad,{kind:'case',values:surviving[0]}).correct).toBe(true);
  });
  it('puts each practice after an existing same-topic lesson, merging adjacent same-topic banks',()=>{
    for(const set of fullCourseDrillSets){
      const home=fullCourseLessons.find(l=>l.id===set.afterLessonId);
      expect(home, set.id).toBeDefined();
      expect(home?.unitId,set.id).toBe(set.unitId);
      expect(home?.part,set.id).toBe(set.part);
      expect(set.items.length,set.id).toBeGreaterThanOrEqual(6);
    }
    expect(fullCourseDrillSets.some(s=>s.afterLessonId==='two-way-rules')).toBe(false);
    expect(fullCourseDrillSets.some(s=>s.afterLessonId==='direct-chains')).toBe(false);
  });
  it('gives every legacy primary topic a concrete new lesson and source-backed practice home',()=>{
    for(const unit of ['group-3','group-4','mixed-translation','implicit-conditionals','biconditionals','whole-rule-negation','triggering','direct-linking','no-link','domain','quantifier-meaning','quantifier-negation','quantifier-linking','quantifier-invalid','mbt','sufficient-assumption','necessary-assumption','principle','parallel','flaw']){
      expect(fullCourseLessons.some(l=>l.unitId===unit),unit).toBe(true);
      expect(fullCourseDrillSets.some(s=>s.unitId===unit),unit).toBe(true);
    }
    expect(fullCourseSourceCoverage.every(c=>c.sources.length>0 && c.quizItemIds.length===4)).toBe(true);
  });
  it('keeps nesting optional and does not mistake a required domain lesson for supplemental work',()=>{
    expect(fullCourseDrillSets.find(s=>s.unitId==='domain')?.requiredForEditionCompletion).toBe(true);
    expect(fullCourseDrillSets.find(s=>s.id==='nested-extension-practice')?.requiredForEditionCompletion).toBe(false);
  });
  it('accepts the other equivalent Unless orientation, not an unsupported reverse',()=>{
    const item=fullCourseDrillSets.find(s=>s.unitId==='group-3')!.items.find(i=>i.id==='exception-language-transfer-1')!;
    const a=atom('first'),b=atom('second');
    expect(checkResponse(item,{kind:'build-rule',left:not(b),right:a}).correct).toBe(true);
    expect(checkResponse(item,{kind:'build-rule',left:a,right:not(b)}).correct).toBe(false);
  });
  it('requires both implications for a constructed biconditional',()=>{
    const item=fullCourseDrillSets.find(s=>s.unitId==='biconditionals')!.items.find(i=>i.kind==='build-rules')!;
    const a=atom('first'),b=atom('second');
    expect(checkResponse(item,{kind:'build-rules',rules:[{left:a,right:b}]}).correct).toBe(false);
    expect(checkResponse(item,{kind:'build-rules',rules:[{left:a,right:b},{left:b,right:a}]}).correct).toBe(true);
  });
  it('gives every authored primary skill required own-topic practice without unlocking prerequisite destinations',()=>{
    expect(fullCourseDrillSets).toHaveLength(23);
    for(const unit of new Set(fullCourseLessons.filter(l=>l.id!=='nested-extension').map(l=>l.unitId))){
      expect(fullCourseDrillSets.some(set=>set.unitId===unit&&set.requiredForEditionCompletion&&set.requiredAllOfUnitIDs?.length===1&&set.requiredAllOfUnitIDs[0]===unit),unit).toBe(true);
    }
    for(const set of fullCourseDrillSets.filter(s=>s.requiredAllOfUnitIDs!.length>1)) expect(set.title).toMatch(/^Cumulative/);
  });
  it('declares extra topic requirements when the actual task uses them',()=>{
    expect(fullCourseDrillSets.find(s=>s.id==='same-domain-practice')?.requiredAllOfUnitIDs).toContain('domain');
    expect(fullCourseDrillSets.find(s=>s.id==='same-domain-practice')?.requiredAllOfUnitIDs).toEqual(['domain']);
    expect(fullCourseDrillSets.find(s=>s.id==='facts-with-rules-practice')?.requiredAllOfUnitIDs).toEqual(['triggering']);
    expect(fullCourseDrillSets.find(s=>s.id==='conditional-conclusions-practice')?.requiredAllOfUnitIDs).toContain('direct-linking');
  });
});
