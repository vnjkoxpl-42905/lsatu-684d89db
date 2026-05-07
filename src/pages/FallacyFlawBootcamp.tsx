/**
 * /bootcamp/fallacy-flaw — Flaw & Famous Flaws bootcamp host page.
 *
 * Wraps the ported standalone sub-app in the standard LSAT U chrome:
 * auth gate + Return-to-Bootcamps header. The bootcamp uses a warm
 * paper/ink/verdigris design language and persists progress to
 * localStorage under the `ff:` namespace.
 */

import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatParticipantName } from '@/lib/displayName';

const FallacyFlawApp = React.lazy(
  () => import('@/bootcamps/fallacy-flaw/FallacyFlawApp'),
);

export default function FallacyFlawBootcamp() {
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
    <div className="min-h-screen bg-[#FAF8F3]">
      <header className="sticky top-0 z-40 border-b border-[#D6D0C4] bg-[#FAF8F3]/85 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bootcamps')}
            className="gap-2 text-[#8A8274] hover:text-[#14110C] hover:bg-[#EDE8DD] -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bootcamps
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8274]">
            Flaw &amp; Famous Flaws
          </span>
          <div className="w-[120px]" aria-hidden="true" />
        </div>
      </header>

      <Suspense fallback={<div className="py-24 text-center text-xs uppercase tracking-widest text-[#8A8274]">Loading bootcamp...</div>}>
        <FallacyFlawApp userName={userName} />
      </Suspense>
    </div>
  );
}
