import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { listManagedUsers } from '@/lib/accessTierClient';
import type { ManagedUser } from '@/lib/adminUsers';

export interface StripePayment {
  id: string;
  stripe_charge_id: string;
  email: string | null;
  payer_name: string | null;
  description: string | null;
  product: string | null;
  amount_cents: number;
  amount_refunded_cents: number;
  currency: string;
  status: string;
  paid_at: string;
  student_id: string | null;
  match_state: 'matched' | 'unmatched' | 'linked' | 'ignored';
  offer_id: string | null;
  grant_state: 'none' | 'awaiting' | 'granted' | 'dismissed';
  granted_credits: number | null;
  livemode: boolean;
  source: 'webhook' | 'backfill';
}

const PAYMENTS_KEY = ['stripe-payments'] as const;
const SYNC_KEY = ['stripe-sync-last'] as const;
const PAGE = 25;

export function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() || 'USD' }).format(cents / 100);
}

/**
 * Payments that need Joshua: a package waiting for a grant, or a new paid payer
 * nobody is linked to. Backfilled history was already handled by hand, so an
 * old unmatched charge stays in the list without asking for anything.
 */
export function needsAttention(p: StripePayment) {
  if (p.grant_state === 'awaiting') return true;
  return p.match_state === 'unmatched' && p.status === 'succeeded' && p.source === 'webhook';
}

export function matchesSearch(p: StripePayment, q: string, studentName: (id: string | null) => string | null) {
  if (!q) return true;
  const hay = [p.payer_name, p.email, p.description, p.product, studentName(p.student_id), money(p.amount_cents, p.currency)]
    .filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Part refunded',
  disputed: 'Disputed',
};

/**
 * Every Stripe charge from the last three months, newest first, plus the two
 * things a payment can ask of Joshua: grant a package's passes, or say who paid.
 * Nothing here happens by itself (decisions/log.md, 2026-09-27).
 */
