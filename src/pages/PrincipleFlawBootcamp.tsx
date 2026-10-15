/**
 * /bootcamp/principle-flaw — Principle & Flaw bootcamp host page.
 *
 * Wraps the ported standalone "Principle & Flaw" sub-app
 * (src/bootcamps/principle-flaw/PrincipleFlawApp.tsx) in the standard LSAT U
 * chrome: auth gate + Return-to-Bootcamps header. The bootcamp itself owns
 * its own dark zinc/emerald visual language and persists progress to
 * localStorage under the `pf:` namespace.
 */

import React, { Suspense } from 'react';
import { safeLazy } from '@/lib/safeLazy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatParticipantName } from '@/lib/displayName';

const PrincipleFlawApp = safeLazy(
  () => import('@/bootcamps/principle-flaw/PrincipleFlawApp'),
);

export default function PrincipleFlawBootcamp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName = (meta.display_name as string) || (meta.full_name as string) || (meta.name as string) || null;
  const userName =
    formatParticipantName(rawName) !== 'User'
      ? formatParticipantName(rawName)
      : (user.email ? user.email.split('@')[0] : 'Student');

  return (
    <div className="min-h-screen bg-[#030303]">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-[#030303]/85 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bootcamps')}
            className="gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bootcamps
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Principle &amp; Flaw
          </span>
          <div className="w-[120px]" aria-hidden="true" />
        </div>
      </header>

      <Suspense fallback={<div className="py-24 text-center text-xs uppercase tracking-widest text-zinc-600">Loading bootcamp…</div>}>
        <PrincipleFlawApp userName={userName} />
      </Suspense>
    </div>
  );
}
