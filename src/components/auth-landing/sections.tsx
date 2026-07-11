import * as React from 'react';
import { Link } from 'react-router-dom';
import Constellation from './Constellation';

/**
 * Auth landing — "The Ascent". Section components + page CSS.
 *
 * Design language (from Joshua's reference board + the product's bronze and
 * orbital identity): near-black warm void, one incandescent ember light,
 * Fraunces display serif with true italics, IBM Plex Mono schematic
 * annotations, hairline rules, glass panels. All copy is LSAT U's own,
 * warm-coach voice, truthful. No em dashes anywhere.
 */

// ── Palette / tokens ─────────────────────────────────────────────────────────
export const VOID = {
  bg: '#070605',
  bone: '#EDE7DA',
  boneSec: '#A79F91',
  boneMut: '#847D70',
  ember: '#E8A44C',
  emberBright: '#FFCB7C',
  emberDeep: '#8A5A2B',
  hairline: 'rgba(237,231,218,0.09)',
  hairlineStrong: 'rgba(237,231,218,0.18)',
  glass: 'rgba(255,255,255,0.03)',
  serif: '"Fraunces", "Iowan Old Style", "Times New Roman", serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", monospace',
  sans: '"Outfit", -apple-system, system-ui, sans-serif',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

const T = VOID;

// ── Page CSS — injected once by Auth.tsx ─────────────────────────────────────
export const LANDING_CSS = `
  .lsx { background: ${T.bg}; color: ${T.bone}; font-family: ${T.sans}; min-height: 100vh; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-x: clip; }
  .lsx * { box-sizing: border-box; }
  .lsx ::selection { background: rgba(232,164,76,0.30); color: ${T.bone}; }
  .lsx a { color: inherit; text-decoration: none; }
  .lsx h1, .lsx h2, .lsx h3 { font-family: ${T.serif}; font-weight: 480; letter-spacing: -0.02em; color: ${T.bone}; margin: 0; }
  .lsx p { margin: 0; }
  .lsx .lsx-content { position: relative; z-index: 1; }

  /* ── Type roles ── */
  .lsx .lsx-eyebrow { font-family: ${T.mono}; font-size: 11px; font-weight: 500; letter-spacing: 0.34em; text-transform: uppercase; color: ${T.ember}; }
  .lsx .lsx-annot { font-family: ${T.mono}; font-size: 10px; font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase; color: ${T.boneMut}; }
  .lsx .lsx-rule { height: 1px; background: ${T.hairline}; border: 0; margin: 0; }

  /* ── Reveal on scroll: blur + rise, staggered children ── */
  .lsx .vr { opacity: 0; transform: translateY(18px); filter: blur(12px); transition: opacity 800ms ${T.easeOut}, transform 800ms ${T.easeOut}, filter 800ms ${T.easeOut}; }
  .lsx .vr.is-in { opacity: 1; transform: translateY(0); filter: blur(0); }
  .lsx .vr-stagger > * { opacity: 0; transform: translateY(16px); filter: blur(10px); transition: opacity 700ms ${T.easeOut}, transform 700ms ${T.easeOut}, filter 700ms ${T.easeOut}; }
  .lsx .vr.is-in .vr-stagger > *, .lsx .vr.is-in.vr-stagger > * { opacity: 1; transform: none; filter: blur(0); }
  .lsx .vr.is-in .vr-stagger > *:nth-child(1), .lsx .vr.is-in.vr-stagger > *:nth-child(1) { transition-delay: 60ms; }
  .lsx .vr.is-in .vr-stagger > *:nth-child(2), .lsx .vr.is-in.vr-stagger > *:nth-child(2) { transition-delay: 170ms; }
  .lsx .vr.is-in .vr-stagger > *:nth-child(3), .lsx .vr.is-in.vr-stagger > *:nth-child(3) { transition-delay: 280ms; }
  .lsx .vr.is-in .vr-stagger > *:nth-child(4), .lsx .vr.is-in.vr-stagger > *:nth-child(4) { transition-delay: 390ms; }
  .lsx .vr.is-in .vr-stagger > *:nth-child(5), .lsx .vr.is-in.vr-stagger > *:nth-child(5) { transition-delay: 500ms; }
  .lsx .vr.is-in .vr-stagger > *:nth-child(6), .lsx .vr.is-in.vr-stagger > *:nth-child(6) { transition-delay: 610ms; }

  /* ── Hero glyph choreography ── */
  .lsx .lsx-glyph { display: inline-block; opacity: 0; transform: translateY(0.35em) rotate(2.2deg); filter: blur(8px); animation: lsxGlyph 900ms ${T.easeOut} forwards; }
  @keyframes lsxGlyph { to { opacity: 1; transform: translateY(0) rotate(0); filter: blur(0); } }
  .lsx .lsx-hero-sub { opacity: 0; animation: lsxFade 1100ms ${T.easeOut} 900ms forwards; }
  .lsx .lsx-hero-cta { opacity: 0; animation: lsxFade 1100ms ${T.easeOut} 1150ms forwards; }
  .lsx .lsx-hero-annot { opacity: 0; animation: lsxFade 1400ms ${T.easeOut} 1500ms forwards; }
  @keyframes lsxFade { to { opacity: 1; } }

  /* ── Nav ── */
  .lsx .lsx-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 40; transition: background 400ms ${T.easeOut}, border-color 400ms ${T.easeOut}, backdrop-filter 400ms ${T.easeOut}; border-bottom: 1px solid transparent; }
  .lsx .lsx-nav.is-scrolled { background: rgba(7,6,5,0.72); backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%); border-bottom-color: ${T.hairline}; }
  .lsx .lsx-nav-inner { max-width: 1280px; margin: 0 auto; padding: 20px 36px; display: flex; align-items: center; justify-content: space-between; }
  .lsx .lsx-wordmark { font-family: ${T.serif}; font-size: 21px; font-weight: 520; letter-spacing: -0.02em; color: ${T.bone}; display: inline-flex; align-items: baseline; gap: 7px; }
  .lsx .lsx-wordmark em { font-style: italic; font-weight: 420; color: ${T.ember}; }
  .lsx .lsx-nav-signin { min-height: 44px; display: inline-flex; align-items: center; padding: 8px 20px; border: 1px solid ${T.hairlineStrong}; border-radius: 999px; background: transparent; color: ${T.bone}; font-family: ${T.sans}; font-size: 13.5px; font-weight: 500; letter-spacing: 0.01em; cursor: pointer; transition: border-color 240ms ${T.easeOut}, background 240ms ${T.easeOut}, color 240ms ${T.easeOut}, transform 240ms ${T.easeOut}; }
  .lsx .lsx-nav-signin:active { transform: scale(0.97); transition-duration: 80ms; }
  .lsx .lsx-nav-signin:focus-visible { outline: 2px solid ${T.ember}; outline-offset: 3px; }

  /* ── Primary CTA — molten pill ── */
  .lsx .lsx-cta { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 13px; height: 60px; padding: 0 20px 0 32px; border-radius: 999px; border: 1px solid rgba(232,164,76,0.36); background: linear-gradient(180deg, rgba(232,164,76,0.16), rgba(232,164,76,0.05)); color: ${T.bone}; font-family: ${T.sans}; font-size: 15.5px; font-weight: 500; letter-spacing: 0.01em; cursor: pointer; overflow: hidden; transition: transform 260ms ${T.easeOut}, border-color 260ms ${T.easeOut}, box-shadow 260ms ${T.easeOut}, background 260ms ${T.easeOut}; box-shadow: 0 0 0 0 rgba(232,164,76,0), inset 0 1px 0 rgba(255,255,255,0.07); }
  .lsx .lsx-cta::before { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255,203,124,0.16) 50%, transparent 80%); transform: translateX(-110%); transition: transform 700ms ${T.easeOut}; pointer-events: none; }
  .lsx .lsx-cta:active { transform: scale(0.975); transition-duration: 80ms; }
  .lsx .lsx-cta:focus-visible { outline: 2px solid ${T.ember}; outline-offset: 4px; }
  .lsx .lsx-cta-puck { width: 30px; height: 30px; border-radius: 999px; background: rgba(232,164,76,0.22); border: 1px solid rgba(232,164,76,0.30); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 260ms ${T.easeOut}, background 260ms ${T.easeOut}; }
  .lsx .lsx-cta-puck svg { width: 12px; height: 12px; color: ${T.emberBright}; }
  .lsx .lsx-cta-secondary { background: transparent; border: 0; padding: 10px 6px; font-family: ${T.sans}; font-size: 13px; font-weight: 450; color: #C4BCAD; cursor: pointer; letter-spacing: 0.01em; transition: color 200ms ${T.easeOut}; text-shadow: 0 1px 10px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.6); }
  .lsx .lsx-cta-secondary u { text-decoration-color: rgba(232,164,76,0.5); text-underline-offset: 4px; text-decoration-thickness: 1px; }
  .lsx .lsx-cta-secondary:focus-visible { outline: 2px solid ${T.ember}; outline-offset: 3px; border-radius: 4px; }

  @media (hover: hover) and (pointer: fine) {
    .lsx .lsx-nav-signin:hover { border-color: rgba(232,164,76,0.55); color: ${T.emberBright}; background: rgba(232,164,76,0.07); }
    .lsx .lsx-cta:hover { transform: translateY(-2px); border-color: rgba(232,164,76,0.65); box-shadow: 0 14px 44px -10px rgba(232,164,76,0.36), inset 0 1px 0 rgba(255,255,255,0.10); background: linear-gradient(180deg, rgba(232,164,76,0.24), rgba(232,164,76,0.08)); }
    .lsx .lsx-cta:hover::before { transform: translateX(110%); }
    .lsx .lsx-cta:hover .lsx-cta-puck { transform: translateX(3px); background: rgba(232,164,76,0.34); }
    .lsx .lsx-cta-secondary:hover { color: ${T.bone}; }
  }

  /* ── Hero ── */
  .lsx .lsx-hero { position: relative; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 28px 140px; }
  .lsx .lsx-hero h1 { font-size: clamp(52px, 9.2vw, 128px); line-height: 0.96; letter-spacing: -0.035em; font-weight: 460; margin: 30px 0 0; }
  /* Gradient is clipped per glyph (not on the parent): the animated glyph
     spans create stacking contexts that break an ancestor's background-clip. */
  .lsx .lsx-hero h1 .it { font-style: italic; font-weight: 380; color: #D9BE8C; }
  .lsx .lsx-hero h1 .it .lsx-glyph { color: transparent; background: linear-gradient(168deg, #E8CFA0 8%, ${T.emberBright} 46%, #A08B66 96%); -webkit-background-clip: text; background-clip: text; }
  .lsx .lsx-hero-tag { font-family: ${T.serif}; font-style: italic; font-weight: 400; font-size: clamp(17px, 1.9vw, 22px); color: ${T.boneSec}; margin-top: 26px; letter-spacing: 0.005em; }
  .lsx .lsx-hero-note { font-family: ${T.mono}; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: #98917F; margin-top: 26px; text-shadow: 0 1px 10px rgba(0,0,0,0.85), 0 0 24px rgba(0,0,0,0.6); }
  .lsx .lsx-hero-corner { position: absolute; font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: ${T.boneMut}; display: flex; flex-direction: column; gap: 6px; text-align: left; }
  .lsx .lsx-scrollcue { position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; color: ${T.boneMut}; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; }
  .lsx .lsx-scrollcue-line { width: 1px; height: 44px; background: linear-gradient(to bottom, transparent, ${T.hairlineStrong}); overflow: hidden; position: relative; }
  .lsx .lsx-scrollcue-line::after { content: ''; position: absolute; top: -40%; left: 0; width: 100%; height: 40%; background: ${T.ember}; animation: lsxDrip 2.6s ${T.easeOut} infinite; }
  @keyframes lsxDrip { 0% { top: -40%; } 60%, 100% { top: 110%; } }

  /* ── Section shell ── */
  .lsx .lsx-section { position: relative; max-width: 1280px; margin: 0 auto; padding: clamp(84px, 11vw, 160px) 36px; }
  .lsx .lsx-center { text-align: center; }
  .lsx .lsx-h2 { font-size: clamp(34px, 4.6vw, 62px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 460; }
  .lsx .lsx-h2 .it { font-style: italic; font-weight: 380; color: ${T.boneSec}; }
  .lsx .lsx-body { font-size: 16.5px; line-height: 1.65; color: ${T.boneSec}; font-weight: 350; }

  /* ── Chapters ── */
  .lsx .lsx-chapter { display: grid; grid-template-columns: 1fr; gap: clamp(30px, 4vw, 64px); align-items: center; }
  @media (min-width: 880px) {
    .lsx .lsx-chapter { grid-template-columns: 5fr 7fr; }
    .lsx .lsx-chapter.is-rev .lsx-chapter-copy { order: 2; }
    .lsx .lsx-chapter.is-rev .lsx-chapter-media { order: 1; }
  }
  .lsx .lsx-chapter-num { font-family: ${T.serif}; font-style: italic; font-size: 15px; color: ${T.ember}; letter-spacing: 0.04em; }
  .lsx .lsx-chapter h3 { font-size: clamp(30px, 3.6vw, 50px); line-height: 1.04; letter-spacing: -0.028em; font-weight: 470; margin: 14px 0 18px; }
  .lsx .lsx-chapter .lsx-body { max-width: 430px; }
  .lsx .lsx-figure { position: relative; margin: 0; border-radius: 14px; overflow: hidden; border: 1px solid ${T.hairline}; background: #0A0908; aspect-ratio: 16 / 9; transform-style: preserve-3d; transition: border-color 400ms ${T.easeOut}, box-shadow 400ms ${T.easeOut}; box-shadow: 0 30px 80px -30px rgba(0,0,0,0.8); }
  .lsx .lsx-figure img, .lsx .lsx-figure video { position: absolute; inset: -6% 0; width: 100%; height: 112%; object-fit: cover; display: block; will-change: transform; }
  .lsx .lsx-figure-glare { position: absolute; inset: 0; background: radial-gradient(120% 90% at var(--gx, 50%) var(--gy, 0%), rgba(255,203,124,0.10), transparent 55%); opacity: 0; transition: opacity 400ms ${T.easeOut}; pointer-events: none; }
  .lsx .lsx-figure-tag { position: absolute; left: 14px; bottom: 12px; z-index: 2; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(237,231,218,0.75); background: rgba(7,6,5,0.55); border: 1px solid ${T.hairline}; padding: 6px 10px; border-radius: 999px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  @media (hover: hover) and (pointer: fine) {
    .lsx .lsx-figure:hover { border-color: rgba(232,164,76,0.35); box-shadow: 0 34px 90px -26px rgba(0,0,0,0.9), 0 0 60px -22px rgba(232,164,76,0.35); }
    .lsx .lsx-figure:hover .lsx-figure-glare { opacity: 1; }
  }

  /* ── Constellation section ── */
  .lsx .lsx-orbit-wrap { position: relative; }
  .lsx .lsx-orbit-caption { display: block; text-align: center; margin-top: 18px; }

  /* ── Marquee ── */
  .lsx .lsx-marquee-band { border-top: 1px solid ${T.hairline}; border-bottom: 1px solid ${T.hairline}; padding: 26px 0; background: rgba(255,255,255,0.012); }
  .lsx .lsx-marquee { position: relative; overflow: hidden; -webkit-mask-image: linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%); mask-image: linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%); }
  .lsx .lsx-marquee-track { display: inline-flex; white-space: nowrap; animation: lsxMarquee 70s linear infinite; will-change: transform; }
  .lsx .lsx-marquee:hover .lsx-marquee-track { animation-play-state: paused; }
  .lsx .lsx-marquee-item { display: inline-flex; align-items: center; gap: 16px; padding: 0 20px; font-family: ${T.serif}; font-size: 19px; font-style: italic; font-weight: 420; letter-spacing: -0.005em; color: ${T.boneSec}; }
  .lsx .lsx-marquee-dot { width: 4px; height: 4px; border-radius: 999px; background: ${T.ember}; opacity: 0.7; box-shadow: 0 0 8px rgba(232,164,76,0.8); }
  @keyframes lsxMarquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }

  /* ── Habit cards ── */
  .lsx .lsx-carousel-wrap { position: relative; -webkit-mask-image: linear-gradient(to right, black 0, black 94%, transparent 100%); mask-image: linear-gradient(to right, black 0, black 94%, transparent 100%); }
  .lsx .lsx-carousel { display: flex; gap: 18px; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-padding-inline: 36px; padding: 6px 36px 40px; scrollbar-width: none; -ms-overflow-style: none; cursor: grab; }
  .lsx .lsx-carousel:active { cursor: grabbing; }
  .lsx .lsx-carousel::-webkit-scrollbar { display: none; }
  .lsx .lsx-card { scroll-snap-align: start; flex: 0 0 330px; border: 1px solid ${T.hairline}; border-radius: 16px; background: linear-gradient(165deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012)); padding: 30px 26px 28px; display: flex; flex-direction: column; gap: 14px; min-height: 250px; transition: transform 320ms ${T.easeOut}, border-color 320ms ${T.easeOut}, box-shadow 320ms ${T.easeOut}; }
  .lsx .lsx-card-kicker { font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.ember}; }
  .lsx .lsx-card-title { font-family: ${T.serif}; font-size: 26px; font-weight: 460; line-height: 1.08; letter-spacing: -0.02em; color: ${T.bone}; }
  .lsx .lsx-card-body { font-size: 14px; line-height: 1.6; color: ${T.boneSec}; font-weight: 350; margin-top: auto; }
  @media (hover: hover) and (pointer: fine) {
    .lsx .lsx-card:hover { transform: translateY(-4px); border-color: rgba(232,164,76,0.3); box-shadow: 0 20px 50px -20px rgba(0,0,0,0.8), 0 0 40px -18px rgba(232,164,76,0.25); }
  }
  .lsx .lsx-carousel-cue { display: flex; align-items: center; gap: 14px; padding: 0 36px 10px; color: ${T.boneMut}; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.26em; text-transform: uppercase; }
  .lsx .lsx-carousel-cue-line { flex: 1; height: 1px; background: ${T.hairline}; }

  /* ── Pillars ── */
  .lsx .lsx-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); border-top: 1px solid ${T.hairline}; }
  .lsx .lsx-pillar { padding: 44px 30px; border-bottom: 1px solid ${T.hairline}; }
  .lsx .lsx-pillar + .lsx-pillar { border-left: 1px solid ${T.hairline}; }
  @media (max-width: 880px) { .lsx .lsx-pillar + .lsx-pillar { border-left: 0; } }
  .lsx .lsx-pillar-num { font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.3em; color: ${T.ember}; margin-bottom: 18px; }
  .lsx .lsx-pillar h3 { font-size: 25px; font-weight: 470; letter-spacing: -0.02em; line-height: 1.12; margin-bottom: 12px; }
  .lsx .lsx-pillar p { font-size: 14.5px; line-height: 1.62; color: ${T.boneSec}; font-weight: 350; }

  /* ── Credo ── */
  .lsx .lsx-credo { font-family: ${T.serif}; font-style: italic; font-weight: 430; font-size: clamp(26px, 3.5vw, 44px); line-height: 1.22; letter-spacing: -0.02em; color: ${T.bone}; }
  .lsx .lsx-credo strong { font-weight: 500; color: ${T.emberBright}; font-style: italic; }

  /* ── Final ── */
  .lsx .lsx-final { position: relative; text-align: center; padding: clamp(110px, 14vw, 200px) 28px; overflow: hidden; }
  .lsx .lsx-final-media { position: absolute; inset: 0; z-index: 0; }
  .lsx .lsx-final-media img, .lsx .lsx-final-media video { width: 100%; height: 100%; object-fit: cover; object-position: center 62%; display: block; opacity: 0.9; }
  .lsx .lsx-final-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, ${T.bg} 2%, rgba(7,6,5,0.25) 45%, rgba(7,6,5,0.55) 100%); }
  .lsx .lsx-final-inner { position: relative; z-index: 1; }
  .lsx .lsx-final h2 { font-size: clamp(44px, 7vw, 104px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 460; margin-bottom: 34px; text-shadow: 0 4px 60px rgba(0,0,0,0.6); }
  .lsx .lsx-final h2 .it { font-style: italic; font-weight: 380; color: ${T.emberBright}; }

  /* ── Footer ── */
  .lsx footer { border-top: 1px solid ${T.hairline}; padding: 34px 36px; }
  .lsx .lsx-footer-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .lsx .lsx-footer-inner span { font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.boneMut}; }
  .lsx .lsx-footer-inner .serif { font-family: ${T.serif}; font-style: italic; text-transform: none; letter-spacing: 0.01em; font-size: 13px; color: ${T.boneSec}; }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .lsx .vr, .lsx .vr-stagger > * { opacity: 1; transform: none; filter: none; transition: none; }
    .lsx .lsx-glyph, .lsx .lsx-hero-sub, .lsx .lsx-hero-cta, .lsx .lsx-hero-annot { animation: none; opacity: 1; transform: none; filter: none; }
    .lsx .lsx-marquee-track { animation: none; }
    .lsx .lsx-scrollcue-line::after { animation: none; }
    .lsx .lsx-cta, .lsx .lsx-cta-puck, .lsx .lsx-card, .lsx .lsx-figure, .lsx .lsx-nav-signin { transition: none; }
  }

  /* ── Small screens ── */
  @media (max-width: 720px) {
    .lsx .lsx-nav-inner { padding: 16px 22px; }
    .lsx .lsx-section { padding-left: 22px; padding-right: 22px; }
    .lsx .lsx-hero { padding: 100px 20px 120px; }
    .lsx .lsx-hero-corner { display: none; }
    .lsx .lsx-card { flex: 0 0 280px; min-height: 230px; }
    .lsx .lsx-carousel { scroll-padding-inline: 22px; padding-left: 22px; padding-right: 22px; }
    .lsx .lsx-carousel-cue { padding-left: 22px; padding-right: 22px; }
    .lsx .lsx-cta { height: 56px; font-size: 14.5px; padding: 0 16px 0 26px; }
    .lsx footer { padding: 28px 22px; }
  }
`;

// ── Scroll reveal hook ───────────────────────────────────────────────────────
// `active` re-arms the observer when the landing actually renders — the page
// can first mount as a loading panel (OAuth return leg), and a mount-only
// effect would leave every .vr section invisible afterward.
export function useReveal(active: boolean = true) {
  React.useEffect(() => {
    if (!active) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.lsx .vr'));
    if (reduced) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const vh = window.innerHeight;
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 || rect.bottom < 0) el.classList.add('is-in');
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
    els.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
    return () => io.disconnect();
  }, [active]);
}

