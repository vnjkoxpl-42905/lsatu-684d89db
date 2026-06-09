import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, X, Loader2, Home, LayoutGrid, Clock, Inbox, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { redirectAfterAuth } from '@/lib/authRedirect';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedButton } from '@/components/ui/animated-button';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { StoryScroll, StorySection } from '@/components/ui/story-scroll';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CONSTANTS
// Hoisted out of the component so they are never recreated on re-render.
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE LAYOUT — Arc-translated, type-led, image-free.
// Mirrors arc.net's chromatic restraint, 7-color budget, soft-pill CTAs,
// flat material, type-as-hero, horizontal proof carousel, looping marquee
// of subject signals. All copy, content, and meaning are LSAT U's own.
// No screenshots, no Mainhub imagery, no orbital system, no placeholders.
// ─────────────────────────────────────────────────────────────────────────────

const ARC = {
  bg: '#FBF8F1',           // page base — warm off-white, slightly more paper-like than Arc's #FFFCEC
  bgTinted: '#F5EFE2',     // soft cream — proof block, marquee strip
  bgSurface: '#FFFDF7',    // near-white — carousel cards on the warm field
  ink: '#15171D',          // near-black with a faint blue cast
  inkSecondary: '#6F7480', // one mid-grey — secondary text, hairlines bias
  inkMuted: '#A4A8B0',     // micro-text, kicker numerals
  hairline: 'rgba(21,23,29,0.08)',
  hairlineStrong: 'rgba(21,23,29,0.14)',
  accent: '#1F3FE3',       // one confident product blue (≈ Arc's #3139FB), used sparingly
  accentDeep: '#15224A',   // deep ink-blue for emphasis on hover
  accentSoft: '#E5EAFC',   // tint surface for hover/proof
  shadowSoft: '0 2px 8px rgba(15,17,29,0.06)',
  shadowLift: '0 5px 18px rgba(15,17,29,0.08)',
  shadowCard: '0 1px 2px rgba(15,17,29,0.04), 0 8px 24px rgba(15,17,29,0.06)',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusCard: '14px',
  radiusPill: '22px',      // Arc's signature soft pill
  serif: '"Fraunces", "Iowan Old Style", "Times New Roman", serif',
  sans: '"Outfit", -apple-system, "SF Pro Display", system-ui, sans-serif',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

// ── Page-scoped CSS injected once. Reset, type defaults, motion tokens,
// reveal animation, marquee, scroll-snap carousel. All motion respects
// prefers-reduced-motion.
const PAGE_CSS = `
  .lsatu-arc { background: ${ARC.bg}; color: ${ARC.ink}; font-family: ${ARC.sans}; min-height: 100vh; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  .lsatu-arc * { box-sizing: border-box; }
  .lsatu-arc a { color: inherit; text-decoration: none; }
  .lsatu-arc h1, .lsatu-arc h2, .lsatu-arc h3 { font-family: ${ARC.serif}; font-weight: 600; letter-spacing: -0.025em; color: ${ARC.ink}; margin: 0; }
  .lsatu-arc p { margin: 0; }

  /* CTAs — Arc-style soft pill */
  .lsatu-arc .arc-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 24px; border-radius: ${ARC.radiusPill}; background: ${ARC.ink}; color: ${ARC.bg}; font-family: ${ARC.sans}; font-size: 14px; font-weight: 500; letter-spacing: -0.005em; border: 0; cursor: pointer; transition: transform 220ms ${ARC.easeOut}, box-shadow 220ms ${ARC.easeOut}, background 220ms ${ARC.easeOut}; }
  .lsatu-arc .arc-cta:focus-visible { outline: 2px solid ${ARC.accent}; outline-offset: 3px; }
  .lsatu-arc .arc-cta-ghost { background: transparent; color: ${ARC.ink}; border: 1px solid ${ARC.hairline}; }
  .lsatu-arc .arc-cta-arrow { display: inline-block; transition: transform 220ms ${ARC.easeOut}; }
  /* Press feedback — instant scale-down on every primary CTA confirms the press. */
  .lsatu-arc .arc-cta:active { transform: translateY(0) scale(0.98); transition-duration: 90ms; }

  /* Hero entry CTA — single primary, larger pill, soft inset highlight + drop, tiny circular arrow puck */
  .lsatu-arc .arc-cta-hero { height: 58px; padding: 0 22px 0 30px; border-radius: 30px; font-size: 15.5px; font-weight: 500; gap: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(15,17,29,0.10), 0 10px 28px -4px rgba(15,17,29,0.18); }
  .lsatu-arc .arc-cta-hero:active { transform: translateY(0) scale(0.98); transition-duration: 90ms; }

  /* Hover effects gated on hover-capable, fine pointers — touch taps shouldn't preview a hover lift. */
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-cta:hover { transform: translateY(-1px); box-shadow: ${ARC.shadowLift}; background: ${ARC.accentDeep}; }
    .lsatu-arc .arc-cta-ghost:hover { background: ${ARC.bgTinted}; transform: translateY(-1px); box-shadow: ${ARC.shadowSoft}; }
    .lsatu-arc .arc-cta:hover .arc-cta-arrow { transform: translateX(3px); }
    .lsatu-arc .arc-cta-hero:hover { transform: translateY(-2px); background: ${ARC.accentDeep}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 4px rgba(15,17,29,0.12), 0 18px 40px -6px rgba(15,17,29,0.26); }
    .lsatu-arc .arc-cta-hero:hover .arc-cta-icon { background: rgba(255,255,255,0.18); transform: translateX(2px); }
  }
  .lsatu-arc .arc-cta-icon { width: 26px; height: 26px; border-radius: 999px; background: rgba(255,255,255,0.10); display: inline-flex; align-items: center; justify-content: center; transition: transform 220ms ${ARC.easeOut}, background 220ms ${ARC.easeOut}; flex-shrink: 0; }
  .lsatu-arc .arc-cta-icon svg { width: 12px; height: 12px; }
  .lsatu-arc .arc-cta-secondary { background: transparent; border: 0; padding: 8px 4px; font-family: ${ARC.sans}; font-size: 13px; font-weight: 500; color: ${ARC.inkSecondary}; cursor: pointer; letter-spacing: -0.005em; transition: color 180ms ${ARC.easeOut}; }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-cta-secondary:hover { color: ${ARC.ink}; }
  }
  .lsatu-arc .arc-cta-secondary u { text-decoration-color: ${ARC.hairlineStrong}; text-underline-offset: 3px; text-decoration-thickness: 1px; }

  /* Platform shell preview — soft app-like frame, slim sidebar, skeleton cards. No content, no labels that read as curriculum. */
  .lsatu-arc .arc-shell { position: relative; margin: 24px auto 0; max-width: 920px; padding: 0 24px; }
  .lsatu-arc .arc-shell-frame { background: ${ARC.bgSurface}; border: 1px solid ${ARC.hairline}; border-radius: 18px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,17,29,0.04), 0 24px 60px -16px rgba(15,17,29,0.16); transition: transform 280ms ${ARC.easeOut}, box-shadow 280ms ${ARC.easeOut}, border-color 280ms ${ARC.easeOut}; animation: arcFloat 8s ease-in-out infinite; will-change: transform; }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-shell-frame:hover { transform: translateY(-4px); border-color: ${ARC.hairlineStrong}; box-shadow: 0 1px 2px rgba(15,17,29,0.04), 0 36px 80px -20px rgba(15,17,29,0.24); }
  }
  @keyframes arcFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

  /* Window chrome */
  .lsatu-arc .arc-shell-bar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid ${ARC.hairline}; background: ${ARC.bg}; }
  .lsatu-arc .arc-shell-dots { display: inline-flex; gap: 6px; }
  .lsatu-arc .arc-shell-dot { width: 9px; height: 9px; border-radius: 999px; background: ${ARC.hairlineStrong}; }
  .lsatu-arc .arc-shell-title { flex: 1; text-align: center; font-family: ${ARC.serif}; font-size: 12.5px; font-weight: 500; letter-spacing: -0.005em; color: ${ARC.inkSecondary}; }
  .lsatu-arc .arc-shell-kbd { font-family: ${ARC.sans}; font-size: 10px; font-weight: 500; letter-spacing: 0.02em; color: ${ARC.inkMuted}; padding: 3px 7px; border: 1px solid ${ARC.hairline}; border-radius: 5px; background: ${ARC.bgSurface}; }

  /* Body: 2-column shell */
  .lsatu-arc .arc-shell-body { display: grid; grid-template-columns: 168px 1fr; min-height: 320px; }
  .lsatu-arc .arc-shell-side { padding: 18px 12px; border-right: 1px solid ${ARC.hairline}; background: ${ARC.bg}; display: flex; flex-direction: column; gap: 2px; }
  .lsatu-arc .arc-shell-side-eyebrow { font-family: ${ARC.sans}; font-size: 9.5px; font-weight: 500; letter-spacing: 0.20em; text-transform: uppercase; color: ${ARC.inkMuted}; padding: 0 10px 10px; }
  .lsatu-arc .arc-shell-nav { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-family: ${ARC.sans}; font-size: 12.5px; font-weight: 500; letter-spacing: -0.005em; color: ${ARC.inkSecondary}; transition: color 200ms ${ARC.easeOut}, background 200ms ${ARC.easeOut}; }
  .lsatu-arc .arc-shell-nav-icon { display: inline-flex; width: 14px; height: 14px; color: ${ARC.inkMuted}; }
  .lsatu-arc .arc-shell-nav.is-active { background: ${ARC.bgSurface}; color: ${ARC.ink}; box-shadow: inset 0 0 0 1px ${ARC.hairline}; }
  .lsatu-arc .arc-shell-nav.is-active .arc-shell-nav-icon { color: ${ARC.accent}; }

  /* Main canvas */
  .lsatu-arc .arc-shell-main { padding: 22px 26px 26px; display: flex; flex-direction: column; gap: 18px; background: ${ARC.bgSurface}; }
  .lsatu-arc .arc-shell-main-head { display: flex; align-items: center; justify-content: space-between; }
  .lsatu-arc .arc-shell-greet { font-family: ${ARC.serif}; font-size: 17px; font-weight: 500; letter-spacing: -0.018em; color: ${ARC.ink}; }
  .lsatu-arc .arc-shell-greet-sub { font-family: ${ARC.serif}; font-style: italic; font-weight: 400; color: ${ARC.inkSecondary}; margin-left: 4px; }
  .lsatu-arc .arc-shell-pill { font-family: ${ARC.sans}; font-size: 10.5px; font-weight: 500; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; background: ${ARC.bgTinted}; color: ${ARC.inkSecondary}; }
  .lsatu-arc .arc-shell-pill .arc-shell-pill-dot { display: inline-block; width: 6px; height: 6px; border-radius: 999px; background: ${ARC.accent}; margin-right: 6px; vertical-align: middle; }

  /* Skeleton cards */
  .lsatu-arc .arc-shell-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .lsatu-arc .arc-shell-card { background: ${ARC.bg}; border: 1px solid ${ARC.hairline}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 116px; transition: border-color 240ms ${ARC.easeOut}, transform 240ms ${ARC.easeOut}; opacity: 0; transform: translateY(8px); animation: arcShellCardIn 480ms ${ARC.easeOut} forwards; }
  /* Stagger the three skeleton cards so they cascade in instead of arriving together. */
  .lsatu-arc .arc-shell-card:nth-child(1) { animation-delay: 80ms; }
  .lsatu-arc .arc-shell-card:nth-child(2) { animation-delay: 140ms; }
  .lsatu-arc .arc-shell-card:nth-child(3) { animation-delay: 200ms; }
  @keyframes arcShellCardIn { to { opacity: 1; transform: translateY(0); } }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-shell-card:hover { border-color: ${ARC.hairlineStrong}; transform: translateY(-1px); }
  }
  .lsatu-arc .arc-shell-card-corner { display: flex; align-items: center; gap: 6px; }
  .lsatu-arc .arc-shell-card-dot { width: 6px; height: 6px; border-radius: 999px; background: ${ARC.hairlineStrong}; }
  .lsatu-arc .arc-shell-card-dot.is-accent { background: ${ARC.accent}; }
  .lsatu-arc .arc-shell-card-pip { font-family: ${ARC.sans}; font-size: 9.5px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: ${ARC.inkMuted}; }
  .lsatu-arc .arc-shell-bar-skel { height: 6px; border-radius: 3px; background: ${ARC.bgTinted}; }
  .lsatu-arc .arc-shell-bar-skel.s-1 { width: 64%; }
  .lsatu-arc .arc-shell-bar-skel.s-2 { width: 86%; }
  .lsatu-arc .arc-shell-bar-skel.s-3 { width: 42%; }
  .lsatu-arc .arc-shell-bar-skel.s-accent { background: ${ARC.accentSoft}; }

  /* Wide footer panel (subtle continuation hint) */
  .lsatu-arc .arc-shell-panel { background: ${ARC.bg}; border: 1px solid ${ARC.hairline}; border-radius: 12px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
  .lsatu-arc .arc-shell-panel-icon { width: 32px; height: 32px; border-radius: 8px; background: ${ARC.bgTinted}; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lsatu-arc .arc-shell-panel-icon svg { width: 14px; height: 14px; color: ${ARC.inkSecondary}; }
  .lsatu-arc .arc-shell-panel-stack { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
  .lsatu-arc .arc-shell-panel-arrow { width: 22px; height: 22px; border-radius: 999px; background: ${ARC.bgTinted}; display: inline-flex; align-items: center; justify-content: center; color: ${ARC.inkSecondary}; flex-shrink: 0; }
  /* Accent link — left-to-right underline reveal on hover (Linear/Vercel-style).
     The static underline is rendered as a 1px ::after that scales from origin-left.
     Gated on hover-capable pointers; on touch the link reads as plain accent text. */
  .lsatu-arc .arc-link { position: relative; color: ${ARC.accent}; font-weight: 500; transition: color 180ms ${ARC.easeOut}; padding-bottom: 2px; }
  .lsatu-arc .arc-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: currentColor; transform: scaleX(1); transform-origin: left center; transition: transform 280ms ${ARC.easeOut}; }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-link::after { transform: scaleX(0); transform-origin: right center; }
    .lsatu-arc .arc-link:hover { color: ${ARC.accentDeep}; }
    .lsatu-arc .arc-link:hover::after { transform: scaleX(1); transform-origin: left center; }
  }

  /* First-paint fade */
  .lsatu-arc .arc-fade { opacity: 0; animation: arcFade 540ms ${ARC.easeOut} forwards; }
  @keyframes arcFade { to { opacity: 1; } }

  /* Scroll-reveal — applied to .arc-rise, toggled by IntersectionObserver */
  .lsatu-arc .arc-rise { opacity: 0; transform: translateY(14px); transition: opacity 560ms ${ARC.easeOut}, transform 560ms ${ARC.easeOut}; }
  .lsatu-arc .arc-rise.is-in { opacity: 1; transform: translateY(0); }
  .lsatu-arc [data-story-scroll] .arc-rise { opacity: 1; transform: none; transition: none; }

  /* Pillar columns — cascade in 60ms apart once the parent section reveals.
     Without this, all three columns arrive together which reads as static. */
  .lsatu-arc .arc-pillar { opacity: 0; transform: translateY(8px); transition: opacity 480ms ${ARC.easeOut}, transform 480ms ${ARC.easeOut}; }
  .lsatu-arc .arc-rise.is-in .arc-pillar { opacity: 1; transform: translateY(0); }
  .lsatu-arc [data-story-scroll] .arc-pillar { opacity: 1; transform: none; transition: none; }
  .lsatu-arc .arc-rise.is-in .arc-pillar:nth-child(1) { transition-delay: 80ms; }
  .lsatu-arc .arc-rise.is-in .arc-pillar:nth-child(2) { transition-delay: 140ms; }
  .lsatu-arc .arc-rise.is-in .arc-pillar:nth-child(3) { transition-delay: 200ms; }

  /* Marquee — seamless loop, edge-fade mask */
  .lsatu-arc .arc-marquee { position: relative; overflow: hidden; -webkit-mask-image: linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%); mask-image: linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%); }
  .lsatu-arc .arc-marquee-track { display: inline-flex; gap: 0; white-space: nowrap; animation: arcMarquee 64s linear infinite; will-change: transform; }
  .lsatu-arc .arc-marquee:hover .arc-marquee-track { animation-play-state: paused; }
  .lsatu-arc .arc-marquee-item { display: inline-flex; align-items: center; gap: 14px; padding: 0 18px; font-family: ${ARC.serif}; font-size: 18px; font-weight: 500; font-style: italic; letter-spacing: -0.01em; color: ${ARC.ink}; }
  .lsatu-arc .arc-marquee-dot { width: 4px; height: 4px; border-radius: 999px; background: ${ARC.accent}; opacity: 0.55; }
  @keyframes arcMarquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }

  /* Scroll-snap carousel — hide native scrollbar, snap-mandatory.
     Right-edge mask hints "more cards live this way" without a scrollbar.
     Mask only on the right; left starts flush so the first card never feels clipped. */
  .lsatu-arc .arc-carousel-wrap { position: relative; -webkit-mask-image: linear-gradient(to right, black 0, black 92%, transparent 100%); mask-image: linear-gradient(to right, black 0, black 92%, transparent 100%); }
  .lsatu-arc .arc-carousel { display: flex; gap: 20px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-padding-inline: 32px; padding: 4px 32px 36px; scrollbar-width: none; -ms-overflow-style: none; cursor: grab; }
  .lsatu-arc .arc-carousel:active { cursor: grabbing; }
  .lsatu-arc .arc-carousel::-webkit-scrollbar { display: none; }
  .lsatu-arc .arc-card { scroll-snap-align: start; flex: 0 0 320px; background: ${ARC.bgSurface}; border: 1px solid ${ARC.hairline}; border-radius: ${ARC.radiusCard}; padding: 28px 24px 26px; display: flex; flex-direction: column; gap: 12px; min-height: 240px; transition: transform 260ms ${ARC.easeOut}, box-shadow 260ms ${ARC.easeOut}, border-color 260ms ${ARC.easeOut}; }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-card:hover { transform: translateY(-3px); box-shadow: ${ARC.shadowCard}; border-color: ${ARC.hairlineStrong}; }
  }
  .lsatu-arc .arc-card-kicker { font-family: ${ARC.sans}; font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: ${ARC.inkMuted}; }
  .lsatu-arc .arc-card-title { font-family: ${ARC.serif}; font-size: 24px; font-weight: 500; line-height: 1.1; letter-spacing: -0.02em; color: ${ARC.ink}; }
  .lsatu-arc .arc-card-body { font-size: 14.5px; line-height: 1.55; color: ${ARC.inkSecondary}; margin-top: auto; }

  /* Carousel hint row */
  .lsatu-arc .arc-carousel-cue { display: flex; align-items: center; gap: 14px; padding: 0 32px 8px; color: ${ARC.inkMuted}; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; }
  .lsatu-arc .arc-carousel-cue-line { flex: 1; height: 1px; background: ${ARC.hairline}; }

  /* Eyebrow / kicker text */
  .lsatu-arc .arc-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: ${ARC.sans}; font-size: 11px; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: ${ARC.inkSecondary}; }

  /* Top-nav Sign-in button — subtle press feedback + hover-gated tint shift. */
  .lsatu-arc .arc-nav-signin { background: transparent; border: 0; padding: 6px 10px; font-family: ${ARC.sans}; font-size: 14px; font-weight: 500; letter-spacing: -0.005em; color: ${ARC.ink}; cursor: pointer; border-radius: 8px; transition: background 200ms ${ARC.easeOut}, color 200ms ${ARC.easeOut}, transform 200ms ${ARC.easeOut}; }
  .lsatu-arc .arc-nav-signin:active { transform: scale(0.97); transition-duration: 90ms; }
  @media (hover: hover) and (pointer: fine) {
    .lsatu-arc .arc-nav-signin:hover { background: ${ARC.bgTinted}; color: ${ARC.accent}; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lsatu-arc .arc-fade, .lsatu-arc .arc-rise { animation: none; opacity: 1; transform: none; transition: none; }
    .lsatu-arc .arc-cta, .lsatu-arc .arc-card, .lsatu-arc .arc-cta-arrow, .lsatu-arc .arc-link, .lsatu-arc .arc-cta-icon, .lsatu-arc .arc-pillar, .lsatu-arc .arc-link::after { transition: none; }
    .lsatu-arc .arc-marquee-track { animation: none; }
    .lsatu-arc .arc-shell-frame { animation: none; }
    .lsatu-arc .arc-shell-card { animation: none; opacity: 1; transform: none; }
    .lsatu-arc .arc-pillar { opacity: 1; transform: none; }
    .lsatu-arc .arc-link::after { transform: scaleX(1); }
  }

  @media (max-width: 720px) {
    .lsatu-arc .arc-card { flex: 0 0 280px; min-height: 220px; }
    .lsatu-arc .arc-marquee-item { font-size: 16px; padding: 0 14px; }
    .lsatu-arc .arc-cta-hero { height: 54px; padding: 0 18px 0 24px; font-size: 14.5px; }
    .lsatu-arc .arc-shell-body { grid-template-columns: 1fr; }
    .lsatu-arc .arc-shell-side { display: none; }
    .lsatu-arc .arc-shell-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lsatu-arc .arc-shell-card:nth-child(3) { display: none; }
  }
`;

// ── Scroll-reveal hook — IntersectionObserver with two safety nets:
// (1) initial pass reveals anything already at-or-above the current viewport
//     (covers reload-mid-page and instant-scroll deep links),
// (2) generous rootMargin so smooth-scrolls always hit the trigger before the
//     element fully enters view. Reduced-motion bypasses everything.
function useScrollReveal() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.lsatu-arc .arc-rise'))
      .filter((el) => !el.closest('[data-story-scroll]'));

    if (reduced) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }

    // Initial pass — anything already in/above the viewport is revealed without animation.
    const vh = window.innerHeight;
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Reveal if the element top has reached the bottom 92% of the viewport
      // OR if the element bottom is above the viewport (already scrolled past).
      if (rect.top < vh * 0.92 || rect.bottom < 0) {
        el.classList.add('is-in');
      }
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    );
    els.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}

