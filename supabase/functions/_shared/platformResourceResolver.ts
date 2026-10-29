export type CommandIntent = 'open' | 'assign' | 'message' | 'draft' | 'inspect' | 'find' | 'unknown';

export interface ResourceCandidate {
  id: string;
  kind: string;
  source_id: string;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  snippet?: string | null;
  score?: number | null;
}

const RESOURCE_STOP_WORDS = new Set([
  'a',
  'an',
  'activity',
  'assign',
  'assigned',
  'bootcamp',
  'can',
  'could',
  'drill',
  'drop',
  'for',
  'give',
  'guided',
  'him',
  'her',
  'i',
  'it',
  'its',
  'link',
  'me',
  'message',
  'no',
  'not',
  'page',
  'please',
  'resource',
  'send',
  'student',
  'that',
  'the',
  'this',
  'to',
  'want',
  'you',
]);

const ALIASES: Array<[RegExp, string]> = [
  [/\bcentre\b/g, 'center'],
  [/\bnefation\b/g, 'negation'],
  [/\bnegatoin\b/g, 'negation'],
  [/\bcauseation\b/g, 'causation'],
  [/\biwantto\b/g, 'i want to'],
  [/\bwantto\b/g, 'want to'],
];

export function normalizeResolverText(value: string): string {
  let text = value.toLowerCase();
  for (const [pattern, replacement] of ALIASES) text = text.replace(pattern, replacement);
  return text.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeResolverText(value).split(/\s+/).filter(Boolean));
}

function compactResourceWords(text: string, studentName?: string | null): string {
  const studentTokens = studentName ? tokenSet(studentName) : new Set<string>();
  return normalizeResolverText(text)
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .filter((token) => !RESOURCE_STOP_WORDS.has(token))
    .filter((token) => !studentTokens.has(token))
    .join(' ')
    .trim();
}

export function resolveCommandIntent(text: string): CommandIntent {
  const t = normalizeResolverText(text);
  if (/\b(email|message|reply|text)\b/.test(t) && !/\b(activity|drill|bootcamp|station|homework|page|resource|link|question)\b/.test(t)) {
    return /\b(draft|write)\b/.test(t) ? 'draft' : 'message';
  }
  if (
    (/\b(assign|send|give|drop)\b/.test(t) && /\b(activity|drill|bootcamp|station|homework|page|resource|link|question|questions)\b/.test(t)) ||
    /\bnot a message\b/.test(t)
  ) {
    return 'assign';
  }
  if (/\b(open|show|view|see|pull up)\b/.test(t)) return 'open';
  if (/\b(inspect|audit|debug)\b/.test(t)) return 'inspect';
  if (/\b(find|where|link|search)\b/.test(t)) return 'find';
  return 'unknown';
}

export function inferKindHints(text: string): string[] {
  const t = normalizeResolverText(text);
  if (/\bactivity center\b/.test(t)) return ['route', 'activity'];
  if (/\bnegation station\b/.test(t)) return ['activity', 'guided_drill'];
  if (/\bcausation station\b/.test(t)) return ['route', 'bootcamp_lesson', 'bootcamp_day'];
  if (/\bguided drill\b/.test(t)) return ['guided_drill', 'activity'];
  if (/\bdrill\b/.test(t)) return ['activity', 'guided_drill', 'drill_question'];
  if (/\bbootcamp\b/.test(t)) return ['route', 'bootcamp_lesson', 'bootcamp_day'];
  if (/\bpt\d+|section|question|q\d+\b/.test(t)) return ['drill_question'];
  if (/\bstudent|profile|roster\b/.test(t)) return ['student', 'route'];
  if (/\bpage|link|route|center\b/.test(t)) return ['route'];
  return [];
}

export function buildResourceQuery(text: string, studentName?: string | null): string {
  const normalized = normalizeResolverText(text);
  const studentTokens = studentName ? Array.from(tokenSet(studentName)) : [];
  let withoutRecipient = normalized;
  const toIndex = normalized.lastIndexOf(' to ');
  const forIndex = normalized.lastIndexOf(' for ');
  const cutIndex = Math.max(toIndex, forIndex);
  if (cutIndex > -1) {
    const after = normalized.slice(cutIndex + 1);
    if (!studentTokens.length || studentTokens.some((token) => after.includes(token))) {
      withoutRecipient = normalized.slice(0, cutIndex);
    }
  }
  const compact = compactResourceWords(withoutRecipient, studentName);
  if (compact.includes('negation station')) return 'negation station';
  if (compact.includes('causation station')) return 'causation station';
  if (compact.includes('activity center')) return 'activity center';
  return compact;
}

export function resolveLatestResourceQuery(userTexts: string[], studentName?: string | null): string {
  for (const text of [...userTexts].reverse()) {
    const query = buildResourceQuery(text, studentName);
    if (query.length >= 3) return query;
  }
  return '';
}

function exactCandidateScore(candidate: ResourceCandidate, query: string, kindHints: string[]): number {
  const q = normalizeResolverText(query);
  const title = normalizeResolverText(candidate.title);
  const source = normalizeResolverText(candidate.source_id);
  const subtitle = normalizeResolverText(candidate.subtitle ?? '');
  const url = normalizeResolverText(candidate.url ?? '');
  const haystack = `${title} ${subtitle} ${source} ${url}`;
  let score = 0;

  if (title === q || source === q) score += 1000;
  if (title.includes(q) || source.includes(q)) score += 500;
  const qTokens = q.split(/\s+/).filter(Boolean);
  const titleTokens = tokenSet(candidate.title);
  if (qTokens.length && qTokens.every((token) => titleTokens.has(token))) score += 350;
  for (const token of qTokens) {
    if (haystack.includes(token)) score += token.length >= 5 ? 20 : 6;
  }

  const kindIndex = kindHints.indexOf(candidate.kind);
  if (kindIndex >= 0) score += 160 - kindIndex * 20;
  if (kindHints.includes('activity') && candidate.kind === 'route' && candidate.url?.startsWith('/bootcamp')) score -= 180;
  if (q.includes('negation station') && candidate.kind === 'activity') score += 220;
  if (q.includes('causation station') && candidate.url?.includes('/bootcamp/causation-station')) score += 260;
  if (q.includes('activity center') && candidate.url === '/activities') score += 260;

  return score;
}

export function pickBestResourceCandidate(
  candidates: ResourceCandidate[],
  query: string,
  kindHints: string[] = inferKindHints(query),
): ResourceCandidate | null {
  const normalizedQuery = normalizeResolverText(query);
  if (!normalizedQuery) return null;
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      resolverScore: exactCandidateScore(candidate, normalizedQuery, kindHints),
      retrievalScore: Number(candidate.score ?? 0),
    }))
    .filter((row) => row.resolverScore > 0 || row.retrievalScore > 0)
    .sort((a, b) => b.resolverScore - a.resolverScore || b.retrievalScore - a.retrievalScore);
  return ranked[0]?.candidate ?? null;
}
