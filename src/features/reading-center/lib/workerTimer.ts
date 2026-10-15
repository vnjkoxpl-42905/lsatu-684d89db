/**
 * Timer in a Web Worker, as Spreeder does it: browsers clamp setTimeout in
 * background or hidden tabs to once a second, which would freeze reading at
 * 60 WPM. Worker timers are not clamped. Falls back to setTimeout.
 */
const SOURCE = `
let id = null;
self.onmessage = (e) => {
  if (id !== null) { clearTimeout(id); id = null; }
  if (e.data && e.data.delay != null) {
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start >= e.data.delay) { id = null; self.postMessage(e.data.token); }
      else id = setTimeout(tick, Math.min(4, e.data.delay));
    };
    id = setTimeout(tick, Math.max(0, e.data.delay - 4));
  }
};`;

let worker: Worker | null | undefined;
let nextToken = 1;
const callbacks = new Map<number, () => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([SOURCE], { type: "text/javascript" })));
    worker.onmessage = (e: MessageEvent<number>) => {
      const cb = callbacks.get(e.data);
      callbacks.delete(e.data);
      cb?.();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** One pending timer at a time (the reader only ever needs one). Returns a cancel function. */
export function startTimer(delay: number, cb: () => void): () => void {
  const w = getWorker();
  if (!w) {
    const t = window.setTimeout(cb, delay);
    return () => window.clearTimeout(t);
  }
  const token = nextToken++;
  callbacks.clear();
  callbacks.set(token, cb);
  w.postMessage({ delay, token });
  return () => {
    if (callbacks.delete(token)) w.postMessage({ delay: null });
  };
}
