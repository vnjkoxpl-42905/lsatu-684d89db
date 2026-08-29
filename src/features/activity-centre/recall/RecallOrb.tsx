import { useEffect, useRef, useState } from "react";
import { loadOrb, orbAttrs, type OrbElement, type OrbMood } from "./orb";

/**
 * The orb, and the only thing on screen while she is recalling.
 *
 * It is created imperatively rather than rendered as JSX. The element holds a
 * WebGL context and rebuilds itself when most of its attributes change, so
 * letting React own it risks dropping and recreating that context on an
 * unrelated re-render. React owns the box; the element owns itself.
 *
 * It is also deliberately NOT `id="orb"`. Only an element with that id
 * publishes `--orb-hue` to the document root, and each write restyles the whole
 * document. A second publisher would fight the host page for the property.
 */
export function RecallOrb({
  mood,
  level,
  size = 320,
}: {
  mood: OrbMood;
  /** 0..1. Microphone amplitude while she talks, speech boundaries while it does. */
  level: number;
  size?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const orb = useRef<OrbElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadOrb().then((ok) => {
      if (cancelled || !ok || !host.current || orb.current) return;
      const el = document.createElement("plexus-sphere") as OrbElement;
      // Sized by the camera, not by a CSS box. `gl_PointSize` is in device
      // pixels and does not scale with the canvas, so stretching a small box
      // grows the cloud while leaving every particle the size it was, and the
      // orb thins into dust exactly as it gets big.
      el.setAttribute("particles", "700");
      el.setAttribute("radius", "60");
      el.setAttribute("grid", "off");
      el.setAttribute("bloom", "on");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      host.current.appendChild(el);
      orb.current = el;
      setReady(true);
    });
    return () => {
      cancelled = true;
      orb.current?.remove();
      orb.current = null;
    };
  }, [size]);

  useEffect(() => {
    const el = orb.current;
    if (!el) return;
    const { mode, state } = orbAttrs(mood);
    if (el.getAttribute("mode") !== mode) el.setAttribute("mode", mode);
    // `state` is read live in the animation loop and is NOT an observed
    // attribute, precisely so a run starting does not drop the WebGL context.
    if (el.getAttribute("state") !== state) el.setAttribute("state", state);
  }, [mood, ready]);

  useEffect(() => {
    orb.current?.setLevel?.(level);
  }, [level]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="ac-recall-orb"
      style={{ width: size, height: size }}
      data-ready={ready ? "true" : "false"}
      data-mood={mood}
    />
  );
}

export default RecallOrb;
