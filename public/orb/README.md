# The orb

Vendored from the command centre on 2026-08-29, byte for byte. Its authority is
that project's `docs/adr/0005-the-orb-is-a-post-processed-scene-not-a-drawn-one.md`,
and every number inside `plexus-sphere.js` was measured against a reference
rather than chosen. **Do not tune these files here.** Fix them at the source and
re-copy, or the two orbs drift apart and the measurements stop meaning anything.

Why `public/` and not a package:

- `three.min.js` is r128 and the five post-processing addons are vendored from
  `three@0.128.0/examples/js` to match it exactly. They are UMD-era globals that
  feature-detect each other, not ES modules, so putting them through Vite's
  module graph fights their design for no gain.
- They total ~670KB. That must never enter the main bundle for the sake of one
  Activity, so they are loaded on demand by `loadOrb()` in
  `src/features/activity-centre/recall/orb.ts` and only when Read, Recall,
  Colour actually runs.

**Load order matters and is not alphabetical.** `three.min.js`, then CopyShader,
LuminosityHighPassShader, EffectComposer, RenderPass, ShaderPass,
UnrealBloomPass, then `plexus-sphere.js` last. The element feature-detects the
addons and silently falls back to an unbloomed render if they are missing, and
the bloom is the whole reason it reads as a lit plexus rather than flat dust.
