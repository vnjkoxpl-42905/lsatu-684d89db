import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { AnimatedButton } from '@/components/ui/animated-button';

import { BorderBeam } from '@/components/ui/border-beam';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { toast } from 'sonner';

const GlassShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(0,0,0,0.9),0_4px_20px_-4px_rgba(0,0,0,0.55)]">
    <BorderBeam duration={6} color="rgba(255,255,255,0.55)" borderWidth={1.5} arcSize={0.15} />
    <div className={cn(
      'relative p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8 bg-[#121212]/85 backdrop-blur-xl',
      'shadow-[0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.09)]'
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_100%)] pointer-events-none" />
      {children}
    </div>
  </div>
);

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, authReady, signOut } = useAuth();
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      navigate('/auth', { replace: true });
    }
  };

  // Pre-fill from metadata if available (e.g. Google name)
  React.useEffect(() => {
    if (user) {
      const meta = user.user_metadata;
      const prefill = meta?.display_name || meta?.full_name || meta?.name || '';
      if (prefill) setName(prefill);
    }
  }, [user]);

  // If not logged in, redirect to auth
  React.useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [authReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter your name');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('Name must be 50 characters or less');
      return;
    }

    setSaving(true);
    try {
      const classId = user!.id;

      // Save profile FIRST — this is the gate the Mainhub checks. If it fails,
      // we must not navigate (or the user gets bounced back here forever).
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { class_id: classId, display_name: trimmed },
          { onConflict: 'class_id' },
        );

      if (profileError) {
        console.error('[Onboarding] profile upsert failed', profileError);
        toast.error(profileError.message || 'Could not save your name. Please try again.');
        return;
      }

      // Best-effort: mirror to auth metadata. Non-blocking — failure here
      // must NOT prevent navigation since the profile row is the source of truth.
      supabase.auth.updateUser({ data: { display_name: trimmed } }).catch((e) => {
        console.warn('[Onboarding] auth metadata update failed (non-fatal)', e);
      });

      navigate('/mainhub', { replace: true });
    } catch (err: any) {
      console.error('[Onboarding] unexpected error', err);
      toast.error(err?.message || 'Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  if (!authReady) return null;

  return (
    <div className="relative isolate min-h-screen bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_30%,rgba(9,9,11,0.35)_70%,rgba(9,9,11,0.5)_100%)]" />

      <div className="relative z-10 min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          className="w-full sm:max-w-[390px]"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassShell>
            <div className="text-center mb-7">
              <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                Welcome to LSAT U
              </h2>
              <p className="text-[11px] text-neutral-500">
                What should we call you?
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="onboarding-name" className="block text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-medium mb-1.5 ml-0.5">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                  <Input
                    id="onboarding-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-10 h-12 sm:h-11 bg-black/50 border-white/[0.06] focus-visible:border-white/[0.18] focus-visible:ring-1 focus-visible:ring-white/[0.08] text-white text-base sm:text-sm placeholder:text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.55)] rounded-lg"
                    maxLength={50}
                    autoFocus
                  />
                </div>
              </div>

              <AnimatedButton
                type="submit"
                disabled={saving || !name.trim()}
                loading={saving}
                variant="cta"
                size="default"
              >
                Continue
              </AnimatedButton>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut || saving}
                className="w-full text-[11px] text-neutral-600 hover:text-white transition-colors py-2 disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </form>
          </GlassShell>
        </motion.div>
      </div>
    </div>
  );
}
