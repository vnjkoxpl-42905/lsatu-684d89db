import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/ui/border-beam';
import { AnimatedButton } from '@/components/ui/animated-button';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS
// Hoisted out of the component so they are never recreated on re-render.
// ─────────────────────────────────────────────────────────────────────────────

// Heavy Glass physics — cubic-bezier(0.16, 1, 0.3, 1): heavy settle, no bounce
const HEAVY: { duration: number; ease: [number, number, number, number] } = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

// ── Style tokens — hoisted so they never allocate new strings on keystroke ──
const inputCls =
  'pl-10 h-11 bg-black/50 border-white/[0.06] focus-visible:border-white/[0.18] focus-visible:ring-1 focus-visible:ring-white/[0.08] text-white placeholder:text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.55)] rounded-lg';
const inputWithToggleCls = cn(inputCls, 'pr-10');
const labelCls =
  'block text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-medium mb-1.5 ml-0.5';

// ── CTA button — wraps AnimatedButton with auth-specific props ──
const CTAButton = ({
  children,
  disabled,
  onClick,
  type = 'submit',
  loading,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
  loading?: boolean;
}) => (
  <AnimatedButton
    type={type}
    disabled={disabled}
    onClick={onClick}
    loading={loading}
    variant="cta"
    size="default"
  >
    {children}
  </AnimatedButton>
);

