import * as React from 'react';
import { Link } from 'react-router-dom';
import ParticleBust from './ParticleBust';
import { AcaDust, useMagnetic } from './fx';

/**
 * Auth landing — "The Academy".
 *
 * A museum nocturne: carved marble filmed in darkness, read by modern
 * instruments. Three material registers carry the whole page:
 *   STONE   — Fraunces display serif, generated sculpture film, engraved rules
 *   BRONZE  — Cinzel inscriptional capitals, gilded accents, the CTA tablets
 *   MACHINE — IBM Plex Mono annotations, cold cyan ticks, HUD brackets,
 *             and a three.js particle bust that assembles as you scroll
 * All copy is LSAT U's warm coach voice, truthful, no em dashes.
 */

// Shared neutral grounds and text; bronze, cyan and film retain their authored atmosphere.
// ── Tokens ───────────────────────────────────────────────────────────────────
export const ACA = {
  bg: 'var(--lsatu-surface-dark)',
  bg2: 'var(--lsatu-field-dark)',
  marble: 'var(--lsatu-text-on-dark)',
  marbleSec: '#babcb5',
  marbleMut: '#92988f',
  bronze: '#C6A467',
  bronzeBright: '#E8CF96',
  bronzeDeep: '#8A6F3E',
  cyan: '#8AD8E2',
  cyanBright: '#C3EEF4',
  hairline: 'rgba(239,237,230,0.09)',
  hairlineStrong: 'rgba(239,237,230,0.19)',
  bronzeLine: 'rgba(198,164,103,0.32)',
  cyanLine: 'rgba(138,216,226,0.35)',
  serif: '"Fraunces", "Iowan Old Style", "Times New Roman", serif',
  inscr: '"Cinzel", "Trajan Pro", "Times New Roman", serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", monospace',
  sans: '"Outfit", -apple-system, system-ui, sans-serif',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

const T = ACA;

// Film grain, inlined so it costs no request. Kept faint; it unifies the
// generated footage with the DOM around it.
const GRAIN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

// ── Page CSS — injected once by Auth.tsx ─────────────────────────────────────
export const ACADEMY_CSS = `
  .aca { background: ${T.bg}; color: ${T.marble}; font-family: ${T.sans}; min-height: 100vh; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-x: clip; }
  .aca * { box-sizing: border-box; }
  .aca ::selection { background: rgba(198,164,103,0.30); color: ${T.marble}; }
  .aca a { color: inherit; text-decoration: none; }
  .aca h1, .aca h2, .aca h3 { font-family: ${T.serif}; font-weight: 380; letter-spacing: -0.015em; color: ${T.marble}; margin: 0; }
  .aca p { margin: 0; }
  .aca .aca-content { position: relative; z-index: 1; }

  /* ── Fixed ambience: vault gradients + grain ── */
  .aca-ambience { position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(130% 90% at 50% -10%, rgba(29,24,18,0.9), transparent 60%),
      radial-gradient(90% 70% at 85% 105%, rgba(16,20,22,0.8), transparent 60%),
      ${T.bg}; }
  .aca-grain { position: fixed; inset: -60px; z-index: 55; pointer-events: none; background-image: ${GRAIN}; background-size: 160px 160px; opacity: 0.05; mix-blend-mode: overlay; }

  /* ── Type roles ── */
  .aca .aca-inscr { font-family: ${T.inscr}; font-weight: 500; font-size: 11.5px; letter-spacing: 0.42em; text-transform: uppercase; color: ${T.bronze}; text-indent: 0.42em; }
  .aca .aca-hero .aca-inscr, .aca .aca-justice .aca-inscr { color: ${T.bronzeBright}; text-shadow: 0 1px 14px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8); }
  .aca .aca-annot { font-family: ${T.mono}; font-size: 10px; font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase; color: ${T.marbleMut}; }
  .aca .aca-annot b { color: ${T.cyan}; font-weight: 400; }
  .aca .aca-rule { height: 1px; background: ${T.hairline}; border: 0; margin: 0; }

  /* ── Reveal on scroll ── */
  .aca .vr { opacity: 0; transform: translateY(22px); filter: blur(10px); transition: opacity 950ms ${T.easeOut}, transform 950ms ${T.easeOut}, filter 950ms ${T.easeOut}; }
  .aca .vr.is-in { opacity: 1; transform: translateY(0); filter: blur(0); }
  .aca .vr-stagger > * { opacity: 0; transform: translateY(16px); filter: blur(8px); transition: opacity 800ms ${T.easeOut}, transform 800ms ${T.easeOut}, filter 800ms ${T.easeOut}; }
  .aca .vr.is-in .vr-stagger > *, .aca .vr.is-in.vr-stagger > * { opacity: 1; transform: none; filter: blur(0); }
  ${[1, 2, 3, 4, 5, 6].map((i) => `.aca .vr.is-in .vr-stagger > *:nth-child(${i}), .aca .vr.is-in.vr-stagger > *:nth-child(${i}) { transition-delay: ${i * 110 - 50}ms; }`).join('\n  ')}

  /* ── Nav ── */
  .aca .aca-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 40; border-bottom: 1px solid transparent; transition: background 420ms ${T.easeOut}, border-color 420ms ${T.easeOut}; }
  .aca .aca-nav.is-scrolled { background: rgba(19,23,24,0.72); backdrop-filter: blur(18px) saturate(120%); -webkit-backdrop-filter: blur(18px) saturate(120%); border-bottom-color: ${T.hairline}; }
  .aca .aca-nav-inner { max-width: 1360px; margin: 0 auto; padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; }
  .aca .aca-wordmark { font-family: ${T.inscr}; font-weight: 500; font-size: 17px; letter-spacing: 0.34em; color: ${T.marble}; display: inline-flex; align-items: baseline; }
  .aca .aca-wordmark em { font-style: normal; color: ${T.bronze}; }
  .aca .aca-nav-signin { min-height: 44px; display: inline-flex; align-items: center; padding: 9px 24px; border: 1px solid ${T.hairlineStrong}; border-radius: 2px; background: transparent; color: ${T.marble}; font-family: ${T.sans}; font-size: 13px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: border-color 260ms ${T.easeOut}, background 260ms ${T.easeOut}, color 260ms ${T.easeOut}, transform 260ms ${T.easeOut}; }
  .aca .aca-nav-signin:active { transform: scale(0.97); transition-duration: 80ms; }
  .aca .aca-nav-signin:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 3px; }

  /* ── CTA tablet: bronze slab with machine corner ticks ── */
  .aca .aca-cta { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 16px; height: 60px; padding: 0 38px; border-radius: 2px; border: 1px solid ${T.bronzeLine}; background: linear-gradient(180deg, rgba(198,164,103,0.13), rgba(198,164,103,0.04)); color: ${T.marble}; font-family: ${T.sans}; font-size: 15px; font-weight: 500; letter-spacing: 0.05em; cursor: pointer; overflow: visible; transition: transform 280ms ${T.easeOut}, border-color 280ms ${T.easeOut}, box-shadow 280ms ${T.easeOut}, background 280ms ${T.easeOut}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.07); }
  .aca .aca-cta .aca-cta-sheen { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
  .aca .aca-cta .aca-cta-sheen::after { content: ''; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 30%, rgba(232,207,150,0.22) 50%, transparent 70%); transform: translateX(-120%); transition: transform 800ms ${T.easeOut}; }
  .aca .aca-cta-tick { position: absolute; width: 7px; height: 7px; border-color: ${T.cyanLine}; border-style: solid; transition: border-color 280ms ${T.easeOut}, transform 280ms ${T.easeOut}; }
  .aca .aca-cta-tick.tl { top: -3px; left: -3px; border-width: 1px 0 0 1px; }
  .aca .aca-cta-tick.tr { top: -3px; right: -3px; border-width: 1px 1px 0 0; }
  .aca .aca-cta-tick.bl { bottom: -3px; left: -3px; border-width: 0 0 1px 1px; }
  .aca .aca-cta-tick.br { bottom: -3px; right: -3px; border-width: 0 1px 1px 0; }
  .aca .aca-cta svg { width: 15px; height: 15px; color: ${T.bronzeBright}; transition: transform 280ms ${T.easeOut}; }
  .aca .aca-cta:active { transform: scale(0.975); transition-duration: 80ms; }
  .aca .aca-cta:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 5px; }
  .aca .aca-cta-secondary { background: transparent; border: 0; padding: 10px 6px; font-family: ${T.sans}; font-size: 13px; font-weight: 450; color: ${T.marbleSec}; cursor: pointer; letter-spacing: 0.01em; transition: color 200ms ${T.easeOut}; text-shadow: 0 1px 12px rgba(0,0,0,0.9); }
  .aca .aca-cta-secondary u { text-decoration-color: ${T.bronzeLine}; text-underline-offset: 4px; text-decoration-thickness: 1px; }
  .aca .aca-cta-secondary:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 3px; border-radius: 2px; }

  @media (hover: hover) and (pointer: fine) {
    .aca .aca-nav-signin:hover { border-color: ${T.bronzeLine}; color: ${T.bronzeBright}; background: rgba(198,164,103,0.07); }
    .aca .aca-cta:hover { transform: translateY(-2px); border-color: rgba(198,164,103,0.6); box-shadow: 0 18px 50px -14px rgba(198,164,103,0.35), inset 0 1px 0 rgba(255,255,255,0.10); background: linear-gradient(180deg, rgba(198,164,103,0.20), rgba(198,164,103,0.06)); }
    .aca .aca-cta:hover .aca-cta-sheen::after { transform: translateX(120%); }
    .aca .aca-cta:hover .aca-cta-tick { border-color: ${T.cyan}; }
    .aca .aca-cta:hover .aca-cta-tick.tl { transform: translate(-2px,-2px); }
    .aca .aca-cta:hover .aca-cta-tick.tr { transform: translate(2px,-2px); }
    .aca .aca-cta:hover .aca-cta-tick.bl { transform: translate(-2px,2px); }
    .aca .aca-cta:hover .aca-cta-tick.br { transform: translate(2px,2px); }
    .aca .aca-cta:hover svg { transform: translateX(4px); }
    .aca .aca-cta-secondary:hover { color: ${T.marble}; }
  }

  /* ── Hero ── */
  .aca .aca-hero { position: relative; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 130px 28px 150px; overflow: hidden; }
  .aca .aca-hero-film { position: absolute; inset: 0; z-index: 0; }
  .aca .aca-hero-film video, .aca .aca-hero-film img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; opacity: 0; transition: opacity 2400ms ${T.easeOut}; }
  .aca .aca-hero-film.is-ready video, .aca .aca-hero-film.is-ready img { opacity: 0.92; }
  .aca .aca-hero-film::after { content: ''; position: absolute; inset: 0; background:
    radial-gradient(58% 64% at 50% 47%, rgba(19,23,24,0.52), rgba(19,23,24,0.18) 55%, transparent 78%),
    linear-gradient(to bottom, rgba(19,23,24,0.55) 0%, rgba(19,23,24,0.12) 30%, rgba(19,23,24,0.28) 62%, ${T.bg} 96%),
    radial-gradient(120% 80% at 50% 40%, transparent 40%, rgba(19,23,24,0.68) 100%); }
  .aca .aca-hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
  .aca .aca-hero h1 { font-size: clamp(56px, 9.6vw, 148px); line-height: 0.94; letter-spacing: -0.022em; font-weight: 340; margin: 34px 0 0; text-shadow: 0 6px 60px rgba(0,0,0,0.75); }
  .aca .aca-hero h1 .it { font-style: italic; font-weight: 380; color: #E9D9B4; }
  .aca .aca-hero h1 .it .aca-glyph { color: transparent; background: linear-gradient(172deg, #F2E9D6 6%, ${T.bronzeBright} 44%, #B98F52 96%); -webkit-background-clip: text; background-clip: text; }
  .aca .aca-hero-tag { font-family: ${T.serif}; font-style: italic; font-weight: 350; font-size: clamp(17px, 1.9vw, 22px); color: ${T.marbleSec}; margin-top: 30px; letter-spacing: 0.005em; text-shadow: 0 2px 24px rgba(0,0,0,0.9); }
  .aca .aca-hero-note { font-family: ${T.mono}; font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.marbleMut}; margin-top: 26px; text-shadow: 0 1px 12px rgba(0,0,0,0.95); text-wrap: balance; max-width: 34ch; }

  /* Hero entrance choreography */
  .aca .aca-glyph { display: inline-block; opacity: 0; transform: translateY(0.42em); filter: blur(10px); animation: acaGlyph 1050ms ${T.easeOut} forwards; }
  @keyframes acaGlyph { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
  .aca .aca-hero-sub { opacity: 0; animation: acaFade 1300ms ${T.easeOut} 1050ms forwards; }
  .aca .aca-hero-cta { opacity: 0; animation: acaFade 1300ms ${T.easeOut} 1350ms forwards; }
  .aca .aca-hero-frame { opacity: 0; animation: acaFade 1700ms ${T.easeOut} 1750ms forwards; }
  @keyframes acaFade { to { opacity: 1; } }

  /* HUD brackets framing the hero — the machine reading the stone */
  .aca .aca-hud { position: absolute; z-index: 1; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(138,216,226,0.55); pointer-events: none; text-shadow: 0 1px 8px rgba(0,0,0,0.9); }
  .aca .aca-hud-corner { position: absolute; width: 26px; height: 26px; border-color: rgba(138,216,226,0.30); border-style: solid; }
  .aca .aca-hud-corner.tl { top: 92px; left: 34px; border-width: 1px 0 0 1px; }
  .aca .aca-hud-corner.tr { top: 92px; right: 34px; border-width: 1px 1px 0 0; }
  .aca .aca-hud-corner.bl { bottom: 34px; left: 34px; border-width: 0 0 1px 1px; }
  .aca .aca-hud-corner.br { bottom: 34px; right: 34px; border-width: 0 1px 1px 0; }
  .aca .aca-scrollcue { position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; color: ${T.marbleMut}; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; z-index: 1; }
  .aca .aca-scrollcue-line { width: 1px; height: 48px; background: linear-gradient(to bottom, transparent, ${T.hairlineStrong}); overflow: hidden; position: relative; }
  .aca .aca-scrollcue-line::after { content: ''; position: absolute; top: -40%; left: 0; width: 100%; height: 40%; background: ${T.cyan}; animation: acaDrip 3s ${T.easeOut} infinite; }
  @keyframes acaDrip { 0% { top: -40%; } 60%, 100% { top: 110%; } }

  /* ── Section shell ── */
  .aca .aca-section { position: relative; max-width: 1360px; margin: 0 auto; padding: clamp(92px, 12vw, 180px) 40px; }
  .aca .aca-center { text-align: center; }
  .aca .aca-h2 { font-size: clamp(38px, 5.4vw, 78px); line-height: 1.0; letter-spacing: -0.018em; font-weight: 350; }
  .aca .aca-h2 .it { font-style: italic; color: ${T.marbleSec}; }
  .aca .aca-body { font-size: 16.5px; line-height: 1.68; color: ${T.marbleSec}; font-weight: 350; }

  /* ── Stele: the twelve moves as an inscription ── */
  .aca .aca-stele { display: grid; grid-template-columns: 5fr 7fr; gap: clamp(36px, 5vw, 90px); align-items: start; }
  @media (max-width: 880px) { .aca .aca-stele { grid-template-columns: 1fr; } }
  .aca .aca-stele-head { position: sticky; top: 120px; }
  @media (max-width: 880px) { .aca .aca-stele-head { position: static; } }
  .aca .aca-stele-list { border-top: 1px solid ${T.hairline}; counter-reset: move; }
  .aca .aca-move { position: relative; display: grid; grid-template-columns: 64px 1fr auto; align-items: baseline; gap: 18px; padding: 21px 6px 21px 2px; border-bottom: 1px solid ${T.hairline}; cursor: default; transition: padding-left 360ms ${T.easeOut}; }
  .aca .aca-move::before { content: ''; position: absolute; left: 0; top: 50%; height: 0; width: 1px; background: ${T.bronze}; transition: height 360ms ${T.easeOut}, top 360ms ${T.easeOut}; }
  .aca .aca-move-num { font-family: ${T.inscr}; font-weight: 400; font-size: 13px; letter-spacing: 0.18em; color: ${T.marbleMut}; transition: color 360ms ${T.easeOut}; }
  .aca .aca-move-name { font-family: ${T.serif}; font-weight: 360; font-size: clamp(20px, 2.4vw, 29px); letter-spacing: -0.01em; color: ${T.marbleSec}; transition: color 360ms ${T.easeOut}; }
  .aca .aca-move-gloss { font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.marbleMut}; opacity: 0; transform: translateX(6px); transition: opacity 360ms ${T.easeOut}, transform 360ms ${T.easeOut}, color 360ms ${T.easeOut}; text-align: right; }
  .aca .aca-move.is-lit { padding-left: 16px; }
  .aca .aca-move.is-lit::before { height: 58%; top: 21%; }
  .aca .aca-move.is-lit .aca-move-num { color: ${T.bronze}; }
  .aca .aca-move.is-lit .aca-move-name { color: ${T.marble}; }
  .aca .aca-move.is-lit .aca-move-gloss { opacity: 1; transform: translateX(0); color: ${T.cyan}; }
  @media (hover: hover) and (pointer: fine) {
    .aca .aca-move:hover { padding-left: 16px; }
    .aca .aca-move:hover::before { height: 58%; top: 21%; }
    .aca .aca-move:hover .aca-move-num { color: ${T.bronze}; }
    .aca .aca-move:hover .aca-move-name { color: ${T.marble}; }
    .aca .aca-move:hover .aca-move-gloss { opacity: 1; transform: translateX(0); color: ${T.cyan}; }
  }
  @media (max-width: 640px) {
    .aca .aca-move { grid-template-columns: 44px 1fr; }
    .aca .aca-move-gloss { grid-column: 2; text-align: left; }
  }

  /* ── Bust: thought taking form ── */
  .aca .aca-bust-wrap { position: relative; height: clamp(440px, 64vh, 660px); margin-top: 26px; }
  .aca .aca-bust-wrap canvas { display: block; width: 100%; height: 100%; }
  .aca .aca-bust-caption { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 10px; }
  .aca .aca-bust-caption .line { width: 60px; height: 1px; background: ${T.hairline}; }

  /* ── Disciplines ── */
  .aca .aca-disc { display: grid; grid-template-columns: 1fr; gap: clamp(30px, 4vw, 72px); align-items: center; }
  @media (min-width: 880px) {
    .aca .aca-disc { grid-template-columns: 5fr 7fr; }
    .aca .aca-disc.is-rev .aca-disc-copy { order: 2; }
    .aca .aca-disc.is-rev .aca-disc-media { order: 1; }
  }
  .aca .aca-disc-num { font-family: ${T.inscr}; font-weight: 500; font-size: 12px; letter-spacing: 0.34em; color: ${T.bronze}; }
  .aca .aca-disc h3 { font-size: clamp(32px, 4vw, 58px); line-height: 1.02; letter-spacing: -0.016em; font-weight: 350; margin: 16px 0 18px; }
  .aca .aca-disc .aca-body { max-width: 440px; }
  .aca .aca-plate { position: relative; margin: 0; border-radius: 3px; overflow: hidden; border: 1px solid ${T.hairline}; background: radial-gradient(130% 130% at 25% 0%, rgba(198,164,103,0.05), transparent 55%), ${T.bg2}; aspect-ratio: 16 / 10; box-shadow: 0 34px 90px -30px rgba(0,0,0,0.9); transition: border-color 420ms ${T.easeOut}, box-shadow 420ms ${T.easeOut}; }
  .aca .aca-plate svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .aca .aca-plate-tag { position: absolute; right: 14px; top: 12px; z-index: 2; font-family: ${T.mono}; font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(234,229,218,0.7); background: rgba(19,23,24,0.55); border: 1px solid ${T.hairline}; padding: 6px 10px; border-radius: 2px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  @media (hover: hover) and (pointer: fine) {
    .aca .aca-plate:hover { border-color: ${T.bronzeLine}; box-shadow: 0 38px 100px -26px rgba(0,0,0,0.95), 0 0 70px -24px rgba(198,164,103,0.35); }
  }
  .aca .aca-plate-stroke { fill: none; stroke: rgba(198,164,103,0.7); stroke-width: 1.1; vector-effect: non-scaling-stroke; }
  .aca .aca-plate-faint { fill: none; stroke: rgba(234,229,218,0.16); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .aca .aca-plate-cyan { stroke: rgba(138,216,226,0.65); }
  .aca .aca-plate-dash { stroke-dasharray: 3 5; }
  .aca .aca-plate-label { font-family: ${T.mono}; font-size: 9px; letter-spacing: 0.14em; fill: rgba(234,229,218,0.55); text-transform: uppercase; }
  .aca .aca-draw { stroke-dasharray: var(--len, 400); stroke-dashoffset: var(--len, 400); }
  .aca .vr.is-in .aca-draw { animation: acaDraw 1700ms ${T.easeOut} forwards; }
  @keyframes acaDraw { to { stroke-dashoffset: 0; } }
  .aca .aca-plate-pulse { animation: acaPulse 3.6s ${T.easeOut} infinite; }
  @keyframes acaPulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

  /* ── Justice interstitial ── */
  .aca .aca-justice { position: relative; min-height: 88svh; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; border-top: 1px solid ${T.hairline}; border-bottom: 1px solid ${T.hairline}; }
  .aca .aca-justice-img { position: absolute; inset: -8%; background-image: url('/auth/justice.jpg'); background-size: cover; background-position: center 20%; will-change: transform; }
  .aca .aca-justice::after { content: ''; position: absolute; inset: 0; background:
    linear-gradient(to bottom, ${T.bg} 0%, rgba(19,23,24,0.25) 26%, rgba(19,23,24,0.25) 70%, ${T.bg} 100%),
    radial-gradient(90% 70% at 50% 50%, transparent 30%, rgba(19,23,24,0.7) 100%); }
  .aca .aca-justice-inner { position: relative; z-index: 1; max-width: 900px; padding: 120px 28px; }
  .aca .aca-justice blockquote { font-family: ${T.serif}; font-style: italic; font-weight: 350; font-size: clamp(30px, 4.4vw, 58px); line-height: 1.16; letter-spacing: -0.014em; color: ${T.marble}; margin: 22px 0 0; text-shadow: 0 4px 44px rgba(0,0,0,0.85); }
  .aca .aca-justice blockquote strong { font-weight: 480; color: ${T.bronzeBright}; }

  /* ── Credo ── */
  .aca .aca-credo { font-family: ${T.serif}; font-style: italic; font-weight: 350; font-size: clamp(26px, 3.5vw, 45px); line-height: 1.26; letter-spacing: -0.01em; color: ${T.marble}; }
  .aca .aca-credo strong { font-weight: 480; color: ${T.bronzeBright}; font-style: italic; }

  /* ── Final ── */
  .aca .aca-final { position: relative; text-align: center; padding: clamp(130px, 16vw, 230px) 28px; overflow: hidden; }
  .aca .aca-final-inner { position: relative; z-index: 1; }
  .aca .aca-final h2 { font-size: clamp(52px, 8.4vw, 132px); line-height: 0.94; letter-spacing: -0.022em; font-weight: 340; margin-bottom: 40px; text-shadow: 0 4px 60px rgba(0,0,0,0.6); }
  .aca .aca-final h2 .it { font-style: italic; color: transparent; background: linear-gradient(168deg, #F2E9D6 8%, ${T.bronzeBright} 46%, ${T.bronzeDeep} 98%); -webkit-background-clip: text; background-clip: text; }
  .aca .aca-final-bloom { position: absolute; left: 50%; bottom: -34%; width: 150%; height: 95%; transform: translateX(-50%); background: radial-gradient(closest-side, rgba(198,164,103,0.20), rgba(138,216,226,0.05) 55%, transparent 74%); filter: blur(24px); pointer-events: none; }

  /* ── Footer ── */
  .aca footer { border-top: 1px solid ${T.hairline}; padding: 34px 40px; position: relative; z-index: 1; }
  .aca .aca-footer-inner { max-width: 1360px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .aca .aca-footer-inner span { font-family: ${T.mono}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.marbleMut}; }
  .aca .aca-footer-inner .serif { font-family: ${T.serif}; font-style: italic; text-transform: none; letter-spacing: 0.01em; font-size: 13.5px; color: ${T.marbleSec}; }

  /* ── Hero film wrapper (scroll scrub target) ── */
  .aca .aca-hero-filmwrap { position: absolute; inset: 0; z-index: 0; will-change: transform; }
  .aca .aca-hero .aca-dust { z-index: 1; }

  /* ── Stele counter ── */
  .aca .aca-stele-counter { display: flex; align-items: center; gap: 16px; margin-top: 30px; }
  .aca .aca-stele-counter-bar { position: relative; width: 120px; height: 1px; background: ${T.hairline}; overflow: hidden; }
  .aca .aca-stele-counter-bar span { position: absolute; inset: 0; background: linear-gradient(90deg, ${T.bronze}, ${T.cyan}); transform-origin: left; transform: scaleX(0); transition: transform 500ms ${T.easeOut}; }

  /* ── Bust instrumentation ── */
  .aca .aca-bust-dial { position: absolute; inset: 0; pointer-events: none; }
  .aca .aca-bust-dial svg { position: absolute; top: 50%; left: 50%; width: min(86%, 620px); height: min(86%, 620px); opacity: 0.9; transform: translate(-50%, -50%); }
  .aca .aca-bust-dial svg.aca-bust-dial-spin { animation: acaDialSpin 90s linear infinite; will-change: transform; }
  @keyframes acaDialSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
  .aca .aca-bust-bracket { position: absolute; width: 22px; height: 22px; border-color: rgba(138,216,226,0.28); border-style: solid; pointer-events: none; }
  .aca .aca-bust-bracket.tl { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
  .aca .aca-bust-bracket.tr { top: 6px; right: 6px; border-width: 1px 1px 0 0; }
  .aca .aca-bust-bracket.bl { bottom: 6px; left: 6px; border-width: 0 0 1px 1px; }
  .aca .aca-bust-bracket.br { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }
  .aca .aca-bust-readout { position: absolute; pointer-events: none; }
  .aca .aca-bust-readout.tl { top: 14px; left: 40px; }
  .aca .aca-bust-readout.br { bottom: 14px; right: 40px; }

  /* ── Canon (Vitruvian) ── */
  .aca .aca-canon { display: grid; grid-template-columns: 5fr 7fr; gap: clamp(36px, 5vw, 90px); align-items: center; }
  @media (max-width: 880px) { .aca .aca-canon { grid-template-columns: 1fr; } }
  .aca .aca-canon-media { position: relative; display: flex; align-items: center; justify-content: center; }
  .aca .aca-canon-svg { position: relative; width: min(100%, 560px); height: auto; display: block; }
  .aca svg.aca-canon-ring { position: absolute; top: 50%; left: 50%; width: min(100%, 560px); height: auto; aspect-ratio: 1 / 1; animation: acaCanonSpin 140s linear infinite; will-change: transform; }
  @keyframes acaCanonSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(-360deg); } }
  .aca .aca-canon-svg .aca-plate-label { font-size: 10.5px; letter-spacing: 0.2em; }

  /* ── Marquee: the inscription band ── */
  .aca .aca-marquee { position: relative; overflow: hidden; padding: clamp(26px, 4vw, 44px) 0; border-top: 1px solid ${T.hairline}; border-bottom: 1px solid ${T.hairline}; }
  .aca .aca-marquee-track { display: flex; width: max-content; animation: acaMarquee 46s linear infinite; }
  .aca .aca-marquee-half { display: flex; align-items: baseline; flex: none; }
  .aca .aca-marquee-half span { display: inline-flex; align-items: baseline; }
  .aca .aca-marquee-half em { font-family: ${T.inscr}; font-style: normal; font-weight: 500; font-size: clamp(30px, 4.6vw, 64px); letter-spacing: 0.24em; color: transparent; -webkit-text-stroke: 1px rgba(198,164,103,0.34); padding: 0 0.35em; }
  .aca .aca-marquee-half i { font-style: normal; color: rgba(138,216,226,0.5); font-size: clamp(16px, 2vw, 26px); transform: translateY(-0.4em); }
  @keyframes acaMarquee { to { transform: translateX(-50%); } }

  /* ── Justice film + word reveal ── */
  .aca .aca-justice-img video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 20%; opacity: 0; transition: opacity 1800ms ${T.easeOut}; }
  .aca .aca-justice-img video.is-ready { opacity: 1; }
  .aca .aca-word { display: inline-block; opacity: 0; transform: translateY(0.35em); filter: blur(6px); transition: opacity 700ms ${T.easeOut}, transform 700ms ${T.easeOut}, filter 700ms ${T.easeOut}; }
  .aca .vr.is-in .aca-word { opacity: 1; transform: none; filter: blur(0); }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .aca .vr, .aca .vr-stagger > * { opacity: 1; transform: none; filter: none; transition: none; }
    .aca .aca-glyph, .aca .aca-hero-sub, .aca .aca-hero-cta, .aca .aca-hero-frame { animation: none; opacity: 1; transform: none; filter: none; }
    .aca .aca-scrollcue-line::after { animation: none; }
    .aca .aca-draw { stroke-dashoffset: 0; animation: none; }
    .aca .aca-plate-pulse { animation: none; }
    .aca .aca-cta, .aca .aca-cta-tick, .aca .aca-cta svg, .aca .aca-nav-signin, .aca .aca-move, .aca .aca-move::before { transition: none; }
    .aca .aca-bust-dial-spin, .aca .aca-canon-ring, .aca .aca-marquee-track { animation: none; }
    .aca .aca-word { opacity: 1; transform: none; filter: none; transition: none; }
    .aca .aca-stele-counter-bar span { transition: none; }
  }

  /* ── Small screens ── */
  @media (max-width: 720px) {
    .aca .aca-nav-inner { padding: 14px 20px; }
    .aca .aca-section { padding-left: 22px; padding-right: 22px; }
    .aca .aca-hero { padding: 110px 20px 130px; }
    .aca .aca-hud-corner.tl, .aca .aca-hud-corner.tr { top: 78px; }
    .aca .aca-hud-corner.tl, .aca .aca-hud-corner.bl { left: 16px; }
    .aca .aca-hud-corner.tr, .aca .aca-hud-corner.br { right: 16px; }
    .aca .aca-hud-label { display: none; }
    .aca .aca-cta { height: 56px; font-size: 14px; padding: 0 28px; }
    .aca footer { padding: 28px 20px; }
    .aca .aca-bust-readout { display: none; }
    .aca .aca-stele-counter { display: none; }
  }
`;

// ── Scroll reveal hook ───────────────────────────────────────────────────────
export function useReveal(active: boolean = true) {
  React.useEffect(() => {
    if (!active) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.aca .vr'));
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

// ── Content ─────────────────────────────────────────────────────────────────
const MOVES: Array<{ name: string; gloss: string }> = [
  { name: 'Necessary Assumption', gloss: 'the unstated bridge' },
  { name: 'Sufficient Assumption', gloss: 'the missing guarantee' },
  { name: 'Strengthen', gloss: 'reinforce the gap' },
  { name: 'Weaken', gloss: 'attack the gap' },
  { name: 'Flaw in the Reasoning', gloss: 'name the break' },
  { name: 'Main Conclusion', gloss: 'find the point' },
  { name: 'Method of Reasoning', gloss: 'describe the moves' },
  { name: 'Role in Argument', gloss: 'place the statement' },
  { name: 'Principle', gloss: 'match the rule' },
  { name: 'Parallel Reasoning', gloss: 'match the shape' },
  { name: 'Inference', gloss: 'what must be true' },
  { name: 'Resolve the Paradox', gloss: 'reconcile the facts' },
];

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

type Discipline = {
  num: string; kicker: string; title: string; body: string;
  plate: 'drill' | 'journal' | 'bootcamp' | 'schedule';
  tag: string; detail: string; reverse?: boolean;
};

const DISCIPLINES: Discipline[] = [
  {
    num: 'DISCIPLINE I', kicker: 'Practice', title: 'Smart LR Drill',
    body: 'The drill reads your misses and serves the question that moves your score next. No busywork, no random sets.',
    plate: 'drill', tag: 'Adaptive selection',
    detail: 'INPUT · your misses / OUTPUT · your next question',
  },
  {
    num: 'DISCIPLINE II', kicker: 'Review', title: 'Wrong Answer Journal',
    body: 'Every miss becomes a worked example: why the trap worked, what the right read was, and the pattern to catch next time.',
    plate: 'journal', tag: 'One miss · one lesson', reverse: true,
    detail: 'THE TRAP · THE RIGHT READ · THE PATTERN',
  },
  {
    num: 'DISCIPLINE III', kicker: 'Curriculum', title: 'Guided bootcamps',
    body: 'Structured, voice-led courses that build one reasoning skill at a time, starting where the points are.',
    plate: 'bootcamp', tag: 'One skill at a time',
    detail: 'MAIN CONCLUSION FIRST · THEN THE WHOLE FAMILY',
  },
  {
    num: 'DISCIPLINE IV', kicker: 'Plan', title: 'A schedule that adapts',
    body: 'A week-by-week plan built around your test date and your data, so the next right thing to do is always obvious.',
    plate: 'schedule', tag: 'Tuned to your test date', reverse: true,
    detail: 'YOUR TEST DATE · YOUR DATA · YOUR WEEK',
  },
];

// ── Discipline plates: bronze-engraved diagrams with cyan machine ticks ─────
function DisciplinePlate({ kind }: { kind: Discipline['plate'] }) {
  if (kind === 'drill') {
    return (
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[70, 55, 40, 25].map((r, i) => (
          <circle key={r} className="aca-plate-faint" cx="212" cy="100" r={r} strokeDasharray={i % 2 ? '2 6' : undefined} />
        ))}
        <circle className="aca-plate-stroke aca-plate-cyan aca-plate-pulse" cx="212" cy="100" r="11" />
        <circle cx="212" cy="100" r="3.2" fill="rgba(232,207,150,0.95)" />
        <path className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 270 }} d="M22 168 C 92 152, 122 120, 212 100" />
        <circle cx="22" cy="168" r="2.6" fill="rgba(138,216,226,0.85)" />
        <text className="aca-plate-label" x="22" y="184">your misses</text>
        <text className="aca-plate-label" x="248" y="100">next</text>
      </svg>
    );
  }
  if (kind === 'journal') {
    return (
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g opacity="0.55">
          {[[54, 60, 10], [72, 94, 15], [52, 128, 8], [94, 74, 6], [86, 122, 11], [64, 152, 5]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="rgba(138,216,226,0.10)" className="aca-plate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
        <path className="aca-plate-faint aca-plate-dash" d="M40 100 C 110 40, 150 160, 230 100" />
        <path className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 300 }} d="M60 132 C 130 120, 180 96, 286 78" />
        <circle cx="286" cy="78" r="3.2" fill="rgba(232,207,150,0.95)" />
        <text className="aca-plate-label" x="60" y="152">the trap</text>
        <text className="aca-plate-label" x="230" y="64" textAnchor="end">the right read</text>
      </svg>
    );
  }
  if (kind === 'bootcamp') {
    return (
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const inset = i * 22;
          const op = 0.13 + i * 0.13;
          return (
            <rect key={i} x={40 + inset} y={30 + inset * 0.62} width={240 - inset * 2} height={140 - inset * 1.24}
              rx="2" fill="none" stroke={`rgba(198,164,103,${op})`} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          );
        })}
        <rect x="150" y="92" width="20" height="34" rx="1" fill="rgba(138,216,226,0.10)" stroke="rgba(138,216,226,0.55)" strokeWidth="1" vectorEffect="non-scaling-stroke" className="aca-plate-pulse" />
        <path className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 130 }} d="M160 170 L 160 126" />
        <text className="aca-plate-label" x="160" y="188" textAnchor="middle">enter</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={i} className="aca-plate-faint" x1={40 + i * 40} y1="34" x2={40 + i * 40} y2="166" />
      ))}
      <line className="aca-plate-faint" x1="40" y1="166" x2="280" y2="166" />
      <path className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 300 }} d="M40 150 C 100 150, 130 96, 180 84 S 250 44, 280 40" />
      {[[40, 150], [120, 116], [200, 70], [280, 40]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 ? 3.4 : 2.4} fill={i === 3 ? 'rgba(232,207,150,0.95)' : 'rgba(138,216,226,0.8)'} />
      ))}
      <text className="aca-plate-label" x="40" y="184">week one</text>
      <text className="aca-plate-label" x="280" y="30" textAnchor="end">test day</text>
    </svg>
  );
}