// ── Drag-to-scroll (mouse) for the habit carousel ───────────────────────────
export function useDragScroll(ref: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    const onDown = (e: MouseEvent) => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
    const onUpLeave = () => { isDown = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.4;
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseleave', onUpLeave);
    el.addEventListener('mouseup', onUpLeave);
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseleave', onUpLeave);
      el.removeEventListener('mouseup', onUpLeave);
      el.removeEventListener('mousemove', onMove);
    };
  }, [ref]);
}

// ── Figure parallax + cursor glare ──────────────────────────────────────────
// Inner media drifts vertically with scroll (±5%); a warm glare follows the
// cursor. Both gated on reduced motion / pointer capability.
function useFigureMotion(figRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const media = fig.querySelector('img, video') as HTMLElement | null;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!media) return;
        const rect = fig.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5..0.5
        media.style.transform = `translateY(${(-progress * 8).toFixed(2)}%)`;
      });
    };
    const onPointer = (e: PointerEvent) => {
      const rect = fig.getBoundingClientRect();
      fig.style.setProperty('--gx', `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      fig.style.setProperty('--gy', `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    fig.addEventListener('pointermove', onPointer, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      fig.removeEventListener('pointermove', onPointer);
    };
  }, [figRef]);
}

// ── Video lifecycle — play while in view, pause when off-screen ─────────────
// autoplay alone is fragile (browsers pause background media, and a paused
// loop never resumes). An observer owns playback instead.
function useAutoplayInView(ref: React.RefObject<HTMLVideoElement>) {
  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let inView = false;
    const tryPlay = () => { if (inView && v.paused) v.play().catch(() => {}); };
    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? false;
      if (inView) tryPlay();
      else if (!v.paused) v.pause();
    }, { rootMargin: '60px' });
    io.observe(v);
    document.addEventListener('visibilitychange', tryPlay);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', tryPlay);
    };
  }, [ref]);
}

