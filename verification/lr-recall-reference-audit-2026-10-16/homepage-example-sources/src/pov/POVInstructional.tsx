import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Screen } from "../rrc/Screen";
import type { Chunk } from "../rrc/Stimulus";
import { type ReadLight } from "./Room";
import { Stimulus7 } from "./Stimulus7";
import { HeadRoom } from "./HeadRoom";
import { MonitorPlane } from "./World";
import { headEvents, poseAt, turnK, blinkTimes, naturalBlink, type HeadPose } from "./headState";
import { enterAt } from "./Float";
import { type StepKey } from "./Instruction";
import { LookAway } from "./LookAway";
import { Bubble, Placard, IntroCard } from "./Cards";
import { RecallRoom } from "./RecallRoom";
import { stackLeave, type RecallSentence } from "./RecallStack";

export type Cue = { start: number; end: number; text: string };
export type BeatMap = { o: number; s: number | null; d: number; text?: string };
export type Beat = {
  kind: "card" | "read" | "tell" | "colour" | "review" | "press" | "recall" | "press2" | "settle";
  start: number; end: number;
  step?: StepKey; cue?: StepKey; gi?: number; chunkNs?: number[];
  srcStart?: number; map?: BeatMap[]; phase?: string;
};
export type Script = { slug: string; duration: number; beats: Beat[] };

/** Seconds a spoken phrase takes to write: quick, scaled a little by length. */
const writeFor = (text: string) => Math.min(0.9, 0.35 + text.trim().split(/\s+/).length * 0.045);

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/*
 * The instructional cut. ROUND 7: seen through the eyes.
 *
 * The beat script still drives everything (picture and audio cannot drift).
 * What changed is WHERE the viewer is: a head that faces the page to read,
 * turns away to tell it back, and comes back to check. headState.ts turns the
 * beats into that head; HeadRoom shows the room from it; every overlay is an
 * object standing in that room (World.tsx), so nothing can sit on the page.
 *
 * ROUND 8: no overlay is a card any more. What he says is WRITTEN IN THE AIR
 * (Air.tsx), word by word across the phrase's real duration, and the previous
 * phrase lifts out as the next writes in. The eye blinks on both gaze shifts
 * and, naturally, on the holds.
 *
 *   card     the head half-turns; the card stands beside the monitor.
 *   read     facing. Silent. The highlighter follows his real reading pace.
 *   tell     the look-away begins LEAD s before his first word.
 *   colour   still turned. "Look Away" hangs in the free space; what he says
 *            arrives as bubbles under it. The head returns for the next read.
 *   review   facing. The whole page swept once as a CHECK.
 *   press    facing. Space. The text goes.
 *   recall   turned for the whole recall; the argument rebuilds in the room.
 *   press2   back to face the page for the second press.
 */
