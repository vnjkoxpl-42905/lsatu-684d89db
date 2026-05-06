import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useImageExists } from '@/hooks/useImageExists';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { redirectAfterAuth } from '@/lib/authRedirect';
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
// HOMEPAGE LAYOUT — 1:1 ARC STRUCTURAL TRANSLATION
// Layout / spacing / hierarchy / proportions / rhythm / component style
// mirror arc.net (extracted into design-references/arc/). All copy, product
// meaning, brand references swapped to LSAT U. No reinterpretation.
// ─────────────────────────────────────────────────────────────────────────────

const ARC = {
  bg: '#FBF8F1',          // page base — warm off-white (Arc #fffcec → slightly cooler/less yellow)
  bgTinted: '#F5EFE2',    // faint warm cream (Arc #fffadd, less saturated)
  ink: '#15171D',         // near-black with the slightest blue cast (Arc #000000)
  inkSecondary: '#6F7480',// one mid-grey (Arc #696969)
  hairline: 'rgba(21,23,29,0.08)',
  accent: '#1F3FE3',      // one confident product blue (Arc accent #3139fb)
  accentDeep: '#15224A',  // deep ink-blue for emphasis (Arc primary #2702c2)
  accentSoft: '#DCE2FA',  // tint surface for hover/proof
  shadowSoft: '0 2px 8px rgba(15,17,29,0.06)',
  shadowLift: '0 5px 18px rgba(15,17,29,0.08)',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusPill: '22px',     // Arc's signature soft pill
  serif: '"Fraunces", "Iowan Old Style", "Times New Roman", serif',
  sans: '"Inter", -apple-system, "SF Pro Display", system-ui, sans-serif',
};

// ── Page-scoped CSS injected once. Reset, font defaults, Arc-tier transitions ──
const PAGE_CSS = `
  .lsatu-arc { background: ${ARC.bg}; color: ${ARC.ink}; font-family: ${ARC.sans}; min-height: 100vh; -webkit-font-smoothing: antialiased; }
  .lsatu-arc * { box-sizing: border-box; }
  .lsatu-arc a { color: inherit; text-decoration: none; }
  .lsatu-arc h1, .lsatu-arc h2, .lsatu-arc h3 { font-family: ${ARC.serif}; font-weight: 600; letter-spacing: -0.02em; color: ${ARC.ink}; }
  .lsatu-arc .arc-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 22px; border-radius: ${ARC.radiusPill}; background: ${ARC.ink}; color: ${ARC.bg}; font-size: 14px; font-weight: 500; border: 0; cursor: pointer; transition: transform 180ms ease-out, box-shadow 180ms ease-out, background 180ms ease-out; }
  .lsatu-arc .arc-cta:hover { transform: translateY(-1px); box-shadow: ${ARC.shadowLift}; background: ${ARC.accentDeep}; }
  .lsatu-arc .arc-cta-ghost { background: transparent; color: ${ARC.ink}; border: 1px solid ${ARC.hairline}; }
  .lsatu-arc .arc-cta-ghost:hover { background: ${ARC.bgTinted}; transform: translateY(-1px); box-shadow: ${ARC.shadowSoft}; }
  .lsatu-arc .arc-link { color: ${ARC.accent}; font-weight: 500; transition: color 180ms ease-out; }
  .lsatu-arc .arc-link:hover { color: ${ARC.accentDeep}; }
  .lsatu-arc .arc-fade { opacity: 0; animation: arcFade 480ms cubic-bezier(0.16,1,0.3,1) forwards; }
  @keyframes arcFade { to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .lsatu-arc .arc-fade { animation: none; opacity: 1; }
    .lsatu-arc .arc-cta { transition: none; }
  }
`;

