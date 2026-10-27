import * as React from 'react';

/**
 * ParticleBust — a classical bust rendered as ~22k luminous particles that
 * assemble from scattered dust into carved form as the section scrolls
 * through the viewport. Thought, taking form.
 *
 * Pipeline: a generated GLB of the bust (/auth/bust.glb) is surface-sampled
 * for target positions. If the mesh is missing or fails, we fall back to
 * sampling the bright pixels of the front-view still (/auth/bust-front.jpg)
 * as a 2.5D relief. Either way the scene is the same: bone-and-bronze points
 * with a cold cyan minority, additive over the page's obsidian.
 *
 * Behaviour contract:
 * - three.js is imported dynamically only when the section nears the viewport.
 * - Scroll drives assembly (scattered -> formed) with per-point stagger.
 * - Cursor gently steers the cloud; reduced motion renders it fully formed
 *   and static; hidden tab pauses the loop; unmount disposes GL resources.
 */

// Point budget tiers by machine muscle: integrated GPUs get a lighter cloud
// that reads identically at viewing distance.
const COUNT = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) >= 10 ? 20000 : 12000;

export default function ParticleBust() {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void init();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(host);

    type Targets = { pos: Float32Array; nrm: Float32Array; tone: Float32Array; relief: boolean };

    // Primary: a 2.5D pointillist relief of the front-view photograph.
    // Brightness carries both point density and point tone, so the cloud
    // reproduces the marble's actual chiaroscuro instead of approximating it.
    async function loadRelief(): Promise<Targets | null> {
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = '/auth/bust-front.jpg';
        });
        const N = 300;
        const cv = document.createElement('canvas');
        cv.width = N; cv.height = N;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, N, N);
        const data = ctx.getImageData(0, 0, N, N).data;
        const pos: number[] = [];
        const tones: number[] = [];
        const SPAN = 1.8;
        // The photo is evenly lit, so raw luminance is nearly flat across the
        // marble. Stretch it violently: crevices go sparse and near-black,
        // highlights blaze. Stipple engraving, not fog.
        const curve = (l: number) => {
          const t = Math.min(1, Math.max(0, (l - 0.30) / (0.92 - 0.30)));
          return t * t * (3 - 2 * t); // smoothstep
        };
        while (tones.length < COUNT) {
          const x = Math.floor(Math.random() * N);
          const y = Math.floor(Math.random() * N);
          const idx = (y * N + x) * 4;
          const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          if (lum < 0.05) continue;
          const t = curve(lum);
          if (Math.random() > t * 0.92 + 0.05) continue;
          const jx = (Math.random() - 0.5) / N, jy = (Math.random() - 0.5) / N;
          pos.push((x / N - 0.5 + jx) * SPAN, (0.5 - y / N + jy) * SPAN, (lum - 0.45) * 0.7 + (Math.random() - 0.5) * 0.05);
          tones.push(0.08 + 0.92 * Math.pow(t, 1.4));
        }
        const nrm = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) nrm[i * 3 + 2] = 1;
        return { pos: new Float32Array(pos), nrm, tone: new Float32Array(tones), relief: true };
      } catch {
        return null;
      }
    }

    async function loadTargets(THREE: typeof import('three')): Promise<Targets | null> {
      const relief = await loadRelief();
      if (relief) return relief;
      // Fallback: sample the GLB surface (positions AND normals — the normals
      // let the shader light the cloud like carved stone).
      try {
        const [{ GLTFLoader }, { MeshSurfaceSampler }] = await Promise.all([
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/math/MeshSurfaceSampler.js'),
        ]);
        const gltf = await new GLTFLoader().loadAsync('/auth/bust.glb');
        let mesh: import('three').Mesh | null = null;
        gltf.scene.traverse((o) => {
          const m = o as import('three').Mesh;
          if (!mesh && m.isMesh && m.geometry) mesh = m;
        });
        if (mesh) {
          const m = mesh as import('three').Mesh;
          m.updateWorldMatrix(true, false);
          const sampler = new MeshSurfaceSampler(m).build();
          const pos = new Float32Array(COUNT * 3);
          const nrm = new Float32Array(COUNT * 3);
          const p = new THREE.Vector3();
          const n = new THREE.Vector3();
          const nmat = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
          const box = new THREE.Box3().setFromObject(m);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const scale = 2.6 / Math.max(size.x, size.y, size.z);
          for (let i = 0; i < COUNT; i++) {
            sampler.sample(p, n);
            p.applyMatrix4(m.matrixWorld);
            n.applyMatrix3(nmat).normalize();
            pos[i * 3] = (p.x - center.x) * scale;
            pos[i * 3 + 1] = (p.y - center.y) * scale;
            pos[i * 3 + 2] = (p.z - center.z) * scale;
            nrm[i * 3] = n.x; nrm[i * 3 + 1] = n.y; nrm[i * 3 + 2] = n.z;
          }
          const tone = new Float32Array(COUNT).fill(1);
          return { pos, nrm, tone, relief: false };
        }
      } catch {
        // no source available
      }
      return null;
    }

    async function init() {
      let THREE: typeof import('three');
      try {
        THREE = await import('three');
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      const targets = await loadTargets(THREE);
      if (disposed) return;
      if (!targets) { setFailed(true); return; }
      if (!host) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
      camera.position.set(0, 0.02, 2.85);

      // Geometry: start scattered on a wide shell, target the sampled form.
      const geo = new THREE.BufferGeometry();
      const starts = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) {
        const r = 2.6 + Math.random() * 3.4;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        starts[i * 3] = r * Math.sin(ph) * Math.cos(th);
        starts[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
        starts[i * 3 + 2] = r * Math.cos(ph) * 0.6 - 0.5;
        seeds[i] = Math.random();
      }
      geo.setAttribute('position', new THREE.BufferAttribute(targets.pos, 3));
      geo.setAttribute('aNormal', new THREE.BufferAttribute(targets.nrm, 3));
      geo.setAttribute('aTone', new THREE.BufferAttribute(targets.tone, 1));
      geo.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProgress: { value: reduced ? 1 : 0 },
          uTime: { value: 0 },
          uSize: { value: (window.devicePixelRatio || 1) >= 2 ? 3.3 : 2.6 },
          uCursor: { value: new THREE.Vector3(99, 99, 0) },
          uRelief: { value: targets.relief ? 1 : 0 },
        },
        vertexShader: `
          attribute vec3 aStart;
          attribute vec3 aNormal;
          attribute float aTone;
          attribute float aSeed;
          uniform float uProgress;
          uniform float uTime;
          uniform float uSize;
          uniform vec3 uCursor;
          uniform float uRelief;
          varying float vSeed;
          varying float vDepth;
          varying float vLight;
          void main() {
            vSeed = aSeed;
            // Per-point stagger: each particle arrives on its own schedule.
            float t = clamp(uProgress * 1.35 - aSeed * 0.35, 0.0, 1.0);
            t = 1.0 - pow(1.0 - t, 3.0);
            vec3 p = mix(aStart, position, t);
            // Formed particles breathe very slightly; unformed ones drift.
            float drift = (1.0 - t) * 0.22 + 0.012;
            p.x += sin(uTime * 0.5 + aSeed * 40.0) * drift;
            p.y += cos(uTime * 0.4 + aSeed * 55.0) * drift * 0.7;
            // The cursor is a finger through dust: formed points shy away
            // from it and settle back when it passes.
            vec2 away = p.xy - uCursor.xy;
            float d = length(away);
            float push = smoothstep(0.55, 0.0, d) * 0.16 * t;
            p.xy += (d > 0.0001 ? away / d : vec2(0.0)) * push;
            p.z += push * 0.4;
            // Carve the cloud. GLB path: a hard raking key from upper left.
            // Relief path: the photograph's own chiaroscuro, carried per point.
            vec3 n = normalize(mat3(modelViewMatrix) * aNormal);
            float lam = max(dot(n, normalize(vec3(-0.58, 0.42, 0.70))), 0.0);
            vLight = mix(pow(lam, 1.35), aTone, uRelief);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
            // Cap sprite size: scattered points sweep close to the camera and
            // huge additive sprites are pure overdraw on integrated GPUs.
            gl_PointSize = min(uSize * (2.6 / vDepth) * (0.65 + aSeed * 0.7) * (0.75 + vLight * 0.5), 5.5);
          }
        `,
        fragmentShader: `
          precision mediump float;
          varying float vSeed;
          varying float vDepth;
          varying float vLight;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.06, d);
            // Bone marble, gilded minority, and a rare cold cyan instrument tick.
            vec3 bone = vec3(0.90, 0.87, 0.80);
            vec3 bronze = vec3(0.88, 0.72, 0.42);
            vec3 cyan = vec3(0.54, 0.85, 0.89);
            vec3 col = mix(bone, bronze, step(0.72, vSeed) * 0.85);
            col = mix(col, cyan, step(0.955, vSeed));
            // Chiaroscuro: lit planes glow, shadow planes sink into the page.
            float shade = 0.14 + 0.98 * vLight;
            col *= shade;
            float fade = clamp(1.9 - vDepth * 0.42, 0.10, 1.0);
            gl_FragColor = vec4(col, a * (0.30 + 0.74 * vLight) * fade);
          }
        `,
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);

      let w = 0, h = 0;
      const resize = () => {
        const rect = host.getBoundingClientRect();
        if (rect.width === w && rect.height === h) return;
        w = rect.width; h = rect.height;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
      };
      resize();

      // A flat relief flattens out at a steep yaw; the full mesh can take one.
      const baseYaw = targets.relief ? -0.1 : -0.34;
      let progress = reduced ? 1 : 0;
      let tProgress = progress;
      let rx = 0, ry = 0, trx = 0, try_ = 0;
      let raf = 0;
      let running = true;
      let visible = true;

      const onScroll = () => {
        const rect = host.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the section top enters, 1 while the bust still sits mid-view.
        const raw = (vh * 0.92 - rect.top) / (vh * 0.62 + rect.height * 0.22);
        tProgress = Math.min(Math.max(raw, 0), 1);
      };
      // Cursor in approximate world units at the bust's depth, so the shader
      // can push points away from it. Off-canvas parks it far away.
      let cwx = 99, cwy = 99, cx = 99, cy = 99;
      const onPointer = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        try_ = nx * 0.5;
        trx = ny * 0.25;
        if (nx < -0.55 || nx > 0.55 || ny < -0.55 || ny > 0.55) { cwx = 99; cwy = 99; return; }
        const worldH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        cwx = nx * worldH * camera.aspect;
        cwy = -ny * worldH;
      };

      const clock = new THREE.Clock();
      let frame = 0;
      const loop = () => {
        if (!running) return;
        raf = requestAnimationFrame(loop);
        if (!visible) return;
        frame++;
        // Once formed and undisturbed, the cloud only breathes; half rate is
        // indistinguishable and returns a full frame budget to the page.
        if (progress > 0.985 && Math.abs(tProgress - progress) < 0.01 && frame % 2 === 0) return;
        resize();
        progress += (tProgress - progress) * 0.055;
        ry += (try_ - ry) * 0.04;
        rx += (trx - rx) * 0.04;
        const t = clock.getElapsedTime();
        cx += (cwx - cx) * 0.12; cy += (cwy - cy) * 0.12;
        mat.uniforms.uCursor.value.set(cx, cy, 0);
        mat.uniforms.uProgress.value = progress;
        mat.uniforms.uTime.value = t;
        points.rotation.y = baseYaw + ry + (reduced ? 0 : Math.sin(t * 0.08) * (targets.relief ? 0.05 : 0.1));
        points.rotation.x = rx * 0.6;
        renderer.render(scene, camera);
      };

      const visIO = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '80px 0px' });
      visIO.observe(host);
      const onVis = () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; raf = requestAnimationFrame(loop); }
      };

      if (reduced) {
        // One formed, still frame.
        resize();
        points.rotation.y = baseYaw;
        mat.uniforms.uProgress.value = 1;
        renderer.render(scene, camera);
        window.addEventListener('resize', resize);
        cleanup = () => {
          window.removeEventListener('resize', resize);
          visIO.disconnect();
          geo.dispose(); mat.dispose(); renderer.dispose();
          renderer.domElement.remove();
        };
        return;
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('visibilitychange', onVis);
      onScroll();
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVis);
        visIO.disconnect();
        geo.dispose(); mat.dispose(); renderer.dispose();
        renderer.domElement.remove();
      };
    }

    return () => {
      disposed = true;
      io.disconnect();
      if (cleanup) cleanup();
    };
  }, []);

  if (failed) {
    // Honest fallback: the front-view still, treated like the rest of the page.
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/auth/bust-front.jpg)',
          backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          opacity: 0.85,
          maskImage: 'radial-gradient(85% 85% at 50% 50%, black 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(85% 85% at 50% 50%, black 55%, transparent 100%)',
        }}
      />
    );
  }
  return <div ref={hostRef} aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />;
}
