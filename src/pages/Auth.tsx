import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { clearStashedReturnTo, readReturnToFromUrl, redirectAfterAuth, stashReturnTo } from '@/lib/authRedirect';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedButton } from '@/components/ui/animated-button';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  ACADEMY_CSS,
  ACA,
  useReveal,
  AcaAmbience,
  AcaNav,
  AcaHero,
  AcaStele,
  AcaBust,
  AcaCanon,
  AcaDisciplines,
  AcaJustice,
  AcaMarquee,
  AcaCredo,
  AcaFinal,
  AcaFooter,
} from '@/components/auth-landing/academy';
import {
  FX_CSS,
  AcaPreloader,
  AcaPlumb,
  GoldSeam,
  type PlumbStop,
} from '@/components/auth-landing/fx';

// Plumb-line stops: one per major landing chapter, in page order.
const PLUMB_STOPS: PlumbStop[] = [
  { id: 'aca-top', label: 'Top', numeral: 'I' },
  { id: 'aca-moves', label: 'The twelve moves', numeral: 'II' },
  { id: 'aca-method', label: 'The method', numeral: 'III' },
  { id: 'aca-canon', label: 'The canon', numeral: 'IV' },
  { id: 'aca-disciplines', label: 'The disciplines', numeral: 'V' },
  { id: 'aca-justice-s', label: 'Judgment', numeral: 'VI' },
  { id: 'aca-begin', label: 'Begin', numeral: 'VII' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE — "The Academy"
// A museum nocturne: generated marble film, an inscribed stele of the twelve
// LR moves, a three.js particle bust that assembles on scroll, and bronze
// engraved plates for the four product disciplines. Wrapped around the exact
// same auth machinery as before: Supabase email/password, Lovable Google
// OAuth, reset, confirmation, session-expired handling. The drawer is the
// door the page walks you toward.
// ─────────────────────────────────────────────────────────────────────────────

// ── Style tokens — hoisted so they never allocate new strings on keystroke ──
const inputCls =
  'pl-10 h-12 sm:h-11 bg-black/50 border-[color:var(--auth-line-2)] focus-visible:border-[color:var(--auth-line-focus)] focus-visible:ring-1 focus-visible:ring-[color:var(--auth-ring-soft)] text-[#EAE5DA] text-base sm:text-sm placeholder:text-[#6E695E] shadow-[inset_0_2px_4px_rgba(0,0,0,0.55)] rounded-[3px]';
const inputWithToggleCls = cn(inputCls, 'pr-10');
const labelCls =
  'block text-[10px] uppercase tracking-[0.22em] text-[#8A8475] font-medium mb-1.5 ml-0.5 font-mono';

// ── Shared focus ring for drawer controls ──
const focusRingCls =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--auth-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--auth-surface)]';

