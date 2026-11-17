import { useEffect, useRef, useState } from "react";

/** Desk geometry, monochrome Eclipse lighting. Decorative: dots are not student data. */
export function StudentOrbit() {
  const [paused, setPaused] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(false);
  const wake = useRef<() => void>(() => {});
  useEffect(() => { pause.current = paused; wake.current(); }, [paused]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};
    void import("three").then((T) => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }); }
      catch { return; } // CSS moon remains visible without WebGL.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      element.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, .1, 100);
      camera.position.set(0, 5.6, 9.2);
      camera.lookAt(0, 0, 0);
      const root = new T.Group();
      scene.add(root);
      const material = (opacity: number) => new T.MeshBasicMaterial({ color: 0xefede6, transparent: true, opacity });
      const ring = (radius: number, thickness: number, opacity: number) => {
        const mesh = new T.Mesh(new T.TorusGeometry(radius, thickness, 8, 160), material(opacity));
        mesh.rotation.x = Math.PI / 2;
        return mesh;
      };
      root.add(ring(3.2, .008, .25));
      const arc = [];
      for (let i = 0; i <= 100; i++) {
        const a = (218 - i * 2.1) * Math.PI / 180;
        arc.push(new T.Vector3(3.2 * Math.cos(a), 0, 3.2 * Math.sin(a)));
      }
      root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arc), 120, .018, 8, false), material(.65)));
      const vertices = [];
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        for (const r of [3.08, i % 4 === 0 ? 2.9 : 3.0]) vertices.push(new T.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
      }
      root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(vertices), new T.LineBasicMaterial({ color: 0xefede6, transparent: true, opacity: .25 })));
      const vertexShader = `varying vec3 n; varying vec3 v;
        void main(){ n=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }`;
      const moon = new T.Mesh(new T.SphereGeometry(1.35, 64, 64), new T.ShaderMaterial({
        vertexShader,
        fragmentShader: `varying vec3 n; varying vec3 v;
          void main(){ vec3 N=normalize(n); float rim=pow(1.-max(dot(N,normalize(v)),0.),12.);
          float light=dot(N,normalize(vec3(-.7,.7,.4)))*.5+.5;
          vec3 c=vec3(.008,.010,.011)+vec3(.95)*rim*(.65+.35*light);
          gl_FragColor=vec4(c,1.); }`,
      }));
      root.add(moon);
      // A camera-facing corona behind the opaque sphere avoids a plastic hotspot.
      const corona = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        vertexShader: `varying vec2 uvv; void main(){uvv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 uvv; void main(){float r=length(uvv-.5)*4.2;
          float a=exp(-abs(r-1.35)*22.)*.9+exp(-abs(r-1.35)*5.)*.18;
          gl_FragColor=vec4(vec3(.95),a*smoothstep(1.28,1.35,r));}`,
      }));
      corona.quaternion.copy(camera.quaternion);
      root.add(corona);
      const fineRing = ring(1.62, .005, .3);
      fineRing.rotation.set(1.1, .3, 0);
      // Keep the globe face uninterrupted, as in the approved black Eclipse.
      const belt = new T.Group();
      belt.rotation.set(.16, 0, -.1);
      belt.add(ring(2.12, .005, .22));
      const beadGeometry = new T.SphereGeometry(.043, 12, 12);
      for (let i = 0; i < 25; i++) {
        const bead = new T.Mesh(beadGeometry, material(i % 4 === 0 ? .08 : .22));
        const a = i / 25 * Math.PI * 2;
        bead.position.set(2.12 * Math.cos(a), 0, 2.12 * Math.sin(a));
        belt.add(bead);
      }
      root.add(belt);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      let frame = 0, visible = true, mx = 0, my = 0, tx = 0, ty = 0, elapsed = 0, previous = 0;
      const render = (ms: number) => {
        frame = 0;
        if (disposed || document.hidden || !visible) return;
        if (!reduced.matches && !pause.current) {
          elapsed += previous ? Math.min(ms - previous, 50) : 0;
          mx += (tx - mx) * .05; my += (ty - my) * .05;
          root.rotation.set(my * .16, mx * .34, 0);
          belt.rotation.y = -elapsed * .000045; fineRing.rotation.z = elapsed * .0001;
        }
        previous = ms;
        renderer.render(scene, camera);
        element.dataset.rendered = "true";
        if (!reduced.matches && !pause.current) frame = requestAnimationFrame(render);
      };
      const kick = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
      wake.current = kick;
      const resize = () => {
        const { width, height } = element.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        root.scale.setScalar(Math.min(.88, camera.aspect * .72));
        camera.updateProjectionMatrix(); kick();
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || reduced.matches || pause.current) return;
        const r = element.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
      };
      const leave = () => { tx = ty = 0; };
      const observer = new ResizeObserver(resize); observer.observe(element);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); });
      intersection.observe(element);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", kick);
      reduced.addEventListener("change", kick);
      resize();
      cleanup = () => {
        wake.current = () => {};
        cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
        element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", kick); reduced.removeEventListener("change", kick);
        const geometries = new Set<InstanceType<typeof T.BufferGeometry>>();
        const materials = new Set<InstanceType<typeof T.Material>>();
        scene.traverse((object) => {
          if (object instanceof T.Mesh || object instanceof T.LineSegments) {
            geometries.add(object.geometry);
            (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => materials.add(m));
          }
        });
        geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
        renderer.dispose(); renderer.domElement.remove(); delete element.dataset.rendered;
      };
    }).catch(() => { /* Keep the static fallback if the optional scene cannot load. */ });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <><div ref={host} className="student-orbit" aria-hidden="true"><span className="student-orbit-fallback" /></div><button type="button" className="student-orbit-motion" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Play motion" : "Pause motion"}</button></>;
}
