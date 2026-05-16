import { useEffect, useRef, useState } from 'react';
import {
  BOOTCAMP_AUDIO_CHAPTERS,
  BOOTCAMP_AUDIO_JUMP_LINKS,
  BOOTCAMP_AUDIO_SRC,
} from '../../content/bootcamp/audio';
import { cn } from '../../lib/utils';

export function AudioOverview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(sec, duration || sec));
    if (audio.paused) void audio.play().catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  };

  const skip = (delta: number) => seekTo(current + delta);

  const setSpeed = (r: number) => {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  const activeChapter = BOOTCAMP_AUDIO_CHAPTERS.findIndex((c, i) => {
    const next = BOOTCAMP_AUDIO_CHAPTERS[i + 1]?.start ?? (duration || Infinity);
    return current >= c.start && current < next;
  });

  return (
    <figure className="border border-rule bg-paper-bright/40">
      <header className="border-b border-rule px-5 py-3">
        <div className="protocol text-ink-mute">Audio overview</div>
        <h3 className="display-title text-2xl text-ink">
          Dismantle bad arguments with LSAT blueprints
        </h3>
        <p className="mt-1 protocol text-xs text-ink-mute">
          NotebookLM Deep Dive · ~43 min · six chapters
        </p>
      </header>

      <div className="grid gap-px bg-rule lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-paper px-5 py-5">
          <ol className="mb-4 flex flex-wrap gap-2">
            {BOOTCAMP_AUDIO_CHAPTERS.map((c, i) => {
              const isActive = i === activeChapter;
              return (
                <li key={c.day}>
                  <button
                    type="button"
                    onClick={() => seekTo(c.start)}
                    className={cn(
                      'protocol border px-2 py-1 text-[0.7rem] transition-colors',
                      isActive
                        ? 'border-verdigris-deep bg-verdigris-deep text-paper'
                        : 'border-rule bg-paper text-ink-soft hover:bg-paper-bright',
                    )}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    DAY {String(c.day).padStart(2, '0')} · {c.title}
                  </button>
                </li>
              );
            })}
          </ol>

          <audio
            ref={audioRef}
            src={BOOTCAMP_AUDIO_SRC}
            preload="metadata"
            className="hidden"
          />

          <div className="mb-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={current}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek audio"
              className="w-full accent-verdigris-deep"
            />
            <div className="mt-1 flex items-center justify-between protocol text-[0.65rem] text-ink-mute">
              <span>{fmt(current)}</span>
              <span>{duration ? fmt(duration) : '— : —'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => skip(-15)}
              className="protocol border border-rule bg-paper px-2 py-1.5 text-xs text-ink-soft hover:bg-paper-bright"
              aria-label="Back 15 seconds"
            >
              ← 15s
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="display-title border border-ink bg-ink px-4 py-1.5 text-sm text-paper hover:bg-ink-soft"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => skip(15)}
              className="protocol border border-rule bg-paper px-2 py-1.5 text-xs text-ink-soft hover:bg-paper-bright"
              aria-label="Forward 15 seconds"
            >
              15s →
            </button>
            <div className="ml-auto flex items-center gap-1">
              <span className="protocol text-[0.65rem] text-ink-mute">SPEED</span>
              {[0.85, 1, 1.25, 1.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSpeed(r)}
                  className={cn(
                    'protocol border px-1.5 py-1 text-[0.65rem]',
                    rate === r
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper text-ink-soft hover:bg-paper-bright',
                  )}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>

          {activeChapter >= 0 && (
            <p className="mt-4 border-t border-rule-soft pt-3 text-sm leading-snug text-ink-soft">
              <span className="protocol mr-2 text-[0.65rem] text-ink-mute">
                NOW · DAY {String(BOOTCAMP_AUDIO_CHAPTERS[activeChapter].day).padStart(2, '0')}
              </span>
              {BOOTCAMP_AUDIO_CHAPTERS[activeChapter].blurb}
            </p>
          )}
        </div>

        <div className="bg-paper px-5 py-5">
          <div className="protocol text-ink-mute">Ask the catalog</div>
          <p className="mt-1 protocol text-[0.65rem] text-ink-mute">
            The closest we get to interactive mode — every prompt routes to the relevant catalog or day page.
          </p>
          <ul className="mt-4 space-y-2.5">
            {BOOTCAMP_AUDIO_JUMP_LINKS.map((j, i) => (
              <li key={i}>
                <span className="block border border-rule bg-paper-bright/60 px-3 py-2 text-[0.9rem] leading-snug text-ink-soft">
                  {j.prompt}
                  <span className="protocol ml-2 text-[0.65rem] text-ink-mute">→</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return '— : —';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
