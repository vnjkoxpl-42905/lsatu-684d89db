import { describe, expect, it } from 'vitest';
import { COURSE_STEP_REGISTRY, LEGACY_OPENING_COURSE_PATH } from './openingCoursePath';
import { applyConditionalRequirements, PRE_SPLIT_REQUIRED_STEP_IDS } from './courseRequirements';
import { courseBrowseUrl, readCourseBrowseContext, withCourseBrowseContext } from './courseBrowse';
import { flashcardUrl } from './flashcardNavigation';

const authorized=applyConditionalRequirements(COURSE_STEP_REGISTRY,{source:'pre-split-default',revision:'pre-split-default',requiredStepIds:[...PRE_SPLIT_REQUIRED_STEP_IDS]});
const url=(view:string)=>`/opening/${view}?assignment=owned&edition=full-conditionals-v3`;
const params=(href:string)=>new URL(href,'https://local.test').searchParams;

describe('course browsing context',()=>{
  it('keeps chapter and identity while switching work, but not another kind’s status or player selection',()=>{
    for(const kind of ['lessons','drills','flashcards'] as const){
      const href=courseBrowseUrl(url,kind,3,'exception-language');
      const query=params(href);
      expect(query.get('assignment')).toBe('owned');expect(query.get('edition')).toBe('full-conditionals-v3');
      expect(query.get('courseChapter')).toBe('3');
      expect(query.get('courseContent')).toBe(kind==='flashcards'?null:kind);
      expect(query.get('from')).toBe(kind==='flashcards'?'exception-language':null);
      expect(new URL(href,'https://local.test').pathname).toBe(`/opening/${kind==='flashcards'?'tools':'chapter-3'}`);
    }
    expect(params(courseBrowseUrl(url,'drills')).has('courseContent')).toBe(false);
    expect(new URL(courseBrowseUrl(url,'lessons'),'https://local.test').pathname).toBe('/opening/lessons');
  });
  it('validates chapter and note context against actual authorized steps',()=>{
    expect(readCourseBrowseContext(new URLSearchParams('courseChapter=3&from=exception-language'),authorized)).toEqual({chapter:3,from:'exception-language'});
    expect(readCourseBrowseContext(new URLSearchParams('courseChapter=3&from=exception-language'),LEGACY_OPENING_COURSE_PATH)).toEqual({});
    for(const from of ['unknown','exception-language-practice','https://other.test'])expect(readCourseBrowseContext(new URLSearchParams({from}),authorized).from).toBeUndefined();
    for(const chapter of ['999','3.1','-1','NaN'])expect(readCourseBrowseContext(new URLSearchParams({courseChapter:chapter}),authorized).chapter).toBeUndefined();
  });
  it('decorates native player links with only deliberate validated browse context',()=>{
    const context=readCourseBrowseContext(new URLSearchParams('courseChapter=3&from=exception-language'),authorized);
    const href=withCourseBrowseContext('/tools?assignment=owned&activity=translate-cards&groups=g3&stage=contrapositive&review=needs&courseChapter=1&courseStatus=completed&courseContent=drills&from=old#answer',context);
    const query=params(href);
    expect(query.get('courseChapter')).toBe('3');expect(query.get('from')).toBe('exception-language');
    expect(query.get('courseStatus')).toBeNull();expect(query.get('courseContent')).toBeNull();
    expect(query.get('groups')).toBe('g3');expect(query.get('stage')).toBe('contrapositive');expect(query.get('review')).toBe('needs');
    expect(href.endsWith('#answer')).toBe(true);
    expect(withCourseBrowseContext('/tools?courseChapter=3&from=bad',{})).toBe('/tools');
  });
  it('preserves precise old deck/card links after extracting the pure builder',()=>{
    expect(flashcardUrl(url,'group-1','if','sufficient')).toBe('/opening/tools?assignment=owned&edition=full-conditionals-v3&deck=group-1&card=if&from=sufficient');
  });
});
