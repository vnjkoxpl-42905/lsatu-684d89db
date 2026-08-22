import { useCallback as useCb, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Callback, Throw, ThrowKind } from "./loom";
import "./loom.css";

/**
 * The Loom: Spot the Callback's world.
 *
 * Two sheets of paper hanging in shallow depth. The marked phrase on the lower
 * sheet is bracketed in light; on a credited answer a thread fires up to the
 * span on the upper sheet that the phrase compresses, and it stays. By the
 * fifth question the passage is visibly woven.
 *
 * The threads that stay are the point: they externalize what has already been
 * decoded, which is what lets the difficulty climb inside one passage.
 */

export type LoomPhase = "call" | "thrown";

/** A thread already woven this run. Real verdicts only. */
export interface WovenThread {
  order: number;
  phrase: string;
  kind: ThrowKind;
}

/** A vocabulary decode pinned in the margin, kept for the run. */
export interface Decode {
  term: string;
  meaning: string;
}

interface LoomStageProps {
  callback: Callback;
  phase: LoomPhase;
  /** The reading of the student's answer. Absent before they commit. */
  result?: Throw | null;
  /** Threads already woven. Omit and the loom shows no fabric rather than a fake one. */
  woven?: WovenThread[];
  /** Margin decodes for this item. */
  decodes?: Decode[];
}

