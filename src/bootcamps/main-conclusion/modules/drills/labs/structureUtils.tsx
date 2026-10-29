/**
 * Shared rendering helpers for structure-based drill labs (Argument Structure,
 * Classification, Mixed Structure Check). All drills operate on the same
 * StructureItem shape; only the step protocol differs.
 */

import { Fragment } from 'react';

/** Strip the <i-w t="..."> wrappers from the source HTML reference and render plain text. */
export function plainText(html: string): string {
  return html.replace(/<i-w[^>]*>(.*?)<\/i-w>/g, '$1');
}

/**
 * Render a span with indicator-word highlights inlined. We use Tailwind utility
 * classes mapping to role-color tokens from DESIGN.md.
 */
export function IndicatorText({ html }: { html: string }) {
  const re = /<i-w t="([^"]+)">([^<]+)<\/i-w>/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(html))) {
    if (m.index > last) nodes.push(html.slice(last, m.index));
    const type = m[1] ?? '';
    const word = m[2] ?? '';
    
    // Map to role tokens from DESIGN.md
    let tone = 'text-[color:var(--role-concession)]'; // Default/Concession
    if (type.includes('Conclusion')) tone = 'text-[color:var(--role-conclusion)]';
    else if (type.includes('Premise')) tone = 'text-[color:var(--role-premise)]';
    else if (type.includes('Opposing')) tone = 'text-[color:var(--role-opposing)]';
    else if (type.includes('Pivot')) tone = 'text-[color:var(--role-pivot)]';

    nodes.push(
      <span key={key++} className={`${tone} font-semibold`} title={type}>
        {word}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < html.length) nodes.push(html.slice(last));
  return (
    <Fragment>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </Fragment>
  );
}

export type StructureMode = 'first' | 'rebuttal';

export interface FlowStep {
  step: number;
  totalSteps: number;
}