// ── CTA tablet — one component so magnetism, ticks and sheen stay identical ──
export const AcaCta = ({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}) => {
  const ref = useMagnetic<HTMLButtonElement>(0.26, 90);
  return (
    <button ref={ref} className="aca-cta" onClick={onClick} style={style}>
      <span className="aca-cta-sheen" aria-hidden="true" />
      <span className="aca-cta-tick tl" aria-hidden="true" />
      <span className="aca-cta-tick tr" aria-hidden="true" />
      <span className="aca-cta-tick bl" aria-hidden="true" />
      <span className="aca-cta-tick br" aria-hidden="true" />
      {children}
      <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

// ── Ambience (fixed gradients + grain) ───────────────────────────────────────
export const AcaAmbience = () => (
  <>
    <div className="aca-ambience" aria-hidden="true" />
    <div className="aca-grain" aria-hidden="true" />
  </>
);

// ── Nav ──────────────────────────────────────────────────────────────────────
export const AcaNav = ({ onSignIn }: { onSignIn: () => void }) => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className={`aca-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="aca-nav-inner">
        <Link to="/" className="aca-wordmark" aria-label="LSAT U home">
          LSAT&thinsp;<em>U</em>
        </Link>
        <button type="button" className="aca-nav-signin" onClick={onSignIn}>
          Sign in
        </button>
      </div>
    </nav>
  );
};

// Play while on screen, pause off screen. play() can reject mid-scroll (the
// pause() race aborts it), which would otherwise strand the film paused in
// full view; retry shortly after while it should still be playing.
function usePlayWhileVisible(videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean) {
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    let wanted = false;
    let retry = 0;
    const tryPlay = () => {
      if (!wanted || document.hidden) return;
      video.play().catch(() => {
        window.clearTimeout(retry);
        retry = window.setTimeout(tryPlay, 350);
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        wanted = entry.isIntersecting;
        if (wanted) tryPlay();
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(video);
    const onVis = () => { if (!document.hidden) tryPlay(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearTimeout(retry);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [videoRef, enabled]);
}

// ── Hero film: generated marble footage, melted into the page ───────────────
const HeroFilm = () => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [ready, setReady] = React.useState(false);
  const [reduced] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  usePlayWhileVisible(videoRef, !reduced);

  return (
    <div ref={wrapRef} className={`aca-hero-film${ready ? ' is-ready' : ''}`} aria-hidden="true">
      {reduced ? (
        <img src="/auth/bust.jpg" alt="" onLoad={() => setReady(true)} />
      ) : (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          poster="/auth/bust.jpg"
          onLoadedData={() => setReady(true)}
          onError={() => setReady(true)}
        >
          {/* 2K film for large canvases; the 720p cut for small screens where
              the decode cost outweighs the extra grain. */}
          <source src={typeof window !== 'undefined' && window.innerWidth < 760 ? '/auth/bust-loop-sd.mp4' : '/auth/bust-loop.mp4'} type="video/mp4" />
        </video>
      )}
    </div>
  );
};

// Words are kept whole so per-glyph spans never break a line mid-word.
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
                <span key={i} className="aca-glyph" style={{ animationDelay: `${base + (start + i) * 32}ms` }}>
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

export const AcaHero = ({ onCTA, onSignUp }: { onCTA: () => void; onSignUp: () => void }) => {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const filmRef = React.useRef<HTMLDivElement>(null);

  // Scroll scrub: as the hero leaves, its content rises and dissolves while
  // the film settles back — a camera pull, not a page scroll.
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const inner = innerRef.current, film = filmRef.current;
    if (!inner || !film) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const vh = window.innerHeight;
        if (y > vh * 1.2) return;
        const p = Math.min(1, y / (vh * 0.9));
        inner.style.transform = `translate3d(0, ${(-p * 90).toFixed(1)}px, 0)`;
        inner.style.opacity = String(1 - p * 1.05);
        film.style.transform = `scale(${(1 + p * 0.07).toFixed(4)}) translate3d(0, ${(p * 26).toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <header className="aca-hero" id="aca-top">
      <div ref={filmRef} className="aca-hero-filmwrap" aria-hidden="true">
        <HeroFilm />
      </div>
      <AcaDust mode="drift" count={80} />

      <div className="aca-hero-frame" aria-hidden="true">
        <span className="aca-hud-corner tl" />
        <span className="aca-hud-corner tr" />
        <span className="aca-hud-corner bl" />
        <span className="aca-hud-corner br" />
        <span className="aca-hud aca-hud-label" style={{ top: 96, left: 72 }}>Practice · Review · Coaching</span>
        <span className="aca-hud aca-hud-label" style={{ top: 96, right: 72 }}>lsatprep.study</span>
      </div>

      <div ref={innerRef} className="aca-hero-inner">
        <span className="aca-inscr aca-glyph" style={{ animationDelay: '0ms' }}>
          For aspiring attorneys
        </span>
        <h1>
          <span className="sr-only">Master the LSAT. Own your future.</span>
          <span aria-hidden="true">
            <Glyphs text="Master the LSAT." base={240} />
            <br />
            <span className="it">
              <Glyphs text="Own your future." base={780} />
            </span>
          </span>
        </h1>
        <p className="aca-hero-tag aca-hero-sub">The discipline is ancient. The training is new.</p>
        <div className="aca-hero-cta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 46 }}>
          <AcaCta onClick={onCTA}>Enter LSAT University</AcaCta>
          <button type="button" className="aca-cta-secondary" onClick={onSignUp}>
            Or <u>create an account</u>
          </button>
          <p className="aca-hero-note">Email or Google · No credit card to start</p>
        </div>
      </div>

      <div className="aca-scrollcue aca-hero-frame" aria-hidden="true">
        <span className="aca-scrollcue-line" />
        <span>Descend</span>
      </div>
    </header>
  );
};

// ── Stele: the twelve moves ──────────────────────────────────────────────────
export const AcaStele = () => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [litIdx, setLitIdx] = React.useState(-1);

  // A reading light travels the inscription: the row nearest the viewport
  // centre is lit. Pointer hover overrides via CSS.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === 'undefined') return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.aca-move'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-lit', entry.isIntersecting);
          if (entry.isIntersecting) setLitIdx(rows.indexOf(entry.target as HTMLElement));
        });
      },
      { rootMargin: '-42% 0px -42% 0px' },
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <section className="aca-section vr" aria-label="The twelve moves of Logical Reasoning" id="aca-moves">
      <div className="aca-stele">
        <div className="aca-stele-head vr-stagger">
          <span className="aca-inscr">The twelve moves</span>
          <h2 className="aca-h2" style={{ marginTop: 24 }}>
            Every question is one of twelve moves.<br />
            <span className="it">Learn to see the move.</span>
          </h2>
          <p className="aca-body" style={{ maxWidth: 430, marginTop: 22 }}>
            Twelve question types cover everything Logical Reasoning can throw at you.
            We drill them until you recognize the move before you finish the stem.
          </p>
          <div className="aca-stele-counter" aria-hidden="true">
            <span className="aca-annot">
              Reading&ensp;<b>{litIdx >= 0 ? ROMANS[litIdx] : '—'}</b>&ensp;/ XII
            </span>
            <span className="aca-stele-counter-bar">
              <span style={{ transform: `scaleX(${litIdx >= 0 ? (litIdx + 1) / 12 : 0})` }} />
            </span>
          </div>
        </div>
        <div ref={listRef} className="aca-stele-list" role="list">
          {MOVES.map((m, i) => (
            <div key={m.name} className="aca-move" role="listitem">
              <span className="aca-move-num" aria-hidden="true">{ROMANS[i]}</span>
              <span className="aca-move-name">{m.name}</span>
              <span className="aca-move-gloss">{m.gloss}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Bust: thought taking form ────────────────────────────────────────────────
export const AcaBust = () => (
  <section className="aca-section aca-center vr" aria-label="The method" style={{ paddingTop: 40 }} id="aca-method">
    <div className="vr-stagger">
      <span className="aca-inscr">The method</span>
      <h2 className="aca-h2" style={{ marginTop: 24 }}>
        Thought, <span className="it">taking form.</span>
      </h2>
      <p className="aca-body" style={{ maxWidth: 560, margin: '20px auto 0' }}>
        You are not memorizing tricks. You are training a way of seeing arguments,
        until the structure appears the moment you start to read.
      </p>
    </div>
    <div className="aca-bust-wrap vr">
      {/* Instrument dial: a survey ring turning slowly behind the specimen */}
      <div className="aca-bust-dial" aria-hidden="true">
        {/* Static ring and spinning ring are separate <svg> elements: the
            rotation animates the element itself, so it composites on the GPU
            instead of re-rasterizing SVG internals every frame. */}
        <svg viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="284" fill="none" stroke="rgba(234,229,218,0.07)" strokeWidth="1" />
          <circle cx="300" cy="300" r="284" fill="none" stroke="rgba(138,216,226,0.20)" strokeWidth="1" strokeDasharray="2 34" />
        </svg>
        <svg viewBox="0 0 600 600" className="aca-bust-dial-spin">
          <circle cx="300" cy="300" r="252" fill="none" stroke="rgba(198,164,103,0.14)" strokeWidth="1" strokeDasharray="60 380" />
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const r1 = 284, r2 = i % 9 === 0 ? 272 : 279;
            return (
              <line key={i}
                x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1}
                x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2}
                stroke={i % 9 === 0 ? 'rgba(198,164,103,0.35)' : 'rgba(234,229,218,0.12)'} strokeWidth="1" />
            );
          })}
        </svg>
      </div>
      <span className="aca-bust-bracket tl" aria-hidden="true" />
      <span className="aca-bust-bracket tr" aria-hidden="true" />
      <span className="aca-bust-bracket bl" aria-hidden="true" />
      <span className="aca-bust-bracket br" aria-hidden="true" />
      <span className="aca-annot aca-bust-readout tl" aria-hidden="true">SPEC · POINT CLOUD</span>
      <span className="aca-annot aca-bust-readout br" aria-hidden="true">SURFACE · SAMPLED</span>
      <ParticleBust />
    </div>
    <div className="aca-bust-caption" aria-hidden="true">
      <span className="line" />
      <span className="aca-annot">Fig. 01 · <b>assembly</b> rides your scroll · the cloud answers your cursor</span>
      <span className="line" />
    </div>
  </section>
);

