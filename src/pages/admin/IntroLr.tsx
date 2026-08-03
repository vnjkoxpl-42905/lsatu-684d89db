/**
 * /admin/intro-lr
 *
 * Admin-only overview of every student's Intro to LR bootcamp activity.
 * Pulls per-question attempts from `intro_lr_attempts` (admins can read all
 * via RLS) and joins against `useHubStudents` for names/emails.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useHubStudents } from '@/hooks/useHubStudents';
import { Badge } from '@/components/ui/badge';

interface Row {
  user_id: string;
  drill_id: string;
  correct: boolean;
  created_at: string;
}

interface Aggregate {
  total: number;
  correct: number;
  drills: Set<string>;
  lastAt: string | null;
}

export default function AdminIntroLr() {
  const { user, loading: authLoading } = useAuth();
  // Permissions are still resolving on a cold load; treating that as "loaded"
  // flashed "Admins only." at an admin before their flags arrived.
  const { is_admin: isAdmin, loading: permLoading } = useUserPermissions();
  const { rows: students } = useHubStudents();
  const [attempts, setAttempts] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from('intro_lr_attempts')
        .select('user_id, drill_id, correct, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);
      if (error) {
        console.warn('[admin/intro-lr] load failed', error.message);
      }
      setAttempts((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (authLoading || permLoading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <p>Admins only.</p>
      </div>
    );
  }

  const byStudent = new Map<string, Aggregate>();
  for (const a of attempts) {
    const agg = byStudent.get(a.user_id) ?? { total: 0, correct: 0, drills: new Set<string>(), lastAt: null };
    agg.total += 1;
    if (a.correct) agg.correct += 1;
    agg.drills.add(a.drill_id);
    if (!agg.lastAt || a.created_at > agg.lastAt) agg.lastAt = a.created_at;
    byStudent.set(a.user_id, agg);
  }

  const merged = students
    .map((s) => {
      const agg = byStudent.get(s.class_id);
      return {
        id: s.class_id,
        name: s.display_name || s.email || s.class_id.slice(0, 8),
        email: s.email,
        total: agg?.total ?? 0,
        correct: agg?.correct ?? 0,
        accuracy: agg && agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : null,
        drills: agg?.drills.size ?? 0,
        lastAt: agg?.lastAt ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-background p-6 text-foreground md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/teacher/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <Badge variant="secondary">{attempts.length} total attempts</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Intro to LR — Student progress</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every question each student answers inside the Intro to LR bootcamp is logged here automatically.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 text-right">Attempts</th>
                <th className="px-4 py-3 text-right">Accuracy</th>
                <th className="px-4 py-3 text-right">Drills touched</th>
                <th className="px-4 py-3 text-right">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : merged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No students yet.</td></tr>
              ) : (
                merged.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.accuracy === null ? '—' : `${r.accuracy}%`}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.drills}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {r.lastAt ? new Date(r.lastAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
