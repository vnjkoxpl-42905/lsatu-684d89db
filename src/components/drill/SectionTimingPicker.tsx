import * as React from 'react';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * How long a section runs, expressed as a percentage of the student's own
 * standard clock rather than as a number of minutes.
 *
 * Percent is the unit a student trains against — "94%" is an intensity, "33
 * minutes" is trivia — and it stays meaningful when the standard clock is not
 * 35:00, which is exactly the case for anyone with extra time. Minutes are
 * derived at the point of use.
 */
export type SectionTiming =
  | { mode: 'timed'; percent: number }
  | { mode: 'unlimited' };

export const STANDARD_TIMING: SectionTiming = { mode: 'timed', percent: 100 };

/**
 * Presets under 100%. Deliberately not evenly spaced: 97 and 94 are the small
 * squeezes a student can absorb without changing method, and 70 is the one
 * that forces a different way of working.
 */
const SPEED_TRAINING_PERCENTS = [97, 94, 70];

const MIN_PERCENT = 10;
const MAX_PERCENT = 300;
/** One nudge of the clock stepper. Half a minute reads cleanly at every base. */
const TIME_STEP_SECONDS = 30;

/** MM:SS, zero-padded on both halves, which is how a section clock reads. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const clampPercent = (p: number) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, p));

interface Props {
  value: SectionTiming;
  /**
   * Accepts an updater as well as a value, so the ± steppers can compose off
   * the latest state. With a plain value two fast clicks both read the same
   * render's percent and the second one is lost.
   */
  onChange: React.Dispatch<React.SetStateAction<SectionTiming>>;
  /**
   * The student's own standard clock, in minutes. 35 for a section run at
   * national time; their accommodated clock otherwise. Every percentage on
   * this control is a percentage of THIS, not of 35:00, so a student with
   * time and a half still sees 100% as their normal.
   */
  baseMinutes: number;
  /**
   * Questions in the chosen section. Omit before a section is picked — the
   * per-question line then hides rather than quoting an invented count.
   */
  questionCount?: number;
  /**
   * Restricts the control to these percentages, in the order given, and hides
   * speed training and custom. Reading Comprehension needs this: its clock is
   * a per-passage budget, so it can only run the paces that budget divides
   * into, and offering an arbitrary percentage would be a lie.
   */
  allowedPercents?: number[];
  /** Overrides the row label for a percentage (RC names its three paces). */
  labels?: Record<number, string>;
  /** Hide the Unlimited row where a stopwatch has no meaning. */
  allowUnlimited?: boolean;
  /**
   * Line under the options naming the student's standing extra time, with a
   * way to change it. Extra time is who a student is, not a decision they
   * should re-make before every section — this states it and links out.
   */
  accommodationNote?: React.ReactNode;
  className?: string;
  /**
   * Classes for the dropdown surface. The section launcher paints a dark card
   * inside a light theme, so its Selects carry their own surface treatment and
   * this control has to take the same one or it opens as a white slab on top.
   */
  contentClassName?: string;
}

/**
 * The section clock, as a single dropdown.
 *
 * Reads top to bottom the way the decision is actually made: the default
 * first, the no-clock escape second, deliberate speed work third, and an
 * arbitrary number last. Every row states its consequence in the two units
 * that matter — the clock the student will see, and the seconds per question
 * that clock buys them.
 */