// ── Content ─────────────────────────────────────────────────────────────────
export const QUESTION_TYPES = [
  'Necessary Assumption', 'Strengthen', 'Weaken', 'Main Conclusion',
  'Flaw in the Reasoning', 'Principle', 'Parallel Reasoning', 'Resolve the Paradox',
  'Inference', 'Method of Reasoning', 'Sufficient Assumption', 'Role in Argument',
];

const HABITS: Array<{ kicker: string; title: string; body: string }> = [
  { kicker: '01 · Anatomy',  title: 'Find the argument.',    body: 'Every argument is a premise, a conclusion, and the bridge between them. Once you can see that shape on sight, the whole question slows down for you.' },
  { kicker: '02 · Bridge',   title: 'Test the gap.',         body: 'Strengthen and Weaken questions live in the gap between premise and conclusion. Train your eye on that gap first, and the right answer gets a lot easier to spot.' },
  { kicker: '03 · Failure',  title: 'Spot the flaw.',        body: 'Most arguments break in the same handful of ways. Learn that short list, and the flaws start jumping out at you instead of hiding.' },
  { kicker: '04 · Stems',    title: 'Read the stem first.',  body: 'The question stem tells you what to look for. Read it first, every time, so you go into the stimulus knowing exactly what you are hunting.' },
  { kicker: '05 · Patterns', title: 'Hunt patterns.',        body: 'The same few patterns show up across dozens of questions. Once you start recognizing them, you stop solving from scratch and start moving fast.' },
  { kicker: '06 · Pace',     title: 'Slow now, fast later.', body: 'Speed is not something you force. Go slow now and build the instinct, and the speed shows up on its own when it counts.' },
];

