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
  RotateCcw,
  Search,
  Shield,
  User,
  UserCheck,
  Users,
  UserX,
  Archive,
  ArchiveRestore,
  Trash2,
  CalendarDays,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import {
  ACCESS_TIERS,
  ALL_FLAG_KEYS,
  ALL_FLAG_LABELS,
  CONFIGURABLE_FLAG_KEYS,
  FLAG_GROUPS,
  TIER_LABELS,
  computeAdminAnalytics,
  isPrimaryAdmin,
  tierFlags,
  type AccessTier,
  type AdminAnalytics,
  type ManagedUser,
} from '@/lib/adminUsers';
import { useQueryClient } from '@tanstack/react-query';
import { SIGNUP_QUEUE_KEY, SignupQueue, setStudentTier } from '@/components/teacher/SignupQueue';
import { AssignPracticeTest } from '@/components/teacher/AssignPracticeTest';
import { withAccessTiers } from '@/lib/accessTierClient';
import { formatLastActiveLabel, isUserOnline } from '@/lib/presence';
import { cn } from '@/lib/utils';

type RoleFilter = 'all' | 'students' | 'admins' | 'no-drill' | 'archived';

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
      setUsers(await withAccessTiers((usersRes.data || []) as ManagedUser[]));
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
      // Archived people are out of the way everywhere except their own
      // filter. That is the point of archiving: the list should show who you
      // are actually teaching.
      const isArchived = !!person.archived_at;
      if (roleFilter === 'archived') return matchesSearch && isArchived;
      if (isArchived) return false;

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
      // Trust the row the server wrote back rather than the optimistic guess,
      // so a toggle that never landed can't look like it worked.
      const written = (res.data as { profile?: Record<string, unknown> } | null)?.profile;
      if (!written || written[field] !== value) throw new Error('Permission was not saved');
      // One switch off a Tier 1 or Tier 3 template relabels the student Tier 2
      // in the database. Re-read so the label on screen matches.
      void fetchData();
    } catch (error) {
      setUsers((prev) => prev.map((user) => (user.class_id === classId ? { ...user, [field]: !value } : user)));
      console.error('toggleAccess failed', { classId, field, value, error });
      toast.error('Failed to update permission');
    }
  };

  // Apply a tier. Tier 1 and Tier 3 rewrite the switches; Tier 2 keeps them
  // and only changes the label. The server returns the row it wrote, so the
  // list shows what landed rather than what was hoped for.
  const queryClient = useQueryClient();
  const setTier = async (person: PeopleRow, tier: AccessTier) => {
    const who = person.display_name || person.email;
    const flags = tierFlags(tier);
    const previous = users;
    setUsers((prev) =>
      prev.map((user) => (user.class_id === person.class_id ? { ...user, ...(flags ?? {}), access_tier: tier } : user)),
    );
    try {
      await setStudentTier(person.class_id, tier);
      toast.success(`${who} is on ${TIER_LABELS[tier]}`);
      void queryClient.invalidateQueries({ queryKey: SIGNUP_QUEUE_KEY });
      await fetchData();
    } catch (error) {
      setUsers(previous);
      console.error('setTier failed', { class_id: person.class_id, tier, error });
      toast.error(`Could not set a tier for ${who}`);
    }
  };

  // One button, whole account. Revoking turns every flag off, classroom
  // included: the /classroom route lets any signed-in user land, so the
  // student still has somewhere to stand, but the home page shows them an
  // "access paused" notice instead of their coursework. Leaving classroom on
  // used to keep assigned work, notes and recaps open after a revoke.
  // Granting opens everything back up.
  const setAllAccess = async (person: PeopleRow, grant: boolean) => {
    const who = person.display_name || person.email;
    if (!grant && !window.confirm(
      `Revoke all access for ${who}?

` +
      'They keep their login. Everything else, including assigned work, ' +
      'notes, drill, bootcamps, review and messages, is locked until you grant it back.',
    )) return;

    const flags: Record<string, boolean> = {};
    for (const key of ALL_FLAG_KEYS) flags[key] = grant;

    const previous = users;
    setUsers((prev) => prev.map((user) => (user.class_id === person.class_id ? { ...user, ...flags } : user)));
    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'apply_template', class_id: person.class_id, flags },
      });
      if (res.error) throw res.error;
      toast.success(grant ? `${who} has full access` : `${who} has no access`);
      await fetchData();
    } catch (error) {
      setUsers(previous);
      console.error('setAllAccess failed', { class_id: person.class_id, grant, error });
      toast.error('Failed to update access');
    }
  };

  // Puts an account back to the state a new signup is in: no intake answers, no
  // name, the intake email re-armed, every paid door shut. Used to test the
  // signup path for real, and when a student needs to answer the intake again.
  const resetOnboarding = async (person: PeopleRow) => {
    const who = person.display_name || person.email;
    if (!window.confirm(
      `Reset ${who} to a brand-new account?\n\n` +
      'Clears their setup answers and name, re-locks access, and lets the ' +
      'intake run again. Their login and their practice history are untouched.',
    )) return;

    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'reset_onboarding', class_id: person.class_id },
      });
      if (res.error) throw res.error;
      toast.success(`${who} is back to a new account`);
      await fetchData();
    } catch (error) {
      console.error('resetOnboarding failed', { class_id: person.class_id, error });
      toast.error('Failed to reset the account');
    }
  };

  // Archive: the everyday way to take someone off the list. Shuts every door,
  // takes effect on their open tab immediately, keeps every record, undoable.
  const setArchived = async (person: PeopleRow, archived: boolean) => {
    const who = person.display_name || person.email;
    if (archived && !window.confirm(
      `Archive ${who}?\n\n` +
      'Their access is turned off and they come off your list. Nothing is ' +
      'deleted: their work, sessions and history all stay, and you can bring ' +
      'them back at any time.',
    )) return;

    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: {
          action: archived ? 'archive_student' : 'unarchive_student',
          class_id: person.class_id,
        },
      });
      if (res.error) throw res.error;
      toast.success(archived ? `${who} is archived` : `${who} is back on your list`);
      await fetchData();
    } catch (error) {
      console.error('setArchived failed', { class_id: person.class_id, archived, error });
      toast.error(archived ? 'Failed to archive' : 'Failed to restore');
    }
  };

  // Hard delete. The one action here that cannot be undone, so it asks for the
  // email to be typed rather than accepting a single click. Session records and
  // payment history are detached and survive; everything else goes.
  const deleteStudent = async (person: PeopleRow) => {
    const who = person.display_name || person.email;
    if (isPrimaryAdmin(person.email)) {
      toast.error('The primary admin account cannot be deleted.');
      return;
    }

    const typed = window.prompt(
      `Permanently delete ${who}?\n\n` +
      'This cannot be undone. Their account, practice history, journals, ' +
      'flagged questions and assigned work are all destroyed. Your session ' +
      'records and their payment history are kept and detached.\n\n' +
      `To confirm, type their email exactly:\n${person.email}`,
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== person.email.toLowerCase()) {
      toast.error('That email did not match. Nothing was deleted.');
      return;
    }

    try {
      const res = await supabase.functions.invoke('admin-manage-users', {
        method: 'POST',
        body: { action: 'delete_student', class_id: person.class_id, confirm_email: typed.trim() },
      });
      if (res.error) throw res.error;
      toast.success(`${who} has been deleted`);
      await fetchData();
    } catch (error) {
      console.error('deleteStudent failed', { class_id: person.class_id, error });
      toast.error('Failed to delete the account');
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
        {/* Archived people are off the list, so they are off the count too.
            Counting them here would say 41 while showing 27. */}
        {users.filter((user) => !user.archived_at).length} people
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-4">
          <SignupQueue onChanged={fetchData} />
        </div>
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
              ['archived', 'Archived'],
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
          setTier={setTier}
          setAllAccess={setAllAccess}
          setRole={setRole}
          resetOnboarding={resetOnboarding}
          setArchived={setArchived}
          deleteStudent={deleteStudent}
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
  setTier,
  setAllAccess,
  setRole,
  resetOnboarding,
  setArchived,
  deleteStudent,
  refresh,
}: {
  filtered: PeopleRow[];
  studentsLoading: boolean;
  expandedUser: string | null;
  setExpandedUser: (id: string | null) => void;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
  setTier: (person: PeopleRow, tier: AccessTier) => void;
  setAllAccess: (person: PeopleRow, grant: boolean) => void;
  setRole: (userId: string, role: 'admin' | 'user') => void;
  resetOnboarding: (person: PeopleRow) => void;
  setArchived: (person: PeopleRow, archived: boolean) => void;
  deleteStudent: (person: PeopleRow) => void;
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
              <PersonRow person={person} isExpanded={isExpanded} setExpandedUser={setExpandedUser} setAllAccess={setAllAccess} />
              {isExpanded && (
                <PersonAccessPanel
                  person={person}
                  toggleAccess={toggleAccess}
                  setTier={setTier}
                  setRole={setRole}
                  resetOnboarding={resetOnboarding}
                  setArchived={setArchived}
                  deleteStudent={deleteStudent}
                />
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
  setAllAccess,
}: {
  person: PeopleRow;
  isExpanded: boolean;
  setExpandedUser: (id: string | null) => void;
  setAllAccess: (person: PeopleRow, grant: boolean) => void;
}) {
  const student = person.student;
  const hasDrill = Boolean(person.has_drill_access);
  // "Any access" ignores the classroom home page, which revoking always leaves on.
  const hasAnyAccess = ALL_FLAG_KEYS.some(
    (key) => key !== 'has_classroom_access' && Boolean((person as unknown as Record<string, unknown>)[key]),
  );
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
            {person.role !== 'admin' && !person.archived_at && <TierBadge tier={person.access_tier} />}
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
        ) : hasAnyAccess ? (
          <button
            type="button"
            onClick={() => setAllAccess(person, false)}
            className="inline-flex items-center gap-1 border border-red-700/20 px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-500/10"
          >
            <UserX className="h-3 w-3" strokeWidth={1.5} />
            Revoke All Access
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAllAccess(person, true)}
            className="inline-flex items-center gap-1 border border-emerald-700/20 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/10"
          >
            <UserCheck className="h-3 w-3" strokeWidth={1.5} />
            Grant Full Access
          </button>
        )}
      </div>

    </div>
  );
}

