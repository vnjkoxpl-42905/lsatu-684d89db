/**
 * The timed reading surface.
 *
 * A modal dialog over the lesson: the passage in natural flowing paragraphs, the
 * task brief, and an advisory clock. The timer never forces an exit — at zero it
 * promotes Done, swaps the task line, and announces; the student decides when to
 * stop (ADR-0002). Escape does exactly what Done does.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PASSAGES, type Screen } from '../content';
import { useLesson } from '../useLesson';
import { ClockIcon } from './Icons';

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TestDayOverlay({
  screen,
  onDone,
}: {
  screen: Extract<Screen, { type: 'read' }>;
  onDone: () => void;
}) {
  const { announce } = useLesson();
  const passage = PASSAGES[screen.passageId];
  const totalSeconds = screen.minutes ? Math.round(screen.minutes * 60) : 0;
  const [left, setLeft] = useState(totalSeconds);
  const doneRef = useRef<HTMLButtonElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const warned = useRef(false);
  const expired = useRef(false);

  // Focus the passage, lock the page behind, restore on close.
  useEffect(() => {
    passageRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Advisory clock. Re-entering a read always starts it over — there is no
  // persisted timer, by design.
  useEffect(() => {
    if (!totalSeconds) return;
    const id = window.setInterval(() => {
      setLeft((current) => {
        const next = current - 1;
        if (next <= 60 && next > 0 && !warned.current) {
          warned.current = true;
          announce('One minute left.', true);
        }
        if (next <= 0 && !expired.current) {
          expired.current = true;
          announce('Time is up. Wrap up your read and press done.', true);
        }
        return next < 0 ? 0 : next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [totalSeconds, announce]);

  const isDone = totalSeconds > 0 && left <= 0;
  const isLow = totalSeconds > 0 && left <= 60 && left > 0;

  const taskText = isDone ? 'Time. Wrap up your read and press done.' : null;

  const brief = (
    <>
      <h3>Your task</h3>
      {taskText ? (
        <div className="td-task">{taskText}</div>
      ) : (
        <div className="td-task" dangerouslySetInnerHTML={{ __html: screen.task }} />
      )}
      {screen.thesis ? (
        <>
          <h3>Keep this in mind</h3>
          <div className="td-task td-task-serif">{screen.thesis}</div>
        </>
      ) : null}
    </>
  );

  return createPortal(
    <div
      className="rc-testday"
      role="dialog"
      aria-modal="true"
      aria-label="Timed reading"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          // Only one control exists in here; keep focus on it.
          event.preventDefault();
          doneRef.current?.focus();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onDone();
        }
      }}
    >
      <div className="td-bar">
        <div className="td-bar-title">
          {passage.label}
          {passage.source ? ` · ${passage.source}` : ''}
        </div>
        <div className="td-bar-spacer" />
        {totalSeconds > 0 ? (
          <div className={`td-timer${isLow ? ' low' : ''}${isDone ? ' done' : ''}`} role="timer">
            <ClockIcon />
            <span>{isDone ? 'Time' : formatClock(Math.max(0, left))}</span>
          </div>
        ) : null}
      </div>
      <div className="td-body">
        <div className="td-brief">{brief}</div>
        <div className="td-passage" tabIndex={-1} ref={passageRef}>
          <div className="td-flow">
            {passage.paras.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
        <aside className="td-side">
          {brief}
          <div className="td-side-spacer" />
          <button
            type="button"
            className={`td-done${isDone ? ' urge' : ''}`}
            ref={doneRef}
            onClick={onDone}
          >
            {screen.doneLabel}
          </button>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