export const POVInstructional: React.FC<{
  slug: string; chunks: Chunk[]; script: Script; cues: Cue[]; recall: RecallSentence[];
  audioSrc: string; where: string; qIndex: number; qTotal: number;
}> = ({ chunks, script, cues, recall, audioSrc, where, qIndex, qTotal }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const beat = script.beats.find((b) => t >= b.start && t < b.end) ?? script.beats[script.beats.length - 1];
  const k = beat.end > beat.start ? (t - beat.start) / (beat.end - beat.start) : 1;

  const events = React.useMemo(() => headEvents(script.beats), [script]);
  const blinks = React.useMemo(() => blinkTimes(events, script.duration), [events, script]);
  const pose: HeadPose = poseAt(events, t);
  const turned = turnK(pose);

  const stepOf: Partial<Record<Beat["kind"], StepKey>> = {
    read: "read", tell: "tell", colour: "colour", review: "review",
    press: "recall", recall: "recall", press2: "recall",
  };
  const step: StepKey | null = beat.kind === "card" ? beat.step! : (stepOf[beat.kind] ?? null);
  const introduced = new Set(script.beats.filter((b) => b.kind === "card" && b.start < t).map((b) => b.step!));
  const anyCards = script.beats.some((b) => b.kind === "card");
  const labelOn = step !== null && beat.kind !== "card" && (step === "review" || !anyCards || introduced.has(step));
  const beatFrames = Math.round((t - beat.start) * fps);

  const recalling = beat.kind === "recall" || beat.kind === "settle" || beat.kind === "press2" ||
    (beat.kind === "press" && k > 0.55);
  const pressAnim = (kk: number) =>
    interpolate(kk, [0.5, 0.58, 0.72, 0.8], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pressed = beat.kind === "press" || beat.kind === "press2" ? pressAnim(k) : 0;

  // Captions, in ORIGINAL recording time (see Round 6 notes on `map`).
  let srcT = -1;
  let patchText: string | null = null;
  if (beat.map) {
    const into = t - beat.start;
    for (const m of beat.map) {
      if (into >= m.o && into < m.o + m.d) {
        if (m.s === null) patchText = m.text ?? null; else srcT = m.s + (into - m.o);
        break;
      }
    }
  } else if (beat.srcStart !== undefined) {
    srcT = beat.srcStart + (t - beat.start);
  }
  const cueIdx = srcT >= 0 ? cues.findIndex((c) => srcT >= c.start && srcT < c.end) : -1;
  const cue = cueIdx >= 0 ? cues[cueIdx] : null;
  const speaking = beat.kind === "tell" || beat.kind === "colour";
  const bubbleText = patchText ?? (cue ? cue.text : null);
  // Written as he starts to say it: the whole phrase is on the air within
  // about three quarters of a second, so a student can read ahead of the
  // voice (R8 decision: the karaoke pace looked alive but read slowly).
  const patchMap = patchText !== null && beat.map ? beat.map.find((m) => m.s === null && m.text === patchText) : undefined;
  const bubbleSince = patchText !== null
    ? (patchMap ? t - beat.start - patchMap.o : t - beat.start)
    : cue ? srcT - cue.start : 0;
  const bubbleWrite = writeFor(bubbleText ?? "");
  // The previous phrase lifts out of the air as this one writes in.
  // (Also across a gap between cues, so a phrase never just vanishes.)
  let prevCue: Cue | null = null;
  if (patchText === null && srcT >= 0) {
    for (let i = cues.length - 1; i >= 0; i--) {
      if (cues[i].end <= srcT + 1e-6 && i !== cueIdx) { prevCue = cues[i]; break; }
    }
  }
  const prevLeave = prevCue ? Math.min(1, (srcT - prevCue.end) / 0.5) : 1;
  // A bubble only exists in the space the head has turned toward.
  const showBubble = speaking && !!bubbleText && turned > 0.6;

  // Reading light: only while reading or checking; never while talking.
  const activeNs = beat.chunkNs ?? [];
  const light: ReadLight | null =
    beat.kind === "read" ? { ns: activeNs, p: k, spread: 1.7 } :
    beat.kind === "review" ? { ns: "all", p: Math.min(1, k * 1.06), spread: 3.4 } :
    null;

  // "Look Away": rises once the turn is well under way, holds while turned.
  const awayEv = [...events].reverse().find((e) => e.move === "away" && e.t0 <= t);
  const lookAwayFrames = awayEv ? Math.round((t - awayEv.t0 - 0.45) * fps) : -1;
  const lookAwayOn = turned > 0.35 && pose.kind !== "move" || (pose.kind === "move" && pose.move === "away" && turned > 0.35);
  const lookAwayEnter = lookAwayOn ? enterAt(lookAwayFrames, fps, 90) : 0;
  const lookAwaySince = lookAwayFrames / fps;

  // Natural blinks on the holds; quiet while Space is pressed.
  const quiet = beat.kind === "press" || beat.kind === "press2";
  const blinkExtra = naturalBlink(blinks, t, quiet);

  // The Recall in the room.
  const recallB = script.beats.find((b) => b.kind === "recall");
  const inRecall = beat.kind === "recall" || beat.kind === "press2" || beat.kind === "settle";
  const recallT = recallB ? t - recallB.start : -1;
  const stackOn = inRecall && recallT >= 0 ? (beat.kind === "settle" ? stackLeave(k) : 1) : 0;

  const facing = pose.kind === "still" && pose.name === "facing";
  const through = Math.min(1, frame / durationInFrames);

  return (
    <AbsoluteFill>
      <Audio src={staticFile(audioSrc)} />
      <HeadRoom pose={pose} frameW={width} frameH={height} blinkExtra={blinkExtra}>
        <MonitorPlane>
          <Screen
            through={through}
            clock={mmss(t)}
            where={`${where}  ·  ${qIndex} of ${qTotal}`}
            instruction={recalling ? "Say the whole argument back from memory." : "Read it. Tell it back and colour it in as you go."}
            keyDoes={recalling ? "next stimulus" : "recall full stimulus"}
            pressed={pressed}
          >
            {recalling ? null : <Stimulus7 chunks={chunks} light={light} />}
          </Screen>
        </MonitorPlane>

        {lookAwayEnter > 0.01 && <LookAway enter={lookAwayEnter} since={lookAwaySince} />}

        {speaking && turned > 0.6 && prevCue && prevLeave < 1 && (
          <Bubble key={`prev-${prevCue.start}`} text={prevCue.text} since={srcT - prevCue.start} write={writeFor(prevCue.text)} leave={prevLeave} seed={Math.round(prevCue.start * 10)} />
        )}
        {showBubble && bubbleText && (
          <Bubble key={patchText !== null ? `patch-${beat.start}` : cueIdx} text={bubbleText} since={bubbleSince} write={bubbleWrite} seed={cueIdx + 3} />
        )}

        {inRecall && recallT >= 0 && stackOn > 0 && turned > 0.5 && (
          <RecallRoom sentences={recall} t={recallT} fps={fps} leave={stackOn} />
        )}

        {labelOn && step && facing && (
          <Placard step={step} cue={!!beat.cue} since={beatFrames / fps} />
        )}

        {beat.kind === "card" && beat.step && <IntroCard step={beat.step} k={k} seconds={beat.end - beat.start} />}
      </HeadRoom>
    </AbsoluteFill>
  );
};
