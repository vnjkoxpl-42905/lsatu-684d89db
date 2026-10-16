import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { RRC_DEMOS, demoDuration, demoLabel, type RrcDemo } from "../content/read-recall-colour-section.demos";

/**
 * The four steps, watched being done.
 *
 * One stage, three films. Three stimuli from a real section, each run the way
 * the steps above say, filmed from the student's own eyes: face the page to
 * read, turn away to tell it back and react, come back to check, then the
 * whole argument from memory with the text gone.
 *
 * It is a theatre rather than three tiles because the films are the proof of
 * the method, and proof deserves the width of the page. One large frame in
 * the drill's own indigo, the poster behind a single play mark, and the three
 * films as chapters underneath. When one ends the next begins, so the three
 * run as one sitting; she can also pick any of them.
 *
 * The browser's own controls are off. They carry a download button and a
 * picture-in-picture handle, and these films are for watching here, on the
 * page that explains them. What is left is what she needs: play, where she
 * is, sound, and the whole screen.
 *
 * Nothing autoplays. The page is quiet until she presses play, the same rule
 * as the microphone: nothing begins without her.
 */
export function SectionDemos({ demos = RRC_DEMOS, simpleLabels = false }: { demos?: RrcDemo[]; simpleLabels?: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [wide, setWide] = useState(false);
  /** A chapter chosen while a film was running keeps running. */
  const carryOn = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const current = demos[index];

  const play = useCallback(() => {
    // A refused play (autoplay policy, a detached element) is not an error
    // she needs to read about; the play mark simply stays. Older engines and
    // jsdom return nothing from play(), hence the guard.
    const p = videoRef.current?.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) play();
    else v.pause();
  }, [play]);

  const choose = useCallback(
    (i: number) => {
      if (i === index) {
        if (!simpleLabels) toggle();
        return;
      }
      carryOn.current = !simpleLabels && playing;
      videoRef.current?.pause();
      setPlaying(false);
      setLength(0);
      setIndex(i);
      setTime(0);
    },
    [index, playing, simpleLabels, toggle],
  );

  // A new source: pick up where the last film left off, if it was running.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    if (carryOn.current) {
      carryOn.current = false;
      play();
    }
  }, [current?.src, play]);

  useEffect(() => {
    const video = videoRef.current;
    return () => { video?.pause(); };
  }, []);

  useEffect(() => {
    const onChange = () => setWide(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onEnded = () => {
    if (!simpleLabels && index + 1 < demos.length) {
      carryOn.current = true;
      setIndex(index + 1);
      setTime(0);
    } else {
      setPlaying(false);
    }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setTime(t);
  };

  const toggleWide = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    // Only when the stage itself has focus. The controls under it are real
    // buttons and a real slider, with their own keys.
    if (e.target !== e.currentTarget) return;
    if (e.key === " " || e.key === "k" || e.key === "Enter") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(Math.min(length, time + 5));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(Math.max(0, time - 5));
    } else if (e.key === "m") {
      setMuted((m) => !m);
    } else if (e.key === "f") {
      toggleWide();
    }
  };

  if (demos.length === 0 || !current) return null;

  const currentLabel = simpleLabels ? `Example ${index + 1}` : demoLabel(current);
  const total = length || current.seconds;
  const pct = total > 0 ? (time / total) * 100 : 0;

  return (
    <section className="sl-bp-demos" aria-labelledby={simpleLabels ? undefined : "sl-bp-demos-h"} aria-label={simpleLabels ? "Video examples" : undefined}>
      {!simpleLabels && <div className="sl-bp-demos-head">
        <h2 className="sl-bp-h2" id="sl-bp-demos-h">
          Watch it done
        </h2>
        <p className="sl-bp-demos-lede">
          Three questions from one real section, each worked exactly as the steps above describe.
          Listen for the look away, the retell in plain words, and the whole argument coming back
          with the text gone.
        </p>
      </div>}

      <div className="sl-theatre" data-playing={playing || undefined} data-wide={wide || undefined}>
        <div
          className="sl-theatre-stage"
          ref={stageRef}
          tabIndex={0}
          role="group"
          aria-label={`${currentLabel} player`}
          onKeyDown={onKey}
          onContextMenu={(e) => e.preventDefault()}
        >
          <video
            ref={videoRef}
            key={current.id}
            preload="metadata"
            playsInline
            poster={current.poster}
            aria-label={currentLabel}
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            muted={muted}
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
            onDurationChange={(e) => setLength(e.currentTarget.duration)}
          >
            <source src={current.src} type="video/mp4" />
          </video>

          {!playing && (
            <button
              type="button"
              className="sl-theatre-play"
              onClick={toggle}
              aria-label={time > 0 ? "Resume" : `Play ${currentLabel}`}
            >
              <Play size={30} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          <div className="sl-theatre-bar" onKeyDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sl-theatre-btn"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause size={16} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Play size={16} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
            <span className="sl-theatre-time" aria-live="off">
              {clock(time)} <span aria-hidden="true">/</span> {clock(total)}
            </span>
            <input
              type="range"
              className="sl-theatre-scrub"
              min={0}
              max={Math.max(1, total)}
              step={0.25}
              value={Math.min(time, total)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Position"
              aria-valuetext={`${clock(time)} of ${clock(total)}`}
              style={{ "--sl-scrub": `${pct}%` } as CSSProperties}
            />
            <button
              type="button"
              className="sl-theatre-btn"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Sound on" : "Sound off"}
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX size={16} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Volume2 size={16} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="sl-theatre-btn"
              onClick={toggleWide}
              aria-label={wide ? "Leave full screen" : "Full screen"}
            >
              {wide ? (
                <Minimize2 size={16} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Maximize2 size={16} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <ol className="sl-theatre-chapters" aria-label="The three demonstrations">
          {demos.map((d, i) => (
            <li key={d.id}>
              <button
                type="button"
                className="sl-theatre-chapter"
                aria-current={i === index ? "true" : undefined}
                aria-label={`${simpleLabels ? `Example ${i + 1}` : demoLabel(d)}, ${demoDuration(d)}`}
                onClick={() => choose(i)}
              >
                <span className="sl-theatre-thumb" aria-hidden="true">
                  <img src={d.poster} alt="" loading="lazy" decoding="async" />
                  {i === index && playing && <span className="sl-theatre-live" />}
                </span>
                <span className="sl-theatre-cap">
                  <span className="sl-bp-demo-label">
                    {simpleLabels ? `Example ${i + 1}` : `Question ${d.question}`}
                  </span>
                  <span className="sl-bp-demo-time">{demoDuration(d)}</span>
                </span>
                {!simpleLabels && <span className="sl-theatre-sub">
                  PrepTest {d.prepTest} · Section {d.section}
                </span>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
