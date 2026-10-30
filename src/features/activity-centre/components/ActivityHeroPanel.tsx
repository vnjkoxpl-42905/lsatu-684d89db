import type { ActivityAssignment } from "../api/types";
import { ActivityExitButton } from "./ActivityExitButton";

interface ActivityHeroPanelProps {
  assignment: ActivityAssignment;
  current: number; // 1-based
  total: number;
  /** Hide duplicate progress when the runner provides a shared progress header. */
  showProgress?: boolean;
  /** Omitted when the runner is embedded (teacher preview), which has its own chrome. */
  onExit?: () => void;
}

/**
 * Sticky left rail (md+) / banner (mobile). Cover panel + thin progress bar
 * across the top, mirroring the reference quiz layout.
 */
export function ActivityHeroPanel({
  assignment,
  current,
  total,
  onExit,
  showProgress = true,
}: ActivityHeroPanelProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const tagline = assignment.instructions?.tagline;

  return (
    <aside className="ac-hero relative isolate overflow-hidden md:sticky md:top-0 md:h-screen md:min-h-[560px]">
      {/* Background image / gradient */}
      <div className="ac-hero-bg absolute inset-0 -z-10" aria-hidden />

      {/* Top progress bar */}
      <div className="relative z-10 px-6 pt-6 md:px-10 md:pt-8">
        <div className="flex items-center justify-between text-white/85">
          {onExit ? (
            <ActivityExitButton onExit={onExit} tone="dark" />
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Activity
            </span>
          )}
          {showProgress && <span className="text-[11px] font-medium tabular-nums tracking-wide">
            {current} / {total}
          </span>}
        </div>
        {showProgress && <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-[hsl(var(--ac-emerald))] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>}
      </div>

      {/* Editorial content */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-10 pt-8 md:px-10 md:pb-14 md:pt-24">
        <h1 className="ac-display max-w-[14ch] text-3xl font-bold leading-[1.05] text-white md:text-[44px]">
          {assignment.title}
        </h1>

        {(tagline || assignment.subtitle) && (
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 md:text-[15px]">
            {tagline ?? assignment.subtitle}
          </p>
        )}
      </div>
    </aside>
  );
}
