export const TEACHER_GUIDED_DRILLS_RETURN_TO = '/teacher/library/guided-drills';

/**
 * Where Return goes when the launch URL carries no `returnTo`. Home, not the
 * teacher library: both teacher entry points pass `returnTo` explicitly, so a
 * bare launch URL is a student following a link, and a teacher route would
 * bounce them to auth.
 */
export const GUIDED_DRILLS_HOME_RETURN_TO = '/classroom';

export function safeGuidedReturnPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function parseGuidedResumeQids(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((qid) => qid.trim())
    .filter(Boolean);
}

export function parseGuidedResumeIndex(value: string | null | undefined, qids: string[]): number | null {
  if (qids.length === 0 || !value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, 0), qids.length - 1);
}

export function buildGuidedLaunchReturnPath(input: {
  assignmentId?: string | null;
  slug?: string | null;
  originReturnTo: string;
  resumeQids?: string[];
  resumeIndex?: number;
}): string {
  const base = input.assignmentId
    ? `/guided/${encodeURIComponent(input.assignmentId)}`
    : input.slug
      ? `/guided-drills/${encodeURIComponent(input.slug)}`
      : '/classroom';

  const params = new URLSearchParams();
  params.set('returnTo', input.originReturnTo);
  if (input.resumeQids?.length) {
    params.set('resumeQids', input.resumeQids.join(','));
    params.set('resumeIndex', String(input.resumeIndex ?? 0));
  }

  return `${base}?${params.toString()}`;
}

export function appendGuidedResumeParams(
  launchReturnTo: string,
  qids: string[],
  currentIndex: number,
): string {
  if (!launchReturnTo.startsWith('/guided')) return launchReturnTo;
  const [path, query = ''] = launchReturnTo.split('?');
  const params = new URLSearchParams(query);
  if (qids.length > 0) {
    params.set('resumeQids', qids.join(','));
    params.set('resumeIndex', String(Math.min(Math.max(currentIndex, 0), qids.length - 1)));
  }
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}
