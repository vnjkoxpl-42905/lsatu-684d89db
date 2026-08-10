import { Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { safeLazy } from '@/lib/safeLazy';
import {
  setHelpSheetOpen,
  useBottomRightSurfaceOpen,
} from '@/components/inbox/messengerOpenBus';

const HelpSheet = safeLazy(() => import('./HelpSheet'));

// Routes where the floating Help button shouldn't appear.
// /foyer = marketing/landing; /auth/* = sign in flow; admin surfaces
// don't need student help (Joshua talks to himself there). /drill = the
// question runner, which carries its own Help control in the header strip
// beside Pause — floating it here parked a bubble over the question card.
const HIDDEN_PREFIXES = ['/foyer', '/drill', '/classroom/drill', '/auth', '/onboarding', '/reset-password', '/admin', '/teacher', '/inbox'];

export function FloatingHelpButton() {
  const { user } = useAuth();
  const { is_admin, loading } = useUserPermissions();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const anySurfaceOpen = useBottomRightSurfaceOpen();

  // Publish the Help sheet's open state so the messenger + Help launchers stay
  // in lockstep — any open bottom-right surface hides every launcher.
  useEffect(() => {
    setHelpSheetOpen(open);
    return () => setHelpSheetOpen(false);
  }, [open]);

  if (!user || loading || is_admin) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  // De-conflicted anchor: the messenger launcher owns bottom-6 right-6; the
  // Help launcher stacks just above it at bottom-24 right-6 so the two never
  // overlap. Hidden entirely whenever any bottom-right surface is open.
  return (
    <>
      {!anySurfaceOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Get help from Joshua"
          title="Get help from Joshua"
          data-help-overlay
          className="fixed bottom-24 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 shadow-lg text-zinc-100 hover:bg-zinc-700 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
      {open && (
        <Suspense fallback={null}>
          <HelpSheet open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
