import { CANONICAL_QTYPES } from '@/lib/questionLoader';

/** Return hints select a view, never authorize a source or a selected saved answer. */
const ORIGIN = 'https://review.invalid';
const ALIASES: Record<string, string> = {
  '/progress': '/review/progress', '/progress/overview': '/review/progress',
  '/progress/topics': '/review/progress', '/progress/history': '/review/history',
  '/analytics': '/review/progress', '/history': '/review/history',
};
const PATHS = new Set(['/review/to-review', '/review/progress', '/review/history', '/review/strengths', '/review/wrong', '/review/flagged', '/review/imported']);
const QUEUE_KEYS = new Set(['reason','area','source','q','view','show','selected']);
const PROGRESS_KEYS = new Set(['window','progressArea','progressType','progressAnswer','progressEvidence','mode']);
const HISTORY_KEYS = new Set(['window','historyArea','historyResult','historyAnswer','historySort','historySource','historyMode','historyTopic','historySearch','historySelected']);
const ALL_KEYS = new Set([...QUEUE_KEYS,...PROGRESS_KEYS,...HISTORY_KEYS]);
const enums: Record<string, readonly string[]> = {
  reason: ['missed','flagged','skipped','teacher_selected'], area: ['lr','rc'],
  source: ['wrong_answer_journal','flagged_questions','rc_attempts','activity_item_responses','section_history','practice_test','intro_lr_attempts','hard_sentences','native_lab_attempts','review_episodes'],
  view: ['table'], window: ['7','14','21','30','all'], progressArea: ['LR','RC'],
  progressType: [...CANONICAL_QTYPES.allTypes,'Unclassified'], progressEvidence: ['all','missed','correct'], mode: ['types'],
  historyArea: ['LR','RC'], historyResult: ['correct','missed'], historyAnswer: ['first','repeat'],
  historySort: ['oldest','question','source'], historySource: ['lr_attempts','lr_section_history','rc_attempts'],
  historyMode: ['adaptive','type-drill','natural-drill','practice-set','bootcamp-pf','practice-test','timed-section','rc-drill'],
};
const ids = new Set(['selected','progressAnswer','historySelected']);
const idPattern = /^[A-Za-z0-9][A-Za-z0-9:_.@/+-]*$/;
const carriers = new Set([
  'return','returnto','returnurl','returnuri','returnpath',
  'redirect','redirectto','redirecturl','redirecturi','redirectpath',
  'callback','callbackurl','callbackuri','continue','continueto','continueurl',
  'next','nexturl','nextpath','origin','originurl','destination','destinationurl','destinationpath','url',
]);
export interface ReviewHubReturnOptions { historyTopics?: ReadonlySet<string> }

export function safeReviewHubReturn(value: string | null | undefined, options: ReviewHubReturnOptions = {}): string | null {
  if (!value || value.length > 8192 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    // The caller has decoded the outer returnTo once. URLSearchParams decodes
    // each query component below; decoding the whole URL again corrupts literal
    // percent search terms and confuses search text with route delimiters.
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN || /%/i.test(url.pathname)) return null;
    const path = ALIASES[url.pathname] ?? url.pathname;
    if (!PATHS.has(path)) return null;
    const allowed = path === '/review/to-review' ? QUEUE_KEYS : path === '/review/progress' ? PROGRESS_KEYS : path === '/review/history' ? HISTORY_KEYS : new Set<string>();
    const params = new URLSearchParams();
    const seen = new Set<string>();
    for (const [rawKey, rawEntry] of url.searchParams) {
      let key = rawKey;
      let entry = rawEntry;
      if (carriers.has(key.toLowerCase().replace(/[_-]/g,'')) || /[%\u0000-\u0020]/.test(key) || /[\u0000-\u001f\u007f]/.test(entry)) return null;
      if (url.pathname === '/history' && key === 'area') { key = 'historyArea'; entry = entry.toUpperCase(); }
      if (seen.has(key)) return null;
      seen.add(key);
      // Production-only serialization discards development display switches.
      if ((path === '/review/progress' || path === '/review/history') && ['variant','view','production'].includes(key)) continue;
      if (!allowed.has(key)) { if (ALL_KEYS.has(key)) return null; continue; }
      if (key === 'show') {
        if (!/^-?\d+$/.test(entry) || !Number.isSafeInteger(Number(entry))) return null;
        params.set(key, String(Math.max(30, Math.min(1000, Number(entry)))));
        continue;
      }
      if (enums[key] && !enums[key].includes(entry)) return null;
      const limit = key === 'q' ? 256 : key === 'historySearch' ? 120 : key === 'historyTopic' ? 80 : ids.has(key) ? 512 : 80;
      if (entry.length > limit || (ids.has(key) && !idPattern.test(entry))) {
        // A stale/malformed queue selection need not erase its valid filters.
        if (key === 'selected') continue;
        return null;
      }
      if (key === 'historyTopic' && options.historyTopics && !options.historyTopics.has(entry)) continue;
      params.set(key, entry);
    }
    if (url.pathname === '/progress/topics') params.set('mode','types');
    // Confirmed HTML-id grammar. The owning view revalidates selected evidence IDs.
    if (url.hash.length > 128 || !/^#[A-Za-z][\w:.-]{0,126}$/.test(url.hash || '#a')) return null;
    const search = params.toString();
    return `${path}${search ? `?${search}` : ''}${url.hash}`;
  } catch { return null; }
}
export function reviewHubReturnTo(search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.getAll('returnTo').length !== 1) return null;
  return safeReviewHubReturn(params.get('returnTo'));
}

/** Preserve legitimate ordinary RC returns; hub origins always use the bounded parser. */
export function validateHubOriginOrOrdinary(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return undefined;
  try {
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN) return undefined;
    const path = decodeURIComponent(url.pathname);
    if (/^\/(review|progress|analytics|history)(?:\/|%|$)/i.test(path)) return safeReviewHubReturn(value) ?? undefined;
    return value;
  } catch { return undefined; }
}