// ── Canon: the proportions of an argument (Vitruvian set-piece) ─────────────
const CanonFigure = () => (
  <>
  {/* Degree ring — the machine's protractor, its own <svg> so the slow spin
      composites on the GPU instead of re-rasterizing every tick each frame */}
  <svg className="aca-canon-ring" viewBox="0 0 640 640" aria-hidden="true">
    <circle cx="320" cy="320" r="296" fill="none" stroke="rgba(234,229,218,0.08)" strokeWidth="1" />
    {Array.from({ length: 72 }).map((_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const r1 = 296, r2 = i % 6 === 0 ? 285 : 291;
      return (
        <line key={i}
          x1={320 + Math.cos(a) * r1} y1={320 + Math.sin(a) * r1}
          x2={320 + Math.cos(a) * r2} y2={320 + Math.sin(a) * r2}
          stroke={i % 6 === 0 ? 'rgba(198,164,103,0.4)' : 'rgba(234,229,218,0.14)'} strokeWidth="1" />
      );
    })}
  </svg>
  <svg className="aca-canon-svg" viewBox="0 0 640 640" aria-hidden="true">
    {/* Square — the premise: what is given */}
    <rect className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 1600 }}
      x="104" y="104" width="432" height="432" fill="none" />
    {/* Circle — the conclusion: what is reached */}
    <circle className="aca-plate-stroke aca-draw" style={{ ['--len' as string]: 1360, animationDelay: '300ms' }}
      cx="320" cy="320" r="216" fill="none" />
    {/* Axes — the inference that carries one into the other */}
    <line className="aca-plate-faint aca-draw" style={{ ['--len' as string]: 432, animationDelay: '650ms' }} x1="320" y1="104" x2="320" y2="536" />
    <line className="aca-plate-faint aca-draw" style={{ ['--len' as string]: 432, animationDelay: '650ms' }} x1="104" y1="320" x2="536" y2="320" />
    {/* Radial spans — the reach of the figure */}
    {[45, 135, 225, 315].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return (
        <line key={deg} className="aca-plate-faint aca-plate-dash aca-draw"
          style={{ ['--len' as string]: 216, animationDelay: '900ms' }}
          x1="320" y1="320" x2={320 + Math.cos(a) * 216} y2={320 + Math.sin(a) * 216} />
      );
    })}
    {/* Golden section — the measure hidden in the frame */}
    <line className="aca-plate-stroke aca-plate-cyan aca-draw" style={{ ['--len' as string]: 432, animationDelay: '1150ms' }}
      x1="104" y1="371" x2="536" y2="371" strokeDasharray="4 6" />
    <circle className="aca-canon-node aca-plate-pulse" cx="320" cy="320" r="4" fill="rgba(232,207,150,0.95)" />
    <circle className="aca-canon-node" cx="320" cy="104" r="3" fill="rgba(138,216,226,0.85)" />
    <circle className="aca-canon-node" cx="320" cy="536" r="3" fill="rgba(138,216,226,0.85)" />
    {/* Measures */}
    <text className="aca-plate-label" x="320" y="86" textAnchor="middle">premise</text>
    <text className="aca-plate-label" x="320" y="562" textAnchor="middle">conclusion</text>
    <text className="aca-plate-label" x="548" y="366" >1 : 1.618</text>
    <text className="aca-plate-label" x="330" y="312">inference</text>
  </svg>
  </>
);

