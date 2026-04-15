import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Shield } from "lucide-react";
import { toast } from "sonner";

interface ManagedUser {
  class_id: string;
  email: string;
  display_name: string | null;
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
}

const FLAGS = [
  { key: "has_bootcamp_access", label: "Bootcamps" },
  { key: "has_classroom_access", label: "Classroom" },
  { key: "has_analytics_access", label: "Analytics" },
  { key: "has_schedule_access", label: "Schedule" },
] as const;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { is_admin, loading: permLoading } = useUserPermissions();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  useEffect(() => {
    if (!is_admin) return;
    fetchUsers();
  }, [is_admin]);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "GET",
      });

      if (res.error) throw res.error;
      setUsers(res.data || []);
    } catch (e: any) {
      toast.error("Failed to load users");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (classId: string, field: string, value: boolean) => {
    // Optimistic update
    setUsers(prev =>
      prev.map(u =>
        u.class_id === classId ? { ...u, [field]: value } : u
      )
    );

    try {
      const res = await supabase.functions.invoke("admin-manage-users", {
        method: "POST",
        body: { class_id: classId, field, value },
      });

      if (res.error) throw res.error;
    } catch (e: any) {
      // Revert
      setUsers(prev =>
        prev.map(u =>
          u.class_id === classId ? { ...u, [field]: !value } : u
        )
      );
      toast.error("Failed to update permission");
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.email?.toLowerCase().includes(q)) ||
      (u.display_name?.toLowerCase().includes(q))
    );
  });

  if (permLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!is_admin) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/foyer")}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-zinc-500" />
          <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
          <span className="text-xs text-zinc-500 ml-auto">{users.length} users</span>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Display Name</th>
                {FLAGS.map(f => (
                  <th key={f.key} className="text-center py-3 px-4 text-zinc-400 font-medium">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr
                  key={user.class_id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                    {user.email}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {user.display_name || "—"}
                  </td>
                  {FLAGS.map(f => (
                    <td key={f.key} className="py-3 px-4 text-center">
                      <Switch
                        checked={user[f.key as keyof ManagedUser] as boolean}
                        onCheckedChange={(val) => toggleAccess(user.class_id, f.key, val)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-600">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