// ── Drawer palette + drawer-scoped effects. Global (:root) so it reaches the
// Vaul portal; namespaced so it can't collide. Marble-and-bronze-on-obsidian
// values matching the Academy landing.
const DRAWER_CSS = `
  :root {
    --auth-surface: #0A0908;
    --auth-line-1: rgb(234 229 218 / 0.05);
    --auth-line-2: rgb(234 229 218 / 0.09);
    --auth-line-3: rgb(234 229 218 / 0.13);
    --auth-line-focus: rgb(138 216 226 / 0.5);
    --auth-catchlight: rgb(232 207 150 / 0.5);
    --auth-fill-1: rgb(234 229 218 / 0.04);
    --auth-fill-hover: rgb(234 229 218 / 0.07);
    --auth-fill-active: rgb(234 229 218 / 0.10);
    --auth-indicator: rgb(198 164 103 / 0.16);
    --auth-ring: rgb(138 216 226 / 0.55);
    --auth-ring-soft: rgb(138 216 226 / 0.2);
    --auth-success: #C6A467;
    --auth-success-bg: rgb(198 164 103 / 0.10);
    --auth-success-line: rgb(198 164 103 / 0.30);
  }
  /* Caustic light — a slow gilded gleam traveling the drawer's top edge. */
  .aca-caustic { position: absolute; top: 0; left: 0; right: 0; height: 1px; overflow: hidden; pointer-events: none; }
  .aca-caustic::after { content: ''; position: absolute; top: 0; width: 45%; height: 100%; background: linear-gradient(90deg, transparent, var(--auth-catchlight), transparent); animation: acaCaustic 5.5s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
  @keyframes acaCaustic { 0% { left: -45%; } 50% { left: 100%; } 100% { left: -45%; } }
  /* Bronze bloom behind the drawer's content — clipped by its own wrapper so
     the DrawerContent itself never needs overflow:hidden (which would let
     focus-scroll displace the sheet's inner layout). */
  .aca-drawer-clip { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: inherit; }
  .aca-drawer-bloom { position: absolute; left: 50%; top: -140px; width: 480px; height: 300px; transform: translateX(-50%); background: radial-gradient(50% 50% at 50% 50%, rgb(198 164 103 / 0.13), rgb(138 216 226 / 0.05) 55%, transparent 72%); filter: blur(10px); }
  @media (prefers-reduced-motion: reduce) {
    .aca-caustic::after { animation: none; left: 27.5%; }
  }
`;

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

