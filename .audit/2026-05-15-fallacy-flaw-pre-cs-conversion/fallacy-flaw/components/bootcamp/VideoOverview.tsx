import { useEffect, useRef, useState } from 'react';
import {
  BOOTCAMP_VIDEO_CHAPTERS,
  BOOTCAMP_VIDEO_POSTER,
  BOOTCAMP_VIDEO_SRC,
  VIDEO_OVERVIEW_BLURB,
} from '../../content/bootcamp/video';
import { BOOTCAMP_AUDIO_JUMP_LINKS } from '../../content/bootcamp/audio';
import { cn } from '../../lib/utils';

export function VideoOverview() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrent(v.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  const seekTo = (sec: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(sec, duration || sec));
    if (v.paused) void v.play().catch(() => {});
  };

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  const fullscreen = () => {
    const v = ref.current;
    if (!v) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void v.requestFullscreen?.().catch(() => {});
  };

  const setSpeed = (r: number) => {
    setRate(r);
    if (ref.current) ref.current.playbackRate = r;
  };

  const activeChapter = BOOTCAMP_VIDEO_CHAPTERS.findIndex((c, i) => {
    const next = BOOTCAMP_VIDEO_CHAPTERS[i + 1]?.start ?? (duration || Infinity);
    return current >= c.start && current < next;
  });

  return (
    <figure className="border border-rule bg-paper-bright/40">
      <header className="border-b border-rule px-5 py-3">
        <div className="protocol text-ink-mute">Video overview</div>
        <h3 className="display-title text-2xl text-ink">
          Mastering LSAT Flaw Questions
        </h3>
        <p className="mt-1 protocol text-xs text-ink-mute">
          NotebookLM Video · six chapters
        </p>
      </header>

      <div className="grid gap-px bg-rule lg:grid-cols-[1.6fr_1fr]">
        <div className="bg-paper px-5 py-5">
          <video
            ref={ref}
            src={BOOTCAMP_VIDEO_SRC}
            poster={BOOTCAMP_VIDEO_POSTER}
            preload="metadata"
            playsInline
            onClick={togglePlay}
            className="w-full border border-rule bg-ink"
          />

          <ol className="mt-4 flex flex-wrap gap-2">
            {BOOTCAMP_VIDEO_CHAPTERS.map((c, i) => {
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

          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={current}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek video"
              className="w-full accent-verdigris-deep"
            />
            <div className="mt-1 flex items-center justify-between protocol text-[0.65rem] text-ink-mute">
              <span>{fmt(current)}</span>
              <span>{duration ? fmt(duration) : '— : —'}</span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="display-title border border-ink bg-ink px-4 py-1.5 text-sm text-paper hover:bg-ink-soft"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={fullscreen}
              className="protocol border border-rule bg-paper px-2 py-1.5 text-xs text-ink-soft hover:bg-paper-bright"
            >
              Fullscreen
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
                NOW · DAY {String(BOOTCAMP_VIDEO_CHAPTERS[activeChapter].day).padStart(2, '0')}
              </span>
              {BOOTCAMP_VIDEO_CHAPTERS[activeChapter].blurb}
            </p>
          )}
        </div>

        <div className="bg-paper px-5 py-5">
          <div className="protocol text-ink-mute">What you&apos;ll see</div>
          <p className="mt-2 text-[0.95rem] leading-snug text-ink-soft">
            {VIDEO_OVERVIEW_BLURB}
          </p>
          <div className="mt-5 protocol text-ink-mute">Jump straight in</div>
          <ul className="mt-2 space-y-2.5">
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
