#!/usr/bin/env node
/**
 * Chart palette validator — the six checks, computed rather than eyeballed.
 *
 * Implements the checks from the `dataviz` skill against LSAT U's own surfaces.
 * The skill ships its own validator in a bundled temp dir that does not survive a
 * session; this is the permanent in-repo copy so the palette can be re-validated
 * on every change.
 *
 * Usage:
 *   node scripts/validate-chart-palette.mjs "#3987e5,#d95926,#199e70" --surface dark
 *   node scripts/validate-chart-palette.mjs "..." --surface dark --pairs all
 *   node scripts/validate-chart-palette.mjs --preset accuracy-ramp
 *
 * Checks
 *   1. Lightness band      OKLCH L within the mode's band
 *   2. Chroma floor        OKLCH C above the floor (else it reads as gray)
 *   3. CVD separation      OKLab dE*100 >= 8 for each tested pair, under
 *                          protanopia / deuteranopia / tritanopia (Machado 2009, severity 1.0)
 *   4. Normal-vision floor OKLab dE*100 >= 15 for each tested pair. Hard fail;
 *                          secondary encoding does NOT excuse this one.
 *   5. Contrast            >= 3:1 against the chart surface (WCAG 2.x relative luminance)
 *   6. Ordinal floor       (--ordinal) step nearest the surface still clears 2:1
 *
 * Exit code 1 if any hard check FAILs.
 */

// ── LSAT U surfaces (from DESIGN.md) ────────────────────────────────────────
const SURFACES = {
  dark: { name: 'shell-card (dark)', hex: '#121212', lBand: [0.48, 0.67] },
  darkbg: { name: 'shell-background (dark)', hex: '#0a0a0a', lBand: [0.48, 0.67] },
  light: { name: 'drill-card (light)', hex: '#ffffff', lBand: [0.45, 0.68] },
  drill: { name: 'drill-page (light)', hex: '#fafafc', lBand: [0.45, 0.68] },
};

const CHROMA_FLOOR = 0.05;
const CVD_TARGET = 8;
const CVD_WARN = 6;
const NORMAL_FLOOR = 15;
const CONTRAST_MIN = 3.0;
const ORDINAL_MIN = 2.0;

