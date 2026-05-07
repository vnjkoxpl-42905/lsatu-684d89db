/**
 * /bootcamp/fallacy-flaw — Flaw & Famous Flaws bootcamp host page.
 *
 * Wraps the ported standalone sub-app in the standard LSAT U chrome:
 * auth gate + Return-to-Bootcamps header. The bootcamp uses a warm
 * paper/ink/verdigris design language and persists progress to
 * localStorage under the `ff:` namespace.
 *
 * Admins get an additional "Preview as student" toggle that renders the
 * bootcamp with a fully isolated localStorage namespace (`ff:preview-v1`),
 * showing exactly what a new, unassigned student would see — zero progress,
 * no completed days — without touching the admin's own saved state.
 */

import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { formatParticipantName } from '@/lib/displayName';

const FallacyFlawApp = React.lazy(
  () => import('@/bootcamps/fallacy-flaw/FallacyFlawApp'),
);

export default function FallacyFlawBootcamp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { is_admin } = useUserPermissions();
  const [previewMode, setPreviewMode] = useState(false);

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
          {is_admin ? (
            <Button
              variant={previewMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode((v) => !v)}
              className={
                previewMode
                  ? 'gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 border-amber-600'
                  : 'gap-1.5 text-xs text-[#8A8274] border-[#D6D0C4] hover:bg-[#EDE8DD] hover:text-[#14110C]'
              }
            >
              {previewMode ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Exit Preview
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Preview as Student
                </>
              )}
            </Button>
          ) : (
            <div className="w-[140px]" aria-hidden="true" />
          )}
        </div>
      </header>

      {previewMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs text-amber-700 font-medium">
            Student preview — showing a fresh start with zero progress. Your own progress is untouched.
          </p>
        </div>
      )}

      <Suspense fallback={<div className="py-24 text-center text-xs uppercase tracking-widest text-[#8A8274]">Loading bootcamp...</div>}>
        <FallacyFlawApp userName={userName} previewMode={previewMode} />
      </Suspense>
    </div>
  );
}
