import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const HelpSheet = lazy(() => import('./HelpSheet'));

// Routes where the floating Help button shouldn't appear.
// /foyer = marketing/landing; /auth/* = sign in flow; admin surfaces
// don't need student help (Joshua talks to himself there).
const HIDDEN_PREFIXES = ['/foyer', '/auth', '/onboarding', '/reset-password', '/admin', '/teacher'];

export function FloatingHelpButton() {
  const { user } = useAuth();
  const { is_admin, loading } = useUserPermissions();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (!user || loading || is_admin) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Get help from Joshua"
        title="Get help from Joshua"
        data-help-overlay
        className="fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 shadow-lg text-zinc-100 hover:bg-zinc-700 transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <HelpSheet open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