// ── color math ──────────────────────────────────────────────────────────────
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function hexToRgb(hex) {
  const h = hex.trim().replace(/^#/, '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new Error(`Bad hex: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}

function linearRgb(hex) {
  return hexToRgb(hex).map(srgbToLinear);
}

/** Björn Ottosson, linear sRGB -> OKLab */
function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const oklab = (hex) => linearToOklab(linearRgb(hex));

function oklch(hex) {
  const [L, a, b] = oklab(hex);
  return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
}

/** OKLab delta-E, scaled x100 to match the skill's reporting convention */
function deltaE(hex1, hex2, transform = (v) => v) {
  const A = linearToOklab(transform(linearRgb(hex1)));
  const B = linearToOklab(transform(linearRgb(hex2)));
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 100;
}

// Machado, Oliveira & Fernandes 2009, severity 1.0, applied to LINEAR rgb
const CVD = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const applyMatrix = (M) => (rgb) => M.map((row) => row.reduce((sum, k, i) => sum + k * rgb[i], 0));

/** WCAG 2.x relative luminance + contrast ratio */
function luminance(hex) {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hex1, hex2) {
  const a = luminance(hex1);
  const b = luminance(hex2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ── reporting ───────────────────────────────────────────────────────────────
let failed = false;
const PASS = 'PASS';
const WARN = 'WARN';
const FAIL = 'FAIL';

function mark(ok, warn = false) {
  if (ok) return PASS;
  if (warn) return WARN;
  failed = true;
  return FAIL;
}

function pad(s, n) {
  return String(s).padEnd(n);
}

function validate(colors, surfaceKey, pairMode, ordinal, diverging) {
  const surface = SURFACES[surfaceKey];
  if (!surface) throw new Error(`Unknown surface "${surfaceKey}". Options: ${Object.keys(SURFACES).join(', ')}`);

  console.log(`\n  surface   ${surface.name}  ${surface.hex}`);
  console.log(`  colors    ${colors.length}   pairs: ${pairMode}${ordinal ? '   (ordinal)' : ''}`);

  // 1 + 2 + 5 — per-color checks
  console.log(`\n  ${pad('hex', 10)}${pad('L', 8)}${pad('C', 8)}${pad('band', 7)}${pad('chroma', 8)}${pad('contrast', 11)}`);
  console.log('  ' + '-'.repeat(52));
  for (const hex of colors) {
    const { L, C } = oklch(hex);
    const cr = contrast(hex, surface.hex);
    const inBand = L >= surface.lBand[0] && L <= surface.lBand[1];
    const minCr = ordinal ? ORDINAL_MIN : CONTRAST_MIN;
    console.log(
      `  ${pad(hex, 10)}${pad(L.toFixed(3), 8)}${pad(C.toFixed(3), 8)}` +
        `${pad(mark(inBand, true), 7)}${pad(mark(C >= CHROMA_FLOOR, diverging), 8)}` +
        `${pad(`${cr.toFixed(2)}:1 ${mark(cr >= minCr, !ordinal)}`, 11)}`
    );
  }

  // ── sequential / ordinal ramps take DIFFERENT pair semantics ──────────────
  // On a continuous ramp, adjacent steps are SUPPOSED to be close together —
  // that is what makes it read as a ramp. Applying the categorical dE>=15
  // separation floor here is the wrong check and produces false failures.
  // What actually matters for a ramp:
  //   a. lightness is monotonic (no step reverses direction)
  //   b. the step nearest the surface still clears the ordinal contrast floor
  //   c. the endpoints are far enough apart to encode a usable range
  // ── diverging: two ramps meeting at a deliberately neutral midpoint ───────
  // A low-chroma midpoint is the POINT of a diverging scale, not a defect, and
  // adjacent steps are meant to be close. The checks that actually matter are:
  // the two poles must be far apart and CVD-separable, and the midpoint must
  // read as "nothing" rather than as a third category.
  if (diverging) {
    const mid = colors[Math.floor(colors.length / 2)];
    const [poleA, poleB] = [colors[0], colors[colors.length - 1]];
    const midC = oklch(mid).C;
    const poleGap = deltaE(poleA, poleB);
    const poleCvd = Object.values(CVD).map((M) => deltaE(poleA, poleB, applyMatrix(M)));
    const odd = colors.length % 2 === 1;
    console.log(`\n  diverging checks`);
    console.log('  ' + '-'.repeat(52));
    console.log(`  ${pad('odd step count', 26)}${colors.length}  ${mark(odd)}`);
    console.log(`  ${pad('midpoint neutral', 26)}${mid} C=${midC.toFixed(3)}  ${mark(midC <= 0.04)}`);
    console.log(`  ${pad('pole separation', 26)}${poleGap.toFixed(1)}  ${mark(poleGap >= 30)}`);
    poleCvd.forEach((d, i) =>
      console.log(`  ${pad(`poles under ${Object.keys(CVD)[i]}`, 26)}${d.toFixed(1)}  ${mark(d >= CVD_TARGET)}`)
    );
    console.log('\n  (categorical pair floors do not apply to a diverging scale)');
    return;
  }

  if (ordinal) {
    const Ls = colors.map((h) => oklch(h).L);
    const dirs = Ls.slice(1).map((L, i) => Math.sign(L - Ls[i]));
    const monotonic = dirs.every((d) => d === dirs[0] && d !== 0);
    const endpointRange = deltaE(colors[0], colors[colors.length - 1]);
    console.log(`\n  ramp checks`);
    console.log('  ' + '-'.repeat(52));
    console.log(`  ${pad('monotonic lightness', 26)}${mark(monotonic)}`);
    console.log(`  ${pad('endpoint dE', 26)}${endpointRange.toFixed(1)}  ${mark(endpointRange >= 30)}`);
    console.log(`  ${pad('steps', 26)}${colors.length}  ${mark(colors.length >= 3, true)}`);
    console.log('\n  (categorical pair floors do not apply to a ramp)');
    return;
  }

  // 3 + 4 — pairwise checks (categorical only)
  const pairs = [];
  if (pairMode === 'all') {
    for (let i = 0; i < colors.length; i++)
      for (let j = i + 1; j < colors.length; j++) pairs.push([colors[i], colors[j]]);
  } else {
    for (let i = 0; i < colors.length - 1; i++) pairs.push([colors[i], colors[i + 1]]);
  }

  if (!pairs.length) {
    console.log('\n  (single color — no pair checks)');
    return;
  }

  console.log(`\n  ${pad('pair', 20)}${pad('normal', 14)}${pad('protan', 13)}${pad('deutan', 13)}${pad('tritan', 13)}`);
  console.log('  ' + '-'.repeat(73));
  let worstNormal = Infinity;
  let worstCvd = Infinity;
  for (const [a, b] of pairs) {
    const n = deltaE(a, b);
    const cvds = Object.entries(CVD).map(([, M]) => deltaE(a, b, applyMatrix(M)));
    worstNormal = Math.min(worstNormal, n);
    worstCvd = Math.min(worstCvd, ...cvds);
    const cells = cvds.map((d) => pad(`${d.toFixed(1)} ${mark(d >= CVD_TARGET, d >= CVD_WARN)}`, 13));
    console.log(
      `  ${pad(`${a}/${b}`, 20)}${pad(`${n.toFixed(1)} ${mark(n >= NORMAL_FLOOR)}`, 14)}${cells.join('')}`
    );
  }
  console.log(`\n  worst normal-vision dE  ${worstNormal.toFixed(1)}  (floor ${NORMAL_FLOOR})`);
  console.log(`  worst CVD dE            ${worstCvd.toFixed(1)}  (target ${CVD_TARGET}, warn band ${CVD_WARN}-${CVD_TARGET})`);
}

// ── presets: LSAT U's candidate chart palettes ──────────────────────────────
const PRESETS = {
  // Accuracy as a single-hue sequential ramp on the dark card.
  // Color carries accuracy; question-type family carries POSITION, not hue.
  'accuracy-ramp': {
    surface: 'dark',
    ordinal: true,
    // 5 steps, not 6: a darker #1b3a5c step was dropped because it only reached
    // 1.61:1 against #121212 and vanished into the card. Validated 2026-08-26.
    colors: ['#1d5286', '#1f6cb0', '#2a87d4', '#57a5e4', '#8cc3ef'],
  },
  // Diverging around the 85% target: below target vs at/above target.
  // Diverging around the 85% target: below target (rose) vs above target (blue).
  // Deliberately NOT red->green: that pair scores deutan dE 5.7 and is the single
  // most CVD-hostile choice in common use. Rose pole reuses the shipped
  // state-incorrect token; steps interpolated in OKLab through a neutral midpoint.
  // Validated 2026-08-26: pole separation 33.0, worst CVD 18.4.
  'accuracy-diverging': {
    surface: 'dark',
    diverging: true,
    colors: ['#f53d5c', '#c36966', '#8a7f70', '#6585a4', '#2a87d4'],
  },
  // The existing shipped state colors, checked against the dark card.
  'state-colors': {
    surface: 'dark',
    colors: ['#0fb781', '#f53d5c', '#f59f0a', '#b06a3e'],
  },
  // Three categorical slots for reasoning type (Conditional / Causal / Comparative).
  // Separated by LIGHTNESS as well as hue — an equal-lightness trio collapses to
  // one color under any CVD simulation. Amber rather than orange: orange/green
  // scored protan dE 6.4 (warn band), amber/green scores 20.8.
  // Validated all-pairs on #121212, 2026-08-26.
  'reasoning-3': {
    surface: 'dark',
    pairs: 'all',
    colors: ['#8cc3ef', '#e8a33b', '#12795a'],
  },
};

// ── cli ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const presetName = flag('preset', null);

if (presetName === 'all') {
  for (const [name, p] of Object.entries(PRESETS)) {
    console.log(`\n${'='.repeat(75)}\n  PRESET: ${name}\n${'='.repeat(75)}`);
    validate(p.colors, p.surface, p.pairs || 'adjacent', p.ordinal || false, p.diverging || false);
  }
} else if (presetName) {
  const p = PRESETS[presetName];
  if (!p) {
    console.error(`Unknown preset "${presetName}". Options: ${Object.keys(PRESETS).join(', ')}, all`);
    process.exit(2);
  }
  console.log(`\n  PRESET: ${presetName}`);
  validate(p.colors, flag('surface', p.surface), flag('pairs', p.pairs || 'adjacent'), has('ordinal') || p.ordinal || false, has('diverging') || p.diverging || false);
} else {
  const list = argv.find((a) => !a.startsWith('--') && a.includes('#'));
  if (!list) {
    console.error('Usage: node scripts/validate-chart-palette.mjs "#hex,#hex,..." [--surface dark|darkbg|light|drill] [--pairs adjacent|all] [--ordinal]');
    console.error(`       node scripts/validate-chart-palette.mjs --preset <${Object.keys(PRESETS).join('|')}|all>`);
    process.exit(2);
  }
  validate(list.split(',').map((s) => s.trim()), flag('surface', 'dark'), flag('pairs', 'adjacent'), has('ordinal'), has('diverging'));
}

console.log(failed ? '\n  RESULT: FAIL — fix the failing checks before shipping.\n' : '\n  RESULT: all hard checks pass.\n');
process.exit(failed ? 1 : 0);