export default function SectionTimingPicker({
  value,
  onChange,
  baseMinutes,
  questionCount,
  allowedPercents,
  labels,
  allowUnlimited = true,
  accommodationNote,
  className,
  contentClassName,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const baseSeconds = baseMinutes * 60;
  const secondsFor = React.useCallback(
    (percent: number) => (baseSeconds * percent) / 100,
    [baseSeconds],
  );

  /** "35:00 · Average 01:21/question", or just the clock before a section is chosen. */
  const describe = React.useCallback(
    (percent: number) => {
      const seconds = secondsFor(percent);
      const clock = formatClock(seconds);
      if (!questionCount) return clock;
      return `${clock} · Average ${formatClock(seconds / questionCount)}/question`;
    },
    [secondsFor, questionCount],
  );

  const labelFor = (percent: number) =>
    labels?.[percent] ?? (percent === 100 ? 'Standard' : `${Math.round(percent)}%`);

  const isTimed = value.mode === 'timed';
  const currentPercent = isTimed ? value.percent : 100;
  const restricted = allowedPercents && allowedPercents.length > 0;

  const selectPercent = (percent: number) => {
    onChange({ mode: 'timed', percent: clampPercent(percent) });
    setOpen(false);
  };

  /* Which row, if any, is the current value. Decides where focus lands when
     the popover opens and which row is the list's one Tab stop. A custom
     percentage matches no row, and then the first row takes the stop so the
     list is still reachable. */
  const rowPercents = restricted ? allowedPercents! : [100, ...SPEED_TRAINING_PERCENTS];
  const hasSelectedRow =
    (value.mode === 'unlimited' && allowUnlimited) ||
    (isTimed && rowPercents.some((p) => Math.round(p) === Math.round(currentPercent)));

  /* ---------------------------------------------------------------- custom */

  /** Percent of the previous value, whatever it was — never of a stale render. */
  const percentOf = (prev: SectionTiming) => (prev.mode === 'timed' ? prev.percent : 100);

  /** ± on the percentage. Rounds first so a nudge after a clock nudge lands whole. */
  const stepPercent = (delta: number) =>
    onChange((prev) => ({
      mode: 'timed',
      percent: clampPercent(Math.round(percentOf(prev)) + delta),
    }));

  /**
   * ± on the clock. The percentage stays the single stored value, so the two
   * steppers can never disagree — one derives from the other rather than both
   * being held separately and drifting.
   */
  const stepSeconds = (delta: number) =>
    onChange((prev) => {
      const current = (baseSeconds * percentOf(prev)) / 100;
      const snapped = Math.round(current / TIME_STEP_SECONDS) * TIME_STEP_SECONDS;
      const next = Math.max(TIME_STEP_SECONDS, snapped + delta);
      return { mode: 'timed', percent: clampPercent((next / baseSeconds) * 100) };
    });

  /* ---------------------------------------------------------------- render */

  // Stable per instance, so two pickers on one page cannot collide.
  const reactId = React.useId();
  const fieldLabelId = `${reactId}-timing-label`;
  const valueLabelId = `${reactId}-timing-value`;
  const contentId = `${reactId}-timing-popup`;
  const speedLabelId = `${reactId}-timing-speed`;
  const customLabelId = `${reactId}-timing-custom`;

  const listRef = React.useRef<HTMLDivElement>(null);
  const optionsIn = (list: HTMLElement) =>
    Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));

  /* Arrow keys walk the rows, Home and End jump to either end. Enter and
     Space need nothing: each row is a real button. Tab leaves the list for
     the custom steppers, which is why the rows share a single Tab stop. */
  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!list) return;
    const options = optionsIn(list);
    if (options.length === 0) return;
    const current = options.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(options.length - 1, current + 1);
        break;
      case 'ArrowUp':
        next = Math.max(0, current < 0 ? 0 : current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    options[next]?.focus();
  };

  /* Open on the row that is already chosen, the way a native select does,
     rather than on whatever happens to be first. Radix would focus the first
     tabbable element, which is the first row only until a custom value takes
     the Tab stop away from it. */
  const focusCurrentRow = (event: Event) => {
    const list = listRef.current;
    if (!list) return;
    const options = optionsIn(list);
    const target = options.find((o) => o.getAttribute('aria-selected') === 'true') ?? options[0];
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  const triggerTitle = isTimed ? labelFor(currentPercent) : 'Unlimited';
  const triggerDetail = isTimed ? describe(currentPercent) : 'No clock';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          /* `role="combobox"` matches the four sibling controls in this form,
             and the name is built from the visible text rather than an
             aria-label so it carries the current value: every other control
             in the panel announces its setting and this one announced only
             its field name.

             `aria-haspopup` is "dialog", which is what Radix gives a Popover
             and what this one actually is. It was set to "listbox" once, to
             match the role painted on the whole popup. But the popup holds a
             list of paces AND two steppers AND a link, and a listbox may
             contain only options. So the list of rows is the listbox, and
             the surface that holds it is a dialog, and this says so. */
          role="combobox"
          aria-haspopup="dialog"
          aria-controls={open ? contentId : undefined}
          aria-expanded={open}
          aria-labelledby={`${fieldLabelId} ${valueLabelId}`}
          className={cn(
            // border-input, not border-border: --border is hairline separation
            // between things, --input is the edge of a control and is the one
            // the testing surface tunes to 1.4.11's 3:1 in both themes. This
            // trigger drew --border and measured 1.32:1 light, 1.37:1 dark.
            'w-full flex items-center justify-between gap-3 rounded-xl border border-input bg-background px-4 py-3 text-left transition-colors hover:bg-accent/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
            className,
          )}
        >
          <span className="min-w-0">
            <span
              className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              id={fieldLabelId}
            >
              Timing
            </span>
            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2" id={valueLabelId}>
              <span className="text-sm font-semibold text-foreground">{triggerTitle}</span>
              <span className="text-xs text-muted-foreground">{triggerDetail}</span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        id={contentId}
        aria-label="Section timing"
        onOpenAutoFocus={focusCurrentRow}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-h-[70vh] overflow-y-auto p-2',
          contentClassName,
        )}
      >
        {/* The rows are the listbox; the steppers below it are not. Focus
            moves between rows with the arrow keys and every row is a button,
            so there is no aria-activedescendant to keep in step. */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Pace"
          onKeyDown={handleListKeyDown}
        >
          {restricted ? (
            <>
              {allowedPercents!.map((percent, i) => (
                <Row
                  key={percent}
                  selected={isTimed && Math.round(currentPercent) === Math.round(percent)}
                  tabStop={i === 0 && !hasSelectedRow}
                  title={labelFor(percent)}
                  detail={describe(percent)}
                  onSelect={() => selectPercent(percent)}
                />
              ))}
              {/* Restricting the paces does not remove the no-clock escape —
                  that is a different decision from which clock to run. */}
              {allowUnlimited && (
                <Row
                  selected={value.mode === 'unlimited'}
                  title="Unlimited"
                  detail="∞"
                  onSelect={() => {
                    onChange({ mode: 'unlimited' });
                    setOpen(false);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Row
                selected={isTimed && Math.round(currentPercent) === 100}
                tabStop={!hasSelectedRow}
                title="Standard"
                detail={describe(100)}
                onSelect={() => selectPercent(100)}
              />

              {allowUnlimited && (
                <Row
                  selected={value.mode === 'unlimited'}
                  title="Unlimited"
                  detail="∞"
                  onSelect={() => {
                    onChange({ mode: 'unlimited' });
                    setOpen(false);
                  }}
                />
              )}

              {/* A group inside the listbox, which is the one child a listbox
                  may have besides an option. The heading is its name, not a
                  row of its own. */}
              <div role="group" aria-labelledby={speedLabelId}>
                <div
                  id={speedLabelId}
                  className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Speed training
                </div>
                {SPEED_TRAINING_PERCENTS.map((percent) => (
                  <Row
                    key={percent}
                    selected={isTimed && Math.round(currentPercent) === percent}
                    title={`${percent}%`}
                    detail={describe(percent)}
                    onSelect={() => selectPercent(percent)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {!restricted && (
          <div role="group" aria-labelledby={customLabelId}>
            <div
              id={customLabelId}
              className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Custom
            </div>
            <div className="space-y-2 px-3 pb-1">
              {/* Set the intensity, read the clock. */}
              <div className="flex items-center gap-3">
                <Stepper
                  label="percentage"
                  display={String(Math.round(currentPercent))}
                  suffix="%"
                  onDecrement={() => stepPercent(-1)}
                  onIncrement={() => stepPercent(1)}
                />
                <span className="min-w-0 text-xs text-muted-foreground">
                  <span className="block text-sm font-semibold text-foreground tabular-nums">
                    {formatClock(secondsFor(currentPercent))}
                  </span>
                  {questionCount
                    ? `Average ${formatClock(secondsFor(currentPercent) / questionCount)}/question`
                    : 'Pick a section for a per-question pace'}
                </span>
              </div>

              {/* Or set the clock, and read the intensity. */}
              <div className="flex items-center gap-3">
                <Stepper
                  label="clock"
                  display={formatClock(secondsFor(currentPercent))}
                  onDecrement={() => stepSeconds(-TIME_STEP_SECONDS)}
                  onIncrement={() => stepSeconds(TIME_STEP_SECONDS)}
                />
                <span className="min-w-0 text-xs text-muted-foreground">
                  <span className="block text-sm font-semibold text-foreground tabular-nums">
                    {Math.round(currentPercent)}% standard
                  </span>
                  {questionCount
                    ? `${formatClock(secondsFor(currentPercent) / questionCount)}/question`
                    : 'of your standard clock'}
                </span>
              </div>
            </div>
          </div>
        )}

        {accommodationNote && (
          <div className="mt-2 border-t border-border px-3 pt-2 text-xs text-muted-foreground">
            {accommodationNote}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * One pace. A button, so Enter and Space work without a key handler, carrying
 * `role="option"` so the list around it reads as a list. Only one row is a
 * Tab stop: the chosen one, or the first if no row is chosen.
 *
 * Module-scoped on purpose. Row and Stepper were declared inside the picker,
 * which made each a new component type on every render: React unmounted and
 * remounted them on every state change, and a keyboard user pressing + on a
 * stepper lost focus to the body after every press.
 */
function Row({
  selected,
  tabStop = false,
  title,
  detail,
  onSelect,
}: {
  selected: boolean;
  tabStop?: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={selected || tabStop ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'w-full flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />}
    </button>
  );
}

/** Plus and minus around a reading. The reading is live, so a nudge is heard as well as seen. */
function Stepper({
  onDecrement,
  onIncrement,
  display,
  suffix,
  label,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  display: string;
  suffix?: string;
  label: string;
}) {
  const buttonClass =
    'flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20';
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border px-1.5 py-1">
      <button type="button" onClick={onDecrement} aria-label={`Decrease ${label}`} className={buttonClass}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-foreground"
        aria-live="polite"
      >
        {display}
        {suffix && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span>}
      </span>
      <button type="button" onClick={onIncrement} aria-label={`Increase ${label}`} className={buttonClass}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * The standing-extra-time line, and the link to change it. Lives here so the
 * picker and the section selector cannot describe the same setting two ways.
 */
export function AccommodationNote({ baseMinutes }: { baseMinutes: number }) {
  const wording =
    baseMinutes >= 70
      ? 'You have double time.'
      : baseMinutes > 35
        ? 'You have time and a half.'
        : 'You have no extra time.';
  return (
    <>
      {wording}{' '}
      <Link to="/classroom/account" className="font-medium text-foreground underline underline-offset-2">
        Adjust in settings
      </Link>
    </>
  );
}
