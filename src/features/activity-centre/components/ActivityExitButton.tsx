interface ActivityExitButtonProps {
  onExit: () => void;
  /**
   * "dark" sits on the hero rail (white ink on the cover image); "light" sits on
   * the parchment ground of the intro and completion screens.
   */
  tone?: "dark" | "light";
  /** Defaults to "Exit". */
  label?: string;
  className?: string;
}

/**
 * The way out of an Activity.
 *
 * The runner is a full-screen takeover with no app chrome: no sidebar, no
 * header, no breadcrumb. Without this control a student who opened an Activity
 * had no route back short of the browser's own Back button.
 *
 * Drawn as an actual button — border, ground, real label size — rather than the
 * bare arrow-plus-micro-caps it started as. On the intro that first version sat
 * directly above the decorative "◀ Negation Station ▶" crumb in the same weight
 * and tracking, so the one control on the page that did something was
 * indistinguishable from the ornament that did not. An exit has to look
 * pressable at a glance, which means it cannot be quieter than the decoration
 * next to it.
 *
 * Deliberately not gated behind a confirmation dialog, unlike the Drill's exit.
 * A Drill run is a timed session held in memory and abandoning it loses work; an
 * Activity writes every attempt to `activity_item_responses` as it happens and
 * replays that log on reopen, so leaving is always safe and always resumable.
 */
export function ActivityExitButton({
  onExit,
  tone = "dark",
  label = "Exit",
  className = "",
}: ActivityExitButtonProps) {
  const palette =
    tone === "dark"
      ? "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/45 focus-visible:outline-white/70"
      : // Reads the world shell's own ink when a `data-world` ancestor defines
        // it (light ink in the dark worlds, dark ink in the Specimen Lab), and
        // falls back to the global foreground on worldless screens.
        "border-[hsl(var(--aw-ink,var(--foreground))/0.25)] bg-transparent text-[hsl(var(--aw-ink,var(--foreground)))] hover:bg-[hsl(var(--aw-ink,var(--foreground))/0.07)] hover:border-[hsl(var(--aw-ink,var(--foreground))/0.45)] focus-visible:outline-[hsl(var(--aw-ink,var(--foreground))/0.6)]";

  return (
    <button
      type="button"
      onClick={onExit}
      className={`inline-flex items-center justify-center min-h-[36px] rounded-full border px-5 py-2 text-sm font-semibold leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${palette} ${className}`}
    >
      {label}
    </button>
  );
}