export function LoomStage({ callback, phase, result, woven, decodes }: LoomStageProps) {
  const still = useReducedMotion() ?? false;
  const thrown = phase === "thrown";

  const roomRef = useRef<HTMLDivElement>(null);
  const landingRef = useRef<HTMLSpanElement>(null);
  const phraseRef = useRef<HTMLSpanElement>(null);
  const [arc, setArc] = useState<{ d: string; len: number } | null>(null);

  // The thread runs between two spans in flowing text, so its path can only be
  // known after layout. Re-measured on resize: a reflow moves both ends and a
  // thread left at the old path would point at the wrong line.
  const measure = useCb(() => {
    const room = roomRef.current;
    const from = phraseRef.current;
    const to = landingRef.current;
    if (!room || !from || !to) {
      setArc(null);
      return;
    }
    const base = room.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    if (!base.width) {
      setArc(null);
      return;
    }
    const x1 = a.left - base.left + a.width / 2;
    const y1 = a.top - base.top;
    const x2 = b.left - base.left + b.width / 2;
    const y2 = b.bottom - base.top;
    // A shallow arc through the depth gap rather than a straight line: the eye
    // is meant to travel it.
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - Math.max(28, Math.abs(y1 - y2) * 0.28);
    setArc({
      d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
      len: Math.hypot(x2 - x1, y2 - y1) + 120,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (roomRef.current) ro.observe(roomRef.current);
    return () => ro.disconnect();
  }, [measure, callback.order, phase]);

  const kind = result?.kind;
  const showThread = thrown && kind && callback.landing;

  return (
    <div
      className="loom flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
      data-testid="loom"
    >
      {/* The dye-house: warp threads, indigo vat, skeins, lamplight. Pure
          scenery, aria-hidden, outside every tested container. */}
      <div className="lo-room" aria-hidden="true">
        <div className="lo-warp" />
        <div className="lo-vat" />
        <div className="lo-skeins" />
        <div className="lo-lamplight" />
        <div className="lo-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <span className="loom-display text-base text-[hsl(var(--lo-paper))]">
          {thrown ? "The throw" : "The call"}
        </span>
        <span className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
          Q{callback.rung}
          {callback.topic ? ` · Weaving: ${callback.topic}` : ""}
        </span>
      </div>

      <div ref={roomRef} className="relative flex flex-col gap-6">
        {/* The source sheet, above. It lifts when the call goes out. */}
        <div
          className="lo-sheet rounded-sm px-6 py-5"
          data-lifted={!thrown ? "true" : "false"}
          data-sway={still ? undefined : "true"}
          data-testid="lo-sheet-source"
        >
          <p className="text-base leading-relaxed">
            {callback.landing ? (
              <>
                {callback.source.slice(0, callback.landing.start)}
                <span
                  ref={landingRef}
                  className={showThread && kind === "thread" ? "lo-landed" : undefined}
                  data-testid="lo-landing"
                >
                  {callback.landing.text}
                </span>
                {callback.source.slice(callback.landing.end)}
              </>
            ) : (
              callback.source
            )}
          </p>
        </div>

        {/* The caller sheet, below, carrying the bracketed phrase. */}
        <div
          className="lo-sheet rounded-sm px-6 py-5"
          data-sway={still ? undefined : "true"}
          data-testid="lo-sheet-caller"
        >
          <p className="text-base leading-relaxed">
            {callback.phraseAt ? (
              <>
                {callback.caller.slice(0, callback.phraseAt.start)}
                <span
                  ref={phraseRef}
                  className="lo-bracket"
                  data-calling={!thrown ? "true" : undefined}
                  data-testid="lo-phrase"
                >
                  {callback.phrase}
                </span>
                {callback.caller.slice(callback.phraseAt.end)}
              </>
            ) : (
              callback.caller
            )}
          </p>
        </div>

        {/* The thread. Only drawn once there is a throw to draw and a span to
            land on; a thread with nowhere to land is never invented. */}
        {showThread && arc ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
            data-testid="lo-threads"
          >
            <path
              className="lo-thread"
              data-state={kind === "thread" ? "throwing" : kind}
              data-testid={`lo-thread-${kind}`}
              d={arc.d}
              style={
                still
                  ? undefined
                  : ({
                      strokeDasharray: arc.len,
                      ["--lo-len" as string]: arc.len,
                    } as React.CSSProperties)
              }
            />
          </svg>
        ) : null}
      </div>

      {thrown && result ? <Reading result={result} callback={callback} /> : null}

      {decodes?.length ? (
        <div className="flex flex-col gap-1.5" data-testid="lo-decodes">
          {decodes.map((d) => (
            <p key={d.term} className="lo-decode loom-mono pl-3 text-xs">
              {d.term} = {d.meaning}
            </p>
          ))}
        </div>
      ) : null}

      <Spools woven={woven} current={callback.order} />
    </div>
  );
}

/** What the loom made of the answer. */
function Reading({ result, callback }: { result: Throw; callback: Callback }) {
  // The location line belongs to a taut thread only. Saying "you pointed at the
  // right place" over a slack thread tells the student two opposite things at
  // once: that they found it, and that it had nowhere to land.
  const line = result.wrongSide
    ? "That is the other side of the passage's debate. The phrase points at the view the author is carrying forward."
    : result.kind === "thread"
      ? "Clean throw. That thread stays for the rest of the run."
      : result.kind === "taut"
        ? result.locationOnly
          ? "You pointed at the right place and did not say what it is. The thread lands, but it carries no light until you restate it."
          : "The right idea, not yet fully restated. Say what it is, not just where."
        : "That thread had nowhere to land.";

  return (
    <div className="flex flex-col gap-1.5" data-testid="lo-reading" data-kind={result.kind}>
      <p className="loom-mono text-xs text-[hsl(var(--lo-paper)/0.6)]">
        {result.kind === "thread" ? "Woven" : result.kind === "taut" ? "Taut" : "Slack"}
      </p>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--lo-paper)/0.75)]">{line}</p>
      {result.kind !== "thread" ? (
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--lo-paper)/0.55)]">
          It refers to {callback.credited}
        </p>
      ) : null}
    </div>
  );
}

/** Five spools, one per question, filled by real verdicts. */
function Spools({ woven, current }: { woven?: WovenThread[]; current: number }) {
  if (!woven?.length) return null;
  return (
    <div className="mt-auto pt-4" data-testid="lo-spools">
      <p className="loom-mono mb-2 text-xs text-[hsl(var(--lo-paper)/0.6)]">
        {woven.filter((w) => w.kind === "thread").length} of {woven.length} woven
      </p>
      <div className="flex flex-wrap gap-1.5">
        {woven.map((w) => (
          <span
            key={w.order}
            className="lo-spool loom-mono rounded-sm px-2 py-1 text-xs"
            data-state={w.kind}
            data-current={w.order === current ? "true" : undefined}
            data-testid="lo-spool"
          >
            {w.order}
          </span>
        ))}
      </div>
    </div>
  );
}