function PersonAccessPanel({
  person,
  toggleAccess,
  setTier,
  setRole,
  resetOnboarding,
  setArchived,
  deleteStudent,
}: {
  person: PeopleRow;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
  setTier: (person: PeopleRow, tier: AccessTier) => void;
  setRole: (userId: string, role: 'admin' | 'user') => void;
  resetOnboarding: (person: PeopleRow) => void;
  setArchived: (person: PeopleRow, archived: boolean) => void;
  deleteStudent: (person: PeopleRow) => void;
}) {
  return (
    <div className="space-y-4 border-t border-black/10 px-8 py-4">
      {person.role !== 'admin' && !person.archived_at && (
        <AccessTierControl person={person} toggleAccess={toggleAccess} setTier={setTier} />
      )}

      {person.role !== 'admin' && !person.archived_at && (
        <div className="border-t border-black/10 pt-3">
          <AssignPracticeTest classId={person.class_id} who={person.display_name || person.email} />
        </div>
      )}

      <p className="text-xs leading-relaxed text-black/45">
        The Bootcamps switch opens the bootcamp list. A single bootcamp is opened by assigning it
        from the Library, whatever the tier.
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

      <div className="border-t border-black/10 pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">Account</div>
        <button
          type="button"
          onClick={() => resetOnboarding(person)}
          className="inline-flex items-center gap-1.5 border border-black/15 px-2.5 py-1.5 text-xs font-semibold text-black/55 transition hover:bg-white/25 hover:text-black"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Reset to a new account
        </button>
        <p className="mt-2 text-xs leading-relaxed text-black/45">
          Clears their setup answers and name, re-locks access, and lets the intake
          run again. The login and their practice history survive.
        </p>
      </div>

      {/* Two ways off the list, deliberately far apart in weight. Archive is
          the one to reach for; delete is framed as the exception it is. */}
      <div className="border-t border-black/10 pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
          Remove from your list
        </div>
        {person.archived_at ? (
          <>
            <button
              type="button"
              onClick={() => setArchived(person, false)}
              className="inline-flex items-center gap-1.5 border border-emerald-700/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/10"
            >
              <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.5} />
              Bring back to the list
            </button>
            <p className="mt-2 text-xs leading-relaxed text-black/45">
              Archived {new Date(person.archived_at).toLocaleDateString()}. Their
              records were kept. Restoring puts them back on your list with access
              still off, so you choose what to reopen.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setArchived(person, true)}
              disabled={isPrimaryAdmin(person.email)}
              className="inline-flex items-center gap-1.5 border border-black/15 px-2.5 py-1.5 text-xs font-semibold text-black/55 transition hover:bg-white/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
              Archive
            </button>
            <p className="mt-2 text-xs leading-relaxed text-black/45">
              Turns off their access and takes them off your list. It lands on an
              open tab straight away.
              Nothing is deleted and you can bring them back at any time.
            </p>
          </>
        )}

        <div className="mt-4 border-t border-red-700/15 pt-3">
          <button
            type="button"
            onClick={() => deleteStudent(person)}
            disabled={isPrimaryAdmin(person.email)}
            className="inline-flex items-center gap-1.5 border border-red-700/25 px-2.5 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Delete permanently
          </button>
          <p className="mt-2 text-xs leading-relaxed text-black/45">
            {isPrimaryAdmin(person.email)
              ? 'The primary admin account cannot be deleted.'
              : 'Cannot be undone. Destroys their account and all their work. Your session records and their payment history are kept.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: AccessTier | null | undefined }) {
  return (
    <span
      className={cn(
        'border px-1.5 py-0.5 text-[10px] font-semibold',
        tier ? 'border-black/15 text-black/55' : 'border-amber-700/30 bg-amber-500/10 text-amber-800',
      )}
    >
      {tier ? TIER_LABELS[tier] : 'No tier'}
    </span>
  );
}

