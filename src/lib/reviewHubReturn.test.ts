import { describe, expect, it } from 'vitest';
import { safeReviewHubReturn, validateHubOriginOrOrdinary, reviewHubReturnTo } from './reviewHubReturn';
import { projectReviewRailPrefs, reviewRailLanding } from './railCatalog';

describe('bounded study-work return context', () => {
  it('retains exact type, period, answer and queue identity', () => {
    const target = '/review/progress?window=14&progressArea=RC&progressType=Flaw&progressAnswer=rc%3Aa1#evidence';
    expect(safeReviewHubReturn(target)).toBe(target);
    expect(safeReviewHubReturn('/review/to-review?reason=missed&selected=rc%3As%3Aq&view=table&show=60')).toContain('selected=rc%3As%3Aq');
    expect(safeReviewHubReturn('/progress/topics?window=7')).toBe('/review/progress?window=7&mode=types');
  });
  it.each(['https://evil.test', '//evil.test', '/review/to-review?returnTo=%2Fteacher', '/review/to-review?window=999', '/review/to-review?reason=missed&reason=flagged', '/review/%2fto-review', '/review/to-review#<script>'])('rejects unsafe, nested or unbounded origins %s', (target) => {
    expect(safeReviewHubReturn(target)).toBeNull();
  });
  it('keeps established ordinary RC returns and validates hub-looking returns', () => {
    expect(validateHubOriginOrOrdinary('/practice/drills?section=rc#builder')).toBe('/practice/drills?section=rc#builder');
    expect(validateHubOriginOrOrdinary('/review/to-review?returnTo=%2Fteacher')).toBeUndefined();
    expect(validateHubOriginOrOrdinary('/review%2Fprogress?progressArea=RC')).toBeUndefined();
    expect(validateHubOriginOrOrdinary('/re%76iew/progress?progressArea=RC')).toBeUndefined();
    expect(validateHubOriginOrOrdinary('/progress/history?window=30')).toBe('/review/history?window=30');
    for (const path of ['/Review/progress?progressArea=invalid', '/PROGRESS/history?returnTo=%2Fteacher', '/Analytics', '/History', '/%52eview/progress']) {
      expect(validateHubOriginOrOrdinary(path), path).toBeUndefined();
    }
    expect(validateHubOriginOrOrdinary('/Practice/drills?section=rc')).toBe('/Practice/drills?section=rc');
  });
  it('preserves literal percent search text through one outer detail return decoding', () => {
    for (const term of ['100% correct', '%41', 'literal %2F and %25', '%']) {
      for (const [path, key] of [['to-review','q'], ['history','historySearch']]) {
        const target = `/review/${path}?${new URLSearchParams({[key]: term})}`;
        expect(safeReviewHubReturn(target), target).toBe(target);
        expect(reviewHubReturnTo(`?${new URLSearchParams({returnTo: target})}`), target).toBe(target);
      }
    }
  });
});

describe('one review rail projection', () => {
  it.each([[['review'], false], [['progress'], false], [['review', 'progress'], true], [[], false]] as const)('projects legacy visibility %j', (hidden, expected) => {
    const raw = { order: { classroom: ['progress', 'home', 'review', 'library'] }, hidden: [...hidden] };
    const next = projectReviewRailPrefs(raw);
    expect(next.order.classroom).toEqual(['review', 'home', 'library']);
    expect(next.hidden.includes('review')).toBe(expected);
    expect(raw.order.classroom).toContain('progress');
    expect(projectReviewRailPrefs(next)).toEqual(next);
  });
  it('preserves progress-only landing until first explicit Save', () => {
    const old = { order: {}, hidden: ['review'] };
    expect(reviewRailLanding(old, true)).toBe('/review/progress');
    expect(reviewRailLanding(old, false)).toBe('/review/to-review');
    expect(projectReviewRailPrefs({order: {}, hidden: ['review'], reviewHub: true}).hidden).toEqual(['review']);
  });
});