export const AcaCanon = () => (
  <section className="aca-section vr" aria-label="The proportions of an argument" id="aca-canon">
    <div className="aca-canon">
      <div className="aca-canon-copy vr-stagger">
        <span className="aca-inscr">The canon</span>
        <h2 className="aca-h2" style={{ marginTop: 24 }}>
          An argument has <span className="it">proportions.</span>
        </h2>
        <p className="aca-body" style={{ maxWidth: 430, marginTop: 22 }}>
          A premise carries a conclusion the way a plinth carries a figure: with a
          measurable relationship between them. Once you can see that geometry,
          you can see where it breaks. That is the whole test.
        </p>
        <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.hairline}`, maxWidth: 430 }}>
          <span className="aca-annot">GIVEN · DRAWN · <b>MEASURED</b></span>
        </div>
      </div>
      <div className="aca-canon-media vr">
        <CanonFigure />
      </div>
    </div>
  </section>
);

// ── Marquee: the inscription band ────────────────────────────────────────────
const MARQUEE_WORDS = ['Reason', 'Evidence', 'Structure', 'Judgment', 'Practice', 'Review'];
export const AcaMarquee = () => (
  <div className="aca-marquee" aria-hidden="true">
    <div className="aca-marquee-track">
      {[0, 1].map((half) => (
        <div className="aca-marquee-half" key={half}>
          {MARQUEE_WORDS.map((w) => (
            <span key={w}><em>{w}</em><i>·</i></span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Disciplines ──────────────────────────────────────────────────────────────
export const AcaDisciplines = () => (
  <>
    {DISCIPLINES.map((d, i) => (
      <section key={d.num} className="aca-section vr" aria-label={d.title} id={i === 0 ? 'aca-disciplines' : undefined}>
        <div className={`aca-disc vr-stagger${d.reverse ? ' is-rev' : ''}`}>
          <div className="aca-disc-copy">
            <span className="aca-disc-num" aria-hidden="true">{d.num}</span>
            <h3>{d.title}</h3>
            <p className="aca-body">{d.body}</p>
            <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${T.hairline}`, maxWidth: 440 }}>
              <span className="aca-annot">{d.detail}</span>
            </div>
          </div>
          <div className="aca-disc-media">
            <figure className="aca-plate">
              <DisciplinePlate kind={d.plate} />
              <figcaption className="aca-plate-tag">{d.tag}</figcaption>
            </figure>
          </div>
        </div>
      </section>
    ))}
  </>
);

