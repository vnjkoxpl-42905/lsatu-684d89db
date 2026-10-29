/** Shared route/gate metadata consumed by App and its route regression harness. */
export const REVIEW_HUB_ROUTES = {
  root: { path: '/review', allowSignedIn: true },
  queue: { path: 'to-review', allowSignedIn: true },
  analyticsFlag: 'has_analytics_access',
  progress: { path: 'progress' },
  history: { path: 'history' },
  imported: { path: 'imported', flags: ['has_analytics_access', 'has_drill_access'] },
  journal: { path: 'wrong', flag: 'has_journal_access' },
  flagged: { path: 'flagged', flag: 'has_flagged_access' },
} as const;

export const REVIEW_HUB_ALIASES = [
  { path: '/progress', to: '/review/progress' },
  { path: '/progress/overview', to: '/review/progress' },
  { path: '/progress/topics', to: '/review/progress?mode=types' },
  { path: '/progress/history', to: '/review/history' },
  { path: '/analytics', to: '/review/progress' },
] as const;

export const REVIEW_HISTORY_ALIAS = '/history';
