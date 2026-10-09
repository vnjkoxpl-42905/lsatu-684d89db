// <plexus-sphere> — self-contained WebGL plexus core (extracted from exact_replica_os.html)
// attrs: particles, radius, speed, mode ("calm"|"voice"), grid ("on"|"off"),
//        bloom ("on"|"off"), state ("idle"|"working"), camy, camz
//
/* PARITY (Joshua, 2026-08-15): "the orbs should be visually identical, as
   literally as possible ... no perceivable difference". Two reference sources,
   and they answer different questions — do not collapse them:

   - `design/reference/exact_replica_os.html` is authority for STRUCTURE and the
     RENDER PIPELINE. It is r128, the same build we vendor, and it is where the
     real answer was hiding: the orb is rendered through an UnrealBloomPass on a
     FULL-VIEWPORT canvas, not drawn flat into a small box. Its own comment says
     the bloom "is the secret". Ours had no post-processing at all and a CSS
     radial gradient standing in for it, which is a wash behind the canvas rather
     than light coming off the particles.
   - The walkthrough recording at 23:40-26:45 is authority for the HUE CYCLE and
     its ON-SCREEN SIZE, because the replica file has no cycle in it at all.

   Everything below that carries a number was measured against one of those two,
   and which one is named at each site. */
(function () {
  if (customElements.get('plexus-sphere')) return;
  class PlexusSphere extends HTMLElement {
    /* hue/huecycle/hueperiod are observed so the cycle can be pinned or retimed
       from the console without a reload — which is the only practical way to sit
       and judge a colour period against a reference. Like the others,
       a change here rebuilds; these are config, not per-frame state.

       `state` is NOT in this list on purpose: it changes many times a session and
       a rebuild would drop the WebGL context every time a run starts. It is read
       live in the animation loop instead. */
    static get observedAttributes() { return ['particles', 'grid', 'speed', 'mode', 'hue', 'huecycle', 'hueperiod', 'bloom', 'bloomscale', 'gain', 'pixelratio', 'antialias', 'camy', 'camz']; }
    connectedCallback() {
      this.style.display = 'block';
      this._visible = false;
      // Hold a WebGL context ONLY while (near-)visible. IO is unreliable in the host's
      // canvas-doc wrapper, so poll bounding rects on a shared interval instead.
      if (!PlexusSphere._all) {
        PlexusSphere._all = new Set();
        setInterval(() => {
          const vh = window.innerHeight, vw = window.innerWidth, m = 300;
          PlexusSphere._all.forEach((el) => {
            let r = el.getBoundingClientRect();
            if (r.height < 2 && el.parentElement) r = el.parentElement.getBoundingClientRect();
            const vis = r.width > 0 && r.bottom > -m && r.top < vh + m && r.right > -m && r.left < vw + m;
            if (vis === el._visible) return;
            el._visible = vis;
            clearTimeout(el._rb);
            if (vis) el._rb = setTimeout(() => el._boot(), 50);
            else el._teardown();
          });
        }, 400);
      }
      PlexusSphere._all.add(this);
    }
    _boot() {
      if (this._ready || !this._visible) return;
      if (window.THREE) this._build(); else setTimeout(() => this._boot(), 100);
    }
    attributeChangedCallback() {
      if (!this._ready) return;
      clearTimeout(this._rb);
      this._rb = setTimeout(() => { if (this._visible) { this._teardown(); this._build(); } }, 60);
    }
    disconnectedCallback() { clearTimeout(this._rb); this._teardown(); if (PlexusSphere._all) PlexusSphere._all.delete(this); }
    // K.A.S.S.A.W. patch: live microphone amplitude, 0..1. Smoothed here so callers
    // can push raw analyser values every frame without making the orb jitter.
    setLevel(v) {
      const t = Math.max(0, Math.min(1, +v || 0));
      this._level = (this._level || 0) * 0.78 + t * 0.22;
    }
    _teardown() {
      this._ready = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      /* The composer holds its own WebGLRenderTargets. Dropping the renderer
         without disposing these leaks a pair of full-viewport buffers on every
         teardown, and this element tears down every time it scrolls out of view. */
      if (this._composer) { try { this._composer.dispose(); } catch (e) {} this._composer = null; }
      if (this._renderer) {
        try { this._renderer.dispose(); this._renderer.forceContextLoss && this._renderer.forceContextLoss(); } catch (e) {}
        if (this._renderer.domElement.parentNode === this) this.removeChild(this._renderer.domElement);
        this._renderer = null;
      }
    }
    _build() {
      const THREE = window.THREE;
      /* Defaults are the reference design's values, verbatim, from
         design/reference/exact_replica_os.html. They drifted once already:
         the count was halved for this machine's integrated graphics, then
         size, link distance and brightness were each raised to hide the loss,
         and five compensations read worse than the one honest cut. If the
         framerate needs help, lower `particles` via the attribute and change
         nothing else. */
      const count = Math.max(50, +(this.getAttribute('particles') || 700));
      const radius = +(this.getAttribute('radius') || 60);
      const speed = +(this.getAttribute('speed') || 1);
      const mode = this.getAttribute('mode') || 'calm';
      const showGrid = this.getAttribute('grid') !== 'off';
      /* 4.0, and it is a BALANCE number, not a taste one. The line material sits
         at the replica's 0.25 and that constant is not up for negotiation — this
         file records it being moved twice as a stand-in for missing bloom and put
         back. So when the points gained a measured radial falloff their average
         alpha fell from a flat 1.0 to about 0.18, the mesh outweighed them, and
         the orb read as a wireframe cage: the exact inversion of the reference,
         where the dots read first and the lines are faint structure behind them.
         4.0 restores the dots' weight against that fixed 0.25 — the core clips
         hot at 1.0 where it always did, and the rim lands at 0.41 x 0.177 x 4.0 =
         0.29, so there is still a real 3.4:1 falloff across the radius where
         before there was none. Overridable as `gain` to judge against the
         reference without a code edit. */
      const gain = +(this.getAttribute('gain') || 4.0);
      const useBloom = this.getAttribute('bloom') !== 'off'
        && !!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass);
      /* Link radius is DERIVED from the particle count, not fixed at the
         replica's 15, because those two numbers are not independent.

         Links per particle go as (local density) x maxConn^3, and local density
         goes as count — so total links go as count^2. Raising particles from the
         replica's 700 to 1800 to match the recording's dot count (see the
         element in kassaw.html) would have taken the mesh from 3,347 segments to
         roughly 22,000 and buried the particles under a solid tangle, which is
         the opposite of the reference, where the dots read first and the lines
         are faint structure behind them.

         Holding links-per-particle constant means maxConn scales by the cube
         root of the count ratio. At 700 this is exactly the replica's 15, so the
         replica is reproduced unchanged; at 1800 it is ~11. */
      /* Still scaled against the TOTAL count, deliberately, even though only the
         lattice is linked as of 2026-08-16. Scaling it against the lattice count
         instead was tried first and was wrong on screen: a third as many nodes
         pushed maxConn from 13.3 up to 19.2, and a link radius that long reaches
         most of the way across the ball, so the mesh became a cage of long chords
         and the orb read as the hollow wireframe this file has been warned about
         twice. Holding the radius where it was and linking a third as many nodes
         gives the reference's own description instead: thin edges between near
         neighbours, with many nodes carrying no edge at all. */
      const maxConn = +(this.getAttribute('maxconn')
        || (15 * Math.cbrt(700 / count)).toFixed(2));

      /* Camera (measured off the recording, 2026-08-15). The replica file uses
         (0, 5, 180) with a full-viewport canvas; rendered at Joshua's viewport
         that gives a cloud 600px across sitting at 53.1% of the page height,
         while the SAME measurement against the recording gives 551px at 47.9%.
         So the app in the video is a little further back and a little lower than
         the replica, and these two numbers are what close that gap:

           z 180 -> 197.4   (600.1 / 550.6 = 0.9175, and projected size is 1/z)
           y   5 -> -2.1    (21px above centre / 5.42px per world unit at z=197)

         Trimmed once against a real render measured exactly the way the recording
         was measured, then STOPPED. 196.2/-3.9 gave 553.9px at 46.91%; 197.4/-2.1
         gave 554.0px at 48.19%, against a 550.6px / 47.88% target. A third pass
         at 198.6/-2.67 came back 558.2px at 45.93% — i.e. it moved the wrong way
         by more than the correction asked for, because particle positions are
         randomised on every load and the spread BETWEEN loads (about +-1.2% on
         the centre, +-0.5% on the diameter) is wider than the sub-1% these
         numbers were being tuned against. Past this point the fit is to noise.
         Anyone tightening it further needs to average over many reloads first.

         fov stays 50 and is VERTICAL in three, so the orb is sized by the
         viewport's HEIGHT and is unaffected by how wide the window is.

         2026-08-15, SECOND PASS — camY is back to the replica's +5 and it is not
         a free parameter. The fit above tuned BOTH numbers against one measured
         quantity each (diameter, centre height) and read camY as pure vertical
         offset. It is not: the grid floor sits at y=-70, so camY also decides
         whether the camera is above that plane looking down at it or level with
         it. At -2.1 the floor collapses to an edge-on line and is then fogged
         out, and Vault.app rendered NO grid at all while the recording plainly
         shows a perspective floor under the orb, receding to a horizon. A camera
         that cannot produce the reference's floor is the wrong camera whatever
         the centre-height number says, so the floor wins and camZ is left as the
         single dial for size.

         The 21px centre-height gap that -2.1 was buying is inside the +-1.2%
         reload spread quoted above, i.e. it was fitting noise. */
      const camY = this.hasAttribute('camy') ? +this.getAttribute('camy') : 5;
      const camZ = this.hasAttribute('camz') ? +this.getAttribute('camz') : 197.4;

      /* Hue cycle. The replica file has NO cycle — it is static crimson — so the
         only source for this is the recording, where the orb sweeps the whole
         spectrum continuously. Saturation held at ~0.37 and lightness at ~0.26
         across the entire sweep, so ONLY H moves: the S/L ramp further down is
         the orb's depth structure and the cycle must not touch it.

         THE RATE TRACKS AGENT STATE, and the previous pass at this had it exactly
         backwards. Sampling mean hue once per second over two clean stretches:

           t=22-32  header reads CORE · IDLE      4.72 deg/s   (76.3s period)
           t=56-66  header reads CORE · WORKING  11.71 deg/s   (30.7s period)

         a factor of 2.48. The earlier reading of "5.35 and 5.20, flat across a
         state change" came from two stretches that were both idle, and led to a
         hard-coded 68s wall clock that can never speed up.

         Driven off wall-clock TIMES the state multiplier, not off `frame`. Both
         reproduce the measured rates, but `frame` advances per rendered frame, so
         hanging the cycle on it would make the colour period a function of the
         framerate — the orb would change colour more slowly on a busy machine.

         `hue` is the starting angle and defaults to 350, the hue of the crimson
         this replaced (#e84a65), so `huecycle="off"` still renders that orb. */
      const hueStart = (((+this.getAttribute('hue') || 350) % 360) + 360) % 360 / 360;
      const hueCycle = this.getAttribute('huecycle') !== 'off';
      /* Seconds for a full 360 while IDLE: 360 / 4.72. `hueperiod` overrides it
         for judging a candidate rate from the console. */
      const huePeriod = Math.max(4, +(this.getAttribute('hueperiod') || 76.3));

      const scene = new THREE.Scene();
      /* Replica values verbatim (0x050102, 0.002). Ours had drifted to a lighter,
         thinner fog (0x080304, 0.0015) which lifts the far side of the sphere and
         flattens the depth the ramp is trying to build. */
      scene.fog = new THREE.FogExp2(0x050102, 0.002);
      const camera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
      camera.position.set(0, camY, camZ);
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: this.getAttribute('antialias') !== 'off',
          alpha: true, powerPreference: 'low-power' });
      } catch (e) {
        this._retries = (this._retries || 0) + 1;
        if (this._retries < 6) setTimeout(() => { if (!this._ready && this._visible) this._build(); }, 1500 * this._retries);
        return;
      }
      this._retries = 0;
      /* Was pinned to 1, which on a Retina Mac renders the orb at half the
         display's resolution and then upscales it — every point edge and every
         mesh line arrives soft. The replica uses the device ratio and so does the
         recording. Capped at 2: beyond that the bloom's render targets cost more
         than the sharpness is worth. */
      const dpr = this.hasAttribute('pixelratio')
        ? Math.max(0.5, +this.getAttribute('pixelratio'))
        : Math.min(2, window.devicePixelRatio || 1);
      renderer.setPixelRatio(dpr);
      renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        clearTimeout(this._rb);
        this._rb = setTimeout(() => { if (this._visible) { this._teardown(); this._build(); } }, 2500);
      });
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
      this.appendChild(renderer.domElement);
      this._renderer = renderer;

      /* The composer replaces renderer.render(). This is the single biggest
         difference from the reference and the reason ours read flat: the glow in
         the reference is a real bloom over the bright particles, so a hub node
         bleeds into its neighbours and the core burns out, while ours was a
         static CSS radial gradient sitting BEHIND the canvas — a wash that cannot
         respond to what is actually bright. Strength/radius/threshold are the
         replica's (1.6, 0.4, 0.15), unchanged.

         If the addons are missing the orb still renders, just unbloomed, rather
         than throwing and leaving a black hole in the middle of the page. */
      /* `bloomscale` renders the bloom's own targets at a fraction of the canvas.
         Bloom is a wide blur — it has no high-frequency detail to lose — so half
         resolution is a quarter of the fill cost for no visible change, and this
         orb is fill-bound on an Iris Plus 645. */
      const bloomScale = Math.min(1, Math.max(0.25, +(this.getAttribute('bloomscale') || 0.5)));
      let composer = null, bloomPass = null;
      if (useBloom) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), 1.6, 0.4, 0.15);
        composer.addPass(bloomPass);
      }
      this._composer = composer;

      /* The floor. Same GridHelper the replica builds, but its colour follows the
         hue cycle instead of being frozen at the replica's crimson.

         The replica has no cycle, so 0x220b10 / 0x110408 are simply "dark red"
         there and they match its static orb. Here the palette rotates and the
         floor did not, so at yellow or blue it was a dark red rule under a
         yellow sphere and read as nothing at all — the grid was in the scene and
         still invisible on screen, which is most of why the floor looked missing
         even after the camera was fixed.

         GridHelper bakes its two colours into a per-vertex buffer, so setting
         material.color does not reach them. three multiplies material.color by
         the vertex colour when vertexColors is on, so the buffer is rewritten
         once as GREYSCALE WEIGHTS — the centre lines keep their 2:1 brightness
         over the grid lines, exactly the ratio 0x220b10:0x110408 encodes — and
         the hue then rides on material.color for free, one setHSL per frame
         instead of touching 204 vertices.

         S and L are 0x220b10 converted: hsl(347, 51%, 8.8%). Rounded to the
         orb's own 351 base so the whole palette shares one hue origin. */
      let gridMat = null;
      if (showGrid) {
        const grid = new THREE.GridHelper(500, 50, 0x220b10, 0x110408);
        grid.position.y = -70;
        grid.material.transparent = true;
        /* 0.65, not the replica's 0.5 (phase C, 2026-08-15). Measured against
           the recording (t83, clean floor patch at 380..560 x 780..1030): its
           line cores sit ~30 max-channel above the field, ours sat ~15. Opacity
           x1.3 and L 0.088->0.115 double the line-over-field delta; the 2:1
           centre:grid ratio lives in the vertex weights and is untouched. */
        grid.material.opacity = 0.65;
        const gc = grid.geometry.attributes.color;
        for (let i = 0; i < gc.count; i++) {
          /* Centre lines were the brighter 0x220b10 (max channel 34), grid lines
             0x110408 (max channel 17). Recover which is which from the baked
             value rather than from vertex order, which GridHelper does not
             promise. */
          const w = Math.max(gc.getX(i), gc.getY(i), gc.getZ(i)) > 0.1 ? 1.0 : 0.5;
          gc.setXYZ(i, w, w, w);
        }
        gc.needsUpdate = true;
        gridMat = grid.material;
        gridMat.color.setHSL(hueStart, 0.51, 0.115);
        scene.add(grid);
      }

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      /* Was a baked `color` attribute (a three-stop crimson ramp evaluated on the
         CPU at build time), which is exactly what made the hue unchangeable — the
         colour was frozen into the buffer. What is stored per particle now is only
         its NORMALISED RADIUS; the shader turns that into saturation and lightness
         and takes the hue from a uniform. Same ramp, one degree of freedom added. */
      /* TWO POPULATIONS, not one (2026-08-16, from the frame-measured handoff in
         `design_handoff_vault_dashboard/`). The reference orb is a lattice of
         large saturated nodes carrying the edges, sitting inside a dense field of
         small pale points — two visually distinct populations, not one cloud with
         a size ramp. This file had one, which is why the mesh and the dots always
         had to be traded off against each other.

         The handoff counts 2600 lattice to 5200 field at 1920x962. The RATIO
         (1:2) is what is adopted here; the absolute counts are not, because they
         were measured for a Canvas2D renderer at full-screen and this runs on
         Joshua's integrated graphics, where `count` is already perf-tuned. Same
         reasoning as everywhere else in this file: take the measured shape, keep
         the measured-on-this-machine budget. */
      const LATTICE_FRAC = 1 / 3;
      const nLattice = Math.max(8, Math.round(count * LATTICE_FRAC));

      /* Placement density, counted off the `orb_03` closeup (local maxima, 3px
         min separation, text masked) per 1e4 px^2 in eight radial bands. Nearly
         flat through the middle, peaking at 0.5-0.75R, falling only at the rim —
         NOT the steep falloff the brightness profile has. Conflating the two is
         the specific mistake the handoff calls out: driving placement from the
         brightness curve starves the outer half of dots and leaves the rim as
         bare mesh with nothing to terminate on. */
      const DENS_PR = [0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375, 1.00, 1.06];
      const DENS_V  = [0.63,   0.67,   0.72,   0.80,   0.99,   1.00,   0.62,   0.30,   0.16, 0.03];

      /* Inverse-CDF sample of a 3D radius whose SHELL-WEIGHTED density follows
         DENS_V. The handoff samples a projected radius and fills depth in behind
         it, which is the right move for a 2D renderer; here the projection is the
         camera's job, so the profile is applied to the 3D radius and weighted by
         r^2 for shell volume. Stated rather than hidden: this is the one place
         the port is a translation of the method rather than a copy of it. */
      const cdf = (() => {
        const N = 256, c = new Float32Array(N + 1);
        let acc = 0;
        for (let i = 0; i < N; i++) {
          const r = (i + 0.5) / N;
          let k = 0;
          while (k < DENS_PR.length - 1 && DENS_PR[k + 1] < r) k++;
          const t = (r - DENS_PR[k]) / ((DENS_PR[k + 1] ?? 1.06) - DENS_PR[k] || 1);
          const d = DENS_V[k] + (( DENS_V[k + 1] ?? 0) - DENS_V[k]) * Math.min(1, Math.max(0, t));
          acc += Math.max(0, d) * r * r;
          c[i + 1] = acc;
        }
        for (let i = 0; i <= N; i++) c[i] /= acc || 1;
        return c;
      })();
      const sampleFieldR = () => {
        const u = Math.random();
        let lo = 0, hi = cdf.length - 1;
        while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m; else hi = m; }
        return (lo + (u - cdf[lo]) / ((cdf[hi] - cdf[lo]) || 1)) / (cdf.length - 1);
      };

      const dnorms = new Float32Array(count);
      const sizes = new Float32Array(count);
      /* Per-particle brightness, `0.24 + rand^1.7 x 0.46` from the handoff. It is
         a NEW attribute: this file previously had every particle at full alpha and
         let the depth ramp carry all the variation, so the dot field had no
         internal sparkle of its own. */
      const brights = new Float32Array(count);
      const vel = [];
      /* Lattice FIRST in the buffers, so the link pass can run over a prefix of
         the array and nothing else has to know about the split. */
      for (let i = 0; i < count; i++) {
        const isLat = i < nLattice;
        const u = Math.random(), v = Math.random();
        const theta = u * 2 * Math.PI, phi = Math.acos(2 * v - 1);
        /* Lattice: spherically uniform in angle, radius 0.10-1.00 of R with
           r = INNER + u^0.55 x (OUTER-INNER). It fills the WHOLE ball and is not a
           rim shell — the handoff flags 0.72-1.00 as an earlier build's error that
           produces a hollow ring nothing like the reference, which is the same
           defect this file's own 2026-08-13 "32% surface shell" note describes.
           Field: the counted density profile above. */
        const d = isLat
          ? 0.10 + Math.pow(Math.random(), 0.55) * 0.90
          : sampleFieldR();
        const r = d * radius;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        dnorms[i] = isLat ? 1.0 : 0.0;   // which population, read by the shader
        /* Size, and the LONG UPPER TAIL is the point — the handoff's measured
           FWHM quartiles are 2.5 / 3.5 / 6.3 / 9.8 px, i.e. a few big dots carry
           disproportionate light. The old two-band `d<0.3 ? 3+rand*2 : 1.5+rand*1.5`
           had almost no tail, so every dot was nearly the same size.

           SIZE_K rescales the handoff's dash-frame pixels into this element's
           world-space point sizes: its curves have a mean near 3.7 against the old
           line's 2.25, so 0.6 keeps the overall fill and brightness this file was
           already tuned to while adopting the SHAPE of the distribution. */
        const SIZE_K = 0.6;
        sizes[i] = SIZE_K * (isLat
          ? 1.5 + Math.pow(Math.random(), 2.8) * 5.5
          : 1.5 + Math.pow(Math.random(), 3.4) * (9.5 + (1 - d) * 0.6));
        brights[i] = (0.24 + Math.pow(Math.random(), 1.7) * 0.46) * (isLat ? 0.70 : 1.0);
        vel.push((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15);
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('dnorm', new THREE.BufferAttribute(dnorms, 1));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('bright', new THREE.BufferAttribute(brights, 1));

      /* The S/L stops are the OLD baked colours converted to HSL, so at uHue=350/360
         this renders the previous crimson orb to within rounding:
           core #ffe5e8 -> s 1.00 l 0.95   mid #e84a65 -> s 0.78 l 0.60
           outer #6e1220 -> s 0.72 l 0.25
         Keeping them identical is deliberate — the reference changes the HUE and
         nothing else (measured: S and L flat across the whole sweep), so the orb's
         depth ramp is not something the cycle is allowed to touch. */
      const mat = new THREE.ShaderMaterial({
        uniforms: { uHue: { value: hueStart }, uPointK: { value: 250 }, uRadius: { value: radius }, uGain: { value: gain } },
        vertexShader: [
          'attribute float size;',
          'attribute float dnorm;',   // 1.0 = lattice node, 0.0 = field particle
          'attribute float bright;',
          'uniform float uHue;',
          'uniform float uPointK;',
          'uniform float uRadius;',
          'uniform float uGain;',
          'varying vec3 vColor;',
          'varying float vAlpha;',
          'vec3 hsl2rgb(vec3 c){',
          '  vec3 k = mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0);',
          '  vec3 rgb = clamp(abs(k-3.0)-1.0, 0.0, 1.0);',
          '  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));',
          '}',
          'void main(){',
          '  vec4 mv = modelViewMatrix*vec4(position,1.0);',
          /* APPEARANCE KEYS OFF PROJECTED RADIUS, NOT 3D RADIUS. This is the
             handoff's most specific correction and this file had it wrong: the
             old shader ramped S/L on `dnorm`, the 3D radius, which the handoff
             warns "systematically dims everything off-centre" — a particle at the
             front of the ball, sitting visually dead centre, was being lit as if
             it were out at the rim. The profile being matched was measured on a
             projected image, so it has to be applied to a projected radius. In
             view space the camera looks down -z, so that is simply |mv.xy|. */
          '  float pr = clamp(length(mv.xy)/uRadius, 0.0, 1.0);',
          /* Brightness profile. `PROF_L` falls 80 -> 0.3 across the radius, and
             BRIGHT_EXP 0.35 was DERIVED, not guessed: masked band peak luma gives
             an outer/inner ratio of 46/233 = 0.197 against a profile ratio of
             0.01, so ln(0.197)/ln(0.01) = 0.35. Fitting PROF_L as exp(-4.95*pr)
             and raising it to 0.35 collapses to exp(-1.73*pr), which lands on
             0.177 at the rim against that measured 0.197. One line, same curve. */
          '  float prof = exp(-1.73*pr);',
          /* Three tones mixed by projected radius: saturated node, pale, and
             burning toward white confined to the inner region. The old ramp went
             to s 1.00 / l 0.95 at the core — very nearly white — which is exactly
             what the handoff warns against: measured core saturation is 0.51, the
             core is SATURATED hot, and pushing lightness up greys it out. */
          '  float s, l;',
          '  if (pr < 0.35) { float t = pr/0.35; s = mix(0.70,0.92,t); l = mix(0.82,0.58,t); }',
          '  else { float t = (pr-0.35)/0.65; s = mix(0.92,0.72,t); l = mix(0.58,0.68,t); }',
          /* Lattice nodes are the large saturated ones that carry the edges, so
             they sit on the saturated end whatever their radius. */
          '  s = mix(s, 0.92, dnorm*0.5);',
          '  vColor = hsl2rgb(vec3(uHue, s, l));',
          /* Master gain. The handoff's own number is 1.05 and it is NOT copied,
             for the same reason its author says not to copy an absolute hue out
             of it: 1.05 is calibrated against their Canvas2D buffer, which also
             paints a soft radial gradient for the unresolved core and blooms in
             two octaves. This pipeline has neither of those, so 1.05 landed the
             whole orb at roughly a fifth of the luminance this file was tuned to
             and the hot centre disappeared.

             Derived instead: mean per-particle brightness is 0.24 + 0.46/2.7 =
             0.41, and `prof` is 1.0 at the centre, so a gain of 2.4 puts the core
             back at the alpha 1.0 this shader used to emit flat while leaving the
             measured falloff intact — the rim now lands at 0.41 x 0.177 x 2.4 =
             0.17, where before it was also 1.0. That difference IS the profile.
             Overridable as `gain` so it can be judged against the reference
             without a code edit. */
          '  vAlpha = clamp(bright*prof*uGain, 0.0, 1.0);',
          '  gl_PointSize = size*(uPointK/-mv.z);',
          '  gl_Position = projectionMatrix*mv;',
          '}'
        ].join('\n'),
        fragmentShader: 'varying vec3 vColor;varying float vAlpha;void main(){vec2 xy=gl_PointCoord.xy-vec2(0.5);float ll=length(xy);if(ll>0.5)discard;float a=(0.5-ll)*2.0;gl_FragColor=vec4(vColor,a*vAlpha);}',
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const cloud = new THREE.Points(geometry, mat);
      scene.add(cloud);

      /* 0.25, the replica's value. This number has been moved twice (0.25 -> 0.14
         on 2026-08-13 because the mesh read as a tangle, 0.14 -> 0.22 on
         2026-08-15 because it read as haze) and both times it was standing in for
         the bloom: without it the lines are the only structure, so they are either
         too loud or invisible. Put it back and leave it. Colour is set per frame
         from the same hue as the points. */
      const lineMat = new THREE.LineBasicMaterial({ color: 0xd44a5e, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
      lineMat.color.setHSL(hueStart, 0.72, 0.55);
      const lineGeo = new THREE.BufferGeometry();
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(lines);

      /* LINK PASS — a uniform spatial grid, and one preallocated buffer.
         The replica compares every pair every time (700 particles = 244,650
         checks) and rebuilds a JS array with push(), then allocates a fresh
         Float32BufferAttribute from it. Measured on Joshua's Iris Plus 645 that
         one pass costs 13.9ms, which on its own puts a ceiling near 60fps before
         a single pixel is drawn, and it was the largest single cost in the frame.

         Cells are maxConn wide, so every particle within linking distance is in
         one of the 27 surrounding cells and nothing outside them can qualify. The
         `j > i` test is kept, so this emits EXACTLY the pairs the naive loop
         emits — only the order differs, and these are additive lines. The output
         is identical; this is not a fidelity trade.

         Measured after the fact: this is worth about 7ms of a 61ms frame. Real,
         but it did NOT move the framerate much, because the frame is dominated by
         GPU fill rather than by this. The canvas-fraction note in `size()` is the
         change that actually mattered. */
      const CELL = maxConn;
      /* Derived, because CELL is now derived. The invariant is the one the fixed
         16 was chosen for: the grid has to span +-120 world units so that
         `axis()`'s clamp never folds two genuinely distant particles into the
         same edge cell. Hard-coding 16 while CELL shrank to 11 would have
         covered only +-88. */
      const GRID = Math.ceil(240 / CELL);
      const GRID2 = GRID * GRID, GRID3 = GRID2 * GRID;
      const cellCount = new Int32Array(GRID3);
      const cellStart = new Int32Array(GRID3 + 1);
      const order = new Int32Array(count);
      const cellIdx = new Int32Array(count);
      let lineBuf = new Float32Array(96000);
      let lineAttr = new THREE.BufferAttribute(lineBuf, 3);
      lineAttr.setUsage(THREE.DynamicDrawUsage);
      lineGeo.setAttribute('position', lineAttr);

      const axis = (v) => {
        const c = ((v + (GRID * CELL) / 2) / CELL) | 0;
        return c < 0 ? 0 : (c >= GRID ? GRID - 1 : c);
      };
      /* Only the LATTICE is linked (2026-08-16). The reference's edges are carried
         by the large saturated nodes; the dense field of small pale points has no
         edges at all, and many nodes have none either. Linking everything is what
         made the mesh and the dots compete — every extra dot was also an extra
         source of lines, so the two could never be tuned apart. The lattice is the
         first `nLattice` entries of the buffers, so this is a prefix scan and the
         spatial grid is untouched. */
      const buildLinks = (pos) => {
        cellCount.fill(0);
        for (let i = 0; i < nLattice; i++) {
          const c = axis(pos[i * 3]) * GRID2 + axis(pos[i * 3 + 1]) * GRID + axis(pos[i * 3 + 2]);
          cellIdx[i] = c; cellCount[c]++;
        }
        let run = 0;
        for (let c = 0; c < GRID3; c++) { cellStart[c] = run; run += cellCount[c]; }
        cellStart[GRID3] = run;
        const fill = cellStart.slice(0, GRID3);
        for (let i = 0; i < nLattice; i++) order[fill[cellIdx[i]]++] = i;

        const maxSq = maxConn * maxConn;
        let w = 0;
        for (let i = 0; i < nLattice; i++) {
          const xi = pos[i * 3], yi = pos[i * 3 + 1], zi = pos[i * 3 + 2];
          const cx = axis(xi), cy = axis(yi), cz = axis(zi);
          for (let ax = cx - 1; ax <= cx + 1; ax++) {
            if (ax < 0 || ax >= GRID) continue;
            for (let ay = cy - 1; ay <= cy + 1; ay++) {
              if (ay < 0 || ay >= GRID) continue;
              for (let az = cz - 1; az <= cz + 1; az++) {
                if (az < 0 || az >= GRID) continue;
                const c = ax * GRID2 + ay * GRID + az;
                const end = cellStart[c + 1];
                for (let k = cellStart[c]; k < end; k++) {
                  const j = order[k];
                  if (j <= i) continue;
                  const dx = xi - pos[j * 3], dy = yi - pos[j * 3 + 1], dz = zi - pos[j * 3 + 2];
                  if (dx * dx + dy * dy + dz * dz >= maxSq) continue;
                  if (w + 6 > lineBuf.length) {          // grow once, keep what we have
                    const bigger = new Float32Array(lineBuf.length * 2);
                    bigger.set(lineBuf); lineBuf = bigger;
                    lineAttr = new THREE.BufferAttribute(lineBuf, 3);
                    lineAttr.setUsage(THREE.DynamicDrawUsage);
                    lineGeo.setAttribute('position', lineAttr);
                  }
                  lineBuf[w] = xi; lineBuf[w + 1] = yi; lineBuf[w + 2] = zi;
                  lineBuf[w + 3] = pos[j * 3]; lineBuf[w + 4] = pos[j * 3 + 1]; lineBuf[w + 5] = pos[j * 3 + 2];
                  w += 6;
                }
              }
            }
          }
        }
        lineAttr.needsUpdate = true;
        lineAttr.updateRange = { offset: 0, count: w };
        lineGeo.setDrawRange(0, w / 3);
      };

      /* CANVAS FRACTION — how the orb stays the reference's size on screen while
         costing a fraction of the fill.

         The reference canvas is the whole viewport, and at 1920x992 on a Retina
         Mac that is 7.6M pixels of additive blending plus a five-level bloom
         chain, nearly all of it black. Measured on Joshua's Iris Plus 645 that is
         16fps. The orb itself only ever occupies the middle ~640px.

         Three quantities have to move together, or a smaller canvas is not the
         same picture:

           camera z   projected size is canvasHeight / z, so z must scale with the
                      canvas or the orb shrinks with it
           uPointK    gl_PointSize is in DEVICE PIXELS and does not scale with the
                      canvas at all. Scale the canvas without this and the cloud
                      keeps its size while every particle stays the size it was —
                      the orb thins into dust. This is the one that is easy to
                      miss and it is the whole reason the constant became a
                      uniform.
           camera y   the vertical offset is in world units, so it scales too

         All three scale by f = canvasHeight / viewportHeight, which makes the
         rendered image independent of f: the orb is the same number of screen
         pixels, in the same place, with the same particle sizes, at f=1 or f=0.6.
         f also keeps the orb sized off the VIEWPORT rather than off its own box,
         which is what the reference's full-bleed canvas did for free.

         `fitviewport` opts into this; without it (a panel, a preview) the element
         is sized by its own box as before. */
      const fitViewport = this.hasAttribute('fitviewport');
      const size = () => {
        const w = this.clientWidth || 300, h = this.clientHeight || 300;
        const f = fitViewport ? (h / (window.innerHeight || h)) : 1;
        camera.position.set(0, camY * f, camZ * f);
        mat.uniforms.uPointK.value = 250 * f;
        /* Fog is the fourth quantity, and the one that nearly slipped through.
           FogExp2 attenuates on distance FROM THE CAMERA, so pulling the camera
           in by f without touching density fogs the far side of the sphere less
           and the orb measurably brightens and spreads — 553.9px became 568.9px
           on the first try at f=0.85. Density scales by 1/f so that density x
           depth, which is all the term depends on, is left exactly where it was. */
        scene.fog.density = 0.002 / f;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        /* The composer owns its own render targets and does NOT follow the
           renderer — miss this and the bloom keeps sampling at the size it was
           built at, which shows up as a soft, offset ghost after any resize. */
        if (composer) composer.setSize(w, h);
        /* AFTER composer.setSize, which sets every pass to full size. */
        if (bloomPass) bloomPass.setSize(w * bloomScale, h * bloomScale);
      };
      size();
      this._ro = new ResizeObserver(size);
      this._ro.observe(this);

      let frame = 0, tick = 0;
      /* Hue advances on wall-clock, but scaled by the state multiplier — see the
         measured idle/working rates in _build. Accumulated rather than computed
         from a fixed origin, because the multiplier changes mid-run and a
         from-origin formula would make the colour JUMP at the moment a run
         starts instead of simply speeding up. */
      let hueAcc = hueStart;
      let lastT = performance.now();
      let lastPub = 0, lastDeg = -1;
      /* Only the page's own orb publishes the hue. A second <plexus-sphere> (a
         panel, a preview) must not fight it for the same custom property. */
      const publishes = this.id === 'orb';
      const animate = () => {
        this._raf = requestAnimationFrame(animate);
        if (!this._visible) return;

        const now = performance.now();
        // K.A.S.S.A.W. patch: amplitude drives speed, so the orb surges on the voice
        // and settles on silence instead of breathing on a fixed timer.
        const lvl = this._level || 0;
        /* Measured 2.48x between CORE · IDLE and CORE · WORKING in the recording.
           Read live off the attribute rather than closed over, so a run starting
           speeds the orb up without rebuilding the WebGL context. */
        const working = this.getAttribute('state') === 'working' ? 2.48 : 1;
        const spd = (mode === 'voice' ? speed * 1.6 : speed) * (1 + 1.4 * lvl) * working;

        if (hueCycle) {
          const dt = Math.min(0.25, (now - lastT) / 1000);
          hueAcc = (hueAcc + (dt / huePeriod) * working) % 1;
          const h = hueAcc;
          mat.uniforms.uHue.value = h;
          lineMat.color.setHSL(h, 0.72, 0.55);
          if (gridMat) gridMat.color.setHSL(h, 0.51, 0.115);
          /* Publishing this is FAR more expensive than it looks, and got more so
             on 2026-08-15 when the whole accent palette started deriving from it.
             Writing a custom property on <html> invalidates style for everything
             under it, and --accent / --ok / --danger / the washes are now used
             across the entire UI — so each write is a document-wide restyle, not
             a repaint of one gradient. Measured on the Iris Plus 645: suppressing
             this write alone moved the orb from 42 to 50.7 fps.

             Two cheap limits, no visible change. Quantising to whole degrees
             makes the write a no-op when nothing rounded differently — at the
             idle rate that is under 5 real changes a second rather than 10 — and
             the 150ms floor caps it while working. A degree of hue on 9px text
             and hairlines is not resolvable; a dropped frame is. */
          if (publishes && now - lastPub > 150) {
            lastPub = now;
            const deg = Math.round(h * 360) % 360;
            if (deg !== lastDeg) {
              lastDeg = deg;
              document.documentElement.style.setProperty('--orb-hue', String(deg));
            }
          }
        }
        lastT = now;
        frame += 0.01 * spd;
        tick++;
        cloud.rotation.y = lines.rotation.y = frame * 0.1;
        cloud.rotation.x = lines.rotation.x = frame * 0.05;
        if (mode === 'voice' || lvl > 0.002) {
          const idle = mode === 'voice' ? 0.03 * Math.sin(tick * 0.06) : 0;
          const s = 1 + idle + 0.22 * lvl;
          cloud.scale.setScalar(s); lines.scale.setScalar(s);
        }
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          pos[i * 3] += vel[i * 3] * spd; pos[i * 3 + 1] += vel[i * 3 + 1] * spd; pos[i * 3 + 2] += vel[i * 3 + 2] * spd;
          const d = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
          if (d > radius) { vel[i * 3] *= -1; vel[i * 3 + 1] *= -1; vel[i * 3 + 2] *= -1; }
        }
        geometry.attributes.position.needsUpdate = true;
        if (tick % 2 === 0) buildLinks(pos);
        if (composer) composer.render(); else renderer.render(scene, camera);
      };
      animate();
      /* Measurement hook (phase D harness, 2026-08-15). Renders once on demand
         and hands back the live canvas, so a profiling script can read pixels
         in the same task — with preserveDrawingBuffer off, the buffer is only
         valid before control returns to the browser. Debug-only; nothing in
         the app calls it. */
      this._renderOnce = () => {
        if (composer) composer.render(); else renderer.render(scene, camera);
        return renderer.domElement;
      };
      this._ready = true;
    }
  }
  customElements.define('plexus-sphere', PlexusSphere);
})();
