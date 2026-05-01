/**
 * /bootcamp/structure-v2 — Main Conclusion bootcamp (preview).
 *
 * Bridge wrapper for the in-progress Claude-built bootcamp. Lives at the
 * temporary `/bootcamp/structure-v2` slot so it can be developed and previewed
 * alongside the existing `/bootcamp/structure` (Structure.tsx) without
 * breaking it. Promotion is a one-line route swap in App.tsx.
 *
 * Scope:
 *   - Auth gate via useAuth() — redirects to /auth if not signed in.
 *   - Renders inside the .mc-bootcamp className so all bootcamp styles stay
 *     scoped (see src/bootcamps/main-conclusion/styles/scoped.css).
 *   - Mounts the bootcamp's nested <Routes> for module navigation
 *     (lessons, drills, simulator, hard-sentences, diagnostics, etc.).
 *   - Shares LSAT U's QueryClient and AuthProvider; nothing here re-creates them.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BootcampRoutes } from '@/bootcamps/main-conclusion/routes';

export default function MainConclusionBootcamp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="mc-bootcamp min-h-screen">
      <BootcampRoutes />
    </div>
  );
}
