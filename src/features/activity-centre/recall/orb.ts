/**
 * Loading the orb, once, on demand.
 *
 * The orb is a vanilla custom element (`<plexus-sphere>`) that wants three r128
 * plus five post-processing addons as globals, in a specific order. See
 * `public/orb/README.md` for why it is vendored rather than packaged.
 *
 * It is ~670KB. Read, Recall, Colour is one Activity, so none of that may sit
 * in the main bundle: it is fetched the first time an RRC run mounts and never
 * again.
 */

/**
 * Order is load-bearing and is not alphabetical. `plexus-sphere.js` feature
 * detects the addons and falls back to an unbloomed render when they are
 * missing, which does not throw and does not warn: it just quietly draws flat
 * dust instead of a lit plexus. Getting this wrong looks like a design problem
 * rather than a loading bug, which is why the order lives in one place.
 */
const SCRIPTS = [
  "/orb/three.min.js",
  "/orb/three-CopyShader.js",
  "/orb/three-LuminosityHighPassShader.js",
  "/orb/three-EffectComposer.js",
  "/orb/three-RenderPass.js",
  "/orb/three-ShaderPass.js",
  "/orb/three-UnrealBloomPass.js",
  "/orb/plexus-sphere.js",
] as const;

let pending: Promise<boolean> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false; // Sequential execution; these depend on each other.
    el.addEventListener(
      "load",
      () => {
        el.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    el.addEventListener("error", () => reject(new Error(src)), { once: true });
    document.head.appendChild(el);
  });
}

/**
 * Fetch the orb's scripts. Resolves false when it cannot be had, which is not
 * an error the student should ever see as one: the run works without the orb,
 * it is just plainer, and failing the whole activity over an ornament would be
 * the wrong trade.
 */
export function loadOrb(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (customElements.get("plexus-sphere")) return Promise.resolve(true);
  if (pending) return pending;
  pending = SCRIPTS.reduce(
    (chain, src) => chain.then(() => loadScript(src)),
    Promise.resolve(),
  )
    .then(() => Boolean(customElements.get("plexus-sphere")))
    .catch(() => {
      pending = null;
      return false;
    });
  return pending;
}

/** The subset of the element's API this feature drives. */
export interface OrbElement extends HTMLElement {
  setLevel?: (v: number) => void;
}

/**
 * What the orb is doing, which is the only thing that changes across a whole
 * run. It is never swapped for a spinner: the gap between her finishing and the
 * feedback arriving happens dozens of times a session, and a loading state
 * appearing at exactly the rhythm of the drill would be a small ugly thing
 * arriving on a beat.
 */
export type OrbMood = "idle" | "listening" | "working" | "speaking";

export interface OrbAttrs {
  mode: "calm" | "voice";
  state: "idle" | "working";
}

export function orbAttrs(mood: OrbMood): OrbAttrs {
  switch (mood) {
    case "listening":
      // Amplitude drives speed and scale, so it surges on her voice and settles
      // into a slow breath when she pauses.
      return { mode: "voice", state: "idle" };
    case "speaking":
      // Same voice mode, but the level is pulsed from speech boundaries rather
      // than the microphone, so it moves with what it is saying.
      return { mode: "voice", state: "idle" };
    case "working":
      // Nothing to drive a level with, so the hue rate carries it: 2.48x, which
      // is the measured difference between idle and working in the reference.
      return { mode: "calm", state: "working" };
    case "idle":
    default:
      return { mode: "calm", state: "idle" };
  }
}