// ── Inline drawer alert — auth failures must be visible where the user is
// looking, not only in a corner toast. role="alert" announces to AT.
const FormAlert = ({ error }: { error: { title: string; description?: string } | null }) => (
  <AnimatePresence>
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -6, height: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div
          role="alert"
          className="mb-4 rounded-[3px] border border-[#E86A5A]/25 bg-[#E86A5A]/[0.08] px-3.5 py-3"
        >
          <p className="text-[12px] font-medium text-[#F1A093]">{error.title}</p>
          {error.description && (
            <p className="mt-1 text-[11px] leading-relaxed text-[#C9A29A]">{error.description}</p>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// How long an oauth_pending flag is allowed to live before it counts as
// stuck. If the user navigated away mid-OAuth and never came back, the
// flag would otherwise blank /auth on every future visit.
const OAUTH_PENDING_MAX_AGE_MS = 60_000;

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady, signUp, signIn, resetPassword } = useAuth();
  const { toast } = useToast();

  // ── Drawer state — opens via landing CTAs (nav, hero, credo, final).
  // Default closed so visitors can read the landing page; a session-expired
  // or OAuth bounce explicitly forces it open below.
  const [modalOpen, setModalOpen] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  // Inline error surfaced inside the drawer. Toasts are also fired (app
  // convention), but auth failures must be visible right where the user is
  // looking, so the drawer renders this alert above the form.
  const [formError, setFormError] = React.useState<{ title: string; description?: string } | null>(null);

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

  // ── OAuth return-leg detection ──
  // We're "returning from OAuth" if EITHER:
  //   (a) the sessionStorage flag set on outbound is still present, OR
  //   (b) the URL itself carries a return-leg signal (?code=, #access_token,
  //       ?error=, #error=) — covers the case where a user pastes/bookmarks
  //       a callback URL, or the flag was cleared between renders.
  // Computing inline at render keeps it a function of current state, not a
  // stale React state value. The URL check runs once per render but is cheap.
  const oauthReturning = (() => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('oauth_pending') === '1') return true;
    const search = window.location.search;
    const hash = window.location.hash;
    return (
      search.includes('code=') ||
      search.includes('error=') ||
      hash.includes('access_token=') ||
      hash.includes('error=')
    );
  })();

  // Reveal-on-scroll for landing sections (no library; respects reduced
  // motion). Re-arms when the landing view actually renders — the two loading
  // early-returns below can come first (OAuth return leg), and observing must
  // start only once the .vr sections exist.
  useReveal(!(oauthReturning && !user) && !(authReady && user));

  // ── One owner for post-auth navigation ──────────────────────────────────────
  // Two callers can reach it — handleSubmit's manual path and the user-watcher
  // effect below — and previously each redirected on its own, coordinated by a
  // boolean. That boolean could not express "we tried and failed", so a
  // getUser() that came back empty left the page sitting on a spinner forever;
  // and a second run of the effect (a new `user` identity, a StrictMode
  // remount) read a window.location that no longer carried ?returnTo and
  // pushed /classroom over the correct destination. A four-state machine makes
  // the first caller the only caller and gives failure somewhere to land.
  type PostAuthState = 'idle' | 'running' | 'done' | 'failed';
  const postAuthStateRef = React.useRef<PostAuthState>('idle');

  const runPostAuthRedirect = React.useCallback(async (userId: string) => {
    if (postAuthStateRef.current === 'running' || postAuthStateRef.current === 'done') return;
    postAuthStateRef.current = 'running';
    try {
      await redirectAfterAuth(userId, navigate);
      postAuthStateRef.current = 'done';
    } catch (err) {
      // Terminal branch: say so rather than leaving a spinner up.
      postAuthStateRef.current = 'failed';
      console.error('[auth] post-auth redirect failed:', err);
      setFormError({
        title: 'Signed in, but we could not open your classroom',
        description: 'Refresh the page to continue.',
      });
    }
  }, [navigate]);

  // ── Forgot password state ──
  const [resetEmail, setResetEmail] = React.useState('');

  // Vaul's Drawer handles Escape, scroll lock, and focus trap natively;
  // no custom keyboard/scroll plumbing needed.

  // Redirect authenticated users — single helper handles the profile lookup
  // so this effect, handleSubmit, and ResetPassword all agree on the rules.
  React.useEffect(() => {
    if (!user) return;
    void runPostAuthRedirect(user.id);
  }, [user, runPostAuthRedirect]);

  // Sanity-check oauth_pending on mount. If the flag is set but there is
  // no actual return-leg signal (no ?code, no #access_token, and no
  // recent timestamp), clear it so /auth doesn't render a permanent
  // blank screen. Stamping a timestamp lets us detect "left the tab open
  // for an hour" cases too.
  React.useEffect(() => {
    if (sessionStorage.getItem('oauth_pending') !== '1') return;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasReturnLegSignal =
      !!url.searchParams.get('code') ||
      !!hashParams.get('access_token') ||
      !!url.searchParams.get('error') ||
      !!hashParams.get('error');

    if (hasReturnLegSignal) return;

    const tsRaw = sessionStorage.getItem('oauth_pending_ts');
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
    if (!ts || Date.now() - ts > OAUTH_PENDING_MAX_AGE_MS) {
      sessionStorage.removeItem('oauth_pending');
      sessionStorage.removeItem('oauth_pending_ts');
      // The departure never happened (or happened an age ago); a parked target
      // from it would teleport the next sign-in somewhere unexpected.
      clearStashedReturnTo();
    }
  }, []);

  // One-shot: surface a session-expired banner if we were bounced here by
  // useUserPermissions after a dead/expired JWT. Scrubs the state so a manual
  // refresh doesn't replay the toast.
  React.useEffect(() => {
    const reason = (location.state as { reason?: string } | null)?.reason;
    if (reason === 'account_archived') {
      // Archived students get no explanation — signing in simply doesn't work.
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null,
      });
      return;
    }
    if (reason === 'session_expired') {
      setModalOpen(true);
      toast({
        title: 'Session expired',
        description: 'Please sign in again to continue.',
      });
      // Keep the query: this runs on /auth?returnTo=..., and dropping the search
      // here would discard the destination the expiry bounce just preserved.
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth handlers ──
  // Note: the OAuth return leg is handled implicitly. Supabase's
  // `detectSessionInUrl: true` (default) exchanges the `?code=` for a session
  // at module-init time; AuthContext's `onAuthStateChange` listener then
  // fires SIGNED_IN, calls markReady (which clears oauth_pending and sets
  // authReady=true), and the user-watcher effect above navigates via
  // `redirectAfterAuth`. AuthContext owns the 15s safety timer for
  // pathological cases. No explicit broker re-invoke is needed here.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setFormError({ title: 'Passwords do not match', description: 'Retype the confirmation so both fields agree.' });
          toast({ title: 'Passwords do not match', variant: 'destructive' });
          return;
        }
        const { error } = await signUp(trimmedEmail, password, name);
        if (error) {
          setFormError({ title: 'Registration failed', description: error.message });
          toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
        } else {
          setShowConfirmation(true);
        }
      } else {
        // No pre-emptive guard is needed: Supabase fires onAuthStateChange
        // synchronously on success, so the user-watcher effect may redirect
        // before this function resumes. Both routes call runPostAuthRedirect,
        // which admits exactly one of them.
        let error: { message?: string; status?: number } | null = null;
        try {
          const result = await signIn(trimmedEmail, password);
          error = result.error;
        } catch (e) {
          // Thrown errors typically mean the request never reached
          // Supabase (network down, DNS failure, blocked by extension).
          // The non-throw path returns { error } already.
          setFormError({ title: "Couldn't reach the server", description: 'Check your connection and try again.' });
          toast({
            title: "Couldn't reach the server",
            description: 'Check your connection and try again.',
            variant: 'destructive',
          });
          return;
        }
        if (error) {
          const msg = (error.message || '').toLowerCase();
          const status = error.status;
          let title = 'Sign-in failed';
          let description = error.message ?? 'Sign-in failed';

          if (msg.includes('invalid login credentials')) {
            description = 'Email or password is incorrect. Check for extra spaces or uppercase/lowercase differences.';
          } else if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
            title = 'Confirm your email';
            description = "We sent a confirmation link when you signed up. Click it before signing in.";
          } else if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
            title = 'Too many attempts';
            description = 'Wait a couple of minutes before trying again.';
          }

          setFormError({ title, description });
          toast({ title, description, variant: 'destructive' });
        } else {
          // Save or clear email based on "Remember me"
          if (rememberMe) {
            localStorage.setItem('lsatu_saved_email', trimmedEmail);
          } else {
            localStorage.removeItem('lsatu_saved_email');
          }

          const { data: { user: freshUser } } = await supabase.auth.getUser();
          if (freshUser) {
            await runPostAuthRedirect(freshUser.id);
          } else if (postAuthStateRef.current === 'idle') {
            // Credentials were accepted but the session did not materialise.
            // Without this branch the page just sits there.
            postAuthStateRef.current = 'failed';
            setFormError({
              title: 'Sign-in did not complete',
              description: 'Your details were accepted but the session did not start. Try again.',
            });
          }
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isLovablePreviewIframe = () => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const inIframe = window.self !== window.top;
    return inIframe && (host.includes('id-preview--') || host.endsWith('.lovableproject.com'));
  };

  const handleGoogleSignIn = async () => {
    if (isLovablePreviewIframe()) {
      setFormError({ title: 'Google sign-in unavailable in preview', description: 'Open the published URL (lsatu.lovable.app) to sign in with Google. Email/password works here.' });
      toast({
        title: 'Google sign-in unavailable in preview',
        description: 'Open the published URL (lsatu.lovable.app) to sign in with Google. Email/password works here.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      // A ref cannot survive a full-page redirect to Google, and the return leg
      // comes back to a bare /auth with no query of its own — so the validated
      // target is parked in session storage here or it is lost. This is what
      // makes an assignment link still work when the student signs in with
      // Google rather than a password.
      stashReturnTo(readReturnToFromUrl());
      sessionStorage.setItem('oauth_pending', '1');
      sessionStorage.setItem('oauth_pending_ts', String(Date.now()));
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_pending_ts');
        clearStashedReturnTo();
        setFormError({ title: 'Google sign-in failed', description: String(result.error) });
        toast({ title: 'Google sign-in failed', description: String(result.error), variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch (err) {
      sessionStorage.removeItem('oauth_pending');
      sessionStorage.removeItem('oauth_pending_ts');
      clearStashedReturnTo();
      const description = err instanceof Error ? err.message : 'Unknown error';
      setFormError({ title: 'Google sign-in failed', description });
      toast({ title: 'Google sign-in failed', description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(resetEmail.trim().toLowerCase());
    if (!error) {
      toast({
        title: 'Reset link sent',
        description: 'Check your email for a link to set a new password.',
      });
      setForgotOpen(false);
      setResetEmail('');
    } else {
      setFormError({ title: 'Reset failed', description: error.message });
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  // CTAs from every landing section funnel into the auth drawer — preserves
  // the flow exactly. setModalOpen(true) opens the vaul drawer's sign-in
  // form, which already wires handleSubmit → Supabase + handleGoogleSignIn → Lovable.
  const openSignIn = React.useCallback(() => { setIsSignUp(false); setModalOpen(true); }, []);
  const openSignUp = React.useCallback(() => { setIsSignUp(true); setModalOpen(true); }, []);

  // Calm loading panel used by both early-return branches.
  const LoadingPanel = ({ label }: { label: string }) => (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        background: ACA.bg,
        color: ACA.marble,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: ACA.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" style={{ color: ACA.bronze }} />
        {label}
      </div>
    </div>
  );

  // Order matters: while the OAuth return is mid-flight (URL or flag says
  // so AND we don't yet have a user), show "Finishing sign in…". As soon as
  // the user is established (and we may still be on /auth for a frame or
  // two), show "Redirecting…". Either path prevents the landing page from
  // flashing during the resolved-but-not-yet-navigated window.
  if (oauthReturning && !user) {
    return <LoadingPanel label="Finishing sign in…" />;
  }
  if (authReady && user) {
    return <LoadingPanel label="Redirecting…" />;
  }

  return (
    <div className="aca">
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS + FX_CSS + DRAWER_CSS }} />

      <AcaAmbience />
      <AcaPreloader />

      <div className="aca-content">
        <AcaNav onSignIn={openSignIn} />
        <main aria-label="LSAT U landing">
          <AcaHero onCTA={openSignIn} onSignUp={openSignUp} />
          <AcaStele />
          <GoldSeam variant={0} />
          <AcaBust />
          <AcaCanon />
          <GoldSeam variant={1} />
          <AcaDisciplines />
          <AcaJustice />
          <AcaMarquee />
          <AcaCredo onPrimary={openSignIn} />
          <GoldSeam variant={2} />
          <AcaFinal onPrimary={openSignIn} />
        </main>
        <AcaFooter />
      </div>

      {/* After the content in DOM so its 7 stops don't precede the nav and
          hero CTA in tab order; fixed positioning keeps it visually pinned. */}
      <AcaPlumb stops={PLUMB_STOPS} />

      {/* ── Auth drawer ── vaul bottom sheet, controlled by modalOpen.
          Holds two views: main sign-in/sign-up (default) and reset-password
          (when forgotOpen). Closing the drawer also resets forgotOpen so
          reopening always lands on the main view. */}
      <Drawer
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setForgotOpen(false);
            setFormError(null);
          }
        }}
      >
        <DrawerContent
          className="bg-[color:var(--auth-surface)] border-0 border-t border-[color:var(--auth-line-3)] text-[#EAE5DA] outline-none focus:outline-none max-h-[92dvh] sm:max-h-[88vh] sm:max-w-[420px] sm:mx-auto px-6 sm:px-8 pb-[calc(2rem+env(safe-area-inset-bottom))] [&>div:first-child]:bg-[color:var(--auth-catchlight)]"
          onOpenAutoFocus={(e) => {
            // Vaul skips auto-focus, which strands keyboard users outside the
            // dialog. Move focus in ourselves: the email field on fine-pointer
            // devices, the sheet itself on touch (focusing an input there
            // would pop the keyboard mid slide-up).
            e.preventDefault();
            const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            requestAnimationFrame(() => {
              const target = fine
                ? (document.getElementById(forgotOpen ? 'auth-reset-email' : 'auth-email') as HTMLElement | null)
                : (document.querySelector('[data-vaul-drawer]') as HTMLElement | null);
              target?.focus();
            });
          }}
        >
          <DrawerTitle className="sr-only">LSAT U Access</DrawerTitle>
          <DrawerDescription className="sr-only">
            Sign in or create your LSAT U account.
          </DrawerDescription>

          {/* Caustic gleam along the top edge + bronze bloom behind content */}
          <div className="aca-drawer-clip" aria-hidden="true">
            <div className="aca-caustic" />
            <div className="aca-drawer-bloom" />
          </div>

          {/* Close (desktop affordance — mobile users can drag down) */}
          <button
            onClick={() => setModalOpen(false)}
            className={cn("absolute top-3 right-3 z-10 inline-flex items-center justify-center min-h-11 min-w-11 rounded-[3px] text-[#8A8475] hover:text-[#EAE5DA] transition-[color,transform] duration-200 ease-out active:scale-90", focusRingCls)}
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-[14px] sm:h-[14px]" />
          </button>

          <div className="pt-2 relative">
            {forgotOpen ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-[1.3rem] font-medium tracking-tight text-[#EAE5DA] mb-1.5" style={{ fontFamily: ACA.serif }}>
                    Reset Password
                  </h2>
                  <p className="text-[11px] text-[#8A8475]">
                    Enter your email to receive a reset link.
                  </p>
                </div>
                <FormAlert error={formError} />
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="auth-reset-email" className={labelCls}>Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E695E] transition-colors duration-200 group-focus-within:text-[#8AD8E2]" />
                      <Input
                        id="auth-reset-email"
                        type="email"
                        autoComplete="email"
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
                <button
                  type="button"
                  onClick={() => { setForgotOpen(false); setFormError(null); }}
                  className={cn("block mx-auto mt-4 text-[11px] text-[#8A8475] hover:text-[#EAE5DA] transition-colors py-2.5 rounded-[3px]", focusRingCls)}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-7">
                  <h2
                    className="text-[15px] font-medium text-[#EAE5DA] mb-2"
                    style={{ fontFamily: ACA.inscr, letterSpacing: '0.34em', textIndent: '0.34em' }}
                  >
                    LSAT <em style={{ fontStyle: 'normal', color: ACA.bronze }}>U</em>
                  </h2>
                  <p className="text-[11px] text-[#8A8475]">
                    {isSignUp ? 'Create your account.' : 'Sign in to continue.'}
                  </p>
                </div>

                {/* Segmented control */}
                <div className="flex p-[3px] mb-6 bg-black/50 border border-[color:var(--auth-line-1)] rounded-[5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] relative">
                  {(['Sign In', 'Sign Up'] as const).map((tab, i) => {
                    const selected = (i === 1) === isSignUp;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => { setIsSignUp(i === 1); setFormError(null); }}
                        aria-pressed={selected}
                        className={cn(
                          'relative w-full min-h-[44px] flex items-center justify-center text-[12px] font-medium transition-colors z-10 rounded-[3px]',
                          focusRingCls,
                          selected ? 'text-[#E8CF96]' : 'text-[#8A8475] hover:text-[#C9C3B4]'
                        )}
                      >
                        {selected && (
                          <motion.div
                            layoutId="seg"
                            className="absolute inset-0 bg-[color:var(--auth-indicator)] rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(198,164,103,0.2)]"
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
                    <div className="w-14 h-14 rounded-full bg-[color:var(--auth-success-bg)] border border-[color:var(--auth-success-line)] flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-[color:var(--auth-success)]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#EAE5DA]" style={{ fontFamily: ACA.serif }}>Check your email</h3>
                    <p className="text-[13px] text-[#A6A093] leading-relaxed max-w-[280px] mx-auto">
                      We sent a confirmation link to <span className="text-[#E8CF96] font-medium">{email}</span>. Click the link to activate your account.
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
                      className={cn("text-[11px] text-[#8A8475] hover:text-[#EAE5DA] transition-colors py-2.5 mt-2 rounded-[3px]", focusRingCls)}
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <FormAlert error={formError} />
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name — sign up only */}
                      <AnimatePresence>
                        {isSignUp && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <label htmlFor="auth-name" className={labelCls}>Name</label>
                            <Input
                              id="auth-name"
                              type="text"
                              autoComplete="name"
                              required
                              placeholder="Your name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              maxLength={50}
                              className={cn(inputCls, 'pl-3')}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Email */}
                      <div>
                        <label htmlFor="auth-email" className={labelCls}>Email</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E695E] transition-colors duration-200 group-focus-within:text-[#8AD8E2]" />
                          <Input
                            id="auth-email"
                            type="email"
                            autoComplete="email"
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
                          <label htmlFor="auth-password" className={labelCls} style={{ marginBottom: 0 }}>
                            Password
                          </label>
                          {!isSignUp && (
                            <button
                              type="button"
                              onClick={() => { setForgotOpen(true); setFormError(null); }}
                              className={cn("text-[11px] text-[#A6A093] hover:text-[#C3EEF4] transition-colors duration-200 font-medium inline-flex items-center px-2 py-3 -my-2 -mr-1 rounded-[3px]", focusRingCls)}
                            >
                              Forgot?
                            </button>
                          )}
                        </div>
                        <div className="relative group mt-1.5">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E695E] transition-colors duration-200 group-focus-within:text-[#8AD8E2]" />
                          <Input
                            id="auth-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            aria-describedby={isSignUp ? 'auth-password-hint' : undefined}
                            required
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={isSignUp ? 8 : undefined}
                            className={inputWithToggleCls}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-11 min-w-11 rounded-[3px] text-[#8A8475] hover:text-[#EAE5DA] transition-colors", focusRingCls)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {isSignUp && (
                          <p id="auth-password-hint" className="text-[10px] text-[#8A8475] mt-1.5 ml-0.5">
                            8+ characters
                          </p>
                        )}
                      </div>

                      {/* Confirm password — sign up only */}
                      <AnimatePresence>
                        {isSignUp && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <label htmlFor="auth-confirm" className={labelCls}>Confirm Password</label>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E695E] transition-colors duration-200 group-focus-within:text-[#8AD8E2]" />
                              <Input
                                id="auth-confirm"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
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
                        <label className="flex items-center gap-2 py-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => {
                              setRememberMe(e.target.checked);
                              if (!e.target.checked) localStorage.removeItem('lsatu_saved_email');
                            }}
                            className="w-4 h-4 rounded border-[color:var(--auth-line-3)] bg-black/50 accent-[#C6A467] focus:ring-[color:var(--auth-ring-soft)] cursor-pointer"
                          />
                          <span className="text-[11px] text-[#8A8475] group-hover:text-[#C9C3B4] transition-colors">
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
                      <div className="flex-1 h-px bg-[color:var(--auth-line-2)]" />
                      <span className="text-[10px] uppercase tracking-[0.22em] text-[#8A8475] font-medium font-mono">or</span>
                      <div className="flex-1 h-px bg-[color:var(--auth-line-2)]" />
                    </div>

                    {/* Google Sign In — CSS scale (GPU) instead of Framer's
                         whileHover/whileTap shorthand, which runs on the main
                         thread via rAF and drops frames under load. */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className={cn("w-full h-12 sm:h-11 mt-3 flex items-center justify-center gap-2.5 rounded-[3px] bg-[color:var(--auth-fill-1)] border border-[color:var(--auth-line-2)] hover:bg-[color:var(--auth-fill-hover)] active:bg-[color:var(--auth-fill-active)] active:scale-[0.98] text-[13px] sm:text-[12px] font-medium text-[#C9C3B4] transition-[transform,background-color,border-color] duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed", focusRingCls)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
