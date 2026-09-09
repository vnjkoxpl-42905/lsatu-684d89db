import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionText,
  contextLineFor,
  railTitle,
  useTodayFocus,
  type TodayFocus,
  type TodayFocusItem,
} from "@/components/mainhub/useTodayFocus";

/* The per-type gradient tone map is gone with the 2026-08-01 reskin. Six near-
   identical washes were carrying no information a student could read — the type
   is already stated by the icon and the source line — and they fought the
   eclipse behind them. One glass surface now, for every type. */

interface TodayFocusPanelProps {
  drillReturnTo?: string;
  /**
   * The hub computes Today once and hands it here so the hero and this panel
   * agree on what is first. Standalone mounts (and the tests) leave it out and
   * the panel computes its own.
   */
  focus?: TodayFocus;
  /**
   * When the hero already leads with the primary item, the panel does not say
   * it a second time: it carries the queue behind it and nothing else.
   */
  heroOwnsPrimary?: boolean;
}

/* The hook that builds Today runs seven feeds. Until 2026-09-09 this panel ran
   it unconditionally and then threw the result away whenever the hub passed
   `focus` in, so every feed (assignments, notifications, Messages, last
   activity) was fetched twice on the drill hub. Hooks cannot be conditional,
   so the owning and the receiving cases are two components. */
export default function TodayFocusPanel({ focus, ...rest }: TodayFocusPanelProps) {
  if (focus) return <TodayFocusPanelView focus={focus} {...rest} />;
  return <OwnedTodayFocusPanel {...rest} />;
}

function OwnedTodayFocusPanel({
  drillReturnTo = "/classroom",
  heroOwnsPrimary,
}: Omit<TodayFocusPanelProps, "focus">) {
  const focus = useTodayFocus(drillReturnTo);
  return <TodayFocusPanelView focus={focus} heroOwnsPrimary={heroOwnsPrimary} />;
}

