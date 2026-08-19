import { ArrowLeft } from "lucide-react";

interface ActivityExitButtonProps {
  onExit: () => void;
  /**
   * "dark" sits on the hero rail (white ink on the cover image); "light" sits on
   * the parchment ground of the intro and completion screens.
   */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * The way out of an Activity.
 *
 * The runner is a full-screen takeover with no app chrome: no sidebar, no
 * header, no breadcrumb. Without this control a student who opened an Activity
 * had no route back to the Activity Centre short of the browser's own Back
 * button, and on the completion screen not even that read as an option.
 *
 * Deliberately not gated behind a confirmation dialog, unlike the Drill's exit.
 * A Drill run is a timed session held in memory and abandoning it loses work; an
 * Activity writes every attempt to `activity_item_responses` as it happens and
 * replays that log on reopen, so leaving is always safe and always resumable.
 * Asking "are you sure?" would imply a risk that does not exist here.
 */
export function ActivityExitButton({
  onExit,
  tone = "dark",
  className = "",
}: ActivityExitButtonProps) {
  const palette =
    tone === "dark"
      ? "text-white/75 hover:text-white hover:bg-white/10 focus-visible:outline-white/70"
      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-black/[0.06] focus-visible:outline-[hsl(var(--ac-emerald))]";

  return (
    <button
      type="button"
      onClick={onExit}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 -ml-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${palette} ${className}`}
    >
      <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
      Exit
    </button>
  );
}
