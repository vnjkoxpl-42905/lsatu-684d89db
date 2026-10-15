/**
 * /bootcamp/intro-to-lr — Intro to LR bootcamp.
 *
 * Renamed from "Main Conclusion / Argument Structure" → "Intro to LR" so old
 * cached builds and stale bookmarks can no longer collide with the new
 * bootcamp UI. The previous /bootcamp/structure path now redirects here.
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

export default function IntroToLrBootcamp() {
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
