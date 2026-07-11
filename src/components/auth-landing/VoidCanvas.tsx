import * as React from 'react';

/**
 * VoidCanvas — full-viewport WebGL backdrop for the auth landing.
 *
 * One fragment shader draws the whole atmosphere: warm-black void, drifting
 * nebula noise, a razor-thin incandescent horizon whose position and intensity
 * respond to scroll, twinkling star layers, a faint cursor-following warmth,
 * film grain, and a vignette. Rendered on a fullscreen triangle.
 *
 * Behavior contract:
 * - prefers-reduced-motion: renders exactly one static frame, no rAF loop.
 * - WebGL unavailable: renders nothing; the page's CSS void background shows.
 * - DPR capped at 1.5 so 4K/retina screens don't quadruple fragment cost.
 * - rAF pauses while the tab is hidden.
 */

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_scroll;
uniform vec2 u_mouse;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 asp = vec2(u_res.x/u_res.y, 1.0);
  vec3 col = vec3(0.014, 0.012, 0.011);

  // Nebula — very dim warm dust drifting diagonally.
  float t = u_time*0.014;
  float n = fbm(uv*asp*2.2 + vec2(t, -t*0.6));
  n = smoothstep(0.42, 0.98, n);
  col += n * vec3(0.034, 0.025, 0.017);

  // Horizon — thin molten line low in the hero; sinks and dims on scroll.
  float hy = 0.285 - u_scroll*0.26;
  float d = uv.y - hy;
  float glow = exp(-abs(d)*22.0)*0.85 + exp(-abs(d)*4.2)*0.22;
  float core = exp(-abs(d)*240.0)*1.6;
  float hx = exp(-pow((uv.x-0.5)*2.05, 2.0));
  float breathe = 0.92 + 0.08*sin(u_time*0.5);
  float dim = mix(1.0, 0.30, smoothstep(0.0, 0.55, u_scroll));
  col += (glow+core)*hx*dim*breathe * vec3(1.0, 0.70, 0.36) * 0.55;

  // Stars — round points with soft falloff, two layers, twinkling, fading
  // toward the horizon. Each occupied hash cell places one star at a random
  // offset; distance falloff keeps them circular at any DPR.
  vec2 sp = uv*asp;
  float stars = 0.0;
  {
    vec2 g = sp*46.0; vec2 i = floor(g); vec2 f = fract(g);
    float h = hash(i);
    vec2 pos = vec2(hash(i+1.7), hash(i+4.3))*0.8+0.1;
    float d = length(f-pos);
    float tw = 0.55 + 0.45*sin(u_time*1.3 + h*41.0);
    stars += smoothstep(0.09, 0.0, d) * step(0.918, h) * tw * 0.55;
  }
  {
    vec2 g = sp*18.0 + 3.7; vec2 i = floor(g); vec2 f = fract(g);
    float h = hash(i);
    vec2 pos = vec2(hash(i+2.9), hash(i+5.1))*0.8+0.1;
    float d = length(f-pos);
    float tw = 0.7 + 0.3*sin(u_time*0.8 + h*27.0);
    stars += smoothstep(0.065, 0.0, d) * step(0.955, h) * tw;
  }
  float band = smoothstep(hy+0.02, hy+0.28, uv.y)*0.85 + 0.15;
  col += stars * band * vec3(0.92,0.88,0.80) * 0.5;

  // Cursor warmth — a faint ember that follows the pointer.
  float md = distance(uv*asp, u_mouse*asp);
  col += exp(-md*3.0) * vec3(0.30,0.21,0.11) * 0.15;

  // Film grain.
  float g = hash(uv*u_res + fract(u_time*0.7)*vec2(17.0,113.0));
  col += (g-0.5)*0.030;

  // Vignette.
  float vg = smoothstep(1.30, 0.30, distance(uv, vec2(0.5,0.45)));
  col *= mix(0.78, 1.0, vg);

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

export default function VoidCanvas() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // If anything below fails, keep the canvas invisible so the page's CSS
    // void background shows instead of an undrawn (white) buffer.
    canvas.style.visibility = 'hidden';
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl || gl.isContextLost()) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        // Shader failure is non-fatal for the page; surface for diagnosis.
        console.error('VoidCanvas shader:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('VoidCanvas link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    canvas.style.visibility = 'visible';
    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let mx = 0.5, my = 0.62, tmx = 0.5, tmy = 0.62;
    let scroll = 0;
    let raf = 0;
    let running = true;

    const resize = () => {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (tms: number) => {
      resize();
      mx += (tmx - mx) * 0.045;
      my += (tmy - my) * 0.045;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, tms / 1000);
      gl.uniform1f(uScroll, scroll);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (tms: number) => {
      if (!running) return;
      draw(tms);
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      const vh = window.innerHeight || 1;
      scroll = Math.min(window.scrollY / (vh * 1.6), 1);
    };
    const onPointer = (e: PointerEvent) => {
      tmx = e.clientX / window.innerWidth;
      tmy = 1 - e.clientY / window.innerHeight;
    };
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    onScroll();
    if (reduced) {
      // One still frame — the atmosphere without the motion.
      draw(12000);
      window.addEventListener('resize', () => draw(12000));
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('visibilitychange', onVis);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      // Do NOT lose the context here: React 18 StrictMode double-mounts this
      // effect in dev, and a lost context on the reused canvas can't compile
      // shaders on the second mount (renders as an opaque white buffer).
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
