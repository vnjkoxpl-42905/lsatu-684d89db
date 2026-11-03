import * as React from "react";
import { ArrowRight, ChevronDown, ChevronUp, Info, Tag } from "lucide-react";
import type { AgendaEvent } from "./teachingDeskModel";
import { safeGoogleLink } from "./teachingDeskModel";
import {
  MINUTE,
  buildWeek,
  clockTime,
  colsFor,
  countdown,
  coveredDays,
  dayAria,
  dayKey,
  dayWindow,
  dialState,
  endOf,
  hourLabel,
  isAllDay,
  isSession,
  layoutDay,
  minuteOfDay,
  nextEvent,
  partialInfo,
  shortTime,
  timeRange,
  zoneName,
  type DialState,
  type WeekDay,
} from "./weekCalendar";

/* The Next up week calendar: a spotlight dial for the next event beside a
   seven-day time grid whose picked day opens like an accordion. On a phone
   the grid gives way to a week row and a list. Amber means "now" and nothing
   else; sessions and other events differ by fill and outline, never by hue. */

type Classify = (eventId: string, kind: "session" | "consultation") => Promise<unknown>;
const CALENDAR = "https://calendar.google.com/calendar/u/0/r";
/** Minutes an event takes on screen at minimum, so overlap lanes match what is drawn. */
const MIN_VISUAL = 40;
const startOf = (event: AgendaEvent) => new Date(event.starts_at).getTime();
const firstName = (name: string) => name.split(/\s+/)[0] || name;
const kindWord = (event: AgendaEvent) => (isSession(event) ? "Session" : "Other event");

/** The current time, refreshed every half minute and when the tab returns. */
function useNow(fixed?: Date) {
  const [now, setNow] = React.useState(() => fixed ?? new Date());
  React.useEffect(() => {
    if (fixed) return;
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fixed]);
  return fixed ?? now;
}

/** Phone layout below 600px of card width. jsdom reports 0, which stays desktop. */
function useCompact(ref: React.RefObject<HTMLElement>) {
  const [compact, setCompact] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      setCompact(width > 0 && width < 600);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return compact;
}

function EventTitle({ event }: { event: AgendaEvent }) {
  const href = safeGoogleLink(event.calendar_url, "calendar");
  const text = event.student_name || event.title;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  ) : (
    <b>{text}</b>
  );
}

/** Labels an unlabelled event as a session or consultation. */
function LabelMenu({
  event,
  classify,
  onClassifyError,
  variant,
}: {
  event: AgendaEvent;
  classify?: Classify;
  onClassifyError: () => void;
  variant: "spot" | "chip" | "row";
}) {
  const ref = React.useRef<HTMLDetailsElement>(null);
  const [pending, setPending] = React.useState<"session" | "consultation" | null>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
    ref.current?.querySelector("summary")?.focus();
  };
  const choose = (kind: "session" | "consultation") => {
    if (!classify) return;
    setPending(kind);
    classify(event.id, kind)
      .then(close, onClassifyError)
      .finally(() => setPending(null));
  };
  return (
    <details
      ref={ref}
      className="home-desk-cal-tag"
      data-variant={variant}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current?.open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <summary aria-label={`Label ${event.title}`}>
        <Tag size={13} aria-hidden="true" />
        <span>{variant === "spot" ? "Label event" : "Label"}</span>
      </summary>
      <div className="home-desk-cal-pop">
        <p>Only student sessions and consultations create follow-up work.</p>
        {(["session", "consultation"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={!classify || pending !== null}
            onClick={() => choose(kind)}
          >
            {pending === kind ? "Labelling…" : kind === "session" ? "Student session" : "Consultation"}
          </button>
        ))}
      </div>
    </details>
  );
}

