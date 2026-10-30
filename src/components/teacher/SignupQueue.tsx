import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ACCESS_TIERS, type AccessTier, type ManagedUser } from '@/lib/adminUsers';
import { listManagedUsers, setStudentTier } from '@/lib/accessTierClient';

export { setStudentTier };

export const SIGNUP_QUEUE_KEY = ['signup-queue'] as const;

/** Undecided accounts: no tier yet, not archived, not an admin. Newest first. */
export function signupQueueRows(users: ManagedUser[]): ManagedUser[] {
  return users
    .filter((u) => u.role !== 'admin' && !u.archived_at && !u.access_tier)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

/**
 * Everyone waiting on a decision: new signups and anyone with no tier. Until
 * Joshua decides, they have the floor (Classroom, Messages, Schedule) and
 * nothing else. The checkmark picks a tier; the X puts them on Tier 3, which
 * with nothing assigned is the same floor, just decided.
 *
 * Rendered on Today and on Students. Both read the same query, so deciding on
 * one empties the row on the other.
 */
export function SignupQueue({ onChanged }: { onChanged?: () => void }) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isLoading, isError } = useQuery<ManagedUser[]>({
    queryKey: SIGNUP_QUEUE_KEY,
    queryFn: async () => signupQueueRows(await listManagedUsers()),
    staleTime: 30_000,
  });

  const decide = async (person: ManagedUser, tier: AccessTier) => {
    const who = person.display_name || person.email;
    setBusy(person.class_id);
    try {
      await setStudentTier(person.class_id, tier);
      const label = ACCESS_TIERS.find((t) => t.id === tier)?.label ?? tier;
      toast.success(`${who} is on ${label}`);
      setPicking(null);
      await queryClient.invalidateQueries({ queryKey: SIGNUP_QUEUE_KEY });
      onChanged?.();
    } catch (error) {
      console.error('signup queue: set_tier failed', { class_id: person.class_id, tier, error });
      toast.error(`Could not set a tier for ${who}`);
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return null;
  if (isError) {
    return (
      <div className="border border-black/12 bg-white/25 px-4 py-3.5 text-[13px] text-black/50">
        The signup queue could not load.
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <section aria-label="Signup queue" className="border border-black/12 bg-white/25 px-4 py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
          Waiting for a tier
        </div>
        <div className="text-[11px] tabular-nums text-black/40">{rows.length}</div>
      </div>
      <ul className="divide-y divide-black/10">
        {rows.map((person) => {
          const who = person.display_name || 'No name yet';
          const isPicking = picking === person.class_id;
          const isBusy = busy === person.class_id;
          return (
            <li key={person.class_id} className="py-2" data-testid={`signup-queue-row-${person.class_id}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-black">{who}</div>
                  <div className="flex flex-wrap gap-x-3 text-[11px] text-black/45">
                    <span className="truncate font-mono">{person.email}</span>
                    {person.created_at && (
                      <span>Joined {new Date(person.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setPicking(isPicking ? null : person.class_id)}
                  aria-expanded={isPicking}
                  aria-label={`Choose a tier for ${who}`}
                  className="inline-flex h-7 w-7 items-center justify-center border border-emerald-700/25 text-emerald-800 transition hover:bg-emerald-500/10 disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => decide(person, 'tier_3')}
                  aria-label={`Put ${who} on Tier 3`}
                  title="Tier 3: Classroom, Messages and Schedule only"
                  className="inline-flex h-7 w-7 items-center justify-center border border-red-700/20 text-red-800 transition hover:bg-red-500/10 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              {isPicking && (
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Tiers for ${who}`}>
                  {ACCESS_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => decide(person, tier.id)}
                      title={tier.description}
                      className="border border-black/15 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:bg-white/40 hover:text-black disabled:opacity-40"
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