const PILLARS: Array<{ title: string; body: string }> = [
  { title: 'Adaptive drilling.',   body: 'Your weakest question types come up first, on purpose. We spend your time where the points actually are, not where it feels comfortable.' },
  { title: 'A coach in the page.', body: 'Coaching is built into every drill. You get feedback right at the moment you would normally trip, so you learn the fix while it still matters.' },
  { title: 'Real numbers, only.',  body: 'No leaderboards. No vanity streaks. Every number you see is real, tracked over time, and tied to your actual progress.' },
];

type Chapter = {
  num: string; kicker: string; title: string; body: string;
  img: string; video?: string; tag: string; detail: string; reverse?: boolean;
};

const CHAPTERS: Chapter[] = [
  {
    num: 'I', kicker: 'Practice', title: 'Smart LR Drill',
    body: 'One beam in, the right rays out. An adaptive engine reads your misses and serves the next question that actually moves your score, not busywork.',
    img: '/auth/prism.jpg', tag: 'Adaptive selection · live',
    detail: 'Input: your misses · Output: your next question',
  },
  {
    num: 'II', kicker: 'Review', title: 'Wrong Answer Journal',
    body: 'One miss, and the lesson ripples outward. Every wrong answer becomes a worked example: why the trap worked, what the right read was, and the pattern to watch for next time.',
    img: '/auth/ripple.jpg', video: '/auth/ripple-loop.mp4', tag: 'One miss · one lesson', reverse: true,
    detail: 'The trap · the right read · the pattern',
  },
  {
    num: 'III', kicker: 'Curriculum', title: 'Guided bootcamps',
    body: 'The climb is built for you. Structured, voice-led courses that build one reasoning skill at a time, from Main Conclusion outward.',
    img: '/auth/stair.jpg', tag: 'One skill at a time',
    detail: 'Main Conclusion first · then the whole family',
  },
  {
    num: 'IV', kicker: 'Plan', title: 'A schedule that adapts',
    body: 'Your weeks in orbit around one date. A plan tuned to your test date and your data, so you always know the next right thing to do.',
    img: '/auth/orbits.jpg', tag: 'Tuned to your test date', reverse: true,
    detail: 'Your test date · your data · your week',
  },
];

