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
  ChevronDown, ChevronUp, Crown, UserCheck, UserX
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeShort } from "@/lib/time";

interface ManagedUser {
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

interface Analytics {
  total_users: number;
  active_today: number;
  active_week: number;
  admin_count: number;
  feature_adoption: Record<string, number>;
  total_attempts: number;
  week_attempts: number;
}

const FLAG_GROUPS = [
  {
    label: "Core",
    flags: [
      { key: "has_practice_access", label: "Practice" },
      { key: "has_drill_access", label: "Drill" },
    ],
  },
  {
    label: "Modules",
    flags: [
      { key: "has_bootcamp_access", label: "Bootcamps" },
      { key: "has_classroom_access", label: "Classroom" },
      { key: "has_analytics_access", label: "Analytics" },
      { key: "has_schedule_access", label: "Schedule" },
    ],
  },
  {
    label: "Tools",
    flags: [
      { key: "has_waj_access", label: "WAJ" },
      { key: "has_flagged_access", label: "Flagged" },
      { key: "has_chat_access", label: "Chat" },
      { key: "has_export_access", label: "Export" },
      { key: "has_ta_access", label: "TA" },
    ],
  },
] as const;

const ALL_FLAG_KEYS = FLAG_GROUPS.flatMap(g => g.flags.map(f => f.key));
const ALL_FLAG_LABELS: Record<string, string> = {};
FLAG_GROUPS.forEach(g => g.flags.forEach(f => { ALL_FLAG_LABELS[f.key] = f.label; }));

// Relative time rendering delegated to src/lib/time.ts so the admin
// dashboard, hub, and notification bell all read the same way.
const timeAgo = formatRelativeShort;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
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
    } catch (e: any) {
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

  // Compute analytics from users data if server analytics failed
  const computedAnalytics: Analytics = analytics || {
    total_users: users.length,
    active_today: users.filter(u => {
      if (!u.last_seen_at) return false;
      return Date.now() - new Date(u.last_seen_at).getTime() < 24 * 60 * 60 * 1000;
    }).length,
    active_week: users.filter(u => {
      if (!u.last_seen_at) return false;
      return Date.now() - new Date(u.last_seen_at).getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
    admin_count: users.filter(u => u.role === "admin").length,
    feature_adoption: ALL_FLAG_KEYS.reduce((acc, key) => {
      acc[key] = users.filter(u => u[key as keyof ManagedUser] === true).length;
      return acc;
    }, {} as Record<string, number>),
    total_attempts: 0,
    week_attempts: 0,
  };

  const toggleAccess = async (classId: string, field: string, value: boolean) => {
    setUsers(prev => prev.map(u => u.class_id === classId ? { ...u, [field]: value } : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { class_id: classId, field, value },
      });
      if (res.error) throw res.error;
    } catch {
      setUsers(prev => prev.map(u => u.class_id === classId ? { ...u, [field]: !value } : u));
      toast.error("Failed to update permission");
    }
  };

  const bulkUser = async (classId: string, value: boolean) => {
    const prev = users.find(u => u.class_id === classId);
    if (!prev) return;
    const updated: any = { ...prev };
    ALL_FLAG_KEYS.forEach(k => { updated[k] = value; });
    setUsers(us => us.map(u => u.class_id === classId ? updated : u));
    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { action: "bulk_user", class_id: classId, value },
      });
      if (res.error) throw res.error;
      toast.success(value ? "All access granted" : "All access revoked");
    } catch {
      setUsers(us => us.map(u => u.class_id === classId ? prev : u));
      toast.error("Bulk action failed");
    }
  };

  const setRole = async (userId: string, role: "admin" | "user") => {
    const prev = users.find(u => u.class_id === userId);
    if (!prev) return;
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!is_admin) return null;

  const maxAdoption = Math.max(...Object.values(computedAnalytics.feature_adoption), 1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/foyer")} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-amber-500/70" />
          <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
          <span className="text-xs text-zinc-500 ml-auto">{users.length} users</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "admin", "user"] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
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
          <table className="w-full text-sm">
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
                            <Crown className="w-2.5 h-2.5 mr-1" /> Admin
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


