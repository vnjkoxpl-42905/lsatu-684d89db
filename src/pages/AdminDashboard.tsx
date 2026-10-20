import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Search, Shield, Users, Activity, BarChart3,
  ChevronDown, ChevronUp, Crown, UserCheck, UserX, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeShort } from "@/lib/time";
import {
  ALL_FLAG_KEYS,
  ALL_FLAG_LABELS,
  FLAG_GROUPS,
  ROLE_TEMPLATES,
  computeAdminAnalytics,
  isPrimaryAdmin,
  templateMatches,
  type AdminAnalytics,
  type ManagedUser,
} from "@/lib/adminUsers";

// Relative time rendering delegated to src/lib/time.ts so the admin
// dashboard, hub, and notification bell all read the same way.
const timeAgo = formatRelativeShort;

interface AdminDashboardProps {
  embedded?: boolean;
  title?: string;
}

export default function AdminDashboard({ embedded = false, title = "Admin Dashboard" }: AdminDashboardProps = {}) {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/classroom", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [usersRes, analyticsRes] = await Promise.all([
        supabase.functions.invoke("admin-manage-users", { method: "GET" }),
        supabase.functions.invoke("admin-manage-users", {
          method: "GET",
          headers: { "x-mode": "analytics" },
          body: undefined,
        }),
      ]);

      if (usersRes.error) throw usersRes.error;
      setUsers(usersRes.data || []);

      // Analytics via query param — invoke with GET doesn't support query params easily,
      // so we'll compute analytics client-side from user data
      if (!analyticsRes.error && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (e: unknown) {
      toast.error("Failed to load data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!is_admin) return;
    fetchData();
  }, [is_admin, fetchData]);

  // Compute analytics from users data if server analytics failed.
  const computedAnalytics = computeAdminAnalytics(users, analytics);

  const toggleAccess = async (classId: string, field: string, value: boolean) => {
    setUsers(prev => prev.map(u => u.class_id === classId ? { ...u, [field]: value } : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { class_id: classId, field, value },
      });
      if (res.error) throw res.error;
      // Trust the row the server wrote back, not the optimistic guess. A filter
      // that matches nothing is not a PostgREST error, so without this a toggle
      // that never landed reads as saved until the next reload undoes it.
      const written = (res.data as { profile?: Record<string, unknown> } | null)?.profile;
      if (!written || written[field] !== value) throw new Error("Permission was not saved");
    } catch (error) {
      setUsers(prev => prev.map(u => u.class_id === classId ? { ...u, [field]: !value } : u));
      console.error("toggleAccess failed", { classId, field, value, error });
      toast.error("Failed to update permission");
    }
  };

  const bulkUser = async (classId: string, value: boolean) => {
    const prev = users.find(u => u.class_id === classId);
    if (!prev) return;
    const updated = { ...prev } as ManagedUser & Record<string, boolean | string | null>;
    ALL_FLAG_KEYS.forEach(k => { updated[k] = value; });
    setUsers(us => us.map(u => u.class_id === classId ? updated : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { action: "bulk_user", class_id: classId, value },
      });
      if (res.error) throw res.error;
      // Read the row back rather than trusting the optimistic sweep: the server
      // owns the flag list, and a client that knows fewer flags than the server
      // would otherwise keep showing the ones it forgot as untouched.
      await fetchData();
      toast.success(value ? "All access granted" : "All access revoked");
    } catch {
      setUsers(us => us.map(u => u.class_id === classId ? prev : u));
      toast.error("Bulk action failed");
    }
  };

  const applyTemplate = async (classId: string, flags: Record<string, boolean>, label: string) => {
    const prev = users.find(u => u.class_id === classId);
    if (!prev) return;
    setUsers(us => us.map(u => u.class_id === classId ? { ...u, ...flags } as ManagedUser : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { action: "apply_template", class_id: classId, flags },
      });
      if (res.error) throw res.error;
      await fetchData();
      toast.success(`Applied "${label}"`);
    } catch {
      setUsers(us => us.map(u => u.class_id === classId ? prev : u));
      toast.error("Template apply failed");
    }
  };

  const setRole = async (userId: string, role: "admin" | "user") => {
    const prev = users.find(u => u.class_id === userId);
    if (!prev) return;
    if (role === "user" && isPrimaryAdmin(prev.email)) {
      toast.error("The primary admin account cannot be demoted.");
      return;
    }
    setUsers(us => us.map(u => u.class_id === userId ? { ...u, role } : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { action: "set_role", user_id: userId, role },
      });
      if (res.error) throw res.error;
      toast.success(role === "admin" ? "Promoted to admin" : "Demoted to user");
    } catch {
      setUsers(us => us.map(u => u.class_id === userId ? prev : u));
      toast.error("Role change failed");
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = (u.email?.toLowerCase().includes(q)) || (u.display_name?.toLowerCase().includes(q));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (permLoading || loading) {
    return (
      <div className={`${embedded ? "h-full" : "min-h-screen"} bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!is_admin) return null;

  const maxAdoption = Math.max(...Object.values(computedAnalytics.feature_adoption), 1);

  return (
    <div className={`${embedded ? "h-full overflow-y-auto" : "min-h-screen"} bg-zinc-950 text-zinc-100`}>
      {/* Header */}
      {!embedded && (
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/classroom")}
            className="text-zinc-400 hover:text-white transition-colors shrink-0"
            aria-label="Back to the classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-amber-500/70 shrink-0" />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
            {title}
          </h1>
          <span className="text-xs text-zinc-500 ml-auto shrink-0">{users.length} users</span>
        </div>
      </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {embedded && (
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500/70 shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {title}
            </h1>
            <span className="text-xs text-zinc-500 ml-auto shrink-0">{users.length} users</span>
          </div>
        )}

        {/* ── Analytics Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total Users" value={computedAnalytics.total_users} />
          <StatCard icon={<Activity className="w-4 h-4" />} label="Active Today" value={computedAnalytics.active_today} />
          <StatCard icon={<Activity className="w-4 h-4" />} label="Active This Week" value={computedAnalytics.active_week} />
          <StatCard icon={<Crown className="w-4 h-4 text-amber-500" />} label="Admins" value={computedAnalytics.admin_count} />
        </div>

        {/* ── Feature Adoption ── */}
        <div className="border border-zinc-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-medium text-zinc-300">Feature Adoption</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ALL_FLAG_KEYS.map(key => {
              const count = computedAnalytics.feature_adoption[key] || 0;
              const pct = maxAdoption > 0 ? (count / maxAdoption) * 100 : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{ALL_FLAG_LABELS[key]}</span>
                    <span className="text-zinc-500 font-mono">{count}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
          <div className="flex gap-1 self-stretch sm:self-auto">
            {(["all", "admin", "user"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-md transition-colors ${
                  roleFilter === r
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── User Table ── */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium w-8"></th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">User</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Role</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Last Seen</th>
                <th className="text-center py-3 px-4 text-zinc-400 font-medium">Access</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const isExpanded = expandedUser === user.class_id;
                const enabledCount = ALL_FLAG_KEYS.filter(k => user[k as keyof ManagedUser] === true).length;

                return (
                  <React.Fragment key={user.class_id}>
                    <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setExpandedUser(isExpanded ? null : user.class_id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-zinc-300 text-xs font-mono">{user.email}</div>
                        <div className="text-zinc-500 text-xs">{user.display_name || "—"}</div>
                      </td>
                      <td className="py-3 px-4">
                        {user.role === "admin" ? (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                            <Crown className="w-2.5 h-2.5 mr-1" /> {isPrimaryAdmin(user.email) ? "Primary admin" : "Admin"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-[10px]">User</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-xs">{timeAgo(user.last_seen_at)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs font-mono text-zinc-400">
                          {enabledCount}/{ALL_FLAG_KEYS.length}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => bulkUser(user.class_id, true)}
                          >
                            <UserCheck className="w-3 h-3 mr-1" /> Grant All
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500/70 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => bulkUser(user.class_id, false)}
                          >
                            <UserX className="w-3 h-3 mr-1" /> Revoke All
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-zinc-900/20">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="space-y-4">
                            {/* Templates — apply a preset of flags in one shot */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3 h-3 text-zinc-500" />
                                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                                  Templates
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {ROLE_TEMPLATES.map(t => {
                                  const active = templateMatches(user as unknown as Record<string, unknown>, t.flags);
                                  return (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => applyTemplate(user.class_id, t.flags, t.label)}
                                      title={t.description}
                                      className={
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors " +
                                        (active
                                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                          : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")
                                      }
                                    >
                                      {t.label}
                                      <span className="text-[10px] text-zinc-500">{t.description}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Feature toggles */}
                            {FLAG_GROUPS.map(group => (
                              <div key={group.label}>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">{group.label}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {group.flags.map(f => (
                                    <div key={f.key} className="flex items-center justify-between bg-zinc-900/50 rounded-md px-3 py-2">
                                      <span className="text-xs text-zinc-400">{f.label}</span>
                                      <Switch
                                        checked={user[f.key as keyof ManagedUser] as boolean}
                                        onCheckedChange={val => toggleAccess(user.class_id, f.key, val)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Role management */}
                            <div className="pt-2 border-t border-zinc-800/50">
                              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Role Management</div>
                              <div className="flex items-center gap-2">
                                {user.role !== "admin" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                    onClick={() => setRole(user.class_id, "admin")}
                                  >
                                    <Crown className="w-3 h-3 mr-1" /> Promote to Admin
                                  </Button>
                                ) : isPrimaryAdmin(user.email) ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs text-zinc-500"
                                    title="The primary admin account cannot be demoted."
                                  >
                                    <Shield className="w-3 h-3" /> Protected primary admin
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                    onClick={() => setRole(user.class_id, "user")}
                                  >
                                    Demote to User
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-600">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-zinc-500 mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-zinc-200 font-mono">{value}</div>
    </div>
  );
}