// ── Components ───────────────────────────────────────────────────────────────

export const LsxNav = ({ onSignIn }: { onSignIn: () => void }) => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className={`lsx-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="lsx-nav-inner">
        <Link to="/" className="lsx-wordmark" aria-label="LSAT U home">
          LSAT<em>U</em>
        </Link>
        <button type="button" className="lsx-nav-signin" onClick={onSignIn}>
          Sign in
        </button>
      </div>
    </nav>
  );
};

// Words are kept whole (white-space: nowrap per word) so the per-glyph spans
// never let the browser break a line mid-word on narrow screens.
const Glyphs = ({ text, base = 0 }: { text: string; base?: number }) => {
  let glyphIndex = 0;
  return (
    <>
      {text.split(' ').map((word, w) => {
        const start = glyphIndex;
        glyphIndex += word.length;
        return (
          <React.Fragment key={w}>
            {w > 0 && ' '}
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
              {Array.from(word).map((ch, i) => (
                <span key={i} className="lsx-glyph" style={{ animationDelay: `${base + (start + i) * 34}ms` }}>
                  {ch}
                </span>
              ))}
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const LsxHero = ({ onCTA, onSignUp }: { onCTA: () => void; onSignUp: () => void }) => (
  <header className="lsx-hero">
    <div className="lsx-hero-corner" style={{ top: 108, left: 36 }} aria-hidden="true">
      <span>Logical Reasoning</span>
      <span>Score band 120 – 180</span>
    </div>
    <div className="lsx-hero-corner" style={{ top: 108, right: 36, textAlign: 'right' }} aria-hidden="true">
      <span>35:00 per section</span>
      <span>lsatprep.study</span>
    </div>

    <span className="lsx-eyebrow lsx-glyph" style={{ animationDelay: '0ms' }}>
      For aspiring attorneys
    </span>
    <h1>
      <span className="sr-only">Master the LSAT. Own your future.</span>
      <span aria-hidden="true">
        <Glyphs text="Master the LSAT." base={220} />
        <br />
        <span className="it">
          <Glyphs text="Own your future." base={760} />
        </span>
      </span>
    </h1>
    <p className="lsx-hero-tag lsx-hero-sub">Clearer thinking, higher scores.</p>
    <div className="lsx-hero-cta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 44 }}>
      <button className="lsx-cta" onClick={onCTA}>
        Enter LSAT University
        <span aria-hidden="true" className="lsx-cta-puck">
          <svg viewBox="0 0 12 12" fill="none">
            <path d="M2 6h7.5M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <button type="button" className="lsx-cta-secondary" onClick={onSignUp}>
        Or <u>create an account</u>
      </button>
      <p className="lsx-hero-note">Email or Google · No credit card to start</p>
    </div>

    <div className="lsx-scrollcue lsx-hero-annot" aria-hidden="true">
      <span className="lsx-scrollcue-line" />
      <span>Descend</span>
    </div>
  </header>
);

export const LsxOrbits = () => (
  <section className="lsx-section lsx-center vr" aria-label="What you train">
    <div className="vr-stagger">
      <span className="lsx-eyebrow">What you train</span>
      <h2 className="lsx-h2" style={{ marginTop: 22 }}>
        Twelve ways an argument turns.<br />
        <span className="it">One eye for all of them.</span>
      </h2>
      <p className="lsx-body" style={{ maxWidth: 560, margin: '20px auto 0' }}>
        Every Logical Reasoning question is one of a dozen moves: {QUESTION_TYPES.slice(0, 4).join(', ').toLowerCase()},
        and the rest of the family. We train them until you recognize the move before you finish the stem.
      </p>
    </div>
    <div className="lsx-orbit-wrap vr" style={{ marginTop: 8 }}>
      <Constellation height={620} />
      <span className="lsx-annot lsx-orbit-caption" aria-hidden="true">Fig. 01 · The Logical Reasoning system</span>
    </div>
  </section>
);

const LsxChapterFigure = ({ ch, reducedPoster }: { ch: Chapter; reducedPoster: boolean }) => {
  const figRef = React.useRef<HTMLElement>(null);
  const vidRef = React.useRef<HTMLVideoElement>(null);
  useFigureMotion(figRef);
  useAutoplayInView(vidRef);
  return (
    <figure ref={figRef as React.RefObject<HTMLElement>} className="lsx-figure">
      {ch.video && !reducedPoster ? (
        <video ref={vidRef} src={ch.video} poster={ch.img} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      ) : (
        <img src={ch.img} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      )}
      <span className="lsx-figure-glare" aria-hidden="true" />
      <figcaption className="lsx-figure-tag">{ch.tag}</figcaption>
    </figure>
  );
};

export const LsxChapters = () => {
  const reducedPoster = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <>
      {CHAPTERS.map((ch) => (
        <section key={ch.num} className="lsx-section vr" aria-label={ch.title}>
          <div className={`lsx-chapter vr-stagger${ch.reverse ? ' is-rev' : ''}`}>
            <div className="lsx-chapter-copy">
              <span className="lsx-chapter-num" aria-hidden="true">Chapter {ch.num}</span>
              <div className="lsx-eyebrow" style={{ marginTop: 12 }}>{ch.kicker}</div>
              <h3>{ch.title}</h3>
              <p className="lsx-body">{ch.body}</p>
              <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.hairline}`, maxWidth: 430 }}>
                <span className="lsx-annot">{ch.detail}</span>
              </div>
            </div>
            <div className="lsx-chapter-media">
              <LsxChapterFigure ch={ch} reducedPoster={reducedPoster} />
            </div>
          </div>
        </section>
      ))}
    </>
  );
};