// ── Glass panel shell ──
// Two-layer structure: outer clips the beam, inner holds glass material + content.
// CRITICAL: must be module-level. If defined inside Auth(), React sees a new
// component type on every keystroke re-render → unmounts all inputs → focus lost.
const GlassShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className="relative rounded-2xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(0,0,0,0.9),0_4px_20px_-4px_rgba(0,0,0,0.55)]">
    {/* Traveling border beam — conic-gradient rotation, full perimeter */}
    <BorderBeam duration={6} color="rgba(255,255,255,0.55)" borderWidth={1.5} arcSize={0.15} />
    {/* Inner glass panel */}
    <div
      className={cn(
        'relative p-8 bg-[#121212]/85 backdrop-blur-xl',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.09)]',
        className
      )}
    >
      {/* Top specular catch-light */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
      {/* Inner ambient glass glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_100%)] pointer-events-none" />
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Auth() {
  const navigate = useNavigate();
  const { user, signUp, signIn, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();

  // ── Modal state — localized so BackgroundPaths never re-renders ──
  const [modalOpen, setModalOpen] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  // ── Form state ──
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // ── skipAutoRedirectRef: set synchronously in handleSubmit so the user-watcher
  // useEffect never fires navigate('/foyer') while we're in the post-login async block.
  const skipAutoRedirectRef = React.useRef(false);

  // ── Recovery state ──
  const [resetEmail, setResetEmail] = React.useState('');
  const [isRecovery, setIsRecovery] = React.useState(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState('');
  const [isInvalidToken, setIsInvalidToken] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [hasRecoverySession, setHasRecoverySession] = React.useState(false);

  // Auto-open modal for recovery links
  React.useEffect(() => {
    if (isRecovery) setModalOpen(true);
  }, [isRecovery]);

  // Escape key + scroll lock
  React.useEffect(() => {
    if (!modalOpen && !forgotOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (forgotOpen) setForgotOpen(false);
        else setModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [modalOpen, forgotOpen]);

  // Redirect authenticated users — suppressed while WelcomeLoading is playing
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const type = url.searchParams.get('type') || hashParams.get('type');
    if (user && !isRecovery && type !== 'recovery' && !skipAutoRedirectRef.current) navigate('/foyer');
  }, [user, navigate, isRecovery]);

  // Detect recovery mode
  React.useEffect(() => {
    const checkRecovery = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const type = url.searchParams.get('type') || hashParams.get('type');
        if (type !== 'recovery') return;

        setIsRecovery(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setRecoveryEmail(session.user.email);
          setHasRecoverySession(true);
          return;
        }
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setIsInvalidToken(true);
          } else if (data.session) {
            setRecoveryEmail(data.session.user.email || '');
            setHasRecoverySession(true);
          } else {
            setIsInvalidToken(true);
          }
        } else {
          setIsInvalidToken(true);
        }
      } catch {
        setIsInvalidToken(true);
      }
    };

    checkRecovery();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        if (session?.user?.email) {
          setRecoveryEmail(session.user.email);
          setHasRecoverySession(true);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Auth handlers ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({ title: 'Passwords do not match', variant: 'destructive' });
          return;
        }
        const { error } = await signUp(email, password, username, '');
        if (error)
          toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
        else toast({ title: 'Account created.' });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Authentication failed', description: error.message, variant: 'destructive' });
        } else {
          // ── Navigate to Foyer with Welcome state ──
          // skipAutoRedirectRef must be set SYNCHRONOUSLY so the auto-redirect
          // useEffect above can't fire navigate('/foyer') while we're mid-async.
          skipAutoRedirectRef.current = true;

          const { data: { user: freshUser } } = await supabase.auth.getUser();
          const name =
            freshUser?.user_metadata?.username ||
            freshUser?.user_metadata?.display_name ||
            email.split('@')[0];

          navigate('/foyer', { state: { showWelcome: true, welcomeName: name } });
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(resetEmail);
    if (!error) {
      setForgotOpen(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');
    setLoading(true);
    if (newPassword.length < 8) {
      setPasswordError('Minimum 8 characters.');
      setLoading(false);
      return;
    }
    if (newPassword !== recoveryConfirmPassword) {
      setPasswordError('Passwords do not match.');
      setLoading(false);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (
        msg.includes('session') ||
        msg.includes('expired') ||
        msg.includes('invalid') ||
        msg.includes('authenticated')
      ) {
        setIsInvalidToken(true);
        toast({ title: 'Session expired', description: 'Request a new reset link.', variant: 'destructive' });
      } else {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }
    toast({ title: 'Password updated.' });
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
    setTimeout(() => navigate('/'), 500);
  };

  const handleResendResetLink = async () => {
    const addr = recoveryEmail || resetEmail;
    if (!addr) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(addr);
    if (!error) {
      setIsInvalidToken(false);
      setIsRecovery(false);
      toast({ title: 'Link sent.' });
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    setIsRecovery(false);
    setIsInvalidToken(false);
    setNewPassword('');
    setRecoveryConfirmPassword('');
    setPasswordError('');
    try {
      window.history.replaceState(null, '', '/auth');
    } catch {}
  };

  return (
    <div className="relative isolate min-h-screen bg-neutral-950 overflow-hidden">

      {/* ── z-0: BackgroundPaths — always mounted, never remounts ── */}
      <div className="absolute inset-0 z-0 pointer-events-none [&_svg]:!text-white">
        <BackgroundPaths />
      </div>

      {/* ── z-1: Radial vignette ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none
          bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_30%,rgba(9,9,11,0.35)_70%,rgba(9,9,11,0.5)_100%)]"
      />

      {/* ── z-10: Hero front door ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 text-center select-none">
        <p className="text-[9px] uppercase tracking-[0.35em] text-neutral-600 mb-10 font-medium">
          Logical Reasoning
        </p>

        <h1 className="text-[4.5rem] sm:text-[6rem] font-bold tracking-[-0.04em] text-white leading-none mb-5">
          LSAT U
        </h1>

        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400 font-medium mb-3">
          MASTER THE LSAT. OWN YOUR FUTURE.
        </p>

        <p className="text-sm text-neutral-500 mb-14 max-w-[260px] leading-relaxed">
          Clearer thinking, higher scores.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModalOpen(true)}
          className="h-12 px-9 bg-white text-[#000000] text-[11px] font-semibold uppercase tracking-[0.18em] rounded-lg
            hover:bg-neutral-100 transition-colors duration-200
            shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_24px_-4px_rgba(255,255,255,0.1)]"
        >
          Start Here
        </motion.button>
      </div>

      {/* ── z-40/50: Auth Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => !isRecovery && setModalOpen(false)}
            />

            {/* Modal panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="LSAT U Access"
                className="pointer-events-auto w-full max-w-[390px] will-change-transform"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                transition={HEAVY}
              >
                <GlassShell>
                  {/* Close */}
                  {!isRecovery && (
                    <button
                      onClick={() => setModalOpen(false)}
                      className="absolute top-4 right-4 z-10 text-neutral-600 hover:text-white transition-colors duration-200"
                      aria-label="Close"
                    >
                      <X className="w-[14px] h-[14px]" />
                    </button>
                  )}

                  {/* Header */}
                  <div className="text-center mb-7">
                    <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                      {isRecovery ? (isInvalidToken ? 'Link Expired' : 'New Password') : 'LSAT U'}
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {isRecovery
                        ? isInvalidToken
                          ? 'Request a new reset link.'
                          : 'Set a strong password for your account.'
                        : isSignUp
                        ? 'Create your account.'
                        : 'Sign in to continue.'}
                    </p>
                  </div>

                  {/* ── RECOVERY FLOW ── */}
                  {isRecovery ? (
                    isInvalidToken ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] p-4">
                          <p className="text-[11px] text-rose-400">
                            This reset link is invalid or has expired.
                          </p>
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          {/* group enables CSS focus-within icon colouring — no state needed */}
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
                          <CTAButton disabled={loading} loading={loading} onClick={handleResendResetLink} type="button">
                            <span className="flex items-center gap-2">
                              Resend Link <ArrowRight className="w-4 h-4" />
                            </span>
                          </CTAButton>
                          <button
                            onClick={handleBackToLogin}
                            type="button"
                            className="w-full text-[11px] text-neutral-600 hover:text-white transition-colors py-2"
                          >
                            Back to login
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                        {!hasRecoverySession && (
                          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                            <p className="text-[11px] text-neutral-500">Verifying reset link...</p>
                          </div>
                        )}
                        <div>
                          <label className={labelCls}>New Password</label>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                            <Input
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="••••••••••••"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPasswordError('');
                              }}
                              required
                              minLength={8}
                              className={inputWithToggleCls}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                              aria-label="Toggle"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Confirm Password</label>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••••••"
                              value={recoveryConfirmPassword}
                              onChange={(e) => {
                                setRecoveryConfirmPassword(e.target.value);
                                setPasswordError('');
                              }}
                              required
                              minLength={8}
                              className={inputWithToggleCls}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                              aria-label="Toggle"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {passwordError && (
                          <p className="text-[11px] text-rose-400">{passwordError}</p>
                        )}
                        <div className="space-y-2 pt-1">
                          <CTAButton disabled={loading || !hasRecoverySession} loading={loading}>
                            <span className="flex items-center gap-2">
                              Save Password <ArrowRight className="w-4 h-4" />
                            </span>
                          </CTAButton>
                          <button
                            onClick={handleBackToLogin}
                            type="button"
                            className="w-full text-[11px] text-neutral-600 hover:text-white transition-colors py-2"
                          >
                            Back to login
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    /* ── MAIN AUTH FLOW ── */
                    <>
                      {/* Segmented control */}
                      <div className="flex p-[3px] mb-6 bg-black/50 border border-white/[0.05] rounded-[10px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] relative">
                        {(['Sign In', 'Sign Up'] as const).map((tab, i) => {
                          const selected = (i === 1) === isSignUp;
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setIsSignUp(i === 1)}
                              className={cn(
                                'relative w-full py-[7px] text-[12px] font-medium transition-colors z-10 rounded-[7px]',
                                selected ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                              )}
                            >
                              {selected && (
                                <motion.div
                                  layoutId="seg"
                                  className="absolute inset-0 bg-white/[0.08] rounded-[7px] shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(255,255,255,0.06)]"
                                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                              )}
                              <span className="relative">{tab}</span>
                            </button>
                          );
                        })}
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username — sign up only */}
                        <AnimatePresence>
                          {isSignUp && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <label className={labelCls}>Username</label>
                              <Input
                                type="text"
                                required
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                minLength={3}
                                maxLength={30}
                                className={inputCls}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Email */}
                        <div>
                          <label className={labelCls}>Email</label>
                          {/* group + group-focus-within replaces focused state — zero re-renders */}
                          <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                            <Input
                              type="email"
                              required
                              placeholder="name@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div>
                          <div className="flex justify-between items-end mb-1.5">
                            <label className={labelCls} style={{ marginBottom: 0 }}>
                              Password
                            </label>
                            {!isSignUp && (
                              <button
                                type="button"
                                onClick={() => setForgotOpen(true)}
                                className="text-[10px] text-neutral-600 hover:text-white transition-colors duration-200"
                              >
                                Forgot?
                              </button>
                            )}
                          </div>
                          <div className="relative group mt-1.5">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              required
                              placeholder="••••••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              minLength={isSignUp ? 6 : undefined}
                              className={inputWithToggleCls}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                              aria-label="Toggle password visibility"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirm password — sign up only */}
                        <AnimatePresence>
                          {isSignUp && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <label className={labelCls}>Confirm Password</label>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  required
                                  placeholder="••••••••••••"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  className={inputWithToggleCls}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* CTA */}
                        <div className="pt-1">
                          <CTAButton disabled={loading} loading={loading}>
                            <span className="flex items-center gap-2">
                              {isSignUp ? 'Create Account' : 'Sign In'}{' '}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </CTAButton>
                        </div>
                      </form>
                    </>
                  )}
                </GlassShell>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* WelcomeLoading now lives in AcademyFoyer.tsx, mounted over the ghost hub */}

      {/* ── Forgot password sub-modal ── */}
      <AnimatePresence>
        {forgotOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setForgotOpen(false)}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                className="pointer-events-auto w-full max-w-[340px]"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={HEAVY}
              >
                <GlassShell className="p-6">
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="absolute top-4 right-4 z-10 text-neutral-600 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-[14px] h-[14px]" />
                  </button>
                  <h3 className="text-[14px] font-semibold text-white mb-1">Reset Password</h3>
                  <p className="text-[11px] text-neutral-500 mb-5">
                    Enter your email to receive a reset link.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className={labelCls}>Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <CTAButton disabled={loading} loading={loading}>
                      <span className="flex items-center gap-2">
                        Send Link <ArrowRight className="w-4 h-4" />
                      </span>
                    </CTAButton>
                  </form>
                </GlassShell>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
