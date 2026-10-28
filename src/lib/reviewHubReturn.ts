/** Bounded same-origin study-work origins. A return hint never grants source access. */
const ORIGIN = 'https://review.invalid';
const ALIASES: Record<string, string> = {
  '/progress': '/review/progress', '/progress/overview': '/review/progress',
  '/progress/topics': '/review/progress', '/progress/history': '/review/history',
};
const PATHS = new Set(['/review/to-review', '/review/progress', '/review/history', '/review/wrong', '/review/flagged', '/review/imported']);
const KEYS = new Set(['reason', 'q', 'area', 'source', 'selected', 'view', 'show', 'window', 'subject', 'topic', 'type', 'mode', 'answer', 'historyArea', 'historyResult', 'historyAnswer', 'historySource', 'historyMode', 'historyTopic', 'historySearch', 'historySort', 'historySelected', 'progressArea', 'progressType', 'progressAnswer', 'progressEvidence']);
export function safeReviewHubReturn(value: string | null | undefined): string | null {
  if (!value || value.length > 4096 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN || /%2f|%5c/i.test(url.pathname)) return null;
    const path = ALIASES[url.pathname] ?? url.pathname;
    if (!PATHS.has(path)) return null;
    const params = new URLSearchParams();
    for (const [key, entry] of url.searchParams) {
      if (!KEYS.has(key) || params.has(key) || entry.length > 512 || /[\u0000-\u001f\u007f]/.test(entry)) return null;
      if (key === 'window' && !/^(7|14|21|30|all)$/.test(entry)) return null;
      if (key === 'show' && (!/^\d+$/.test(entry) || Number(entry) < 1 || Number(entry) > 10000)) return null;
      params.set(key, entry);
    }
    if (url.pathname === '/progress/topics') params.set('mode', 'types');
    if (url.hash.length > 256 || !/^#[\w:.-]*$/.test(url.hash || '#')) return null;
    const search = params.toString();
    return `${path}${search ? `?${search}` : ''}${url.hash}`;
  } catch { return null; }
}
export function reviewHubReturnTo(search: string): string | null {
  return safeReviewHubReturn(new URLSearchParams(search).get('returnTo'));
}

/** Other player return contracts remain intact; hub-looking hints are always validated. */
export function validateHubOriginOrOrdinary(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\/(review|progress)(?:\/|\?|#|$)/.test(value)) return safeReviewHubReturn(value) ?? undefined;
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return undefined;
  try { return new URL(value, ORIGIN).origin === ORIGIN ? value : undefined; } catch { return undefined; }
}
