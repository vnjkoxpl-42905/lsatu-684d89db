import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Mic, Pause, Play } from "lucide-react";

/**
 * The method, performed.
 *
 * A looping demonstration of one stimulus worked the way the drill asks: each
 * piece read, told back out loud, coloured, and then the whole argument
 * recalled with the text gone. It plays on the door because the one thing that
 * makes an unfamiliar procedure click is watching somebody do it once, and
 * because the procedure's strangest moment -- the stimulus vanishing -- is
 * better seen than described.
 *
 * Everything here is synthetic and says so. The stimulus is written for the
 * demo, the transcript is authored, the clock is a prop. Nothing on it is a
 * measurement of anyone.
 */

const STIMULUS = [
  "City planners argue that widening Elm Street will ease congestion.",
  "But in the three cities that widened comparable roads, traffic rose by roughly a fifth within two years.",
  "So widening Elm Street will probably make congestion worse, not better.",
];

const TELL = [
  "So the planners want to widen Elm Street because they think it will cut the traffic.",
  "But three other cities did the same thing and traffic actually went up, like twenty percent, over two years.",
  "So the author is saying widening it will probably make things worse.",
];

const COLOUR = ["Classic. Every city says that.", "Twenty percent is a lot. Who counted?", "Probably. Not definitely."];

const RECALL =
  "Planners say widen Elm Street to ease congestion. Three cities widened similar roads and traffic went up about a fifth. So it will probably make it worse.";

const DETAILS: { label: string; carried: boolean }[] = [
  { label: "Elm Street", carried: true },
  { label: "planners", carried: true },
  { label: "ease congestion", carried: true },
  { label: "three cities", carried: true },
  { label: "up a fifth", carried: true },
  { label: "within two years", carried: false },
  { label: "worse, not better", carried: true },
];

type Kind = "read" | "tell" | "colour" | "space" | "recall" | "tally" | "hold";
interface Beat {
  kind: Kind;
  i: number;
  ms: number;
}

const BEATS: Beat[] = [
  ...[0, 1, 2].flatMap((i): Beat[] => [
    { kind: "read", i, ms: 1900 },
    { kind: "tell", i, ms: 2600 },
    { kind: "colour", i, ms: 1500 },
  ]),
  { kind: "space", i: 3, ms: 900 },
  { kind: "recall", i: 3, ms: 4200 },
  { kind: "tally", i: 3, ms: 1900 },
  { kind: "hold", i: 3, ms: 2600 },
];

const STEP_LABEL: Record<Kind, string> = {
  read: "01 · Read it",
  tell: "02 · Tell it back",
  colour: "03 · Colour it",
  space: "Space",
  recall: "04 · Recall it",
  tally: "Carried",
  hold: "Carried",
};

/**
 * Reveals `text` a character at a time across `ms`, starting over each time
 * `on` flips true. When `on` goes false the text stays where it got to, so a
 * retelling remains readable while the colour lands beside it.
 */
function useTypewriter(text: string, on: boolean, ms: number, instant: boolean): string {
  const [n, setN] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) {
      setN(text.length);
      return;
    }
    if (!on) return;
    let raf = 0;
    const t0 = performance.now();
    setN(0);
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.floor(k * text.length));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, on, ms, instant]);
  return text.slice(0, n);
}

