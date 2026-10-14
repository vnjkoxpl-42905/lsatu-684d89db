export interface IndicatorMarkupSegment {
  kind: 'text' | 'indicator';
  text: string;
  indicatorType?: string;
}

const INDICATOR_RE = /<i-w t="([^"]+)">([^<]+)<\/i-w>/g;

export function stripIndicatorMarkup(text: string): string {
  return text.replace(INDICATOR_RE, '$2');
}

export function parseIndicatorMarkup(text: string): IndicatorMarkupSegment[] {
  const segments: IndicatorMarkupSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = INDICATOR_RE.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({
        kind: 'text',
        text: text.slice(cursor, match.index),
      });
    }

    segments.push({
      kind: 'indicator',
      text: match[2],
      indicatorType: match[1],
    });

    cursor = INDICATOR_RE.lastIndex;
  }

  if (cursor < text.length) {
    segments.push({
      kind: 'text',
      text: text.slice(cursor),
    });
  }

  return segments;
}

export function indicatorTone(type: string | undefined): 'premise' | 'pivot' | 'opposing' | 'concession' | 'opinion' | 'conclusion' {
  if (!type) return 'premise';
  if (type.includes('Premise')) return 'premise';
  if (type.includes('Pivot')) return 'pivot';
  if (type.includes('Opposing')) return 'opposing';
  if (type.includes('Concession')) return 'concession';
  if (type.includes('Opinion')) return 'opinion';
  return 'conclusion';
}
