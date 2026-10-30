export const PRIMARY_ADMIN_EMAIL = 'contact@aspiringattorneys.com';

export const isPrimaryAdmin = (email: string | null | undefined) =>
  (email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL;

export interface ManagedUser {
  class_id: string;
  email: string;
  display_name: string | null;
  role: string;
  last_seen_at: string | null;
  /** When the account was made. From auth, not profiles. */
  created_at?: string | null;
  /** Set when the student has been archived: access off, hidden from the list, records kept. */
  archived_at: string | null;
  archived_reason: string | null;
  /** Which access template the switches match. null = undecided, in the signup queue. */
  access_tier: 'tier_1' | 'tier_2' | 'tier_3' | null;
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  has_practice_access: boolean;
  has_drill_access: boolean;
  has_waj_access: boolean;
  has_flagged_access: boolean;
  has_chat_access: boolean;
  has_export_access: boolean;
  has_ta_access: boolean;
  has_journal_access: boolean;
  has_activity_access: boolean;
}

export interface AdminAnalytics {
  total_users: number;
  active_today: number;
  active_week: number;
  admin_count: number;
  feature_adoption: Record<string, number>;
  total_attempts: number;
  week_attempts: number;
}

// Five independent doors. Review is derived; activities and bootcamps are assigned.
export const FLAG_GROUPS = [
  {
    label: 'Practice',
    flags: [
      { key: 'has_drill_access', label: 'Drill' },
      { key: 'has_practice_access', label: 'Practice tests' },
    ],
  },
  {
    label: 'Classroom',
    flags: [
      { key: 'has_classroom_access', label: 'Classroom' },
      { key: 'has_chat_access', label: 'Messages' },
      { key: 'has_schedule_access', label: 'Schedule and booking' },
    ],
  },
] as const;

export const CONFIGURABLE_FLAG_KEYS = FLAG_GROUPS.flatMap((group) => group.flags.map((flag) => flag.key));
/** Legacy stored flags retained for whole-account revocation and analytics. */
export const DEFAULT_ON_FLAG_KEYS = [
  'has_practice_access',
  'has_bootcamp_access',
  'has_classroom_access',
  'has_analytics_access',
  'has_schedule_access',
  'has_waj_access',
  'has_journal_access',
  'has_flagged_access',
  'has_chat_access',
  'has_export_access',
  'has_ta_access',
  'has_activity_access',
] as const;
/** All stored flags, including retired ones, must be cleared on revocation. */
export const ALL_FLAG_KEYS = [...new Set<string>([...CONFIGURABLE_FLAG_KEYS, ...DEFAULT_ON_FLAG_KEYS])];

export const ALL_FLAG_LABELS: Record<string, string> = {};
FLAG_GROUPS.forEach((group) => group.flags.forEach((flag) => {
  ALL_FLAG_LABELS[flag.key] = flag.label;
}));

export function accessTemplate(enabled: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of CONFIGURABLE_FLAG_KEYS) out[key] = enabled.includes(key);
  return withDerivedAccess(out);
}

export const ROLE_TEMPLATES: { id: string; label: string; description: string; flags: Record<string, boolean> }[] = [
  {
    id: 'trial',
    label: 'Trial',
    description: 'Practice and Drill only.',
    flags: accessTemplate(['has_practice_access', 'has_drill_access']),
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Core tools plus classroom.',
    flags: accessTemplate([
      'has_practice_access',
      'has_drill_access',
      'has_classroom_access',
      'has_bootcamp_access',
    ]),
  },
  {
    id: 'full',
    label: 'Full',
    description: 'All configurable access.',
    flags: accessTemplate(CONFIGURABLE_FLAG_KEYS),
  },
];

export function templateMatches(user: Record<string, unknown>, template: Record<string, boolean>): boolean {
  return CONFIGURABLE_FLAG_KEYS.every((key) => Boolean(user[key]) === template[key]);
}

export function computeAdminAnalytics(users: ManagedUser[], analytics: AdminAnalytics | null): AdminAnalytics {
  return analytics || {
    total_users: users.length,
    active_today: users.filter((user) => {
      if (!user.last_seen_at) return false;
      return Date.now() - new Date(user.last_seen_at).getTime() < 24 * 60 * 60 * 1000;
    }).length,
    active_week: users.filter((user) => {
      if (!user.last_seen_at) return false;
      return Date.now() - new Date(user.last_seen_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
    admin_count: users.filter((user) => user.role === 'admin').length,
    feature_adoption: ALL_FLAG_KEYS.reduce((acc, key) => {
      acc[key] = users.filter((user) => user[key as keyof ManagedUser] === true).length;
      return acc;
    }, {} as Record<string, number>),
    total_attempts: 0,
    week_attempts: 0,
  };
}

// ── Access tiers ────────────────────────────────────────────────────────────
// Selecting a tier reapplies its five defaults. Deviations from Tier 1 or
// Tier 3 become custom Tier 2; derived flags are never independent switches.

export type AccessTier = 'tier_1' | 'tier_2' | 'tier_3';

/** The Tier 3 preset. Existing accounts are not bulk migrated. */
export const FLOOR_FLAG_KEYS = ['has_chat_access', 'has_schedule_access'] as const;

export const ACCESS_TIERS: { id: AccessTier; label: string; description: string }[] = [
  { id: 'tier_1', label: 'Tier 1', description: 'Drill, Practice tests, Classroom, Messages and Schedule.' },
  { id: 'tier_2', label: 'Tier 2', description: 'Classroom, Messages and Schedule. Practice only what you assign.' },
  { id: 'tier_3', label: 'Tier 3', description: 'Messages and Schedule only.' },
];

export const TIER_LABELS: Record<AccessTier, string> = {
  tier_1: 'Tier 1',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
};

/** One authoritative update containing both independent and derived flags. */
export function tierFlags(tier: AccessTier): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of CONFIGURABLE_FLAG_KEYS) {
    out[key] = tier === 'tier_1' || (FLOOR_FLAG_KEYS as readonly string[]).includes(key) ||
      (tier === 'tier_2' && key === 'has_classroom_access');
  }
  return withDerivedAccess(out);
}

/** Review follows general practice access; assigned work never opens the bank. */
export function withDerivedAccess(flags: Record<string, boolean>): Record<string, boolean> {
  const practice = Boolean(flags.has_drill_access || flags.has_practice_access);
  return {
    ...flags,
    has_journal_access: practice,
    has_flagged_access: practice,
    has_analytics_access: practice,
    has_waj_access: false,
    has_activity_access: false,
    has_bootcamp_access: false,
    has_ta_access: false,
    has_export_access: false,
  };
}
