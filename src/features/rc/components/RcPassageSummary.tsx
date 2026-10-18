import * as React from 'react';
import { RcMarkdown } from './RcMarkdown';
import { RcExplanationMedia } from './RcExplanationMedia';
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
  const available = React.useMemo(() => STYLES.filter(({ key }) => Boolean(summaries[key]?.trim())), [summaries]);
  const summaryId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<keyof RcSummaries>(available[0]?.key ?? 'standard');

  React.useEffect(() => { setOpen(false); setActive(available[0]?.key ?? 'standard'); }, [summaries, available]);
  const activeStyle = available.some(style => style.key === active) ? active : available[0]?.key ?? 'standard';
  if (available.length === 0) return <p className="rc-summary-toggle">No passage summary has been authored for this passage yet.</p>;

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
            <div className="rc-summary-tabs" role="tablist" aria-label="Passage summary style">
              {available.map(({ key, label }, index) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`${summaryId}-${key}`}
                  aria-controls={`${summaryId}-panel`}
                  aria-selected={activeStyle === key}
                  tabIndex={activeStyle === key ? 0 : -1}
                  ref={element => { tabRefs.current[index] = element; }}
                  className={`rc-summary-tab${activeStyle === key ? ' rc-active' : ''}`}
                  onClick={() => setActive(key)}
                  onKeyDown={event => {
                    const next = event.key === 'ArrowRight' ? (index + 1) % available.length
                      : event.key === 'ArrowLeft' ? (index + available.length - 1) % available.length
                        : event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : null;
                    if (next === null) return;
                    event.preventDefault(); setActive(available[next].key); tabRefs.current[next]?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="rc-summary-body" id={`${summaryId}-panel`} role={available.length > 1 ? 'tabpanel' : undefined} aria-labelledby={available.length > 1 ? `${summaryId}-${activeStyle}` : undefined}>
            <RcMarkdown>{summaries[activeStyle]?.replace(/^https:\/\/[^\s]+\.(?:mp4|webm|mp3)(?:\?[^\s]*)?\s*/i, '')}</RcMarkdown>
            {/^https:\/\/[^\s]+\.(?:mp4|webm|mp3)(?:\?[^\s]*)?/i.test(summaries[activeStyle] ?? '') && <RcExplanationMedia media={[{
              kind: 'video', src: summaries[activeStyle]!.split(/\s/)[0], title: 'Imported passage explanation', transcript: '',
            }]} />}
          </div>
        </>
      )}
    </div>
  );
}

export default RcPassageSummary;