export const LsxMarquee = () => {
  const items = [...QUESTION_TYPES, ...QUESTION_TYPES];
  return (
    <section className="lsx-marquee-band vr" aria-label="Question types marquee">
      <div className="lsx-marquee" aria-hidden="true">
        <div className="lsx-marquee-track">
          {items.map((q, i) => (
            <span key={i} className="lsx-marquee-item">
              <span className="lsx-marquee-dot" />
              {q}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export const LsxHabits = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  useDragScroll(ref);
  return (
    <section className="vr" style={{ padding: 'clamp(84px, 11vw, 150px) 0 40px', maxWidth: 1280, margin: '0 auto' }} aria-label="Training habits">
      <div className="vr-stagger lsx-center" style={{ padding: '0 36px', marginBottom: 46 }}>
        <span className="lsx-eyebrow">Six habits, one rhythm</span>
        <h2 className="lsx-h2" style={{ marginTop: 22 }}>
          The training, <span className="it">distilled.</span>
        </h2>
        <p className="lsx-body" style={{ maxWidth: 580, margin: '20px auto 0' }}>
          The LSAT really comes down to a small set of habits, practiced until they are second nature.
          These are the ones we build together, one drill at a time, until they stop feeling like work
          and just become how you read.
        </p>
      </div>
      <div className="lsx-carousel-cue" aria-hidden="true">
        <span>Scroll</span>
        <span className="lsx-carousel-cue-line" />
        <span>Drag · or trackpad</span>
      </div>
      <div className="lsx-carousel-wrap">
        <div ref={ref} className="lsx-carousel" role="list" aria-label="LSAT training habits">
          {HABITS.map((p) => (
            <article key={p.kicker} className="lsx-card" role="listitem">
              <div className="lsx-card-kicker">{p.kicker}</div>
              <div className="lsx-card-title">{p.title}</div>
              <div className="lsx-card-body">{p.body}</div>
            </article>
          ))}
          <article
            className="lsx-card"
            role="listitem"
            style={{ background: 'linear-gradient(165deg, rgba(232,164,76,0.16), rgba(232,164,76,0.04))', borderColor: 'rgba(232,164,76,0.3)' }}
          >
            <div className="lsx-card-kicker">Begin →</div>
            <div className="lsx-card-title">Ready when you are.</div>
            <div className="lsx-card-body" style={{ color: 'rgba(237,231,218,0.8)' }}>
              These habits only stick once you start drilling them. Sign in and let’s get to work.
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export const LsxPillars = () => (
  <section className="lsx-section vr" aria-label="Built for serious training">
    <div className="vr-stagger lsx-center" style={{ maxWidth: 780, margin: '0 auto 62px' }}>
      <span className="lsx-eyebrow">Built for serious training</span>
      <h2 className="lsx-h2" style={{ marginTop: 22 }}>
        It doesn’t just teach the test.<br />
        <span className="it">It trains the lawyer in you.</span>
      </h2>
    </div>
    <div className="lsx-pillars">
      {PILLARS.map((p, i) => (
        <div key={p.title} className="lsx-pillar">
          <div className="lsx-pillar-num">{String(i + 1).padStart(2, '0')}</div>
          <h3>{p.title}</h3>
          <p>{p.body}</p>
        </div>
      ))}
    </div>
  </section>
);

export const LsxCredo = ({ onPrimary }: { onPrimary: () => void }) => (
  <section className="lsx-section lsx-center vr" aria-label="A statement of intent">
    <div className="vr-stagger" style={{ maxWidth: 860, margin: '0 auto' }}>
      <span className="lsx-eyebrow">A statement of intent</span>
      <p className="lsx-credo" style={{ margin: '30px 0 34px' }}>
        “LSAT U is the prep we wish every aspiring attorney had: practice, review, and
        <strong> real progress</strong> in one place, all pointed at the score you actually want.”
      </p>
      <button className="lsx-cta" onClick={onPrimary} style={{ height: 52, fontSize: 14.5 }}>
        Begin training
        <span aria-hidden="true" className="lsx-cta-puck" style={{ width: 26, height: 26 }}>
          <svg viewBox="0 0 12 12" fill="none">
            <path d="M2 6h7.5M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  </section>
);

export const LsxFinal = ({ onPrimary }: { onPrimary: () => void }) => {
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vidRef = React.useRef<HTMLVideoElement>(null);
  useAutoplayInView(vidRef);
  return (
    <section className="lsx-final vr" aria-label="Begin">
      <div className="lsx-final-media" aria-hidden="true">
        {reduced ? (
          <img src="/auth/hero.jpg" alt="" loading="lazy" decoding="async" />
        ) : (
          <video ref={vidRef} src="/auth/hero-loop.mp4" poster="/auth/hero.jpg" autoPlay muted loop playsInline preload="metadata" />
        )}
      </div>
      <div className="lsx-final-inner vr-stagger">
        <h2>
          Sit down.<br />
          <span className="it">Begin.</span>
        </h2>
        <button className="lsx-cta" onClick={onPrimary}>
          Enter LSAT University
          <span aria-hidden="true" className="lsx-cta-puck">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2 6h7.5M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </section>
  );
};

export const LsxFooter = () => (
  <footer>
    <div className="lsx-footer-inner">
      <span className="serif">LSAT U · A training environment for aspiring attorneys.</span>
      <span>© {new Date().getFullYear()} · lsatprep.study</span>
    </div>
  </footer>
);
