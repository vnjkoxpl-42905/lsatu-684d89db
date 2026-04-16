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
  'pl-10 h-12 sm:h-11 bg-black/50 border-white/[0.06] focus-visible:border-white/[0.18] focus-visible:ring-1 focus-visible:ring-white/[0.08] text-white text-base sm:text-sm placeholder:text-neutral-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.55)] rounded-lg';
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
  <div className="relative rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(0,0,0,0.9),0_4px_20px_-4px_rgba(0,0,0,0.55)]">
    {/* Traveling border beam — conic-gradient rotation, full perimeter */}
    <BorderBeam duration={6} color="rgba(255,255,255,0.55)" borderWidth={1.5} arcSize={0.15} />
    {/* Inner glass panel */}
    <div
      className={cn(
        'relative p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8 bg-[#121212]/85 backdrop-blur-xl',
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
  const { user, signUp, signIn, resetPassword } = useAuth();
  const { toast } = useToast();

  // ── Modal state — localized so BackgroundPaths never re-renders ──
  const [modalOpen, setModalOpen] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  // ── Form state ──
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(() => !!localStorage.getItem('lsatu_saved_email'));

  // Load saved email on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('lsatu_saved_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // ── skipAutoRedirectRef: set synchronously in handleSubmit so the user-watcher
  // useEffect never fires navigate('/foyer') while we're in the post-login async block.
  const skipAutoRedirectRef = React.useRef(false);

  // ── Forgot password state ──
  const [resetEmail, setResetEmail] = React.useState('');

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

  // Redirect authenticated users — check if they have a username first
  React.useEffect(() => {
    if (!user || skipAutoRedirectRef.current) return;

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', user.id)
        .maybeSingle();

      if (profile?.display_name) {
        navigate('/foyer');
      } else {
        navigate('/onboarding');
      }
    };
    checkProfile();
  }, [user, navigate]);

  // Debug: log auth page mount state for OAuth diagnosis
  React.useEffect(() => {
    console.log('[Auth mount]', {
      url: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      oauth_pending: sessionStorage.getItem('oauth_pending'),
      user: !!user,
    });
  }, []);

  // ── Auth handlers ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({ title: 'Passwords do not match', variant: 'destructive' });
          return;
        }
        const { error } = await signUp(trimmedEmail, password, name);
        if (error)
          toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
        else {
          setShowConfirmation(true);
        }
      } else {
        const { error } = await signIn(trimmedEmail, password);
        if (error) {
          const isInvalidCreds = error.message?.toLowerCase().includes('invalid login credentials');
          toast({
            title: 'Sign-in failed',
            description: isInvalidCreds
              ? 'Email or password is incorrect. Check for extra spaces or uppercase/lowercase differences. Your username is NOT part of sign-in — only email and password.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          // Save or clear email based on "Remember me"
          if (rememberMe) {
            localStorage.setItem('lsatu_saved_email', trimmedEmail);
          } else {
            localStorage.removeItem('lsatu_saved_email');
          }
          skipAutoRedirectRef.current = true;

          const { data: { user: freshUser } } = await supabase.auth.getUser();
          
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('class_id', freshUser!.id)
            .maybeSingle();

          if (profile?.display_name) {
            const displayName = profile.display_name;
            navigate('/foyer', { state: { showWelcome: true, welcomeName: displayName } });
          } else {
            navigate('/onboarding');
          }
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      sessionStorage.setItem('oauth_pending', '1');
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        sessionStorage.removeItem('oauth_pending');
        toast({ title: 'Google sign-in failed', description: String(result.error), variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch (err: any) {
      sessionStorage.removeItem('oauth_pending');
      toast({ title: 'Google sign-in failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(resetEmail.trim().toLowerCase());
    if (!error) {
      setForgotOpen(false); setModalOpen(true);
      setResetEmail('');
    }
    setLoading(false);
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <p className="text-[9px] uppercase tracking-[0.35em] text-neutral-600 mb-6 sm:mb-10 font-medium">
          Logical Reasoning
        </p>

        <h1 className="text-[3.5rem] sm:text-[6rem] font-bold tracking-[-0.04em] text-white leading-none mb-4 sm:mb-5">
          LSAT U
        </h1>

        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-neutral-400 font-medium mb-2 sm:mb-3">
          MASTER THE LSAT. OWN YOUR FUTURE.
        </p>

        <p className="text-[13px] sm:text-sm text-neutral-500 mb-10 sm:mb-14 max-w-[260px] leading-relaxed">
          Clearer thinking, higher scores.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalOpen(true)}
          className="h-12 sm:h-12 px-9 min-w-[180px] bg-white text-[#000000] text-[11px] font-semibold uppercase tracking-[0.18em] rounded-lg
            hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-200
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
              onClick={() => setModalOpen(false)}
            />

            {/* Modal panel */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="LSAT U Access"
                className="pointer-events-auto w-full sm:max-w-[390px] max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto will-change-transform rounded-t-2xl sm:rounded-2xl"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={HEAVY}
              >
                <GlassShell>
                  {/* Close */}
                  <button
                    onClick={() => setModalOpen(false)}
                    className="absolute top-4 right-4 z-10 p-2 -m-2 text-neutral-600 hover:text-white transition-colors duration-200"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 sm:w-[14px] sm:h-[14px]" />
                  </button>

                  {/* Header */}
                  <div className="text-center mb-7">
                    <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                      LSAT U
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {isSignUp ? 'Create your account.' : 'Sign in to continue.'}
                    </p>
                  </div>

                  {/* ── MAIN AUTH FLOW ── */}
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

                      {showConfirmation ? (
                        <div className="text-center space-y-4 py-4">
                          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                            <Mail className="w-6 h-6 text-emerald-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-white">Check your email</h3>
                          <p className="text-[13px] text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
                            We sent a confirmation link to <span className="text-white font-medium">{email}</span>. Click the link to activate your account.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfirmation(false);
                              setIsSignUp(false);
                              setEmail('');
                              setPassword('');
                              setConfirmPassword('');
                              setName('');
                            }}
                            className="text-[11px] text-neutral-500 hover:text-white transition-colors pt-2"
                          >
                            Back to sign in
                          </button>
                        </div>
                      ) : (
                      <>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name — sign up only */}
                        <AnimatePresence>
                          {isSignUp && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <label className={labelCls}>Name</label>
                              <Input
                                type="text"
                                required
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={50}
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
                                onClick={() => { setModalOpen(false); setForgotOpen(true); }}
                                className="text-[11px] text-neutral-300 hover:text-white transition-colors duration-200 font-medium"
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

                        {/* Remember me — sign in only */}
                        {!isSignUp && (
                          <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => {
                                setRememberMe(e.target.checked);
                                if (!e.target.checked) localStorage.removeItem('lsatu_saved_email');
                              }}
                              className="w-4 h-4 rounded border-white/10 bg-black/50 text-white accent-white focus:ring-white/20 cursor-pointer"
                            />
                            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300 transition-colors">
                              Remember my email
                            </span>
                          </label>
                        )}

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

                      {/* Divider */}
                      <div className="flex items-center gap-3 pt-4">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-600 font-medium">or</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      {/* Google Sign In */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full h-12 sm:h-11 mt-3 flex items-center justify-center gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] active:bg-white/[0.1] text-[13px] sm:text-[12px] font-medium text-neutral-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                      </motion.button>
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
              onClick={() => { setForgotOpen(false); setModalOpen(true); }}
            />
            <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <motion.div
                className="pointer-events-auto w-full sm:max-w-[340px] rounded-t-2xl sm:rounded-2xl"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={HEAVY}
              >
                <GlassShell className="p-5 sm:p-6">
                  <button
                    onClick={() => { setForgotOpen(false); setModalOpen(true); }}
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
