import * as React from 'react';
import {
  Clock,
  Flag,
  Maximize,
  Menu,
  Minimize,
  MousePointer2,
  PanelRightClose,
  Search,
  SquareStack,
  Type,
  Eye,
} from 'lucide-react';
import type { RcPagerEntry } from '../lib/rcSession';

/** m:ss, counting past an hour as minutes rather than adding an hour field. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------------------------------------------------------------- toolbar */

interface ToolbarProps {
  passageOnly: boolean;
  onTogglePassageOnly: () => void;
  findQuery: string;
  onFindChange: (value: string) => void;
  onFindEnter: () => void;
  findCount: number;
  findIndex: number;
  currentNumber: number;
  totalQuestions: number;
  clockSeconds: number;
  clockIsCountdown: boolean;
  clockOverBudget: boolean;
  timerVisible: boolean;
  onToggleTimer: () => void;
  onOpenMenu: () => void;
}

export function RcToolbar({
  passageOnly,
  onTogglePassageOnly,
  findQuery,
  onFindChange,
  onFindEnter,
  findCount,
  findIndex,
  currentNumber,
  totalQuestions,
  clockSeconds,
  clockIsCountdown,
  clockOverBudget,
  timerVisible,
  onToggleTimer,
  onOpenMenu,
}: ToolbarProps) {
  return (
    <div className="rc-toolbar">
      <button type="button" className="rc-pill-button" onClick={onTogglePassageOnly}>
        {passageOnly ? 'Passage with Question View' : 'Passage Only View'}
      </button>

      <span className="rc-find">
        <Search aria-hidden />
        <input
          type="text"
          value={findQuery}
          placeholder="Find Text, Type Here"
          aria-label="Find text in the passage"
          onChange={(e) => onFindChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onFindEnter();
            }
          }}
        />
        {findQuery.trim().length >= 2 && (
          <span className="rc-find-count">
            {findCount === 0 ? 'No matches' : `${findIndex + 1} of ${findCount}`}
          </span>
        )}
      </span>

      <span className="rc-counter">
        {currentNumber} of {totalQuestions}
      </span>

      <button
        type="button"
        className={`rc-timer${clockOverBudget ? ' rc-timer-over' : ''}`}
        onClick={onToggleTimer}
        aria-label={timerVisible ? 'Hide the timer' : 'Show the timer'}
        title={timerVisible ? 'Hide the timer' : 'Show the timer'}
      >
        <Clock size={16} aria-hidden />
        {timerVisible && (
          <span>
            {clockIsCountdown && clockSeconds < 0 ? '+' : ''}
            {formatClock(Math.abs(clockSeconds))}
          </span>
        )}
      </button>

      <button type="button" className="rc-icon-button" aria-label="Menu" title="Menu" onClick={onOpenMenu}>
        <Menu size={18} aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- right rail */

interface RailProps {
  onFullscreen: () => void;
  isFullscreen: boolean;
  onOpenReview: () => void;
  onOpenA11y: () => void;
  onToggleFlag: () => void;
  flagged: boolean;
  onToggleMasking: () => void;
  masking: boolean;
  onCollapse: () => void;
}

export function RcRightRail({
  onFullscreen,
  isFullscreen,
  onOpenReview,
  onOpenA11y,
  onToggleFlag,
  flagged,
  onToggleMasking,
  masking,
  onCollapse,
}: RailProps) {
  return (
    <div className="rc-rail">
      <button
        type="button"
        className="rc-icon-button"
        aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={onFullscreen}
      >
        {isFullscreen ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
      </button>

      <button
        type="button"
        className="rc-icon-button"
        aria-label="Review"
        title="Review"
        onClick={onOpenReview}
      >
        <SquareStack size={18} aria-hidden />
      </button>

      <button
        type="button"
        className="rc-icon-button"
        aria-label="Accessibility"
        title="Accessibility"
        onClick={onOpenA11y}
      >
        <Type size={18} aria-hidden />
      </button>

      <button
        type="button"
        className={`rc-icon-button${flagged ? ' rc-active' : ''}`}
        aria-label={flagged ? 'Remove flag' : 'Flag this question'}
        title={flagged ? 'Remove flag' : 'Flag this question'}
        onClick={onToggleFlag}
      >
        <Flag size={18} aria-hidden />
      </button>

      <button
        type="button"
        className={`rc-icon-button${masking ? ' rc-active' : ''}`}
        aria-label="Response masking"
        title="Response masking"
        onClick={onToggleMasking}
      >
        <Eye size={18} aria-hidden />
      </button>

      <button
        type="button"
        className="rc-icon-button"
        aria-label="Keyboard highlight"
        title="Coming soon"
        disabled
      >
        <MousePointer2 size={18} aria-hidden />
      </button>

      <button
        type="button"
        className="rc-icon-button"
        aria-label="Collapse"
        title="Collapse"
        onClick={onCollapse}
      >
        <PanelRightClose size={18} aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- bottom bar */

interface BottomBarProps {
  itemChip: string;
  entries: RcPagerEntry[];
  currentIndex: number;
  pillClass: (entry: RcPagerEntry) => string;
  isFlagged: (entry: RcPagerEntry) => boolean;
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** Rendered at the right: Confirm, Check passage, Continue, or nothing. */
  action?: React.ReactNode;
}

export function RcBottomBar({
  itemChip,
  entries,
  currentIndex,
  pillClass,
  isFlagged,
  onNavigate,
  onPrev,
  onNext,
  canPrev,
  canNext,
  action,
}: BottomBarProps) {
  return (
    <div className="rc-bottom">
      <span className="rc-item-chip">{itemChip}</span>

      <div className="rc-pager">
        <button type="button" className="rc-button" onClick={onPrev} disabled={!canPrev}>
          Prev
        </button>

        {entries.map((entry) => (
          <button
            key={`${entry.kind}-${entry.passageId}-${entry.index}`}
            type="button"
            className={pillClass(entry)}
            aria-label={
              entry.kind === 'range' ? `Questions ${entry.label}` : `Question ${entry.label}`
            }
            aria-current={entry.index === currentIndex ? 'true' : undefined}
            onClick={() => onNavigate(entry.index)}
          >
            {entry.label}
            {isFlagged(entry) && <span className="rc-pill-flag" aria-hidden />}
          </button>
        ))}

        <button type="button" className="rc-button rc-button-primary" onClick={onNext} disabled={!canNext}>
          Next
        </button>
      </div>

      <div>{action}</div>
    </div>
  );
}