// ── Drag-to-scroll hook — mouse drag for the carousel; trackpads/touch use
// native scroll-snap. Adds Arc-style "grab and pull" feel.
function useDragScroll(ref: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const onDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add('is-dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onLeave = () => { isDown = false; el.classList.remove('is-dragging'); };
    const onUp = () => { isDown = false; el.classList.remove('is-dragging'); };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.4;
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mousemove', onMove);
    };
  }, [ref]);
}

// ── Content tokens — all real LSAT subject signals. No fake metrics. ──
const QUESTION_TYPES = [
  'Necessary Assumption',
  'Strengthen',
  'Weaken',
  'Main Conclusion',
  'Flaw in the Reasoning',
  'Principle',
  'Parallel Reasoning',
  'Resolve the Paradox',
  'Inference',
  'Method of Reasoning',
  'Sufficient Assumption',
  'Role in Argument',
];

const PRINCIPLES: Array<{ kicker: string; title: string; body: string }> = [
  { kicker: '01 — Anatomy',  title: 'Find the argument.',     body: 'Premises, conclusion, and the bridge between them. Every stem hides one — train the eye to see it before the clock starts.' },
  { kicker: '02 — Bridge',   title: 'Test the gap.',          body: 'Strengthen and Weaken live in the space between premise and conclusion. Drill the gap, not the answer choice.' },
  { kicker: '03 — Failure',  title: 'Spot the flaw.',         body: 'Most LR arguments break in a small, predictable set of ways. Learn the set; the arguments stop surprising you.' },
  { kicker: '04 — Stems',    title: 'Read the stem first.',   body: 'The stem sets the search target. Reading the stimulus without a target is the most expensive mistake on the test.' },
  { kicker: '05 — Patterns', title: 'Hunt patterns.',         body: 'One principle, dozens of questions. Compression beats memorization — and compresses time on test day.' },
  { kicker: '06 — Pace',     title: 'Slow now, fast later.',  body: 'Trained instinct beats trained speed. Build the instinct in slow drills; speed becomes a side-effect of clarity.' },
];

