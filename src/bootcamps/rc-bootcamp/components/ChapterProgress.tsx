/**
 * The 17-chapter progress strip.
 *
 * One tab stop for the whole strip (roving tabindex, arrows/Home/End move
 * focus). Chapters past the furthest one reached are inert: aria-disabled, no
 * hover affordance, clicks do nothing. On a coarse pointer the strip is
 * display-only and Contents is the navigation path.
 */

import { useEffect, useRef } from 'react';
import { CHAPTER_MINUTES } from '../chapterMinutes.generated';
import { CHAPTERS } from '../content';
import { useLesson } from '../useLesson';

export function ChapterProgress() {
  const { state, chapterIndex, furthestChapter, jumpToChapter, consumePulse } = useLesson();
  const barRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLButtonElement | null>(null);

  // The pop is consumed once, by the segment whose chapter was just completed.
  useEffect(() => {
    if (state.pulseChapter === null) return;
    const seg = barRef.current?.querySelectorAll<HTMLButtonElement>('.rc-seg')[state.pulseChapter];
    if (!seg) {
      consumePulse();
      return;
    }
    seg.classList.add('just-done');
    pulseRef.current = seg;
    const t = window.setTimeout(() => {
      seg.classList.remove('just-done');
      consumePulse();
    }, 520);
    return () => {
      window.clearTimeout(t);
      seg.classList.remove('just-done');
    };
  }, [state.pulseChapter, consumePulse]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const segs = Array.from(barRef.current?.querySelectorAll<HTMLButtonElement>('.rc-seg') ?? []);
    const from = segs.indexOf(document.activeElement as HTMLButtonElement);
    if (from < 0) return;
    let to: number | null = null;
    if (event.key === 'ArrowRight') to = Math.min(from + 1, segs.length - 1);
    else if (event.key === 'ArrowLeft') to = Math.max(from - 1, 0);
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = segs.length - 1;
    if (to === null) return;
    // Swallow the key either way so the lesson-level arrow nav never fires from
    // inside the strip.
    event.preventDefault();
    event.stopPropagation();
    if (to === from) return;
    segs[from].tabIndex = -1;
    segs[to].tabIndex = 0;
    segs[to].focus();
  }

  const total = CHAPTERS[state.finished ? CHAPTERS.length - 1 : chapterIndex].screens.length;
  const within = state.finished
    ? 1
    : (SCREEN_POSITION_IN_CHAPTER(state.index, chapterIndex) + 1) / total;

  return (
    <div
      className="rc-progress"
      id="progress"
      role="navigation"
      aria-label="Lesson chapters"
      ref={barRef}
      onKeyDown={onKeyDown}
    >
      {CHAPTERS.map((chapter, ci) => {
        const done = state.finished || ci < chapterIndex;
        const current = !state.finished && ci === chapterIndex;
        const locked = !state.finished && ci > furthestChapter;
        const width = state.finished || ci < chapterIndex ? '100%' : current ? `${(within * 100).toFixed(2)}%` : '0%';
        return (
          <button
            key={chapter.name}
            type="button"
            className={[
              'rc-seg',
              current ? 'is-current' : '',
              done ? 'is-done' : '',
              locked ? 'is-locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            tabIndex={current ? 0 : -1}
            aria-current={current ? 'step' : undefined}
            aria-disabled={locked || undefined}
            aria-label={`Chapter ${ci + 1}: ${chapter.name}${done ? ', completed' : ''}${
              locked ? ', not yet reached' : ''
            }`}
            onClick={() => {
              if (locked) return;
              jumpToChapter(ci);
            }}
          >
            <span className="rc-seg-tip">
              <b>{chapter.name}</b>
              <span>
                Chapter {ci + 1} of {CHAPTERS.length}
              </span>
              <i>about {CHAPTER_MINUTES[ci]} min</i>
            </span>
            <span className="rc-seg-track">
              <span className="rc-seg-fill" style={{ width }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Position of a screen inside its own chapter. */
function SCREEN_POSITION_IN_CHAPTER(index: number, chapterIndex: number): number {
  let first = 0;
  for (let i = 0; i < chapterIndex; i += 1) first += CHAPTERS[i].screens.length;
  return index - first;
}