/** The one action an event offers: prepare for the student, or label it. */
function EventAction({
  event,
  onOpen,
  classify,
  onClassifyError,
  variant,
  timeZone,
}: {
  event: AgendaEvent;
  onOpen: (route: string) => void;
  classify?: Classify;
  onClassifyError: () => void;
  variant: "spot" | "chip" | "row";
  timeZone?: string;
}) {
  if (!event.student_id)
    return (
      <LabelMenu event={event} classify={classify} onClassifyError={onClassifyError} variant={variant} />
    );
  const name = event.student_name || "student";
  const open = () => onOpen(`/teacher/students/${encodeURIComponent(event.student_id!)}`);
  if (variant === "spot")
    return (
      <button type="button" className="home-desk-cal-go" aria-label={`Prepare for ${name}`} onClick={open}>
        <span>Prepare for {firstName(name)}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    );
  return (
    <button
      type="button"
      className="home-desk-cal-chip"
      data-variant={variant}
      aria-label={`Prepare for ${name}, ${isAllDay(event) ? "all day" : clockTime(event.starts_at, timeZone)}`}
      onClick={open}
    >
      <ArrowRight size={13} aria-hidden="true" />
      <span>{variant === "row" ? `Prepare for ${firstName(name)}` : "Prepare"}</span>
    </button>
  );
}

/** Splits "3h 20m" so the units can sit small beside the numbers. */
function Units({ text }: { text: string }) {
  const parts = text.split(/(\d+)([hm])\b/).filter(Boolean);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        /^[hm]$/.test(part) ? <small key={i}>{part}</small> : <React.Fragment key={i}>{part.trim()}</React.Fragment>,
      )}
    </>
  );
}

function Dial({ state }: { state: DialState }) {
  const pct = Math.min(100, Math.max(0, state.pct));
  const angle = (2 * Math.PI * pct) / 100;
  const head = { x: 100 + 80 * Math.sin(angle), y: 100 - 80 * Math.cos(angle) };
  const active = state.mode === "armed" || state.mode === "live";
  return (
    <div className="home-desk-cal-dial" data-mode={state.mode} data-soon={state.soon || undefined}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="home-desk-cal-dial-track" cx="100" cy="100" r="80" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              className="home-desk-cal-dial-tick"
              data-lit={(active && i / 12 < pct / 100) || undefined}
              x1={100 + 89 * Math.sin(a)}
              y1={100 - 89 * Math.cos(a)}
              x2={100 + 94 * Math.sin(a)}
              y2={100 - 94 * Math.cos(a)}
            />
          );
        })}
        <circle
          className="home-desk-cal-dial-arc"
          cx="100"
          cy="100"
          r="80"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          transform="rotate(-90 100 100)"
        />
        {active ? <circle className="home-desk-cal-dial-head" cx={head.x} cy={head.y} r="5" /> : null}
      </svg>
      <p
        className="home-desk-cal-read"
        data-word={state.word || undefined}
        data-long={(!state.word && state.big.length > 3) || undefined}
        aria-hidden="true"
      >
        {state.pre ? <span>{state.pre}</span> : null}
        <strong>
          <Units text={state.big} />
        </strong>
        {state.post ? <span>{state.post}</span> : null}
      </p>
    </div>
  );
}

interface Shared {
  timeZone?: string;
  onOpen: (route: string) => void;
  classify?: Classify;
  onClassifyError: () => void;
}

