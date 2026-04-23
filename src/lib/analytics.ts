/**
 * Minimal analytics tracker.
 *
 * Design goals:
 *   - Zero runtime dependency (no PostHog / Segment / etc. installed).
 *   - Plug-in point: if a `window.analytics.track` function exists
 *     (Segment's interface; PostHog adapters expose the same shape),
 *     we delegate. Otherwise we console.debug so the events are
 *     visible during development but don't leak to production logs.
 *   - Typed event names so grepping for usages is trivial and
 *     typos fail the build.
 *
 * Add a real analytics backend later by wiring `window.analytics`
 * (Segment snippet) or by replacing the console.debug branch with a
 * direct SDK call. Call sites don't need to change.
 */

export type HubEventName =
  | "hub_student_switched"
  | "hub_tab_switched"
  | "hub_note_created"
  | "hub_upload_attached"
  | "hub_session_logged"
  | "hub_draft_approved"
  | "hub_search_used"
  | "hub_panel_collapsed";

type TrackerProps = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsWindow {
  analytics?: {
    track?: (event: string, properties?: TrackerProps) => void;
  };
}

export function track(event: HubEventName, properties?: TrackerProps): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as AnalyticsWindow;
  const backend = w.analytics?.track;
  if (backend) {
    try {
      backend(event, properties);
      return;
    } catch (err) {
      console.error("[analytics] backend track failed:", err);
      // Fall through to console so the event isn't silently dropped.
    }
  }

  // Dev fallback: surface events in the console so instrumentation can
  // be validated without a backend wired up.
  if (import.meta.env?.DEV) {
    console.debug("[analytics]", event, properties ?? {});
  }
}