// ── Justice interstitial ─────────────────────────────────────────────────────
// The scales sway on generated film; the still remains as poster and reduced
// motion fallback. The quote surfaces word by word as the section is read.
const JUSTICE_WORDS: Array<{ w: string; strong?: boolean; br?: boolean }> = [
  { w: 'Judgment' }, { w: 'is' }, { w: 'a' }, { w: 'habit.', strong: true, br: true },
  { w: 'We' }, { w: 'train' }, { w: 'it' }, { w: 'every' }, { w: 'day.' },
];

export const AcaJustice = () => {
  const imgRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [filmReady, setFilmReady] = React.useState(false);
  const [reduced] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  React.useEffect(() => {
    const el = imgRef.current;
    if (!el || reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.parentElement!.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        const p = (rect.top + rect.height / 2 - vh / 2) / vh; // -1..1 ish
        el.style.transform = `translateY(${(p * -6).toFixed(2)}%) scale(1.06)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, [reduced]);

  usePlayWhileVisible(videoRef, !reduced);

  return (
    <section className="aca-justice vr" aria-label="Judgment is a habit" id="aca-justice-s">
      <div ref={imgRef} className="aca-justice-img" aria-hidden="true">
        {!reduced && (
          <video
            ref={videoRef}
            className={filmReady ? 'is-ready' : undefined}
            muted
            loop
            playsInline
            autoPlay
            preload="none"
            onLoadedData={() => setFilmReady(true)}
          >
            <source src="/auth/justice-loop.mp4" type="video/mp4" />
          </video>
        )}
      </div>
      <div className="aca-justice-inner vr-stagger">
        <span className="aca-inscr">Weighed daily</span>
        <blockquote>
          <span className="sr-only">Judgment is a habit. We train it every day.</span>
          <span aria-hidden="true">
            {JUSTICE_WORDS.map((t, i) => (
              <React.Fragment key={i}>
                <span className="aca-word" style={{ transitionDelay: `${200 + i * 110}ms` }}>
                  {t.strong ? <strong>{t.w}</strong> : t.w}
                </span>
                {t.br ? <br /> : ' '}
              </React.Fragment>
            ))}
          </span>
        </blockquote>
      </div>
    </section>
  );
};

// ── Credo ────────────────────────────────────────────────────────────────────
export const AcaCredo = ({ onPrimary }: { onPrimary: () => void }) => (
  <section className="aca-section aca-center vr" aria-label="A statement of intent">
    <div className="vr-stagger" style={{ maxWidth: 880, margin: '0 auto' }}>
      <span className="aca-inscr">A statement of intent</span>
      <p className="aca-credo" style={{ margin: '30px 0 38px' }}>
        “LSAT U is the prep we wish every aspiring attorney had: practice, review, and
        <strong> real progress</strong> in one place, all pointed at the score you actually want.”
      </p>
      <AcaCta onClick={onPrimary} style={{ height: 54, fontSize: 14 }}>Begin training</AcaCta>
    </div>
  </section>
);

// ── Final ────────────────────────────────────────────────────────────────────
export const AcaFinal = ({ onPrimary }: { onPrimary: () => void }) => (
  <section className="aca-final vr" aria-label="Begin" id="aca-begin">
    <AcaDust mode="rise" count={64} />
    <div className="aca-final-bloom" aria-hidden="true" />
    <div className="aca-final-inner vr-stagger">
      <span className="aca-inscr" style={{ display: 'block', marginBottom: 26 }}>The Academy is open</span>
      <h2>
        Sit down.<br />
        <span className="it">Begin.</span>
      </h2>
      <AcaCta onClick={onPrimary}>Enter LSAT University</AcaCta>
    </div>
  </section>
);

// ── Footer ───────────────────────────────────────────────────────────────────
export const AcaFooter = () => (
  <footer>
    <div className="aca-footer-inner">
      <span className="serif">LSAT U · A training environment for aspiring attorneys.</span>
      <span>© {new Date().getFullYear()} · lsatprep.study</span>
    </div>
  </footer>
);