function Spotlight({
  spot,
  then,
  now,
  shared,
}: {
  spot: AgendaEvent | null;
  then: AgendaEvent[];
  now: Date;
  shared: Shared;
}) {
  const { timeZone } = shared;
  const nameId = React.useId();
  const thenId = React.useId();
  const state = dialState(spot, now, timeZone);
  const live = state.mode === "live";
  const sameDay = spot && dayKey(startOf(spot), timeZone) === dayKey(now.getTime(), timeZone);
  const elapsed = spot && live ? Math.round(((now.getTime() - startOf(spot)) / MINUTE)) : 0;
  const length = spot ? Math.round((endOf(spot) - startOf(spot)) / MINUTE) : 0;
  return (
    <article className="home-desk-cal-spot" data-mode={state.mode} aria-labelledby={nameId}>
      <p className="home-desk-cal-kicker">
        <span data-live={live || undefined}>
          {live ? "Live now" : !spot ? "Next up" : isSession(spot) ? "Next session" : "Next event"}
        </span>
        {spot ? (
          <span>
            {sameDay
              ? "Today"
              : new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(
                  new Date(startOf(spot)),
                )}
          </span>
        ) : null}
      </p>
      <div
        className="home-desk-cal-dial-wrap"
        {...(live && spot
          ? {
              role: "progressbar",
              "aria-label": "Session elapsed",
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-valuenow": Math.round((elapsed / Math.max(1, length)) * 100),
              "aria-valuetext": `${state.big} minutes left`,
            }
          : {})}
      >
        <Dial state={state} />
      </div>
      <div className="home-desk-cal-spot-text">
        <p className="home-desk-cal-countline">{spot ? countdown(spot, now, timeZone) : "Nothing booked"}</p>
        {spot ? (
          <p className="home-desk-cal-when">
            <time dateTime={spot.starts_at}>{timeRange(spot, timeZone)}</time>
            {live ? <span> · {elapsed} of {length} min</span> : null}
          </p>
        ) : null}
        <h3 id={nameId} className="home-desk-cal-name" data-empty={!spot || undefined}>
          {spot ? <EventTitle event={spot} /> : "Nothing booked"}
        </h3>
        {spot && spot.student_name && spot.title !== spot.student_name ? (
          <p className="home-desk-cal-sub">{spot.title}</p>
        ) : !spot ? (
          <p className="home-desk-cal-sub">No timed events in the next seven days.</p>
        ) : null}
        {spot ? (
          <span className="home-desk-cal-kind" data-session={isSession(spot) || undefined}>
            <i aria-hidden="true" />
            {kindWord(spot)}
          </span>
        ) : null}
      </div>
      {spot ? (
        <div className="home-desk-cal-act">
          <EventAction event={spot} variant="spot" {...shared} />
        </div>
      ) : null}
      {then.length ? (
        <section className="home-desk-cal-then" aria-labelledby={thenId}>
          <h4 id={thenId}>Then</h4>
          <ol>
            {then.map((event) => (
              <li key={event.id} data-session={isSession(event) || undefined}>
                <time dateTime={event.starts_at}>{rowWhen(event, now, timeZone)}</time>
                <span className="home-desk-cal-then-name">
                  <i aria-hidden="true" />
                  <EventTitle event={event} />
                </span>
                <EventAction event={event} variant="chip" {...shared} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

/** "5p" today, "Thu 5p" later, "Thu · all day" for all-day items. */
function rowWhen(event: AgendaEvent, now: Date, timeZone?: string) {
  const today = dayKey(now.getTime(), timeZone);
  const day = coveredDays(event, timeZone)?.[0] ?? today;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
    new Date(`${day}T12:00:00Z`),
  );
  if (isAllDay(event)) return `${weekday} · all day`;
  const time = shortTime(event.starts_at, timeZone);
  return day === today ? time : `${weekday} ${time}`;
}

export function NextUp({
  events,
  timeZone,
  partial = false,
  onOpen,
  classify,
  onClassifyError,
  now: fixedNow,
}: {
  events: AgendaEvent[];
  timeZone?: string;
  /** The feed has more pages, so later days may be missing events. */
  partial?: boolean;
  onOpen: (route: string) => void;
  classify?: Classify;
  onClassifyError: () => void;
  now?: Date;
}) {
  const now = useNow(fixedNow);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const compact = useCompact(rootRef);
  const todayKey = dayKey(now.getTime(), timeZone)!;
  const week = React.useMemo(
    () => buildWeek(events, now, timeZone),
    // Rebuild when the date turns over, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, timeZone, todayKey],
  );
  const hours = React.useMemo(() => dayWindow(week, timeZone), [week, timeZone]);
  const span = hours.end - hours.start;
  const { lastKey, unknown } = partialInfo(week, events, partial, timeZone);
  const shared: Shared = { timeZone, onOpen, classify, onClassifyError };

  const spot = nextEvent(events, now);
  const upcoming = events
    .filter((e) =>
      e !== spot && (isAllDay(e) ? (coveredDays(e, timeZone)?.[1] ?? "") >= todayKey : endOf(e) > now.getTime()),
    )
    .sort((a, b) => startOf(a) - startOf(b));

  const [picked, setPicked] = React.useState<string | null>(null);
  const selected = week.findIndex((d) => d.key === picked);
  const pickedDay = selected >= 0 ? week[selected]! : null;
  const [focusIdx, setFocusIdx] = React.useState(0);
  const heads = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [announce, setAnnounce] = React.useState("");
  const hintId = React.useId();

  // The beam glides between ticks, but jumps after the tab was asleep.
  const lastTick = React.useRef(now.getTime());
  const beamDur = now.getTime() - lastTick.current > 45_000 ? "0s" : "30s";
  React.useEffect(() => {
    lastTick.current = now.getTime();
  }, [now]);

  const nowMinute = minuteOfDay(now, timeZone) ?? 0;
  const nowState = nowMinute < hours.start ? "before" : nowMinute > hours.end ? "after" : "in";
  const nowY = Math.min(span, Math.max(0, nowMinute - hours.start));
  const hasAllDay = week.some((d) => d.events.some(isAllDay));

  const select = (index: number | null) => {
    const day = index === null ? null : week[index]!;
    setPicked(day?.key ?? null);
    if (day) {
      setFocusIdx(index!);
      const timed = day.events.filter((e) => !isAllDay(e));
      setAnnounce(
        `${day.longLabel}: ${
          day.events.length ? `${day.events.length} ${day.events.length === 1 ? "event" : "events"}` : "nothing scheduled"
        }${timed.length ? `, ${clockTime(timed[0]!.starts_at, timeZone)} to ${clockTime(endOf(timed[timed.length - 1]!), timeZone)}` : ""}.`,
      );
    } else {
      setAnnounce(spot ? `Showing what's next: ${spot.student_name || spot.title}, ${countdown(spot, now, timeZone).toLowerCase()}.` : "Showing what's next.");
    }
  };
  const reset = () => {
    select(null);
    requestAnimationFrame(() => heads.current[focusIdx]?.focus());
  };
  const onToolbarKey = (event: React.KeyboardEvent) => {
    const last = week.length - 1;
    const next =
      event.key === "ArrowRight" || (compact && event.key === "ArrowDown") ? Math.min(last, focusIdx + 1)
      : event.key === "ArrowLeft" || (compact && event.key === "ArrowUp") ? Math.max(0, focusIdx - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (event.key === "Escape" && picked) {
      event.preventDefault();
      select(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocusIdx(next);
    heads.current[next]?.focus();
  };

  const sessions = new Set(week.flatMap((d) => d.events.filter(isSession).map((e) => e.id))).size;
  const others = new Set(week.flatMap((d) => d.events.filter((e) => !isSession(e)).map((e) => e.id))).size;
  const range = `${week[0]!.month} ${week[0]!.dayNumber} to ${
    week[6]!.month === week[0]!.month ? "" : `${week[6]!.month} `
  }${week[6]!.dayNumber}`;
  const pickedTimed = pickedDay?.events.filter((e) => !isAllDay(e)) ?? [];
  const booked = pickedTimed.reduce((sum, e) => sum + (endOf(e) - startOf(e)) / MINUTE, 0);

  const rootStyle = {
    "--cal-cols": colsFor(compact ? -1 : selected),
    "--cal-span-h": span / 60,
    "--cal-now-y": nowY,
    "--cal-beam-dur": beamDur,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="home-desk-cal-frame"
      data-compact={compact || undefined}
      data-allday={hasAllDay || undefined}
      data-now={nowState}
      data-mode={pickedDay ? "day" : "upcoming"}
      style={rootStyle}
      onKeyDown={(event) => {
        if (event.key === "Escape" && picked && !(event.target as HTMLElement).closest("details[open]")) {
          select(null);
          heads.current[focusIdx]?.focus();
        }
      }}
    >
      <div className="home-desk-cal-layout">
        <Spotlight spot={spot} then={upcoming.slice(0, compact ? 0 : 2)} now={now} shared={shared} />
        <div className="home-desk-cal-inst">
          <div className="home-desk-cal-bar">
            {pickedDay && !compact ? (
              <>
                <h3>{pickedDay.longLabel}</h3>
                <p className="home-desk-cal-bar-meta">
                  {pickedDay.events.length
                    ? `${pickedDay.events.length} ${pickedDay.events.length === 1 ? "event" : "events"}${
                        pickedTimed.length
                          ? ` · ${shortTime(pickedTimed[0]!.starts_at, timeZone)} to ${shortTime(endOf(pickedTimed[pickedTimed.length - 1]!), timeZone)} · ${Math.round(booked / 30) / 2}h booked`
                          : ""
                      }`
                    : "Nothing scheduled"}
                </p>
                {pickedDay.events.filter(isAllDay).map((event) => (
                  <span key={event.id} className="home-desk-cal-allday-pill" data-session={isSession(event) || undefined}>
                    All day · <EventTitle event={event} />
                    <EventAction event={event} variant="chip" {...shared} />
                  </span>
                ))}
              </>
            ) : (
              <>
                <p className="home-desk-cal-range">{range}</p>
                {!compact ? (
                  <dl className="home-desk-cal-readouts">
                    <div>
                      <dt>Today</dt>
                      <dd>{week[0]!.events.length}</dd>
                    </div>
                    <div>
                      <dt>Week</dt>
                      <dd>
                        {sessions} {sessions === 1 ? "session" : "sessions"}
                      </dd>
                    </div>
                    <div>
                      <dt>Other</dt>
                      <dd>{others}</dd>
                    </div>
                  </dl>
                ) : null}
              </>
            )}
            {pickedDay ? (
              <button type="button" className="home-desk-cal-reset" onClick={reset}>
                Show upcoming
              </button>
            ) : null}
          </div>
          <p id={hintId} className="sr-only">
            Left and right arrows move between days. Enter shows a day. Escape returns to what's next.
          </p>
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
          <div
            className="home-desk-cal-heads"
            role="toolbar"
            aria-label="Next seven days"
            aria-describedby={hintId}
            onKeyDown={onToolbarKey}
          >
            {compact ? null : <span className="home-desk-cal-axis-cap" aria-hidden="true" />}
            {week.map((day, i) => (
              <DayHead
                key={day.key}
                ref={(el) => {
                  heads.current[i] = el;
                }}
                day={day}
                index={i}
                pressed={i === selected}
                focusable={i === focusIdx}
                unknown={unknown.has(day.key)}
                mayHaveMore={day.key === lastKey}
                nextId={spot?.id ?? null}
                hours={hours}
                now={now}
                timeZone={timeZone}
                onSelect={() => select(i === selected ? null : i)}
              />
            ))}
          </div>
          {compact ? (
            <PhoneList
              day={pickedDay}
              rows={pickedDay ? pickedDay.events : upcoming.slice(0, 4)}
              now={now}
              shared={shared}
            />
          ) : (
            <div className="home-desk-cal-body">
              <div className="home-desk-cal-axis" aria-hidden="true">
                {hasAllDay ? <span className="home-desk-cal-axis-allday">All day</span> : null}
                {Array.from({ length: span / 60 + 1 }, (_, i) => {
                  const m = hours.start + i * 60;
                  return (
                    <span
                      key={m}
                      style={{ "--m": i * 60 } as React.CSSProperties}
                      data-edge={i === 0 ? "first" : i === span / 60 ? "last" : undefined}
                      data-near={(nowState === "in" && Math.abs(m - nowMinute) < 20) || undefined}
                    >
                      {hourLabel(m)}
                    </span>
                  );
                })}
                {week[0] && nowState === "in" ? (
                  <b className="home-desk-cal-nowtag">{clockTime(now.getTime(), timeZone).replace(/ [ap]m$/, "")}</b>
                ) : null}
              </div>
              {week.map((day, i) => (
                <DayColumn
                  key={day.key}
                  day={day}
                  index={i}
                  open={i === selected}
                  unknown={unknown.has(day.key)}
                  hours={hours}
                  now={now}
                  nowState={nowState}
                  spot={spot}
                  shared={shared}
                  onSelect={() => select(i)}
                />
              ))}
              {nowState === "in" ? <div className="home-desk-cal-meridian" aria-hidden="true" /> : null}
            </div>
          )}
          <div className="home-desk-cal-foot">
            <span className="home-desk-cal-legend" aria-hidden="true">
              <span>
                <i data-k="s" /> Session
              </span>
              <span>
                <i data-k="o" /> Other
              </span>
              <span>
                <i data-k="p" /> Past
              </span>
            </span>
            {compact ? null : (
              <span>
                {hourLabel(hours.start)} to {hourLabel(hours.end)}
              </span>
            )}
            <span className="home-desk-cal-tz">Times in {zoneName(now, timeZone)}</span>
            {partial ? (
              <p className="home-desk-cal-note">
                <Info size={15} aria-hidden="true" />
                <span>
                  Your calendar has more events than this view loaded.
                  {lastKey ? ` Days after ${week.find((d) => d.key === lastKey)?.weekday ?? "the last one"} may be incomplete.` : ""}{" "}
                  <a href={CALENDAR} target="_blank" rel="noopener noreferrer">
                    Open Calendar ↗
                  </a>
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const DayHead = React.forwardRef<
  HTMLButtonElement,
  {
    day: WeekDay;
    index: number;
    pressed: boolean;
    focusable: boolean;
    unknown: boolean;
    mayHaveMore: boolean;
    nextId: string | null;
    hours: { start: number; end: number };
    now: Date;
    timeZone?: string;
    onSelect: () => void;
  }
>(function DayHead({ day, pressed, focusable, unknown, mayHaveMore, nextId, hours, now, timeZone, onSelect }, ref) {
  const count = day.events.length;
  const span = hours.end - hours.start;
  const t = now.getTime();
  const placed = layoutDay(day.events, hours, timeZone, day.key);
  const nowMinute = minuteOfDay(now, timeZone) ?? 0;
  return (
    <button
      ref={ref}
      type="button"
      className="home-desk-cal-head"
      data-today={day.isToday || undefined}
      data-unknown={unknown || undefined}
      aria-pressed={pressed}
      tabIndex={focusable ? 0 : -1}
      aria-label={dayAria(day, timeZone, now, { nextId, unknown, mayHaveMore })}
      onClick={onSelect}
    >
      <span className="home-desk-cal-wd" aria-hidden="true">
        <span className="home-desk-cal-wd-long">{day.isToday ? "Today" : day.weekday}</span>
        <span className="home-desk-cal-wd-short">{day.weekday.slice(0, 2)}</span>
      </span>
      <span className="home-desk-cal-n" aria-hidden="true" data-zero={(!count && !unknown) || undefined}>
        {unknown ? "?" : count ? `${count}${mayHaveMore ? "+" : ""}` : "–"}
      </span>
      <span className="home-desk-cal-date" aria-hidden="true">
        <span>{day.dayNumber}</span>
      </span>
      <span className="home-desk-cal-pips" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => {
          const event = day.events[i];
          return (
            <i
              key={i}
              data-k={event ? (isSession(event) ? "s" : "o") : undefined}
              data-past={(event && !isAllDay(event) && endOf(event) <= t) || undefined}
            />
          );
        })}
      </span>
      <span className="home-desk-cal-strip" aria-hidden="true">
        {placed.map((p) => (
          <i
            key={p.event.id}
            data-k={isSession(p.event) ? "s" : "o"}
            data-past={endOf(p.event) <= t || undefined}
            style={
              {
                "--s": (Math.max(p.startMinute, hours.start) - hours.start) / span,
                "--w": Math.max(0.04, (Math.min(p.endMinute, hours.end) - Math.max(p.startMinute, hours.start)) / span),
              } as React.CSSProperties
            }
          />
        ))}
        {day.isToday && nowMinute >= hours.start && nowMinute <= hours.end ? (
          <b style={{ "--p": (nowMinute - hours.start) / span } as React.CSSProperties} />
        ) : null}
      </span>
    </button>
  );
});

function DayColumn({
  day,
  index,
  open,
  unknown,
  hours,
  now,
  nowState,
  spot,
  shared,
  onSelect,
}: {
  day: WeekDay;
  index: number;
  open: boolean;
  unknown: boolean;
  hours: { start: number; end: number };
  now: Date;
  nowState: "before" | "in" | "after";
  spot: AgendaEvent | null;
  shared: Shared;
  onSelect: () => void;
}) {
  const { timeZone } = shared;
  const t = now.getTime();
  const placed = layoutDay(day.events, hours, timeZone, day.key, MIN_VISUAL);
  const allDay = day.events.filter(isAllDay);
  const geometry = (startMinute: number, endMinute: number, lane: number, lanes: number) => {
    const y = Math.max(startMinute, hours.start) - hours.start;
    const h = Math.max(1, Math.min(endMinute, hours.end) - Math.max(startMinute, hours.start));
    return { "--y": y, "--h": h, "--lane": lane, "--lanes": lanes } as React.CSSProperties;
  };
  const spotPlaced = spot && day.isToday ? placed.find((p) => p.event.id === spot.id) : null;
  const nowMinute = minuteOfDay(now, timeZone) ?? 0;
  const spotLive = spot ? startOf(spot) <= t : false;
  const approach =
    spotPlaced && !spotLive && nowState === "in" ? Math.max(0, spotPlaced.startMinute - nowMinute) : 0;
  const dayTitleId = `cal-day-${day.key}`;
  return (
    <div
      className="home-desk-cal-col"
      data-today={day.isToday || undefined}
      data-selected={open || undefined}
      data-unknown={unknown || undefined}
      data-align={index >= 4 ? "end" : undefined}
      onClick={(event) => {
        if (open || (event.target as HTMLElement).closest("a,button,summary,details")) return;
        onSelect();
      }}
    >
      <div className="home-desk-cal-hours" aria-hidden="true" />
      {day.isToday && nowState !== "before" ? <div className="home-desk-cal-past" aria-hidden="true" /> : null}
      {allDay.length && !open ? (
        <span className="home-desk-cal-allday" aria-hidden="true" data-session={allDay.some(isSession) || undefined}>
          {allDay.length === 1 ? allDay[0]!.student_name || allDay[0]!.title : `${allDay.length} all-day`}
        </span>
      ) : null}
      {open ? (
        <section className="home-desk-cal-day" aria-labelledby={dayTitleId}>
          <h4 id={dayTitleId} className="sr-only">
            {day.longLabel}
          </h4>
          {placed.length ? (
            <ol>
              {placed.map((p, i) => {
                const past = endOf(p.event) <= t;
                const live = !past && startOf(p.event) <= t;
                const next = spot?.id === p.event.id && !live;
                return (
                  <li
                    key={p.event.id}
                    className="home-desk-cal-ev"
                    data-k={isSession(p.event) ? "s" : "o"}
                    data-past={past || undefined}
                    data-live={live || undefined}
                    data-next={next || undefined}
                    data-tall={p.endMinute - p.startMinute >= 80 || undefined}
                    data-up={(p.startMinute - hours.start) / (hours.end - hours.start) > 0.55 || undefined}
                    style={{ ...geometry(p.startMinute, p.endMinute, p.lane, p.lanes), "--i": i } as React.CSSProperties}
                  >
                    <time dateTime={p.event.starts_at}>
                      {shortTime(p.event.starts_at, timeZone)}
                      <span className="home-desk-cal-end"> to {shortTime(endOf(p.event), timeZone)}</span>
                    </time>
                    <span className="home-desk-cal-ev-name">
                      <EventTitle event={p.event} />
                      <span className="sr-only">
                        , {isSession(p.event) ? "session" : "other event"}
                        {next ? ", next" : past ? ", ended" : live ? ", happening now" : ""}
                      </span>
                    </span>
                    <EventAction event={p.event} variant="chip" {...shared} />
                  </li>
                );
              })}
            </ol>
          ) : null}
          {!day.events.length ? (
            <span className="home-desk-cal-free" data-open>
              {unknown ? "Not loaded" : "Nothing scheduled"}
            </span>
          ) : null}
        </section>
      ) : (
        <div className="home-desk-cal-caps" aria-hidden="true">
          {placed.map((p) => {
            const past = endOf(p.event) <= t;
            const live = !past && startOf(p.event) <= t;
            return (
              <div
                key={p.event.id}
                className="home-desk-cal-cap"
                data-k={isSession(p.event) ? "s" : "o"}
                data-past={past || undefined}
                data-live={live || undefined}
                data-next={(spot?.id === p.event.id && !live) || undefined}
                title={`${timeRange(p.event, timeZone)} · ${p.event.student_name || p.event.title} · ${isSession(p.event) ? "session" : "other event"}`}
                style={
                  {
                    ...geometry(p.startMinute, p.endMinute, p.lane, p.lanes),
                    "--elapsed": live ? (t - startOf(p.event)) / (endOf(p.event) - startOf(p.event)) : 0,
                  } as React.CSSProperties
                }
              >
                <span className="home-desk-cal-cap-in">
                  <b>{shortTime(p.event.starts_at, timeZone)}</b>
                  <span>{firstName(p.event.student_name || p.event.title)}</span>
                </span>
              </div>
            );
          })}
          {!day.events.length ? <span className="home-desk-cal-free">{unknown ? "Not loaded" : "Free"}</span> : null}
        </div>
      )}
      {day.isToday && nowState === "in" ? (
        <>
          <div className="home-desk-cal-beam" aria-hidden="true" />
          {approach >= 20 ? (
            <div
              className="home-desk-cal-approach"
              aria-hidden="true"
              style={{ "--len": approach } as React.CSSProperties}
            />
          ) : null}
        </>
      ) : null}
      {day.isToday && nowState !== "in" ? (
        <span className="home-desk-cal-offwindow" aria-hidden="true" data-now={nowState}>
          {nowState === "before" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {clockTime(now.getTime(), timeZone)}
        </span>
      ) : null}
    </div>
  );
}

function PhoneList({
  day,
  rows,
  now,
  shared,
}: {
  day: WeekDay | null;
  rows: AgendaEvent[];
  now: Date;
  shared: Shared;
}) {
  const { timeZone } = shared;
  const headingId = React.useId();
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => setShowAll(false), [day?.key]);
  const visibleRows = day || showAll ? rows : rows.slice(0, 2);
  const t = now.getTime();
  const firstUpcoming = day?.isToday ? rows.findIndex((e) => isAllDay(e) || endOf(e) > t) : -1;
  const timed = rows.filter((e) => !isAllDay(e));
  return (
    <div className="home-desk-cal-listwrap">
      <h3 id={headingId} className="home-desk-cal-list-title">
        {day
          ? `${day.longLabel} · ${day.events.length} ${day.events.length === 1 ? "event" : "events"}`
          : "Coming up"}
      </h3>
      {rows.length ? (
        <ol className="home-desk-cal-list" aria-labelledby={headingId}>
          {visibleRows.map((event, i) => {
            const past = !isAllDay(event) && endOf(event) <= t;
            return (
              <React.Fragment key={event.id}>
                {i === firstUpcoming && i > 0 && timed.length ? (
                  <li className="home-desk-cal-now-rule" aria-hidden="true">
                    <span>Now {shortTime(t, timeZone)}</span>
                  </li>
                ) : null}
                <li
                  className="home-desk-cal-row"
                  data-k={isSession(event) ? "s" : "o"}
                  data-past={past || undefined}
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <i aria-hidden="true" />
                  <time dateTime={event.starts_at}>
                    {day ? (isAllDay(event) ? "All day" : shortTime(event.starts_at, timeZone)) : rowWhen(event, now, timeZone)}
                  </time>
                  <span className="home-desk-cal-row-name">
                    <EventTitle event={event} />
                    <small>
                      {kindWord(event)}
                      {past ? <span className="sr-only">, ended</span> : null}
                    </small>
                  </span>
                  <div className="home-desk-cal-row-act">
                    <EventAction event={event} variant="row" {...shared} />
                  </div>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      ) : (
        <p className="home-desk-empty">{day ? "Nothing scheduled." : "Nothing else in the next seven days."}</p>
      )}
      {!day && rows.length > 2 ? (
        <button className="home-desk-cal-more" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer events" : `Show ${rows.length - 2} more events`}
        </button>
      ) : null}
    </div>
  );
}
