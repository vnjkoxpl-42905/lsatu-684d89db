import { describe, expect, it } from 'vitest';

import { parseIndicatorMarkup, stripIndicatorMarkup } from './indicatorMarkup';

describe('indicatorMarkup', () => {
  it('strips custom indicator markup back to readable text', () => {
    expect(
      stripIndicatorMarkup(
        'The author <i-w t="Opinion Indicator">should</i-w> reconsider the rule <i-w t="Pivot">but</i-w> not abandon it.',
      ),
    ).toBe('The author should reconsider the rule but not abandon it.');
  });

  it('parses indicator regions and preserves plain text order', () => {
    expect(
      parseIndicatorMarkup(
        '<i-w t="Concession Indicator">Although</i-w> the critics object, <i-w t="Pivot">however</i-w> the policy <i-w t="Opinion Indicator">should</i-w> stand.',
      ),
    ).toEqual([
      { kind: 'indicator', text: 'Although', indicatorType: 'Concession Indicator' },
      { kind: 'text', text: ' the critics object, ' },
      { kind: 'indicator', text: 'however', indicatorType: 'Pivot' },
      { kind: 'text', text: ' the policy ' },
      { kind: 'indicator', text: 'should', indicatorType: 'Opinion Indicator' },
      { kind: 'text', text: ' stand.' },
    ]);
  });
});
