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

// Every door a student can be given, grouped the way the classroom rail groups
// them, and labelled in the words the rail uses. This list is the admin UI: a
// flag that is missing here has no toggle anywhere, which is how
// `has_journal_access` and `has_activity_access` came to be ungrantable while
// the rail happily padlocked Wrong answers and Activities against them.
//
// Keep it in step with `ALL_FLAGS` in supabase/functions/admin-manage-users.
// The server writes what it is told; if the client cannot name a flag, no
// amount of pressing "grant all" will turn it on where Joshua can see it.
export const FLAG_GROUPS = [
  {
    label: 'Practice',
    flags: [
      { key: 'has_drill_access', label: 'Drill' },
      { key: 'has_practice_access', label: 'Practice tests' },
      { key: 'has_activity_access', label: 'Activities' },
      { key: 'has_bootcamp_access', label: 'Bootcamps' },
    ],
  },
  {
    label: 'Review',
    flags: [
      { key: 'has_journal_access', label: 'Wrong answers' },
      { key: 'has_flagged_access', label: 'Flagged questions' },
      { key: 'has_analytics_access', label: 'Progress and history' },
      { key: 'has_export_access', label: 'Export' },
    ],
  },
  {
    label: 'Classroom',
    flags: [
      { key: 'has_classroom_access', label: 'Classroom' },
      { key: 'has_chat_access', label: 'Messages' },
      { key: 'has_schedule_access', label: 'Schedule and booking' },
      { key: 'has_ta_access', label: 'TA worksheets' },
    ],
  },
] as const;

export const CONFIGURABLE_FLAG_KEYS = FLAG_GROUPS.flatMap((group) => group.flags.map((flag) => flag.key));
/**
 * What a paying student gets regardless of which template is applied. Templates
 * force these back on after the explicit list, so "Trial" can narrow practice
 * without taking away the room the student stands in.
 */
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
/** Deduped: every configurable flag is now also a default-on candidate. */
export const ALL_FLAG_KEYS = [...new Set<string>([...CONFIGURABLE_FLAG_KEYS, ...DEFAULT_ON_FLAG_KEYS])];

export const ALL_FLAG_LABELS: Record<string, string> = {};
FLAG_GROUPS.forEach((group) => group.flags.forEach((flag) => {
  ALL_FLAG_LABELS[flag.key] = flag.label;
}));

export function accessTemplate(enabled: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of CONFIGURABLE_FLAG_KEYS) out[key] = enabled.includes(key);
  for (const key of DEFAULT_ON_FLAG_KEYS) out[key] = true;
  return out;
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
// A tier is a template: it sets the twelve switches above, and the switches
// stay what the app checks. The tier column only names the template the
// switches currently match; the database relabels Tier 1 or Tier 3 as Tier 2
// the moment a switch moves away from its template.

export type AccessTier = 'tier_1' | 'tier_2' | 'tier_3';

/** Classroom home, Messages, Schedule: what every account keeps. */
export const FLOOR_FLAG_KEYS = ['has_classroom_access', 'has_chat_access', 'has_schedule_access'] as const;

export const ACCESS_TIERS: { id: AccessTier; label: string; description: string }[] = [
  { id: 'tier_1', label: 'Tier 1', description: 'Everything on.' },
  { id: 'tier_2', label: 'Tier 2', description: 'You choose each feature.' },
  { id: 'tier_3', label: 'Tier 3', description: 'Classroom, Messages and Schedule, plus what you assign.' },
];

export const TIER_LABELS: Record<AccessTier, string> = {
  tier_1: 'Tier 1',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
};

/** The switches a tier writes. Tier 2 writes nothing: it keeps what is there. */
export function tierFlags(tier: AccessTier): Record<string, boolean> | null {
  if (tier === 'tier_2') return null;
  const out: Record<string, boolean> = {};
  for (const key of CONFIGURABLE_FLAG_KEYS) {
    out[key] = tier === 'tier_1' || (FLOOR_FLAG_KEYS as readonly string[]).includes(key);
  }
  return out;
}