function Waveform({ live }: { live: boolean }) {
  return (
    <span className="rd-wave" data-live={live || undefined} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />
      ))}
    </span>
  );
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecallDemo() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Scrolled past, the demonstration is a timer, an interval and a per-frame
  // typewriter running for nobody. It picks up from the beat it was on.
  const inView = useInView(rootRef);

  const running = playing && !reduced && inView;

  useEffect(() => {
    if (!running) return;
    timer.current = window.setTimeout(() => setIdx((i) => (i + 1) % BEATS.length), BEATS[idx].ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idx, running]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => (s + 1) % 1500), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Reduced motion: the finished state, held, with nothing moving.
  const beat = reduced ? BEATS[BEATS.length - 1] : BEATS[idx];
  const phase = beat.kind;
  const sentence = beat.i;
  const gone = phase === "recall" || phase === "tally" || phase === "hold";
  const spacePressed = phase === "space";

  const tellText = useTypewriter(TELL[Math.min(sentence, 2)], phase === "tell", 2000, Boolean(reduced));
  const recallText = useTypewriter(RECALL, phase === "recall", 3600, Boolean(reduced));
  const showTally = phase === "tally" || phase === "hold";
  const carried = DETAILS.filter((d) => d.carried).length;

  return (
    <div className="rd-demo" ref={rootRef} data-phase={phase} data-still={!running || undefined}>
      <div className="rd-demo-bar">
        <span className="rd-demo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="rd-demo-title">Read, Recall, Colour</span>
        {/* Named for anyone watching, never announced: the label turns over
            every 1.5 to 4.2 seconds for as long as the door is open, and a
            live region here narrated the demonstration on a loop. */}
        <span className="rd-demo-step">{STEP_LABEL[phase]}</span>
        <span className="rd-demo-rec">
          <i className="rd-rec-dot" data-live={running || undefined} aria-hidden="true" />
          <span className="rd-demo-clock">{clock(seconds)}</span>
        </span>
        <button
          type="button"
          className="rd-demo-play"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause the demonstration" : "Play the demonstration"}
          disabled={Boolean(reduced)}
        >
          {playing && !reduced ? <Pause size={13} strokeWidth={2.4} /> : <Play size={13} strokeWidth={2.4} />}
        </button>
      </div>

      <div className="rd-demo-body">
        <div className="rd-paper" data-gone={gone || undefined}>
          <span className="rd-demo-label">Stimulus</span>
          <p className="rd-stim">
            {STIMULUS.map((s, i) => (
              <span
                key={i}
                className="rd-stim-line"
                data-active={!gone && i === sentence ? "true" : undefined}
                data-done={!gone && i < sentence ? "true" : undefined}
              >
                {s}{" "}
              </span>
            ))}
          </p>
          <AnimatePresence>
            {gone && (
              <motion.p
                className="rd-gone"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                The stimulus is gone. Say the whole argument back from memory.
              </motion.p>
            )}
          </AnimatePresence>
          <div className="rd-keyrow" aria-hidden="true">
            <span className="rd-key" data-pressed={spacePressed || undefined}>
              space
            </span>
            <span className="rd-keyhint">{gone ? "once more to move on" : "when you finish the piece"}</span>
          </div>
        </div>

        <div className="rd-voice">
          <span className="rd-demo-label">Out loud</span>
          <div className="rd-voice-stack">
            <AnimatePresence mode="popLayout" initial={false}>
              {!gone && (phase === "tell" || phase === "colour") && (
                <motion.div
                  key={`tell-${sentence}`}
                  className="rd-bubble"
                  layout
                  initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="rd-bubble-head">
                    <Mic size={12} strokeWidth={2.4} aria-hidden="true" />
                    You say
                    <Waveform live={phase === "tell"} />
                  </span>
                  <p>
                    “{tellText}
                    {phase === "tell" && <span className="rd-caret" aria-hidden="true" />}”
                  </p>
                </motion.div>
              )}
              {!gone && phase === "colour" && (
                <motion.div
                  key={`colour-${sentence}`}
                  className="rd-colour"
                  layout
                  initial={reduced ? false : { opacity: 0, scale: 0.9, rotate: -1.5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                >
                  <span className="rd-colour-head">Colour it</span>
                  <p>“{COLOUR[sentence]}”</p>
                </motion.div>
              )}
              {gone && (
                <motion.div
                  key="recall"
                  className="rd-bubble rd-bubble-recall"
                  layout
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="rd-bubble-head">
                    <Mic size={12} strokeWidth={2.4} aria-hidden="true" />
                    The Recall
                    <Waveform live={phase === "recall"} />
                  </span>
                  <p>
                    “{recallText}
                    {phase === "recall" && <span className="rd-caret" aria-hidden="true" />}”
                  </p>
                </motion.div>
              )}
              {showTally && (
                <motion.div
                  key="tally"
                  className="rd-tally"
                  layout
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="rd-tally-head">
                    <strong>
                      {carried} of {DETAILS.length}
                    </strong>{" "}
                    details carried
                  </span>
                  <ul className="rd-tally-list">
                    {DETAILS.map((d, i) => (
                      <motion.li
                        key={d.label}
                        data-carried={d.carried || undefined}
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.12, duration: 0.3 }}
                      >
                        {d.label}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {!gone && phase === "read" && (
                <motion.p
                  key={`quiet-${sentence}`}
                  className="rd-quiet"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4 }}
                >
                  Reading silently. Nothing comes out yet.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="rd-demo-foot">Demonstration. The stimulus and the transcript are written for this page.</p>
    </div>
  );
}
