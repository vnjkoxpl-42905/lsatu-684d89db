import type { ActivityAssignment } from "../api/types";

interface ActivityHeroPanelProps {
  assignment: ActivityAssignment;
  current: number; // 1-based
  total: number;
  instructorName?: string;
}

/**
 * Sticky left rail (md+) / banner (mobile). Cover panel + thin progress bar
 * across the top, mirroring the reference quiz layout.
 */
export function ActivityHeroPanel({
  assignment,
  current,
  total,
  instructorName = "Joshua",
}: ActivityHeroPanelProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const tagline = assignment.instructions?.tagline;
  const dateLabel = new Date(assignment.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <aside className="ac-hero relative isolate overflow-hidden md:sticky md:top-0 md:h-screen md:min-h-[560px]">
      {/* Background image / gradient */}
      <div className="ac-hero-bg absolute inset-0 -z-10" aria-hidden />

      {/* Top progress bar */}
      <div className="relative z-10 px-6 pt-6 md:px-10 md:pt-8">
        <div className="flex items-center justify-between text-white/85">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            Activity
          </span>
          <span className="text-[11px] font-medium tabular-nums tracking-wide">
            {current} / {total}
          </span>
        </div>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full bg-[hsl(var(--ac-emerald))] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Editorial content */}
      <div className="relative z-10 flex h-full flex-col px-6 pb-10 pt-8 md:px-10 md:pb-14 md:pt-24">
        <div className="flex flex-wrap gap-2">
          <span className="ac-hero-chip">#{(assignment.item_format ?? "drill").toUpperCase()}</span>
          {assignment.subtitle && (
            <span className="ac-hero-chip">#{assignment.subtitle.split(" ")[0].toUpperCase()}</span>
          )}
        </div>

        <h1 className="ac-display mt-6 max-w-[14ch] text-3xl font-bold leading-[1.05] text-white md:mt-8 md:text-[44px]">
          {assignment.title}
        </h1>

        {(tagline || assignment.subtitle) && (
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 md:text-[15px]">
            {tagline ?? assignment.subtitle}
          </p>
        )}

        <div className="mt-auto pt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
          <div>By {instructorName}</div>
          <div className="mt-1 text-white/55">{dateLabel}</div>
        </div>
      </div>
    </aside>
  );
}
