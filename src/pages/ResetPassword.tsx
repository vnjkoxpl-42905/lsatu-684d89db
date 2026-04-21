import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedButton } from '@/components/ui/animated-button';
import { cn } from '@/lib/utils';

const inputCls =
  'pl-10 h-12 sm:h-11 bg-black/50 border-white/[0.06] focus-visible:border-white/[0.18] focus-visible:ring-1 focus-visible:ring-white/[0.08] text-white text-base sm:text-sm placeholder:text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.55)] rounded-lg';
const inputWithToggleCls = cn(inputCls, 'pr-10');
const labelCls =
  'block text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-medium mb-1.5 ml-0.5';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, resetPassword } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [hasSession, setHasSession] = React.useState(false);
  const [isInvalid, setIsInvalid] = React.useState(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState('');
  const [resetEmail, setResetEmail] = React.useState('');
  const [checking, setChecking] = React.useState(true);

  // Check for a valid recovery session on mount
  React.useEffect(() => {
    let cancelled = false;
    let settled = false;

    const markValid = (email: string) => {
      if (cancelled || settled) return;
      settled = true;
      setRecoveryEmail(email);
      setHasSession(true);
      setIsInvalid(false);
      setChecking(false);
    };

    const markInvalid = () => {
      if (cancelled || settled) return;
      settled = true;
      setIsInvalid(true);
      setChecking(false);
    };

    // Listen for PASSWORD_RECOVERY / SIGNED_IN events from supabase's
    // built-in detectSessionInUrl handler. This fires when supabase
    // automatically processes ?code= (PKCE) or #access_token= links.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
        markValid(session.user.email);
      }
    });

    const init = async () => {
      try {
        // 1) Already have a session? (most common path — supabase's
        // detectSessionInUrl ran before we mounted)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          markValid(session.user.email);
          return;
        }

        const url = new URL(window.location.href);

        // 2) PKCE flow: ?code=... in the query string
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session?.user?.email) {
            // Clean the code out of the URL so a refresh / re-mount can't reuse it
            url.searchParams.delete('code');
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            markValid(data.session.user.email);
            return;
          }
          markInvalid();
          return;
        }

        // 3) Implicit flow: #access_token=...&refresh_token=...
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorCode = hashParams.get('error_code') || url.searchParams.get('error_code');

        if (errorCode) {
          markInvalid();
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session?.user?.email) {
            window.history.replaceState(null, '', url.pathname + url.search);
            markValid(data.session.user.email);
            return;
          }
          markInvalid();
          return;
        }

        // 4) No tokens in URL, no existing session — wait briefly for the
        // auth listener (detectSessionInUrl can be async), then give up.
        setTimeout(() => {
          if (!settled) markInvalid();
        }, 1500);
      } catch {
        markInvalid();
      }
    };

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);

    if (newPassword.length < 8) {
      setPasswordError('Minimum 8 characters.');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('session') || msg.includes('expired') || msg.includes('invalid') || msg.includes('authenticated')) {
        setIsInvalid(true);
        toast({ title: 'Session expired', description: 'Request a new reset link.', variant: 'destructive' });
      } else {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }

    toast({ title: 'Password updated.' });
    try { window.history.replaceState(null, '', '/'); } catch {}
    setTimeout(() => navigate('/foyer'), 500);
  };

  const handleResend = async () => {
    const addr = recoveryEmail || resetEmail;
    if (!addr) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(addr);
    if (!error) {
      toast({ title: 'Reset link sent! Check your inbox.' });
    }
    setLoading(false);
  };

  return (
    <div className="relative isolate min-h-screen bg-neutral-950 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none [&_svg]:!text-white">
        <BackgroundPaths />
      </div>
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_30%,rgba(9,9,11,0.35)_70%,rgba(9,9,11,0.5)_100%)]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[390px]">
          <div className="relative rounded-2xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(0,0,0,0.9),0_4px_20px_-4px_rgba(0,0,0,0.55)]">
            <BorderBeam duration={6} color="rgba(255,255,255,0.55)" borderWidth={1.5} arcSize={0.15} />
            <div className="relative p-6 sm:p-8 bg-[#121212]/85 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.09)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

              <div className="text-center mb-7">
                <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                  {isInvalid ? 'Link Expired' : 'New Password'}
                </h2>
                <p className="text-[11px] text-neutral-500">
                  {isInvalid ? 'Request a new reset link.' : 'Set a strong password for your account.'}
                </p>
              </div>

              {checking ? (
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                  <p className="text-[11px] text-neutral-500">Verifying reset link…</p>
                </div>
              ) : isInvalid ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] p-4">
                    <p className="text-[11px] text-rose-400">This reset link is invalid or has expired.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        value={recoveryEmail || resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <AnimatedButton disabled={loading} loading={loading} onClick={handleResend} type="button" variant="cta" size="default">
                      <span className="flex items-center gap-2">Resend Link <ArrowRight className="w-4 h-4" /></span>
                    </AnimatedButton>
                    <button onClick={() => navigate('/auth')} type="button" className="w-full text-[11px] text-neutral-600 hover:text-white transition-colors py-2">
                      Back to login
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={labelCls}>New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                      <Input
                        type={showNew ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        required
                        minLength={8}
                        className={inputWithToggleCls}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors" aria-label="Toggle">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                        required
                        minLength={8}
                        className={inputWithToggleCls}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors" aria-label="Toggle">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {passwordError && <p className="text-[11px] text-rose-400">{passwordError}</p>}
                  <div className="space-y-2 pt-1">
                    <AnimatedButton disabled={loading || !hasSession} loading={loading} type="submit" variant="cta" size="default">
                      <span className="flex items-center gap-2">Save Password <ArrowRight className="w-4 h-4" /></span>
                    </AnimatedButton>
                    <button onClick={() => navigate('/auth')} type="button" className="w-full text-[11px] text-neutral-600 hover:text-white transition-colors py-2">
                      Back to login
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