const PILLARS: Array<{ title: string; body: string }> = [
  { title: 'Adaptive drilling.',   body: 'Your weakest argument types surface first. The engine drills where the score gain is, not where the comfort is.' },
  { title: 'A coach in the page.', body: 'Joshua’s coaching is woven into every drill — real-time feedback that anticipates the exact moment you’ll trip.' },
  { title: 'Real numbers, only.',  body: 'No leaderboards. No vanity streaks. Every metric is measured, persisted, and tied to your actual progress.' },
];

// ── Nav ── Brand mark + Sign-in. Sticky with translucent warm-white blur.
const ArcNav = ({ onSignIn }: { onSignIn: () => void }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 30,
    background: ARC.bg + 'F2',
    backdropFilter: 'saturate(160%) blur(10px)',
    WebkitBackdropFilter: 'saturate(160%) blur(10px)',
    borderBottom: `1px solid ${ARC.hairline}`,
  }}>
    <div style={{
      maxWidth: 1200, margin: '0 auto', padding: '18px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ fontFamily: ARC.serif, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: ARC.ink, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        LSAT
        <span style={{ color: ARC.accent, fontStyle: 'italic', fontWeight: 500 }}>U</span>
      </Link>
      <button type="button" className="arc-nav-signin" onClick={onSignIn}>
        Sign in
      </button>
    </div>
  </nav>
);

// ── Hero ── One clear primary entry point. Typography unchanged; the
// dual-button pattern collapses into a single substantial pill ("Enter LSAT
// University") with a tiny secondary text link below for new accounts.
const ArcHero = ({ onCTA, onSignUp }: { onCTA: () => void; onSignUp: () => void }) => (
  <section style={{ padding: 'clamp(72px, 10vw, 132px) 32px 56px', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
    <div className="arc-fade">
      <span className="arc-eyebrow" style={{ marginBottom: 28 }}>For aspiring attorneys</span>
      <h1 style={{
        fontSize: 'clamp(44px, 7.4vw, 96px)',
        fontWeight: 600,
        lineHeight: 0.94,
        letterSpacing: '-0.04em',
        marginTop: 24,
        marginBottom: 18,
      }}>
        Master the LSAT.<br />
        <span style={{ color: ARC.inkSecondary, fontWeight: 400, fontStyle: 'italic' }}>
          Own your future.
        </span>
      </h1>
      <p style={{
        fontFamily: ARC.serif,
        fontSize: 'clamp(18px, 1.7vw, 22px)',
        lineHeight: 1.45,
        color: ARC.inkSecondary,
        maxWidth: 540,
        margin: '0 auto 36px',
        fontStyle: 'italic',
        fontWeight: 400,
      }}>
        Clearer thinking, higher scores.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button className="arc-cta arc-cta-hero" onClick={onCTA} aria-label="Enter LSAT University">
          Enter LSAT University
          <span aria-hidden="true" className="arc-cta-icon">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6h7.5M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        <button type="button" className="arc-cta-secondary" onClick={onSignUp}>
          Or <u>create an account</u>
        </button>
      </div>
      <p style={{
        marginTop: 22, fontSize: 12, color: ARC.inkMuted,
        letterSpacing: '0.06em',
      }}>
        Email or Google · No credit card to start
      </p>
    </div>
  </section>
);

// ── Platform preview ── A faux LSAT U workspace shell. Window chrome,
// slim sidebar with platform-level nav, soft skeleton cards, one wide
// continuation panel. Zero curriculum content. Reads as "this is the
// tool", not "this is a lesson". All chrome is structural — labels are
// platform concepts (Today, Workspace, Sessions, Inbox, Profile), the
// canvas is intentionally light-on-content.
const ArcPlatformPreview = () => (
  <section className="arc-shell arc-fade" aria-label="LSAT U platform preview">
    <div className="arc-shell-frame">
      <div className="arc-shell-bar">
        <div className="arc-shell-dots" aria-hidden="true">
          <span className="arc-shell-dot" />
          <span className="arc-shell-dot" />
          <span className="arc-shell-dot" />
        </div>
        <div className="arc-shell-title">LSAT U · Workspace</div>
        <div className="arc-shell-kbd">⌘ K</div>
      </div>
      <div className="arc-shell-body">
        <aside className="arc-shell-side" aria-hidden="true">
          <div className="arc-shell-side-eyebrow">Workspace</div>
          <div className="arc-shell-nav is-active">
            <span className="arc-shell-nav-icon"><Home strokeWidth={1.6} size={14} /></span>
            Today
          </div>
          <div className="arc-shell-nav">
            <span className="arc-shell-nav-icon"><LayoutGrid strokeWidth={1.6} size={14} /></span>
            Spaces
          </div>
          <div className="arc-shell-nav">
            <span className="arc-shell-nav-icon"><Clock strokeWidth={1.6} size={14} /></span>
            Sessions
          </div>
          <div className="arc-shell-nav">
            <span className="arc-shell-nav-icon"><Inbox strokeWidth={1.6} size={14} /></span>
            Inbox
          </div>
          <div className="arc-shell-nav">
            <span className="arc-shell-nav-icon"><User strokeWidth={1.6} size={14} /></span>
            Profile
          </div>
        </aside>
        <div className="arc-shell-main">
          <div className="arc-shell-main-head">
            <div>
              <span className="arc-shell-greet">Welcome back,</span>
              <span className="arc-shell-greet-sub">your space is ready.</span>
            </div>
            <span className="arc-shell-pill" aria-hidden="true">
              <span className="arc-shell-pill-dot" />
              Live
            </span>
          </div>
          <div className="arc-shell-row" aria-hidden="true">
            <div className="arc-shell-card">
              <div className="arc-shell-card-corner">
                <span className="arc-shell-card-dot is-accent" />
                <span className="arc-shell-card-pip">01</span>
              </div>
              <div className="arc-shell-bar-skel s-2" />
              <div className="arc-shell-bar-skel s-1" />
              <div className="arc-shell-bar-skel s-accent s-3" style={{ marginTop: 'auto' }} />
            </div>
            <div className="arc-shell-card">
              <div className="arc-shell-card-corner">
                <span className="arc-shell-card-dot" />
                <span className="arc-shell-card-pip">02</span>
              </div>
              <div className="arc-shell-bar-skel s-1" />
              <div className="arc-shell-bar-skel s-2" />
              <div className="arc-shell-bar-skel s-3" style={{ marginTop: 'auto' }} />
            </div>
            <div className="arc-shell-card">
              <div className="arc-shell-card-corner">
                <span className="arc-shell-card-dot" />
                <span className="arc-shell-card-pip">03</span>
              </div>
              <div className="arc-shell-bar-skel s-2" />
              <div className="arc-shell-bar-skel s-3" />
              <div className="arc-shell-bar-skel s-1" style={{ marginTop: 'auto' }} />
            </div>
          </div>
          <div className="arc-shell-panel" aria-hidden="true">
            <div className="arc-shell-panel-icon">
              <ArrowRight strokeWidth={1.7} />
            </div>
            <div className="arc-shell-panel-stack">
              <div className="arc-shell-bar-skel s-2" />
              <div className="arc-shell-bar-skel s-3" />
            </div>
            <div className="arc-shell-panel-arrow">
              <ArrowRight size={12} strokeWidth={1.8} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Marquee ── Auto-scrolling row of LSAT question types. Replaces the
// "logo wall" beat that Arc puts under its hero. Real subject content,
// not fake brand logos.
const ArcMarquee = () => {
  const items = [...QUESTION_TYPES, ...QUESTION_TYPES]; // duplicated for seamless loop
  return (
    <section className="arc-rise" style={{
      borderTop: `1px solid ${ARC.hairline}`,
      borderBottom: `1px solid ${ARC.hairline}`,
      background: ARC.bgTinted,
      padding: '20px 0',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 32px 6px',
        fontSize: 11, fontWeight: 500,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: ARC.inkSecondary,
      }}>
        What you train
      </div>
      <div className="arc-marquee" aria-hidden="true">
        <div className="arc-marquee-track">
          {items.map((q, i) => (
            <span key={i} className="arc-marquee-item">
              <span className="arc-marquee-dot" />
              {q}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Proof quote ── Founder statement of intent. Pull-quote in serif italic.
const ArcProof = ({ onPrimary }: { onPrimary: () => void }) => (
  <section className="arc-rise" style={{ padding: 'clamp(96px, 12vw, 144px) 32px', maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
      <span className="arc-eyebrow" style={{ marginBottom: 28 }}>A statement of intent</span>
      <p style={{
        fontFamily: ARC.serif, fontStyle: 'italic',
        fontSize: 'clamp(28px, 3.6vw, 46px)',
        fontWeight: 500, lineHeight: 1.16, letterSpacing: '-0.025em',
        margin: '24px 0 28px', color: ARC.ink,
      }}>
        “A better way to prepare for the LSAT, with practice, review, and progress all working together.”
      </p>
      <button className="arc-cta" onClick={onPrimary}>
        Begin training
        <span aria-hidden="true" className="arc-cta-arrow">→</span>
      </button>
    </div>
  </section>
);

// ── Carousel ── Horizontal scroll-snap row of LSAT thinking principles.
// Cards are flat warm-cream surfaces with hairline borders. Drag-to-scroll
// for mouse, native scroll-snap for trackpad/touch. Six cards fits Arc's
// proof-row rhythm; mask-fade on the right cues "more to read".
const ArcCarousel = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  useDragScroll(ref);
  return (
    <section className="arc-rise" style={{ padding: '12px 0 80px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ padding: '0 32px', maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
        <span className="arc-eyebrow" style={{ marginBottom: 24 }}>Six principles, one rhythm</span>
        <h2 style={{
          fontSize: 'clamp(32px, 4.4vw, 56px)',
          fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.03em',
          marginTop: 22, marginBottom: 18,
        }}>
          The training,<br />
          <span style={{ color: ARC.inkSecondary, fontStyle: 'italic', fontWeight: 400 }}>distilled.</span>
        </h2>
        <p style={{
          fontSize: 17, lineHeight: 1.55, color: ARC.inkSecondary,
          maxWidth: 580, margin: '0 auto',
        }}>
          The LSAT rewards a small set of habits, learned deeply. Each card is one of the habits the engine drills against you, until it stops being a drill and becomes the way you read.
        </p>
      </div>

      <div className="arc-carousel-cue" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <span>Scroll</span>
        <span className="arc-carousel-cue-line" />
        <span>Drag · or trackpad</span>
      </div>

      <div className="arc-carousel-wrap">
        <div ref={ref} className="arc-carousel" role="list" aria-label="LSAT training principles">
          {PRINCIPLES.map((p, i) => (
            <article key={i} className="arc-card" role="listitem">
              <div className="arc-card-kicker">{p.kicker}</div>
              <div className="arc-card-title">{p.title}</div>
              <div className="arc-card-body">{p.body}</div>
            </article>
          ))}
          {/* Closing card — gentle handoff to CTA */}
          <article className="arc-card" role="listitem" style={{
            background: ARC.ink, color: ARC.bg, borderColor: ARC.ink,
          }}>
            <div className="arc-card-kicker" style={{ color: ARC.bgTinted, opacity: 0.7 }}>Begin →</div>
            <div className="arc-card-title" style={{ color: ARC.bg }}>The next card is the page in front of you.</div>
            <div className="arc-card-body" style={{ color: ARC.bgTinted, opacity: 0.85 }}>
              The principles only matter when you sit down to drill them. Sign in to start.
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

// ── Pillars ── Three flat columns. No images, no chrome — just type and
// hairlines. Mirrors Arc's "three benefit blocks" beat without screenshots.
const ArcPillars = () => (
  <section className="arc-rise" style={{ padding: 'clamp(72px, 10vw, 120px) 32px', maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ maxWidth: 760, margin: '0 auto 64px', textAlign: 'center' }}>
      <span className="arc-eyebrow" style={{ marginBottom: 24 }}>Built for serious training</span>
      <h2 style={{
        fontSize: 'clamp(28px, 3.8vw, 48px)',
        fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.028em',
        marginTop: 22,
      }}>
        A study tool that doesn’t just teach the test —<br />
        <span style={{ color: ARC.inkSecondary, fontStyle: 'italic', fontWeight: 400 }}>it trains the lawyer in you.</span>
      </h2>
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 0,
      borderTop: `1px solid ${ARC.hairline}`,
    }}>
      {PILLARS.map((p, i) => (
        <div key={i} className="arc-pillar" style={{
          padding: '40px 28px',
          borderBottom: `1px solid ${ARC.hairline}`,
          borderRight: i < PILLARS.length - 1 ? `1px solid ${ARC.hairline}` : 'none',
        }}>
          <div style={{
            fontFamily: ARC.sans, fontSize: 11, fontWeight: 500,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: ARC.inkMuted, marginBottom: 16,
          }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <h3 style={{
            fontFamily: ARC.serif, fontSize: 26, fontWeight: 500,
            lineHeight: 1.12, letterSpacing: '-0.02em',
            marginBottom: 12,
          }}>
            {p.title}
          </h3>
          <p style={{ fontSize: 15.5, lineHeight: 1.55, color: ARC.inkSecondary }}>
            {p.body}
          </p>
        </div>
      ))}
    </div>
  </section>
);

// ── Text-only — Arc's "build philosophy" beat. No graphic. Ink + accent link.
const ArcTextOnly = () => (
  <section className="arc-rise" style={{ padding: 'clamp(96px, 12vw, 140px) 32px', maxWidth: 1200, margin: '0 auto' }}>
    <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
      <span className="arc-eyebrow" style={{ marginBottom: 28 }}>The build philosophy</span>
      <h2 style={{
        fontSize: 'clamp(30px, 4vw, 52px)',
        fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.028em',
        marginTop: 22, marginBottom: 22,
      }}>
        Focused LSAT prep, without the noise.
      </h2>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: ARC.inkSecondary, marginBottom: 28 }}>
        LSAT U keeps your study time centered on the work that matters: practice, review, mistakes, and steady improvement.
      </p>
      <span className="arc-link" style={{ fontSize: 14, fontFamily: ARC.sans }}>
        Simple on the surface. Serious where it counts.
      </span>
    </div>
  </section>
);

// ── Closing CTA ── A final pull. Big serif lockup + single pill button.
const ArcFinalCTA = ({ onPrimary }: { onPrimary: () => void }) => (
  <section className="arc-rise" style={{
    padding: 'clamp(80px, 10vw, 128px) 32px',
    maxWidth: 1200, margin: '0 auto',
    textAlign: 'center',
  }}>
    <h2 style={{
      fontSize: 'clamp(36px, 5.6vw, 80px)',
      fontWeight: 600, lineHeight: 0.98, letterSpacing: '-0.035em',
      marginBottom: 28,
    }}>
      Sit down.<br />
      <span style={{ color: ARC.inkSecondary, fontStyle: 'italic', fontWeight: 400 }}>Begin.</span>
    </h2>
    <button className="arc-cta" onClick={onPrimary} style={{ height: 50, padding: '0 28px', fontSize: 14.5 }}>
      Begin training
      <span aria-hidden="true" className="arc-cta-arrow">→</span>
    </button>
  </section>
);

// ── Footer ── One line, Inter-grade, muted. No fake links — the public
// surface only owns what it can deliver. Privacy and terms are in-app.
const ArcFooter = () => (
  <footer style={{
    borderTop: `1px solid ${ARC.hairline}`,
    padding: '32px',
    fontSize: 12,
    color: ARC.inkMuted,
    letterSpacing: '0.04em',
  }}>
    <div style={{
      maxWidth: 1200, margin: '0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: ARC.serif, fontStyle: 'italic', color: ARC.inkSecondary }}>
        LSAT U · A training environment for aspiring attorneys.
      </span>
      <span>© {new Date().getFullYear()}</span>
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

  // ── Drawer state — opens via marketing CTAs (ArcNav, ArcHero, ArcProof).
  // Default closed so visitors can read the landing page; a session-expired
  // or OAuth bounce explicitly forces it open below.
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

  // Reveal-on-scroll for marketing sections (no library; respects reduced motion).
  useScrollReveal();

  // ── skipAutoRedirectRef: set synchronously in handleSubmit so the user-watcher
  // useEffect never fires navigate('/mainhub') while we're in the post-login async block.
  const skipAutoRedirectRef = React.useRef(false);

  // ── Forgot password state ──
  const [resetEmail, setResetEmail] = React.useState('');

  // Vaul's Drawer handles Escape, scroll lock, and focus trap natively;
  // no custom keyboard/scroll plumbing needed.

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
        // Set the skip-redirect ref BEFORE the signIn await. Supabase fires
        // onAuthStateChange synchronously when the credentials succeed, which
        // populates `user` and triggers the user-watcher effect on the very
        // next render. Setting the ref first guarantees the user-watcher
        // never races our manual redirectAfterAuth call below.
        skipAutoRedirectRef.current = true;
        let error: { message?: string; status?: number } | null = null;
        try {
          const result = await signIn(trimmedEmail, password);
          error = result.error;
        } catch (e) {
          // Thrown errors typically mean the request never reached
          // Supabase (network down, DNS failure, blocked by extension).
          // The non-throw path returns { error } already.
          skipAutoRedirectRef.current = false;
          toast({
            title: "Couldn't reach the server",
            description: 'Check your connection and try again.',
            variant: 'destructive',
          });
          return;
        }
        if (error) {
          // Sign-in failed — release the skip-redirect ref so a subsequent
          // successful attempt can trigger the user-watcher normally.
          skipAutoRedirectRef.current = false;
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
    } catch (err) {
      sessionStorage.removeItem('oauth_pending');
      sessionStorage.removeItem('oauth_pending_ts');
      const description = err instanceof Error ? err.message : 'Unknown error';
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
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };


  // CTAs from every Arc section funnel into the auth drawer — preserves
  // the flow exactly. setModalOpen(true) opens the vaul drawer's sign-in
  // form, which already wires handleSubmit → Supabase + handleGoogleSignIn → Lovable.
  const openSignIn = React.useCallback(() => { setIsSignUp(false); setModalOpen(true); }, []);
  const openSignUp = React.useCallback(() => { setIsSignUp(true); setModalOpen(true); }, []);

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

  // Calm loading panel used by both early-return branches.
  const LoadingPanel = ({ label }: { label: string }) => (
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
        {label}
      </div>
    </div>
  );

  // Order matters: while the OAuth return is mid-flight (URL or flag says
  // so AND we don't yet have a user), show "Finishing sign in…". As soon as
  // the user is established (and we may still be on /auth for a frame or
  // two), show "Redirecting…". Either path prevents the marketing page from
  // flashing during the resolved-but-not-yet-navigated window.
  if (oauthReturning && !user) {
    return <LoadingPanel label="Finishing sign in…" />;
  }
  if (authReady && user) {
    return <LoadingPanel label="Redirecting…" />;
  }

  return (
    <div className="lsatu-arc">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <ArcNav onSignIn={openSignIn} />
      <StoryScroll aria-label="LSAT U landing story" className="bg-[#FBF8F1]">
        <StorySection aria-label="Master the LSAT">
          <ArcHero onCTA={openSignIn} onSignUp={openSignUp} />
        </StorySection>
        <StorySection aria-label="LSAT U workspace preview">
          <ArcPlatformPreview />
        </StorySection>
        <StorySection aria-label="LSAT question training rhythm">
          <ArcMarquee />
          <ArcCarousel />
        </StorySection>
        <StorySection aria-label="LSAT U statement of intent">
          <ArcProof onPrimary={openSignIn} />
        </StorySection>
        <StorySection aria-label="LSAT U training pillars">
          <ArcPillars />
        </StorySection>
        <StorySection aria-label="LSAT U build philosophy">
          <ArcTextOnly />
        </StorySection>
        <StorySection aria-label="Begin LSAT U training">
          <ArcFinalCTA onPrimary={openSignIn} />
        </StorySection>
      </StoryScroll>
      <ArcFooter />

      {/* ── Auth drawer ── vaul bottom sheet, controlled by modalOpen.
          Holds two views: main sign-in/sign-up (default) and reset-password
          (when forgotOpen). Closing the drawer also resets forgotOpen so
          reopening always lands on the main view. */}
      <Drawer
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setForgotOpen(false);
        }}
      >
        <DrawerContent
          className="bg-[#121212]/95 backdrop-blur-xl border-0 border-t border-white/10 text-white outline-none focus:outline-none max-h-[92dvh] sm:max-h-[88vh] sm:max-w-[420px] sm:mx-auto px-6 sm:px-8 pb-[calc(2rem+env(safe-area-inset-bottom))] [&>div:first-child]:bg-white/15"
        >
          <DrawerTitle className="sr-only">LSAT U Access</DrawerTitle>
          <DrawerDescription className="sr-only">
            Sign in or create your LSAT U account.
          </DrawerDescription>

          {/* Top specular catch-light */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

          {/* Close (desktop affordance — mobile users can drag down) */}
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 -m-2 text-neutral-600 hover:text-white transition-colors duration-200"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-[14px] sm:h-[14px]" />
          </button>

          <div className="pt-2">
            {forgotOpen ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                    Reset Password
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Enter your email to receive a reset link.
                  </p>
                </div>
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
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="block mx-auto mt-4 text-[11px] text-neutral-500 hover:text-white transition-colors"
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-7">
                  <h2 className="text-[1.15rem] font-semibold tracking-tight text-white mb-1.5">
                    LSAT U
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    {isSignUp ? 'Create your account.' : 'Sign in to continue.'}
                  </p>
                </div>

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
                              onClick={() => setForgotOpen(true)}
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

                    {/* Google Sign In — CSS scale (GPU) instead of Framer's
                         whileHover/whileTap shorthand, which runs on the main
                         thread via rAF and drops frames under load. */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-12 sm:h-11 mt-3 flex items-center justify-center gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] active:bg-white/[0.1] active:scale-[0.98] text-[13px] sm:text-[12px] font-medium text-neutral-300 transition-[transform,background-color,border-color] duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
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
