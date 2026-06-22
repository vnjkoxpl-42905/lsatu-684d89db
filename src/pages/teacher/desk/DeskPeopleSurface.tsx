import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Crown,
  Search,
  Shield,
  Sparkles,
  User,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import {
  ALL_FLAG_KEYS,
  CONFIGURABLE_FLAG_KEYS,
  DEFAULT_ON_FLAG_KEYS,
  FLAG_GROUPS,
  ROLE_TEMPLATES,
  computeAdminAnalytics,
  isPrimaryAdmin,
  templateMatches,
  type AdminAnalytics,
  type ManagedUser,
} from '@/lib/adminUsers';
import { formatRelativeShort } from '@/lib/time';
import { cn } from '@/lib/utils';

type RoleFilter = 'all' | 'students' | 'admins' | 'access';

type PeopleRow = ManagedUser & {
  student?: HubStudentRow;
};

export function DeskPeopleSurface() {
  const { rows: students, loading: studentsLoading } = useHubStudents();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUsers([]);
        setAnalytics(null);
        return;
      }

      const [usersRes, analyticsRes] = await Promise.all([
        supabase.functions.invoke('admin-manage-users', { method: 'GET' }),
        supabase.functions.invoke('admin-manage-users', {
          method: 'GET',
          headers: { 'x-mode': 'analytics' },
          body: undefined,
        }),
      ]);

      if (usersRes.error) throw usersRes.error;
      setUsers((usersRes.data || []) as ManagedUser[]);
      setAnalytics(!analyticsRes.error && analyticsRes.data ? (analyticsRes.data as AdminAnalytics) : null);
    } catch (error) {
      toast.error('Failed to load people');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const studentById = useMemo(() => {
    const map = new Map<string, HubStudentRow>();
    for (const student of students) map.set(student.class_id, student);
    return map;
  }, [students]);

  const people = useMemo<PeopleRow[]>(
    () =>
      users.map((user) => ({
        ...user,
        student: user.role === 'admin' ? undefined : studentById.get(user.class_id),
      })),
    [studentById, users],
  );

  const computedAnalytics = computeAdminAnalytics(users, analytics);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((person) => {
      const enabledCount = enabledAccessCount(person);
      const matchesSearch = !q || person.email?.toLowerCase().includes(q) || person.display_name?.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'students' && person.role !== 'admin') ||
        (roleFilter === 'admins' && person.role === 'admin') ||
        (roleFilter === 'access' && enabledCount < CONFIGURABLE_FLAG_KEYS.length);
      return matchesSearch && matchesRole;
    });
  }, [people, roleFilter, search]);

  const toggleAccess = async (classId: string, field: string, value: boolean) => {
    setUsers((prev) => prev.map((user) => (user.class_id === classId ? { ...user, [field]: value } : user)));
    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { class_id: classId, field, value },
      });
      if (res.error) throw res.error;
    } catch {
      setUsers((prev) => prev.map((user) => (user.class_id === classId ? { ...user, [field]: !value } : user)));
      toast.error('Failed to update permission');
    }
  };

  const bulkUser = async (classId: string, value: boolean) => {
    const prev = users.find((user) => user.class_id === classId);
    if (!prev) return;
    const updated = { ...prev } as ManagedUser & Record<string, boolean | string | null>;
    ALL_FLAG_KEYS.forEach((key) => {
      updated[key] = value;
    });
    DEFAULT_ON_FLAG_KEYS.forEach((key) => {
      updated[key] = true;
    });
    setUsers((current) => current.map((user) => (user.class_id === classId ? updated : user)));
    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'apply_template', class_id: classId, flags: accessTemplateForBulk(value) },
      });
      if (res.error) throw res.error;
      toast.success(value ? 'All access granted' : 'All access revoked');
    } catch {
      setUsers((current) => current.map((user) => (user.class_id === classId ? prev : user)));
      toast.error('Bulk action failed');
    }
  };

  const applyTemplate = async (classId: string, flags: Record<string, boolean>, label: string) => {
    const prev = users.find((user) => user.class_id === classId);
    if (!prev) return;
    setUsers((current) => current.map((user) => (user.class_id === classId ? ({ ...user, ...flags } as ManagedUser) : user)));
    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'apply_template', class_id: classId, flags },
      });
      if (res.error) throw res.error;
      toast.success(`Applied "${label}"`);
    } catch {
      setUsers((current) => current.map((user) => (user.class_id === classId ? prev : user)));
      toast.error('Template apply failed');
    }
  };

  const setRole = async (userId: string, role: 'admin' | 'user') => {
    const prev = users.find((user) => user.class_id === userId);
    if (!prev) return;
    if (role === 'user' && isPrimaryAdmin(prev.email)) {
      toast.error('The primary admin account cannot be demoted.');
      return;
    }
    setUsers((current) => current.map((user) => (user.class_id === userId ? { ...user, role } : user)));
    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'set_role', user_id: userId, role },
      });
      if (res.error) throw res.error;
      toast.success(role === 'admin' ? 'Promoted to admin' : 'Demoted to user');
    } catch {
      setUsers((current) => current.map((user) => (user.class_id === userId ? prev : user)));
      toast.error('Role change failed');
    }
  };

  if (loading) {
    return (
      <section className="flex h-full w-full max-w-5xl items-center justify-center border border-black/12 bg-white/25 backdrop-blur" aria-label="People workspace">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      </section>
    );
  }

  return (
    <section className="flex h-full w-full max-w-5xl flex-col border border-black/12 bg-white/25 shadow-[0_20px_80px_rgba(17,24,28,0.10)] backdrop-blur" aria-label="People workspace">
      <div className="border-b border-black/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-black/55" strokeWidth={1.5} />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">Workspace</div>
            <h2 className="text-xl font-semibold text-black">People</h2>
          </div>
          <span className="ml-auto text-xs font-semibold text-black/45">{users.length} people</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<Users className="h-4 w-4" strokeWidth={1.5} />} label="Total Users" value={computedAnalytics.total_users} />
          <StatCard icon={<Activity className="h-4 w-4" strokeWidth={1.5} />} label="Active Today" value={computedAnalytics.active_today} />
          <StatCard icon={<Activity className="h-4 w-4" strokeWidth={1.5} />} label="Active Week" value={computedAnalytics.active_week} />
          <StatCard icon={<Crown className="h-4 w-4" strokeWidth={1.5} />} label="Admins" value={computedAnalytics.admin_count} />
        </div>

        <div className="mt-4 border border-black/10 bg-white/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-black/45" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-black/65">Feature Adoption</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {CONFIGURABLE_FLAG_KEYS.map((key) => {
              const count = computedAnalytics.feature_adoption[key] || 0;
              const maxAdoption = Math.max(...Object.values(computedAnalytics.feature_adoption), 1);
              const pct = (count / maxAdoption) * 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-black/45">
                    <span>{key.replace(/^has_|_access$/g, '').replace(/_/g, ' ')}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-black/10">
                    <div className="h-full bg-black/45 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email or name"
              className="border-black/15 bg-white/30 pl-9 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'students', 'admins', 'access'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold transition',
                  roleFilter === filter ? 'bg-black text-white' : 'text-black/45 hover:bg-white/25 hover:text-black',
                )}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <PeopleList
          filtered={filtered}
          studentsLoading={studentsLoading}
          expandedUser={expandedUser}
          setExpandedUser={setExpandedUser}
          toggleAccess={toggleAccess}
          bulkUser={bulkUser}
          applyTemplate={applyTemplate}
          setRole={setRole}
          refresh={fetchData}
        />
      </div>
    </section>
  );
}