// ── Nav ── Logo + sign-in CTA. Decorative section labels were removed in
// the audit-fix pass (Phase 1) — they had no destinations and read as a
// fake nav. Real nav lives inside the app at /foyer.
const ArcNav = ({ onSignIn }: { onSignIn: () => void }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 30,
    background: ARC.bg + 'F0', backdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${ARC.hairline}`,
  }}>
    <div style={{
      maxWidth: 1280, margin: '0 auto', padding: '18px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ fontFamily: ARC.serif, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'inherit', textDecoration: 'none' }}>
        LSAT U
      </Link>
      <button onClick={onSignIn} style={{
        background: 'transparent', border: 0, padding: 0,
        fontSize: 14, color: ARC.ink, cursor: 'pointer', fontWeight: 500,
      }}>
        Sign in
      </button>
    </div>
  </nav>
);

// ── Image probe ── HEAD-fetches a marketing asset; if it isn't served we
// hide the framed image block entirely so visitors don't see an empty
// colored rectangle. Returns null while checking too — landing renders
// heading + lede only until we know the asset is real.
function MarketingImage({ src, alt, aspect = '16 / 9', maxWidth = 1100, marginTop = 0 }: { src: string; alt: string; aspect?: string; maxWidth?: number; marginTop?: number }) {
  const exists = useImageExists(src);
  if (exists !== true) return null;
  return (
    <div style={{
      marginTop,
      borderRadius: ARC.radiusPill,
      overflow: 'hidden',
      background: ARC.bgTinted,
      border: `1px solid ${ARC.hairline}`,
      boxShadow: ARC.shadowLift,
      aspectRatio: aspect,
      maxWidth,
      marginInline: 'auto',
    }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

// ── Hero ── Arc: heading + subhead + 1 CTA + product image. h1 sized for typographic confidence.
const ArcHero = ({ onCTA, onSignUp }: { onCTA: () => void; onSignUp: () => void }) => (
  <section style={{ padding: '90px 32px 72px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{
        fontSize: 'clamp(40px, 5.6vw, 72px)',
        fontWeight: 600,
        lineHeight: 0.96,
        letterSpacing: '-0.035em',
        marginBottom: 20,
      }}>
        Master the LSAT.<br />
        <span style={{ color: ARC.inkSecondary, fontWeight: 400 }}>Own your future.</span>
      </h1>
      <p style={{
        fontSize: 18, lineHeight: 1.5, color: ARC.inkSecondary,
        maxWidth: 560, margin: '0 auto 32px',
      }}>
        Clearer thinking, higher scores. A training environment built for aspiring attorneys.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="arc-cta" onClick={onCTA}>
          Begin training
          <span aria-hidden="true">→</span>
        </button>
        <button className="arc-cta arc-cta-ghost" onClick={onSignUp}>Sign up</button>
      </div>
    </div>

    <MarketingImage
      src="/marketing/hero-foyer.png"
      alt="The LSAT U Foyer — a calm, focused training entry"
      marginTop={72}
    />
  </section>
);

// ── Proof quote ── Arc: pull-quote + attribution + dual CTAs + "More details".
const ArcProof = ({ onPrimary }: { onPrimary: () => void }) => (
  <section style={{ padding: '120px 32px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
      <p style={{
        fontFamily: ARC.serif, fontStyle: 'italic',
        fontSize: 'clamp(28px, 3.2vw, 40px)',
        fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.02em',
        marginBottom: 24, color: ARC.ink,
      }}>
        “Built by Joshua. Trained on real LSAT arguments. Tested on real students.”
      </p>
      <p style={{ fontSize: 13, color: ARC.inkSecondary, marginBottom: 40, letterSpacing: '0.04em' }}>
        — A statement of intent from the founder
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="arc-cta" onClick={onPrimary}>Begin training</button>
      </div>
    </div>
  </section>
);

// ── Feature 1 — full-width image-dominant. Arc Section 3.
const ArcFeatureFullWidth = () => (
  <section style={{ padding: '60px 32px 120px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ maxWidth: 760, margin: '0 auto 56px', textAlign: 'center' }}>
      <h2 style={{
        fontSize: 'clamp(28px, 3.6vw, 44px)',
        fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.025em',
        marginBottom: 16,
      }}>
        A study tool that doesn’t just teach the LSAT — it trains the lawyer in you.
      </h2>
      <p style={{ fontSize: 17, lineHeight: 1.5, color: ARC.inkSecondary }}>
        Joshua’s coaching, woven into every drill. Real-time feedback that anticipates where you’ll trip.
      </p>
    </div>
    <MarketingImage
      src="/marketing/feature-coach.png"
      alt="A drill in progress with coaching feedback"
    />
  </section>
);

// ── Feature 2 — text-left / image-right. Arc Section 4.
const ArcFeatureSplit = ({
  heading, lede, image, alt, reverse = false,
}: { heading: string; lede: string; image: string; alt: string; reverse?: boolean }) => (
  <section style={{ padding: '60px 32px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 64, alignItems: 'center',
      direction: reverse ? 'rtl' : 'ltr',
    }}>
      <div style={{ direction: 'ltr', maxWidth: 480 }}>
        <h2 style={{
          fontSize: 'clamp(26px, 3.2vw, 40px)',
          fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.025em',
          marginBottom: 16,
        }}>
          {heading}
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: ARC.inkSecondary }}>
          {lede}
        </p>
      </div>
      <div style={{ direction: 'ltr' }}>
        <MarketingImage src={image} alt={alt} aspect="4 / 3" maxWidth={520} />
      </div>
    </div>
  </section>
);

// ── Feature 4 — text-only with link. Arc Section 6 (Privacy).
const ArcTextOnly = () => (
  <section style={{ padding: '120px 32px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{
        fontSize: 'clamp(28px, 3.6vw, 44px)',
        fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.025em',
        marginBottom: 20,
      }}>
        The discipline of focus.
      </h2>
      <p style={{ fontSize: 17, lineHeight: 1.55, color: ARC.inkSecondary, marginBottom: 24 }}>
        No leaderboards. No fake streaks. No vanity metrics. Every number you see is a real number — measured, persisted, and tied to your actual progress.
      </p>
      <span className="arc-link" style={{ fontSize: 15 }}>
        The LSAT U build philosophy is plain on the surface
      </span>
    </div>
  </section>
);

// ── Final CTA ── Arc: heading + dual CTAs centered.
const ArcFinalCTA = ({ onPrimary }: { onPrimary: () => void }) => (
  <section style={{ padding: '140px 32px 120px', maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{
        fontSize: 'clamp(32px, 4.2vw, 56px)',
        fontWeight: 600, lineHeight: 1.0, letterSpacing: '-0.03em',
        marginBottom: 36,
      }}>
        Enter your new home for the LSAT.
      </h2>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="arc-cta" onClick={onPrimary}>Begin training</button>
      </div>
    </div>
  </section>
);

// ── Footer ── Brand line + copyright. Decorative columns (Product /
// Resources / Legal) were removed in the audit-fix pass — they had no
// destinations.
const ArcFooter = () => (
  <footer style={{ borderTop: `1px solid ${ARC.hairline}`, padding: '40px 32px 36px', background: ARC.bg }}>
    <div style={{
      maxWidth: 1280, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ fontFamily: ARC.serif, fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
        LSAT U
      </div>
      <span style={{ fontSize: 12, color: ARC.inkSecondary }}>
        © LSAT U · Built for aspiring attorneys.
      </span>
    </div>
  </footer>
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────

// How long an oauth_pending flag is allowed to live before it counts as
// stuck. If the user navigated away mid-OAuth and never came back, the
// flag would otherwise blank /auth on every future visit.
const OAUTH_PENDING_MAX_AGE_MS = 60_000;

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady, signUp, signIn, resetPassword } = useAuth();
  const { toast } = useToast();

  // ── Modal state — opens via marketing CTAs (ArcNav, ArcHero, ArcProof,
  // ArcFinalCTA). Default closed so visitors can read the landing page;
  // a session-expired or OAuth bounce explicitly forces it open below.
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

  // Redirect authenticated users — single helper handles the profile lookup
  // so this effect, handleSubmit, and ResetPassword all agree on the rules.
  React.useEffect(() => {
    if (!user || skipAutoRedirectRef.current) return;
    void redirectAfterAuth(user.id, navigate);
  }, [user, navigate]);

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
    }
  }, []);

  // One-shot: surface a session-expired banner if we were bounced here by
  // useUserPermissions after a dead/expired JWT. Scrubs the state so a manual
  // refresh doesn't replay the toast.
  React.useEffect(() => {
    const reason = (location.state as { reason?: string } | null)?.reason;
    if (reason === 'session_expired') {
      setModalOpen(true);
      toast({
        title: 'Session expired',
        description: 'Please sign in again to continue.',
      });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return-leg OAuth session finalization — Auth.tsx owns the visible timeout.
  // When the user returns from Google via the Lovable broker, re-invoke the
  // broker so it can deliver tokens (without redirecting) and call setSession.
  // Wrapped in a 10s race so a stalled broker cannot hang the UI ambiguously.
  React.useEffect(() => {
    if (sessionStorage.getItem('oauth_pending') !== '1') return;
    console.log('[Auth] OAuth return-leg detected — re-invoking broker');

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      sessionStorage.removeItem('oauth_pending');
      sessionStorage.removeItem('oauth_pending_ts');
      setLoading(false);
      setModalOpen(true);
      toast({
        title: "Google sign-in didn't finish",
        description: "We couldn't complete your sign-in. Please try again.",
        variant: 'destructive',
      });
    }, 10000);

    lovable.auth
      .signInWithOAuth('google', { redirect_uri: window.location.origin + '/auth' })
      .then((result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (result.error) {
          sessionStorage.removeItem('oauth_pending');
          sessionStorage.removeItem('oauth_pending_ts');
          console.error('[Auth] OAuth return-leg failed', result.error);
          setLoading(false);
          setModalOpen(true);
          const inPreview = window.self !== window.top && (window.location.hostname.includes('id-preview--') || window.location.hostname.endsWith('.lovableproject.com'));
          toast({
            title: inPreview ? 'Google sign-in unavailable in preview' : 'Google sign-in failed',
            description: inPreview
              ? 'Open the published URL (lsatu.lovable.app) to sign in with Google.'
              : String(result.error),
            variant: 'destructive',
          });
        }
        // Success path: AuthContext.onAuthStateChange picks up the new session.
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_pending_ts');
        console.error('[Auth] OAuth return-leg threw', err);
        setLoading(false);
        setModalOpen(true);
        toast({
          title: 'Google sign-in failed',
          description: err?.message || 'Unknown error',
          variant: 'destructive',
        });
      });

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        let error: { message?: string; status?: number } | null = null;
        try {
          const result = await signIn(trimmedEmail, password);
          error = result.error;
        } catch (e) {
          // Thrown errors typically mean the request never reached
          // Supabase (network down, DNS failure, blocked by extension).
          // The non-throw path returns { error } already.
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

          toast({ title, description, variant: 'destructive' });
        } else {
          // Save or clear email based on "Remember me"
          if (rememberMe) {
            localStorage.setItem('lsatu_saved_email', trimmedEmail);
          } else {
            localStorage.removeItem('lsatu_saved_email');
          }
          skipAutoRedirectRef.current = true;

          const { data: { user: freshUser } } = await supabase.auth.getUser();
          if (freshUser) await redirectAfterAuth(freshUser.id, navigate);
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
      toast({
        title: 'Google sign-in unavailable in preview',
        description: 'Open the published URL (lsatu.lovable.app) to sign in with Google. Email/password works here.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      sessionStorage.setItem('oauth_pending', '1');
      sessionStorage.setItem('oauth_pending_ts', String(Date.now()));
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        sessionStorage.removeItem('oauth_pending');
        sessionStorage.removeItem('oauth_pending_ts');
        toast({ title: 'Google sign-in failed', description: String(result.error), variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch (err: any) {
      sessionStorage.removeItem('oauth_pending');
      sessionStorage.removeItem('oauth_pending_ts');
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
      toast({
        title: 'Reset link sent',
        description: 'Check your email for a link to set a new password.',
      });
      setForgotOpen(false); setModalOpen(true);
      setResetEmail('');
    } else {
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };


  // CTAs from every Arc section funnel into the existing modal — preserves
  // the auth flow exactly. setModalOpen(true) opens the GlassShell sign-in,
  // which already wires handleSubmit → Supabase + handleGoogleSignIn → Lovable.
  const openSignIn = React.useCallback(() => { setIsSignUp(false); setModalOpen(true); }, []);
  const openSignUp = React.useCallback(() => { setIsSignUp(true); setModalOpen(true); }, []);

  const oauthReturning =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('oauth_pending') === '1';

  if (authReady && user) {
    // Already signed in — the redirect effect above will fire imminently.
    // Show a calm "Redirecting…" panel rather than a flat blank rectangle
    // so the user knows something is happening.
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          background: ARC.bg,
          color: ARC.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Redirecting…
        </div>
      </div>
    );
  }

  if (oauthReturning) {
    // OAuth return leg in progress. Show real copy + a spinner so the
    // user knows something is happening instead of staring at a blank
    // page. The OAuth effect resolves and either signs in (Auth context
    // navigates away) or shows a toast and unsets the flag.
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          background: ARC.bg,
          color: ARC.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Finishing sign in…
        </div>
      </div>
    );
  }

  return (
    <div className="lsatu-arc">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <div className="arc-fade">
        <ArcNav onSignIn={openSignIn} />
        <ArcHero onCTA={openSignIn} onSignUp={openSignUp} />
        <ArcProof onPrimary={openSignIn} />
        <ArcFeatureFullWidth />
        <ArcFeatureSplit
          heading="Space for every part of your prep."
          lede="Lessons, Drills, and Diagnostics — three modes, one rhythm. Switch between them without breaking your study flow."
          image="/marketing/feature-spaces.png"
          alt="The LSAT U Foyer hero ring — three nodes for Smart Drill, Resume, and Ask Joshua"
        />
        <ArcFeatureSplit
          reverse
          heading="Your training, dialed in."
          lede="Adaptive difficulty, your weakest argument types surfaced first, and a Smart Drill that learns from every attempt."
          image="/marketing/feature-personal.png"
          alt="The Smart Drill with adaptive difficulty"
        />
        <ArcTextOnly />
        <ArcFinalCTA onPrimary={openSignIn} onSecondary={openSignIn} />
        <ArcFooter />
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
                aria-describedby="auth-modal-desc"
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

                  {/* Visually hidden description for screen readers */}
                  <p id="auth-modal-desc" className="sr-only">
                    Sign in or create your LSAT U account.
                  </p>

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
                              <label htmlFor="auth-name" className={labelCls}>Name</label>
                              <Input
                                id="auth-name"
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
                          <label htmlFor="auth-email" className={labelCls}>Email</label>
                          {/* group + group-focus-within replaces focused state — zero re-renders */}
                          <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                            <Input
                              id="auth-email"
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
                            <label htmlFor="auth-password" className={labelCls} style={{ marginBottom: 0 }}>
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
                              id="auth-password"
                              type={showPassword ? 'text' : 'password'}
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
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
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
                            <p className="text-[10px] text-neutral-600 mt-1.5 ml-0.5">
                              8+ characters
                            </p>
                          )}
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
                              <label htmlFor="auth-confirm" className={labelCls}>Confirm Password</label>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                                <Input
                                  id="auth-confirm"
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
                    <X className="w-4 h-4 sm:w-[14px] sm:h-[14px]" />
                  </button>
                  <h3 className="text-[14px] font-semibold text-white mb-1">Reset Password</h3>
                  <p className="text-[11px] text-neutral-500 mb-5">
                    Enter your email to receive a reset link.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="auth-reset-email" className={labelCls}>Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 transition-colors duration-200 group-focus-within:text-white" />
                        <Input
                          id="auth-reset-email"
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
