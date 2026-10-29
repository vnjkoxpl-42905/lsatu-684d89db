/**
 * The lead crumb on the official drill surface names the PrepTest whenever the
 * question carries one. "Library" is only a fallback for questions with no PT
 * (custom or generated drills), never the default for real LSAT questions.
 *
 * Guided drills are no exception: a student working an assigned drill still
 * needs to know which PrepTest the question in front of them came from. The
 * crumb still links back to the guided launch card — only its text changes.
 * `isGuidedDrillReturn` stays in the signature because the caller uses it to
 * build the resume-carrying return path.
 */
export function officialLeadCrumbLabel(opts: {
  pt?: number | string | null;
  returnTo?: string | null;
  isGuidedDrillReturn?: boolean;
}): string {
  if (opts.returnTo === '/flagged') return 'Flagged Questions';
  const pt = opts.pt;
  if (pt !== null && pt !== undefined && `${pt}`.trim() !== '') {
    return `The Official LSAT PrepTest ${pt}`;
  }
  return 'Library';
}
