/**
 * Contents dialog.
 *
 * Deliberately not a shadcn Sheet: the ported stylesheet already implements
 * this panel, and matching the verified prototype exactly matters more than
 * reusing the primitive. The behavior a Sheet would give us is implemented
 * here — modal semantics, focus in and restore, trapped Tab, scroll lock,
 * Escape to close (handled at the page level with the overlay).
 */

import { Fragment, useEffect, useRef } from 'react';
import { CHAPTER_MINUTES } from '../chapterMinutes.generated';
import { CHAPTERS } from '../content';
import { startsAct } from '../lessonMeta';
import { useLesson } from '../useLesson';

export function TocSheet({ triggerRef }: { triggerRef: React.RefObject<HTMLButtonElement> }) {
  const { state, chapterIndex, furthestChapter, jumpToChapter, setToc } = useLesson();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = state.tocOpen;

  useEffect(() => {
    if (!open) return;
    const root = panelRef.current;
    const current =
      root?.querySelector<HTMLButtonElement>('.rc-toc-item.current') ??
      root?.querySelector<HTMLButtonElement>('.rc-toc-item');
    current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open, triggerRef]);

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="rc-toc open"
      id="toc"
      role="dialog"
      aria-modal="true"
      aria-label="Contents"
      ref={panelRef}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) setToc(false);
      }}
    >
      <div className="rc-toc-panel">
        <div className="rc-toc-head">
          <h2>Contents</h2>
          <button type="button" className="rc-toc-close" onClick={() => setToc(false)}>
            Close
          </button>
        </div>
        <div id="tocList">
          {CHAPTERS.map((chapter, ci) => {
            const locked = ci > furthestChapter;
            const act = startsAct(ci);
            return (
              <Fragment key={chapter.name}>
                {act ? (
                  <div className="rc-toc-act" role="presentation">
                    {act.label}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={[
                    'rc-toc-item',
                    ci === chapterIndex ? 'current' : '',
                    ci < chapterIndex ? 'done' : '',
                    locked ? 'locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-disabled={locked || undefined}
                  onClick={() => {
                    if (locked) return;
                    setToc(false);
                    jumpToChapter(ci);
                  }}
                >
                  <span className="rc-toc-num">{ci + 1}</span>
                  <span className="rc-toc-name">{chapter.name}</span>
                  <span className="rc-toc-time">about {CHAPTER_MINUTES[ci]} min</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