function PeopleList({
  filtered,
  studentsLoading,
  expandedUser,
  setExpandedUser,
  toggleAccess,
  bulkUser,
  applyTemplate,
  setRole,
  refresh,
}: {
  filtered: PeopleRow[];
  studentsLoading: boolean;
  expandedUser: string | null;
  setExpandedUser: (id: string | null) => void;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
  bulkUser: (classId: string, value: boolean) => void;
  applyTemplate: (classId: string, flags: Record<string, boolean>, label: string) => void;
  setRole: (userId: string, role: 'admin' | 'user') => void;
  refresh: () => void;
}) {
  if (studentsLoading && filtered.length === 0) {
    return (
      <ul className="mt-4 divide-y divide-black/10 border border-black/10" aria-label="Loading people">
        {[0, 1, 2, 3].map((item) => (
          <li key={item} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-full bg-black/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2 bg-black/10" />
              <Skeleton className="h-3 w-1/3 bg-black/10" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="mt-4 border border-black/10 px-5 py-8 text-center text-sm text-black/45">
        <div className="flex justify-center">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <p className="mt-2">No people found.</p>
        <button type="button" onClick={refresh} className="mt-3 text-xs font-semibold text-black/55 underline underline-offset-4 hover:text-black">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden border border-black/10">
      <div className="divide-y divide-black/10">
        {filtered.map((person) => {
          const isExpanded = expandedUser === person.class_id;
          return (
            <div key={person.class_id} data-testid={`people-row-${person.class_id}`} className="bg-white/10">
              <PersonRow person={person} isExpanded={isExpanded} setExpandedUser={setExpandedUser} bulkUser={bulkUser} />
              {isExpanded && (
                <PersonAccessPanel person={person} toggleAccess={toggleAccess} applyTemplate={applyTemplate} setRole={setRole} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonRow({
  person,
  isExpanded,
  setExpandedUser,
  bulkUser,
}: {
  person: PeopleRow;
  isExpanded: boolean;
  setExpandedUser: (id: string | null) => void;
  bulkUser: (classId: string, value: boolean) => void;
}) {
  const student = person.student;
  const enabledCount = enabledAccessCount(person);
  const displayName = person.display_name || person.email;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={() => setExpandedUser(isExpanded ? null : person.class_id)}
        className="text-black/45 transition hover:text-black"
        aria-label={isExpanded ? `Collapse ${displayName}` : `Expand ${displayName}`}
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" strokeWidth={1.5} /> : <ChevronDown className="h-4 w-4" strokeWidth={1.5} />}
      </button>
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white/25">
          <User className="h-4 w-4 text-black/45" strokeWidth={1.5} />
          {student?.has_unread_from_student && (
            <span aria-label="Unread message" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-[#c3cace]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-black">{person.display_name || 'No name'}</span>
            <RoleBadge user={person} />
            {student && student.assignments_total > 0 && (
              <span className="font-mono text-xs font-semibold tabular-nums text-black/50">
                {student.assignments_completed}/{student.assignments_total}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/45">
            <span className="truncate font-mono">{person.email}</span>
            <span>{formatRelativeShort(person.last_seen_at)}</span>
            <span>{enabledCount}/{CONFIGURABLE_FLAG_KEYS.length} configurable</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={() => bulkUser(person.class_id, true)}
          className="inline-flex items-center gap-1 border border-emerald-700/20 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/10"
        >
          <UserCheck className="h-3 w-3" strokeWidth={1.5} />
          Grant All
        </button>
        <button
          type="button"
          onClick={() => bulkUser(person.class_id, false)}
          className="inline-flex items-center gap-1 border border-red-700/20 px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-500/10"
        >
          <UserX className="h-3 w-3" strokeWidth={1.5} />
          Revoke All
        </button>
      </div>
    </div>
  );
}

function PersonAccessPanel({
  person,
  toggleAccess,
  applyTemplate,
  setRole,
}: {
  person: PeopleRow;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
  applyTemplate: (classId: string, flags: Record<string, boolean>, label: string) => void;
  setRole: (userId: string, role: 'admin' | 'user') => void;
}) {
  return (
    <div className="space-y-4 border-t border-black/10 px-8 py-4">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          Templates
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_TEMPLATES.map((template) => {
            const active = templateMatches(person as unknown as Record<string, unknown>, template.flags);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(person.class_id, template.flags, template.label)}
                title={template.description}
                className={cn(
                  'inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs transition',
                  active ? 'border-black/30 bg-black/10 text-black' : 'border-black/15 text-black/60 hover:bg-white/25 hover:text-black',
                )}
              >
                {template.label}
                <span className="text-[10px] text-black/40">{template.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {FLAG_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">{group.label}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {group.flags.map((flag) => {
              const switchId = `people-${person.class_id}-${flag.key}`;
              return (
                <label key={flag.key} htmlFor={switchId} className="flex items-center justify-between gap-3 bg-white/20 px-3 py-2 text-xs text-black/60">
                  <span>{flag.label}</span>
                  <Switch
                    id={switchId}
                    aria-label={flag.label}
                    checked={person[flag.key as keyof ManagedUser] as boolean}
                    onCheckedChange={(value) => toggleAccess(person.class_id, flag.key, value)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="border-t border-black/10 pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">Role Management</div>
        {person.role !== 'admin' ? (
          <button
            type="button"
            onClick={() => setRole(person.class_id, 'admin')}
            className="inline-flex items-center gap-1.5 border border-amber-700/25 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/10"
          >
            <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
            Promote to Admin
          </button>
        ) : isPrimaryAdmin(person.email) ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-black/45" title="The primary admin account cannot be demoted.">
            <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
            Protected primary admin
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRole(person.class_id, 'user')}
            className="border border-black/15 px-2.5 py-1.5 text-xs font-semibold text-black/55 transition hover:bg-white/25 hover:text-black"
          >
            Demote to User
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="border border-black/10 bg-white/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-black/45">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="font-mono text-2xl font-semibold text-black">{value}</div>
    </div>
  );
}

function RoleBadge({ user }: { user: Pick<ManagedUser, 'role' | 'email'> }) {
  if (user.role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 border border-amber-700/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
        <Crown className="h-2.5 w-2.5" strokeWidth={1.5} />
        {isPrimaryAdmin(user.email) ? 'Primary admin' : 'Admin'}
      </span>
    );
  }

  return <span className="border border-black/10 px-1.5 py-0.5 text-[10px] font-semibold text-black/40">Student</span>;
}

function enabledAccessCount(user: ManagedUser) {
  return CONFIGURABLE_FLAG_KEYS.filter((key) => user[key as keyof ManagedUser] === true).length;
}

function accessTemplateForBulk(value: boolean): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  CONFIGURABLE_FLAG_KEYS.forEach((key) => {
    flags[key] = value;
  });
  DEFAULT_ON_FLAG_KEYS.forEach((key) => {
    flags[key] = true;
  });
  return flags;
}

export default DeskPeopleSurface;
