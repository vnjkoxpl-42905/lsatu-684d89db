import * as React from 'react';
import { RcMarkdown } from './RcMarkdown';
import type { RcSummaries } from '../lib/rcTypes';

/**
 * The authored summary of a passage, shown under the passage in review and
 * collapsed by default so it never pre-empts the student's own reading.
 *
 * Only 47 of the 320 passages have a Brief or Another Way summary. A style that
 * was never authored gets no tab, and a passage with only a Standard summary
 * gets no tab row at all.
 */

const STYLES: { key: keyof RcSummaries; label: string }[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'brief', label: 'Brief' },
  { key: 'anotherWay', label: 'Another Way' },
];

export function RcPassageSummary({ summaries }: { summaries: RcSummaries }) {
  const available = STYLES.filter(({ key }) => !!summaries[key]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<keyof RcSummaries>(available[0]?.key ?? 'standard');

  if (available.length === 0) return null;

  return (
    <div className="rc-summary-toggle">
      <button
        type="button"
        className="rc-button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide passage summary' : 'Show passage summary'}
      </button>

      {open && (
        <>
          {available.length > 1 && (
            <div className="rc-summary-tabs" role="tablist">
              {available.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active === key}
                  className={`rc-summary-tab${active === key ? ' rc-active' : ''}`}
                  onClick={() => setActive(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="rc-summary-body">
            <RcMarkdown>{summaries[active]}</RcMarkdown>
          </div>
        </>
      )}
    </div>
  );
}

export default RcPassageSummary;
