import { describe, expect, it } from 'vitest';
import { safeReviewHubReturn, validateHubOriginOrOrdinary } from './reviewHubReturn';
import { projectReviewRailPrefs, reviewRailLanding } from './railCatalog';

describe('bounded study-work return context', () => {
  it('retains exact type, period, answer and queue identity', () => {
    const target = '/review/progress?window=14&progressArea=RC&progressType=Flaw&progressAnswer=rc%3Aa1#evidence';
    expect(safeReviewHubReturn(target)).toBe(target);
    expect(safeReviewHubReturn('/review/to-review?reason=missed&selected=rc%3As%3Aq&view=table&show=60')).toContain('selected=rc%3As%3Aq');
    expect(safeReviewHubReturn('/progress/topics?window=7')).toBe('/review/progress?window=7&mode=types');
  });
  it.each(['https://evil.test', '//evil.test', '/review/to-review?returnTo=%2Fteacher', '/review/to-review?window=999', '/review/to-review?show=10001', '/review/to-review?reason=missed&reason=flagged', '/review/%2fto-review', '/review/to-review#<script>', '/review/to-review?actor=other', '/review/to-review?selected=' + 'x'.repeat(513)])('rejects unsafe, nested or unbounded origins %s', (target) => {
    expect(safeReviewHubReturn(target)).toBeNull();
  });
  it('keeps established ordinary RC returns and validates hub-looking returns', () => {
    expect(validateHubOriginOrOrdinary('/practice/drills?section=rc#builder')).toBe('/practice/drills?section=rc#builder');
    expect(validateHubOriginOrOrdinary('/review/to-review?returnTo=%2Fteacher')).toBeUndefined();
    expect(validateHubOriginOrOrdinary('/progress/history?window=30')).toBe('/review/history?window=30');
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
