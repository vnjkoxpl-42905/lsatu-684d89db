/**
 * /bootcamp/rc-engaging-with-the-passage — RC bootcamp host page.
 *
 * Wraps the lesson (src/bootcamps/rc-bootcamp/RcBootcampPage.tsx) in the
 * standard LSAT U chrome: auth gate + Return-to-Bootcamps header. The return
 * bar does not stick, so the lesson's own sticky chapter header keeps the top
 * of the viewport once the student starts reading.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const RcBootcampPage = React.lazy(() => import('@/bootcamps/rc-bootcamp/RcBootcampPage'));

const RcEngagingPassageBootcamp: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="rc-bootcamp-host min-h-screen">
      <header className="border-b border-black/10 bg-[hsl(38_36%_93%)]">
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
            Reading Comprehension
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
        <RcBootcampPage />
      </React.Suspense>
    </div>
  );
};

export default RcEngagingPassageBootcamp;
