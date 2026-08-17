import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Crown,
  Search,
  Shield,
  User,
  UserCheck,
  Users,
  UserX,
  CalendarDays,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import {
  CONFIGURABLE_FLAG_KEYS,
  computeAdminAnalytics,
  isPrimaryAdmin,
  type AdminAnalytics,
  type ManagedUser,
} from '@/lib/adminUsers';
import { formatLastActiveLabel, isUserOnline } from '@/lib/presence';
import { cn } from '@/lib/utils';

type RoleFilter = 'all' | 'students' | 'admins' | 'no-drill';

type PeopleRow = ManagedUser & {
  student?: HubStudentRow;
};

type GlobalSingleSession = {
  source: 'single_session';
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  name: string | null;
  email: string | null;
  user_id: string | null;
};

export function DeskPeopleSurface() {
  const { rows: students, loading: studentsLoading } = useHubStudents();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [singleSessions, setSingleSessions] = useState<GlobalSingleSession[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUsers([]);
        setAnalytics(null);
        return;
      }

      const [usersRes, analyticsRes, singleSessionsRes] = await Promise.all([
        supabase.functions.invoke('admin-manage-users', { method: 'GET' }),
        supabase.functions.invoke('admin-manage-users', {
          method: 'GET',
          headers: { 'x-mode': 'analytics' },
          body: undefined,
        }),
        supabase.functions.invoke('booking-pass-admin', { body: { action: 'single_sessions_global' } }),
      ]);

      if (usersRes.error) throw usersRes.error;
      setUsers((usersRes.data || []) as ManagedUser[]);
      setAnalytics(!analyticsRes.error && analyticsRes.data ? (analyticsRes.data as AdminAnalytics) : null);
      if (singleSessionsRes.error) {
        console.warn('Single Sessions list unavailable', singleSessionsRes.error);
        setSingleSessions([]);
      } else {
        setSingleSessions(((singleSessionsRes.data as { bookings?: GlobalSingleSession[] } | null)?.bookings) ?? []);
      }
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
      const matchesSearch = !q || person.email?.toLowerCase().includes(q) || person.display_name?.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'students' && person.role !== 'admin') ||
        (roleFilter === 'admins' && person.role === 'admin') ||
        (roleFilter === 'no-drill' && person.role !== 'admin' && !person.has_drill_access);
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

  // A room, not a floating card: the shell supplies the frame and the title, so
  // this only carries its own content.
  return (
    <section className="flex h-full w-full flex-col" aria-label="Students">
      <div className="flex items-center gap-2 border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/45">
        <Users className="h-4 w-4" strokeWidth={1.5} />
        {users.length} people
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

        <details className="mt-4 border border-black/10 bg-white/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-black/45" strokeWidth={1.5} />Single Sessions</span>
            <span className="font-mono text-xs text-black/45">{singleSessions.length}</span>
          </summary>
          <div className="max-h-80 overflow-y-auto border-t border-black/10">
            {singleSessions.length === 0 ? <p className="px-4 py-5 text-sm text-black/45">No native Single Sessions yet.</p> : singleSessions.map((booking) => (
              <div key={booking.id} className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-3 last:border-b-0">
                <div className="min-w-52 flex-1">
                  <div className="text-sm font-medium text-black/75">{booking.name || booking.email || 'Guest booker'}</div>
                  <div className="mt-0.5 text-xs text-black/45">{new Date(booking.start_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <span className="border border-black/10 bg-white/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-black/45">{booking.user_id ? 'verified account' : 'guest-owned'}</span>
                <span className={cn('border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider', booking.status === 'booked' ? 'border-emerald-700/25 bg-emerald-700/10 text-emerald-800' : booking.status.includes('failed') ? 'border-red-700/25 bg-red-700/10 text-red-800' : 'border-black/10 bg-black/5 text-black/45')}>{booking.status.replace(/_/g, ' ')}</span>
                {booking.meet_url && booking.status === 'booked' ? <a href={booking.meet_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center px-2 text-xs font-semibold text-black/65 hover:bg-white/30"><Video className="mr-1.5 h-3.5 w-3.5" />Meet</a> : null}
              </div>
            ))}
          </div>
        </details>

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
            {([
              ['all', 'All'],
              ['students', 'Students'],
              ['admins', 'Admins'],
              ['no-drill', 'No Drill'],
            ] as const).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold transition',
                  roleFilter === filter ? 'bg-black text-white' : 'text-black/45 hover:bg-white/25 hover:text-black',
                )}
              >
                {label}
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
  setRole,
  refresh,
}: {
  filtered: PeopleRow[];
  studentsLoading: boolean;
  expandedUser: string | null;
  setExpandedUser: (id: string | null) => void;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
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
              <PersonRow person={person} isExpanded={isExpanded} setExpandedUser={setExpandedUser} toggleAccess={toggleAccess} />
              {isExpanded && <PersonAccessPanel person={person} setRole={setRole} />}
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
  toggleAccess,
}: {
  person: PeopleRow;
  isExpanded: boolean;
  setExpandedUser: (id: string | null) => void;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
}) {
  const student = person.student;
  const hasDrill = Boolean(person.has_drill_access);
  const isAdmin = person.role === 'admin';
  const isOnline = isUserOnline(person.last_seen_at);
  const lastActiveLabel = formatLastActiveLabel(person.last_seen_at);
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
          {isOnline && (
            <span aria-label="Online on LSAT U" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#c3cace]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* The row opens the dossier; the chevron still expands inline for
                a quick access peek without leaving the roster. */}
            <Link
              to={`/teacher/students/${person.class_id}`}
              className="truncate text-sm font-semibold text-black underline-offset-4 hover:underline"
            >
              {person.display_name || 'No name'}
            </Link>
            <RoleBadge user={person} />
            {isOnline && (
              <span className="inline-flex items-center gap-1 border border-emerald-700/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Online
              </span>
            )}
            {student && student.assignments_total > 0 && (
              <span className="font-mono text-xs font-semibold tabular-nums text-black/50">
                {student.assignments_completed}/{student.assignments_total}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/45">
            <span className="truncate font-mono">{person.email}</span>
            <span>{lastActiveLabel}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                hasDrill ? 'text-emerald-700' : 'text-black/40',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', hasDrill ? 'bg-emerald-600' : 'bg-black/25')} />
              Drill {hasDrill ? 'on' : 'off'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        {isAdmin ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/40">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Full access
          </span>
        ) : hasDrill ? (
          <button
            type="button"
            onClick={() => toggleAccess(person.class_id, 'has_drill_access', false)}
            className="inline-flex items-center gap-1 border border-red-700/20 px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-500/10"
          >
            <UserX className="h-3 w-3" strokeWidth={1.5} />
            Revoke Drill Access
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toggleAccess(person.class_id, 'has_drill_access', true)}
            className="inline-flex items-center gap-1 border border-emerald-700/20 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/10"
          >
            <UserCheck className="h-3 w-3" strokeWidth={1.5} />
            Grant Drill Access
          </button>
        )}
      </div>
    </div>
  );
}

function PersonAccessPanel({
  person,
  setRole,
}: {
  person: PeopleRow;
  setRole: (userId: string, role: 'admin' | 'user') => void;
}) {
  return (
    <div className="space-y-4 border-t border-black/10 px-8 py-4">
      <p className="text-xs leading-relaxed text-black/45">
        Bootcamp access is controlled by assignment, not here. Assign or archive a bootcamp from the
        Library to add or remove it from this student's path.
      </p>

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

export default DeskPeopleSurface;
