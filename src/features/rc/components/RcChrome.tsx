import * as React from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RcPagerEntry } from '../lib/rcSession';

/** m:ss, counting past an hour as minutes rather than adding an hour field. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------- toolbar controls */

/**
 * A bordered text button matching the toolbar's Directions button, for the
 * left group. Passage Only View sits there in the official interface.
 */
export function RcToolbarButton({
  children,
  onClick,
  ...buttonProps
}: {
  children: React.ReactNode;
  onClick: () => void;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...buttonProps}
      className="rounded-sm border border-slate-500 bg-white px-3 py-1.5 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

/** An icon button using the toolbar's own active/idle treatment. */
export function RcToolbarIcon({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex items-center justify-center rounded-sm p-1.5 text-slate-800 transition-colors',
        active
          ? 'border border-slate-700 bg-white shadow-[inset_0_2px_3px_rgba(0,0,0,0.18)]'
          : 'border border-transparent hover:bg-slate-200',
        disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ pager */

/** Spoken suffix for each pill verdict, so screen readers get the status too. */
const PILL_STATUS_LABEL: Record<'correct' | 'incorrect' | 'answered' | 'unanswered', string> = {
  correct: ', correct',
  incorrect: ', incorrect',
  answered: ', answered',
  unanswered: ', unanswered',
};

interface PagerProps {
  entries: RcPagerEntry[];
  currentIndex: number;
  /** Extra classes for a question pill: answered / correct / incorrect. */
  pillState: (entry: RcPagerEntry) => string;
  /**
   * The pill's verdict as a VALUE, not a colour. green-600 and red-500 are not
   * separable under deuteranopia, so the pager cannot encode correctness with
   * fill alone — it needs a glyph and a spoken status too.
   * See docs/chart-palette.md §3.
   */
  pillStatus: (entry: RcPagerEntry) => 'correct' | 'incorrect' | 'answered' | 'unanswered';
  isFlagged: (entry: RcPagerEntry) => boolean;
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * Every question in the session as a numbered circle, with a rule between
 * passages and chevron buttons at the right — the official RC interface's
 * pager. The LR player has none, which is why this lives in RC.
 */
export function RcPager({
  entries,
  currentIndex,
  pillState,
  pillStatus,
  isFlagged,
  onNavigate,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: PagerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-3">
      <details className="w-full rounded border border-slate-300 bg-white p-2 text-slate-900">
        <summary className="cursor-pointer text-sm font-medium">Question overview</summary>
        {Array.from(new Set(entries.filter((entry) => entry.kind === 'question').map((entry) => entry.passageId))).map((passageId) => {
          const group = entries.filter((entry) => entry.kind === 'question' && entry.passageId === passageId);
          return <section key={passageId} aria-label={group[0]?.passageLabel ?? `Passage ${passageId}`} className="mt-3 border-t border-slate-300 pt-3">
            <h3 className="rounded bg-slate-100 p-2 text-sm font-semibold">{group[0]?.passageLabel ?? `Passage ${passageId}`}</h3>
            <div className="flex flex-wrap gap-2 py-2">{group.map((entry) => <button type="button" key={entry.questionId} onClick={() => onNavigate(entry.index)} aria-current={entry.index === currentIndex ? 'true' : undefined} className={cn('rounded border px-3 py-2 text-sm', entry.index === currentIndex ? 'border-slate-900 bg-slate-900 text-white' : pillState(entry))}>
              {entry.sourceLabel ?? `Question ${entry.label}`} · Drill {entry.label}{PILL_STATUS_LABEL[pillStatus(entry)]}{isFlagged(entry) ? ', flagged' : ''}
            </button>)}</div>
          </section>;
        })}
      </details>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
        {entries.map((entry, i) => {
          if (entry.kind === 'divider') {
            return (
              <span
                key={`divider-${entry.passageId}-${i}`}
                aria-hidden
                className="mx-1.5 h-6 w-px bg-slate-300"
              />
            );
          }
          const isCurrent = entry.index === currentIndex;
          return (
            <button
              key={`q-${entry.questionId}`}
              type="button"
              onClick={() => onNavigate(entry.index)}
              aria-label={`${entry.sourceLabel ?? `Question ${entry.label}`} · Drill ${entry.label}${PILL_STATUS_LABEL[pillStatus(entry)]}${
                isFlagged(entry) ? ', flagged' : ''
              }`}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-medium tabular-nums transition-colors',
                isCurrent
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : pillState(entry),
              )}
            >
              {entry.label}
              {(() => {
                const status = pillStatus(entry);
                if (status !== 'correct' && status !== 'incorrect') return null;
                return (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-0.5 -left-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white',
                      status === 'correct' ? 'bg-green-600' : 'bg-red-500',
                    )}
                  >
                    {status === 'correct' ? (
                      <Check size={8} strokeWidth={4} className="text-white" />
                    ) : (
                      <X size={8} strokeWidth={4} className="text-white" />
                    )}
                  </span>
                );
              })()}
              {isFlagged(entry) && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous question"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next question"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