export function PaymentsPanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const payments = useQuery<StripePayment[]>({
    queryKey: PAYMENTS_KEY,
    queryFn: async () => {
      const since = new Date(Date.now() - 92 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from('stripe_payments' as any)
        .select('*')
        .gte('paid_at', since)
        .order('paid_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as StripePayment[];
    },
    staleTime: 30_000,
  });

  const lastSync = useQuery<{ finished_at: string | null; error: string | null } | null>({
    queryKey: SYNC_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_sync_runs' as any)
        .select('finished_at,error')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    staleTime: 60_000,
  });

  const students = useQuery<ManagedUser[]>({
    queryKey: ['payments-students'],
    queryFn: async () => (await listManagedUsers()).filter((u) => u.role !== 'admin'),
    staleTime: 5 * 60_000,
  });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students.data ?? []) m.set(s.class_id, s.display_name || s.email);
    return m;
  }, [students.data]);
  const studentName = (id: string | null) => (id ? nameById.get(id) ?? null : null);

  // A new or updated payment (webhook, sync, another tab) refreshes the list live.
  useEffect(() => {
    const channel = supabase
      .channel(`stripe-payments-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stripe_payments' }, () => {
        void queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = payments.data ?? [];
  const attention = rows.filter(needsAttention);
  const filtered = rows.filter((p) => matchesSearch(p, query.trim(), studentName));
  const paidTotal = rows
    .filter((p) => p.status === 'succeeded' || p.status === 'partially_refunded')
    .reduce((sum, p) => sum + p.amount_cents - p.amount_refunded_cents, 0);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    queryClient.invalidateQueries({ queryKey: SYNC_KEY });
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-sync', { body: { days: 90 } });
      if (error) throw error;
      toast.success(`Synced ${data?.charges ?? 0} Stripe charges`);
      refresh();
    } catch (error) {
      console.error('stripe-sync failed', error);
      toast.error('Stripe sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const rpc = async (p: StripePayment, fn: string, args: Record<string, unknown>, done: string) => {
    setBusy(p.id);
    try {
      const { error } = await supabase.rpc(fn as any, { _payment_id: p.id, ...args } as any);
      if (error) throw error;
      toast.success(done);
      setLinking(null);
      refresh();
    } catch (error: any) {
      console.error(`${fn} failed`, { id: p.id, error });
      toast.error(error?.message ?? 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  if (payments.isError) {
    return (
      <div className="border border-black/12 bg-white/25 px-4 py-3.5 text-[13px] text-black/50">
        Payments could not load.
      </div>
    );
  }

  const who = (p: StripePayment) => studentName(p.student_id) || p.payer_name || p.email || 'Unknown payer';

  return (
    <section aria-label="Payments" className="border border-black/12 bg-white/25 px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
          Payments &middot; last 90 days
        </div>
        <div className="flex items-center gap-3 text-[11px] text-black/45">
          {!payments.isLoading && <span className="tabular-nums">{rows.length} charges &middot; {money(paidTotal, rows[0]?.currency ?? 'usd')} net</span>}
          <span>
            {lastSync.data?.error
              ? 'Last sync failed'
              : lastSync.data?.finished_at
                ? `Synced ${new Date(lastSync.data.finished_at).toLocaleString()}`
                : 'Never synced'}
          </span>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-1 border border-black/15 px-2 py-0.5 text-black/70 transition hover:bg-black/5 disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing' : 'Sync from Stripe'}
          </button>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="mb-3 border border-amber-700/25 bg-amber-500/5 px-3 py-2">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-900/70">
            Needs you &middot; {attention.length}
          </div>
          <ul className="divide-y divide-black/10">
            {attention.map((p) => (
              <li key={p.id} className="py-2" data-testid={`payment-attention-${p.id}`}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{who(p)}</span>{' '}
                    <span className="text-black/50">paid {money(p.amount_cents, p.currency)} on {new Date(p.paid_at).toLocaleDateString()}</span>
                    {p.grant_state === 'awaiting' && <span className="text-black/50"> &middot; package</span>}
                  </span>
                  {p.grant_state === 'awaiting' ? (
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => rpc(p, 'admin_grant_stripe_payment', {}, `Passes added for ${who(p)}`)}
                      className="border border-emerald-700/30 px-2 py-0.5 text-[12px] text-emerald-800 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      Grant passes
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => setLinking(linking === p.id ? null : p.id)}
                      aria-expanded={linking === p.id}
                      className="border border-black/20 px-2 py-0.5 text-[12px] text-black/70 hover:bg-black/5 disabled:opacity-40"
                    >
                      Link student
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => rpc(p, 'admin_dismiss_stripe_payment', {}, 'Dismissed')}
                    className="px-1 text-[12px] text-black/40 hover:text-black/70 disabled:opacity-40"
                  >
                    Dismiss
                  </button>
                </div>
                {p.email && <div className="font-mono text-[11px] text-black/40">{p.email}</div>}
                {linking === p.id && (
                  <select
                    aria-label={`Student who made the ${money(p.amount_cents, p.currency)} payment`}
                    className="mt-1.5 w-full border border-black/15 bg-white px-2 py-1 text-[13px]"
                    defaultValue=""
                    onChange={(e) => e.target.value && rpc(p, 'admin_link_stripe_payment', { _student_id: e.target.value }, 'Linked')}
                  >
                    <option value="" disabled>Choose a student</option>
                    {(students.data ?? [])
                      .slice()
                      .sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email))
                      .map((s) => (
                        <option key={s.class_id} value={s.class_id}>
                          {s.display_name || s.email} ({s.email})
                        </option>
                      ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
        placeholder="Search name, email, amount"
        aria-label="Search payments"
        className="mb-2 w-full border border-black/15 bg-white/60 px-2 py-1 text-[13px] placeholder:text-black/35"
      />

      {payments.isLoading ? (
        <p className="text-[13px] text-black/45">Loading</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-black/45">No payments recorded yet. Sync from Stripe to load the last 90 days.</p>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-black/45">No payment matches that search.</p>
      ) : (
        <>
          <ul className="divide-y divide-black/10">
            {filtered.slice(0, shown).map((p) => (
              <li key={p.id} className="flex items-baseline gap-3 py-1.5 text-[13px]">
                <span className="w-[76px] shrink-0 tabular-nums text-black/50">
                  {new Date(p.paid_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {who(p)}
                  {p.product && <span className="text-black/40"> &middot; {p.product.replace('_', ' ')}</span>}
                  {p.grant_state === 'granted' && <span className="text-black/40"> &middot; {p.granted_credits} passes granted</span>}
                </span>
                <span className={`shrink-0 text-[11px] ${p.status === 'succeeded' ? 'text-black/40' : 'text-red-800/80'}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
                <span className="w-[80px] shrink-0 text-right tabular-nums">{money(p.amount_cents, p.currency)}</span>
              </li>
            ))}
          </ul>
          {filtered.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-2 text-[12px] text-black/50 underline-offset-2 hover:underline"
            >
              Show more ({filtered.length - shown} left)
            </button>
          )}
        </>
      )}
    </section>
  );
}