function TodayFocusPanelView({
  focus,
  heroOwnsPrimary = false,
}: {
  focus: TodayFocus;
  heroOwnsPrimary?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const { primary, rails, loading, hasError, promote, open } = focus;

  /* The hero carries the primary only when one exists. Loading, error and empty
     all fall back to the panel's own surfaces, so the panel must still draw
     them even in hero mode. */
  const queueOnly = heroOwnsPrimary && !loading && !hasError && primary != null;

  return (
    /* Surface, eclipse image and scrim live in .drill-observatory-today-inner. */
    <section aria-label="Today" className="drill-observatory-today">
      <div className="drill-observatory-today-inner flex flex-col">
        <div className="relative flex flex-col gap-3">
          {/* The date used to print here too. The hero already carries the full
              dateline a few lines up, in the same mono treatment, so this was
              the same fact twice on one screen. */}
          <div className="flex items-center justify-between px-0.5">
            <h2 className="drill-observatory-label drill-observatory-ink-60">
              {queueOnly ? "Also today" : "Today"}
            </h2>
          </div>

          {loading ? (
            <TodaySkeleton />
          ) : hasError ? (
            <TodayErrorState />
          ) : primary ? (
            <div aria-live="polite">
              {!queueOnly && (
                <TodayPrimarySurface
                  item={primary}
                  expanded={expanded}
                  onToggle={() => setExpanded((value) => !value)}
                  onActivate={() => void open(primary)}
                />
              )}
              <div className={cn("grid gap-3", !queueOnly && "mt-3")}>
                {rails.map((item) => (
                  <TodayRailItem
                    key={item.id}
                    item={item}
                    muted={!queueOnly && expanded}
                    onPromote={() => {
                      promote(item.id);
                      setExpanded(false);
                    }}
                  />
                ))}
                {rails.length === 0 && (
                  <div className="drill-observatory-today-quiet">
                    {queueOnly
                      ? "Nothing else is waiting. The next step is above."
                      : "No secondary focus items."}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <TodayEmptyState />
          )}
        </div>
      </div>
    </section>
  );
}

function TodayPrimarySurface({
  item,
  expanded,
  onToggle,
  onActivate,
}: {
  item: TodayFocusItem;
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
}) {
  const Icon = item.Icon;
  // The card's surface — radius, glass, ring — is owned by
  // .drill-observatory-today-primary (and its `> div` rule) in classroom.css.
  return (
    <motion.div
      layout
      className="drill-observatory-today-primary group relative"
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
    >
      <div className="relative overflow-hidden">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="drill-observatory-focus-inset relative flex w-full flex-col items-start px-5 pb-4 pt-5 text-left"
        >
          <div className="flex w-full items-start justify-between gap-4">
            <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55 flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Next up
            </span>
            <span className="flex items-center gap-2">
              {item.progress && (
                <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55">
                  {item.progress}
                </span>
              )}
              {item.status && (
                <span className="drill-observatory-today-chip">{item.status}</span>
              )}
            </span>
          </div>

          <div className="mt-[26px] w-full">
            <h3 className="drill-observatory-today-title">{item.title}</h3>
            <p className="drill-observatory-ink-55 mt-[5px] text-[13px]">{item.sourceLine}</p>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="drill-observatory-ink-62 mt-4 space-y-2 text-[13px] leading-6"
                >
                  <p>{contextLineFor(item)}</p>
                  {item.preview && (
                    <p className="drill-observatory-ink-85 line-clamp-2">
                      {item.type === "message" ? `"${item.preview}"` : item.preview}
                    </p>
                  )}
                  {(item.estimatedTime || item.progress) && (
                    <p className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55">
                      {[item.estimatedTime, item.progress].filter(Boolean).join(" / ")}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onActivate();
          }}
          disabled={!item.route && !item.onOpen}
          className="drill-observatory-today-action drill-observatory-focus-inset drill-observatory-ink-full relative flex w-full items-center justify-between px-5 py-[13px] text-left text-[13.5px] font-semibold disabled:cursor-not-allowed"
        >
          <span>{actionText(item)}</span>
          <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55 flex items-center gap-2">
            {item.actionCue}
            <ArrowRight
              className="drill-observatory-ink-85 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </button>
      </div>
    </motion.div>
  );
}

function TodayRailItem({
  item,
  muted,
  onPromote,
}: {
  item: TodayFocusItem;
  muted: boolean;
  onPromote: () => void;
}) {
  const Icon = item.Icon;
  return (
    /* min-w-0 is load-bearing: the rail is a grid item, and a grid item's
       min-width is `auto`, which is the un-truncated title's full length. On a
       375px phone that pushed the row to 432px and clipped the trailing label
       off the right edge. */
    <motion.button
      type="button"
      layout
      onClick={onPromote}
      className={cn(
        "drill-observatory-today-rail drill-observatory-focus-inset",
        "flex w-full min-w-0 items-center gap-3 text-left",
        muted && "opacity-60",
      )}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
    >
      <Icon
        className="drill-observatory-ink-55 h-3.5 w-3.5 shrink-0"
        strokeWidth={2}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="drill-observatory-ink-full block truncate text-[13px] font-medium">
          {railTitle(item)}
        </span>
        <span className="drill-observatory-ink-55 mt-0.5 block truncate text-[11.5px]">
          {item.sourceLine}
        </span>
      </span>
      {/* Sentence case, not the mono micro-label: this sits inside a button,
          and the label voice is for facts on a surface, not for chrome on a
          control. The data is already "Ready" / "New"; only the CSS shouted. */}
      <span className="drill-observatory-ink-55 shrink-0 text-[11.5px]">
        {item.status ?? item.actionLabel}
      </span>
    </motion.button>
  );
}

function TodaySkeleton() {
  return (
    <div aria-label="Loading today" className="animate-pulse">
      <div className="drill-observatory-today-primary min-h-[186px] p-5">
        <div className="drill-observatory-skeleton-bar h-2.5 w-16" />
        <div className="drill-observatory-skeleton-bar mt-8 h-6 w-3/4" />
        <div className="drill-observatory-skeleton-bar mt-3 h-3.5 w-1/2" />
      </div>
      <div className="mt-3 grid gap-3">
        <div className="drill-observatory-today-rail h-[52px]" />
        <div className="drill-observatory-today-rail h-[52px]" />
      </div>
    </div>
  );
}

function TodayEmptyState() {
  return (
    <div aria-live="polite">
      <div className="drill-observatory-today-primary px-5 pb-6 pt-5">
        <p className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55">
          Next up
        </p>
        <h3 className="drill-observatory-today-title mt-[26px]">All caught up</h3>
        <p className="drill-observatory-ink-55 mt-[5px] text-[13px]">
          Nothing assigned for today.
        </p>
        <p className="drill-observatory-ink-55 mt-6 text-[12.5px] leading-[1.45]">
          Assigned work and instructor messages will appear here when they exist.
        </p>
      </div>
      <div className="mt-3 grid gap-3">
        <div className="drill-observatory-today-quiet">No secondary focus items.</div>
      </div>
    </div>
  );
}

function TodayErrorState() {
  return (
    <div>
      <div className="drill-observatory-today-primary px-5 pb-6 pt-5">
        <p className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55">
          Next up
        </p>
        <h3 className="drill-observatory-today-title mt-[26px]">
          Couldn&apos;t load today.
        </h3>
        {/* Was the sentence "Refresh the page to try again", which made the
            student do the work. Today is assembled from seven sources and only
            two are react-query backed, so an invalidate would silently retry
            half of them; a reload retries all seven and is the honest action
            behind this button. */}
        <p className="drill-observatory-ink-55 mt-[5px] text-[13px]">
          Nothing here is missing on purpose.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="drill-observatory-insight-link mt-3"
        >
          Try again
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        <div className="drill-observatory-today-quiet">
          Today is temporarily unavailable.
        </div>
      </div>
    </div>
  );
}
