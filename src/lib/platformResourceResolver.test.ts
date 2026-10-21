import { describe, expect, it } from 'vitest';
import {
  buildResourceQuery,
  inferKindHints,
  normalizeResolverText,
  pickBestResourceCandidate,
  resolveCommandIntent,
  resolveLatestResourceQuery,
  type ResourceCandidate,
} from '../../supabase/functions/_shared/platformResourceResolver';

const candidates: ResourceCandidate[] = [
  {
    id: 'activity-negation',
    kind: 'activity',
    source_id: 'negation-activity-id',
    title: 'Negation Station',
    subtitle: 'Statement Negation Drill',
    url: '/activities',
  },
  {
    id: 'bootcamp-causation',
    kind: 'route',
    source_id: '/bootcamp/causation-station',
    title: 'Causation Station',
    subtitle: 'Bootcamp',
    url: '/bootcamp/causation-station',
  },
  {
    id: 'guided-negation-basics',
    kind: 'guided_drill',
    source_id: 'negation-basics',
    title: 'Negation Basics',
    subtitle: 'Guided drill',
    url: '/guided',
  },
];

describe('platform resource resolver', () => {
  it('normalizes centre spelling and common typos before resolving', () => {
    expect(normalizeResolverText('open Activity Centre')).toBe('open activity center');
    expect(normalizeResolverText('send the nefation station drill')).toBe('send the negation station drill');
  });

  it('detects assignment intent for send/assign resource language', () => {
    expect(resolveCommandIntent('send negation station to dakota')).toBe('assign');
    expect(resolveCommandIntent('assign causation station to dakota')).toBe('assign');
    expect(resolveCommandIntent('send dakota a message')).toBe('message');
    expect(resolveCommandIntent('open activity centre')).toBe('open');
  });

  it('extracts the resource phrase from direct assignment requests', () => {
    expect(buildResourceQuery('send the negation station drill to dakota brown', 'Dakota Brown')).toBe(
      'negation station',
    );
    expect(buildResourceQuery('assign causation station to dakota', 'Dakota Brown')).toBe('causation station');
  });

  it('uses the newest correction as the resource while carrying the prior student', () => {
    const query = resolveLatestResourceQuery(
      ['i want to send causation station to dakota', 'no send him the negation station drill'],
      'Dakota Brown',
    );

    expect(query).toBe('negation station');
  });

  it('prefers the Negation Station activity over a bootcamp when the user says drill', () => {
    const picked = pickBestResourceCandidate(candidates, 'negation station', inferKindHints('negation station drill'));

    expect(picked?.kind).toBe('activity');
    expect(picked?.title).toBe('Negation Station');
  });

  it('does not let a drill hint accidentally choose Causation Station for Negation Station', () => {
    const picked = pickBestResourceCandidate(candidates, 'nefation station drill', inferKindHints('nefation station drill'));

    expect(picked?.source_id).toBe('negation-activity-id');
  });

  it('allows Causation Station to resolve to its bootcamp route', () => {
    const picked = pickBestResourceCandidate(candidates, 'causation station', inferKindHints('causation station'));

    expect(picked?.source_id).toBe('/bootcamp/causation-station');
  });
});
