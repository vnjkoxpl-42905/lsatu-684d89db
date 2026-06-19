export const PRIMARY_ADMIN_EMAIL = 'contact@aspiringattorneys.com';

export const isPrimaryAdmin = (email: string | null | undefined) =>
  (email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL;

export interface ManagedUser {
  class_id: string;
  email: string;
  display_name: string | null;
  role: string;
  last_seen_at: string | null;
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

export const FLAG_GROUPS = [
  {
    label: 'Core',
    flags: [
      { key: 'has_practice_access', label: 'Practice' },
      { key: 'has_drill_access', label: 'Drill' },
    ],
  },
  {
    label: 'Modules',
    flags: [
      { key: 'has_bootcamp_access', label: 'Bootcamps' },
      { key: 'has_classroom_access', label: 'Classroom' },
      { key: 'has_analytics_access', label: 'Analytics' },
      { key: 'has_schedule_access', label: 'Schedule' },
    ],
  },
  {
    label: 'Tools',
    flags: [
      { key: 'has_waj_access', label: 'WAJ' },
      { key: 'has_flagged_access', label: 'Flagged' },
      { key: 'has_chat_access', label: 'Chat' },
      { key: 'has_export_access', label: 'Export' },
      { key: 'has_ta_access', label: 'TA' },
    ],
  },
] as const;

export const ALL_FLAG_KEYS = FLAG_GROUPS.flatMap((group) => group.flags.map((flag) => flag.key));

export const ALL_FLAG_LABELS: Record<string, string> = {};
FLAG_GROUPS.forEach((group) => group.flags.forEach((flag) => {
  ALL_FLAG_LABELS[flag.key] = flag.label;
}));

export function accessTemplate(enabled: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of ALL_FLAG_KEYS) out[key] = enabled.includes(key);
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
    description: 'All student tools, no TA workspace.',
    flags: accessTemplate([
      'has_practice_access',
      'has_drill_access',
      'has_classroom_access',
      'has_analytics_access',
      'has_schedule_access',
      'has_waj_access',
      'has_flagged_access',
      'has_chat_access',
      'has_bootcamp_access',
    ]),
  },
  {
    id: 'full',
    label: 'Full',
    description: 'Everything except TA access.',
    flags: accessTemplate(ALL_FLAG_KEYS.filter((key) => key !== 'has_ta_access')),
  },
];

export function templateMatches(user: Record<string, unknown>, template: Record<string, boolean>): boolean {
  return ALL_FLAG_KEYS.every((key) => Boolean(user[key]) === template[key]);
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
