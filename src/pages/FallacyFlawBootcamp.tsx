/**
 * /bootcamp/fallacy-flaw — Flaw & Famous Flaws bootcamp host page.
 *
 * Wraps the ported standalone "Fallacy Bootcamp" sub-app
 * (src/bootcamps/fallacy-flaw-v2/FallacyApp.tsx) in the standard LSAT U
 * chrome: auth gate + Return-to-Bootcamps header.
 */

import * as React from 'react';
import { safeLazy } from '@/lib/safeLazy';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const FallacyApp = safeLazy(
  () => import('@/bootcamps/fallacy-flaw-v2/FallacyApp'),
);

const FallacyFlawBootcamp: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f5f2ed]/85 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bootcamps')}
            className="gap-2 text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bootcamps
          </Button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]/60">
            Flaw &amp; Famous Flaws
          </span>
          <div className="w-[120px]" aria-hidden="true" />
        </div>
      </header>

      <React.Suspense
        fallback={
          <div className="py-24 text-center text-xs uppercase tracking-widest text-[#1a1a1a]/40">
            Loading bootcamp…
          </div>
        }
      >
        <FallacyApp />
      </React.Suspense>
    </div>
  );
};

export default FallacyFlawBootcamp;
