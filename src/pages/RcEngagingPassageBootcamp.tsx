/**
 * /bootcamp/rc-engaging-with-the-passage — RC bootcamp host page.
 *
 * Wraps the lesson (src/bootcamps/rc-bootcamp/RcBootcampPage.tsx) in the auth
 * gate. There is deliberately no host header: the lesson's own sticky bar owns
 * the top of the viewport and carries the Exit control, so a student can leave
 * at any scroll depth without a second back button stacked above it.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { safeLazy } from '@/lib/safeLazy';

// Stale-chunk safe: after a deploy the cached app shell can resolve this
// dynamic import to a module without a default export, which React then reads
// as `undefined.default` and blanks the screen. safeLazy forces a one-time
// hard reload instead of letting the TypeError escape.
const RcBootcampPage = safeLazy(() => import('@/bootcamps/rc-bootcamp/RcBootcampPage'));

const RcEngagingPassageBootcamp: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="rc-bootcamp-host min-h-screen">
      <React.Suspense
        fallback={
          <div className="py-24 text-center text-xs uppercase tracking-widest text-[#1a1a1a]/40">
            Loading bootcamp…
          </div>
        }
      >
        <RcBootcampPage />
      </React.Suspense>
    </div>
  );
};

export default RcEngagingPassageBootcamp;