/**
 * The tier picker and, under it, the twelve switches. Picking Tier 1 or Tier 3
 * rewrites the switches to that template; Tier 2 keeps them. Any switch can be
 * flipped at any tier, and flipping one away from a Tier 1 or Tier 3 template
 * makes the student Tier 2: the database relabels, never the reverse.
 */
function AccessTierControl({
  person,
  toggleAccess,
  setTier,
}: {
  person: PeopleRow;
  toggleAccess: (classId: string, field: string, value: boolean) => void;
  setTier: (person: PeopleRow, tier: AccessTier) => void;
}) {
  const who = person.display_name || person.email;
  const current = person.access_tier ?? null;
  const pick = (tier: AccessTier) => {
    if (tier === current) return;
    if (tier === 'tier_3' && !window.confirm(
      `Put ${who} on Tier 3?\n\n` +
      'They keep Classroom, Messages and Schedule, plus anything you assign. ' +
      'Every other feature is turned off.',
    )) return;
    setTier(person, tier);
  };

  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">Access</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Tier for ${who}`}>
        {ACCESS_TIERS.map((tier) => {
          const active = current === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(tier.id)}
              title={tier.description}
              className={cn(
                'border px-2.5 py-1.5 text-xs font-semibold transition',
                active
                  ? 'border-black/60 bg-black text-white'
                  : 'border-black/15 text-black/55 hover:bg-white/25 hover:text-black',
              )}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-black/45">
        {current
          ? ACCESS_TIERS.find((t) => t.id === current)?.description
          : 'No tier yet. They have Classroom, Messages and Schedule until you choose.'}{' '}
        Changes reach an open tab straight away.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {FLAG_GROUPS.map((group) => (
          <fieldset key={group.label} className="min-w-0">
            <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
              {group.label}
            </legend>
            <div className="space-y-1">
              {group.flags.map((flag) => {
                const on = Boolean((person as unknown as Record<string, unknown>)[flag.key]);
                return (
                  <label key={flag.key} className="flex cursor-pointer items-center gap-2 text-xs text-black/70">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleAccess(person.class_id, flag.key, !on)}
                      className="h-3.5 w-3.5 accent-black"
                      aria-label={`${ALL_FLAG_LABELS[flag.key]} for ${who}`}
                    />
                    {flag.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
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
