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

  const Row = ({
    selected,
    title,
    detail,
    onSelect,
  }: {
    selected: boolean;
    title: string;
    detail: string;
    onSelect: () => void;
  }) => (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'w-full flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
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

  const Stepper = ({
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
  }) => (
    <div className="flex items-center gap-1 rounded-lg border border-border px-1.5 py-1">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Decrease ${label}`}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-foreground">
        {display}
        {suffix && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span>}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Increase ${label}`}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- render */

  // Stable per instance, so two pickers on one page cannot collide.
  const reactId = React.useId();
  const fieldLabelId = `${reactId}-timing-label`;
  const valueLabelId = `${reactId}-timing-value`;

  const triggerTitle = isTimed ? labelFor(currentPercent) : 'Unlimited';
  const triggerDetail = isTimed ? describe(currentPercent) : 'No clock';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          /* Three corrections, all from one audit finding.
             `aria-haspopup` said "dialog" while what opens is a listbox, so a
             screen reader announced a dialog and then landed in a list of
             options. Radix defaults that attribute for a Popover; the popup
             here is a listbox, so it has to be said explicitly, and
             `role="combobox"` matches the four sibling controls in this form.
             The name is now built from the visible text instead of an
             aria-label, so it carries the current value: every other control
             in the panel announces its setting and this one announced only its
             field name. */
          role="combobox"
          aria-haspopup="listbox"
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
        role="listbox"
        aria-label="Section timing"
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-h-[70vh] overflow-y-auto p-2',
          contentClassName,
        )}
      >
        {restricted ? (
          <>
            {allowedPercents!.map((percent) => (
              <Row
                key={percent}
                selected={isTimed && Math.round(currentPercent) === Math.round(percent)}
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

            <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

            <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
          </>
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