describe('frozen return contract boundaries', () => {
  it('clamps bounded integer queue pagination and rejects non-safe representations', () => {
    for (const [input, output] of [['0','30'],['-5','30'],['30','30'],['31','31'],['1000','1000'],['10001','1000']]) expect(safeReviewHubReturn(`/review/to-review?show=${input}`)).toBe(`/review/to-review?show=${output}`);
    for (const value of ['1.5','Infinity','1e3','9007199254740992','']) expect(safeReviewHubReturn(`/review/to-review?show=${value}`)).toBeNull();
    expect(safeReviewHubReturn('/review/to-review')).toBe('/review/to-review');
  });
  it('enforces total decoded length and exact text/id bounds', () => {
    const base = '/review/progress?unknown=';
    expect(safeReviewHubReturn(base+'x'.repeat(8192-base.length))).toBe('/review/progress');
    expect(safeReviewHubReturn(base+'x'.repeat(8193-base.length))).toBeNull();
    for (const [path,key,max] of [['to-review','q',256],['to-review','selected',512],['progress','progressAnswer',512],['history','historySelected',512],['history','historySearch',120],['history','historyTopic',80]] as const) {
      expect(safeReviewHubReturn(`/review/${path}?${key}=${'x'.repeat(max)}`)).not.toBeNull();
      expect(safeReviewHubReturn(`/review/${path}?${key}=${'x'.repeat(max+1)}`)).toBe(key === 'selected' ? '/review/to-review' : null);
    }
    expect(safeReviewHubReturn('/review/progress#'+'a'.repeat(127))).not.toBeNull();
    expect(safeReviewHubReturn('/review/progress#'+'a'.repeat(128))).toBeNull();
  });
  it('drops unknown names containing carrier words and only drops an invalid safe queue selection', () => {
    expect(safeReviewHubReturn('/review/to-review?reason=missed&nextPage=2&urlLabel=Question&returnCount=3')).toBe('/review/to-review?reason=missed');
    for (const selected of ['not an id','', 'x'.repeat(513)]) {
      const params = new URLSearchParams({reason:'missed',area:'lr',selected,q:'Main conclusion'});
      expect(safeReviewHubReturn(`/review/to-review?${params}`)).toBe('/review/to-review?reason=missed&area=lr&q=Main+conclusion');
    }
    for (const key of ['returnTo','Return_URL','redirect_uri','next','callbackUrl','continueTo','destinationPath']) {
      expect(safeReviewHubReturn(`/review/to-review?reason=missed&${key}=%2Fteacher`),key).toBeNull();
    }
    expect(safeReviewHubReturn('/review/to-review?reason=missed&selected=bad%00id')).toBeNull();
    expect(safeReviewHubReturn('/review/to-review?reason=missed&selected='+'x'.repeat(8192))).toBeNull();
  });
  it('fails closed for malformed enums/IDs and cross-view state, drops ordinary unknown/development state', () => {
    for (const value of ['/review/to-review?reason=unknown','/review/to-review?area=LR','/review/to-review?source=unknown','/review/to-review?view=cards','/review/progress?progressType=NotAType','/review/progress?progressArea=lr','/review/progress?progressEvidence=repeat','/review/history?historySource=practice_test_runs','/review/history?historyMode=unknown','/review/history?historySort=newest','/review/to-review?window=30','/review/progress?reason=missed','/review/history?progressArea=RC','/review/progress?progressAnswer=not%20an%20id']) expect(safeReviewHubReturn(value),value).toBeNull();
    expect(safeReviewHubReturn('/review/progress?window=14&variant=desk&view=types&production=1&unrelated=x')).toBe('/review/progress?window=14');
    expect(safeReviewHubReturn('/history?area=rc&window=7')).toBe('/review/history?historyArea=RC&window=7');
    expect(safeReviewHubReturn('/review/progress?progressType=Unclassified')).not.toBeNull();
    expect(safeReviewHubReturn('/review/history?historyTopic=absent',{historyTopics:new Set(['Flaw'])})).toBe('/review/history');
  });
  it('rejects nested carriers and ambiguous double encoding, and roundtrips current producer context', () => {
    for (const value of ['/review/to-review?returnTo=%2Fteacher','/review/to-review?return%2554o=%2Fteacher','/review/to-review?next=%2Fteacher','/review/%252fto-review','/review/progress?progressAnswer=x%253Fy','/review/progress?progressAnswer=x%252Fy']) expect(safeReviewHubReturn(value),value).toBeNull();
    const target = '/review/history?window=all&historyArea=RC&historyResult=missed&historyAnswer=first&historySort=oldest&historySource=rc_attempts&historyMode=rc-drill&historyTopic=Main+Idea&historySearch=PT+101&historySelected=rc_attempts%3Aa-1';
    expect(safeReviewHubReturn(safeReviewHubReturn(target))).toBe(target);
    expect(reviewHubReturnTo('?returnTo='+encodeURIComponent(target))).toBe(target);
    expect(reviewHubReturnTo('?returnTo='+encodeURIComponent(target)+'&returnTo=%2Freview%2Fto-review')).toBeNull();
  });
});
